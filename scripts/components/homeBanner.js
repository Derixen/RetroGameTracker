import { supabase } from "../supabase.js";
import { confirmDialog } from "./confirmDialog.js";
import { t } from "../i18n.js";

const BUCKET = "user-banners";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function initHomeBanner() {
  const image = document.getElementById("home-banner-image");
  const placeholder = document.getElementById("home-banner-placeholder");
  const uploadButton = document.getElementById("home-banner-upload");
  const removeButton = document.getElementById("home-banner-remove");
  const fileInput = document.getElementById("home-banner-file");
  const bannerContainer = document.getElementById("home-banner-container");
  const sizeButtons = document.querySelectorAll("[data-banner-size]");

  if (!image || !placeholder || !uploadButton || !removeButton || !fileInput) {
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Unable to identify banner owner:", userError);
    return;
  }
  // Banner height preferences
  const BANNER_HEIGHTS = {
    small: "140px",
    medium: "224px",
    large: "360px",
  };

  const bannerSizeStorageKey = `retrotrack-banner-size-${user.id}`;

  function setBannerSize(size) {
    if (!bannerContainer || !BANNER_HEIGHTS[size]) return;

    bannerContainer.style.height = BANNER_HEIGHTS[size];

    sizeButtons.forEach((button) => {
      const selected = button.dataset.bannerSize === size;

      button.setAttribute("aria-pressed", String(selected));

      button.classList.toggle("!bg-pink-500", selected);
      button.classList.toggle("!text-white", selected);
      button.classList.toggle("shadow-sm", selected);
    });

    try {
      localStorage.setItem(bannerSizeStorageKey, size);
    } catch (error) {
      console.warn("Unable to save banner size:", error);
    }
  }

  // Restore saved banner height
  let savedBannerSize = "medium";

  try {
    savedBannerSize = localStorage.getItem(bannerSizeStorageKey) || "medium";
  } catch (error) {
    console.warn("Unable to read banner size:", error);
  }

  setBannerSize(savedBannerSize);

  // Handle size button clicks
  sizeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setBannerSize(button.dataset.bannerSize);
    });
  });
  const folder = `${user.id}/`;
  const storage = supabase.storage.from(BUCKET);
  let currentPath = null;

  async function loadBanner() {
    const { data: files, error } = await storage.list(user.id);

    if (error) throw error;

    const banner = (files || []).find((file) =>
      /^banner\.(jpg|png|webp)$/.test(file.name),
    );

    currentPath = banner ? `${folder}${banner.name}` : null;

    if (!currentPath) {
      image.hidden = true;
      image.removeAttribute("src");
      placeholder.hidden = false;
      removeButton.hidden = true;
      return;
    }

    const { data, error: signedUrlError } = await storage.createSignedUrl(
      currentPath,
      3600,
    );

    if (signedUrlError) throw signedUrlError;

    image.src = data.signedUrl;
    image.hidden = false;
    placeholder.hidden = true;
    removeButton.hidden = false;
  }

  uploadButton.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const extension = EXTENSIONS[file.type];

    if (!extension || file.size > MAX_FILE_SIZE) {
      await confirmDialog({
        title: t("home.banner_invalid_title"),
        message: t("home.banner_invalid_message"),
        alertOnly: true,
      });
      fileInput.value = "";
      return;
    }

    uploadButton.disabled = true;

    try {
      const newPath = `${folder}banner.${extension}`;

      const { error } = await storage.upload(newPath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "60",
      });

      if (error) throw error;

      // Remove the old file if its extension changed.
      if (currentPath && currentPath !== newPath) {
        const { error: cleanupError } = await storage.remove([currentPath]);
        if (cleanupError) {
          console.warn("Unable to remove previous banner:", cleanupError);
        }
      }

      await loadBanner();
    } catch (error) {
      console.error("Banner upload failed:", error);
      await confirmDialog({
        title: t("home.banner_upload_failed"),
        message: error.message,
        alertOnly: true,
      });
    } finally {
      uploadButton.disabled = false;
      fileInput.value = "";
    }
  });

  removeButton.addEventListener("click", async () => {
    if (!currentPath) return;

    const confirmed = await confirmDialog({
      title: t("home.banner_remove_title"),
      message: t("home.banner_remove_message"),
      confirmText: t("home.banner_remove_confirm"),
    });

    if (!confirmed) return;

    removeButton.disabled = true;

    try {
      const { error } = await storage.remove([currentPath]);
      if (error) throw error;

      await loadBanner();
    } catch (error) {
      console.error("Banner removal failed:", error);
      await confirmDialog({
        title: t("home.banner_removal_failed"),
        message: error.message,
        alertOnly: true,
      });
    } finally {
      removeButton.disabled = false;
    }
  });

  try {
    await loadBanner();
  } catch (error) {
    console.error("Failed to load banner:", error);
  }
}
