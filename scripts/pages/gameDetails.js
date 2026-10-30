import { supabase } from "../supabase.js";
import { createGameCard } from "../components/gameCard.js";
import { getAdminUser } from "../admin.js";

export async function initGameDetails(params = new URLSearchParams()) {
  const loading = document.getElementById("game-details-loading");
  const content = document.getElementById("game-details-content");
  const errorMessage = document.getElementById("game-details-error");

  const gameId = params.get("id");

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

    if (adminUser) {
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
          alert(error.message);
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
          alert(error.message);
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
          alert(error.message);
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
