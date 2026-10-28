import { initGames } from "./pages/games.js";
import { initHome } from "./pages/home.js";

const routes = {
  home: "home",
  games: "games",
  platforms: "platforms",
  series: "series",
  developers: "developers",
  genres: "genres",
  statistics: "statistics",
};

let cleanupPage = null;
let navigationId = 0;

export async function navigate() {
  const id = ++navigationId;

  const page = window.location.hash.replace(/^#\/?/, "") || "home";
  const route = routes[page] ?? "games";

  try {
    const response = await fetch(`./pages/${route}.html`);

    if (!response.ok) {
      throw new Error(`Failed to load page: ${route}`);
    }

    const html = await response.text();

    // Ignore responses from older navigation requests
    if (id !== navigationId) return;

    // Clean up the previous page
    if (cleanupPage) {
      cleanupPage();
      cleanupPage = null;
    }

    document.getElementById("page-content").innerHTML = html;

    // Update active navigation
    document.querySelectorAll("[data-page]").forEach((button) => {
      const active = button.dataset.page === route;

      button.classList.toggle("active", active);

      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    // Initialize page-specific JavaScript
    if (route === "games") {
      const cleanup = await initGames();

      // Navigation may have changed while Supabase was loading
      if (id !== navigationId) {
        cleanup();
        return;
      }

      cleanupPage = cleanup;
    }
    if (route === "home") {
      await initHome();
    }
  } catch (error) {
    if (id === navigationId) {
      console.error("Navigation failed:", error);
    }
  }
}
