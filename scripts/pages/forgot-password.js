import { supabase } from "../supabase.js";

export function initForgotPassword() {
  const form = document.getElementById("forgot-password-form");
  const submitButton = document.getElementById("forgot-password-submit");
  const message = document.getElementById("forgot-password-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("forgot-password-email").value.trim();

    submitButton.disabled = true;
    message.hidden = true;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      });

      if (error) throw error;

      message.textContent =
        "If an account exists for this email, you will receive a password reset link shortly.";
      message.className = "text-sm text-green-400";
      message.hidden = false;
    } catch (error) {
      console.error("Password recovery failed:", error);

      message.textContent =
        "Unable to send the reset link right now. Please try again later.";
      message.className = "text-sm text-red-400";
      message.hidden = false;
    } finally {
      submitButton.disabled = false;
    }
  });
}
