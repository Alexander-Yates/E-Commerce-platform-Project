// main.js --> buyer page js file

// Supabase setup
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Navbar scroll hide/show
let lastScrollY = window.scrollY;
const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {
  if (window.scrollY > lastScrollY) {
    navbar.style.top = "-80px";
  } else {
    navbar.style.top = "0";
  }
  lastScrollY = window.scrollY;
});

// Load products dynamically from Supabase
async function loadProducts(searchTerm = "") {
  let query = client
    .from("products")
    .select("*, categories(name)")
    .eq("is_active", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (searchTerm) {
    query = query.ilike("name", `%${searchTerm}%`);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  const productsGrid = document.getElementById("productsGrid");
  productsGrid.innerHTML = "";

  if (products.length === 0) {
    productsGrid.innerHTML = "<p style='text-align:center;'>No products found.</p>";
    return;
  }

  products.forEach(product => {
    const productDiv = document.createElement("div");
    productDiv.className = "product"; // change the innerHTML before prod
    productDiv.innerHTML = `
       <a href="/product.html?id=${product.id}">
        <img src="${product.image_url || 'https://placehold.co/300x200'}" alt="${product.name}">
      </a>
      <div class="product-info">
        <h3><a href="product.html?id=${product.id}" style="text-decoration:none; color:#a46a42;">${product.name}</a></h3> 
        <p>$${parseFloat(product.price).toFixed(2)}</p>
        <button class="add-btn" data-id="${product.id}">Add to Cart</button>
      </div>
    `;
    productsGrid.appendChild(productDiv);

    const addBtn = productDiv.querySelector(".add-btn");
    addBtn.addEventListener("click", () => addToCart(product.id));
  });
}

searchBtn.addEventListener("click", () => {
  const term = searchInput.value.trim();
  loadProducts(term);
});

searchInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    const term = searchInput.value.trim();
    loadProducts(term);
  }
});

// =======================
// ADD TO CART FUNCTIONALITY
// =======================

async function addToCart(productId) {
  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      alert("Please log in to add items to your cart.");
      return;
    }

    // Check stock before proceeding
    const { data: product, error: prodErr } = await client
      .from("products")
      .select("quantity_available, name")
      .eq("id", productId)
      .single();

    if (prodErr || !product) {
      console.error("Error fetching product:", prodErr);
      alert("Unable to check product stock.");
      return;
    }

    if (product.quantity <= 0) {
      alert(`Sorry, ${product.name} is out of stock.`);
      return;
    }

    // Get or create cart for buyer
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

    // Add or update cart item
    const { data: existingItem, error: itemError } = await client
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("product_id", productId)
      .maybeSingle();

    if (itemError) throw itemError;

    if (existingItem) {
      // Prevent adding more than available stock
      const newQty = existingItem.quantity + 1;
      if (newQty > product.quantity) {
        alert(`Only ${product.quantity} left in stock.`);
        return;
      }

      const { error: updateError } = await client
        .from("cart_items")
        .update({ quantity: newQty })
        .eq("id", existingItem.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client
        .from("cart_items")
        .insert([{ cart_id: cartId, product_id: productId, quantity: 1 }]);
      if (insertError) throw insertError;
    }

    alert("Added to cart successfully!");
  } catch (err) {
    console.error("Add to cart error:", err.message);
    alert("Failed to add item to cart.");
  }
}
// Load products on page load
loadProducts();
document.addEventListener("DOMContentLoaded", async () => {
  const sellLink = document.getElementById("wantToSellLink");
  const logoutLink = document.getElementById("logoutLink");
  const loginLink = document.getElementById("loginLink");
  const signupLink = document.getElementById("signupLink");
  const profileLink = document.getElementById("profileLink");

  // If any are missing, stop
  if (!sellLink || !logoutLink || !loginLink || !signupLink) {
    console.error("One or more nav elements not found in DOM.");
    return;
  }

  // Hide all dynamic links initially
  sellLink.style.display = "none";
  logoutLink.style.display = "none";

  const toggleNavState = (loggedIn) => {
  console.log("toggleNavState -> loggedIn:", loggedIn);
  if (loggedIn) {
    sellLink.style.display = "inline-block";
    logoutLink.style.display = "inline-block";
    profileLink.style.display = "inline-block";
    loginLink.style.display = "none";
    signupLink.style.display = "none";
  } else {
    sellLink.style.display = "none";
    logoutLink.style.display = "none";
    profileLink.style.display = "none";
    loginLink.style.display = "inline-block";
    signupLink.style.display = "inline-block";
    }
  };

  // Function to validate the session token with Supabase
  const validateSession = async (session) => {
    try {
      if (!session?.access_token) return false;
      const { data, error } = await client.auth.getUser();
      if (error) {
        console.warn("Session invalid, logging out:", error.message);
        await client.auth.signOut();
        return false;
      }
      return !!data?.user;
    } catch (e) {
      console.error("Error validating session:", e);
      return false;
    }
  };

  // 1. Check current/restored session
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  console.log("Initial getSession result:", session, sessionError);

  const valid = await validateSession(session);
  toggleNavState(valid);

  // 2. Watch for login/logout events
  client.auth.onAuthStateChange(async (event, newSession) => {
    console.log("onAuthStateChange:", event, newSession);
    const stillValid = await validateSession(newSession);
    toggleNavState(stillValid);
  });

  // 3. Logout button handler
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("Logging out...");
    await client.auth.signOut();
    toggleNavState(false);
    alert("You’ve been logged out!");
    window.location.href = "/index.html"; // change back for prod
  });
});
