import { supabase } from "../supabase.js";

import { getGames } from "../api/games.js";

import { createGameCard } from "../components/gameCard.js";

import { t } from "../i18n.js";

import { confirmDialog } from "../components/confirmDialog.js";

export async function initPlatformDetails(params = new URLSearchParams()) {
  const loading = document.getElementById("platform-details-loading");

  const content = document.getElementById("platform-details-content");

  const errorMessage = document.getElementById("platform-details-error");

  const platformId = params.get("id");

  // Validate platform ID

  if (!platformId || !/^\d+$/.test(platformId)) {
    loading.hidden = true;

    errorMessage.textContent = t("platform_details.error_invalid_platform");

    errorMessage.hidden = false;

    return;
  }

  try {
    // ==========================================

    // LOAD PLATFORM

    // ==========================================

    const { data: platform, error } = await supabase

      .from("platforms")

      .select(
        `

        id,

        name,

        manufacturer,

        release_year,

        image_url

      `,
      )

      .eq("id", platformId)

      .single();

    if (error) throw error;

    // ==========================================

    // PLATFORM INFORMATION

    // ==========================================

    document.getElementById("platform-detail-name").textContent = platform.name;

    document.getElementById("platform-detail-manufacturer").textContent =
      platform.manufacturer || t("platform_details.error_unknown_manufacturer");

    document.getElementById("platform-detail-maker").textContent =
      platform.manufacturer || t("platform_details.unknown");

    document.getElementById("platform-detail-year").textContent =
      platform.release_year ?? "Unknown";

    // ==========================================

    // PLATFORM IMAGE

    // ==========================================

    const image = document.getElementById("platform-detail-image");

    const placeholder = document.getElementById("platform-detail-placeholder");

    if (platform.image_url) {
      image.src = platform.image_url;

      image.hidden = false;

      placeholder.hidden = true;
    } else {
      image.hidden = true;

      placeholder.hidden = false;
    }

    // ==========================================

    // BROWSE GAMES

    // ==========================================

    const browseGames = document.getElementById("platform-detail-games");

    browseGames.href = `#/games?platform=${encodeURIComponent(platform.name)}`;

    // ==========================================

    // CONSOLE MODELS (COMING NEXT)

    // ==========================================

    // Tracks whether we're adding or editing a console

    let editingConsoleId = null;

    let existingConsoleImagePath = null;

    let existingConsoleImageUrl = null;

    // ==========================================

    // LOAD AND DISPLAY CONSOLE MODELS

    // ==========================================

    async function loadConsoleModels() {
      const consoleList = document.getElementById("console-model-list");

      const emptyState = document.getElementById("console-model-empty");

      const consoleError = document.getElementById("console-model-error");

      consoleError.hidden = true;

      try {
        const {
          data: { user },

          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          throw new Error(t("platform_details.error_login_view"));
        }

        const { data: models, error } = await supabase

          .from("console_models")

          .select("*")

          .eq("platform_id", platform.id)

          .eq("user_id", user.id)

          .order("created_at", { ascending: false });

        if (error) throw error;

        consoleList.replaceChildren();

        emptyState.hidden = models.length > 0;

        for (const model of models) {
          const card = document.createElement("div");

          card.className =
            "flex flex-col gap-4 rounded-xl border " +
            "border-slate-500/30 p-4 sm:flex-row sm:items-center";

          // ==========================================

          // CONSOLE IMAGE (URL OR PRIVATE UPLOAD)

          // ==========================================

          let consoleImageUrl = model.image_url;

          // Uploaded images are stored in a private bucket

          if (model.image_path) {
            const { data: signedData, error: signedError } =
              await supabase.storage

                .from("console-images")

                .createSignedUrl(model.image_path, 3600);

            if (signedError) {
              console.warn("Failed to load console image:", signedError);
            } else {
              consoleImageUrl = signedData.signedUrl;
            }
          }

          if (consoleImageUrl) {
            const image = document.createElement("img");

            image.src = consoleImageUrl;

            image.alt = model.model_name;

            image.loading = "lazy";

            image.className =
              "h-32 w-40 shrink-0 rounded-xl object-contain " +
              "bg-slate-100/50 dark:bg-slate-900/30 p-2";

            image.addEventListener("error", () => {
              image.hidden = true;
            });

            card.appendChild(image);
          }

          // Console information

          const info = document.createElement("div");

          info.className = "min-w-0 flex-1";

          const name = document.createElement("h3");

          name.className = "text-lg font-bold";

          name.textContent = model.model_name;

          const details = document.createElement("p");

          details.className = "mt-1 text-sm text-slate-400";

          const conditionKeys = {
            New: "condition_new",

            Excellent: "condition_excellent",

            Good: "condition_good",

            Fair: "condition_fair",

            "For parts": "condition_parts",
          };

          const translatedCondition = model.condition
            ? conditionKeys[model.condition]
              ? t(`platform_details.${conditionKeys[model.condition]}`)
              : model.condition
            : null;

          details.textContent = [model.model_number, translatedCondition]

            .filter(Boolean)

            .join(" · ");

          info.append(name, details);

          // ==========================================

          // OWNERSHIP STATUS BADGE

          // ==========================================

          const statusConfig = {
            owned: {
              label: t("platform_details.owned"),

              icon: "check-circle",

              classes:
                "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 " +
                "dark:text-emerald-400",
            },

            wishlist: {
              label: t("platform_details.wishlist"),

              icon: "heart",

              classes:
                "bg-amber-500/10 text-amber-700 border-amber-500/30 " +
                "dark:text-amber-400",
            },

            previously_owned: {
              label: t("platform_details.previously_owned"),

              icon: "history",

              classes:
                "bg-slate-500/10 text-slate-600 border-slate-500/30 " +
                "dark:text-slate-300",
            },
          };

          const status = statusConfig[model.ownership_status];

          if (status) {
            const badge = document.createElement("span");

            badge.className =
              "mt-2 inline-flex items-center gap-1.5 rounded-full " +
              "border px-2.5 py-1 text-xs font-medium " +
              status.classes;

            badge.innerHTML = `

              <i data-lucide="${status.icon}" class="h-3.5 w-3.5"></i>

              ${status.label}

            `;

            info.appendChild(badge);
          }

          // Personal notes

          if (model.notes) {
            const notes = document.createElement("p");

            notes.className = "mt-2 whitespace-pre-line text-sm";

            notes.textContent = model.notes;

            info.appendChild(notes);
          }

          card.appendChild(info);

          // ==========================================

          // EDIT CONSOLE BUTTON

          // ==========================================

          const editButton = document.createElement("button");

          editButton.type = "button";

          editButton.className =
            "btn-secondary inline-flex items-center gap-2 px-3 py-2 text-sm";

          editButton.innerHTML = `

            <i data-lucide="pencil" class="h-4 w-4"></i>

            <span>${t("platform_details.edit")}</span>

          `;

          editButton.addEventListener("click", () => {
            editingConsoleId = model.id;

            document.getElementById("console-model-name").value =
              model.model_name;

            document.getElementById("console-model-number").value =
              model.model_number || "";

            document.getElementById("console-model-status").value =
              model.ownership_status;

            document.getElementById("console-model-condition").value =
              model.condition || "";

            document.getElementById("console-model-image-url").value =
              model.image_url || "";

            document.getElementById("console-model-notes").value =
              model.notes || "";

            document.getElementById("console-model-image-file").value = "";

            document.getElementById("console-model-dialog-title").textContent =
              t("platform_details.dialog_edit_title");

            document.getElementById("console-model-save").textContent = t(
              "platform_details.update_console",
            );

            document.getElementById("console-model-form-error").hidden = true;

            document.getElementById("console-model-dialog").showModal();
          });

          const actions = document.createElement("div");

          actions.className =
            "flex shrink-0 items-center gap-2 " +
            "border-t border-slate-500/20 pt-3 " +
            "sm:ml-auto sm:border-t-0 sm:pt-0";

          actions.appendChild(editButton);

          // ==========================================

          // DELETE CONSOLE BUTTON

          // ==========================================

          const deleteButton = document.createElement("button");

          deleteButton.type = "button";

          deleteButton.className =
            "btn-secondary inline-flex items-center gap-2 px-3 py-2 text-sm";

          deleteButton.innerHTML = `

            <i data-lucide="trash-2" class="h-4 w-4"></i>

            <span>${t("platform_details.delete")}</span>

          `;

          deleteButton.addEventListener("click", async () => {
            const confirmed = await confirmDialog({
              title: t("platform_details.delete_console_title"),

              message: `${t("platform_details.delete_console_message")}\n\n${model.model_name}`,

              confirmText: t("platform_details.delete_console_confirm"),
            });

            if (!confirmed) return;

            deleteButton.disabled = true;

            try {
              const {
                data: { user },

                error: authError,
              } = await supabase.auth.getUser();

              if (authError) throw authError;

              if (!user) {
                throw new Error(t("platform_details.error_login_delete"));
              }

              const { data: deletedModels, error: deleteError } = await supabase

                .from("console_models")

                .delete()

                .eq("id", model.id)

                .eq("platform_id", platform.id)

                .eq("user_id", user.id)

                .select("id");

              if (deleteError) throw deleteError;

              if (!deletedModels?.length) {
                throw new Error(t("platform_details.error_console_not_found"));
              }

              // ==========================================

              // REMOVE UPLOADED CONSOLE IMAGE

              // ==========================================

              // Only remove files uploaded to our private bucket.

              // External image URLs must never be deleted.

              if (model.image_path) {
                const { error: storageError } = await supabase.storage

                  .from("console-images")

                  .remove([model.image_path]);

                if (storageError) {
                  // Database deletion already succeeded.

                  // Do not report the entire operation as failed.

                  console.warn(
                    "Console deleted, but image cleanup failed:",

                    storageError,
                  );
                }
              }

              // Refresh the user's console collection

              await loadConsoleModels();
            } catch (error) {
              console.error("Failed to delete console model:", error);

              const consoleError = document.getElementById(
                "console-model-error",
              );

              consoleError.textContent =
                error.message || t("platform_details.error_delete_console");

              consoleError.hidden = false;
            } finally {
              deleteButton.disabled = false;
            }
          });

          actions.appendChild(deleteButton);

          card.appendChild(actions);

          consoleList.appendChild(card);
        }

        window.lucide?.createIcons();
      } catch (error) {
        console.error("Failed to load console models:", error);

        consoleError.textContent =
          error.message || t("platform_details.error_load_consoles");

        consoleError.hidden = false;
      }
    }

    // ==========================================

    // CONSOLE MODEL DIALOG

    // ==========================================

    const addConsoleButton = document.getElementById("console-model-add");

    const consoleDialog = document.getElementById("console-model-dialog");

    const consoleForm = document.getElementById("console-model-form");

    const cancelConsoleButton = document.getElementById("console-model-cancel");

    const consoleDialogTitle = document.getElementById(
      "console-model-dialog-title",
    );

    const consoleFormError = document.getElementById(
      "console-model-form-error",
    );

    // Enable Add Console

    addConsoleButton.disabled = false;

    // Open dialog

    addConsoleButton.addEventListener("click", () => {
      consoleForm.reset();

      editingConsoleId = null;

      existingConsoleImagePath = null;

      existingConsoleImageUrl = null;

      consoleDialogTitle.textContent = t("platform_details.dialog_add_title");

      consoleFormError.textContent = "";

      consoleFormError.hidden = true;

      document.getElementById("console-model-save").textContent = t(
        "platform_details.save_console",
      );

      consoleDialog.showModal();
    });

    // Cancel dialog

    cancelConsoleButton.addEventListener("click", () => {
      consoleDialog.close();
    });

    // Close dialog when clicking outside

    consoleDialog.addEventListener("click", (event) => {
      if (event.target === consoleDialog) {
        consoleDialog.close();
      }
    });

    // ==========================================

    // SAVE CONSOLE MODEL TO SUPABASE

    // ==========================================

    consoleForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const saveButton = document.getElementById("console-model-save");

      consoleFormError.textContent = "";

      consoleFormError.hidden = true;

      // Prevent duplicate submissions

      saveButton.disabled = true;

      saveButton.textContent = t("platform_details.saving");

      let uploadedImagePath = null;

      try {
        // Get authenticated user

        const {
          data: { user },

          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          throw new Error(t("platform_details.error_login_add"));
        }

        // Read form values

        const modelName = document

          .getElementById("console-model-name")

          .value.trim();

        const modelNumber = document

          .getElementById("console-model-number")

          .value.trim();

        const ownershipStatus = document.getElementById(
          "console-model-status",
        ).value;

        const condition = document.getElementById(
          "console-model-condition",
        ).value;

        const imageUrl = document

          .getElementById("console-model-image-url")

          .value.trim();

        const notes = document

          .getElementById("console-model-notes")

          .value.trim();

        const imageFile = document.getElementById("console-model-image-file")
          .files[0];

        // Validate model name

        if (!modelName) {
          // Model name

          throw new Error(t("platform_details.error_model_name"));
        }

        // ==========================================

        // UPLOAD CONSOLE IMAGE

        // ==========================================

        if (imageFile) {
          // Only one image source is allowed

          if (imageUrl) {
            // Image URL and upload selected together

            throw new Error(t("platform_details.error_image_source"));
          }

          const allowedTypes = {
            "image/jpeg": "jpg",

            "image/png": "png",

            "image/webp": "webp",
          };

          const extension = allowedTypes[imageFile.type];

          if (!extension) {
            // Unsupported image format

            throw new Error(t("platform_details.error_image_type"));
          }

          if (imageFile.size > 5 * 1024 * 1024) {
            // Image larger than 5 MB

            throw new Error(t("platform_details.error_image_size"));
          }

          // Every user gets their own private folder

          uploadedImagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

          const { error: uploadError } = await supabase.storage

            .from("console-images")

            .upload(uploadedImagePath, imageFile, {
              contentType: imageFile.type,

              upsert: false,
            });

          if (uploadError) throw uploadError;
        }

        // Validate optional image URL

        if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
          // Invalid image URL

          throw new Error(t("platform_details.error_image_url"));
        }

        // Prepare database record

        const consoleModel = {
          platform_id: platform.id,

          user_id: user.id,

          model_name: modelName,

          model_number: modelNumber || null,

          ownership_status: ownershipStatus,

          condition: condition || null,

          image_url: uploadedImagePath
            ? null
            : imageUrl ||
              (existingConsoleImagePath ? null : existingConsoleImageUrl),

          image_path: uploadedImagePath
            ? uploadedImagePath
            : imageUrl
              ? null
              : existingConsoleImagePath,

          notes: notes || null,
        };

        // ==========================================

        // INSERT OR UPDATE CONSOLE MODEL

        // ==========================================

        if (editingConsoleId !== null) {
          // Update existing console

          const { error: updateError } = await supabase

            .from("console_models")

            .update(consoleModel)

            .eq("id", editingConsoleId)

            .eq("user_id", user.id)

            .eq("platform_id", platform.id);

          if (updateError) throw updateError;
        } else {
          // Insert new console

          const { error: insertError } = await supabase

            .from("console_models")

            .insert(consoleModel);

          if (insertError) throw insertError;
        }

        // ==========================================

        // CLEAN UP REPLACED IMAGE

        // ==========================================

        if (
          editingConsoleId !== null &&
          existingConsoleImagePath &&
          (uploadedImagePath || imageUrl)
        ) {
          const { error: cleanupError } = await supabase.storage

            .from("console-images")

            .remove([existingConsoleImagePath]);

          if (cleanupError) {
            // The database is already saved.

            // Don't treat cleanup failure as a failed save.

            console.warn(
              "Could not remove previous console image:",

              cleanupError,
            );
          }
        }

        // Success

        consoleDialog.close();

        consoleForm.reset();

        editingConsoleId = null;

        existingConsoleImagePath = null;

        existingConsoleImageUrl = null;

        console.log("Console model saved successfully.");

        await loadConsoleModels();
      } catch (error) {
        // Remove a newly uploaded file if saving failed

        if (uploadedImagePath) {
          const { error: cleanupError } = await supabase.storage

            .from("console-images")

            .remove([uploadedImagePath]);

          if (cleanupError) {
            console.warn("Could not clean up failed upload:", cleanupError);
          }
        }

        console.error("Failed to save console model:", error);

        consoleFormError.textContent =
          error.message || t("platform_details.error_save_console");

        consoleFormError.hidden = false;
      } finally {
        saveButton.disabled = false;

        saveButton.textContent =
          editingConsoleId !== null
            ? t("platform_details.update_console")
            : t("platform_details.save_console");
      }
    });

    // Load the user's private console collection

    await loadConsoleModels();

    // ==========================================

    // LOAD GAMES FOR THIS PLATFORM

    // ==========================================

    async function loadPlatformGames() {
      const gamesList = document.getElementById("platform-games-list");

      const gamesLoading = document.getElementById("platform-games-loading");

      const gamesEmpty = document.getElementById("platform-games-empty");

      const gamesError = document.getElementById("platform-games-error");

      const browseButton = document.getElementById("platform-games-browse");

      gamesLoading.hidden = false;

      gamesEmpty.hidden = true;

      gamesError.hidden = true;

      browseButton.href = `#/games?platform=${encodeURIComponent(platform.name)}`;

      try {
        // Reuse the same API as the main Games page

        const games = await getGames();

        // Match games belonging to the selected platform

        const platformGames = games.filter(
          (game) => game.platforms?.name === platform.name,
        );

        gamesList.replaceChildren();

        for (const game of platformGames) {
          const cardData = {
            ...game,

            platform: game.platforms?.name,

            year: game.release_year,
          };

          gamesList.appendChild(createGameCard(cardData));
        }

        gamesEmpty.hidden = platformGames.length > 0;

        window.lucide?.createIcons();
      } catch (error) {
        console.error("Failed to load platform games:", error);

        gamesError.textContent =
          error.message || t("platform_details.error_load_games");

        gamesError.hidden = false;
      } finally {
        gamesLoading.hidden = true;
      }
    }

    await loadPlatformGames();

    // ==========================================

    // SHOW PAGE

    // ==========================================

    loading.hidden = true;

    content.hidden = false;

    window.lucide?.createIcons();
  } catch (error) {
    console.error("Failed to load platform details:", error);

    loading.hidden = true;

    errorMessage.textContent = t("platform_details.error_load_platform");

    errorMessage.hidden = false;
  }
}
