import { getGames } from "../api/games.js";

export async function initDevelopers() {
  const grid = document.getElementById("developer-grid");
  const count = document.getElementById("developer-count");
  const empty = document.getElementById("developer-empty");

  try {
    const games = await getGames();

    // Count games for each developer
    const developerCounts = new Map();

    for (const game of games) {
      const developer = game.developer?.trim();

      if (!developer) continue;

      developerCounts.set(developer, (developerCounts.get(developer) || 0) + 1);
    }

    // Sort developers alphabetically
    const developers = [...developerCounts.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    count.textContent = `${developers.length} DEVELOPERS`;
    empty.hidden = developers.length > 0;
    grid.replaceChildren();

    for (const [developer, amount] of developers) {
      const card = document.createElement("a");
      card.className = "game-card p-5 block cursor-pointer";
      card.href = `#/games?developer=${encodeURIComponent(developer)}`;

      const name = document.createElement("h2");
      name.className = "text-xl font-bold";
      name.textContent = developer;

      const gameCount = document.createElement("p");
      gameCount.className = "mt-4 text-sm font-semibold text-pink-400";
      gameCount.textContent = `${amount} ${amount === 1 ? "game" : "games"}`;

      card.append(name, gameCount);
      grid.append(card);
    }
  } catch (error) {
    console.error("Failed to load developers:", error);
  }
}
