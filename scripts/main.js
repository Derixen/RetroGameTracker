import { navigate } from "./router.js";
import { initAuth } from "./auth.js";

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("mobile-overlay");
const menuToggle = document.getElementById("menu-toggle");

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

// Initial page
navigate();

initAuth();
