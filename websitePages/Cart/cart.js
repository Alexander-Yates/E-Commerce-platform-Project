// cart.js — cart view + remove item functionality

const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

// ==========================
// UNIVERSAL CONFIRM MODAL
// ==========================
const modalOverlay = document.getElementById("confirmModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalConfirmBtn = document.getElementById("modalConfirm");
const modalCancelBtn = document.getElementById("modalCancel");

let confirmCallback = null;

function showModal({ title = "Confirm Action", message = "Are you sure?", confirmText = "Confirm", cancelText = "Cancel", onConfirm }) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalConfirmBtn.textContent = confirmText;
  modalCancelBtn.textContent = cancelText;

  confirmCallback = onConfirm;
  modalOverlay.style.display = "flex";
}

function closeModal() {
  modalOverlay.style.display = "none";
  confirmCallback = null;
}

modalConfirmBtn.onclick = () => {
  if (confirmCallback) confirmCallback();
  closeModal();
};
modalCancelBtn.onclick = closeModal;

async function loadCart() {
  const tbody = document.getElementById("cart-items");
  const emptyMsg = document.getElementById("empty-cart-message");
  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping");
  const totalEl = document.getElementById("total");

  const shipping = shippingEl ? parseFloat((shippingEl.textContent || "0").replace(/[^0-9.]/g, "")) || 0 : 0;

  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    tbody.innerHTML = "";
    emptyMsg.style.display = "block";
    subtotalEl.textContent = fmt(0);
    totalEl.textContent = fmt(shipping);
    return;
  }

  const { data: carts } = await client
    .from("carts")
    .select("id")
    .eq("buyer_id", user.id)
    .limit(1);

  if (!carts || carts.length === 0) {
    tbody.innerHTML = "";
    emptyMsg.style.display = "block";
    subtotalEl.textContent = fmt(0);
    totalEl.textContent = fmt(shipping);
    return;
  }

  const cartId = carts[0].id;

  const { data: items } = await client
    .from("cart_items")
    .select("id, product_id, quantity")
    .eq("cart_id", cartId);

  if (!items || items.length === 0) {
    tbody.innerHTML = "";
    emptyMsg.style.display = "block";
    subtotalEl.textContent = fmt(0);
    totalEl.textContent = fmt(shipping);
    return;
  }

  const productIds = [...new Set(items.map(i => i.product_id))];
  const { data: products } = await client
    .from("products")
    .select("id, name, price, image_url")
    .in("id", productIds);

  const pmap = new Map(products.map(p => [p.id, p]));

  let subtotal = 0;
  tbody.innerHTML = "";

  for (const item of items) {
    const p = pmap.get(item.product_id);
    if (!p) continue;

    const price = Number(p.price) || 0;
    const qty = item.quantity || 1;
    const rowSubtotal = price * qty;
    subtotal += rowSubtotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${p.image_url || "https://placehold.co/80x80"}" alt="${p.name}"></td>
      <td>${p.name}</td>
      <td>${fmt(price)}</td>
      <td>
        <div class="quantity-control">
          <button class="quantity-btn minus">-</button>
          <span class="qty">${qty}</span>
          <button class="quantity-btn plus">+</button>
        </div>
      </td>
      <td class="row-subtotal">${fmt(rowSubtotal)}</td>
      <td><button class="remove-btn">Remove</button></td>
    `;

    const minusBtn = tr.querySelector(".minus");
    const plusBtn = tr.querySelector(".plus");
    const qtySpan = tr.querySelector(".qty");
    const removeBtn = tr.querySelector(".remove-btn");

    // ✅ Remove button
    removeBtn.addEventListener("click", () => removeItem(item.id, tr));

    // ➖ Decrease quantity
    minusBtn.addEventListener("click", async () => {
      if (item.quantity <= 1) {
        showModal({
          title: "Remove Item",
          message: "Do you want to remove this item from your cart?",
          confirmText: "Remove",
          onConfirm: async () => {
            await client.from("cart_items").delete().eq("id", item.id);
            await loadCart();
          },
        });
        return;
      }

      const newQty = item.quantity - 1;
      await client.from("cart_items").update({ quantity: newQty }).eq("id", item.id);
      item.quantity = newQty;
      qtySpan.textContent = newQty;
      tr.querySelector(".row-subtotal").textContent = fmt(price * newQty);
      recalcTotals();
    });

    // ➕ Increase quantity
    plusBtn.addEventListener("click", async () => {
      const newQty = item.quantity + 1;
      await client.from("cart_items").update({ quantity: newQty }).eq("id", item.id);
      item.quantity = newQty;
      qtySpan.textContent = newQty;
      tr.querySelector(".row-subtotal").textContent = fmt(price * newQty);
      recalcTotals();
    });

    tbody.appendChild(tr);
  }

  emptyMsg.style.display = items.length ? "none" : "block";
  subtotalEl.textContent = fmt(subtotal);
  totalEl.textContent = fmt(subtotal + shipping);

  // Helper to recalc totals live without full reload
  function recalcTotals() {
    let total = 0;
    document.querySelectorAll(".row-subtotal").forEach(r => {
      total += parseFloat(r.textContent.replace(/[^0-9.]/g, "")) || 0;
    });
    subtotalEl.textContent = fmt(total);
    totalEl.textContent = fmt(total + shipping);
  }
}
// =======================
// REMOVE ITEM FROM CART
// =======================
// --- Modal logic ---
let currentRemoveId = null;
const modal = document.getElementById("removeModal");
const confirmBtn = document.getElementById("confirmRemove");
const cancelBtn = document.getElementById("cancelRemove");

function openRemoveModal(cartItemId) {
  currentRemoveId = cartItemId;
  modal.style.display = "flex";
}
function closeRemoveModal() {
  modal.style.display = "none";
  currentRemoveId = null;
}

async function removeItem(cartItemId, rowElement) {
  showModal({
    title: "Remove Item",
    message: "Are you sure you want to remove this item from your cart?",
    confirmText: "Remove",
    cancelText: "Cancel",
    onConfirm: async () => {
      // fade out row
      if (rowElement) {
        rowElement.classList.add("fade-out");
        await new Promise(res => setTimeout(res, 300));
      }

      const { error } = await client.from("cart_items").delete().eq("id", cartItemId);
      if (error) {
        console.error("Remove item error:", error);
        alert("Failed to remove item.");
      } else {
        await loadCart();
      }
    },
  });
}



document.addEventListener("DOMContentLoaded", loadCart);
