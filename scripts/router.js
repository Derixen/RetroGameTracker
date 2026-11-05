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
import { getAdminUser, getAuthenticatedUser } from "./admin.js";
import { initAdminPlatforms } from "./pages/adminPlatforms.js";
import { initAdminAddPlatform } from "./pages/adminAddPlatform.js";
import { initAdminSeries } from "./pages/adminSeries.js";
import { initAdminAddSeries } from "./pages/adminAddSeries.js";
import { initGameDetails } from "./pages/gameDetails.js";
import { createPageHeading } from "./components/pageHeading.js";
import { initAdminDashboard } from "./pages/adminDashboard.js";
import { initProfile } from "./pages/profile.js";
import { initResetPassword } from "./pages/resetPassword.js";
import { initAdminUsers } from "./pages/adminUsers.js";

const routes = {
  welcome: "welcome",
  about: "about",
  contact: "contact",
  privacy: "privacy",
  terms: "terms",
  changelog: "changelog",
  "report-bug": "report-bug",
  attributions: "attributions",
  home: "home",
  collection: "collection",
  games: "games",
  platforms: "platforms",
  series: "series",
  developers: "developers",
  genres: "genres",
  statistics: "statistics",
  profile: "profile",
  login: "login",
  "reset-password": "reset-password",
  admin: "admin-dashboard",
  "admin/users": "admin-users",
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
  collection: {
    eyebrow: "MY COLLECTION",
    title: "Manage My Collection",
    subtitle: "Manage your games, series, and collection details",
    countId: "",
    countLabel: "",
  },
  "admin-users": {
    eyebrow: "ADMINISTRATION",
    title: "User Management",
    subtitle: "Manage registered accounts, permissions, and user collections",
    countId: "",
    countLabel: "",
  },
  "admin-dashboard": {
    eyebrow: "ADMINISTRATION",
    title: "Admin Dashboard",
    subtitle: "Monitor platform activity, users, and collection statistics",
    countId: "",
    countLabel: "",
  },
  about: {
    eyebrow: "THE PROJECT",
    title: "About RetroTrack",
    subtitle: "Discover the story behind RetroTrack Games.",
  },
  contact: {
    eyebrow: "GET IN TOUCH",
    title: "Contact & Support",
    subtitle:
      "Questions, suggestions, or feedback? We'd love to hear from you.",
  },
  privacy: {
    eyebrow: "LEGAL INFORMATION",
    title: "Privacy Policy",
    subtitle: "How RetroTrack Games handles your personal information.",
  },
  terms: {
    eyebrow: "LEGAL INFORMATION",
    title: "Terms of Service",
    subtitle: "The rules and conditions for using RetroTrack Games.",
  },
  changelog: {
    eyebrow: "DEVELOPMENT",
    title: "What's New",
    subtitle: "Latest updates, improvements, and version history.",
  },
  "report-bug": {
    eyebrow: "SUPPORT",
    title: "Report a Bug",
    subtitle: "Help us improve RetroTrack Games by reporting issues.",
  },
  attributions: {
    eyebrow: "CREDITS",
    title: "Attributions & Credits",
    subtitle:
      "The technologies, services, and resources behind RetroTrack Games.",
  },
};

let cleanupPage = null;
let navigationId = 0;

export async function navigate() {
  const id = ++navigationId;

  const hash = window.location.hash.replace(/^#\/?/, "") || "welcome";
  const [page, queryString = ""] = hash.split("?");

  const params = new URLSearchParams(queryString);
  const route = routes[page] ?? "games";

  // Public pages that do not require authentication
  const publicRoutes = new Set(["welcome", "login"]);

  // Hide application navigation on public pages
  const isPublicPage = publicRoutes.has(page);
  document
    .querySelector(".app-shell")
    ?.classList.toggle("public-layout", isPublicPage);

  document.getElementById("sidebar")?.classList.toggle("hidden", isPublicPage);
  document
    .getElementById("menu-toggle")
    ?.classList.toggle("hidden", isPublicPage);
  document
    .getElementById("sidebar-search")
    ?.classList.toggle("hidden", isPublicPage);
  document.getElementById("mobile-overlay")?.classList.add("hidden");

  if (!publicRoutes.has(page)) {
    const user = await getAuthenticatedUser();

    if (id !== navigationId) return;

    if (!user) {
      window.location.hash = "#/welcome";
      return;
    }
  }

  const userRoutes = new Set([
    "admin/games",
    "admin/add-game",
    "admin/edit-game",
    "admin/series",
    "admin/add-series",
    "admin/edit-series",
  ]);

  if (userRoutes.has(page)) {
    // Personal collection management requires login
    const user = await getAuthenticatedUser();

    if (id !== navigationId) return;

    if (!user) {
      window.location.hash = "#/login";
      return;
    }
  } else if (page === "admin" || page.startsWith("admin/")) {
    // Shared platform management remains administrator-only
    const adminUser = await getAdminUser();

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
    const search = document.getElementById("sidebar-search");

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
      const heading = createPageHeading(headingConfig);

      if (route === "games") {
        const counter = heading.querySelector("#game-count");

        if (counter) {
          const counterContainer = counter;

          const wrapper = document.createElement("div");
          wrapper.className = "flex flex-wrap items-center gap-3 mt-4";

          counterContainer.parentNode.insertBefore(wrapper, counterContainer);
          wrapper.appendChild(counterContainer);

          const addButton = document.createElement("a");
          addButton.href = "#/admin/add-game";
          addButton.className = "add-game-btn";
          addButton.textContent = "+ Add Game";

          wrapper.appendChild(addButton);
        }
      }

      pageContent.prepend(heading);
    }

    // Initialize Lucide icons after the page has loaded
    window.lucide?.createIcons();

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

    if (route === "admin-dashboard") {
      await initAdminDashboard();
    }

    if (route === "admin-users") {
      await initAdminUsers();
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

    if (route === "profile") {
      await initProfile();
    }

    if (route === "reset-password") {
      await initResetPassword();
    }
  } catch (error) {
    if (id === navigationId) {
      console.error("Navigation failed:", error);
    }
  }
}
