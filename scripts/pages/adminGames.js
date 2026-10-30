import { getGames } from "../api/games.js";
import { supabase } from "../supabase.js";
import { deleteOldCover } from "./adminAddGame.js";

export async function initAdminGames() {
  const tableBody = document.getElementById("admin-games-list");
  const emptyMessage = document.getElementById("admin-games-empty");
  document.getElementById("admin-add-game").addEventListener("click", () => {
    window.location.hash = "#/admin/add-game";
  });
  try {
    const games = await getGames();

    tableBody.replaceChildren();
    emptyMessage.hidden = games.length > 0;

    for (const game of games) {
      const row = document.createElement("tr");
      row.className = "border-b border-slate-700/50 hover:bg-slate-800/40";

      const columns = [
        game.title,
        game.platforms?.name || "Unknown",
        game.release_year ?? "—",
        game.developer || "—",
      ];

      for (const value of columns) {
        const cell = document.createElement("td");
        cell.className = "px-4 py-4 text-slate-300";
        cell.textContent = value;
        row.append(cell);
      }

      const actionsCell = document.createElement("td");
      actionsCell.className = "px-4 py-4 text-right";

      const editButton = document.createElement("button");
      editButton.className = "mr-3 text-pink-400 hover:text-pink-300";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        window.location.hash = `#/admin/edit-game?id=${game.id}`;
      });

      const deleteButton = document.createElement("button");
      deleteButton.className = "text-red-400 hover:text-red-300";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", async () => {
        const confirmed = window.confirm(
          `Are you sure you want to delete "${game.title}"?\n\nThis action cannot be undone.`,
        );

        if (!confirmed) return;

        deleteButton.disabled = true;
        deleteButton.textContent = "Deleting...";

        try {
          const { data, error } = await supabase
            .from("games")
            .delete()
            .eq("id", game.id)
            .select("id");

          if (error) throw error;

          if (data.length !== 1) {
            throw new Error("Game was not deleted. Check your permissions.");
          }

          if (game.cover_url) {
            try {
              await deleteOldCover(game.cover_url);
            } catch (cleanupError) {
              console.warn(
                "Game deleted, but cover cleanup failed:",
                cleanupError,
              );
            }
          }
          row.remove();

          if (!tableBody.children.length) {
            emptyMessage.hidden = false;
          }
        } catch (error) {
          console.error("Failed to delete game:", error);
          alert(`Failed to delete game: ${error.message}`);

          deleteButton.disabled = false;
          deleteButton.textContent = "Delete";
        }
      });

      actionsCell.append(editButton, deleteButton);
      row.append(actionsCell);

      tableBody.append(row);
    }
  } catch (error) {
    console.error("Failed to load admin games:", error);

    emptyMessage.hidden = false;
    emptyMessage.textContent = "Failed to load games.";
  }
}
