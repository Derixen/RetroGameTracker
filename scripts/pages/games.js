import { getGames } from "../api/games.js";

export async function initGames() {
  const controller = new AbortController();
  const signal = controller.signal;
  let games = [];
  let currentFilter = "all";

  const grid = document.getElementById("game-grid");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("game-count");
  const search = document.getElementById("game-search");

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

      return matchesSearch && matchesFilter;
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
      const card = document.createElement("article");
      card.className = "game-card";

      const cover = document.createElement("div");
      cover.className = "cover-area";

      if (game.cover_url) {
        const img = document.createElement("img");
        img.src = game.cover_url;
        img.alt = `${game.title} cover`;
        img.loading = "lazy";
        cover.append(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "cover-placeholder";
        placeholder.innerHTML = "<span>🎮</span><small>NO COVER</small>";
        cover.append(placeholder);
      }

      for (const [value, className] of [
        [game.platform, "platform-badge"],
        [game.year, "year-badge"],
      ]) {
        if (value !== undefined && value !== null && value !== "") {
          const badge = document.createElement("span");
          badge.className = className;
          badge.textContent = value;
          cover.append(badge);
        }
      }

      const info = document.createElement("div");
      info.className = "card-info";

      const title = document.createElement("h3");
      title.textContent = game.title;

      const genre = document.createElement("p");
      genre.textContent = game.genre || "Game";

      info.append(title, genre);
      card.append(cover, info);
      grid.append(card);
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
