import { supabase } from "../supabase.js";
import { t, translatePage } from "../i18n.js";

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

  if (!form) return;

  let isRegistering = false;
  let isSubmitting = false;
  let feedback = null;

  function showFeedback(type, key) {
    feedback = { type, key };

    errorMessage.hidden = type !== "error";
    successMessage.hidden = type !== "success";

    if (type === "error") {
      errorMessage.textContent = t(key);
    } else {
      successMessage.textContent = t(key);
    }
  }

  function updateUI() {
    title.textContent = isRegistering
      ? t("login.create_account")
      : t("login.sign_in");

    description.textContent = isRegistering
      ? t("login.register_description")
      : t("login.sign_in_description");

    submitButton.textContent = isSubmitting
      ? isRegistering
        ? t("login.creating_account")
        : t("login.signing_in")
      : isRegistering
        ? t("login.create_account")
        : t("login.sign_in");

    switchText.textContent = isRegistering
      ? t("login.already_have_account")
      : t("login.no_account");

    switchButton.textContent = isRegistering
      ? t("login.sign_in")
      : t("login.create_account");

    passwordRequirements.hidden = !isRegistering;
    passwordInput.minLength = isRegistering ? 12 : 0;
    passwordInput.autocomplete = isRegistering
      ? "new-password"
      : "current-password";

    if (feedback) {
      const message = t(feedback.key);

      if (feedback.type === "error") {
        errorMessage.textContent = message;
      } else {
        successMessage.textContent = message;
      }
    }
  }

  async function checkRegistrationStatus() {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "registration_enabled")
      .single();

    const notice = document.getElementById("registration-disabled-notice");

    const registrationSection = switchButton.parentElement;

    if (error || data?.value !== true) {
      registrationSection.hidden = true;
      notice.hidden = false;
      return false;
    }

    registrationSection.hidden = false;
    switchButton.hidden = false;
    switchText.hidden = false;
    notice.hidden = true;

    return true;
  }

  checkRegistrationStatus();

  // Switch between Sign In and Create Account
  switchButton.addEventListener("click", () => {
    isRegistering = !isRegistering;
    feedback = null;

    errorMessage.hidden = true;
    successMessage.hidden = true;

    updateUI();
  });

  // Update translated content when the language changes
  const handleLanguageChange = () => {
    if (!form.isConnected) {
      document.removeEventListener("languagechange", handleLanguageChange);
      return;
    }

    translatePage(form);
    updateUI();
  };

  document.addEventListener("languagechange", handleLanguageChange);

  // Apply the selected language immediately
  updateUI();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();

    const password = passwordInput.value;

    feedback = null;
    errorMessage.hidden = true;
    successMessage.hidden = true;

    isSubmitting = true;
    submitButton.disabled = true;
    switchButton.disabled = true;

    updateUI();

    try {
      if (isRegistering) {
        const registrationAllowed = await checkRegistrationStatus();

        if (!registrationAllowed) {
          isRegistering = false;
          updateUI();

          showFeedback("error", "login.registration_disabled_error");

          return;
        }

        if (password.length < 12) {
          showFeedback("error", "login.password_min_length");
          return;
        }

        if (
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password) ||
          !/[0-9]/.test(password) ||
          !/[^a-zA-Z0-9]/.test(password)
        ) {
          showFeedback("error", "login.password_complexity");
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
          },
        });

        if (error) throw error;

        showFeedback("success", "login.confirmation_email");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Cover the page before navigating
        document.getElementById("sidebar")?.classList.add("login-loading");

        document
          .getElementById("app-loading-overlay")
          ?.classList.add("full-screen");

        document
          .getElementById("app-loading-overlay")
          ?.classList.remove("fade-out");

        window.location.hash = "#/games";
      }
    } catch (error) {
      // Supabase errors are provided by the service.
      feedback = null;
      errorMessage.textContent = error.message || t("login.generic_error");
      errorMessage.hidden = false;
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
      switchButton.disabled = false;

      updateUI();
    }
  });
}
