export function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";

  const cover = document.createElement("div");
  cover.className = "cover-area";

  if (game.cover_url) {
    const img = document.createElement("img");
    img.src = game.cover_url;
    img.alt = `${game.title} cover`;
    img.loading = "lazy";
    cover.append(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "cover-placeholder";
    placeholder.innerHTML = "<span>🎮</span><small>NO COVER</small>";
    cover.append(placeholder);
  }

  for (const [value, className] of [
    [game.platform ?? game.platforms?.name, "platform-badge"],
    [game.year ?? game.release_year, "year-badge"],
  ]) {
    if (value !== undefined && value !== null && value !== "") {
      const badge = document.createElement("span");
      badge.className = className;
      badge.textContent = value;
      cover.append(badge);
    }
  }

  const info = document.createElement("div");
  info.className = "card-info";

  const title = document.createElement("h3");
  title.textContent = game.title;

  const genre = document.createElement("p");
  genre.textContent = game.genre || "Game";

  info.append(title, genre);
  card.append(cover, info);

  return card;
}
