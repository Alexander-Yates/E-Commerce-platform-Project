// Initializes Supabase client for database and authentication
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Retrieves the product ID from the URL query string
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let currentRating = 0;

// Loads product information from the database and displays it
async function loadProduct() {
  if (!productId) {
    document.getElementById("productContainer").innerHTML =
      "<p>Product not found.</p>";
    return;
  }

  // Fetch product
  const { data: product, error } = await client
    .from("products")
    .select(
      `
      id,
      name,
      description,
      price,
      image_url,
      quantity_available,
      category_id,
      categories(name)
    `
    )
    .eq("id", productId)
    .single();

  if (error || !product) {
    console.error("Product load error:", error);
    document.getElementById("productContainer").innerHTML =
      "<p>Unable to load product.</p>";
    return;
  }

  // Render product + review button INSIDE JS
  const container = document.getElementById("productContainer");
  container.innerHTML = `
    <div class="image">
      <img src="${
        product.image_url || "https://placehold.co/400x400"
      }" alt="${product.name}">
    </div>
    <div class="details">
      <h1>${product.name}</h1>
      <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
      <p><strong>Description:</strong> ${
        product.description || "No description available."
      }</p>
      <p><strong>Category:</strong> ${
        product.categories?.name || "Uncategorized"
      }</p>

      <div id="productReviews" class="reviews-summary">
        <p>Average Rating: —</p>
        <p>Total Reviews: —</p>
      </div>

      <button class="add-btn" id="addToCartBtn">Add to Cart</button>

      <button class="add-btn" id="leaveReviewBtn" style="background:#a46a42; margin-left:1rem;">
        Leave a Review
      </button>
    </div>
  `;

  // Add to Cart event
  document
    .getElementById("addToCartBtn")
    .addEventListener("click", () => addToCart(product.id));

  // Load reviews AFTER DOM is generated
  await loadReviews(product.id);

  // Setup review button + popup AFTER DOM update
  setupReviewSystem(product.id);

  // Load related products
  loadRelatedProducts(product.name, product.id);
}

// Loads review summary
async function loadReviews(productId) {
  const { data, error } = await client
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId);

  const reviewsBox = document.getElementById("productReviews");

  if (error || !data) {
    reviewsBox.innerHTML = `
      <p>Average Rating: —</p>
      <p>Total Reviews: —</p>
    `;
    return;
  }

  if (data.length === 0) {
    reviewsBox.innerHTML = `
      <p>Average Rating: —</p>
      <p>Total Reviews: 0</p>
    `;
    return;
  }

  const avg =
    data.reduce((sum, r) => sum + r.rating, 0) / data.length;

  reviewsBox.innerHTML = `
    <p>Average Rating: ${avg.toFixed(1)} ★</p>
    <p>Total Reviews: ${data.length}</p>
  `;
}

// Add to cart logic
async function addToCart(productId) {
  try {
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      alert("Please log in to add items to your cart.");
      return;
    }

    // Retrieve or create cart
    let { data: existingCart } = await client
      .from("carts")
      .select("id")
      .eq("buyer_id", user.id)
      .limit(1);

    let cartId;

    if (!existingCart || existingCart.length === 0) {
      const { data: newCart } = await client
        .from("carts")
        .insert([{ buyer_id: user.id }])
        .select("id")
        .single();
      cartId = newCart.id;
    } else {
      cartId = existingCart[0].id;
    }

    // Check if product already in cart
    const { data: existingItem } = await client
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("product_id", productId)
      .maybeSingle();

    if (existingItem) {
      await client
        .from("cart_items")
        .update({ quantity: existingItem.quantity + 1 })
        .eq("id", existingItem.id);
    } else {
      await client
        .from("cart_items")
        .insert([{ cart_id: cartId, product_id: productId, quantity: 1 }]);
    }

    alert("Added to cart!");
  } catch (err) {
    console.error("Add to cart error:", err.message);
    alert("Failed to add item to cart.");
  }
}

// Related products loader
async function loadRelatedProducts(productName, currentProductId) {
  const { data: related } = await client
    .from("products")
    .select("id, name, price, image_url")
    .eq("is_active", true)
    .eq("is_approved", true)
    .filter("id", "neq", currentProductId)
    .limit(200);

  if (!related) return;

  function similarity(a, b) {
    a = a.toLowerCase().split(" ");
    b = b.toLowerCase().split(" ");
    return a.filter((w) => b.includes(w)).length;
  }

  const sorted = related
    .map((r) => ({ ...r, score: similarity(productName, r.name) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const container = document.getElementById("relatedProducts");
  container.innerHTML = "";

  if (sorted.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#555;">No similar products found.</p>`;
    return;
  }

  sorted.forEach((item) => {
    const div = document.createElement("div");
    div.classList.add("product-card");
    div.innerHTML = `
      <a href="product.html?id=${item.id}">
        <img src="${
          item.image_url || "https://placehold.co/300x200"
        }" alt="${item.name}">
      </a>
      <div style="padding: 0.75rem;">
        <h4>${item.name}</h4>
        <p>$${parseFloat(item.price).toFixed(2)}</p>
      </div>
    `;
    container.appendChild(div);
  });
}

// Review popup system
function setupReviewSystem(productId) {
  const popup = document.getElementById("reviewPopup");
  const leaveReviewBtn = document.getElementById("leaveReviewBtn");

  leaveReviewBtn.addEventListener("click", async () => {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error || !user) {
      alert("Please log in to leave a review.");
      return;
    }

    popup.classList.remove("hidden");
  });

  // star selection
  document.querySelectorAll(".star-select span").forEach((star) => {
    star.addEventListener("click", () => {
      const starValue = parseInt(star.dataset.star);
      currentRating = starValue;

      document
        .querySelectorAll(".star-select span")
        .forEach((s) =>
          s.classList.toggle(
            "selected",
            parseInt(s.dataset.star) <= starValue
          )
        );
    });
  });

  // submit review
  document.getElementById("submitReview").addEventListener("click", async () => {
    if (currentRating === 0)
      return alert("Please select a star rating.");

    const {
      data: { user },
    } = await client.auth.getUser();

    await client.from("product_reviews").insert([
      {
        product_id: productId,
        buyer_id: user.id,
        rating: currentRating,
      },
    ]);

    popup.classList.add("hidden");
    currentRating = 0;

    loadReviews(productId);
    alert("Review submitted!");
  });

  // cancel
  document.getElementById("cancelReview").addEventListener("click", () => {
    popup.classList.add("hidden");
    currentRating = 0;
    document
      .querySelectorAll(".star-select span")
      .forEach((s) => s.classList.remove("selected"));
  });
}

// Start page
loadProduct();
