// buyerprofile.js
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

document.addEventListener("DOMContentLoaded", async () => {
  const nameEl = document.getElementById("buyerName");
  const emailEl = document.getElementById("buyerEmail");
  const joinDateEl = document.getElementById("joinDate");
  const orderCountEl = document.getElementById("orderCount");
  const ordersList = document.getElementById("ordersList");
  const logoutBtn = document.getElementById("logoutBtn");

  // ✅ 1. Try restoring an existing session
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError) console.warn("Session check error:", sessionError);

  let user = session?.user || null;

  // ✅ 2. If no session, check again (sometimes needed on fast reloads)
  if (!user) {
    const { data: userData, error: userError } = await client.auth.getUser();
    if (!userError) user = userData.user;
  }

  // ✅ 3. If still no user, redirect to login
  if (!user) {
    alert("Please log in to view your profile.");
    window.location.href = "login.html";
    return;
  }

  // ✅ 4. Populate profile info
  nameEl.textContent = user.user_metadata?.name || "Buyer";
  emailEl.textContent = user.email;
  joinDateEl.textContent = new Date(user.created_at).toLocaleDateString();

  // ✅ 5. Fetch all orders for this buyer
  const { data: orders, error: ordersError } = await client
    .from("orders")
    .select("id, status, created_at, confirmed_at, shipped_at, full_name, city, state")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("Orders error:", ordersError);
    ordersList.innerHTML = `<p style="color:red;">Error loading orders: ${ordersError.message}</p>`;
    return;
  }

  if (!orders || orders.length === 0) {
    ordersList.innerHTML = `<p>You haven’t placed any orders yet.</p>`;
  } else {
    ordersList.innerHTML = "";
    orders.forEach(order => {
      const div = document.createElement("div");
      div.classList.add("order");

      const confirmed = order.confirmed_at
        ? new Date(order.confirmed_at).toLocaleDateString()
        : "—";
      const shipped = order.shipped_at
        ? new Date(order.shipped_at).toLocaleDateString()
        : "—";

      div.innerHTML = `
        <p><strong>Order #${order.id}</strong></p>
        <p>Status: <strong>${order.status || "Pending"}</strong></p>
        <p>Placed: ${new Date(order.created_at).toLocaleDateString()}</p>
        <p>Confirmed: ${confirmed}</p>
        <p>Shipped: ${shipped}</p>
        <p>Recipient: ${order.full_name || "—"}</p>
        <p>Location: ${order.city || ""}${order.state ? ", " + order.state : ""}</p>
      `;
      ordersList.appendChild(div);
    });
  }

  orderCountEl.textContent = orders ? orders.length : 0;

  // ✅ 6. Handle logout
  logoutBtn.addEventListener("click", async () => {
    await client.auth.signOut();
    alert("You’ve been logged out!");
    window.location.href = "index.html";
  });
});
