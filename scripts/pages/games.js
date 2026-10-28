import { getGames } from "../api/games.js";
import { createGameCard } from "../components/gameCard.js";

export async function initGames(params = new URLSearchParams()) {
  const controller = new AbortController();
  const signal = controller.signal;
  let games = [];
  let currentFilter = "all";
  const selectedPlatform = params.get("platform");

  const grid = document.getElementById("game-grid");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("game-count");
  const search = document.getElementById("game-search");

  const platformFilter = document.getElementById("active-platform-filter");
  const platformName = document.getElementById("active-platform-name");

  if (selectedPlatform) {
    document.getElementById("page-title").textContent =
      `${selectedPlatform} Games`;

    document.getElementById("page-subtitle").textContent =
      `Showing games for ${selectedPlatform}`;

    platformName.textContent = selectedPlatform;
    platformFilter.hidden = false;
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

      return matchesSearch && matchesFilter && matchesPlatform;
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

    renderGames();
  } catch (error) {
    console.error("Failed to load games:", error);
  }

  return () => controller.abort();
}
