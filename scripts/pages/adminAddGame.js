import { getPlatforms } from "../api/platforms.js";
import { getSeries } from "../api/series.js";
import { supabase } from "../supabase.js";
import { confirmDialog } from "../components/confirmDialog.js";

export async function initAdminAddGame(params = new URLSearchParams()) {
  const platformSelect = document.getElementById("game-platform");
  const seriesSelect = document.getElementById("game-series");
  const errorMessage = document.getElementById("add-game-error");
  const gameId = params.get("id");
  const isEditing = gameId !== null;

  const igdbSearchInput = document.getElementById("igdb-search-input");
  const igdbSearchButton = document.getElementById("igdb-search-button");
  const igdbSearchResults = document.getElementById("igdb-search-results");
  const igdbSearchError = document.getElementById("igdb-search-error");

  async function searchIGDB() {
    const query = igdbSearchInput.value.trim();

    if (query.length < 2) return;

    igdbSearchButton.disabled = true;
    igdbSearchButton.textContent = "Searching...";
    igdbSearchError.hidden = true;
    igdbSearchResults.hidden = true;
    igdbSearchResults.replaceChildren();

    try {
      const { data, error } = await supabase.functions.invoke("igdb-search", {
        body: { query },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const games = data.results ?? [];

      if (!games.length) {
        igdbSearchError.textContent = "No games found.";
        igdbSearchError.hidden = false;
        return;
      }

      for (const game of games) {
        const button = document.createElement("button");
        button.type = "button";
        button.className =
          "flex w-full items-center gap-4 rounded-lg border border-slate-700 " +
          "bg-slate-900 p-3 text-left transition hover:border-pink-500";

        if (game.cover_url) {
          const cover = document.createElement("img");
          cover.src = game.cover_url;
          cover.alt = "";
          cover.className = "h-20 w-14 shrink-0 rounded object-cover";
          button.append(cover);
        }

        const details = document.createElement("div");

        const title = document.createElement("p");
        title.className = "font-semibold text-white";
        title.textContent = game.title;

        const metadata = document.createElement("p");
        metadata.className = "mt-1 text-xs text-slate-400";
        metadata.textContent = [game.year, game.platforms?.join(", ")]
          .filter(Boolean)
          .join(" • ");

        details.append(title, metadata);
        button.append(details);

        button.addEventListener("click", () => {
          document.getElementById("game-title").value = game.title ?? "";
          document.getElementById("game-year").value = game.year ?? "";
          document.getElementById("game-genre").value =
            game.genres?.join(", ") ?? "";
          document.getElementById("game-developer").value =
            game.developers?.join(", ") ?? "";
          document.getElementById("game-description").value =
            game.description ?? "";

          const coverUrl = game.cover_url ?? "";
          document.getElementById("game-cover").value = coverUrl;

          // Update the cover preview
          if (coverUrl) {
            coverPreview.src = coverUrl;
            coverPreview.hidden = false;
            removeCoverButton.hidden = false;
          } else {
            coverPreview.removeAttribute("src");
            coverPreview.hidden = true;
            removeCoverButton.hidden = true;
          }

          removeCover = false;
          coverFileInput.value = "";

          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
          }

          // Match IGDB platforms with our existing platform options
          const matchingOption = [...platformSelect.options].find((option) =>
            game.platforms?.some(
              (platform) =>
                platform.toLowerCase() ===
                option.textContent.trim().toLowerCase(),
            ),
          );

          if (matchingOption) {
            platformSelect.value = matchingOption.value;
          } else {
            platformSelect.value = "";
          }

          igdbSearchResults.hidden = true;
        });

        igdbSearchResults.append(button);
      }

      igdbSearchResults.hidden = false;
    } catch (error) {
      console.error("IGDB search failed:", error);
      igdbSearchError.textContent = error.message || "Search failed.";
      igdbSearchError.hidden = false;
    } finally {
      igdbSearchButton.disabled = false;
      igdbSearchButton.textContent = "Search";
    }
  }

  igdbSearchButton.addEventListener("click", searchIGDB);

  igdbSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchIGDB();
    }
  });

  let oldCoverUrl = null;
  let removeCover = false;

  if (isEditing) {
    document.querySelector(".page-heading h1").textContent = "Edit Game";
    document.getElementById("save-game").textContent = "Update Game";
  }

  const form = document.getElementById("add-game-form");
  const saveButton = document.getElementById("save-game");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorMessage.hidden = true;
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const title = document.getElementById("game-title").value.trim();
    const platformId = document.getElementById("game-platform").value;
    const seriesId = document.getElementById("game-series").value;
    const year = document.getElementById("game-year").value;
    const genre = document.getElementById("game-genre").value.trim();
    const developer = document.getElementById("game-developer").value.trim();
    const coverUrl = document.getElementById("game-cover").value.trim();
    const description = document
      .getElementById("game-description")
      .value.trim();

    try {
      const gameData = {
        title,
        platform_id: Number(platformId),
        series_id: seriesId ? Number(seriesId) : null,
        release_year: year ? Number(year) : null,
        genre: genre || null,
        developer: developer || null,
        cover_url: coverUrl || null,
        description: description || null,
      };
      if (removeCover) {
        gameData.cover_url = null;
      }

      let result;

      const coverFile = document.getElementById("game-cover-file").files[0];

      if (coverFile) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(coverFile.type)) {
          throw new Error("Only JPG, PNG and WebP images are allowed.");
        }

        if (coverFile.size > 5 * 1024 * 1024) {
          throw new Error("Cover image must be smaller than 5 MB.");
        }

        const extension = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        }[coverFile.type];

        const fileName = `${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("game-covers")
          .upload(fileName, coverFile, {
            contentType: coverFile.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("game-covers")
          .getPublicUrl(fileName);

        gameData.cover_url = publicUrlData.publicUrl;
      }

      if (isEditing) {
        // Update the existing game
        result = await supabase
          .from("games")
          .update(gameData)
          .eq("id", gameId)
          .select("id")
          .single();
      } else {
        // Insert a new game
        result = await supabase
          .from("games")
          .insert(gameData)
          .select("id")
          .single();
      }

      if (result.error) throw result.error;

      // Remove the old uploaded cover only after saving succeeds
      if (isEditing && oldCoverUrl && oldCoverUrl !== gameData.cover_url) {
        try {
          await deleteOldCover(oldCoverUrl);
        } catch (cleanupError) {
          console.warn("Old cover cleanup failed:", cleanupError);
        }
      }

      window.location.hash = "#/admin/games";
    } catch (error) {
      console.error("Failed to save game:", error);

      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = isEditing ? "Update Game" : "Save Game";
    }
  });

  const coverFileInput = document.getElementById("game-cover-file");
  const coverPreview = document.getElementById("game-cover-preview");

  const removeCoverButton = document.getElementById("remove-game-cover");

  removeCoverButton.addEventListener("click", () => {
    removeCover = true;

    coverFileInput.value = "";

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }

    coverPreview.hidden = true;
    coverPreview.removeAttribute("src");
    removeCoverButton.hidden = true;

    document.getElementById("game-cover").value = "";
  });

  let previewUrl = null;

  coverFileInput.addEventListener("change", async () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }

    const file = coverFileInput.files[0];

    if (!file) {
      coverPreview.hidden = true;
      coverPreview.removeAttribute("src");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      await confirmDialog({
        title: "Image Too Large",
        message: "The image must be smaller than 5 MB.",
        alertOnly: true,
      });
      coverFileInput.value = "";
      coverPreview.hidden = true;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      await confirmDialog({
        title: "Invalid Image Format",
        message: "Please select a JPG, PNG or WebP image.",
        alertOnly: true,
      });
      coverFileInput.value = "";
      coverPreview.hidden = true;
      return;
    }

    removeCover = false;

    previewUrl = URL.createObjectURL(file);
    coverPreview.src = previewUrl;
    coverPreview.hidden = false;
    removeCoverButton.hidden = false;
  });

  try {
    const [platforms, series] = await Promise.all([
      getPlatforms(),
      getSeries(),
    ]);

    for (const platform of platforms) {
      const option = document.createElement("option");
      option.value = platform.id;
      option.textContent = platform.name;

      platformSelect.append(option);
    }

    for (const item of series) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;

      seriesSelect.append(option);
    }

    if (isEditing) {
      const { data: game, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (error) throw error;

      oldCoverUrl = game.cover_url;

      document.getElementById("game-title").value = game.title;
      document.getElementById("game-platform").value = game.platform_id;
      document.getElementById("game-series").value = game.series_id ?? "";
      document.getElementById("game-year").value = game.release_year ?? "";
      document.getElementById("game-genre").value = game.genre ?? "";
      document.getElementById("game-developer").value = game.developer ?? "";
      document.getElementById("game-cover").value = game.cover_url ?? "";
      document.getElementById("game-description").value =
        game.description ?? "";

      if (game.cover_url) {
        coverPreview.src = game.cover_url;
        coverPreview.hidden = false;
        removeCoverButton.hidden = false;
      }
    }
  } catch (error) {
    console.error("Failed to load form options:", error);

    errorMessage.textContent = "Failed to load platforms or game series.";
    errorMessage.hidden = false;
  }
}

export async function deleteOldCover(coverUrl) {
  if (!coverUrl) return;

  const bucketPath = "/storage/v1/object/public/game-covers/";

  const url = new URL(coverUrl);
  const pathIndex = url.pathname.indexOf(bucketPath);

  // Never delete images outside our own Storage bucket
  if (url.origin !== new URL(supabase.supabaseUrl).origin || pathIndex === -1) {
    return;
  }

  const filePath = decodeURIComponent(
    url.pathname.slice(pathIndex + bucketPath.length),
  );

  if (!filePath) return;

  const { error } = await supabase.storage
    .from("game-covers")
    .remove([filePath]);

  if (error) throw error;
}
