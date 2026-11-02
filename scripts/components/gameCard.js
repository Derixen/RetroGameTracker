export function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card flex flex-col";

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
  info.className = "card-info flex flex-1 flex-col";

  const title = document.createElement("h3");
  title.textContent = game.title;

  const genre = document.createElement("p");
  genre.textContent = game.genre || "Game";

  const status = document.createElement("div");
  status.className = "flex items-center justify-center mt-auto pt-3";

  if (game.favorite) {
    const favorite = document.createElement("span");
    favorite.className = "platform-badge";
    favorite.style.cssText =
      "top: auto; left: auto; bottom: 10px; right: 9px; opacity: 0.8";
    favorite.textContent = "♥ FAV ♥";
    favorite.title = "Favorite";

    cover.append(favorite);
  }

  if (game.completed) {
    const completed = document.createElement("span");
    completed.className = "text-green-400 text-sm font-semibold";
    completed.textContent = "✓ Completed";
    status.append(completed);
  } else if (game.in_progress) {
    const inProgress = document.createElement("span");
    inProgress.className = "text-amber-400 text-sm font-semibold";
    inProgress.textContent = "◷ In Progress";
    status.append(inProgress);
  } else {
    const notPlayed = document.createElement("span");
    notPlayed.className = "text-slate-400 text-sm font-semibold";
    notPlayed.textContent = "";
    status.append(notPlayed);
  }

  info.append(title, genre);

  if (status.children.length > 0) {
    info.append(status);
  }
  card.append(cover, info);

  card.classList.add(
    "cursor-pointer",
    "transition",
    "hover:border-pink-500/50",
  );

  card.addEventListener("click", (event) => {
    // Don't override links or buttons inside the card
    if (event.target.closest("a, button")) return;

    if (window.location.hash.startsWith("#/games")) {
      sessionStorage.setItem("gameDetailsReturnUrl", window.location.hash);
    }

    window.location.hash = `#/game?id=${game.id}`;
  });

  card.tabIndex = 0;
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", `View details for ${game.title}`);

  card.addEventListener("keydown", (event) => {
    if (event.target !== card) return;

    if (event.key === "Enter") {
      window.location.hash = `#/game?id=${game.id}`;
    }
  });

  return card;
}
