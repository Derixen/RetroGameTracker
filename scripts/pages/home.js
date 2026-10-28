import { getGames } from "../api/games.js";
import { createGameCard } from "../components/gameCard.js";

export async function initHome() {
  const totalGames = document.getElementById("total-games");
  const totalPlatforms = document.getElementById("total-platforms");
  const totalDevelopers = document.getElementById("total-developers");

  try {
    const games = await getGames();

    // Total number of games
    totalGames.textContent = games.length;

    // Count unique platforms
    const platforms = new Set(
      games.map((game) => game.platforms?.name).filter(Boolean),
    );

    totalPlatforms.textContent = platforms.size;

    // Count unique developers
    const developers = new Set(
      games.map((game) => game.developer).filter(Boolean),
    );

    totalDevelopers.textContent = developers.size;

    const distribution = document.getElementById("platform-distribution");

    // Count games for each platform
    const platformCounts = {};

    for (const game of games) {
      const platform = game.platforms?.name || "Unknown";
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }

    // Sort platforms by number of games
    const sortedPlatforms = Object.entries(platformCounts).sort(
      (a, b) => b[1] - a[1],
    );

    distribution.replaceChildren();

    for (const [platform, amount] of sortedPlatforms) {
      const percentage = games.length ? (amount / games.length) * 100 : 0;

      const item = document.createElement("div");

      const header = document.createElement("div");
      header.className = "flex justify-between text-sm mb-2";

      const name = document.createElement("span");
      name.textContent = platform;

      const count = document.createElement("span");
      count.textContent = `${amount} games (${percentage.toFixed(0)}%)`;

      header.append(name, count);

      const track = document.createElement("div");
      track.className = "h-2 rounded-full bg-slate-700 overflow-hidden";

      const bar = document.createElement("div");
      bar.className = "h-full rounded-full bg-pink-500";
      bar.style.width = `${percentage}%`;

      track.append(bar);
      item.append(header, track);
      distribution.append(item);
    }

    const recentGames = document.getElementById("recent-games");

    // Sort by date added, newest first
    const latestGames = [...games]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 4);

    for (const game of latestGames) {
      recentGames.append(createGameCard(game));
    }
  } catch (error) {
    console.error("Failed to load dashboard statistics:", error);
  }
}
