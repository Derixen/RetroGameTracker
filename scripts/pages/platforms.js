import { getPlatforms } from "../api/platforms.js";
import { getGames } from "../api/games.js";

export async function initPlatforms() {
  const grid = document.getElementById("platform-grid");
  const count = document.getElementById("platform-count");
  const empty = document.getElementById("platform-empty");

  try {
    const [platforms, games] = await Promise.all([getPlatforms(), getGames()]);

    const gameCounts = {};

    for (const game of games) {
      const platformName = game.platforms?.name;

      if (platformName) {
        gameCounts[platformName] = (gameCounts[platformName] || 0) + 1;
      }
    }

    count.textContent = `${platforms.length} PLATFORMS`;
    empty.hidden = platforms.length > 0;

    grid.replaceChildren();

    for (const platform of platforms) {
      const card = document.createElement("a");
      card.className = "game-card flex items-center gap-5 p-5 cursor-pointer";
      card.href = `#/games?platform=${encodeURIComponent(platform.name)}`;

      // Image container
      const imageContainer = document.createElement("div");
      imageContainer.className =
        "flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl";

      // Placeholder for missing images
      const placeholder = document.createElement("div");
      placeholder.className =
        "flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500";
      placeholder.innerHTML =
        '<span class="text-3xl">🎮</span><span class="text-[10px] font-semibold uppercase tracking-wider">No Image</span>';

      if (platform.image_url) {
        const image = document.createElement("img");
        image.src = platform.image_url;
        image.alt = `${platform.name} console`;
        image.loading = "lazy";
        image.className = "h-full w-full object-contain p-2";

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
      manufacturer.textContent = platform.manufacturer || "UNKNOWN";

      const name = document.createElement("h2");
      name.className = "mt-2 text-xl font-bold";
      name.textContent = platform.name;

      const year = document.createElement("p");
      year.className = "mt-2 text-sm text-slate-400";
      year.textContent = platform.release_year
        ? `Released in ${platform.release_year}`
        : "Release year unknown";

      const gameCount = document.createElement("p");
      gameCount.className = "mt-3 text-sm font-semibold text-pink-400";

      const amount = gameCounts[platform.name] || 0;
      gameCount.textContent = `${amount} ${amount === 1 ? "game" : "games"}`;

      info.append(manufacturer, name, year, gameCount);
      card.append(imageContainer, info);
      grid.append(card);
    }
  } catch (error) {
    console.error("Failed to load platforms:", error);
  }
}
