import { getPlatforms } from "../api/platforms.js";
import { supabase } from "../supabase.js";

export async function initAdminPlatforms() {
  const tableBody = document.getElementById("admin-platforms-list");
  const emptyMessage = document.getElementById("admin-platforms-empty");
  document
    .getElementById("admin-add-platform")
    .addEventListener("click", () => {
      window.location.hash = "#/admin/add-platform";
    });

  try {
    const platforms = await getPlatforms();

    tableBody.replaceChildren();
    emptyMessage.hidden = platforms.length > 0;

    for (const platform of platforms) {
      const row = document.createElement("tr");
      row.className = "border-b border-slate-700/50 hover:bg-slate-800/40";

      const columns = [
        platform.name,
        platform.manufacturer || "—",
        platform.release_year ?? "—",
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
        window.location.hash = `#/admin/edit-platform?id=${platform.id}`;
      });

      const deleteButton = document.createElement("button");
      deleteButton.className = "cursor-pointer text-red-400 hover:text-red-300";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", async () => {
        deleteButton.disabled = true;

        try {
          // Check whether games are assigned to this platform
          const { count, error: countError } = await supabase
            .from("games")
            .select("id", { count: "exact", head: true })
            .eq("platform_id", platform.id);

          if (countError) throw countError;

          if (count > 0) {
            alert(
              `Cannot delete "${platform.name}".\n\n` +
                `${count} game(s) are assigned to this platform.`,
            );
            return;
          }

          const confirmed = window.confirm(
            `Are you sure you want to delete "${platform.name}"?\n\n` +
              "This action cannot be undone.",
          );

          if (!confirmed) return;

          deleteButton.textContent = "Deleting...";

          const { data, error } = await supabase
            .from("platforms")
            .delete()
            .eq("id", platform.id)
            .select("id");

          if (error) throw error;

          if (data.length !== 1) {
            throw new Error(
              "Platform was not deleted. Check your permissions.",
            );
          }

          row.remove();

          if (!tableBody.children.length) {
            emptyMessage.hidden = false;
          }
        } catch (error) {
          console.error("Failed to delete platform:", error);
          alert(`Failed to delete platform: ${error.message}`);
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
    console.error("Failed to load platforms:", error);

    emptyMessage.hidden = false;
    emptyMessage.textContent = "Failed to load platforms.";
  }
}
