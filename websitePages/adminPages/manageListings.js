// Supabase setup
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// DOM refs
const listingsTableBody = document.querySelector("#listingsTable tbody");

async function loadProducts() {
  listingsTableBody.innerHTML = `<tr><td colspan="6">Loading products...</td></tr>`;

  const { data: products, error } = await client
  .from("products")
  .select(`
    id,
    name,
    price,
    category_id,
    is_active,
    image_url,
    seller_id,
    users!inner(email, username)
  `)
  .order("created_at", { ascending: false });


  if (error) {
    listingsTableBody.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
    console.error("Error loading products:", error);
    return;
  }

  if (!products || products.length === 0) {
    listingsTableBody.innerHTML = `<tr><td colspan="6">No products found.</td></tr>`;
    return;
  }

  // Build table
  listingsTableBody.innerHTML = "";
  products.forEach((product) => {
    const tr = document.createElement("tr");
    const statusText = !product.is_approved
      ? "Pending Approval"
      : product.is_active
      ? "Active"
      : "Inactive";

    tr.innerHTML = `
      <td>
        ${product.image_url
          ? `<img src="${product.image_url}" alt="Product" width="50" height="50" style="border-radius:8px;object-fit:cover;margin-right:10px;">`
          : ""}
        ${product.name}
      </td>
      <td>
        <span class="seller-link"
            data-seller-id="${product.seller_id}"
            style="color:var(--teal);cursor:pointer;text-decoration:underline;">
            ${product.users?.username || product.users?.email || "Unknown"}
        </span>
        </td>
      <td>${product.category_id ?? "Uncategorized"}</td>
      <td>$${product.price?.toFixed(2) ?? "N/A"}</td>
      <td>${statusText}</td>
      <td id="actions-${product.id}">
        <button class="delete-btn" data-id="${product.id}">${
      product.is_active ? "Deactivate" : "Reactivate"
    }</button>
      </td>
    `;

    // approve button
    if (!product.is_approved) {
      const actionsCell = tr.querySelector('#actions-${product.id}');
      const approveButton = document.createElement("button");
      approveButton.textContent = "Approve";
      approveButton.classList.add("approve-btn");
      approveButton.setAttribute("data-id", product.id);

      approveButton.style.marginLeft = "10px";
      approveButton.style.backgroundColor = "#4CAF50"
      approveButton.style.color = "white";
      approveButton.style.border = "none";
      approveButton.style.borderRadius = "6px";
      approveButton.style.padding = "6px 10px";
      approveButton.style.cursor = "pointer";

      actionsCell.appendChild(approveButton);
    }
    listingsTableBody.appendChild(tr);
  });
}

// Toggle product active/inactive status
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.getAttribute("data-id");
    const currentRow = e.target.closest("tr");
    const currentStatus = currentRow.cells[4].innerText.includes("✅");
    const confirmAction = confirm(
      currentStatus
        ? "Are you sure you want to deactivate this listing?"
        : "Reactivate this listing?"
    );
    if (!confirmAction) return;

    const { error } = await client
      .from("products")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      alert("Error updating product: " + error.message);
      console.error(error);
      return;
    }

    alert("Product status updated!");
    loadProducts();
  }

  // Admin approval handler
  if (e.target.classList.contains("approve-btn")){
    const id = e.target.getAttribute("data-id");
    const confirmAction = confirm("Approve this product for sale?");
    if(!confirmAction) return;

    const { error } = await client
      .from("products")
      .update({ is_approved: true, updated_at: new Date() })
      .eq("id", id);

    if (error) {
      alert("Error approving product: " + error.message);
      console.error(error);
      return;
    }

    alert("Product approved successfully!");
    loadProducts();
  }
});

// ---------- Seller Modal Logic ----------
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("seller-link")) {
    const sellerId = e.target.dataset.sellerId;

    // Fetch seller details
    const { data, error } = await client
      .from("users")
      .select("username, email, role, is_active")
      .eq("id", sellerId)
      .single();

    if (error || !data) {
      alert("Could not load seller info.");
      console.error(error);
      return;
    }

    // Populate modal
    document.getElementById("sellerModalName").textContent =
      data.username || "(No username)";
    document.getElementById("sellerModalEmail").textContent = `Email: ${data.email}`;
    document.getElementById("sellerModalRole").textContent = `Role: ${data.role}`;
    document.getElementById("sellerModalStatus").textContent = `Status: ${
      data.is_active ? "✅ Active" : "❌ Inactive"
    }`;

    // Show modal
    document.getElementById("sellerModal").style.display = "flex";
  }
});

// Close modal
document.getElementById("closeSellerModal").addEventListener("click", () => {
  document.getElementById("sellerModal").style.display = "none";
});

// Optional: close when clicking outside modal box
document.getElementById("sellerModal").addEventListener("click", (e) => {
  if (e.target.id === "sellerModal") {
    document.getElementById("sellerModal").style.display = "none";
  }
});

document.addEventListener("DOMContentLoaded", loadProducts);
