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
import { createPageHeading } from "./components/pageHeading.js";

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

const pageHeadings = {
  home: {
    eyebrow: "COLLECTION OVERVIEW",
    title: "Dashboard",
    subtitle: "Your retro gaming collection at a glance",
    countId: "",
    countLabel: "",
  },
  games: {
    eyebrow: "THE COLLECTION",
    title: "My Games",
    subtitle: "Browse my retro game collection",
    countId: "game-count",
    countLabel: "GAMES",
  },
  platforms: {
    eyebrow: "THE HARDWARE",
    title: "Platforms",
    subtitle: "Explore the consoles and handhelds in the archive",
    countId: "platform-count",
    countLabel: "PLATFORMS",
  },
  series: {
    eyebrow: "THE FRANCHISES",
    title: "Game Series",
    subtitle: "Explore the franchises in my retro game collection",
    countId: "series-count",
    countLabel: "SERIES",
  },
  developers: {
    eyebrow: "THE FRANCHISES",
    title: "Game Series",
    subtitle: "Explore the studios behind my retro game collection",
    countId: "developer-count",
    countLabel: "DEVELOPER",
  },
  genres: {
    eyebrow: "EXPLORE BY CATEGORY",
    title: "Genres",
    subtitle: "Browse my retro game collection by genre",
    countId: "genre-count",
    countLabel: "GENRES",
  },
  statistics: {
    eyebrow: "PROGRESS OVERVIEW",
    title: "Statistics",
    subtitle: "Your retro gaming Progress at a glance",
    countId: "",
    countLabel: "",
  },
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
    const pageContent = document.getElementById("page-content");

    // Fade out the current page
    pageContent.classList.add("page-fading");

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Stop if another navigation started
    if (id !== navigationId) return;

    // Load the new page
    pageContent.innerHTML = html;

    const headingConfig = pageHeadings[route];

    if (headingConfig) {
      pageContent.prepend(createPageHeading(headingConfig));
    }

    // Fade in the new page
    requestAnimationFrame(() => {
      pageContent.classList.remove("page-fading");
    });

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
