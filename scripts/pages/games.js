import { getGames } from "../api/games.js";
import { createGameCard } from "../components/gameCard.js";
import { supabase } from "../supabase.js";

export async function initGames(params = new URLSearchParams()) {
  const controller = new AbortController();
  const signal = controller.signal;
  let games = [];
  let currentFilter = "all";
  const selectedPlatform = params.get("platform");
  const selectedSeries = params.get("series");
  const selectedDeveloper = params.get("developer");
  const selectedGenre = params.get("genre");

  const activeFilters = document.getElementById("active-filters");

  activeFilters.hidden = !(
    selectedPlatform ||
    selectedSeries ||
    selectedDeveloper ||
    selectedGenre
  );

  const platformParams = new URLSearchParams(params);
  platformParams.delete("platform");

  const seriesParams = new URLSearchParams(params);
  seriesParams.delete("series");

  const platformClearUrl = platformParams.toString()
    ? `#/games?${platformParams}`
    : "#/games";

  const seriesClearUrl = seriesParams.toString()
    ? `#/games?${seriesParams}`
    : "#/games";

  const grid = document.getElementById("game-grid");
  const gameList = document.getElementById("game-list");
  const gameListBody = document.getElementById("game-list-body");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("game-count");
  const search = document.getElementById("game-search");
  const sidebarSearch = document.getElementById("sidebar-search");

  if (sidebarSearch?.value) {
    search.value = sidebarSearch.value;
  }
  const sortButton = document.getElementById("game-sort-button");
  const sortMenu = document.getElementById("game-sort-menu");
  const sortLabel = document.getElementById("game-sort-label");

  let currentSort = "title_asc";
  let listSortColumn = "name";
  let listSortAscending = true;
  const view = document.getElementById("game-view");

  let currentView = localStorage.getItem("gameView") || "large";

  function updateView() {
    const isList = currentView === "list";

    grid.hidden = isList;
    document.getElementById("game-list").hidden = !isList;

    grid.classList.toggle("small-view", currentView === "small");

    const labels = {
      large: "Large",
      small: "Small",
      list: "List",
    };

    const icons = {
      large: "layout-grid",
      small: "grid-3x3",
      list: "list",
    };

    document.getElementById("game-view-label").textContent =
      labels[currentView] ?? "Large";

    const icon = document.getElementById("game-view-icon");
    icon.setAttribute("data-lucide", icons[currentView] ?? "layout-grid");

    window.lucide?.createIcons();
  }

  updateView();
  updateListSortHeaders();

  const platformFilter = document.getElementById("active-platform-filter");
  const platformName = document.getElementById("active-platform-name");

  if (selectedPlatform) {
    platformFilter.querySelector("a").href = platformClearUrl;
    document.getElementById("page-title").textContent =
      `${selectedPlatform} Games`;

    document.getElementById("page-subtitle").textContent =
      `Showing games for ${selectedPlatform}`;

    platformName.textContent = selectedPlatform;
    platformFilter.hidden = false;
  }

  if (selectedSeries) {
    document.getElementById("clear-series-filter").href = seriesClearUrl;
    const seriesFilter = document.getElementById("active-series-filter");
    const seriesName = document.getElementById("active-series-name");

    seriesFilter.hidden = false;
    seriesName.textContent = "Series";

    document.getElementById("page-title").textContent = "Series Games";
    document.getElementById("page-subtitle").textContent =
      "Showing games from the selected franchise";
  }

  if (selectedDeveloper) {
    const developerFilter = document.getElementById("active-developer-filter");

    developerFilter.hidden = false;

    document.getElementById("active-developer-name").textContent =
      selectedDeveloper;

    document.getElementById("page-title").textContent =
      `${selectedDeveloper} Games`;

    const clearParams = new URLSearchParams(params);
    clearParams.delete("developer");

    document.getElementById("clear-developer-filter").href =
      clearParams.toString() ? `#/games?${clearParams}` : "#/games";
  }

  function createGameListRow(game) {
    const row = document.createElement("tr");

    row.className = "cursor-pointer transition hover:bg-slate-800/60";

    row.tabIndex = 0;
    row.setAttribute("aria-label", `View details for ${game.title}`);

    // Name
    const nameCell = document.createElement("td");
    nameCell.className = "px-4 py-3 font-semibold text-sky-400";
    nameCell.textContent = game.title;

    // Platform
    const platformCell = document.createElement("td");
    platformCell.className = "px-4 py-3 text-slate-300";
    platformCell.textContent = game.platform || "Unknown";

    // Status
    const statusCell = document.createElement("td");
    statusCell.className = "px-4 py-3";

    const status = document.createElement("span");
    status.className = "text-sm font-semibold";

    if (game.completed) {
      status.textContent = "✓ Completed";
      status.classList.add("text-green-400");
    } else if (game.in_progress) {
      status.textContent = "◷ In Progress";
      status.classList.add("text-amber-400");
    } else {
      status.textContent = "Not Played";
      status.classList.add("text-slate-400");
    }

    statusCell.append(status);

    // Year
    const yearCell = document.createElement("td");
    yearCell.className = "px-4 py-3 text-slate-400";
    yearCell.textContent = game.year ?? "—";

    row.append(nameCell, platformCell, statusCell, yearCell);

    function openGame() {
      if (window.location.hash.startsWith("#/games")) {
        sessionStorage.setItem("gameDetailsReturnUrl", window.location.hash);
      }

      window.location.hash = `#/game?id=${game.id}`;
    }

    row.addEventListener("click", openGame);

    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        openGame();
      }
    });

    return row;
  }

  function renderGames() {
    const query = search.value.trim().toLowerCase();

    const filtered = games.filter((game) => {
      const matchesSearch =
        `${game.title} ${game.platform ?? ""} ${game.genre ?? ""} ${game.developer ?? ""}`
          .toLowerCase()
          .includes(query);

      const matchesFilter =
        currentFilter === "all" ||
        (currentFilter === "favorites" && game.favorite) ||
        (currentFilter === "not_played" &&
          !game.in_progress &&
          !game.completed) ||
        (currentFilter === "in_progress" &&
          game.in_progress &&
          !game.completed) ||
        (currentFilter === "completed" && game.completed);

      const matchesPlatform =
        !selectedPlatform || game.platform === selectedPlatform;

      const matchesSeries =
        !selectedSeries || String(game.series_id) === selectedSeries;

      const matchesDeveloper =
        !selectedDeveloper || game.developer === selectedDeveloper;

      const matchesGenre = !selectedGenre || game.genre === selectedGenre;

      return (
        matchesSearch &&
        matchesFilter &&
        matchesPlatform &&
        matchesSeries &&
        matchesDeveloper &&
        matchesGenre
      );
    });

    filtered.sort((a, b) => {
      switch (currentSort) {
        case "title_asc":
          return a.title.localeCompare(b.title);

        case "title_desc":
          return b.title.localeCompare(a.title);

        case "year_desc":
          return (b.year ?? 0) - (a.year ?? 0);

        case "year_asc":
          return (a.year ?? 9999) - (b.year ?? 9999);

        case "recent":
          return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0);

        default:
          return 0;
      }
    });

    if (currentView === "list" && listSortColumn !== null) {
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (listSortColumn) {
          case "name":
            comparison = a.title.localeCompare(b.title);
            break;

          case "platform":
            comparison = (a.platform ?? "").localeCompare(b.platform ?? "");
            break;

          case "status": {
            const getStatus = (game) => {
              if (game.completed) return "Completed";
              if (game.in_progress) return "In Progress";
              return "Not Played";
            };

            comparison = getStatus(a).localeCompare(getStatus(b));
            break;
          }

          case "year":
            comparison = (a.year ?? 9999) - (b.year ?? 9999);
            break;
        }

        return listSortAscending ? comparison : -comparison;
      });
    }

    grid.replaceChildren();
    gameListBody.replaceChildren();

    count.textContent = `${filtered.length} ${filtered.length === 1 ? "GAME" : "GAMES"}`;

    empty.hidden = filtered.length > 0;

    const heading = empty.querySelector("h2");
    const description = empty.querySelector("p");

    heading.textContent = games.length
      ? "No matching games"
      : "No games to display yet";

    description.textContent = games.length
      ? "Try another search or filter."
      : "Once your database is connected, your collection will appear here automatically.";

    for (const game of filtered) {
      if (currentView === "list") {
        gameListBody.append(createGameListRow(game));
      } else {
        grid.append(createGameCard(game));
      }
    }
  }

  function updateListSortHeaders() {
    document.querySelectorAll("[data-list-sort]").forEach((button) => {
      const isActive = button.dataset.listSort === listSortColumn;
      const header = button.closest("th");

      if (header) {
        header.setAttribute(
          "aria-sort",
          isActive ? (listSortAscending ? "ascending" : "descending") : "none",
        );
      }
      const icon = button.querySelector("i, svg");

      button.classList.toggle("text-sky-400", isActive);

      if (icon) {
        icon.setAttribute(
          "data-lucide",
          isActive
            ? listSortAscending
              ? "arrow-up"
              : "arrow-down"
            : "arrow-down-up",
        );
      }
    });

    window.lucide?.createIcons();
  }

  document.querySelectorAll("[data-list-sort]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const column = button.dataset.listSort;

        if (listSortColumn === column) {
          listSortAscending = !listSortAscending;
        } else {
          listSortColumn = column;
          listSortAscending = true;
        }

        if (listSortColumn === "name") {
          currentSort = listSortAscending ? "title_asc" : "title_desc";
          sortLabel.textContent = listSortAscending ? "Title A–Z" : "Title Z–A";
        } else if (listSortColumn === "year") {
          currentSort = listSortAscending ? "year_asc" : "year_desc";
          sortLabel.textContent = listSortAscending
            ? "Year: Oldest"
            : "Year: Newest";
        }

        updateListSortHeaders();
        renderGames();

        renderGames();
      },
      { signal },
    );
  });

  search.addEventListener("input", renderGames, { signal });
  sortButton.addEventListener(
    "click",
    () => {
      const isOpen = !sortMenu.hidden;
      sortMenu.hidden = isOpen;
      sortButton.setAttribute("aria-expanded", String(!isOpen));
    },
    { signal },
  );

  sortMenu.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        currentSort = button.dataset.sort;
        sortLabel.textContent = button.textContent;

        const sortMapping = {
          title_asc: ["name", true],
          title_desc: ["name", false],
          year_asc: ["year", true],
          year_desc: ["year", false],
        };

        if (sortMapping[currentSort]) {
          [listSortColumn, listSortAscending] = sortMapping[currentSort];
        } else {
          // Recently Added uses the existing sorting logic.
          listSortColumn = null;
        }

        updateListSortHeaders();

        sortMenu.hidden = true;

        sortButton.setAttribute("aria-expanded", "false");

        renderGames();
      },
      { signal },
    );
  });

  document.addEventListener(
    "click",
    (event) => {
      if (!sortButton.closest(".sort-control").contains(event.target)) {
        sortMenu.hidden = true;
        sortButton.setAttribute("aria-expanded", "false");
      }
    },
    { signal },
  );

  view.addEventListener(
    "click",
    () => {
      const viewModes = ["large", "small", "list"];
      const currentIndex = viewModes.indexOf(currentView);

      currentView = viewModes[(currentIndex + 1) % viewModes.length];

      localStorage.setItem("gameView", currentView);

      updateView();
      renderGames();
      view.blur();
    },
    { signal },
  );

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll("[data-filter]").forEach((item) => {
          item.classList.toggle("selected", item === button);
        });

        renderGames();
      },
      { signal },
    );
  });

  try {
    const data = await getGames();

    games = data.map((game) => ({
      ...game,
      platform: game.platforms?.name,
      year: game.release_year,
    }));

    if (selectedSeries) {
      const selectedGame = games.find(
        (game) => String(game.series_id) === selectedSeries,
      );

      const { data: selectedSeriesData, error: seriesError } = await supabase
        .from("series")
        .select("name")
        .eq("id", selectedSeries)
        .maybeSingle();

      if (seriesError) {
        console.error("Failed to load series name:", seriesError);
      }

      const name =
        selectedSeriesData?.name ??
        selectedGame?.series?.name ??
        "Unknown Series";

      document.getElementById("active-series-name").textContent = name;
      document.getElementById("page-title").textContent = `${name} Games`;
    }

    if (selectedGenre) {
      document.getElementById("active-genre-filter").hidden = false;

      document.getElementById("active-genre-name").textContent = selectedGenre;

      document.getElementById("page-title").textContent =
        `${selectedGenre} Games`;

      const clearParams = new URLSearchParams(params);
      clearParams.delete("genre");

      document.getElementById("clear-genre-filter").href =
        clearParams.toString() ? `#/games?${clearParams}` : "#/games";
    }

    renderGames();
  } catch (error) {
    console.error("Failed to load games:", error);
  }

  return () => controller.abort();
}
