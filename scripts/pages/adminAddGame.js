import { getPlatforms } from "../api/platforms.js";
import { getSeries } from "../api/series.js";
import { supabase } from "../supabase.js";

export async function initAdminAddGame(params = new URLSearchParams()) {
  const platformSelect = document.getElementById("game-platform");
  const seriesSelect = document.getElementById("game-series");
  const errorMessage = document.getElementById("add-game-error");
  const gameId = params.get("id");
  const isEditing = gameId !== null;

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

  coverFileInput.addEventListener("change", () => {
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
      alert("Please select a JPG, PNG or WebP image.");
      coverFileInput.value = "";
      coverPreview.hidden = true;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("The image must be smaller than 5 MB.");
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
