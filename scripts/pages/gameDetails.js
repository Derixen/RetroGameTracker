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
                completed
            `,
      )
      .eq("id", gameId)
      .single();

    if (error) throw error;

    const favoriteButton = document.getElementById("detail-favorite");
    const completedButton = document.getElementById("detail-completed");

    let favorite = game.favorite;
    let completed = game.completed;

    function updateButtons() {
      favoriteButton.textContent = favorite ? "♥ Favorite" : "♡ Favorite";

      completedButton.textContent = completed ? "✓ Completed" : "○ Completed";

      favoriteButton.classList.toggle("text-red-500", favorite);
      completedButton.classList.toggle("text-green-400", completed);
    }

    updateButtons();

    const adminUser = await getAdminUser();

    if (adminUser) {
      favoriteButton.disabled = false;
      completedButton.disabled = false;

      favoriteButton.classList.add("cursor-pointer");
      completedButton.classList.add("cursor-pointer");

      async function saveStatus(column, value) {
        const { data, error } = await supabase
          .from("games")
          .update({ [column]: value })
          .eq("id", game.id)
          .select("id")
          .single();

        if (error) throw error;
        return data;
      }

      favoriteButton.addEventListener("click", async () => {
        favoriteButton.disabled = true;

        try {
          await saveStatus("favorite", !favorite);
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

        try {
          await saveStatus("completed", !completed);
          completed = !completed;
          updateButtons();
        } catch (error) {
          console.error("Failed to update completed:", error);
          alert(error.message);
        } finally {
          completedButton.disabled = false;
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

    if (game.cover_url) {
      cover.src = game.cover_url;
      cover.alt = `${game.title} cover`;
      cover.hidden = false;
      placeholder.hidden = true;
      placeholder.classList.remove("flex");
      placeholder.classList.add("hidden");

      cover.onerror = () => {
        cover.hidden = true;
        placeholder.hidden = false;
        placeholder.classList.remove("hidden");
        placeholder.classList.add("flex");
      };
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
