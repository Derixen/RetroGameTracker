import { getSeries } from "../api/series.js";
import { getGames } from "../api/games.js";
import { t } from "../i18n.js";

export async function initSeries() {
  const grid = document.getElementById("series-grid");
  const count = document.getElementById("series-count");
  const empty = document.getElementById("series-empty");

  if (!grid) return;

  try {
    const [series, games] = await Promise.all([getSeries(), getGames()]);

    function render() {
      if (!grid.isConnected) return;

      if (count) {
        count.textContent = `${series.length} ${t("series.count_label")}`;
      }

      if (empty) {
        empty.hidden = series.length > 0;
      }

      grid.replaceChildren();

      for (const item of series) {
        const amount = games.filter(
          (game) => game.series_id === item.id,
        ).length;

        const card = document.createElement("a");
        card.className = "game-card p-5 block cursor-pointer";
        card.href = `#/games?series=${item.id}`;

        const name = document.createElement("h2");
        name.className = "text-xl font-bold";
        name.textContent = item.name;

        const description = document.createElement("p");
        description.className = "mt-2 text-sm text-slate-400";
        description.textContent =
          item.description || t("series.no_description");

        const gameCount = document.createElement("p");
        gameCount.className = "mt-4 text-sm font-semibold text-pink-400";
        gameCount.textContent = t(
          amount === 1 ? "series.game_count_one" : "series.game_count",
          { count: amount },
        );

        card.append(name, description, gameCount);
        grid.append(card);
      }
    }

    render();

    document.addEventListener("languagechange", render, {
      signal: (() => {
        const controller = new AbortController();

        const observer = new MutationObserver(() => {
          if (!grid.isConnected) {
            controller.abort();
            observer.disconnect();
          }
        });

        observer.observe(document.getElementById("page-content"), {
          childList: true,
        });

        return controller.signal;
      })(),
    });
  } catch (error) {
    console.error("Failed to load game series:", error);
  }
}
