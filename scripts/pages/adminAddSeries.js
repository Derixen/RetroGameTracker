import { supabase } from "../supabase.js";
import { confirmDialog } from "../components/confirmDialog.js";

export async function initAdminAddSeries(params = new URLSearchParams()) {
  const form = document.getElementById("add-series-form");
  const saveButton = document.getElementById("save-series");
  const errorMessage = document.getElementById("series-error");

  const seriesId = params.get("id");
  const isEditing = seriesId !== null;

  if (isEditing) {
    document.querySelector(".page-heading h1").textContent = "Edit Game Series";
    saveButton.textContent = "Update Series";

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

      // Show games belonging to this series
      const gamesSection = document.getElementById("series-games-section");
      const gamesList = document.getElementById("series-games-list");
      const gamesCount = document.getElementById("series-games-count");

      const { data: games, error: gamesError } = await supabase
        .from("games")
        .select("id, title, release_year, cover_url")
        .eq("series_id", seriesId)
        .order("title");

      if (gamesError) throw gamesError;

      gamesCount.textContent = `${games.length} GAMES`;

      gamesList.replaceChildren();

      if (games.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "py-4 text-sm text-slate-400";
        emptyMessage.textContent = "No games belong to this series yet.";
        gamesList.append(emptyMessage);
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

        // Remove game from this series
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Remove";
        removeButton.className =
          "rounded-lg border border-red-500/30 px-3 py-2 text-sm " +
          "text-red-400 transition hover:bg-red-500/10";

        removeButton.addEventListener("click", async () => {
          const confirmed = await confirmDialog({
            title: "Remove Game from Series?",
            message: `Remove "${game.title}" from this series? The game itself will not be deleted.`,
            confirmText: "Remove",
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
              title: "Unable to Remove Game",
              message: error?.message ?? "Check your permissions.",
              alertOnly: true,
            });

            return;
          }

          row.remove();

          const remaining = gamesList.children.length;
          gamesCount.textContent = `${remaining} GAMES`;

          if (remaining === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "py-4 text-sm text-slate-400";
            emptyMessage.textContent = "No games belong to this series yet.";
            gamesList.append(emptyMessage);
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
          title: "Search Required",
          message: "Enter at least 2 characters to search for a game.",
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
          title: "Search Failed",
          message: error.message,
          alertOnly: true,
        });
        return;
      }

      if (!games.length) {
        searchResults.textContent = "No unassigned games found.";
        return;
      }

      for (const game of games) {
        const button = document.createElement("button");
        button.type = "button";
        button.className =
          "flex w-full items-center justify-between rounded-lg " +
          "border border-slate-700 bg-slate-900 px-4 py-3 text-left " +
          "text-sm text-white hover:border-pink-500";

        button.textContent = `${game.title} (${game.release_year ?? "Unknown year"})`;

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
              title: "Unable to Add Game",
              message: error?.message ?? "Check your permissions.",
              alertOnly: true,
            });
            return;
          }

          // Refresh the edit page to display the new member
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
    saveButton.textContent = "Saving...";

    const name = document.getElementById("series-name").value.trim();
    const description = document
      .getElementById("series-description")
      .value.trim();

    try {
      if (!name) {
        throw new Error("Series name is required.");
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
      saveButton.disabled = false;
      saveButton.textContent = isEditing ? "Update Series" : "Save Series";
    }
  });
}
