// becomeseller.js — sends a seller request notification to admin dashboard

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- Supabase Setup ----------
const SUPABASE_URL = "https://mxnagoeammjedhmbfjud.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bmFnb2VhbW1qZWRobWJmanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDc2NjAsImV4cCI6MjA3MjU4MzY2MH0.H_9TQF6QB0nC0PTl2BMR07dopXXLFRUHPHl7ydPUbss";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- DOM Ready ----------
document.addEventListener("DOMContentLoaded", () => {
  const contactBtn = document.getElementById("contactAdminBtn");

  if (!contactBtn) {
    console.error("contactAdminBtn not found in DOM");
    return;
  }

  contactBtn.addEventListener("click", async () => {
    console.log("Contact Admin button clicked");

    // Get currently logged-in user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert("Please log in before applying to be a seller.");
      return;
    }

    const userEmail = user.email;

    try {
      // ---------- Prevent duplicate requests ----------
      const { data: existingRequests, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("type", "seller_request")
        .ilike("message", `%${userEmail}%`);

      if (fetchError) {
        console.warn("Could not check existing requests:", fetchError);
      }

      if (existingRequests && existingRequests.length > 0) {
        alert("You’ve already sent a seller request! Please wait for admin approval.");
        return;
      }

      // ---------- Insert notification ----------
      const message = `User ${userEmail} has requested to become a seller.`;

      const { error: insertError } = await supabase.from("notifications").insert([
        {
          message,
          type: "seller_request",
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        console.error("Error inserting notification:", insertError);
        alert("There was a problem sending your request. Please try again later.");
        return;
      }

      alert("Your seller request has been sent to the admin!");
      console.log("Seller request notification added for:", userEmail);
    } catch (err) {
      console.error("Network or execution error:", err);
      alert("Network error. Please check your connection or try again later.");
    }
  });
});
