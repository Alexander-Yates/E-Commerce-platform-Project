// product.js
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get product ID from URL
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

// Fetch and display product details
async function loadProduct() {
  if (!productId) {
    document.getElementById("productContainer").innerHTML = "<p>Product not found.</p>";
    return;
  }

  const { data: product, error } = await client
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !product) {
    console.error("Error fetching product:", error);
    document.getElementById("productContainer").innerHTML = "<p>Unable to load product.</p>";
    return;
  }

  const container = document.getElementById("productContainer");
  container.innerHTML = `
    <div class="image">
      <img src="${product.image_url || 'https://placehold.co/400x400'}" alt="${product.name}">
    </div>
    <div class="details">
      <h1>${product.name}</h1>
      <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
      <p><strong>Description:</strong> ${product.description || 'No description available.'}</p>
      <p><strong>Category:</strong> ${product.category || 'Uncategorized'}</p>
      <button class="add-btn" id="addToCartBtn">Add to Cart</button>
    </div>
  `;

  document.getElementById("addToCartBtn").addEventListener("click", () => addToCart(product.id));
}

// Reuse your existing addToCart logic
async function addToCart(productId) {
  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      alert("Please log in to add items to your cart.");
      return;
    }

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

    const { data: existingItem, error: itemError } = await client
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("product_id", productId)
      .maybeSingle();

    if (itemError) throw itemError;

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

    alert("🛒 Added to cart!");
  } catch (err) {
    console.error("Add to cart error:", err.message);
    alert("Failed to add item to cart.");
  }
}

loadProduct();
