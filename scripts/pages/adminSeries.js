import { getSeries } from "../api/series.js";
import { supabase } from "../supabase.js";
import { confirmDialog } from "../components/confirmDialog.js";

export async function initAdminSeries() {
  const tableBody = document.getElementById("admin-series-list");
  const emptyMessage = document.getElementById("admin-series-empty");
  document.getElementById("admin-add-series").addEventListener("click", () => {
    window.location.hash = "#/admin/add-series";
  });

  try {
    const series = await getSeries();

    tableBody.replaceChildren();
    emptyMessage.hidden = series.length > 0;

    for (const item of series) {
      const row = document.createElement("tr");
      row.className = "border-b border-slate-700/50 hover:bg-slate-800/40";

      const columns = [item.name, item.description || "—"];

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
      editButton.classList.add("cursor-pointer");

      editButton.addEventListener("click", () => {
        window.location.hash = `#/admin/edit-series?id=${item.id}`;
      });

      const deleteButton = document.createElement("button");
      deleteButton.className = "cursor-pointer text-red-400 hover:text-red-300";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", async () => {
        deleteButton.disabled = true;

        try {
          // Check if any games belong to this series
          const { count, error: countError } = await supabase
            .from("games")
            .select("id", { count: "exact", head: true })
            .eq("series_id", item.id);

          if (countError) throw countError;

          if (count > 0) {
            await confirmDialog({
              title: "Cannot Delete Game Series",
              message: `"${item.name}" cannot be deleted because ${count} game(s) belong to this series.`,
              alertOnly: true,
            });
            return;
          }

          const confirmed = await confirmDialog({
            title: "Delete Game Series?",
            message: `Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone.`,
            confirmText: "Delete Series",
          });

          if (!confirmed) return;

          deleteButton.textContent = "Deleting...";

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
            title: "Failed to Delete Game Series",
            message: error.message,
            alertOnly: true,
          });
        } finally {
          deleteButton.disabled = false;
          deleteButton.textContent = "Delete";
        }
      });

      actionsCell.append(editButton, deleteButton);
      row.append(actionsCell);

      tableBody.append(row);
    }
  } catch (error) {
    console.error("Failed to load game series:", error);

    emptyMessage.hidden = false;
    emptyMessage.textContent = "Failed to load game series.";
  }
}
