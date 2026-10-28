import { getPlatforms } from "../api/platforms.js";
import { getGames } from "../api/games.js";

export async function initPlatforms() {
  const grid = document.getElementById("platform-grid");
  const count = document.getElementById("platform-count");
  const empty = document.getElementById("platform-empty");

  try {
    const [platforms, games] = await Promise.all([getPlatforms(), getGames()]);

    const gameCounts = {};

    for (const game of games) {
      const platformName = game.platforms?.name;

      if (platformName) {
        gameCounts[platformName] = (gameCounts[platformName] || 0) + 1;
      }
    }

    count.textContent = `${platforms.length} PLATFORMS`;
    empty.hidden = platforms.length > 0;

    grid.replaceChildren();

    for (const platform of platforms) {
      const card = document.createElement("a");
      card.className = "game-card p-5 block cursor-pointer";
      card.href = `#/games?platform=${encodeURIComponent(platform.name)}`;

      const manufacturer = document.createElement("p");
      manufacturer.className = "eyebrow";
      manufacturer.textContent = platform.manufacturer || "UNKNOWN";

      const name = document.createElement("h2");
      name.className = "mt-3 text-xl font-bold";
      name.textContent = platform.name;

      const year = document.createElement("p");
      year.className = "mt-2 text-sm text-slate-400";
      year.textContent = platform.release_year
        ? `Released in ${platform.release_year}`
        : "Release year unknown";

      const gameCount = document.createElement("p");
      gameCount.className = "mt-4 text-sm font-semibold text-pink-400";

      const amount = gameCounts[platform.name] || 0;

      gameCount.textContent = `${amount} ${amount === 1 ? "game" : "games"}`;

      card.append(manufacturer, name, year, gameCount);
      grid.append(card);
    }
  } catch (error) {
    console.error("Failed to load platforms:", error);
  }
}
