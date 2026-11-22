import { getRetroResources } from "../api/retroResources.js";
import { t } from "../i18n.js";

// Resolve relative to this module, so deployment under a project subpath works.
const DESCRIPTIONS_URL = new URL(
  "../../data/websiteDescriptions.json",
  import.meta.url,
);

export async function initRetroResources() {
  const searchInput = document.getElementById("retro-resources-search");
  const categorySelect = document.getElementById("retro-resources-category");
  const countElement = document.getElementById("retro-resources-count");
  const tableBody = document.getElementById("retro-resources-list");
  const emptyElement = document.getElementById("retro-resources-empty");
  const errorElement = document.getElementById("retro-resources-error");

  if (!tableBody) return;

  let resources = [];
  let descriptions = {};
  let sortColumn = "name";
  let sortAscending = true;

  const columns = ["name", "category", "description"];
  const headers = tableBody.closest("table")?.querySelectorAll("th");

  // The i18n system should keep <html lang="..."> in sync with its active language.
  function getCurrentLanguage() {
    return (document.documentElement.lang || "en").toLowerCase().split("-")[0];
  }

  function getDescription(resource) {
    const translated =
      descriptions[String(resource.id)]?.[getCurrentLanguage()];
    return typeof translated === "string" && translated.trim()
      ? translated
      : resource.description || "";
  }

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
    const language = getCurrentLanguage();

    const filtered = resources.filter((resource) => {
      const matchesCategory = !category || resource.category === category;
      const matchesSearch =
        !query ||
        [resource.name, resource.category, getDescription(resource)].some(
          (value) =>
            String(value ?? "")
              .toLocaleLowerCase()
              .includes(query),
        );

      return matchesCategory && matchesSearch;
    });

    filtered.sort((a, b) => {
      const aValue = String(
        sortColumn === "description"
          ? getDescription(a)
          : (a[sortColumn] ?? ""),
      );
      const bValue = String(
        sortColumn === "description"
          ? getDescription(b)
          : (b[sortColumn] ?? ""),
      );

      const result = aValue.localeCompare(bValue, language, {
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
      descriptionCell.textContent = getDescription(resource);

      row.append(nameCell, categoryCell, descriptionCell);
      tableBody.append(row);
    }

    if (countElement) {
      countElement.textContent = `${filtered.length} ${t("retro_resources.count_label")}`;
    }

    if (emptyElement) emptyElement.hidden = filtered.length > 0;
  }

  try {
    // Translation data is optional; a missing file never prevents the page loading.
    const [loadedResources, loadedDescriptions] = await Promise.all([
      getRetroResources(),
      fetch(DESCRIPTIONS_URL)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .catch((error) => {
          console.warn(
            "Website descriptions unavailable; using English:",
            error,
          );
          return {};
        }),
    ]);

    resources = loadedResources;
    descriptions =
      loadedDescriptions && typeof loadedDescriptions === "object"
        ? loadedDescriptions
        : {};

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

    // Refresh descriptions when the app changes the document language.
    // Disconnect when this page is removed from the SPA.
    const languageObserver = new MutationObserver(() => {
      if (!tableBody.isConnected) {
        languageObserver.disconnect();
        return;
      }
      render();
    });
    languageObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });

    render();
  } catch (error) {
    console.error("Failed to initialize Retro Resources:", error);

    if (countElement) countElement.textContent = "";
    if (errorElement) {
      errorElement.textContent = t("retro_resources.error_loading");
      errorElement.hidden = false;
    }
  }
}
