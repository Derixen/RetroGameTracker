import { supabase } from "../supabase.js";

export function initLogin() {
  const form = document.getElementById("login-form");
  const errorMessage = document.getElementById("login-error");
  const successMessage = document.getElementById("login-success");
  const submitButton = document.getElementById("login-submit");

  const title = document.getElementById("auth-title");
  const description = document.getElementById("auth-description");
  const switchText = document.getElementById("auth-switch-text");
  const switchButton = document.getElementById("auth-switch-button");
  const passwordInput = document.getElementById("login-password");
  const passwordRequirements = document.getElementById("password-requirements");

  let isRegistering = false;

  // Temporary: Public registration disabled during development
  switchButton.hidden = true;
  switchText.hidden = true;

  // Switch between Sign In and Create Account
  switchButton.addEventListener("click", () => {
    return; // Registration temporarily disabled
    document.getElementById("password-requirements").hidden = !isRegistering;
    passwordInput.minLength = isRegistering ? 12 : 0;
    isRegistering = !isRegistering;
    passwordRequirements.hidden = !isRegistering;
    passwordInput.minLength = isRegistering ? 12 : 0;

    title.textContent = isRegistering ? "Create Account" : "Sign In";

    description.textContent = isRegistering
      ? "Create your own retro game collection."
      : "Sign in to manage your retro game collection.";

    submitButton.textContent = isRegistering ? "Create Account" : "Sign In";

    switchText.textContent = isRegistering
      ? "Already have an account?"
      : "Don't have an account?";

    switchButton.textContent = isRegistering ? "Sign In" : "Create Account";

    passwordInput.autocomplete = isRegistering
      ? "new-password"
      : "current-password";

    errorMessage.hidden = true;
    successMessage.hidden = true;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = passwordInput.value;

    errorMessage.hidden = true;
    successMessage.hidden = true;

    submitButton.disabled = true;
    switchButton.disabled = true;

    submitButton.textContent = isRegistering
      ? "Creating account..."
      : "Signing in...";

    try {
      if (isRegistering) {
        if (password.length < 12) {
          throw new Error("Password must contain at least 12 characters.");
        }

        if (
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password) ||
          !/[0-9]/.test(password) ||
          !/[^a-zA-Z0-9]/.test(password)
        ) {
          throw new Error(
            "Password must include uppercase and lowercase letters, a number, and a special character.",
          );
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "https://derixen.github.io/RetroGameTracker/",
          },
        });

        if (error) throw error;

        successMessage.textContent =
          "Check your email for a confirmation link to activate your account.";
        successMessage.hidden = false;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        window.location.hash = "#/games";
      }
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    } finally {
      submitButton.disabled = false;
      switchButton.disabled = false;

      submitButton.textContent = isRegistering ? "Create Account" : "Sign In";
    }
  });
}
