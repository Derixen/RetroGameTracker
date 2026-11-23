import { getSeries } from "../api/series.js";
import { supabase } from "../supabase.js";
import { confirmDialog } from "../components/confirmDialog.js";
import { t } from "../i18n.js";

export async function initAdminSeries() {
  const tableBody = document.getElementById("admin-series-list");
  const emptyMessage = document.getElementById("admin-series-empty");

  document.getElementById("admin-add-series").addEventListener("click", () => {
    window.location.hash = "#/admin/add-series";
  });

  try {
    const series = await getSeries();

    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("series_id");

    if (gamesError) throw gamesError;

    const gameCounts = new Map();

    for (const game of games) {
      if (game.series_id === null) continue;

      gameCounts.set(game.series_id, (gameCounts.get(game.series_id) ?? 0) + 1);
    }

    tableBody.replaceChildren();
    emptyMessage.hidden = series.length > 0;

    for (const item of series) {
      const row = document.createElement("tr");

      const columns = [item.name, item.description || "—"];

      for (const value of columns) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }

      const gamesCell = document.createElement("td");
      gamesCell.className = "text-center";
      gamesCell.textContent = gameCounts.get(item.id) ?? 0;
      row.append(gamesCell);

      const actionsCell = document.createElement("td");
      actionsCell.className = "w-56 text-right";

      const actions = document.createElement("div");
      actions.className =
        "flex items-center justify-end gap-2 whitespace-nowrap";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "btn-table-edit";
      editButton.textContent = t("common.edit");

      editButton.addEventListener("click", () => {
        window.location.hash = `#/admin/edit-series?id=${item.id}`;
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn-table-delete";
      deleteButton.textContent = t("common.delete");

      deleteButton.addEventListener("click", async () => {
        deleteButton.disabled = true;

        try {
          const { count, error: countError } = await supabase
            .from("games")
            .select("id", { count: "exact", head: true })
            .eq("series_id", item.id);

          if (countError) throw countError;

          if (count > 0) {
            await confirmDialog({
              title: t("admin_series.cannot_delete_title"),
              message: t("admin_series.cannot_delete_message", {
                name: item.name,
                count,
              }),
              alertOnly: true,
            });
            return;
          }

          const confirmed = await confirmDialog({
            title: t("admin_series.delete_title"),
            message: t("admin_series.delete_message", {
              name: item.name,
            }),
            confirmText: t("admin_series.delete_confirm"),
          });
          if (!confirmed) return;

          deleteButton.textContent = t("common.deleting");

          const { data, error } = await supabase
            .from("series")
            .delete()
            .eq("id", item.id)
            .select("id");

          if (error) throw error;

          if (data.length !== 1) {
            throw new Error("Series was not deleted. Check your permissions.");
          }

          row.remove();

          if (!tableBody.children.length) {
            emptyMessage.hidden = false;
          }
        } catch (error) {
          console.error("Failed to delete series:", error);

          await confirmDialog({
            title: t("admin_series.delete_failed_title"),
            message: error.message,
            alertOnly: true,
          });
        } finally {
          deleteButton.disabled = false;
          deleteButton.textContent = t("common.delete");
        }
      });

      actions.append(editButton, deleteButton);
      actionsCell.append(actions);
      row.append(actionsCell);

      tableBody.append(row);
    }
  } catch (error) {
    console.error("Failed to load game series:", error);

    emptyMessage.hidden = false;
    emptyMessage.textContent = "Failed to load game series.";
  }
}
