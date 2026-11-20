import { supabase } from "../supabase.js";

export async function initPlatformDetails(params = new URLSearchParams()) {
  const loading = document.getElementById("platform-details-loading");
  const content = document.getElementById("platform-details-content");
  const errorMessage = document.getElementById("platform-details-error");

  const platformId = params.get("id");

  // Validate platform ID
  if (!platformId || !/^\d+$/.test(platformId)) {
    loading.hidden = true;
    errorMessage.textContent = "Invalid platform ID.";
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
      platform.manufacturer || "Unknown manufacturer";

    document.getElementById("platform-detail-maker").textContent =
      platform.manufacturer || "Unknown";

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
          throw new Error("You must be logged in to view your consoles.");
        }

        const { data: models, error } = await supabase
          .from("console_models")
          .select("*")
          .eq("platform_id", platform.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // ==========================================
        // CONSOLE COLLECTION STATISTICS
        // ==========================================

        document.getElementById("console-stat-total").textContent =
          models.length;

        document.getElementById("console-stat-owned").textContent =
          models.filter((model) => model.ownership_status === "owned").length;

        document.getElementById("console-stat-wishlist").textContent =
          models.filter(
            (model) => model.ownership_status === "wishlist",
          ).length;

        document.getElementById("console-stat-previous").textContent =
          models.filter(
            (model) => model.ownership_status === "previously_owned",
          ).length;

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

          details.textContent = [model.model_number, model.condition]
            .filter(Boolean)
            .join(" · ");

          info.append(name, details);

          // ==========================================
          // OWNERSHIP STATUS BADGE
          // ==========================================

          const statusConfig = {
            owned: {
              label: "Owned",
              icon: "check-circle",
              classes:
                "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 " +
                "dark:text-emerald-400",
            },
            wishlist: {
              label: "Wishlist",
              icon: "heart",
              classes:
                "bg-amber-500/10 text-amber-700 border-amber-500/30 " +
                "dark:text-amber-400",
            },
            previously_owned: {
              label: "Previously Owned",
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
            <span>Edit</span>
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
              "Edit Console Model";

            document.getElementById("console-model-save").textContent =
              "Update Console";

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
            <span>Delete</span>
          `;

          deleteButton.addEventListener("click", async () => {
            const confirmed = window.confirm(
              `Are you sure you want to delete "${model.model_name}"?`,
            );

            if (!confirmed) return;

            deleteButton.disabled = true;

            try {
              const {
                data: { user },
                error: authError,
              } = await supabase.auth.getUser();

              if (authError) throw authError;

              if (!user) {
                throw new Error("You must be logged in to delete a console.");
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
                throw new Error("Console not found or permission denied.");
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
                error.message || "Failed to delete console model.";

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
          error.message || "Failed to load console models.";

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

      consoleDialogTitle.textContent = "Add Console Model";

      consoleFormError.textContent = "";
      consoleFormError.hidden = true;
      document.getElementById("console-model-save").textContent =
        "Save Console";
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
      saveButton.textContent = "Saving...";

      try {
        // Get authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          throw new Error("You must be logged in to add a console.");
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
          throw new Error("Model name is required.");
        }

        // ==========================================
        // UPLOAD CONSOLE IMAGE
        // ==========================================

        let uploadedImagePath = null;

        if (imageFile) {
          // Only one image source is allowed
          if (imageUrl) {
            throw new Error(
              "Please choose either an image URL or a file upload.",
            );
          }

          const allowedTypes = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
          };

          const extension = allowedTypes[imageFile.type];

          if (!extension) {
            throw new Error("Only JPG, PNG and WebP images are supported.");
          }

          if (imageFile.size > 5 * 1024 * 1024) {
            throw new Error("Image must be smaller than 5 MB.");
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
          throw new Error("Image URL must begin with https://");
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
          error.message || "Failed to save console model.";

        consoleFormError.hidden = false;
      } finally {
        saveButton.disabled = false;
        saveButton.textContent =
          editingConsoleId !== null ? "Update Console" : "Save Console";
      }
    });

    // Load the user's private console collection
    await loadConsoleModels();

    // ==========================================
    // SHOW PAGE
    // ==========================================

    loading.hidden = true;
    content.hidden = false;

    window.lucide?.createIcons();
  } catch (error) {
    console.error("Failed to load platform details:", error);

    loading.hidden = true;
    errorMessage.textContent = "Failed to load platform details.";
    errorMessage.hidden = false;
  }
}
