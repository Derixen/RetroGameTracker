import { navigate } from "./router.js";
import { initAuth } from "./auth.js";
import { initI18n, t, getLanguage, setLanguage } from "./i18n.js";

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("mobile-overlay");
const menuToggle = document.getElementById("menu-toggle");
const gameSearch = document.getElementById("sidebar-search");

gameSearch.addEventListener("input", (event) => {
  if (!event.isTrusted) return;
  if (document.activeElement !== gameSearch) return;
  const gamesSearch = document.getElementById("game-search");

  if (!window.location.hash.startsWith("#/games")) {
    console.trace("Unexpected navigation to Games", {
      isTrusted: event.isTrusted,
      inputValue: gameSearch.value,
      activeElement: document.activeElement,
    });

    window.location.hash = "#/games";
    return;
  }

  if (gamesSearch) {
    gamesSearch.value = gameSearch.value;
    gamesSearch.dispatchEvent(new Event("input", { bubbles: true }));
  }
});

function closeMenu() {
  sidebar.classList.remove("open");
  overlay.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
}

menuToggle.addEventListener("click", () => {
  const open = sidebar.classList.toggle("open");
  overlay.hidden = !open;
  menuToggle.setAttribute("aria-expanded", String(open));
});

overlay.addEventListener("click", closeMenu);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

// Navigation buttons
document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    window.location.hash = `/${button.dataset.page}`;
    closeMenu();
  });
});

// Browser navigation
window.addEventListener("hashchange", navigate);

// Initialize localization before loading the application
try {
  await initI18n();
  console.log("Localization initialized:", t("games.title"));
} catch (error) {
  console.error("Failed to initialize localization:", error);
}

const languageSelect = document.getElementById("language-select");

if (languageSelect) {
  // Display the currently selected language
  languageSelect.value = getLanguage();

  languageSelect.addEventListener("change", async () => {
    const previousLanguage = getLanguage();

    try {
      languageSelect.disabled = true;

      await setLanguage(languageSelect.value);

      // Reload the current SPA page so JavaScript-generated
      // content can be translated as well.
      await navigate();
    } catch (error) {
      console.error("Failed to change language:", error);

      languageSelect.value = previousLanguage;
    } finally {
      languageSelect.disabled = false;
    }
  });
}

// Initialize authentication before loading the first page
await initAuth();
await navigate();

window.lucide?.createIcons();
document.querySelector(".sidebar")?.classList.add("sidebar-ready");

// Reveal the fully initialized website
requestAnimationFrame(() => {
  document.getElementById("app-loading-overlay")?.classList.add("fade-out");
});

// Welcome page doesn't need a loading overlay
if (window.location.hash === "#/welcome" || window.location.hash === "") {
  document.getElementById("app-loading-overlay")?.classList.add("fade-out");
}

// Reusable loading overlay
export function showLoadingOverlay() {
  document.getElementById("app-loading-overlay")?.classList.remove("fade-out");
}

export function hideLoadingOverlay() {
  requestAnimationFrame(() => {
    document.getElementById("app-loading-overlay")?.classList.add("fade-out");
  });
}
