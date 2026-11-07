import { navigate } from "./router.js";
import { initAuth } from "./auth.js";

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("mobile-overlay");
const menuToggle = document.getElementById("menu-toggle");
const gameSearch = document.getElementById("sidebar-search");

gameSearch.addEventListener("input", () => {
  const gamesSearch = document.getElementById("game-search");

  if (!window.location.hash.startsWith("#/games")) {
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

// Initialize authentication before loading the first page
await initAuth();
await navigate();

window.lucide?.createIcons();

// Reveal the fully initialized website
requestAnimationFrame(() => {
  document.getElementById("app-loading-overlay")?.classList.add("fade-out");
});

// Reusable loading overlay
export function showLoadingOverlay() {
  document.getElementById("app-loading-overlay")?.classList.remove("fade-out");
}

export function hideLoadingOverlay() {
  requestAnimationFrame(() => {
    document.getElementById("app-loading-overlay")?.classList.add("fade-out");
  });
}
