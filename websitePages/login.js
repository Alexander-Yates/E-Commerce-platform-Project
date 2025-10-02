// Supabase setup
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM references
const loginForm = document.getElementById("login-form");
const errorDiv = document.getElementById("error");
const loader = document.getElementById("loader");
const forgotPasswordLink = document.getElementById("forgot-password");

// Handle login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorDiv.style.display = "none";
  loader.style.display = "block";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Attempt login
  const { data: { user, session }, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = "block";
    loader.style.display = "none";
    return;
  }

  // Check users table for extra info
  const { data: userRecord, error: fetchError } = await client
    .from("users") // or "profiles"
    .select("*")
    .eq("id", user.id)
    .single();

  if (fetchError || !userRecord) {
    errorDiv.textContent = "User record not found.";
    errorDiv.style.display = "block";
    loader.style.display = "none";
    return;
  }

  if (!userRecord.is_active) {
    errorDiv.textContent = "Your account is inactive. Please contact support.";
    errorDiv.style.display = "block";
    loader.style.display = "none";
    return;
  }

  loader.style.display = "none";
  alert("Login successful!");
  window.location.href = "index.html"; // redirect to homepage
});

// Handle forgot password
forgotPasswordLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();

  if (!email) {
    errorDiv.textContent = "Please enter your email above first.";
    errorDiv.style.display = "block";
    return;
  }

  const { data, error } = await client.auth.resetPasswordForEmail(email);

  if (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = "block";
    return;
  }

  alert("Password reset email sent! Check your inbox.");
});
