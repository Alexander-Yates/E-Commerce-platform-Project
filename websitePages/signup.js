// Supabase setup
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const signupForm = document.getElementById("signup-form");
const errorDiv = document.getElementById("error");
const loader = document.getElementById("loader");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorDiv.style.display = "none";
  loader.style.display = "block";

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (password !== confirmPassword) {
    errorDiv.textContent = "Passwords do not match!";
    errorDiv.style.display = "block";
    loader.style.display = "none";
    return;
  }

  // Create user in Supabase Auth
  const { data, error } = await client.auth.signUp({ email, password });

  if (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = "block";
    loader.style.display = "none";
    return;
  }


  // Insert user into users table
  if (data.user) {
    try {
      const response = await fetch(
     "https://mxnagoeammjedhmbfjud.functions.supabase.co/create-profile",
   {
    method: "POST",
    headers: { "Content-Type": "application/json",
               "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
     },
    body: JSON.stringify({
      id: data.user.id,
      email,
      username,
      role: "buyer",
      is_active: true,
    }),
   }
);


      if (!response.ok) throw new Error(await response.text());
    } catch (err) {
      console.error("Profile creation failed:", err);
      errorDiv.textContent = "Failed to save user profile (server).";
      errorDiv.style.display = "block";
      loader.style.display = "none";
      return;
    }
  }

  loader.style.display = "none";
  alert("Account created! Please check your email to confirm your account.");
  window.location.href = "login.html";
});
