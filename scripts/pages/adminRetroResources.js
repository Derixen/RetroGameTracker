import {
  getAdminRetroResources,
  addRetroResource,
  updateRetroResource,
  deleteRetroResource,
} from "../api/retroResources.js";

import { confirmDialog } from "../components/confirmDialog.js";
import { t } from "../i18n.js";

export async function initAdminRetroResources() {
  const $ = (id) => document.getElementById(id);

  const search = $("admin-resources-search");
  const list = $("admin-resources-list");
  const loading = $("admin-resources-loading");
  const empty = $("admin-resources-empty");
  const errorElement = $("admin-resources-error");
  const addButton = $("admin-resources-add");

  const dialog = $("admin-resource-dialog");
  const form = $("admin-resource-form");
  const dialogTitle = $("admin-resource-dialog-title");
  const formError = $("admin-resource-form-error");
  const saveButton = $("admin-resource-save");
  const cancelButton = $("admin-resource-cancel");

  if (!list || !dialog || !form) return;

  let resources = [];
  let editingId = null;

  const fields = {
    name: $("admin-resource-name"),
    url: $("admin-resource-url"),
    category: $("admin-resource-category"),
    description: $("admin-resource-description"),
    sort_order: $("admin-resource-order"),
    is_visible: $("admin-resource-visible"),
  };

  function showError(element, message) {
    element.textContent = message;
    element.hidden = false;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();

    const filtered = resources.filter((resource) =>
      [
        resource.name,
        resource.category,
        resource.url,
        resource.description,
      ].some((value) =>
        String(value ?? "")
          .toLocaleLowerCase()
          .includes(query),
      ),
    );

    list.replaceChildren();
    empty.hidden = filtered.length > 0;

    for (const resource of filtered) {
      const row = document.createElement("tr");
      row.className = "border-t border-slate-500/20";

      const nameCell = document.createElement("td");
      nameCell.className = "px-5 py-4 font-semibold";
      nameCell.textContent = resource.name;

      const categoryCell = document.createElement("td");
      categoryCell.className = "px-5 py-4";
      categoryCell.textContent = resource.category;

      const visibleCell = document.createElement("td");
      visibleCell.className = "px-5 py-4";

      visibleCell.textContent = resource.is_visible
        ? t("admin_retro_resources.visible_status")
        : t("admin_retro_resources.hidden_status");

      const actionsCell = document.createElement("td");
      actionsCell.className = "px-5 py-4 text-right";

      const actions = document.createElement("div");
      actions.className = "flex justify-end gap-2";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "btn-secondary px-3 py-2 text-xs";
      editButton.textContent = t("admin_retro_resources.edit");

      editButton.addEventListener("click", () => openDialog(resource));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn-secondary px-3 py-2 text-xs text-red-400";
      deleteButton.textContent = t("admin_retro_resources.delete");

      deleteButton.addEventListener("click", async () => {
        const message = t("admin_retro_resources.delete_message").replace(
          "{name}",
          resource.name,
        );

        const confirmed = await confirmDialog({
          title: t("admin_retro_resources.delete_title"),
          message,
          confirmText: t("admin_retro_resources.delete"),
        });

        if (!confirmed) return;

        deleteButton.disabled = true;
        errorElement.hidden = true;

        try {
          await deleteRetroResource(resource.id);
          await loadResources();
        } catch (error) {
          showError(
            errorElement,
            error.message || t("admin_retro_resources.error_deleting"),
          );

          deleteButton.disabled = false;
        }
      });

      actions.append(editButton, deleteButton);
      actionsCell.append(actions);

      row.append(nameCell, categoryCell, visibleCell, actionsCell);
      list.append(row);
    }
  }

  async function loadResources() {
    loading.hidden = false;
    empty.hidden = true;
    errorElement.hidden = true;

    try {
      resources = await getAdminRetroResources();
      render();
    } catch (error) {
      console.error("Failed to load resources:", error);

      list.replaceChildren();
      empty.hidden = true;

      showError(
        errorElement,
        error.message || t("admin_retro_resources.error_loading"),
      );
    } finally {
      loading.hidden = true;
    }
  }

  function openDialog(resource = null) {
    editingId = resource?.id ?? null;

    form.reset();
    formError.hidden = true;

    dialogTitle.textContent = resource
      ? t("admin_retro_resources.edit_resource")
      : t("admin_retro_resources.add_resource");

    fields.name.value = resource?.name ?? "";
    fields.url.value = resource?.url ?? "";
    fields.category.value = resource?.category ?? "";
    fields.description.value = resource?.description ?? "";
    fields.sort_order.value = resource?.sort_order ?? 0;
    fields.is_visible.checked = resource?.is_visible ?? true;

    dialog.showModal();
  }

  addButton.addEventListener("click", () => openDialog());

  cancelButton.addEventListener("click", () => dialog.close());

  search.addEventListener("input", render);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    formError.hidden = true;
    saveButton.disabled = true;

    const resource = {
      name: fields.name.value.trim(),
      url: fields.url.value.trim(),
      category: fields.category.value.trim(),
      description: fields.description.value.trim() || null,
      sort_order: Number(fields.sort_order.value) || 0,
      is_visible: fields.is_visible.checked,
    };

    try {
      const url = new URL(resource.url);

      if (url.protocol !== "https:") {
        throw new Error(t("admin_retro_resources.invalid_url"));
      }

      if (editingId === null) {
        await addRetroResource(resource);
      } else {
        await updateRetroResource(editingId, resource);
      }

      dialog.close();
      await loadResources();
    } catch (error) {
      showError(
        formError,
        error.message || t("admin_retro_resources.error_saving"),
      );
    } finally {
      saveButton.disabled = false;
    }
  });

  await loadResources();
}
