import { getPlatforms } from "../api/platforms.js";
import { supabase } from "../supabase.js";
import { confirmDialog } from "../components/confirmDialog.js";

export async function initAdminPlatforms() {
  const tableBody = document.getElementById("admin-platforms-list");
  const emptyMessage = document.getElementById("admin-platforms-empty");
  document
    .getElementById("admin-add-platform")
    .addEventListener("click", () => {
      window.location.hash = "#/admin/add-platform";
    });

  try {
    let platforms = await getPlatforms();

    let sortDirection = "asc";

    document
      .querySelector('[data-sort="name"]')
      .addEventListener("click", () => {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";

        platforms.sort((a, b) => {
          const result = a.name.localeCompare(b.name);
          return sortDirection === "asc" ? result : -result;
        });

        renderPlatforms();
      });

    let imageSortDirection = "asc";

    document
      .querySelector('[data-sort="image_url"]')
      .addEventListener("click", () => {
        platforms.sort((a, b) => {
          const aHasImage = Boolean(a.image_url);
          const bHasImage = Boolean(b.image_url);

          return imageSortDirection === "asc"
            ? Number(aHasImage) - Number(bHasImage)
            : Number(bHasImage) - Number(aHasImage);
        });

        imageSortDirection = imageSortDirection === "asc" ? "desc" : "asc";

        renderPlatforms();
      });

    // Manufacturer sorting
    let manufacturerSortDirection = "asc";

    document
      .querySelector('[data-sort="manufacturer"]')
      .addEventListener("click", () => {
        platforms.sort((a, b) => {
          const result = (a.manufacturer || "").localeCompare(
            b.manufacturer || "",
          );

          return manufacturerSortDirection === "asc" ? result : -result;
        });

        manufacturerSortDirection =
          manufacturerSortDirection === "asc" ? "desc" : "asc";

        renderPlatforms();
      });

    // Release Year sorting
    let yearSortDirection = "asc";

    document
      .querySelector('[data-sort="release_year"]')
      .addEventListener("click", () => {
        platforms.sort((a, b) => {
          const result = (a.release_year ?? 9999) - (b.release_year ?? 9999);

          return yearSortDirection === "asc" ? result : -result;
        });

        yearSortDirection = yearSortDirection === "asc" ? "desc" : "asc";

        renderPlatforms();
      });

    tableBody.replaceChildren();
    emptyMessage.hidden = platforms.length > 0;

    function renderPlatforms() {
      tableBody.replaceChildren();

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

        const imageCell = document.createElement("td");
        imageCell.className = "px-4 py-4 text-center";

        imageCell.textContent = platform.image_url ? "✓ Yes" : "✗ No";
        imageCell.classList.add(
          platform.image_url ? "text-green-400" : "text-red-400",
        );

        row.append(imageCell);

        const actionsCell = document.createElement("td");
        actionsCell.className = "px-4 py-4 text-right";

        const editButton = document.createElement("button");
        editButton.className = "mr-3 text-pink-400 hover:text-pink-300";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => {
          window.location.hash = `#/admin/edit-platform?id=${platform.id}`;
        });

        const deleteButton = document.createElement("button");
        deleteButton.className =
          "cursor-pointer text-red-400 hover:text-red-300";
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
              await confirmDialog({
                title: "Cannot Delete Platform",
                message: `"${platform.name}" cannot be deleted because ${count} game(s) are assigned to it.`,
                alertOnly: true,
              });
              return;
            }

            const confirmed = await confirmDialog({
              title: "Delete Platform?",
              message: `Are you sure you want to delete "${platform.name}"?\n\nThis action cannot be undone.`,
              confirmText: "Delete Platform",
            });

            if (!confirmed) return;

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

            await confirmDialog({
              title: "Failed to delete platform:",
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
    }

    renderPlatforms();
  } catch (error) {
    console.error("Failed to load platforms:", error);

    emptyMessage.hidden = false;
    emptyMessage.textContent = "Failed to load platforms.";
  }
}
