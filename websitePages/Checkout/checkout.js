// checkout.js — loads order summary dynamically

const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

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


const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

async function loadCheckoutSummary() {
  const list = document.getElementById("cart-items");
  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping-cost");
  const totalEl = document.getElementById("total-amount");

  const shipping = 3.5;

  const { data: { session } } = await client.auth.getSession();
  const user = session?.user;
  
  if (!user) {
  console.warn("No active session found — retrying in 300ms");
  await new Promise(res => setTimeout(res, 300));
  const retry = await client.auth.getSession();
  if (!retry.data?.session?.user) {
    list.innerHTML = `<p style="color:var(--brown);font-weight:500;">Please log in to continue.</p>`;
    return;
  }
}


  // Step 1: Get or create the user's cart
const { data: carts, error: cartErr } = await client
  .from("carts")
  .select("id")
  .eq("buyer_id", user.id)
  .limit(1);

if (cartErr) {
  console.error("Cart fetch error:", cartErr);
  list.innerHTML = `<p style="color:var(--brown);font-weight:500;">Error fetching cart.</p>`;
  return;
}

let cartId;
if (!carts || carts.length === 0) {
  // Optional: automatically create one if it doesn’t exist
  const { data: newCart, error: newCartErr } = await client
    .from("carts")
    .insert([{ buyer_id: user.id }])
    .select("id")
    .single();
  if (newCartErr) {
    console.error("Cart creation error:", newCartErr);
    list.innerHTML = `<p style="color:var(--brown);font-weight:500;">Could not create cart.</p>`;
    return;
  }
  cartId = newCart.id;
} else {
  cartId = carts[0].id;
}


  // Step 2: Get cart items for that cart_id
const { data: items, error: itemsErr } = await client
  .from("cart_items")
  .select(`
    id,
    quantity,
    products (
      id,
      name,
      price
    )
  `)
  .eq("cart_id", cartId);
console.log("Current user:", user.id);
console.log("Active cart:", cartId);


if (itemsErr) {
  console.error("Cart items fetch error:", itemsErr);
  list.innerHTML = `<p style="color:var(--brown);font-weight:500;">Error loading cart items.</p>`;
  return;
}

if (!items || items.length === 0) {
  list.innerHTML = `<p style="color:var(--brown);font-weight:500;">Your cart is empty.</p>`;
  return;
}

list.innerHTML = "";
let subtotal = 0;
for (const { quantity, products: p } of items) {
    if (!p) continue;
    const price = Number(p.price);
    subtotal += price * quantity;

    const row = document.createElement("div");
    row.className = "checkout-item";
    row.innerHTML = `
      <span>${p.name} <small>× ${quantity}</small></span>
      <span>${fmt(price * quantity)}</span>
    `;
    list.appendChild(row);
  }

subtotalEl.textContent = fmt(subtotal);
shippingEl.textContent = fmt(shipping);
totalEl.textContent = fmt(subtotal + shipping);
}

// =======================
// MOCK PAYMENT & ORDER LOGIC
// =======================
document.getElementById("place-order-btn").addEventListener("click", async () => {
  const { data: { session } } = await client.auth.getSession();
  const user = session?.user;
  if (!user) return alert("You must be logged in to place an order.");

  // Gather form data
  const name = document.getElementById("customer-name").value.trim();
  const email = document.getElementById("customer-email").value.trim();
  const phone = document.getElementById("customer-phone").value.trim();
  const addr1 = document.getElementById("address-line1").value.trim();
  const addr2 = document.getElementById("address-line2").value.trim();
  const city = document.getElementById("city").value.trim();
  const state = document.getElementById("state").value.trim();
  const zip = document.getElementById("zip").value.trim();

  if (!name || !email || !addr1 || !city || !state || !zip) {
    alert("Please fill out all required fields.");
    return;
  }

  // Retrieve current cart
  const { data: cart, error: cartErr } = await client
    .from("carts")
    .select("id")
    .eq("buyer_id", user.id)
    .single();
  if (cartErr || !cart) return alert("Unable to load your cart.");

  const { data: items, error: itemsErr } = await client
    .from("cart_items")
    .select("product_id, quantity, products(price)")
    .eq("cart_id", cart.id);

  if (itemsErr || !items || items.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  // Calculate totals
  const subtotal = items.reduce((acc, i) => acc + i.products.price * i.quantity, 0);
  const shipping = 3.5;
  const total = subtotal + shipping;

  // Confirm mock payment
  showModal({
    title: "Confirm Payment",
    message: `Total: $${total.toFixed(2)}. Proceed with mock payment?`,
    confirmText: "Pay Now",
    cancelText: "Cancel",
    onConfirm: async () => {
      // Simulate "processing payment"
      const processingModal = document.createElement("div");
      processingModal.style = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.5rem;
        z-index: 9999;
      `;
      processingModal.innerHTML = `<div>Processing Payment...</div>`;
      document.body.appendChild(processingModal);

      await new Promise(res => setTimeout(res, 1500)); // mock 1.5s delay
      processingModal.remove();

      // Create order
      const { data: newOrder, error: orderErr } = await client
        .from("orders")
        .insert([
          {
            buyer_id: user.id,
            status: "paid",
            full_name: name,
            email,
            phone,
            address_line1: addr1,
            address_line2: addr2,
            city,
            state,
            zip,
            created_at: new Date().toISOString()
          }
        ])
        .select("id")
        .single();

      if (orderErr) {
        console.error("Order creation error:", orderErr);
        alert("Error creating order.");
        return;
      }

      const orderId = newOrder.id;

      // Add order_items
      const orderItems = items.map(i => ({
        order_id: orderId,
        product_id: i.product_id,
        quantity: i.quantity,
        price_at_purchase: i.products.price
      }));

      const { error: oiErr } = await client.from("order_items").insert(orderItems);
      if (oiErr) {
        console.error("Order items error:", oiErr);
        alert("Error adding items to order.");
        return;
      }

      // Insert into transactions (mock payment success)
      const { error: txErr } = await client.from("transactions").insert([
        {
          order_id: orderId,
          amount: total,
          payment_status: "success",
          error_message: null,
          created_at: new Date().toISOString()
        }
      ]);
      if (txErr) {
        console.error("Transaction error:", txErr);
        alert("Error recording transaction.");
        return;
      }

      // Clear cart
      await client.from("cart_items").delete().eq("cart_id", cart.id);

      showModal({
        title: "Payment Successful",
        message: "Your order has been placed successfully!",
        confirmText: "Return Home",
        cancelText: "Stay Here",
        onConfirm: () => {
          window.location.href = "../index.html";
        }
      });
    }
  });
});




// =======================
// LOGOUT FUNCTIONALITY
// =======================
document.getElementById("logoutBtn").addEventListener("click", () => {
  showModal({
    title: "Log Out",
    message: "Are you sure you want to log out?",
    confirmText: "Logout",
    cancelText: "Cancel",
    onConfirm: async () => {
      const { error } = await client.auth.signOut();
      if (error) {
        alert("Logout failed. Please try again.");
        console.error("Logout error:", error);
        return;
      }
      window.location.href = "../index.html";
    },
  });
});


document.addEventListener("DOMContentLoaded", loadCheckoutSummary);
