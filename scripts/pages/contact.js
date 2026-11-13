import { t } from "../i18n.js";

// Replace with your PUBLIC Cloudflare Turnstile Site Key.

const TURNSTILE_SITE_KEY = ["localhost", "127.0.0.1"].includes(
  window.location.hostname,
)
  ? "1x00000000000000000000AA"
  : "0x4AAAAAAF_wcKRkCadtC6kq";

let turnstileScriptPromise = null;

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

    script.async = true;

    script.onload = resolve;
    script.onerror = () => {
      turnstileScriptPromise = null;
      reject(new Error("Unable to load Turnstile"));
    };

    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export function initContact() {
  const form = document.getElementById("contact-form");
  const submitButton = document.getElementById("contact-submit");
  const status = document.getElementById("contact-status");
  const container = document.getElementById("contact-turnstile");

  if (!form || !submitButton || !status || !container) {
    return;
  }

  let widgetId = null;
  let turnstileToken = null;
  let destroyed = false;

  // Keep disabled until the backend integration is ready.
  submitButton.disabled = true;

  const showStatus = (message, isError = false) => {
    status.textContent = message;
    status.hidden = false;

    status.classList.toggle("text-red-400", isError);
    status.classList.toggle("text-green-400", !isError);
  };

  let isSubmitting = false;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting || !form.reportValidity()) return;

    if (!turnstileToken) {
      showStatus(t("contact.form.verification_help"), true);
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    status.hidden = true;

    const submitLabel = submitButton.querySelector(
      '[data-i18n="contact.form.submit"]',
    );

    if (submitLabel) {
      submitLabel.textContent = t("contact.form.sending");
    }

    try {
      const response = await fetch(
        "https://ybkwqmefcwupavhlsxyb.supabase.co/functions/v1/send-contact-message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: form.elements.namedItem("type").value,
            name: form.elements.namedItem("name").value.trim(),
            email: form.elements.namedItem("email").value.trim(),
            subject: form.elements.namedItem("subject").value.trim(),
            message: form.elements.namedItem("message").value.trim(),
            turnstileToken,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Contact request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success !== true) {
        throw new Error("Email submission was not confirmed");
      }

      if (!destroyed) {
        form.reset();
        showStatus(t("contact.form.success"));
      }
    } catch (error) {
      console.error("Contact submission failed:", error);

      if (!destroyed) {
        showStatus(t("contact.form.error"), true);
      }
    } finally {
      isSubmitting = false;
      turnstileToken = null;

      if (!destroyed) {
        if (widgetId !== null && window.turnstile) {
          window.turnstile.reset(widgetId);
        }

        if (submitLabel) {
          submitLabel.textContent = t("contact.form.submit");
        }

        submitButton.disabled = !turnstileToken;
      }
    }
  };

  form.addEventListener("submit", handleSubmit);

  loadTurnstileScript()
    .then(() => {
      if (destroyed) return;

      widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        action: "contact_form",

        callback(token) {
          turnstileToken = token;
          status.hidden = true;
          submitButton.disabled = false;
        },

        "expired-callback"() {
          turnstileToken = null;
          submitButton.disabled = true;
        },

        "error-callback"() {
          turnstileToken = null;
          submitButton.disabled = true;
          showStatus(t("contact.form.error"), true);
        },
      });
    })
    .catch((error) => {
      if (destroyed) return;

      console.error("Turnstile initialization failed:", error);
      showStatus(t("contact.form.error"), true);
    });

  return () => {
    destroyed = true;

    form.removeEventListener("submit", handleSubmit);

    if (widgetId !== null && window.turnstile) {
      window.turnstile.remove(widgetId);
    }
  };
}
