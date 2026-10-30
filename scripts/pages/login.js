import { supabase } from "../supabase.js";

export function initLogin() {
  const form = document.getElementById("login-form");
  const errorMessage = document.getElementById("login-error");
  const submitButton = document.getElementById("login-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    errorMessage.hidden = true;
    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect to the Games page after successful login
      window.location.hash = "#/games";
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Sign In";
    }
  });
}
