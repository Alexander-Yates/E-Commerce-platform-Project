// Supabase setup
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("contactAdminBtn").addEventListener("click", async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    alert("Please log in before applying to be a seller.");
    return;
  }

  const userEmail = user.email;
  const subject = encodeURIComponent("Seller Application Request");
  const body = encodeURIComponent(
    `Hello Admin,\n\n` +
    `User ${userEmail} has requested to become a Seller on Doodle & Stick.\n\n` +
    `Please review their profile and update their role in Supabase if approved.`
  );

  // Replace with your actual admin email
  const adminEmail = "MrDoodleNStick@gmail.com";

  window.location.href = `mailto:${adminEmail}?subject=${subject}&body=${body}`;
});
