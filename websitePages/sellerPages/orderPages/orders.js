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

  // Fetch all transactions for this seller, joined with their related orders
  const { data: txOrders, error: txErr } = await client
    .from("transactions")
    .select(`
      id,
      amount,
      payment_status,
      seller_id,
      orders!inner(
        id,
        buyer_id,
        full_name,
        email,
        address_line1,
        address_line2,
        city,
        state,
        zip,
        status
      )
    `)
    .eq("seller_id", user.id);

  if (txErr || !txOrders?.length) {
    console.error("Error fetching transactions/orders:", txErr);
    ordersTableBody.innerHTML = `<tr><td colspan="6" class="no-orders">No matching orders found.</td></tr>`;
    return;
  }

  const { data: transactions, error: transErr } = await client
    .from("transactions")
    .select("order_id, amount")
    .in("order_id", orderIds);

  if (transErr) {
    console.error("Failed to fetch transactions:", transErr);
  }

  orders.forEach(order => {
    const tx = transactions?.find(t => t.order_id === order.id);
    order.amount = tx ? tx.amount : 0;//assign 0 if no transaction found
  });

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
    ordersTableBody.innerHTML = `<tr><td colspan="7" class="no-orders">No orders for this filter.</td></tr>`;
    return;
  }

  filteredOrders.forEach((order) => {
    const relatedItems = allOrderItems.filter((i) => i.order_id === order.id);
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

    const refundStatus =
      normalizedStatus === "refund_requested"
        ? "requested"
        : normalizedStatus === "refunded"
        ? "refunded"
        : null;

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
      <td>${refundBadge}</td>
      <td>
        ${
          refundStatus
            ? `<button class="actionBtn refundInProgressBtn"
                data-id="${order.id}"
                data-status="${refundStatus}"
                data-amount="${order.amount || 0}">
                Refund in Progress
              </button>`
            : isShipped
            ? `<button class="actionBtn" disabled>Fulfilled</button>`
            : `<button class="actionBtn" 
                data-id="${order.id}" 
                data-status="${normalizedStatus}">
                Mark Shipped
              </button>`
        }
      </td>
    `;
    ordersTableBody.appendChild(row);
  });

  attachModalLogic();
  attachRefundLogic();
}

const attachModalLogic = () => {
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
};

const attachRefundLogic = () => {
  document.querySelectorAll(".refundInProgressBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = document.getElementById("refundModal");
      const details = document.getElementById("refundDetails");

      const orderId = btn.dataset.id;
      const status = btn.dataset.status;
      const amount = parseFloat(btn.dataset.amount ?? 0).toFixed(2);

      details.innerHTML = `
        <p><strong>Status:</strong> Refund Requested</p>
        <p><strong>Amount:</strong> $${amount}</p>
        <p>This refund request is currently <b>${status}</b>. Click below to complete the refund and mark this order as refunded.</p>
        <button id="completeRefundBtn" class="actionBtn"
          data-id="${orderId}"
          style="margin-top:10px;background:var(--teal);">
          Complete Refund
        </button>
      `;

      modal.style.display = "flex";

      //refund handler
      const completeRefundBtn = document.getElementById("completeRefundBtn");
      completeRefundBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to complete this refund?")) return;

        const { error: refundErr } = await client
          .from("orders")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        
        if (refundErr) {
          alert("Failed to complete refund.");
          console.error(refundErr);
          return;
        }

        const { data: transactionData, error: transErr } = await client
          .from("transactions")
          .select("amount, seller_id")
          .eq("order_id", orderId)
          .single();

        if (transErr || !transactionData) {
          console.error("Transaction not found:", transErr);
        } else {
          const refundAmount = Number(transactionData.amount ?? 0);
          const sellerId = transactionData.seller_id;

          const { error: updateSellerErr } = await client
            .from("sellers")
            .update({
              total_sales: client.rpc("total_sales - ?", [refundAmount])
            })
            .eq("id", sellerId);

          if (updateSellerErr) {
            console.error("Failed to update seller's total sales:", updateSellerErr);
          }
        }

        alert("Refund marked as completed.");
        modal.style.display = "none";
        loadOrders();
      });
    });
  });

  const closeRefundModal = document.getElementById("closeRefundModal");
  closeRefundModal.onclick = () => {
    document.getElementById("refundModal").style.display = "none";
  };
  window.onclick = (e) => {
    if (e.target === document.getElementById("refundModal")) {
      e.target.style.display = "none";
    }
  };
};

ordersTableBody.addEventListener("click", async (e) => {
  const btn = e.target.closest(".actionBtn");
  if (
    !btn ||
    btn.classList.contains("viewAddressBtn") ||
    btn.classList.contains("refundInProgressBtn") ||
    btn.disabled
  ) return;

  const orderId = btn.dataset.id;
  if (!confirm("Mark this order as shipped?")) return;

  // Update the order's status
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

  // Get all order items for this order
  const { data: items, error: itemErr } = await client
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (itemErr) {
    console.error("Error fetching order items:", itemErr);
    return;
  }
  // Loop through each product and reduce quantity
for (const item of items) {
  // Get current stock
  const { data: productData, error: productErr } = await client
    .from("products")
    .select("quantity_available")
    .eq("id", item.product_id)
    .single();

  if (productErr || !productData) {
    console.error("Error fetching product:", productErr || "no data");
    continue;
  }

  // Cast to numbers
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

  // Update stock
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
  // Update the UI
  const statusCell = btn.closest("tr").querySelector(".status-badge");
  statusCell.textContent = "shipped";
  statusCell.className = "status-badge shipped";
  btn.textContent = "Fulfilled";
  btn.disabled = true;
  btn.style.opacity = "0.7";
  btn.style.cursor = "not-allowed";

  // Update cache
  const order = allOrders.find((o) => o.id === orderId);
  if (order) order.status = "shipped";
});


document.addEventListener("DOMContentLoaded", loadOrders);
