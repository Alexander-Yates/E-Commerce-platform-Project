// main.js --> buyer page js file

// Supabase setup
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

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
async function loadProducts() {
  const { data: products, error } = await client
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  const productsGrid = document.getElementById("productsGrid");
  productsGrid.innerHTML = "";

  products.forEach(product => {
    const productDiv = document.createElement("div");
    productDiv.className = "product";
    productDiv.innerHTML = `
      <img src="${product.image_url || 'https://placehold.co/300x200'}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>$${parseFloat(product.price).toFixed(2)}</p>
        <button class="add-btn" data-id="${product.id}">Add to Cart</button>
      </div>
    `;
    productsGrid.appendChild(productDiv);
  });
}

// Load products on page load
loadProducts();
document.addEventListener("DOMContentLoaded", async () => {
  const sellLink = document.getElementById("wantToSellLink");
  const logoutLink = document.getElementById("logoutLink");
  const loginLink = document.getElementById("loginLink");
  const signupLink = document.getElementById("signupLink");

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
      loginLink.style.display = "none";
      signupLink.style.display = "none";
    } else {
      sellLink.style.display = "none";
      logoutLink.style.display = "none";
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
    window.location.href = "/index.html";
  });
});
