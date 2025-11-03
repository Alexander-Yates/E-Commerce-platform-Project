// Initializes Supabase client for authentication and database use
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

document.addEventListener("DOMContentLoaded", async () => {
  // Gets references to UI elements
  const nameEl = document.getElementById("buyerName");
  const emailEl = document.getElementById("buyerEmail");
  const joinDateEl = document.getElementById("joinDate");
  const orderCountEl = document.getElementById("orderCount");
  const ordersList = document.getElementById("ordersList");
  const logoutBtn = document.getElementById("logoutBtn");

  // Attempt to restore the current logged-in session
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError) console.warn("Session check error:", sessionError);

  let user = session?.user || null;

  // If session is not ready yet, attempt retrieving user again
  if (!user) {
    const { data: userData, error: userError } = await client.auth.getUser();
    if (!userError) user = userData.user;
  }

  // Redirect to login page if no authenticated user is found
  if (!user) {
    alert("Please log in to view your profile.");
    window.location.href = "login.html";
    return;
  }

  // Display user account information
  nameEl.textContent = user.user_metadata?.name || "Buyer";
  emailEl.textContent = user.email;
  joinDateEl.textContent = new Date(user.created_at).toLocaleDateString();

  // Fetch all orders linked to the current user
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

  // Show message if user has no past orders
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

      // Display order details and refund button
      div.innerHTML = `
        <p><strong>Order #${order.id}</strong></p>
        <p>Status: <strong>${order.status || "Pending"}</strong></p>
        <p>Placed: ${new Date(order.created_at).toLocaleDateString()}</p>
        <p>Confirmed: ${confirmed}</p>
        <p>Shipped: ${shipped}</p>
        <p>Recipient: ${order.full_name || "—"}</p>
        <p>Location: ${order.city || ""}${order.state ? ", " + order.state : ""}</p>
        <br>
        <button class="refund-btn" data-id="${order.id}" ${order.status === "refund_requested" ? "disabled" : ""}>
          ${order.status === "refund_requested" ? "Refund Requested" : "Request Refund"}
        </button>
      `;
      ordersList.appendChild(div);
    });
  }

  // Display the total number of orders
  orderCountEl.textContent = orders ? orders.length : 0;

  // Update order status to refund_requested when refund button is clicked
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("refund-btn")) {
      const orderId = e.target.getAttribute("data-id");

      const { error } = await client
        .from("orders")
        .update({ status: "refund_requested" })
        .eq("id", orderId);

      if (error) {
        alert("Failed to request refund.");
        console.error(error);
      } else {
        alert("Refund request submitted.");
        e.target.textContent = "Refund Requested";
        e.target.disabled = true;
      }
    }
  });

  // Sign the user out when the logout button is clicked
  logoutBtn.addEventListener("click", async () => {
    await client.auth.signOut();
    alert("You’ve been logged out!");
    window.location.href = "index.html";
  });
});
