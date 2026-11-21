import { getRetroResources } from "../api/retroResources.js";
import { t } from "../i18n.js";

export async function initRetroResources() {
  const searchInput = document.getElementById("retro-resources-search");
  const categorySelect = document.getElementById("retro-resources-category");
  const countElement = document.getElementById("retro-resources-count");
  const tableBody = document.getElementById("retro-resources-list");
  const emptyElement = document.getElementById("retro-resources-empty");
  const errorElement = document.getElementById("retro-resources-error");

  if (!tableBody) return;

  let resources = [];
  let sortColumn = "name";
  let sortAscending = true;

  const columns = ["name", "category", "description"];
  const headers = tableBody.closest("table")?.querySelectorAll("th");

  // Enable sorting by clicking table headings.
  headers?.forEach((header, index) => {
    const column = columns[index];
    if (!column) return;

    header.tabIndex = 0;
    header.setAttribute("role", "button");
    header.setAttribute("aria-sort", "none");
    header.classList.add("cursor-pointer", "select-none");

    const changeSort = () => {
      if (sortColumn === column) {
        sortAscending = !sortAscending;
      } else {
        sortColumn = column;
        sortAscending = true;
      }

      headers.forEach((item) => {
        item.removeAttribute("aria-sort");
      });

      header.setAttribute(
        "aria-sort",
        sortAscending ? "ascending" : "descending",
      );

      render();
    };

    header.addEventListener("click", changeSort);

    header.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        changeSort();
      }
    });
  });

  function render() {
    const query = searchInput?.value.trim().toLocaleLowerCase() || "";
    const category = categorySelect?.value || "";

    const filtered = resources.filter((resource) => {
      const matchesCategory = !category || resource.category === category;

      const matchesSearch =
        !query ||
        [resource.name, resource.category, resource.description].some((value) =>
          String(value ?? "")
            .toLocaleLowerCase()
            .includes(query),
        );

      return matchesCategory && matchesSearch;
    });

    filtered.sort((a, b) => {
      const aValue = String(a[sortColumn] ?? "");
      const bValue = String(b[sortColumn] ?? "");

      const result = aValue.localeCompare(bValue, "en", {
        sensitivity: "base",
      });

      return sortAscending ? result : -result;
    });

    tableBody.replaceChildren();

    for (const resource of filtered) {
      const row = document.createElement("tr");
      row.className = "border-t border-slate-500/20";

      const nameCell = document.createElement("td");
      nameCell.className = "px-5 py-4";

      const nameLink = document.createElement("a");
      nameLink.href = resource.url;
      nameLink.target = "_blank";
      nameLink.rel = "noopener noreferrer";
      nameLink.className =
        "btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold";

      nameLink.textContent = resource.name;

      nameCell.append(nameLink);

      const categoryCell = document.createElement("td");
      categoryCell.className = "px-5 py-4";
      categoryCell.textContent = resource.category;

      const descriptionCell = document.createElement("td");
      descriptionCell.className = "px-5 py-4 text-slate-400";
      descriptionCell.textContent = resource.description || "";

      row.append(nameCell, categoryCell, descriptionCell);
      tableBody.append(row);
    }

    if (countElement) {
      countElement.textContent = `${filtered.length} ${t("retro_resources.count_label")}`;
    }

    emptyElement.hidden = filtered.length > 0;
  }

  try {
    resources = await getRetroResources();

    // Build category filter from actual database values.
    const categories = [
      ...new Set(
        resources.map((resource) => resource.category).filter(Boolean),
      ),
    ].sort();

    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.append(option);
    }

    searchInput?.addEventListener("input", render);
    categorySelect?.addEventListener("change", render);

    render();
  } catch (error) {
    console.error("Failed to initialize Retro Resources:", error);

    if (countElement) {
      countElement.textContent = "";
    }
    errorElement.textContent = t("retro_resources.error_loading");
    errorElement.hidden = false;
  }
}
