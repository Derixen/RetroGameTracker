import { getSeries } from "../api/series.js";
import { getGames } from "../api/games.js";

export async function initSeries() {
  const grid = document.getElementById("series-grid");
  const count = document.getElementById("series-count");
  const empty = document.getElementById("series-empty");

  try {
    const [series, games] = await Promise.all([getSeries(), getGames()]);

    count.textContent = `${series.length} SERIES`;
    empty.hidden = series.length > 0;
    grid.replaceChildren();

    for (const item of series) {
      const amount = games.filter((game) => game.series_id === item.id).length;

      const card = document.createElement("article");
      card.className = "game-card p-5";

      const name = document.createElement("h2");
      name.className = "text-xl font-bold";
      name.textContent = item.name;

      const description = document.createElement("p");
      description.className = "mt-2 text-sm text-slate-400";
      description.textContent = item.description || "No description available.";

      const gameCount = document.createElement("p");
      gameCount.className = "mt-4 text-sm font-semibold text-pink-400";
      gameCount.textContent = `${amount} ${amount === 1 ? "game" : "games"}`;

      card.append(name, description, gameCount);
      grid.append(card);
    }
  } catch (error) {
    console.error("Failed to load game series:", error);
  }
}
