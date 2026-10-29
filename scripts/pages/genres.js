import { getGames } from "../api/games.js";

export async function initGenres() {
  const grid = document.getElementById("genre-grid");
  const count = document.getElementById("genre-count");
  const empty = document.getElementById("genre-empty");

  try {
    const games = await getGames();
    const genreCounts = new Map();

    for (const game of games) {
      const genre = game.genre?.trim();

      if (!genre) continue;

      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    }

    const genres = [...genreCounts.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    count.textContent = `${genres.length} GENRES`;
    empty.hidden = genres.length > 0;
    grid.replaceChildren();

    for (const [genre, amount] of genres) {
      const card = document.createElement("a");
      card.className = "game-card p-5 block cursor-pointer";
      card.href = `#/games?genre=${encodeURIComponent(genre)}`;

      const name = document.createElement("h2");
      name.className = "text-xl font-bold";
      name.textContent = genre;

      const gameCount = document.createElement("p");
      gameCount.className = "mt-4 text-sm font-semibold text-pink-400";
      gameCount.textContent = `${amount} ${amount === 1 ? "game" : "games"}`;

      card.append(name, gameCount);
      grid.append(card);
    }
  } catch (error) {
    console.error("Failed to load genres:", error);
  }
}
