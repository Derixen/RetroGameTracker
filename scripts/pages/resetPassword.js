import { supabase } from "../supabase.js";
import { confirmDialog } from "../components/confirmDialog.js";

export async function initResetPassword() {
  const form = document.getElementById("reset-password-form");
  const submitButton = document.getElementById("reset-password-submit");

  const recoveryActive = sessionStorage.getItem("passwordRecovery") === "true";

  if (!recoveryActive) {
    await confirmDialog({
      title: "Invalid Recovery Link",
      message: "Please request a new password reset link.",
      alertOnly: true,
    });

    window.location.hash = "#/login";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = document.getElementById("reset-new-password").value;

    const confirmation = document.getElementById(
      "reset-confirm-password",
    ).value;

    if (
      password.length < 12 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^a-zA-Z0-9]/.test(password)
    ) {
      await confirmDialog({
        title: "Weak Password",
        message:
          "Password must be at least 12 characters and include uppercase and lowercase letters, a number, and a special character.",
        alertOnly: true,
      });
      return;
    }

    if (password !== confirmation) {
      await confirmDialog({
        title: "Passwords Do Not Match",
        message: "Please enter the same password in both fields.",
        alertOnly: true,
      });
      return;
    }

    submitButton.disabled = true;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Recovery session expired.");

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      sessionStorage.removeItem("passwordRecovery");

      await confirmDialog({
        title: "Password Updated",
        message: "Your password has been changed successfully.",
        alertOnly: true,
      });

      window.location.hash = "#/profile";
    } catch (error) {
      console.error("Password update failed:", error);

      await confirmDialog({
        title: "Password Update Failed",
        message: error.message,
        alertOnly: true,
      });
    } finally {
      submitButton.disabled = false;
    }
  });
}
