import { supabase } from "../supabase.js";
import { createGameCard } from "../components/gameCard.js";
import {
  getGameCompletions,
  addGameCompletion,
  updateGameCompletion,
  deleteGameCompletion,
} from "../api/completions.js";
import { confirmDialog } from "../components/confirmDialog.js";
import { showLoadingOverlay, hideLoadingOverlay } from "../loading.js";
import {
  getGameMemory,
  saveGameMemory,
  deleteGameMemory,
  uploadMemoryImage,
} from "../api/memories.js";
import { ACHIEVEMENTS } from "../data/achievements.js";
import {
  getGameAchievements,
  addGameAchievement,
  deleteGameAchievement,
} from "../api/achievements.js";
import {
  getGameLinks,
  addGameLink,
  updateGameLink,
  deleteGameLink,
} from "../api/gameLinks.js";
import { t } from "../i18n.js";
function formatCompletionTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}
export async function initGameDetails(params = new URLSearchParams()) {
  showLoadingOverlay();
  const loading = document.getElementById("game-details-loading");
  loading.hidden = true;
  const content = document.getElementById("game-details-content");
  const errorMessage = document.getElementById("game-details-error");
  const gameId = params.get("id");
  let editingCompletionId = null;
  if (!gameId || !/^\d+$/.test(gameId)) {
    loading.hidden = true;
    errorMessage.textContent = "Invalid game ID.";
    errorMessage.hidden = false;
    hideLoadingOverlay();
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
        user_id,
        title,
        music_url,
        walkthrough_url,
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
      favoriteButton.textContent = `${favorite ? "♥" : "♡"} ${t("game_details.game.status.favorite")}`;
      completedButton.textContent = `${completed ? "✓" : "○"} ${t("game_details.game.status.completed")}`;
      progressButton.textContent = `${inProgress ? "◷" : "○"} ${t("game_details.game.status.in_progress")}`;
      favoriteButton.classList.toggle("text-red-500", favorite);
      completedButton.classList.toggle("text-green-400", completed);
      progressButton.classList.toggle("text-amber-400", inProgress);
    }
    updateButtons();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    const canManageGame = user !== null && game.user_id === user.id;
    // ==========================================
    // GAME COMPLETION HISTORY
    // ==========================================
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
    if (canManageGame) {
      addCompletionButton.classList.remove("hidden");
      addCompletionButton.addEventListener("click", () => {
        editingCompletionId = null;
        completionForm.reset();
        completionError.hidden = true;
        completionDialogTitle.textContent = t("game_details.history.add_title");
        completionSave.textContent = t("game_details.history.save");
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
        // Optional completion time
        const hoursValue = document.getElementById("completion-hours").value;
        const minutesValue =
          document.getElementById("completion-minutes").value;
        const secondsValue =
          document.getElementById("completion-seconds").value;
        const hasCompletionTime =
          hoursValue !== "" || minutesValue !== "" || secondsValue !== "";
        const hours = Number(hoursValue || 0);
        const minutes = Number(minutesValue || 0);
        const seconds = Number(secondsValue || 0);
        if (
          [hours, minutes, seconds].some(
            (value) => !Number.isSafeInteger(value) || value < 0,
          ) ||
          minutes > 59 ||
          seconds > 59
        ) {
          completionError.textContent = t("game_details.history.invalid_time");
          completionError.hidden = false;
          return;
        }
        const completionTimeSeconds = hasCompletionTime
          ? hours * 3600 + minutes * 60 + seconds
          : null;
        if (
          completionTimeSeconds !== null &&
          (!Number.isSafeInteger(completionTimeSeconds) ||
            completionTimeSeconds > 2147483647)
        ) {
          completionError.textContent = t(
            "game_details.history.time_too_large",
          );
          completionError.hidden = false;
          return;
        }
        if (day !== null && month === null) {
          completionError.textContent = t(
            "game_details.history.month_required",
          );
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
            completionError.textContent = t(
              "game_details.history.invalid_date",
            );
            completionError.hidden = false;
            return;
          }
        }
        completionSave.disabled = true;
        completionSave.textContent = t("game_details.history.saving");
        try {
          const completionData = {
            game_id: game.id,
            completed_year: year,
            completed_month: month,
            completed_day: day,
            notes: notes || null,
            completion_time_seconds: completionTimeSeconds,
          };
          if (editingCompletionId !== null) {
            await updateGameCompletion(editingCompletionId, completionData);
          } else {
            await addGameCompletion(completionData);
          }
          completionDialog.close();
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        } catch (error) {
          console.error("Failed to save completion:", error);
          completionError.textContent = error.message;
          completionError.hidden = false;
        } finally {
          completionSave.disabled = false;
          completionSave.textContent =
            editingCompletionId !== null
              ? t("game_details.history.update")
              : t("game_details.history.save");
        }
      });
    }
    // ==========================================
    // GAME MANAGEMENT
    // ==========================================
    if (canManageGame) {
      // Show Edit Game button
      const editButton = document.getElementById("detail-edit");
      if (editButton) {
        editButton.href = `#/admin/edit-game?id=${game.id}`;
        editButton.classList.remove("hidden");
      }
      // Show Delete Game button
      const deleteButton = document.getElementById("detail-delete");
      if (deleteButton) {
        deleteButton.classList.remove("hidden");
        deleteButton.addEventListener("click", async () => {
          const confirmed = await confirmDialog({
            title: "Delete Game?",
            message: `Are you sure you want to permanently delete "${game.title}"? All completion history for this game will also be deleted.`,
            confirmText: "Delete Game",
          });
          if (!confirmed) return;
          deleteButton.disabled = true;
          try {
            const { data, error } = await supabase
              .from("games")
              .delete()
              .eq("id", game.id)
              .select("id");
            if (error) throw error;
            if (!data?.length) {
              throw new Error("Game was not deleted. Check your permissions.");
            }
            window.location.hash = "#/games";
          } catch (error) {
            console.error("Failed to delete game:", error);
            await confirmDialog({
              title: "Failed to Delete",
              message: error.message || "Could not delete the game.",
              alertOnly: true,
            });
            deleteButton.disabled = false;
          }
        });
      }
      // Enable status buttons
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
      // Favorite
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
      // Completed
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
      // In Progress
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
    // ==========================================
    // GAME SOUNDTRACK
    // ==========================================
    const soundtrackSection = document.getElementById(
      "game-soundtrack-section",
    );
    const soundtrackPlayer = document.getElementById("game-soundtrack-player");
    if (game.music_url) {
      try {
        const url = new URL(game.music_url);
        let videoId = null;
        if (
          ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
            url.hostname,
          )
        ) {
          videoId =
            url.pathname === "/watch"
              ? url.searchParams.get("v")
              : url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
        } else if (url.hostname === "youtu.be") {
          videoId = url.pathname.slice(1);
        }
        if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
          const iframe = document.createElement("iframe");
          iframe.src = `https\://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
          iframe.title = `${game.title} Soundtrack`;
          iframe.className = "aspect-video w-full";
          iframe.allow = "autoplay; encrypted-media; picture-in-picture";
          iframe.allowFullscreen = true;
          iframe.loading = "eager";
          soundtrackPlayer.replaceChildren(iframe);
          soundtrackSection.hidden = false;
        }
      } catch (error) {
        console.warn("Invalid soundtrack URL:", error);
      }
    }
    // ==========================================
    // GAME WALKTHROUGH
    // ==========================================
    const walkthroughSection = document.getElementById(
      "game-walkthrough-section",
    );
    const walkthroughPlayer = document.getElementById(
      "game-walkthrough-player",
    );
    if (game.walkthrough_url) {
      try {
        const url = new URL(game.walkthrough_url);
        let embedUrl = null;
        if (
          ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
            url.hostname,
          )
        ) {
          const playlistId = url.searchParams.get("list");
          const videoId =
            url.searchParams.get("v") ||
            url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
          if (playlistId && /^[a-zA-Z0-9_-]+$/.test(playlistId)) {
            embedUrl = `https\://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}`;
          } else if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            embedUrl = `https\://www.youtube-nocookie.com/embed/${videoId}`;
          }
        } else if (url.hostname === "youtu.be") {
          const videoId = url.pathname.slice(1);
          if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            embedUrl = `https\://www.youtube-nocookie.com/embed/${videoId}`;
          }
        }
        if (embedUrl) {
          const iframe = document.createElement("iframe");
          iframe.src = embedUrl;
          iframe.title = `${game.title} Walkthrough`;
          iframe.className = "aspect-video w-full";
          iframe.allow = "encrypted-media; picture-in-picture";
          iframe.allowFullscreen = true;
          iframe.loading = "lazy";
          walkthroughPlayer.replaceChildren(iframe);
          walkthroughSection.hidden = false;
        }
      } catch (error) {
        console.warn("Invalid walkthrough URL:", error);
      }
    }
    // ==========================================
    // GAME INFORMATION
    // ==========================================
    document.getElementById("detail-title").textContent = game.title;
    document.getElementById("detail-platform").textContent =
      game.platforms?.name ?? "Unknown Platform";
    // Link the platform badge to its details page
    const platformBadge = document.getElementById("detail-platform");
    const platformName = game.platforms?.name;
    if (platformName) {
      const { data: platformData, error: platformError } = await supabase
        .from("platforms")
        .select("id")
        .eq("name", platformName)
        .maybeSingle();
      if (platformError) {
        console.error("Failed to find platform:", platformError);
      }
      if (platformData) {
        platformBadge.href = `#/platform?id=${platformData.id}`;
      } else {
        platformBadge.removeAttribute("href");
      }
    } else {
      platformBadge.removeAttribute("href");
    }
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
    // ==========================================
    // COVER IMAGE
    // ==========================================
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
    // ==========================================
    // MY ACHIEVEMENTS
    // ==========================================
    const achievementLoading = document.getElementById("achievements-loading");
    const achievementEmpty = document.getElementById("achievements-empty");
    const achievementBadges = document.getElementById("achievements-badges");
    const achievementCount = document.getElementById("achievement-count");
    const achievementControls = document.getElementById(
      "achievement-add-controls",
    );
    const achievementSelect = document.getElementById("achievement-select");
    const achievementAdd = document.getElementById("achievement-add");
    const achievementError = document.getElementById("achievement-error");
    const achievementColors = {
      amber: "text-amber-400 border-amber-500/40",
      purple: "text-purple-400 border-purple-500/40",
      yellow: "text-yellow-400 border-yellow-500/40",
      pink: "text-pink-400 border-pink-500/40",
      cyan: "text-cyan-400 border-cyan-500/40",
      orange: "text-orange-400 border-orange-500/40",
      red: "text-red-400 border-red-500/40",
      emerald: "text-emerald-400 border-emerald-500/40",
      green: "text-green-400 border-green-500/40",
      violet: "text-violet-400 border-violet-500/40",
      rose: "text-rose-400 border-rose-500/40",
      blue: "text-blue-400 border-blue-500/40",
      sky: "text-sky-400 border-sky-500/40",
      slate: "text-slate-400 border-slate-500/40",
      teal: "text-teal-400 border-teal-500/40",
      indigo: "text-indigo-400 border-indigo-500/40",
    };
    let earnedAchievements = [];
    function renderAchievements() {
      achievementLoading.hidden = true;
      achievementBadges.replaceChildren();
      achievementCount.textContent = earnedAchievements.length;
      achievementEmpty.hidden = earnedAchievements.length > 0;
      const earnedIds = new Set(
        earnedAchievements.map((item) => item.achievement_id),
      );
      for (const record of earnedAchievements) {
        const achievement = ACHIEVEMENTS.find(
          (item) => item.id === record.achievement_id,
        );
        if (!achievement) continue;
        const badge = document.createElement("div");
        badge.className =
          "flex w-28 flex-col items-center gap-2 p-1 text-center";
        const iconCircle = document.createElement("div");
        iconCircle.className =
          "flex h-20 w-20 items-center justify-center rounded-full " +
          "transition-transform duration-200 hover:scale-110";
        const icon = document.createElement("i");
        icon.setAttribute("data-lucide", achievement.icon);
        icon.className = "h-9 w-9";
        iconCircle.append(icon);
        // Automatically look for a custom badge image.
        const badgeImage = document.createElement("img");
        badgeImage.src = `images/badges/${achievement.id}.png`;
        badgeImage.alt = "";
        badgeImage.className =
          "hidden h-full w-full rounded-full object-contain";
        badgeImage.style.imageRendering = "pixelated";
        badgeImage.addEventListener("load", () => {
          icon.hidden = true;
          icon.classList.add("hidden");
          badgeImage.hidden = false;
          badgeImage.classList.remove("hidden");
        });
        badgeImage.addEventListener("error", () => {
          badgeImage.remove();
        });
        iconCircle.append(badgeImage);
        const name = document.createElement("p");
        name.className =
          "w-full text-center text-xs font-semibold leading-5 text-white";
        name.textContent = t(
          `game_details.achievements.${achievement.id}.name`,
        );
        badge.title = t(
          `game_details.achievements.${achievement.id}.description`,
        );
        badge.append(iconCircle, name);
        if (canManageGame) {
          badge.classList.add(
            "cursor-pointer",
            "transition",
            "hover:border-red-500/50",
          );
          badge.setAttribute("role", "button");
          badge.setAttribute("tabindex", "0");
          badge.setAttribute(
            "aria-label",
            `Remove ${achievement.name} achievement`,
          );
          async function removeBadge() {
            const confirmed = await confirmDialog({
              title: "Remove Achievement?",
              message: `Remove "${achievement.name}" from your earned badges?`,
              confirmText: "Remove Badge",
            });
            if (!confirmed) return;
            badge.classList.add("pointer-events-none", "opacity-50");
            try {
              await deleteGameAchievement(record.id, user.id);
              earnedAchievements = earnedAchievements.filter(
                (item) => item.id !== record.id,
              );
              renderAchievements();
            } catch (error) {
              console.error("Failed to remove achievement:", error);
              await confirmDialog({
                title: "Failed to Remove Achievement",
                message: error.message || "Could not remove achievement.",
                alertOnly: true,
              });
              badge.classList.remove("pointer-events-none", "opacity-50");
            }
          }
          badge.addEventListener("click", removeBadge);
          badge.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              removeBadge();
            }
          });
        }
        achievementBadges.append(badge);
      }
      achievementSelect.replaceChildren(
        new Option(t("game_details.achievements.choose"), ""),
      );
      for (const achievement of ACHIEVEMENTS) {
        if (!earnedIds.has(achievement.id)) {
          achievementSelect.add(
            new Option(
              t(`game_details.achievements.${achievement.id}.name`),
              achievement.id,
            ),
          );
        }
      }
      achievementAdd.disabled = true;
      achievementControls.hidden = !canManageGame;
      window.lucide?.createIcons();
    }
    try {
      earnedAchievements = canManageGame
        ? await getGameAchievements(game.id, user.id)
        : [];
      renderAchievements();
    } catch (error) {
      console.error("Failed to load achievements:", error);
      achievementLoading.textContent = "Unable to load achievements.";
    }
    if (canManageGame) {
      achievementSelect.addEventListener("change", () => {
        achievementAdd.disabled = !achievementSelect.value;
        achievementError.hidden = true;
      });
      achievementAdd.addEventListener("click", async () => {
        const achievementId = achievementSelect.value;
        if (!achievementId) return;
        if (!ACHIEVEMENTS.some((item) => item.id === achievementId)) {
          return;
        }
        achievementAdd.disabled = true;
        achievementSelect.disabled = true;
        achievementError.hidden = true;
        try {
          const newAchievement = await addGameAchievement(
            game.id,
            user.id,
            achievementId,
          );
          earnedAchievements.push(newAchievement);
          renderAchievements();
        } catch (error) {
          console.error("Failed to add achievement:", error);
          achievementError.textContent =
            error.message || "Could not add achievement.";
          achievementError.hidden = false;
        } finally {
          achievementSelect.disabled = false;
          achievementAdd.disabled = !achievementSelect.value;
        }
      });
    }
    // ==========================================
    // GAME COMPLETION HISTORY
    // ==========================================
    const historyLoading = document.getElementById("history-loading");
    const historyEmpty = document.getElementById("history-empty");
    const historyTimeline = document.getElementById("history-timeline");
    try {
      const completions = await getGameCompletions(game.id);
      historyLoading.hidden = true;
      historyTimeline.replaceChildren();
      document.getElementById("history-total").textContent = completions.length;
      if (completions.length === 0) {
        historyEmpty.hidden = false;
      } else {
        historyEmpty.hidden = true;
        const years = completions.map((item) => item.completed_year);
        document.getElementById("history-first").textContent = Math.min(
          ...years,
        );
        document.getElementById("history-last").textContent = Math.max(
          ...years,
        );
        // Find the fastest recorded completion time.
        // Untimed completions are excluded.
        const timedCompletions = completions.filter(
          (item) => item.completion_time_seconds != null,
        );
        const personalBest = timedCompletions.length
          ? Math.min(
              ...timedCompletions.map((item) => item.completion_time_seconds),
            )
          : null;
        for (const completion of completions) {
          const entry = document.createElement("div");
          entry.className =
            "flex gap-4 rounded-lg border border-slate-700/50 " +
            "bg-slate-900/30 p-4";
          const icon = document.createElement("span");
          icon.className = "text-xl";
          icon.textContent = "🏆";
          const details = document.createElement("div");
          details.className = "min-w-0 flex-1";
          // Completion date
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
          // Completion time
          if (completion.completion_time_seconds != null) {
            const time = document.createElement("p");
            time.className = "completion-time mt-1 text-sm";
            time.textContent = `${t("game_details.history.completion_time")}: ${formatCompletionTime(
              completion.completion_time_seconds,
            )}`;
            details.append(time);
            // Personal Best
            if (completion.completion_time_seconds === personalBest) {
              const badge = document.createElement("span");
              badge.className =
                "completion-personal-best mt-1 inline-flex " +
                "text-xs font-semibold";
              badge.textContent = `🏆 ${t("game_details.history.personal_best")}`;
              details.append(badge);
            }
          }
          // Personal memory / notes for this completion
          if (completion.notes) {
            const notes = document.createElement("p");
            notes.className = "mt-2 whitespace-pre-line text-sm text-slate-400";
            notes.textContent = completion.notes;
            details.append(notes);
          }
          entry.append(icon, details);
          if (canManageGame) {
            // Edit completion
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "✎";
            editButton.title = t("game_details.history.edit");
            editButton.setAttribute(
              "aria-label",
              t("game_details.history.edit"),
            );
            editButton.className =
              "self-start rounded-lg border border-slate-700 " +
              "px-3 py-2 text-slate-400 transition " +
              "hover:border-pink-500 hover:text-pink-400";
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
              // Restore recorded completion time when editing.
              const totalSeconds = completion.completion_time_seconds;
              document.getElementById("completion-hours").value =
                totalSeconds == null ? "" : Math.floor(totalSeconds / 3600);
              document.getElementById("completion-minutes").value =
                totalSeconds == null
                  ? ""
                  : Math.floor((totalSeconds % 3600) / 60);
              document.getElementById("completion-seconds").value =
                totalSeconds == null ? "" : totalSeconds % 60;
              completionError.hidden = true;
              completionDialogTitle.textContent = t(
                "game_details.history.edit_title",
              );
              completionSave.textContent = t("game_details.history.update");
              completionDialog.showModal();
            });
            entry.append(editButton);
            // Delete completion
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "🗑";
            deleteButton.title = t("game_details.history.delete");
            deleteButton.setAttribute(
              "aria-label",
              t("game_details.history.delete"),
            );
            deleteButton.className =
              "self-start rounded-lg border border-slate-700 " +
              "px-3 py-2 text-slate-400 transition " +
              "hover:border-red-500 hover:text-red-400";
            deleteButton.addEventListener("click", async () => {
              const confirmed = await confirmDialog({
                title: t("game_details.history.delete_title"),
                message: t("game_details.history.delete_message").replace(
                  "{year}",
                  completion.completed_year,
                ),
                confirmText: t("game_details.history.delete_confirm"),
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
                  title: t("game_details.history.delete_failed"),
                  message: t("game_details.history.delete_failed_message"),
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
      console.error("Failed to load completion history:", historyError);
      historyLoading.textContent = t("game_details.history.load_failed");
    }
    // ==========================================
    // PERSONAL MEMORY
    // ==========================================
    const memoryLoading = document.getElementById("memory-loading");
    const memoryEmpty = document.getElementById("memory-empty");
    const memoryContent = document.getElementById("memory-content");
    const memoryText = document.getElementById("memory-text");
    const memoryYear = document.getElementById("memory-year");
    const memoryYearText = document.getElementById("memory-year-text");
    const memoryAdd = document.getElementById("memory-add");
    const memoryEdit = document.getElementById("memory-edit");
    const memoryDelete = document.getElementById("memory-delete");
    const memoryDialog = document.getElementById("memory-dialog");
    const memoryForm = document.getElementById("memory-form");
    const memoryCancel = document.getElementById("memory-cancel");
    const memorySave = document.getElementById("memory-save");
    const memoryError = document.getElementById("memory-error");
    const memoryInput = document.getElementById("memory-input");
    const memoryPlayedYear = document.getElementById("memory-played-year");
    const memoryRemoveImageContainer = document.getElementById(
      "memory-remove-image-container",
    );
    const memoryRemoveImage = document.getElementById("memory-remove-image");
    const memoryImageContainer = document.getElementById(
      "memory-image-container",
    );
    const memoryImageDisplay = document.getElementById("memory-image-display");
    let currentMemory = null;
    async function renderMemory() {
      memoryLoading.hidden = true;
      memoryDelete.hidden = !currentMemory || !canManageGame;
      memoryEmpty.hidden = Boolean(currentMemory);
      memoryContent.hidden = !currentMemory;
      memoryAdd.hidden = !canManageGame || Boolean(currentMemory);
      memoryEdit.hidden = !currentMemory || !canManageGame;
      memoryImageContainer.hidden = true;
      memoryImageDisplay.removeAttribute("src");
      if (currentMemory) {
        memoryText.textContent = currentMemory.memory;
        memoryYearText.textContent = currentMemory.played_year
          ? `${currentMemory.played_year}`
          : "";
        if (currentMemory.image_path) {
          const imagePath = currentMemory.image_path;
          const { data, error } = await supabase.storage
            .from("memory-images")
            .createSignedUrl(imagePath, 3600);
          if (error) {
            console.error("Failed to load memory image:", error);
          } else if (
            currentMemory?.image_path === imagePath &&
            data?.signedUrl
          ) {
            memoryImageDisplay.src = data.signedUrl;
            memoryImageContainer.hidden = false;
          }
        }
      }
    }
    try {
      currentMemory = canManageGame
        ? await getGameMemory(game.id, user.id)
        : null;
      await renderMemory();
    } catch (error) {
      console.error("Failed to load personal memory:", error);
      memoryLoading.textContent = "Unable to load personal memory.";
    }
    if (canManageGame) {
      function openMemoryDialog() {
        memoryForm.reset();
        memoryError.hidden = true;
        memoryInput.value = currentMemory?.memory ?? "";
        memoryPlayedYear.value = currentMemory?.played_year ?? "";
        memoryRemoveImageContainer.hidden = !currentMemory?.image_path;
        memoryRemoveImage.checked = false;
        memoryDialog.showModal();
      }
      memoryAdd.addEventListener("click", openMemoryDialog);
      memoryEdit.addEventListener("click", openMemoryDialog);
      memoryCancel.addEventListener("click", () => {
        memoryDialog.close();
      });
      memoryForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const text = memoryInput.value.trim();
        const year = memoryPlayedYear.value
          ? Number(memoryPlayedYear.value)
          : null;
        if (!text) {
          memoryError.textContent = "Please enter a personal memory.";
          memoryError.hidden = false;
          return;
        }
        const imageFile = document.getElementById("memory-image").files[0];
        if (imageFile) {
          const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
          const maxSize = 5 * 1024 * 1024;
          if (!allowedTypes.includes(imageFile.type)) {
            memoryError.textContent =
              "Please select a JPG, PNG, or WebP image.";
            memoryError.hidden = false;
            return;
          }
          if (imageFile.size > maxSize) {
            memoryError.textContent = "The image must be smaller than 5 MB.";
            memoryError.hidden = false;
            return;
          }
        }
        memorySave.disabled = true;
        memorySave.textContent = "Saving...";
        memoryError.hidden = true;
        try {
          const previousImagePath = currentMemory?.image_path ?? null;
          const removeExistingImage = memoryRemoveImage.checked;
          // undefined = preserve existing image
          // null = remove existing image
          // string = save new image path
          let imagePath = removeExistingImage ? null : undefined;
          if (imageFile) {
            imagePath = await uploadMemoryImage(game.id, user.id, imageFile);
          }
          try {
            currentMemory = await saveGameMemory(
              game.id,
              user.id,
              text,
              year,
              imagePath,
            );
          } catch (error) {
            // Clean up an uploaded image if saving fails.
            if (imagePath) {
              try {
                await supabase.storage
                  .from("memory-images")
                  .remove([imagePath]);
              } catch (cleanupError) {
                console.error("Image cleanup failed:", cleanupError);
              }
            }
            throw error;
          }
          if (
            previousImagePath &&
            imagePath !== undefined &&
            previousImagePath !== imagePath
          ) {
            const { error: cleanupError } = await supabase.storage
              .from("memory-images")
              .remove([previousImagePath]);
            if (cleanupError) {
              console.error(
                "Failed to remove previous memory image:",
                cleanupError,
              );
            }
          }
          await renderMemory();
          memoryDialog.close();
        } catch (error) {
          console.error("Failed to save personal memory:", error);
          memoryError.textContent = error.message;
          memoryError.hidden = false;
        } finally {
          memorySave.disabled = false;
          memorySave.textContent = "Save Memory";
        }
      });
      window.lucide?.createIcons();
      memoryDelete.addEventListener("click", async () => {
        if (!currentMemory) return;
        const confirmed = await confirmDialog({
          title: "Delete Personal Memory?",
          message: "Are you sure you want to permanently delete this memory?",
          confirmText: "Delete Memory",
        });
        if (!confirmed) return;
        memoryDelete.disabled = true;
        try {
          const imagePath = currentMemory.image_path;
          await deleteGameMemory(currentMemory.id);
          currentMemory = null;
          await renderMemory();
          if (imagePath) {
            const { error: cleanupError } = await supabase.storage
              .from("memory-images")
              .remove([imagePath]);
            if (cleanupError) {
              console.error(
                "Failed to remove deleted memory image:",
                cleanupError,
              );
            }
          }
        } catch (error) {
          console.error("Failed to delete personal memory:", error);
          await confirmDialog({
            title: "Failed to Delete",
            message: error.message || "Could not delete personal memory.",
            alertOnly: true,
          });
        } finally {
          memoryDelete.disabled = false;
        }
      });
    }
    // ==========================================
    // MY GAME LINKS
    // ==========================================
    const gameLinksLoading = document.getElementById("game-links-loading");
    const gameLinksEmpty = document.getElementById("game-links-empty");
    const gameLinksList = document.getElementById("game-links-list");
    const gameLinksError = document.getElementById("game-links-error");
    const gameLinksAdd = document.getElementById("game-links-add");
    let currentGameLinks = [];
    let editingGameLinkId = null;
    const gameLinkDialogTitle = document.getElementById(
      "game-link-dialog-title",
    );
    function setGameLinkDialogLabels(isEditing) {
      gameLinkDialogTitle.textContent = t(
        isEditing
          ? "game_details.links.dialog_edit_title"
          : "game_details.links.dialog_add_title",
      );
      gameLinkSave.textContent = t(
        isEditing ? "game_details.links.update" : "game_details.links.save",
      );
    }
    gameLinksAdd.hidden = !canManageGame;
    function renderGameLinks() {
      gameLinksLoading.hidden = true;
      gameLinksList.replaceChildren();
      gameLinksEmpty.hidden = currentGameLinks.length > 0;
      gameLinksList.hidden = currentGameLinks.length === 0;
      for (const link of currentGameLinks) {
        const item = document.createElement("div");
        item.className =
          "flex flex-wrap items-center justify-between gap-3 " +
          "rounded-lg border border-slate-700/50 " +
          "bg-slate-800/40 p-4";
        const anchor = document.createElement("a");
        anchor.href = link.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.textContent = link.name;
        anchor.className =
          "break-words font-semibold text-sky-400 " +
          "transition hover:text-sky-300 hover:underline";
        const linkInfo = document.createElement("div");
        linkInfo.className = "min-w-0 flex-1";
        const titleRow = document.createElement("div");
        titleRow.className = "flex flex-wrap items-center gap-3";
        titleRow.append(anchor);
        if (link.category) {
          const category = document.createElement("span");
          category.className =
            "rounded-full bg-slate-700/60 px-3 py-1 " +
            "text-xs font-medium text-slate-300";
          category.textContent = link.category;
          titleRow.append(category);
        }
        const urlText = document.createElement("p");
        urlText.className = "mt-1 break-all text-xs text-slate-400";
        urlText.textContent = link.url;
        linkInfo.append(titleRow, urlText);
        item.append(linkInfo);
        if (canManageGame) {
          const actions = document.createElement("div");
          actions.className = "flex shrink-0 items-center gap-2";
          // Edit link
          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.title = "Edit link";
          editButton.className =
            "inline-flex items-center gap-2 rounded-lg " +
            "border border-cyan-500/30 px-3 py-2 text-sm " +
            "text-cyan-400 transition hover:border-cyan-400 " +
            "hover:bg-cyan-500/10";
          const editIcon = document.createElement("i");
          editIcon.setAttribute("data-lucide", "pencil");
          editIcon.className = "h-4 w-4";
          const editLabel = document.createElement("span");
          editLabel.textContent = "Edit";
          editButton.append(editIcon, editLabel);
          editButton.addEventListener("click", () => {
            editingGameLinkId = link.id;
            gameLinkForm.reset();
            gameLinkName.value = link.name;
            gameLinkUrl.value = link.url;
            gameLinkCategory.value = link.category ?? "";
            setGameLinkDialogLabels(true);
            gameLinkDialog.showModal();
          });
          // Delete link
          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.title = "Delete link";
          deleteButton.className =
            "inline-flex items-center gap-2 rounded-lg " +
            "border border-red-500/30 px-3 py-2 text-sm " +
            "text-red-400 transition hover:border-red-500 " +
            "hover:bg-red-500/10";
          const deleteIcon = document.createElement("i");
          deleteIcon.setAttribute("data-lucide", "trash-2");
          deleteIcon.className = "h-4 w-4";
          const deleteLabel = document.createElement("span");
          deleteLabel.textContent = "Delete";
          deleteButton.append(deleteIcon, deleteLabel);
          deleteButton.addEventListener("click", async () => {
            const confirmed = await confirmDialog({
              title: "Delete Game Link?",
              message:
                `Are you sure you want to permanently ` +
                `delete "${link.name}"?`,
              confirmText: "Delete Link",
            });
            if (!confirmed) return;
            deleteButton.disabled = true;
            try {
              await deleteGameLink(link.id, user.id);
              currentGameLinks = currentGameLinks.filter(
                (item) => item.id !== link.id,
              );
              renderGameLinks();
            } catch (error) {
              console.error("Failed to delete game link:", error);
              await confirmDialog({
                title: "Failed to Delete",
                message: error.message || "Could not delete game link.",
                alertOnly: true,
              });
              deleteButton.disabled = false;
            }
          });
          actions.append(editButton, deleteButton);
          item.append(actions);
        }
        gameLinksList.append(item);
      }
      window.lucide?.createIcons();
    }
    try {
      currentGameLinks = canManageGame
        ? await getGameLinks(game.id, user.id)
        : [];
      renderGameLinks();
    } catch (error) {
      console.error("Failed to load game links:", error);
      gameLinksLoading.hidden = true;
      gameLinksError.textContent = "Unable to load game links.";
      gameLinksError.hidden = false;
    }
    // ==========================================
    // ADD / EDIT GAME LINKS
    // ==========================================
    const gameLinkDialog = document.getElementById("game-link-dialog");
    const gameLinkForm = document.getElementById("game-link-form");
    const gameLinkCancel = document.getElementById("game-link-cancel");
    const gameLinkSave = document.getElementById("game-link-save");
    const gameLinkName = document.getElementById("game-link-name");
    const gameLinkUrl = document.getElementById("game-link-url");
    const gameLinkCategory = document.getElementById("game-link-category");
    if (canManageGame) {
      gameLinksAdd.addEventListener("click", () => {
        editingGameLinkId = null;
        gameLinkForm.reset();
        setGameLinkDialogLabels(false);
        gameLinkDialog.showModal();
      });
      gameLinkCancel.addEventListener("click", () => {
        gameLinkDialog.close();
      });
      gameLinkForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = gameLinkName.value.trim();
        const url = gameLinkUrl.value.trim();
        const category = gameLinkCategory.value.trim();
        if (!name || !url) return;
        gameLinkSave.disabled = true;
        gameLinkSave.textContent = t("game_details.links.saving");
        try {
          if (editingGameLinkId !== null) {
            const updatedLink = await updateGameLink(
              editingGameLinkId,
              user.id,
              name,
              url,
              category,
            );
            currentGameLinks = currentGameLinks.map((link) =>
              link.id === editingGameLinkId ? updatedLink : link,
            );
          } else {
            const newLink = await addGameLink(
              game.id,
              user.id,
              name,
              url,
              category,
            );
            currentGameLinks.push(newLink);
          }
          renderGameLinks();
          gameLinkDialog.close();
        } catch (error) {
          console.error("Failed to save game link:", error);
          alert(error.message || "Failed to save game link.");
        } finally {
          gameLinkSave.disabled = false;
          setGameLinkDialogLabels(editingGameLinkId !== null);
        }
      });
    }
    // ==========================================
    // RELATED GAMES
    // ==========================================
    if (game.series_id !== null) {
      const { data: relatedGames, error: relatedError } = await supabase
        .from("games")
        .select(
          `
            id,
            user_id,
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
    // ==========================================
    // FINISH LOADING
    // ==========================================
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    console.error("Failed to load game details:", error);
    loading.hidden = true;
    errorMessage.textContent = "Failed to load game details.";
    errorMessage.hidden = false;
  } finally {
    hideLoadingOverlay();
  }
}
