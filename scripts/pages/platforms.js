import { getPlatforms } from "../api/platforms.js";

import { getGames } from "../api/games.js";

import { confirmDialog } from "../components/confirmDialog.js";
import { t } from "../i18n.js";

export async function initPlatforms() {
  const grid = document.getElementById("platform-grid");

  const count = document.getElementById("platform-count");

  const empty = document.getElementById("platform-empty");

  const searchInput = document.getElementById("platform-search");

  const addButton = document.getElementById("platform-add-button");

  const addDialog = document.getElementById("platform-add-dialog");

  const addSelect = document.getElementById("platform-add-select");

  const addCancel = document.getElementById("platform-add-cancel");

  const addSave = document.getElementById("platform-add-save");

  const addError = document.getElementById("platform-add-error");

  try {
    const [platforms, games] = await Promise.all([getPlatforms(), getGames()]);

    // ==========================================

    // ADD PLATFORM DIALOG

    // ==========================================

    const { supabase } = await import("../supabase.js");

    const {
      data: { user },

      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) throw new Error(t("platforms.error_sign_in"));

    const { data: userPlatforms, error: userPlatformsError } = await supabase

      .from("user_platforms")

      .select("platform_id")

      .eq("user_id", user.id);

    if (userPlatformsError) throw userPlatformsError;

    const manuallyAddedIds = new Set(
      (userPlatforms || []).map((item) => String(item.platform_id)),
    );

    addButton.onclick = () => {
      addError.hidden = true;

      addError.textContent = "";

      addSelect.replaceChildren(new Option(t("platforms.select_platform"), ""));

      const availablePlatforms = platforms

        .filter((platform) => !manuallyAddedIds.has(String(platform.id)))

        .sort((a, b) => a.name.localeCompare(b.name));

      for (const platform of availablePlatforms) {
        addSelect.add(new Option(platform.name, String(platform.id)));
      }

      addDialog.showModal();
    };

    addCancel.onclick = () => {
      addDialog.close();
    };

    addSave.onclick = async () => {
      const platformId = addSelect.value;

      addError.hidden = true;

      addError.textContent = "";

      if (!platformId) {
        addError.textContent = t("platforms.error_select_platform");

        addError.hidden = false;

        return;
      }

      try {
        addSave.disabled = true;

        addSave.textContent = t("platforms.adding");

        const { error } = await supabase.from("user_platforms").insert({
          user_id: user.id,

          platform_id: Number(platformId),
        });

        if (error) throw error;

        // Prevent adding the same platform twice

        manuallyAddedIds.add(String(platformId));

        addDialog.close();

        // Refresh the Platforms page

        await initPlatforms();
      } catch (error) {
        console.error("Failed to add platform:", error);

        addError.textContent =
          error.message || t("platforms.error_add_platform");

        addError.hidden = false;
      } finally {
        addSave.disabled = false;

        addSave.textContent = t("platforms.add_platform");
      }
    };

    const gameCounts = {};

    for (const game of games) {
      const platformName = game.platforms?.name;

      if (platformName) {
        gameCounts[platformName] = (gameCounts[platformName] || 0) + 1;
      }
    }

    // ==========================================

    // PERSONAL PLATFORM VISIBILITY

    // ==========================================

    // A platform is visible when:

    // 1. The user has at least one game for it.

    // 2. The user manually added it to their collection.

    const visiblePlatforms = platforms.filter((platform) => {
      const hasGames = (gameCounts[platform.name] || 0) > 0;

      const manuallyAdded = manuallyAddedIds.has(String(platform.id));

      return hasGames || manuallyAdded;
    });

    count.textContent = `${visiblePlatforms.length} ${t("platforms.platform_count")}`;

    empty.hidden = visiblePlatforms.length > 0;

    grid.replaceChildren();

    for (const platform of visiblePlatforms) {
      const card = document.createElement("div");

      card.className = "game-card flex items-center gap-5 p-5 cursor-pointer";

      card.setAttribute("role", "link");

      card.setAttribute("tabindex", "0");

      const platformUrl = `#/platform?id=${platform.id}`;

      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;

        window.location.hash = platformUrl;
      });

      card.addEventListener("keydown", (event) => {
        if (event.target !== card) return;

        if (event.key === "Enter") {
          window.location.hash = platformUrl;
        }
      });

      // Image container

      const imageContainer = document.createElement("div");

      imageContainer.className =
        "flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl";

      // Placeholder for missing images

      const placeholder = document.createElement("div");

      placeholder.className =
        "flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500";

      placeholder.innerHTML = `<span class="text-3xl">🎮</span><span class="text-[10px] font-semibold uppercase tracking-wider">${t("platforms.no_image")}</span>`;

      if (platform.image_url) {
        const image = document.createElement("img");

        image.src = platform.image_url;

        image.alt = `${platform.name} console`;

        image.loading = "lazy";

        image.className = "h-full w-full object-contain";

        image.onerror = () => {
          image.replaceWith(placeholder);
        };

        imageContainer.append(image);
      } else {
        imageContainer.append(placeholder);
      }

      // Platform information

      const info = document.createElement("div");

      info.className = "min-w-0 flex-1";

      const manufacturer = document.createElement("p");

      manufacturer.className = "eyebrow";

      manufacturer.textContent =
        platform.manufacturer || t("platforms.unknown_manufacturer");

      const name = document.createElement("h2");

      name.className = "mt-2 text-xl font-bold";

      name.textContent = platform.name;

      const year = document.createElement("p");

      year.className = "mt-2 text-sm text-slate-400";

      year.textContent = platform.release_year
        ? `${t("platforms.released_in")} ${platform.release_year}`
        : t("platforms.release_year_unknown");

      const gameCount = document.createElement("p");

      gameCount.className = "mt-3 text-sm font-semibold text-pink-400";

      const amount = gameCounts[platform.name] || 0;

      gameCount.textContent = `${amount} ${t(amount === 1 ? "platforms.game_singular" : "platforms.game_plural")}`;

      info.append(manufacturer, name, year, gameCount);

      card.append(imageContainer, info);

      // ==========================================

      // REMOVE MANUALLY ADDED PLATFORM

      // ==========================================

      if (manuallyAddedIds.has(String(platform.id))) {
        const removeButton = document.createElement("button");

        removeButton.type = "button";

        removeButton.title = t("platforms.remove_tooltip");

        removeButton.setAttribute(
          "aria-label",

          `${t("platforms.remove_tooltip")} ${platform.name}`,
        );

        removeButton.className =
          "ml-auto self-start rounded-lg border border-red-500/30 " +
          "p-2 text-red-400 transition-colors " +
          "hover:border-red-500 hover:bg-red-500/10";

        removeButton.innerHTML =
          '<i data-lucide="trash-2" class="h-4 w-4"></i>';

        removeButton.addEventListener("click", async (event) => {
          event.preventDefault();

          event.stopPropagation();

          const confirmed = await confirmDialog({
            title: t("platforms.remove_title"),

            message: `${t("platforms.remove_message_before")} ${platform.name}${t("platforms.remove_message_after")}`,

            confirmText: t("platforms.remove"),

            cancelText: t("confirm_dialog.cancel"),
          });

          if (!confirmed) return;

          try {
            removeButton.disabled = true;

            const { error } = await supabase

              .from("user_platforms")

              .delete()

              .eq("user_id", user.id)

              .eq("platform_id", platform.id);

            if (error) throw error;

            manuallyAddedIds.delete(String(platform.id));

            await initPlatforms();
          } catch (error) {
            console.error("Failed to remove platform:", error);

            await confirmDialog({
              title: t("platforms.remove_error_title"),
              message: t("platforms.remove_error"),
              alertOnly: true,
            });

            removeButton.disabled = false;
          }
        });

        card.appendChild(removeButton);
      }

      grid.append(card);

      window.lucide?.createIcons();
    }

    // ==========================================

    // PLATFORM SEARCH

    // ==========================================

    function filterPlatforms() {
      const query = searchInput.value.trim().toLowerCase();

      let visibleCount = 0;

      for (const card of grid.children) {
        const platformName =
          card.querySelector("h2")?.textContent.toLowerCase() || "";

        const manufacturerName =
          card.querySelector(".eyebrow")?.textContent.toLowerCase() || "";

        const matches =
          platformName.includes(query) || manufacturerName.includes(query);

        card.hidden = !matches;

        if (matches) visibleCount++;
      }

      empty.hidden = visibleCount > 0;
    }

    searchInput.oninput = filterPlatforms;
  } catch (error) {
    console.error("Failed to load platforms:", error);
  }
}
