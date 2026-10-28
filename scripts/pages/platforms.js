import { getPlatforms } from "../api/platforms.js";

export async function initPlatforms() {
  const grid = document.getElementById("platform-grid");
  const count = document.getElementById("platform-count");
  const empty = document.getElementById("platform-empty");

  try {
    const platforms = await getPlatforms();

    count.textContent = `${platforms.length} PLATFORMS`;
    empty.hidden = platforms.length > 0;

    grid.replaceChildren();

    for (const platform of platforms) {
      const card = document.createElement("article");
      card.className = "game-card p-5";

      const manufacturer = document.createElement("p");
      manufacturer.className = "eyebrow";
      manufacturer.textContent = platform.manufacturer || "UNKNOWN";

      const name = document.createElement("h2");
      name.className = "mt-3 text-xl font-bold";
      name.textContent = platform.name;

      const year = document.createElement("p");
      year.className = "mt-2 text-sm text-slate-400";
      year.textContent = platform.release_year
        ? `Released in ${platform.release_year}`
        : "Release year unknown";

      card.append(manufacturer, name, year);
      grid.append(card);
    }
  } catch (error) {
    console.error("Failed to load platforms:", error);
  }
}
