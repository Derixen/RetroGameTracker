import { supabase } from "../supabase.js";
import { confirmDialog } from "../components/confirmDialog.js";
import { t } from "../i18n.js";

export async function initAdminAddSeries(params = new URLSearchParams()) {
  const form = document.getElementById("add-series-form");
  const saveButton = document.getElementById("save-series");
  const errorMessage = document.getElementById("series-error");

  const seriesId = params.get("id");
  const isEditing = seriesId !== null;

  const heading = document.querySelector(".page-heading h1");
  const gamesSection = document.getElementById("series-games-section");
  const gamesList = document.getElementById("series-games-list");
  const gamesCount = document.getElementById("series-games-count");

  let gameCount = 0;
  let isSaving = false;

  function updateHeading() {
    if (isEditing) {
      heading.textContent = t("admin_add_series.edit_title");
      saveButton.textContent = t("admin_add_series.update_series");
    }
  }

  function updateGameCount() {
    gamesCount.textContent = t("admin_add_series.games_count", {
      count: gameCount,
    });
  }

  function showEmptyMessage() {
    gamesList.replaceChildren();

    const emptyMessage = document.createElement("p");
    emptyMessage.className = "py-4 text-sm text-slate-600 dark:text-slate-400";
    emptyMessage.textContent = t("admin_add_series.no_games");
    emptyMessage.dataset.seriesEmpty = "true";

    gamesList.append(emptyMessage);
  }

  function refreshTranslations() {
    if (!form.isConnected) return;

    updateHeading();

    if (!isSaving) {
      saveButton.textContent = t(
        isEditing
          ? "admin_add_series.update_series"
          : "admin_add_series.save_series",
      );
    }

    if (isEditing) {
      updateGameCount();

      const emptyMessage = gamesList.querySelector("[data-series-empty]");
      if (emptyMessage) {
        emptyMessage.textContent = t("admin_add_series.no_games");
      }

      gamesList.querySelectorAll("[data-series-remove]").forEach((button) => {
        button.textContent = t("admin_add_series.remove");
      });
    }
  }

  if (isEditing) {
    updateHeading();

    try {
      const { data: series, error } = await supabase
        .from("series")
        .select("*")
        .eq("id", seriesId)
        .single();

      if (error) throw error;

      document.getElementById("series-name").value = series.name;
      document.getElementById("series-description").value =
        series.description ?? "";

      const { data: games, error: gamesError } = await supabase
        .from("games")
        .select("id, title, release_year, cover_url")
        .eq("series_id", seriesId)
        .order("title");

      if (gamesError) throw gamesError;

      gameCount = games.length;
      updateGameCount();

      gamesList.replaceChildren();

      if (games.length === 0) {
        showEmptyMessage();
      }

      for (const game of games) {
        const row = document.createElement("div");
        row.className =
          "flex items-center gap-4 rounded-lg border border-slate-700/50 bg-slate-900 p-3";

        if (game.cover_url) {
          const cover = document.createElement("img");
          cover.src = game.cover_url;
          cover.alt = "";
          cover.className = "h-16 w-12 shrink-0 rounded object-cover";
          row.append(cover);
        }

        const details = document.createElement("div");
        details.className = "min-w-0 flex-1";

        const title = document.createElement("p");
        title.className = "truncate font-semibold text-white";
        title.textContent = game.title;

        const year = document.createElement("p");
        year.className = "text-xs text-slate-400";
        year.textContent = game.release_year ?? "";

        details.append(title, year);
        row.append(details);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.dataset.seriesRemove = "true";
        removeButton.textContent = t("admin_add_series.remove");
        removeButton.className =
          "rounded-lg border border-red-500/30 px-3 py-2 text-sm " +
          "text-red-400 transition hover:bg-red-500/10";

        removeButton.addEventListener("click", async () => {
          const confirmed = await confirmDialog({
            title: t("admin_add_series.remove_title"),
            message: t("admin_add_series.remove_message", {
              name: game.title,
            }),
            confirmText: t("admin_add_series.remove"),
          });

          if (!confirmed) return;

          removeButton.disabled = true;

          const { data, error } = await supabase
            .from("games")
            .update({ series_id: null })
            .eq("id", game.id)
            .eq("series_id", seriesId)
            .select("id");

          if (error || !data?.length) {
            removeButton.disabled = false;

            await confirmDialog({
              title: t("admin_add_series.remove_failed_title"),
              message:
                error?.message ?? t("admin_add_series.check_permissions"),
              alertOnly: true,
            });

            return;
          }

          row.remove();

          gameCount--;
          updateGameCount();

          if (gameCount === 0) {
            showEmptyMessage();
          }
        });

        row.append(removeButton);
        gamesList.append(row);
      }

      gamesSection.hidden = false;
    } catch (error) {
      console.error("Failed to load series:", error);
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
      saveButton.disabled = true;
      return;
    }
  }

  if (isEditing) {
    const searchInput = document.getElementById("series-game-search");
    const searchResults = document.getElementById("series-game-results");
    const addButton = document.getElementById("series-add-game");

    addButton.addEventListener("click", async () => {
      const query = searchInput.value.trim();

      if (query.length < 2) {
        await confirmDialog({
          title: t("admin_add_series.search_required_title"),
          message: t("admin_add_series.search_required_message"),
          alertOnly: true,
        });
        return;
      }

      searchResults.replaceChildren();
      searchResults.hidden = false;

      const { data: games, error } = await supabase
        .from("games")
        .select("id, title, release_year, series_id")
        .ilike("title", `%${query.replace(/[%_\\]/g, "\\$&")}%`)
        .is("series_id", null)
        .order("title")
        .limit(20);

      if (error) {
        await confirmDialog({
          title: t("admin_add_series.search_failed_title"),
          message: error.message,
          alertOnly: true,
        });
        return;
      }

      if (!games.length) {
        searchResults.textContent = t("admin_add_series.no_search_results");
        return;
      }

      for (const game of games) {
        const button = document.createElement("button");
        button.type = "button";
        button.className =
          "flex w-full items-center justify-between rounded-lg " +
          "border border-slate-700 bg-slate-900 px-4 py-3 text-left " +
          "text-sm text-white hover:border-pink-500";

        button.textContent = `${game.title} (${game.release_year ?? t("admin_add_series.unknown_year")})`;

        button.addEventListener("click", async () => {
          button.disabled = true;

          const { data, error } = await supabase
            .from("games")
            .update({ series_id: Number(seriesId) })
            .eq("id", game.id)
            .is("series_id", null)
            .select("id");

          if (error || !data?.length) {
            button.disabled = false;

            await confirmDialog({
              title: t("admin_add_series.add_failed_title"),
              message:
                error?.message ?? t("admin_add_series.check_permissions"),
              alertOnly: true,
            });
            return;
          }

          window.dispatchEvent(new HashChangeEvent("hashchange"));
        });

        searchResults.append(button);
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorMessage.hidden = true;
    saveButton.disabled = true;
    isSaving = true;
    saveButton.textContent = t("admin_add_series.saving");

    const name = document.getElementById("series-name").value.trim();
    const description = document
      .getElementById("series-description")
      .value.trim();

    try {
      if (!name) {
        throw new Error(t("admin_add_series.name_required"));
      }

      const seriesData = {
        name,
        description: description || null,
      };

      let result;

      if (isEditing) {
        result = await supabase
          .from("series")
          .update(seriesData)
          .eq("id", seriesId)
          .select("id")
          .single();
      } else {
        result = await supabase
          .from("series")
          .insert(seriesData)
          .select("id")
          .single();
      }

      if (result.error) throw result.error;

      window.location.hash = isEditing
        ? "#/admin/series"
        : `#/admin/edit-series?id=${result.data.id}`;
    } catch (error) {
      console.error("Failed to save series:", error);
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    } finally {
      isSaving = false;
      saveButton.disabled = false;
      refreshTranslations();
    }
  });

  const controller = new AbortController();

  document.addEventListener("languagechange", refreshTranslations, {
    signal: controller.signal,
  });

  const pageContent = document.getElementById("page-content");

  if (pageContent) {
    const observer = new MutationObserver(() => {
      if (!form.isConnected) {
        controller.abort();
        observer.disconnect();
      }
    });

    observer.observe(pageContent, { childList: true });
  }
}
