import { getGames } from "../api/games.js";

function countBy(games, getKey) {
  const counts = new Map();

  for (const game of games) {
    const key = getKey(game);
    if (key === null || key === undefined || key === "") continue;

    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])),
  );
}

function renderChart(containerId, entries) {
  const container = document.getElementById(containerId);
  container.replaceChildren();

  if (!entries.length) {
    const message = document.createElement("p");
    message.className = "text-sm text-slate-400";
    message.textContent = "No data available.";
    container.append(message);
    return;
  }

  const max = Math.max(...entries.map(([, count]) => count));

  for (const [label, count] of entries) {
    const row = document.createElement("div");

    const header = document.createElement("div");
    header.className = "mb-2 flex justify-between gap-3 text-sm";

    const name = document.createElement("span");
    name.className = "truncate text-slate-300";
    name.textContent = label;

    const value = document.createElement("span");
    value.className = "font-semibold text-pink-400";
    value.textContent = count;

    header.append(name, value);

    const track = document.createElement("div");
    track.className = "h-2 overflow-hidden rounded-full bg-slate-700/60";

    const bar = document.createElement("div");
    bar.className = "h-full rounded-full bg-pink-500";
    bar.style.width = `${(count / max) * 100}%`;

    track.append(bar);
    row.append(header, track);
    container.append(row);
  }
}

export async function initStatistics() {
  try {
    const games = await getGames();

    const platforms = countBy(games, (game) => game.platforms?.name);
    const developers = countBy(games, (game) => game.developer?.trim());
    const genres = countBy(games, (game) => game.genre?.trim());

    const decades = countBy(games, (game) => {
      if (game.release_year == null) return null;

      const decade = Math.floor(game.release_year / 10) * 10;
      return `${decade}s`;
    });

    document.getElementById("stat-total-games").textContent = games.length;
    document.getElementById("stat-platforms").textContent = platforms.length;
    document.getElementById("stat-developers").textContent = developers.length;
    document.getElementById("stat-genres").textContent = genres.length;

    renderChart("stat-platform-chart", platforms);
    renderChart("stat-genre-chart", genres);
    renderChart("stat-developer-chart", developers);
    renderChart("stat-decade-chart", decades);
  } catch (error) {
    console.error("Failed to load statistics:", error);
  }
}
