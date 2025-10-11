// ---------- Supabase setup ----------
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- DOM Elements ----------
const notifBtn = document.getElementById("notifBtn");
const notifBadge = document.getElementById("notifBadge");
const notifDropdown = document.getElementById("notifDropdown");
const logoutBtn = document.getElementById("logoutBtn");

// Buyers modal elements (present in index.html)
const showBuyersBtn = document.getElementById("showBuyersBtn");
const buyersModal = document.getElementById("buyersModal");
const buyersTableBody = document.querySelector("#buyersTable tbody");
const closeBuyersBtn = document.getElementById("closeBuyersBtn");

let unreadCount = 0;

// ---------- Dropdown toggle ----------
if (notifBtn) {
  notifBtn.addEventListener("click", () => {
    notifDropdown.classList.toggle("show");
    notifBadge.style.display = "none";
    unreadCount = 0;
  });
}

// ---------- Logout ----------
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await client.auth.signOut();
    window.location.href = "/websitePages/index.html";
  });
}

// ---------- Listen for notifications ----------
client
  .channel("notifications-realtime")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "notifications" },
    async (payload) => {
      const notif = payload.new;
      if (notif.type === "seller_request") {
        showToast(notif.message);
        addNotification(notif);
      }
    }
  )
  .subscribe();

// ---------- Add notification to dropdown ----------
function addNotification(notif) {
  const p = document.createElement("p");
  p.classList.add("unread");
  p.innerHTML = `
    <span>${notif.message}</span>
    <button class="approveBtn" data-email="${extractEmail(notif.message)}">Approve</button>
  `;
  notifDropdown.prepend(p);

  unreadCount++;
  notifBadge.textContent = unreadCount;
  notifBadge.style.display = "block";
}

// ---------- Extract user email ----------
function extractEmail(msg) {
  const match = msg.match(/User (.+?) has requested/);
  return match ? match[1] : null;
}

// ---------- Approve seller button ----------
notifDropdown.addEventListener("click", async (e) => {
  if (e.target.classList.contains("approveBtn")) {
    const email = e.target.getAttribute("data-email");
    if (!email) return alert("Could not extract user email.");

    const { error } = await client.from("users").update({ role: "seller" }).eq("email", email);
    if (error) {
      alert("Error approving seller: " + error.message);
    } else {
      e.target.textContent = "✅ Approved";
      e.target.disabled = true;
      e.target.style.background = "#4b8c8d";
      showToast(`${email} is now a seller!`);
    }
  }
});

// ---------- Toast message ----------
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = "📩 " + message;
  document.body.appendChild(toast);
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.background = "#4b8c8d";
  toast.style.color = "white";
  toast.style.padding = "10px 16px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 3px 8px rgba(0,0,0,0.2)";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.4s";
  requestAnimationFrame(() => (toast.style.opacity = "1"));
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 4000);
} // ← closes showToast correctly

// ---------- Overview Stats Loader ----------
async function loadOverviewStats() {
  try {
    // Buyers
    const { count: buyerCount, error: buyerError } = await client
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "buyer")
      .eq("is_active", true);

    if (buyerError) console.error("Error loading buyers:", buyerError);

    // Sellers
    const { count: sellerCount, error: sellerError } = await client
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "seller")
      .eq("is_active", true);

    if (sellerError) console.error("Error loading sellers:", sellerError);

    // Transactions (assuming you have an 'orders' table)
    const { count: transactionCount, error: txError } = await client
      .from("orders")
      .select("*", { count: "exact", head: true });

    if (txError) console.error("Error loading transactions:", txError);

    // Disputes (assuming you have a 'disputes' table)
    const { count: disputeCount, error: disputeError } = await client
      .from("disputes")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");

    if (disputeError) console.error("Error loading disputes:", disputeError);

    // Update the UI
    document.getElementById("buyerCount").textContent = buyerCount ?? 0;
    document.getElementById("sellerCount").textContent = sellerCount ?? 0;
    document.getElementById("transactionCount").textContent = transactionCount ?? 0;
    document.getElementById("disputeCount").textContent = disputeCount ?? 0;

  } catch (err) {
    console.error("Error loading overview stats:", err);
  }
}

// Load stats on page load
document.addEventListener("DOMContentLoaded", loadOverviewStats);

// ---------- View Buyers Modal ----------
if (showBuyersBtn) {
  showBuyersBtn.addEventListener("click", async () => {
    console.log("👀 View Buyers clicked");
    buyersModal.style.display = "flex";
    buyersTableBody.innerHTML = `<tr><td colspan="3">Loading buyers...</td></tr>`;

    const { data: buyers, error } = await client
      .from("users")
      .select("username, email, is_active")
      .ilike("role", "buyer");
      console.log("Fetched buyers data:", buyers, "Error:", error);

    if (error) {
      console.error("Error loading buyers:", error);
      buyersTableBody.innerHTML = `<tr><td colspan="3">Error loading buyers: ${error.message}</td></tr>`;
      return;
    }

    if (!buyers || buyers.length === 0) {
      buyersTableBody.innerHTML = `<tr><td colspan="3">No buyers found.</td></tr>`;
      return;
    }

    buyersTableBody.innerHTML = "";
    buyers.forEach((buyer) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${buyer.username || "(no name)"}</td>
      <td>${buyer.email}</td>
      <td>${buyer.is_active ? "Active" : "Inactive"}</td>
      <td>
        <button class="editUserBtn" data-email="${buyer.email}">Edit</button>
        <button class="deleteUserBtn" data-email="${buyer.email}">Delete</button>
      </td>
    `;
    buyersTableBody.appendChild(tr);
});

  });
}

if (closeBuyersBtn) {
  closeBuyersBtn.addEventListener("click", () => {
    buyersModal.style.display = "none";
  });
}

window.addEventListener("click", (e) => {
  if (e.target === buyersModal) buyersModal.style.display = "none";
});

// ---------- View Sellers Modal ----------
const showSellersBtn = document.getElementById("showSellersBtn");
const sellersModal = document.getElementById("sellersModal");
const sellersTableBody = document.querySelector("#sellersTable tbody");
const closeSellersBtn = document.getElementById("closeSellersBtn");

if (showSellersBtn) {
  showSellersBtn.addEventListener("click", async () => {
    console.log("🛍️ View Sellers clicked");
    sellersModal.style.display = "flex";
    sellersTableBody.innerHTML = `<tr><td colspan="3">Loading sellers...</td></tr>`;

    // Fetch all sellers (case-insensitive)
    const { data: sellers, error } = await client
      .from("users")
      .select("username, email, is_active, role")
      .ilike("role", "seller");

    console.log("Fetched sellers data:", sellers, "Error:", error);

    if (error) {
      sellersTableBody.innerHTML = `<tr><td colspan="3">Error loading sellers: ${error.message}</td></tr>`;
      return;
    }

    if (!sellers || sellers.length === 0) {
      sellersTableBody.innerHTML = `<tr><td colspan="3">No sellers found.</td></tr>`;
      return;
    }

    sellersTableBody.innerHTML = "";
    sellers.forEach((seller) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${seller.username || "(no name)"}</td>
      <td>${seller.email}</td>
      <td>${seller.is_active ? "Active" : "Inactive"}</td>
      <td>
        <button class="editUserBtn" data-email="${seller.email}">Edit</button>
        <button class="deleteUserBtn" data-email="${seller.email}">Delete</button>
      </td>
    `;
    sellersTableBody.appendChild(tr);
});

  });
}

if (closeSellersBtn) {
  closeSellersBtn.addEventListener("click", () => {
    sellersModal.style.display = "none";
  });
}

window.addEventListener("click", (e) => {
  if (e.target === sellersModal) sellersModal.style.display = "none";
});

// ---------- Create User Modal ----------
const createUserBtn = document.getElementById("createUserBtn");
const createUserModal = document.getElementById("createUserModal");
const createUserForm = document.getElementById("createUserForm");
const cancelCreateUser = document.getElementById("cancelCreateUser");

if (createUserBtn) {
  createUserBtn.addEventListener("click", () => {
    console.log("🧍‍♀️ Create User clicked");
    createUserModal.style.display = "flex";
  });
}

if (cancelCreateUser) {
  cancelCreateUser.addEventListener("click", () => {
    createUserModal.style.display = "none";
  });
}

// Handle form submission
if (createUserForm) {
  createUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("newUsername").value.trim();
    const email = document.getElementById("newEmail").value.trim();
    const role = document.getElementById("newRole").value;
    const isActive = document.getElementById("newStatus").value === "true";

    if (!username || !email) {
      alert("Please fill out all required fields.");
      return;
    }

    // Insert new user into Supabase
    const { data, error } = await client.from("users").insert([
      {
        id: crypto.randomUUID(),
        username,
        email,
        role,
        is_active: isActive,
      },
    ]);

    if (error) {
      console.error("❌ Error creating user:", error);
      alert("Failed to create user: " + error.message);
      return;
    }

    console.log("✅ New user added:", data);
    showToast(`User ${email} created successfully as ${role}!`);
    createUserForm.reset();
    createUserModal.style.display = "none";
    await loadAllUsers(); // refresh the main users table
    await loadOverviewStats();


  });
}

window.addEventListener("click", (e) => {
  if (e.target === createUserModal) createUserModal.style.display = "none";
});

// ---------- Edit User Modal ----------
const editUserModal = document.getElementById("editUserModal");
const editUserForm = document.getElementById("editUserForm");
const cancelEditUser = document.getElementById("cancelEditUser");
const editUsername = document.getElementById("editUsername");
const editEmail = document.getElementById("editEmail");
const editRole = document.getElementById("editRole");
const editStatus = document.getElementById("editStatus");

let selectedUserEmail = null;

// Open modal when clicking "Edit" in any table
document.body.addEventListener("click", async (e) => {
  if (e.target.classList.contains("editUserBtn")) {
    selectedUserEmail = e.target.getAttribute("data-email");
    console.log("📝 Editing user:", selectedUserEmail);

    // Fetch user data from Supabase
    const { data: user, error } = await client
      .from("users")
      .select("username, email, role, is_active")
      .eq("email", selectedUserEmail)
      .single();

    if (error) {
      alert("Error fetching user: " + error.message);
      return;
    }

    // Populate form
    editUsername.value = user.username;
    editEmail.value = user.email;
    editRole.value = user.role;
    editStatus.value = user.is_active ? "true" : "false";

    // Show modal
    editUserModal.style.display = "flex";
  }
});

// Close modal
if (cancelEditUser) {
  cancelEditUser.addEventListener("click", () => {
    editUserModal.style.display = "none";
  });
}

// Handle save changes
if (editUserForm) {
  editUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newRole = editRole.value;
    const isActive = editStatus.value === "true";

    const { error } = await client
      .from("users")
      .update({ role: newRole, is_active: isActive })
      .eq("email", selectedUserEmail);

    if (error) {
      console.error("❌ Error updating user:", error);
      alert("Failed to update user: " + error.message);
      return;
    }

    showToast(`${selectedUserEmail} updated successfully!`);
    editUserModal.style.display = "none";
    await loadAllUsers(); // refresh the main users table
    await loadOverviewStats();

  });
}

window.addEventListener("click", (e) => {
  if (e.target === editUserModal) editUserModal.style.display = "none";
});

// ---------- Delete User Modal ----------
const deleteUserModal = document.getElementById("deleteUserModal");
const deleteUserText = document.getElementById("deleteUserText");
const confirmDeleteUser = document.getElementById("confirmDeleteUser");
const cancelDeleteUser = document.getElementById("cancelDeleteUser");

let selectedDeleteEmail = null;

// Open confirmation modal when "Delete" is clicked
document.body.addEventListener("click", (e) => {
  if (e.target.classList.contains("deleteUserBtn")) {
    selectedDeleteEmail = (e.target.getAttribute("data-email") || "").trim();
    deleteUserText.textContent = `Are you sure you want to delete ${selectedDeleteEmail}?`;
    deleteUserModal.style.display = "flex";
  }
});

// Cancel deletion
if (cancelDeleteUser) {
  cancelDeleteUser.addEventListener("click", () => {
    deleteUserModal.style.display = "none";
    selectedDeleteEmail = null;
  });
}

// Confirm deletion (robust: verify rows deleted + update UI)
if (confirmDeleteUser) {
  confirmDeleteUser.addEventListener("click", async () => {
    if (!selectedDeleteEmail) return;

    // Normalize email (just in case it was stored in a different case)
    const emailToDelete = selectedDeleteEmail.toLowerCase();

    // 1) Find the exact stored email (avoids case/whitespace mismatches)
    const { data: matchRows, error: findErr } = await client
      .from("users")
      .select("id,email")
      .ilike("email", emailToDelete)
      .limit(1);

    if (findErr) {
      alert("Lookup failed: " + findErr.message);
      return;
    }
    if (!matchRows || matchRows.length === 0) {
      alert("No user found with that email.");
      return;
    }

    const storedEmail = matchRows[0].email;

    // 2) Delete and ask PostgREST to return the deleted ids so we can verify
    const { data: deletedRows, error: delErr } = await client
      .from("users")
      .delete()
      .eq("email", storedEmail)
      .select("id"); // forces returning representation

    if (delErr) {
      console.error("❌ Error deleting user:", delErr);
      alert("Failed to delete user: " + delErr.message);
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      alert("Delete did not affect any rows (policy or filter mismatch).");
      return;
    }

    // 3) Update UI: remove any visible rows that match this email
    document.querySelectorAll(`.editUserBtn[data-email="${storedEmail}"]`).forEach(btn => {
      const tr = btn.closest("tr");
      if (tr) tr.remove();
    });
    document.querySelectorAll(`.deleteUserBtn[data-email="${storedEmail}"]`).forEach(btn => {
      const tr = btn.closest("tr");
      if (tr) tr.remove();
    });

    showToast(`User ${storedEmail} deleted successfully!`);
    deleteUserModal.style.display = "none";
    selectedDeleteEmail = null;
    await loadAllUsers(); // refresh the main users table
    await loadOverviewStats();

  });
}

// Close modal if background is clicked
window.addEventListener("click", (e) => {
  if (e.target === deleteUserModal) deleteUserModal.style.display = "none";
});

// ---------- Load All Users into Main Table ----------
const usersTableBody = document.querySelector("#usersTable tbody");

async function loadAllUsers() {
  usersTableBody.innerHTML = `<tr><td colspan="5">Loading users...</td></tr>`;

  const { data: users, error } = await client
    .from("users")
    .select("username, email, role, is_active")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    usersTableBody.innerHTML = `<tr><td colspan="5">Error loading users: ${error.message}</td></tr>`;
    return;
  }

  if (!users || users.length === 0) {
    usersTableBody.innerHTML = `<tr><td colspan="5">No users found.</td></tr>`;
    return;
  }

  usersTableBody.innerHTML = "";
  users.forEach((user) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${user.username || "(no name)"}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${user.is_active ? "Active" : "Inactive"}</td>
      <td>
        <button class="editUserBtn" data-email="${user.email}">Edit</button>
        <button class="deleteUserBtn" data-email="${user.email}">Delete</button>
      </td>
    `;
    usersTableBody.appendChild(tr);
  });
}

// Load users automatically when the admin dashboard loads
document.addEventListener("DOMContentLoaded", loadAllUsers);



