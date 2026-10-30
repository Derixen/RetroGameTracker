import { supabase } from "../supabase.js";

export async function deletePlatformImage(imageUrl) {
  if (!imageUrl) return;

  const bucketPath = "/storage/v1/object/public/platform-images/";
  const url = new URL(imageUrl);
  const storageOrigin = new URL(supabase.supabaseUrl).origin;

  if (url.origin !== storageOrigin || !url.pathname.startsWith(bucketPath)) {
    return;
  }

  const filePath = decodeURIComponent(url.pathname.slice(bucketPath.length));

  if (!filePath) return;

  const { error } = await supabase.storage
    .from("platform-images")
    .remove([filePath]);

  if (error) throw error;
}

export async function initAdminAddPlatform(params = new URLSearchParams()) {
  const form = document.getElementById("add-platform-form");
  const saveButton = document.getElementById("save-platform");
  const errorMessage = document.getElementById("platform-error");

  const platformId = params.get("id");
  const isEditing = platformId !== null;

  const imageInput = document.getElementById("platform-image-file");
  const imagePreview = document.getElementById("platform-image-preview");
  const removeButton = document.getElementById("remove-platform-image");

  let oldImageUrl = null;
  let previewUrl = null;
  let removeImage = false;

  if (isEditing) {
    document.querySelector(".page-heading h1").textContent = "Edit Platform";
    saveButton.textContent = "Update Platform";
  }

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }

    imagePreview.hidden = true;
    imagePreview.removeAttribute("src");
    removeButton.hidden = true;
  }

  imageInput.addEventListener("change", () => {
    clearPreview();

    const file = imageInput.files[0];

    if (!file) {
      if (!removeImage && oldImageUrl) {
        imagePreview.src = oldImageUrl;
        imagePreview.hidden = false;
        removeButton.hidden = false;
      }
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Please select a JPG, PNG or WebP image.");
      imageInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("The image must be smaller than 5 MB.");
      imageInput.value = "";
      return;
    }

    removeImage = false;
    previewUrl = URL.createObjectURL(file);

    imagePreview.src = previewUrl;
    imagePreview.hidden = false;
    removeButton.hidden = false;
  });

  removeButton.addEventListener("click", () => {
    removeImage = true;
    imageInput.value = "";
    clearPreview();
  });

  if (isEditing) {
    try {
      const { data: platform, error } = await supabase
        .from("platforms")
        .select("*")
        .eq("id", platformId)
        .single();

      if (error) throw error;

      document.getElementById("platform-name").value = platform.name;
      document.getElementById("platform-manufacturer").value =
        platform.manufacturer ?? "";
      document.getElementById("platform-year").value =
        platform.release_year ?? "";

      oldImageUrl = platform.image_url;

      if (oldImageUrl) {
        imagePreview.src = oldImageUrl;
        imagePreview.hidden = false;
        removeButton.hidden = false;
      }
    } catch (error) {
      console.error("Failed to load platform:", error);
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
      saveButton.disabled = true;
      return;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorMessage.hidden = true;
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const name = document.getElementById("platform-name").value.trim();
    const manufacturer = document
      .getElementById("platform-manufacturer")
      .value.trim();
    const year = document.getElementById("platform-year").value;

    let uploadedFilePath = null;
    let databaseSaved = false;

    try {
      if (!name) {
        throw new Error("Platform name is required.");
      }

      const platformData = {
        name,
        manufacturer: manufacturer || null,
        release_year: year ? Number(year) : null,
        image_url: removeImage ? null : oldImageUrl,
      };

      const file = imageInput.files[0];

      if (file) {
        const extensions = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };

        if (!extensions[file.type]) {
          throw new Error("Only JPG, PNG and WebP images are allowed.");
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Image must be smaller than 5 MB.");
        }

        const fileName = `${crypto.randomUUID()}.${extensions[file.type]}`;

        const { error: uploadError } = await supabase.storage
          .from("platform-images")
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        uploadedFilePath = fileName;

        const { data } = supabase.storage
          .from("platform-images")
          .getPublicUrl(fileName);

        platformData.image_url = data.publicUrl;
      }

      let result;

      if (isEditing) {
        result = await supabase
          .from("platforms")
          .update(platformData)
          .eq("id", platformId)
          .select("id")
          .single();
      } else {
        result = await supabase
          .from("platforms")
          .insert(platformData)
          .select("id")
          .single();
      }

      if (result.error) throw result.error;

      databaseSaved = true;

      if (oldImageUrl && oldImageUrl !== platformData.image_url) {
        try {
          await deletePlatformImage(oldImageUrl);
        } catch (cleanupError) {
          console.warn("Old platform image cleanup failed:", cleanupError);
        }
      }

      window.location.hash = "#/admin/platforms";
    } catch (error) {
      console.error("Failed to save platform:", error);

      // Remove a newly uploaded image if the database save failed.
      if (uploadedFilePath && !databaseSaved) {
        const { error: cleanupError } = await supabase.storage
          .from("platform-images")
          .remove([uploadedFilePath]);

        if (cleanupError) {
          console.warn("Upload cleanup failed:", cleanupError);
        }
      }

      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = isEditing ? "Update Platform" : "Save Platform";
    }
  });
}
