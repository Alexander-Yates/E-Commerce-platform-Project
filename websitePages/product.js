// Initializes Supabase client for database and authentication
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Retrieves the product ID from the URL query string
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

// Loads product information from the database and displays it
async function loadProduct() {
  if (!productId) {
    document.getElementById("productContainer").innerHTML = "<p>Product not found.</p>";
    return;
  }

  // Fetches product details including category name
  const { data: product, error } = await client
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      image_url,
      quantity_available,
      category_id,
      categories(name)
    `)
    .eq("id", productId)
    .single();

  // Shows error message if product data fails to load
  if (error || !product) {
    console.error("Error fetching product:", error);
    document.getElementById("productContainer").innerHTML = "<p>Unable to load product.</p>";
    return;
  }

  // Inserts product information into the page layout
  const container = document.getElementById("productContainer");
  container.innerHTML = `
    <div class="image">
      <img src="${product.image_url || 'https://placehold.co/400x400'}" alt="${product.name}">
    </div>
    <div class="details">
      <h1>${product.name}</h1>
      <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
      <p><strong>Description:</strong> ${product.description || 'No description available.'}</p>
      <p><strong>Category:</strong> ${product.categories?.name || 'Uncategorized'}</p>

      <!-- Average rating and total reviews section -->
      <div id="productReviews" class="reviews-summary">
        <p>Average Rating: —</p>
        <p>Total Reviews: —</p>
      </div>

      <button class="add-btn" id="addToCartBtn">Add to Cart</button>
    </div>
  `;

  // Handles the Add to Cart button click
  document.getElementById("addToCartBtn").addEventListener("click", () => addToCart(product.id));

  // Loads related products based on similarity
  loadRelatedProducts(product.name, product.id);

  // Loads product review information
  loadProductReviews(product.id);
}

// Adds the selected product to the user's cart
async function addToCart(productId) {
  try {
    // Confirms user is logged in before adding to cart
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      alert("Please log in to add items to your cart.");
      return;
    }

    // Retrieves or creates the user's cart
    let { data: existingCart, error: cartError } = await client
      .from("carts")
      .select("id")
      .eq("buyer_id", user.id)
      .limit(1);

    if (cartError) throw cartError;

    let cartId;
    if (!existingCart || existingCart.length === 0) {
      const { data: newCart, error: newCartError } = await client
        .from("carts")
        .insert([{ buyer_id: user.id }])
        .select("id")
        .single();
      if (newCartError) throw newCartError;
      cartId = newCart.id;
    } else {
      cartId = existingCart[0].id;
    }

    // Checks if the product is already in the cart
    const { data: existingItem, error: itemError } = await client
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("product_id", productId)
      .maybeSingle();

    if (itemError) throw itemError;

    // Updates quantity if item exists, otherwise inserts new cart item
    if (existingItem) {
      const { error: updateError } = await client
        .from("cart_items")
        .update({ quantity: existingItem.quantity + 1 })
        .eq("id", existingItem.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client
        .from("cart_items")
        .insert([{ cart_id: cartId, product_id: productId, quantity: 1 }]);
      if (insertError) throw insertError;
    }

    alert("Added to cart!");
  } catch (err) {
    console.error("Add to cart error:", err.message);
    alert("Failed to add item to cart.");
  }
}

// Loads average rating and total review count for a product
async function loadProductReviews(productId) {
  // Fetch all orders that include this product and have a rating
  const { data: reviews, error } = await client
    .from("orders")
    .select("rating, product_id")
    .eq("product_id", productId)
    .not("rating", "is", null);

  const reviewBox = document.getElementById("productReviews");

  if (error) {
    console.error("Error loading reviews:", error);
    reviewBox.innerHTML = `<p>Average Rating: —</p><p>Total Reviews: —</p>`;
    return;
  }

  if (!reviews || reviews.length === 0) {
    reviewBox.innerHTML = `
      <p>Average Rating: —</p>
      <p>Total Reviews: 0</p>
    `;
    return;
  }

  const ratings = reviews.map(r => r.rating);
  const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  const stars = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));

  reviewBox.innerHTML = `
    <p><strong>${stars}</strong> (${avg}/5)</p>
    <p>Total Reviews: ${reviews.length}</p>
  `;
}

async function loadRelatedProducts(productName, currentProductId) {
  const { data: related, error } = await client
    .from("products")
    .select("id, name, price, image_url")
    .eq("is_active", true)
    .eq("is_approved", true)
    .filter("id", "neq", currentProductId) // do not include the same product
    .limit(200); // temporary broad fetch

  if (error) {
    console.error("Error loading related products:", error);
    return;
  }

  // Compute similarity score manually (fallback if pg_trgm not available)
  function similarity(a, b) {
    a = a.toLowerCase().split(" ");
    b = b.toLowerCase().split(" ");

    return a.filter(word => b.includes(word)).length;
  }

  // Sort by best name similarity
  const sorted = related
    .map(r => ({ ...r, score: similarity(productName, r.name) }))
    .filter(r => r.score > 0)       // only keep those with matching keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, 4); // top 4 matches

  const container = document.getElementById("relatedProducts");
  container.innerHTML = "";

  if (sorted.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#555;">No similar products found.</p>`;
    return;
  }

  sorted.forEach(item => {
    const div = document.createElement("div");
    div.classList.add("product-card");
    div.innerHTML = `
      <a href="product.html?id=${item.id}">
        <img src="${item.image_url || 'https://placehold.co/300x200'}" alt="${item.name}">
      </a>
      <div style="padding: 0.75rem;">
        <h4>${item.name}</h4>
        <p>$${parseFloat(item.price).toFixed(2)}</p>
      </div>
    `;
    container.appendChild(div);
  });
}

// Loads product information when the page is opened
loadProduct();
