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

    const years = countBy(games, (game) => {
      return game.release_year == null ? null : String(game.release_year);
    });

    document.getElementById("stat-total-games").textContent = games.length;
    const completed = games.filter((game) => game.completed).length;
    const percentage = games.length
      ? Math.round((completed / games.length) * 100)
      : 0;

    document.getElementById("stat-completed-games").textContent = completed;

    const inProgress = games.filter(
      (game) => !game.completed && game.in_progress,
    ).length;

    const notStarted = games.length - completed - inProgress;

    const completedAngle = games.length ? (completed / games.length) * 360 : 0;

    const progressAngle = games.length ? (inProgress / games.length) * 360 : 0;

    const donut = document.getElementById("stat-status-donut");

    donut.style.background = `conic-gradient(
  #4ade80 0deg ${completedAngle}deg,
  #facc15 ${completedAngle}deg ${completedAngle + progressAngle}deg,
  #c084fc ${completedAngle + progressAngle}deg 360deg
)`;

    document.getElementById("stat-status-total").textContent = games.length;
    document.getElementById("stat-not-played-games").textContent = notStarted;

    const legend = document.getElementById("stat-status-legend");
    legend.replaceChildren();

    for (const [label, value, color] of [
      ["Completed", completed, "#4ade80"],
      ["In Progress", inProgress, "#facc15"],
      ["Not Started", notStarted, "#c084fc"],
    ]) {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between gap-5 text-sm";

      const name = document.createElement("span");
      name.className = "flex items-center gap-2 text-slate-300";

      const dot = document.createElement("span");
      dot.className = "h-3 w-3 rounded-sm";
      dot.style.backgroundColor = color;

      name.append(dot, document.createTextNode(label));

      const count = document.createElement("span");
      count.className = "font-semibold";
      const percent = games.length
        ? Math.round((value / games.length) * 100)
        : 0;

      count.textContent = `${value} (${percent}%)`;

      row.append(name, count);
      legend.append(row);
    }

    document.getElementById("stat-progress-bar").style.width = `${percentage}%`;

    document.getElementById("stat-in-progress-games").textContent = inProgress;

    document.getElementById("stat-progress-percent").textContent =
      `${percentage}%`;

    document.getElementById("stat-progress-description").textContent =
      `${completed} of ${games.length} games completed`;

    document.getElementById("stat-favorites").textContent = games.filter(
      (game) => game.favorite,
    ).length;

    renderChart("stat-platform-chart", platforms);
    renderChart("stat-genre-chart", genres);
    renderChart("stat-developer-chart", developers);
    renderChart("stat-year-chart", years);
  } catch (error) {
    console.error("Failed to load statistics:", error);
  }
}
