import { getGames } from "../api/games.js";
import { createGameCard } from "../components/gameCard.js";

export async function initHome() {
  const controller = new AbortController();
  const signal = controller.signal;

  let recommendationInterval = null;

  const totalGames = document.getElementById("total-games");
  const totalCompleted = document.getElementById("total-completed");
  const totalInProgress = document.getElementById("total-in-progress");

  try {
    const games = await getGames();

    const soundtrackGames = games.filter((game) => game.music_url?.trim());

    const soundtrackSection = document.getElementById(
      "home-soundtrack-section",
    );

    if (soundtrackGames.length > 0) {
      soundtrackSection.hidden = false;

      const title = document.getElementById("home-soundtrack-title");
      const platform = document.getElementById("home-soundtrack-platform");
      const player = document.getElementById("home-soundtrack-player");
      const shuffle = document.getElementById("home-soundtrack-shuffle");

      let currentGameId = null;

      function showSoundtrack() {
        const choices = soundtrackGames.filter(
          (game) => game.id !== currentGameId,
        );

        const pool = choices.length ? choices : soundtrackGames;
        const game = pool[Math.floor(Math.random() * pool.length)];

        currentGameId = game.id;

        title.textContent = game.title;
        platform.textContent = game.platforms?.name || "Unknown Platform";

        player.replaceChildren();

        // Support YouTube video and playlist links
        try {
          const url = new URL(game.music_url);
          let videoId = null;

          if (
            ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
              url.hostname,
            )
          ) {
            videoId = url.searchParams.get("v");

            if (
              url.pathname.startsWith("/shorts/") ||
              url.pathname.startsWith("/embed/")
            ) {
              videoId = url.pathname.split("/")[2];
            }
          } else if (url.hostname === "youtu.be") {
            videoId = url.pathname.slice(1);
          }

          const playlistId = url.searchParams.get("list");

          if (videoId || playlistId) {
            const iframe = document.createElement("iframe");

            iframe.src = videoId
              ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
              : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`;

            iframe.className = "w-full aspect-video rounded-lg";
            iframe.title = `${game.title} soundtrack`;
            iframe.allow =
              "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
            iframe.allowFullscreen = true;
            iframe.loading = "lazy";

            player.append(iframe);
            return;
          }
        } catch (error) {
          console.warn("Invalid soundtrack URL:", game.music_url);
        }

        // Fallback for other music links
        const link = document.createElement("a");
        link.href = game.music_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "text-pink-400 hover:underline";
        link.textContent = "🎵 Open Soundtrack";

        player.append(link);
      }

      shuffle.addEventListener("click", showSoundtrack);
      showSoundtrack();
    }

    // Recommend games that haven't been completed
    const recommendations = games.filter((game) => !game.completed);

    const cover = document.getElementById("recommendation-cover");
    const title = document.getElementById("recommendation-title");
    const platform = document.getElementById("recommendation-platform");
    const description = document.getElementById("recommendation-description");
    const shuffleButton = document.getElementById("recommendation-shuffle");
    const detailsButton = document.getElementById("recommendation-details");

    let currentRecommendationId = null;

    function showRecommendation() {
      if (!recommendations.length) {
        title.textContent = "You've completed every game!";
        platform.textContent = "";
        description.textContent =
          "Add more games to discover your next adventure.";
        cover.hidden = true;
        detailsButton.hidden = true;
        shuffleButton.hidden = true;
        return;
      }

      // Avoid recommending the same game twice in a row
      const choices = recommendations.filter(
        (game) => game.id !== currentRecommendationId,
      );

      const pool = choices.length ? choices : recommendations;
      const game = pool[Math.floor(Math.random() * pool.length)];

      currentRecommendationId = game.id;

      title.textContent = game.title;
      platform.textContent = game.platforms?.name || "Unknown Platform";

      description.textContent = game.in_progress
        ? "You're already playing this one. Ready to continue?"
        : "This adventure is waiting to be discovered!";

      cover.hidden = !game.cover_url;

      if (game.cover_url) {
        cover.src = game.cover_url;
        cover.alt = `${game.title} cover`;
      }

      detailsButton.hidden = false;
      detailsButton.href = `#/game?id=${encodeURIComponent(game.id)}`;
    }

    shuffleButton.addEventListener("click", showRecommendation);

    showRecommendation();

    // Automatically recommend another game every 10 seconds
    recommendationInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        showRecommendation();
      }
    }, 10000);

    showRecommendation();

    // Total number of games
    totalGames.textContent = games.length;

    const completed = games.filter((game) => game.completed).length;

    const inProgress = games.filter(
      (game) => game.in_progress && !game.completed,
    ).length;

    totalCompleted.textContent = completed;
    totalInProgress.textContent = inProgress;

    const distribution = document.getElementById("platform-distribution");

    // Count games for each platform
    const platformCounts = {};

    for (const game of games) {
      const platform = game.platforms?.name || "Unknown";
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }

    // Sort platforms by number of games
    const sortedPlatforms = Object.entries(platformCounts).sort(
      (a, b) => b[1] - a[1],
    );

    distribution.replaceChildren();

    for (const [platform, amount] of sortedPlatforms) {
      const percentage = games.length ? (amount / games.length) * 100 : 0;

      const item = document.createElement("a");

      item.href = `#/games?platform=${encodeURIComponent(platform)}`;
      item.className = "block cursor-pointer group";
      item.setAttribute("aria-label", `View ${platform} games`);

      const header = document.createElement("div");
      header.className =
        "flex justify-between text-sm mb-2 transition-colors group-hover:text-pink-400";

      const name = document.createElement("span");
      name.textContent = platform;

      const count = document.createElement("span");
      count.textContent = `${amount} games (${percentage.toFixed(0)}%)`;

      header.append(name, count);

      const track = document.createElement("div");
      track.className = "h-2 rounded-full bg-slate-700 overflow-hidden";

      const bar = document.createElement("div");
      bar.className = "h-full rounded-full bg-pink-500";
      bar.style.width = `${percentage}%`;

      track.append(bar);
      item.append(header, track);
      distribution.append(item);
    }

    const recentGames = document.getElementById("recent-games");

    // Sort by date added, newest first
    const latestGames = [...games]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 4);

    for (const game of latestGames) {
      recentGames.append(createGameCard(game));
    }
  } catch (error) {
    console.error("Failed to load dashboard statistics:", error);
  }

  return () => {
    controller.abort();
    clearInterval(recommendationInterval);
  };
}
