// --- Supabase Setup ---
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// --- DOM References ---
const addProductBtn = document.getElementById("addProductBtn");
const addProductModal = document.getElementById("addProductModal");
const closeModal = document.getElementById("closeModal");
const addProductForm = document.getElementById("addProductForm");
const productTableBody = document.getElementById("productTableBody");
// --- Notification DOM Elements ---
const bell = document.getElementById("sellerNotifBtn");
const badge = document.getElementById("sellerNotifBadge");
const dropdown = document.getElementById("sellerNotifDropdown");
const list = document.getElementById("notificationsList");


// --- Modal Controls ---
addProductBtn.addEventListener("click", () => {
  addProductModal.style.display = "flex";
});

closeModal.addEventListener("click", () => {
  addProductModal.style.display = "none";
});

// --- Display logged-in seller's name in navbar ---
async function displaySellerName() {
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    console.error("No user found:", error);
    document.getElementById("sellerName").textContent = "Guest";
    return;
  }

  // Fetch from your "users" table (where username and roles live)
  const { data: userData, error: userError } = await client
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single();

  if (userError) {
    console.error("Error fetching username:", userError);
    document.getElementById("sellerName").textContent = user.email;
  } else {
    document.getElementById("sellerName").textContent =
      userData?.username || user.email;
  }
}

// Run once page loads
document.addEventListener("DOMContentLoaded", () => {
  displaySellerName();
  loadNotifications();
  setInterval(loadNotifications, 30000);

  if (bell && dropdown) {
  bell.addEventListener("click", async () => {
    dropdown.classList.toggle("show");

    if (dropdown.classList.contains("show")) {
      // hide badge immediately
      badge.style.display = "none";

      // get current user
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) return;

      // mark unread as read
      const { error } = await client
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) console.error("Failed to mark notifications as read:", error);
    }
  });
}

});

// fetch and display notif for product deletions (admin reason)
async function loadNotifications() {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return;

  const { data: notifications, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading notifications:", error);
    return;
  }

  list.innerHTML = "";

  if (!notifications || notifications.length === 0) {
    list.innerHTML = "<li>No notifications yet.</li>";
    badge.style.display = "none";
    return;
  }

  // count unread notifications
  const unreadCount = notifications.filter(n => !n.is_read).length;
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = "block";
  } else {
    badge.style.display = "none";
  }

  notifications.forEach((n) => {
  const li = document.createElement("li");
  li.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span>${n.message}</span>
      <button class="ack-btn" data-id="${n.id}" 
        style="margin-left:10px; background:var(--teal); color:white; border:none; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:0.8rem;">
        Okay
      </button>
    </div>
  `;
  list.appendChild(li);
});

}

async function addNotifcation(userId, message) {
  const { error } = await client.from("notifications").insert([
    {
      user_id: userId,
      message: message,
      type: "general",
      created_at: new Date(),
    },
  ]);
  if (error) console.error("Failed to add notification:", error);
}

// --- Fetch and Display Seller Products ---
async function loadProducts() {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    console.error("User not logged in:", userError);
    return;
  }

  const { data: products, error } = await client
  .from("products")
  .select(`
    id,
    name,
    price,
    quantity_available,
    is_active,
    category_id,
    categories ( name )
  `)
  .eq("seller_id", user.id);


  if (error) {
    console.error("Error loading products:", error);
    return;
  }

  productTableBody.innerHTML = "";

  if (products.length === 0) {
    productTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No products found.</td></tr>`;
    return;
  }

  products.forEach((p) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.categories ? p.categories.name : "N/A"}</td>
      <td>$${p.price}</td>
      <td>${p.quantity_available}</td>
      <td>
        <button class="editBtn">Edit</button>
        <button class="deleteBtn" data-id="${p.id}">Delete</button>
      </td>
    `;
    productTableBody.appendChild(row);
  });
  cachedProducts = products;
  renderProducts(products);

}

function renderProducts(products) {
  productTableBody.innerHTML = "";

  if (!products.length) {
    productTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No products found.</td></tr>`;
    return;
  }

  products.forEach((p) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.categories ? p.categories.name : "N/A"}</td>
      <td>$${p.price}</td>
      <td>${p.quantity_available}</td>
      <td>
        <button class="editBtn">Edit</button>
        <button class="deleteBtn" data-id="${p.id}">Delete</button>
      </td>
    `;
    productTableBody.appendChild(row);
  });
}

// --- Add Product Form Submission ---
addProductForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("productName").value.trim();
  const price = parseFloat(document.getElementById("productPrice").value);
  const quantity = parseInt(document.getElementById("productQuantity").value);
  const description = document.getElementById("productDescription").value.trim();
  const category = document.getElementById("productCategory").value
    ? parseInt(document.getElementById("productCategory").value)
    : null;

  if (!name || isNaN(price) || isNaN(quantity)) {
    alert("Please fill all required fields correctly.");
    return;
  }

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    alert("You must be logged in as a seller.");
    return;
  }
  let imageUrl = null;
const file = productImageInput.files[0];

if (file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await client.storage
    .from('product-images') // name of your Supabase storage bucket
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    alert("Image upload failed.");
    return;
  }

  const { data: publicUrlData } = client.storage
    .from('product-images')
    .getPublicUrl(filePath);

  imageUrl = publicUrlData.publicUrl;
}

  // --- if editing an existing product ---
  if (editingProductId) {
    const { error } = await client
      .from("products")
      .update({
        name,
        price,
        quantity_available: quantity,
        description,
        category_id: category,
        updated_at: new Date(),
        ...(imageUrl && { image_url: imageUrl }),
      })
      .eq("id", editingProductId)
      .eq("seller_id", user.id);

    if (error) {
      console.error("Update error:", error);
      alert("Failed to update product: " + error.message);
      return;
    }

    alert("Product updated successfully!");
    editingProductId = null;
    document.getElementById("modalTitle").textContent = "Add New Product";
    document.getElementById("saveProductBtn").textContent = "Save Product";
  } else {
    // --- creating a new product ---
    const { error } = await client.from("products").insert([
      {
        seller_id: user.id,
        name,
        price,
        quantity_available: quantity,
        description,
        category_id: category,
        is_active: true,
        is_approved: false,
        created_at: new Date(),
        updated_at: new Date(),
        image_url: imageUrl,
      },
    ]);

    if (error) {
      console.error("Insert error:", error);
      alert("Failed to add product: " + error.message);
      return;
    }

    alert("✅ Product added successfully!");

    // notif for new product
    addNotifcation(user.id, 'Your product "${name}" has been submitted and is pending approval.');
  }

  addProductModal.style.display = "none";
  addProductForm.reset();
  loadProducts();
  loadNotifications();
});

closeModal.addEventListener("click", () => {
  addProductModal.style.display = "none";
  editingProductId = null;
  document.getElementById("modalTitle").textContent = "Add New Product";
  document.getElementById("saveProductBtn").textContent = "Save Product";
});
// notification listeners
document.addEventListener("click", (e) => {
  if (!e.target.closest(".notif-container")) {
    dropdown.classList.remove("show");
  }
});
// --- Handle "Okay" / "I understand" buttons ---
list.addEventListener("click", async (e) => {
  if (e.target.classList.contains("ack-btn")) {
    const notifId = e.target.dataset.id;
    if (!notifId) return;

    // remove it visually
    e.target.closest("li").remove();

    // delete from Supabase
    const { error } = await client
      .from("notifications")
      .delete()
      .eq("id", notifId);

    if (error) {
      console.error("Failed to delete notification:", error);
      alert("Couldn't dismiss notification. Try again.");
    } else {
      console.log("Notification dismissed:", notifId);
    }

    // if no more notifications left, show fallback message
    if (list.children.length === 0) {
      list.innerHTML = "<li>No notifications yet.</li>";
    }
  }
});


// --- Delete Product ---
productTableBody.addEventListener("click", async (e) => {
  if (e.target.classList.contains("deleteBtn")) {
    const id = e.target.getAttribute("data-id");
    const confirmDelete = confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    const { error } = await client.from("products").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Error deleting product: " + error.message);
    } else {
      alert("Product deleted successfully.");

      // notif for deleted product
      if (deletedProduct && deletedProduct[0]){
        const { data: notif, error: notifError } = await client
          .from("notifications")
          .select("message")
          .eq("user_id", deletedProduct[0].seller_id)
          .eq("type", "product_rejection")
          .eq("product_id", deletedProduct[0].id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let message = 'Your product "${deletedProduct[0].name}" was deleted.';
        if (notif && notif.message) {
          message += ' Reason: ${notif.message}';
        }

        addNotification(deletedProduct[0].seller_id,message);
      }

      loadProducts();
      loadNotifications();
    }
  }
});

// --- Edit Product ---
let editingProductId = null;

productTableBody.addEventListener("click", async (e) => {
  if (e.target.classList.contains("editBtn")) {
    const id = e.target.closest("tr").querySelector(".deleteBtn").dataset.id;
    editingProductId = id;

    // fetch that product’s info
    const { data: product, error } = await client
      .from("products")
      .select(`
        id, name, description, price, quantity_available, category_id
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch error:", error);
      alert("Failed to load product details.");
      return;
    }

    // populate modal fields
    document.getElementById("modalTitle").textContent = "Edit Product";
    document.getElementById("productName").value = product.name;
    document.getElementById("productPrice").value = product.price;
    document.getElementById("productQuantity").value = product.quantity_available;
    document.getElementById("productDescription").value = product.description || "";
    document.getElementById("productCategory").value = product.category_id || "";

    document.getElementById("saveProductBtn").textContent = "Save Changes";
    addProductModal.style.display = "flex";
  }
});


// --- Load Categories into Dropdown ---
async function loadCategories() {
  const { data: categories, error } = await client.from("categories").select("*");

  if (error) {
    console.error("Error loading categories:", error);
    return;
  }

  const categorySelect = document.getElementById("productCategory");
  categorySelect.innerHTML = `<option value="">Select a category</option>`;

  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    categorySelect.appendChild(option);
  });
}

const productImageInput = document.getElementById("productImage");
const previewImg = document.getElementById("previewImg");

productImageInput.addEventListener("change", () => {
  const file = productImageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      previewImg.src = e.target.result;
      previewImg.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});


// --- Sorting Logic ---
let currentSort = { key: null, direction: 'asc' };
let cachedProducts = [];

function sortProducts(key) {
  if (currentSort.key === key) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort = { key, direction: 'asc' };
  }

  const sorted = [...cachedProducts].sort((a, b) => {
    let valA, valB;
    if (key === 'category') {
      valA = a.categories ? a.categories.name.toLowerCase() : '';
      valB = b.categories ? b.categories.name.toLowerCase() : '';
    } else {
      valA = typeof a[key] === 'string' ? a[key].toLowerCase() : a[key];
      valB = typeof b[key] === 'string' ? b[key].toLowerCase() : b[key];
    }

    if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
    if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  renderProducts(sorted);
}


// --- Initialize Dashboard ---
loadCategories();
loadProducts();

document.querySelectorAll(".sort-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.sort;
    sortProducts(key);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      const { error } = await client.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        alert("Failed to log out. Please try again.");
        return;
      }

      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "../index.html";
    } catch (err) {
      console.error("Unexpected logout error:", err);
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const manageOrdersBtn = document.getElementById("manageOrdersBtn");
  if (manageOrdersBtn) {
    manageOrdersBtn.addEventListener("click", () => {
      window.location.href = "./orderPages/orders.html";
    });
  }
});
