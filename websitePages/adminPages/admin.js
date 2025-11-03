// admin.js
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const notifBtn = document.getElementById("notifBtn");
const notifBadge = document.getElementById("notifBadge");
const notifDropdown = document.getElementById("notifDropdown");
const logoutBtn = document.getElementById("logoutBtn");

const showBuyersBtn = document.getElementById("showBuyersBtn");
const buyersModal = document.getElementById("buyersModal");
const buyersTableBody = document.querySelector("#buyersTable tbody");
const closeBuyersBtn = document.getElementById("closeBuyersBtn");

let unreadCount = 0;

// dropdown
if (notifBtn) {
  notifBtn.addEventListener("click", () => {
    notifDropdown.classList.toggle("show");
    notifBadge.style.display = "none";
    unreadCount = 0;
  });
}

// logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await client.auth.signOut();
    window.location.href = "../index.html";
  });
}

// listens for notifications
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

// add notification to bell icon dropdown
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

// get user email
function extractEmail(msg) {
  const match = msg.match(/User (.+?) has requested/);
  return match ? match[1] : null;
}

// approve seller
notifDropdown.addEventListener("click", async (e) => {
  if (e.target.classList.contains("approveBtn")) {
    const email = e.target.getAttribute("data-email");
    if (!email) return alert("Could not extract user email.");

    const { error } = await client.from("users").update({ role: "seller" }).eq("email", email);
    if (error) {
      alert("Error approving seller: " + error.message);
    } else {
      e.target.textContent = "Approved";
      e.target.disabled = true;
      e.target.style.background = "#4b8c8d";
      showToast(`${email} is now a seller!`);
    }
  }
});

// toast for notification popup
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
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
} 

// loads the stats in the overview
async function loadOverviewStats() {
  try {
    // buyers
    const { count: buyerCount, error: buyerError } = await client
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "buyer")
      .eq("is_active", true);

    if (buyerError) console.error("Error loading buyers:", buyerError);

    // sellers
    const { count: sellerCount, error: sellerError } = await client
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "seller")
      .eq("is_active", true);

    if (sellerError) console.error("Error loading sellers:", sellerError);

    // transcations
    const { count: transactionCount, error: txError } = await client
      .from("orders")
      .select("*", { count: "exact", head: true });

    if (txError) console.error("Error loading transactions:", txError);

    // disputes
    const { count: disputeCount, error: disputeError } = await client
      .from("disputes")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");

    if (disputeError) console.error("Error loading disputes:", disputeError);

    // update the UI
    document.getElementById("buyerCount").textContent = buyerCount ?? 0;
    document.getElementById("sellerCount").textContent = sellerCount ?? 0;
    document.getElementById("transactionCount").textContent = transactionCount ?? 0;
    document.getElementById("disputeCount").textContent = disputeCount ?? 0;

  } catch (err) {
    console.error("Error loading overview stats:", err);
  }
}

// load stats on page load
document.addEventListener("DOMContentLoaded", loadOverviewStats);

// view buyers
if (showBuyersBtn) {
  showBuyersBtn.addEventListener("click", async () => {
    console.log("View Buyers clicked");
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

// view sellers
const showSellersBtn = document.getElementById("showSellersBtn");
const sellersModal = document.getElementById("sellersModal");
const sellersTableBody = document.querySelector("#sellersTable tbody");
const closeSellersBtn = document.getElementById("closeSellersBtn");

if (showSellersBtn) {
  showSellersBtn.addEventListener("click", async () => {
    console.log("View Sellers clicked");
    sellersModal.style.display = "flex";
    sellersTableBody.innerHTML = `<tr><td colspan="3">Loading sellers...</td></tr>`;

    // fetch all sellers
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

// create user
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

// form logic for creating a user
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

    // insert newly made user into supabase
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
      console.error("Error creating user:", error);
      alert("Failed to create user: " + error.message);
      return;
    }

    console.log("New user added:", data);
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

// edit user
const editUserModal = document.getElementById("editUserModal");
const editUserForm = document.getElementById("editUserForm");
const cancelEditUser = document.getElementById("cancelEditUser");
const editUsername = document.getElementById("editUsername");
const editEmail = document.getElementById("editEmail");
const editRole = document.getElementById("editRole");
const editStatus = document.getElementById("editStatus");

let selectedUserEmail = null;

// open edit menu when "edit" is clicked
document.body.addEventListener("click", async (e) => {
  if (e.target.classList.contains("editUserBtn")) {
    selectedUserEmail = e.target.getAttribute("data-email");
    console.log("Editing user:", selectedUserEmail);

    // get user data
    const { data: user, error } = await client
      .from("users")
      .select("username, email, role, is_active")
      .eq("email", selectedUserEmail)
      .single();

    if (error) {
      alert("Error fetching user: " + error.message);
      return;
    }

    // add values to form
    editUsername.value = user.username;
    editEmail.value = user.email;
    editRole.value = user.role;
    editStatus.value = user.is_active ? "true" : "false";

    // show modal
    editUserModal.style.display = "flex";
  }
});

// close modal
if (cancelEditUser) {
  cancelEditUser.addEventListener("click", () => {
    editUserModal.style.display = "none";
  });
}

// save changes
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
      console.error("Error updating user:", error);
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

// delete user
const deleteUserModal = document.getElementById("deleteUserModal");
const deleteUserText = document.getElementById("deleteUserText");
const confirmDeleteUser = document.getElementById("confirmDeleteUser");
const cancelDeleteUser = document.getElementById("cancelDeleteUser");

let selectedDeleteEmail = null;

// open confirmation modal when "Delete" is clicked
document.body.addEventListener("click", (e) => {
  if (e.target.classList.contains("deleteUserBtn")) {
    selectedDeleteEmail = (e.target.getAttribute("data-email") || "").trim();
    deleteUserText.textContent = `Are you sure you want to delete ${selectedDeleteEmail}?`;
    deleteUserModal.style.display = "flex";
  }
});

// cancel deletion
if (cancelDeleteUser) {
  cancelDeleteUser.addEventListener("click", () => {
    deleteUserModal.style.display = "none";
    selectedDeleteEmail = null;
  });
}

// confirm deletion
if (confirmDeleteUser) {
  confirmDeleteUser.addEventListener("click", async () => {
    if (!selectedDeleteEmail) return;

    // normalize email (in case it's a weirdly capatailized mess)
    const emailToDelete = selectedDeleteEmail.toLowerCase();

    // gets exact email
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

    // delete and ask for deleted ids
    const { data: deletedRows, error: delErr } = await client
      .from("users")
      .delete()
      .eq("email", storedEmail)
      .select("id"); // forces returning representation

    if (delErr) {
      console.error("Error deleting user:", delErr);
      alert("Failed to delete user: " + delErr.message);
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      alert("Delete did not affect any rows (policy or filter mismatch).");
      return;
    }

    // update ui so no rows from removed id is showing
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

// close modal if background is clicked
window.addEventListener("click", (e) => {
  if (e.target === deleteUserModal) deleteUserModal.style.display = "none";
});

// load all users
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

async function loadRecentTransactions() {
  const table = document.querySelector("#transactionsTable tbody");
  if (!table) return console.error(" Could not find #transactionsTable tbody in DOM.");

  table.innerHTML = `<tr><td colspan="5">Loading recent transactions...</td></tr>`;

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString();

    console.log("Fetching transactions since:", thirtyDaysAgo);

    const { data: transactions, error } = await client
  .from("transactions")
  .select(`
    id,
    amount,
    payment_status,
    created_at,
    seller_id,
    orders!left(
      id,
      buyer_id,
      full_name,
      status
    ),
    seller:users!transactions_seller_id_fkey(
      username,
      email
    )
  `)
  .gte("created_at", thirtyDaysAgo)
  .order("created_at", { ascending: false });


    console.log("Query result:", transactions, "Error:", error);

    if (error) {
      table.innerHTML = `<tr><td colspan="5">Error loading transactions: ${error.message}</td></tr>`;
      return;
    }

    if (!transactions || transactions.length === 0) {
      table.innerHTML = `<tr><td colspan="5">No transactions found in the last 30 days.</td></tr>`;
      return;
    }

    table.innerHTML = "";

    transactions.forEach((tx) => {
      const orderId = tx.orders?.id?.slice(0, 8) || "—";
      const buyer =
        tx.orders?.full_name ||
        tx.orders?.buyer_id?.slice(0, 8) ||
        "Unknown Buyer";
      const seller = tx.seller?.username || tx.seller?.email || tx.seller_id?.slice(0, 8) || "Unknown Seller";
      const total = `$${Number(tx.amount || 0).toFixed(2)}`;
      const status = tx.payment_status || "—";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${orderId}</td>
        <td>${buyer}</td>
        <td>${seller}</td>
        <td>${total}</td>
        <td>${status}</td>
      `;
      table.appendChild(row);
    });
  } catch (err) {
    console.error("Unexpected error loading transactions:", err);
    table.innerHTML = `<tr><td colspan="5">Failed to load transactions.</td></tr>`;
  }
}



// load users after the page finishes loading
document.addEventListener("DOMContentLoaded", () => {
  loadAllUsers();
  loadOverviewStats();
  loadRecentTransactions();
});



