// checkout.js — loads order summary dynamically

const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

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

document.addEventListener("DOMContentLoaded", loadCheckoutSummary);
