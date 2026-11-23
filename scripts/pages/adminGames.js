import { getGames } from "../api/games.js";
import { supabase } from "../supabase.js";
import { deleteOldCover } from "./adminAddGame.js";
import { confirmDialog } from "../components/confirmDialog.js";
import { t } from "../i18n.js";

export async function initAdminGames() {
  const tableBody = document.getElementById("admin-games-list");
  const emptyMessage = document.getElementById("admin-games-empty");

  document.getElementById("admin-add-game").addEventListener("click", () => {
    window.location.hash = "#/admin/add-game";
  });

  try {
    const games = await getGames();

    let sortColumn = "title";
    let sortDirection = "asc";

    function sortGames() {
      games.sort((a, b) => {
        let valueA;
        let valueB;

        switch (sortColumn) {
          case "platform":
            valueA = a.platforms?.name || "";
            valueB = b.platforms?.name || "";
            break;

          case "year":
            valueA = a.release_year;
            valueB = b.release_year;

            // Keep unknown years at the bottom.
            if (valueA == null) return valueB == null ? 0 : 1;
            if (valueB == null) return -1;

            return sortDirection === "asc" ? valueA - valueB : valueB - valueA;

          default:
            valueA = a[sortColumn] || "";
            valueB = b[sortColumn] || "";
        }

        const result = String(valueA).localeCompare(String(valueB), undefined, {
          sensitivity: "base",
        });

        return sortDirection === "asc" ? result : -result;
      });
    }

    document.querySelectorAll("[data-sort]").forEach((header) => {
      header.addEventListener("click", () => {
        const column = header.dataset.sort;

        if (sortColumn === column) {
          sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
          sortColumn = column;
          sortDirection = "asc";
        }

        sortGames();
        renderGames();
      });
    });

    tableBody.replaceChildren();
    emptyMessage.hidden = games.length > 0;

    function renderGames() {
      tableBody.replaceChildren();

      for (const game of games) {
        const row = document.createElement("tr");

        const columns = [
          game.title,
          game.platforms?.name || "Unknown",
          game.release_year ?? "—",
          game.developer || "—",
        ];

        for (const value of columns) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }

        const actionsCell = document.createElement("td");
        actionsCell.className = "w-56 text-right";

        const actions = document.createElement("div");
        actions.className =
          "flex items-center justify-end gap-2 whitespace-nowrap";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "admin-action-button admin-action-edit";
        editButton.textContent = t("common.edit");

        editButton.addEventListener("click", () => {
          window.location.hash = `#/admin/edit-game?id=${game.id}`;
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "admin-action-button admin-action-delete";
        deleteButton.textContent = t("common.delete");

        deleteButton.addEventListener("click", async () => {
          const confirmed = await confirmDialog({
            title: "Delete Game?",
            message: `Are you sure you want to delete "${game.title}"?\n\nThis will also delete its completion history. This action cannot be undone.`,
            confirmText: "Delete Game",
          });

          if (!confirmed) return;

          deleteButton.disabled = true;
          deleteButton.textContent = t("common.deleting");

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

            await confirmDialog({
              title: "Failed to delete game",
              message: error.message,
              alertOnly: true,
            });

            deleteButton.disabled = false;
            deleteButton.textContent = t("common.delete");
          }
        });

        actions.append(editButton, deleteButton);
        actionsCell.append(actions);
        row.append(actionsCell);

        tableBody.append(row);
      }
    }

    sortGames();
    renderGames();
  } catch (error) {
    console.error("Failed to load admin games:", error);

    emptyMessage.hidden = false;
    emptyMessage.textContent = "Failed to load games.";
  }
}
