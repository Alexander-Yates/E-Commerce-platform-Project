import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ordersTableBody = document.getElementById("ordersTableBody");

let allOrders = [];
let allOrderItems = [];
let allSellerProducts = [];
let currentFilter = "all";

async function loadOrders() {
  ordersTableBody.innerHTML = `<tr><td colspan="6" class="no-orders">Loading orders...</td></tr>`;

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    ordersTableBody.innerHTML = `<tr><td colspan="6" class="no-orders">Please log in to view orders.</td></tr>`;
    return;
  }

  const { data: sellerProducts, error: prodErr } = await client
    .from("products")
    .select("id, name")
    .eq("seller_id", user.id);

  if (prodErr || !sellerProducts?.length) {
    ordersTableBody.innerHTML = `<tr><td colspan="6" class="no-orders">No products found for this seller.</td></tr>`;
    return;
  }

  const productIds = sellerProducts.map((p) => p.id);

  const { data: orderItems, error: itemErr } = await client
    .from("order_items")
    .select("order_id, product_id, quantity, price_at_purchase")
    .in("product_id", productIds);

  if (itemErr || !orderItems?.length) {
    ordersTableBody.innerHTML = `<tr><td colspan="6" class="no-orders">No incoming orders yet.</td></tr>`;
    return;
  }

  const orderIds = [...new Set(orderItems.map((oi) => oi.order_id))];

  const { data: orders, error: orderErr } = await client
    .from("orders")
    .select("id, buyer_id, status, created_at, full_name, email, phone, address_line1, address_line2, city, state, zip")
    .in("id", orderIds)
    .order("created_at", { ascending: false });

  if (orderErr || !orders?.length) {
    ordersTableBody.innerHTML = `<tr><td colspan="6" class="no-orders">No matching orders found.</td></tr>`;
    return;
  }

  // Cache data for filtering
  allOrders = orders;
  allOrderItems = orderItems;
  allSellerProducts = sellerProducts;

  renderOrders();
}

function renderOrders() {
  ordersTableBody.innerHTML = "";

  let filteredOrders =
    currentFilter === "all"
      ? allOrders
      : allOrders.filter(
          (order) => order.status?.toLowerCase() === currentFilter
        );

  if (!filteredOrders.length) {
    ordersTableBody.innerHTML = `<tr><td colspan="6" class="no-orders">No orders for this filter.</td></tr>`;
    return;
  }

  filteredOrders.forEach((order) => {
    const relatedItems = allOrderItems.filter(
      (i) => i.order_id === order.id
    );
    const itemNames = relatedItems
      .map(
        (i) =>
          `${allSellerProducts.find((p) => p.id === i.product_id)?.name || "Unknown"} (x${i.quantity})`
      )
      .join(", ");

    const normalizedStatus = order.status?.toLowerCase() || "paid";
    const statusClass =
      normalizedStatus === "shipped"
        ? "shipped"
        : normalizedStatus === "confirmed"
        ? "confirmed"
        : "pending";

    const isShipped = normalizedStatus === "shipped";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${order.id.slice(0, 8)}...</td>
      <td>${order.full_name || order.email}</td>
      <td>${itemNames}</td>
      <td>
        <button class="actionBtn viewAddressBtn" 
          data-name="${order.full_name || "Unknown"}"
          data-address="${order.address_line1 || ""}"
          data-address2="${order.address_line2 || ""}"
          data-city="${order.city || ""}"
          data-state="${order.state || ""}"
          data-zip="${order.zip || ""}">
          View Address
        </button>
      </td>
      <td><span class="status-badge ${statusClass}">${normalizedStatus}</span></td>
      <td>
        ${
          isShipped
            ? `<button class="actionBtn" disabled>Fulfilled</button>`
            : `<button class="actionBtn" data-id="${order.id}" data-status="${normalizedStatus}">Mark Shipped</button>`
        }
      </td>
    `;
    ordersTableBody.appendChild(row);
  });

  attachModalLogic();
}

function attachModalLogic() {
  document.querySelectorAll(".viewAddressBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { name, address, address2, city, state, zip } = btn.dataset;
      const modal = document.getElementById("shippingModal");
      const details = document.getElementById("shippingDetails");

      details.innerHTML = `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Address:</strong> ${address}</p>
        ${address2 ? `<p><strong>Address 2:</strong> ${address2}</p>` : ""}
        <p><strong>City:</strong> ${city}</p>
        <p><strong>State:</strong> ${state}</p>
        <p><strong>ZIP:</strong> ${zip}</p>
      `;

      modal.style.display = "flex";
    });
  });

  const modal = document.getElementById("shippingModal");
  const closeModal = document.getElementById("closeModal");
  const copyBtn = document.getElementById("copyAddressBtn");

  closeModal.onclick = () => (modal.style.display = "none");
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };

  copyBtn.onclick = () => {
    const text = document
      .getElementById("shippingDetails")
      .innerText.replace(/\n+/g, "\n")
      .trim();

    navigator.clipboard
      .writeText(text)
      .then(() => {
        copyBtn.textContent = "Copied!";
        copyBtn.style.background = "var(--teal)";
        setTimeout(() => {
          copyBtn.textContent = "Copy Address";
          copyBtn.style.background = "var(--peach)";
        }, 2000);
      })
      .catch(() => alert("Unable to copy address."));
  };
}

ordersTableBody.addEventListener("click", async (e) => {
  const btn = e.target.closest(".actionBtn");
  if (!btn || btn.classList.contains("viewAddressBtn") || btn.disabled) return;

  const orderId = btn.dataset.id;
  if (!confirm("Mark this order as shipped?")) return;

  // Step 1: Update the order's status
  const { error: orderError } = await client
    .from("orders")
    .update({
      status: "shipped",
      shipped_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (orderError) {
    alert("Failed to update order status.");
    console.error(orderError);
    return;
  }

  // Step 2: Get all order items for this order
  const { data: items, error: itemErr } = await client
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (itemErr) {
    console.error("Error fetching order items:", itemErr);
    return;
  }
  // Step 3: Loop through each product and reduce quantity
for (const item of items) {
  // 1) Get current stock
  const { data: productData, error: productErr } = await client
    .from("products")
    .select("quantity_available")
    .eq("id", item.product_id)
    .single();

  if (productErr || !productData) {
    console.error("Error fetching product:", productErr || "no data");
    continue;
  }

  // 2) Cast to numbers (avoid NaN -> null bug)
  const current = Number(productData.quantity_available ?? 0);
  const delta = Number(item.quantity ?? 0);

  if (Number.isNaN(current) || Number.isNaN(delta)) {
    console.error("Bad quantity values:", {
      product_id: item.product_id,
      current,
      delta,
      raw: { productData, item },
    });
    continue; // don't attempt update with bad values
  }

  const newQuantity = Math.max(current - delta, 0);

  // 3) Update stock
  const { error: updateErr } = await client
    .from("products")
    .update({ quantity_available: newQuantity })
    .eq("id", item.product_id);

  if (updateErr) {
    console.error("Error updating product quantity:", updateErr, {
      product_id: item.product_id,
      newQuantity,
    });
  }
}
  // Step 4: Update the UI instantly
  const statusCell = btn.closest("tr").querySelector(".status-badge");
  statusCell.textContent = "shipped";
  statusCell.className = "status-badge shipped";
  btn.textContent = "Fulfilled";
  btn.disabled = true;
  btn.style.opacity = "0.7";
  btn.style.cursor = "not-allowed";

  // Step 5: Update cache
  const order = allOrders.find((o) => o.id === orderId);
  if (order) order.status = "shipped";
});


document.addEventListener("DOMContentLoaded", loadOrders);
