import { getGames } from "../api/games.js";
import { createGameCard } from "../components/gameCard.js";

export async function initGames(params = new URLSearchParams()) {
  const controller = new AbortController();
  const signal = controller.signal;
  let games = [];
  let currentFilter = "all";
  const selectedPlatform = params.get("platform");
  const selectedSeries = params.get("series");
  const selectedDeveloper = params.get("developer");
  const selectedGenre = params.get("genre");

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
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("game-count");
  const search = document.getElementById("game-search");

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

  function renderGames() {
    const query = search.value.trim().toLowerCase();

    const filtered = games.filter((game) => {
      const matchesSearch =
        `${game.title} ${game.platform ?? ""} ${game.genre ?? ""}`
          .toLowerCase()
          .includes(query);

      const matchesFilter =
        currentFilter === "all" ||
        (currentFilter === "favorites" && game.favorite) ||
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

    grid.replaceChildren();

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
      grid.append(createGameCard(game));
    }
  }

  search.addEventListener("input", renderGames, { signal });

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
      favorite: false,
      completed: false,
    }));

    if (selectedSeries) {
      const selectedGame = games.find(
        (game) => String(game.series_id) === selectedSeries,
      );

      const name = selectedGame?.series?.name || "Unknown Series";

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
