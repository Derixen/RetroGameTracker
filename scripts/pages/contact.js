import { t } from "../i18n.js";

// Replace with your PUBLIC Cloudflare Turnstile Site Key.
const TURNSTILE_SITE_KEY = "0x4AAAAAAF_wcKRkCadtC6kq";

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

  const handleSubmit = (event) => {
    event.preventDefault();

    // Email submission will be implemented next.
  };

  form.addEventListener("submit", handleSubmit);

  loadTurnstileScript()
    .then(() => {
      if (destroyed) return;

      widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,

        callback(token) {
          turnstileToken = token;
          status.hidden = true;
        },

        "expired-callback"() {
          turnstileToken = null;
        },

        "error-callback"() {
          turnstileToken = null;
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
