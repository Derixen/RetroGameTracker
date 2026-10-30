import { initGames } from "./pages/games.js";
import { initHome } from "./pages/home.js";
import { initPlatforms } from "./pages/platforms.js";
import { initSeries } from "./pages/series.js";
import { initDevelopers } from "./pages/developers.js";
import { initGenres } from "./pages/genres.js";
import { initStatistics } from "./pages/statistics.js";
import { initLogin } from "./pages/login.js";
import { initAdminGames } from "./pages/adminGames.js";
import { initAdminAddGame } from "./pages/adminAddGame.js";
import { getAdminUser } from "./admin.js";
import { initAdminPlatforms } from "./pages/adminPlatforms.js";
import { initAdminAddPlatform } from "./pages/adminAddPlatform.js";
import { initAdminSeries } from "./pages/adminSeries.js";
import { initAdminAddSeries } from "./pages/adminAddSeries.js";
import { initGameDetails } from "./pages/gameDetails.js";

const routes = {
  home: "home",
  games: "games",
  platforms: "platforms",
  series: "series",
  developers: "developers",
  genres: "genres",
  statistics: "statistics",
  login: "login",
  admin: "admin",
  "admin/games": "admin-games",
  "admin/add-game": "admin-add-game",
  "admin/edit-game": "admin-add-game",
  "admin/platforms": "admin-platforms",
  "admin/add-platform": "admin-add-platform",
  "admin/edit-platform": "admin-add-platform",
  "admin/series": "admin-series",
  "admin/add-series": "admin-add-series",
  "admin/edit-series": "admin-add-series",
  game: "game-details",
};

let cleanupPage = null;
let navigationId = 0;

export async function navigate() {
  const id = ++navigationId;

  const hash = window.location.hash.replace(/^#\/?/, "") || "home";
  const [page, queryString = ""] = hash.split("?");

  const params = new URLSearchParams(queryString);
  const route = routes[page] ?? "games";

  if (page === "admin" || page.startsWith("admin/")) {
    const adminUser = await getAdminUser();

    // Ignore an outdated navigation request
    if (id !== navigationId) return;

    if (!adminUser) {
      window.location.hash = "#/home";
      return;
    }
  }

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

    // Reset the global search when navigating
    const search = document.getElementById("game-search");

    if (search) {
      search.value = "";
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
      const cleanup = await initGames(params);

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

    if (route === "platforms") {
      await initPlatforms();
    }

    if (route === "series") {
      await initSeries();
    }

    if (route === "developers") {
      await initDevelopers();
    }

    if (route === "genres") {
      await initGenres();
    }

    if (route === "statistics") {
      await initStatistics();
    }

    if (route === "login") {
      initLogin();
    }

    if (route === "admin-games") {
      await initAdminGames();
    }

    if (page === "admin/add-game" || page === "admin/edit-game") {
      await initAdminAddGame(params);
    }

    if (route === "admin-platforms") {
      await initAdminPlatforms();
    }

    if (page === "admin/add-platform" || page === "admin/edit-platform") {
      await initAdminAddPlatform(params);
    }

    if (route === "admin-series") {
      await initAdminSeries();
    }

    if (page === "admin/add-series" || page === "admin/edit-series") {
      await initAdminAddSeries(params);
    }

    if (route === "game-details") {
      await initGameDetails(params);
    }
  } catch (error) {
    if (id === navigationId) {
      console.error("Navigation failed:", error);
    }
  }
}
