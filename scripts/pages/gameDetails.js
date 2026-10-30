import { supabase } from "../supabase.js";
import { createGameCard } from "../components/gameCard.js";
import { getAdminUser } from "../admin.js";
import {
  getGameCompletions,
  addGameCompletion,
  updateGameCompletion,
  deleteGameCompletion,
} from "../api/completions.js";
import { confirmDialog } from "../components/confirmDialog.js";

export async function initGameDetails(params = new URLSearchParams()) {
  const loading = document.getElementById("game-details-loading");
  const content = document.getElementById("game-details-content");
  const errorMessage = document.getElementById("game-details-error");

  const gameId = params.get("id");

  let editingCompletionId = null;

  if (!gameId || !/^\d+$/.test(gameId)) {
    loading.hidden = true;
    errorMessage.textContent = "Invalid game ID.";
    errorMessage.hidden = false;
    return;
  }

  const backLink = document.getElementById("back-to-games");

  const returnUrl = sessionStorage.getItem("gameDetailsReturnUrl");

  if (returnUrl?.startsWith("#/games")) {
    backLink.href = returnUrl;
  }

  try {
    const { data: game, error } = await supabase
      .from("games")
      .select(
        `
                id,
                title,
                release_year,
                genre,
                developer,
                cover_url,
                description,
                series_id,
                platforms (name),
                series (name),
                favorite,
                in_progress,
                completed
            `,
      )
      .eq("id", gameId)
      .single();

    if (error) throw error;

    const favoriteButton = document.getElementById("detail-favorite");
    const completedButton = document.getElementById("detail-completed");
    const progressButton = document.getElementById("detail-in-progress");

    let favorite = game.favorite;
    let completed = game.completed;
    let inProgress = game.in_progress;

    function updateButtons() {
      favoriteButton.textContent = favorite ? "♥ Favorite" : "♡ Favorite";
      completedButton.textContent = completed ? "✓ Completed" : "○ Completed";
      progressButton.textContent = inProgress
        ? "◷ In Progress"
        : "○ In Progress";

      favoriteButton.classList.toggle("text-red-500", favorite);
      completedButton.classList.toggle("text-green-400", completed);
      progressButton.classList.toggle("text-amber-400", inProgress);
    }

    updateButtons();

    const adminUser = await getAdminUser();

    const completionDialogTitle = document.getElementById(
      "completion-dialog-title",
    );

    const addCompletionButton = document.getElementById(
      "history-add-completion",
    );
    const completionDialog = document.getElementById("completion-dialog");
    const completionForm = document.getElementById("completion-form");
    const completionCancel = document.getElementById("completion-cancel");
    const completionError = document.getElementById("completion-form-error");
    const completionSave = document.getElementById("completion-save");

    if (adminUser) {
      document
        .getElementById("history-add-completion")
        .classList.remove("hidden");

      // Add Completion dialog

      addCompletionButton.addEventListener("click", () => {
        editingCompletionId = null;

        completionForm.reset();
        completionError.hidden = true;

        completionDialogTitle.textContent = "Add Completion";
        completionSave.textContent = "Save Completion";

        completionDialog.showModal();
      });

      completionCancel.addEventListener("click", () => {
        completionDialog.close();
      });

      completionForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const year = Number(document.getElementById("completion-year").value);
        const monthValue = document.getElementById("completion-month").value;
        const dayValue = document.getElementById("completion-day").value;
        const notes = document.getElementById("completion-notes").value.trim();

        const month = monthValue ? Number(monthValue) : null;
        const day = dayValue ? Number(dayValue) : null;

        completionError.hidden = true;

        if (day !== null && month === null) {
          completionError.textContent = "Select a month when entering a day.";
          completionError.hidden = false;
          return;
        }

        if (month !== null && day !== null) {
          const validDate = new Date(Date.UTC(year, month - 1, day));

          if (
            validDate.getUTCFullYear() !== year ||
            validDate.getUTCMonth() !== month - 1 ||
            validDate.getUTCDate() !== day
          ) {
            completionError.textContent = "Please enter a valid date.";
            completionError.hidden = false;
            return;
          }
        }

        completionSave.disabled = true;
        completionSave.textContent = "Saving...";

        try {
          const completionData = {
            game_id: game.id,
            completed_year: year,
            completed_month: month,
            completed_day: day,
            notes: notes || null,
          };

          if (editingCompletionId !== null) {
            await updateGameCompletion(editingCompletionId, completionData);
          } else {
            await addGameCompletion(completionData);
          }

          completionDialog.close();

          // Reload the details page to display the new completion
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        } catch (error) {
          console.error("Failed to save completion:", error);
          completionError.textContent = error.message;
          completionError.hidden = false;
        } finally {
          completionSave.disabled = false;
          completionSave.textContent =
            editingCompletionId !== null
              ? "Update Completion"
              : "Save Completion";
        }
      });
    }

    if (adminUser) {
      // Show Edit Game button
      const editButton = document.getElementById("detail-edit");

      if (editButton) {
        editButton.href = `#/admin/edit-game?id=${game.id}`;
        editButton.classList.remove("hidden");
      }

      favoriteButton.disabled = false;
      completedButton.disabled = false;

      progressButton.disabled = false;
      progressButton.classList.add("cursor-pointer");

      favoriteButton.classList.add("cursor-pointer");
      completedButton.classList.add("cursor-pointer");

      async function saveStatus(changes) {
        const { data, error } = await supabase
          .from("games")
          .update(changes)
          .eq("id", game.id)
          .select("id")
          .single();

        if (error) throw error;
        return data;
      }

      favoriteButton.addEventListener("click", async () => {
        favoriteButton.disabled = true;

        try {
          await saveStatus({ favorite: !favorite });
          favorite = !favorite;
          updateButtons();
        } catch (error) {
          console.error("Failed to update favorite:", error);
          await confirmDialog({
            title: "Failed to Update",
            message: "Failed to update favorite.",
            alertOnly: true,
          });
        } finally {
          favoriteButton.disabled = false;
        }
      });

      completedButton.addEventListener("click", async () => {
        completedButton.disabled = true;
        progressButton.disabled = true;

        try {
          const nextCompleted = !completed;

          await saveStatus({
            completed: nextCompleted,
            in_progress: nextCompleted ? false : inProgress,
          });

          completed = nextCompleted;

          if (completed) {
            inProgress = false;
          }

          updateButtons();
        } catch (error) {
          console.error("Failed to update completed:", error);
          await confirmDialog({
            title: "Failed to Update",
            message: "Failed to update completed.",
            alertOnly: true,
          });
        } finally {
          completedButton.disabled = false;
          progressButton.disabled = false;
        }
      });

      progressButton.addEventListener("click", async () => {
        completedButton.disabled = true;
        progressButton.disabled = true;

        try {
          const nextProgress = !inProgress;

          await saveStatus({
            in_progress: nextProgress,
            completed: nextProgress ? false : completed,
          });

          inProgress = nextProgress;

          if (inProgress) {
            completed = false;
          }

          updateButtons();
        } catch (error) {
          console.error("Failed to update progress:", error);
          await confirmDialog({
            title: "Failed to Update",
            message: "Failed to update progress.",
            alertOnly: true,
          });
        } finally {
          completedButton.disabled = false;
          progressButton.disabled = false;
        }
      });
    }

    // Game information
    document.getElementById("detail-title").textContent = game.title;

    document.getElementById("detail-platform").textContent =
      game.platforms?.name ?? "Unknown Platform";

    document.getElementById("detail-year").textContent =
      game.release_year ?? "Unknown";

    document.getElementById("detail-genre").textContent =
      game.genre || "Unknown";

    document.getElementById("detail-developer").textContent =
      game.developer || "Unknown";

    document.getElementById("detail-series").textContent =
      game.series?.name || "None";

    document.getElementById("detail-description").textContent =
      game.description || "No description available.";

    // Cover image
    const cover = document.getElementById("detail-cover");
    const placeholder = document.getElementById("detail-cover-placeholder");

    function showPlaceholder() {
      cover.hidden = true;
      cover.classList.add("hidden");
      cover.classList.remove("block");
      cover.removeAttribute("src");

      placeholder.hidden = false;
      placeholder.classList.remove("hidden");
      placeholder.classList.add("flex");
    }

    function showCover() {
      cover.hidden = false;
      cover.classList.remove("hidden");
      cover.classList.add("block");

      placeholder.hidden = true;
      placeholder.classList.remove("flex");
      placeholder.classList.add("hidden");
    }

    if (game.cover_url) {
      cover.onload = showCover;
      cover.src = game.cover_url;
    } else {
      showPlaceholder();
    }

    // Load My Gaming History
    const historyLoading = document.getElementById("history-loading");
    const historyEmpty = document.getElementById("history-empty");
    const historyTimeline = document.getElementById("history-timeline");

    try {
      const completions = await getGameCompletions(game.id);

      historyLoading.hidden = true;

      document.getElementById("history-total").textContent = completions.length;

      if (completions.length === 0) {
        historyEmpty.hidden = false;
      } else {
        const years = completions.map((item) => item.completed_year);

        document.getElementById("history-first").textContent = Math.min(
          ...years,
        );

        document.getElementById("history-last").textContent = Math.max(
          ...years,
        );

        for (const completion of completions) {
          const entry = document.createElement("div");
          entry.className =
            "flex gap-4 rounded-lg border border-slate-700/50 bg-slate-900/30 p-4";

          const icon = document.createElement("span");
          icon.className = "text-xl";
          icon.textContent = "🏆";

          const details = document.createElement("div");
          details.className = "min-w-0 flex-1";

          const date = document.createElement("p");
          date.className = "font-semibold text-white";

          const parts = [
            completion.completed_year,
            completion.completed_month
              ? String(completion.completed_month).padStart(2, "0")
              : null,
            completion.completed_day
              ? String(completion.completed_day).padStart(2, "0")
              : null,
          ].filter(Boolean);

          date.textContent = parts.join("-");

          details.append(date);

          if (completion.notes) {
            const notes = document.createElement("p");
            notes.className = "mt-2 whitespace-pre-line text-sm text-slate-400";
            notes.textContent = completion.notes;
            details.append(notes);
          }

          entry.append(icon, details);

          if (adminUser) {
            const editButton = document.createElement("button");

            editButton.type = "button";
            editButton.textContent = "✎";
            editButton.title = "Edit completion";
            editButton.setAttribute("aria-label", "Edit completion");

            editButton.className =
              "self-start rounded-lg border border-slate-700 px-3 py-2 " +
              "text-slate-400 transition hover:border-pink-500 " +
              "hover:text-pink-400";

            editButton.addEventListener("click", () => {
              editingCompletionId = completion.id;

              document.getElementById("completion-year").value =
                completion.completed_year;

              document.getElementById("completion-month").value =
                completion.completed_month ?? "";

              document.getElementById("completion-day").value =
                completion.completed_day ?? "";

              document.getElementById("completion-notes").value =
                completion.notes ?? "";

              completionError.hidden = true;
              completionDialogTitle.textContent = "Edit Completion";
              completionSave.textContent = "Update Completion";

              completionDialog.showModal();
            });

            entry.append(editButton);

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.textContent = "🗑";
            deleteButton.title = "Delete completion";
            deleteButton.setAttribute("aria-label", "Delete completion");

            deleteButton.className =
              "self-start rounded-lg border border-slate-700 px-3 py-2 " +
              "text-slate-400 transition hover:border-red-500 " +
              "hover:text-red-400";

            deleteButton.addEventListener("click", async () => {
              const confirmed = await confirmDialog({
                title: "Delete Completion?",
                message: `Are you sure you want to delete the completion from ${completion.completed_year}?`,
                confirmText: "Delete Completion",
              });

              if (!confirmed) return;

              deleteButton.disabled = true;

              try {
                await deleteGameCompletion(completion.id);

                // Refresh Game Details
                window.dispatchEvent(new HashChangeEvent("hashchange"));
              } catch (error) {
                console.error("Failed to delete completion:", error);
                await confirmDialog({
                  title: "Failed to Delete",
                  message: "Failed to delete completion.",
                  alertOnly: true,
                });
                deleteButton.disabled = false;
              }
            });

            entry.append(deleteButton);
          }

          historyTimeline.append(entry);
        }
      }
    } catch (historyError) {
      console.error("Failed to load gaming history:", historyError);

      historyLoading.textContent = "Unable to load completion history.";
    }

    // Load other games from the same series
    if (game.series_id !== null) {
      const { data: relatedGames, error: relatedError } = await supabase
        .from("games")
        .select(
          `
            id,
            title,
            release_year,
            genre,
            developer,
            cover_url,
            platforms (name)
        `,
        )
        .eq("series_id", game.series_id)
        .neq("id", game.id)
        .order("release_year", { ascending: true })
        .limit(4);

      if (relatedError) {
        console.error("Failed to load related games:", relatedError);
      } else if (relatedGames?.length) {
        const section = document.getElementById("related-games-section");
        const list = document.getElementById("related-games-list");

        for (const relatedGame of relatedGames) {
          list.append(createGameCard(relatedGame));
        }

        section.hidden = false;
      }
    }

    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    console.error("Failed to load game details:", error);

    loading.hidden = true;
    errorMessage.textContent = "Failed to load game details.";
    errorMessage.hidden = false;
  }
}
