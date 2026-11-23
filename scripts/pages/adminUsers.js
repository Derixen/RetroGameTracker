import { supabase } from "../supabase.js";
import { t } from "../i18n.js";
import { confirmDialog } from "../components/confirmDialog.js";

export async function initAdminUsers() {
  const { data, error } = await supabase.functions.invoke("admin-dashboard");

  if (error) {
    console.error("Failed to load users:", error);
    return;
  }

  renderUsersTable(data.users);
}

function renderUsersTable(users) {
  const tbody = document.getElementById("admin-users-table");
  if (!tbody) return;

  tbody.replaceChildren();

  if (!users.length) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.className = "px-4 py-8 text-center text-slate-400";
    cell.textContent = "No registered users found.";
    return;
  }

  for (const user of users) {
    const row = tbody.insertRow();
    row.className = "hover:bg-slate-800/50";

    const emailCell = row.insertCell();
    emailCell.className = "px-4 py-3 text-slate-200";
    emailCell.textContent = user.email;

    const dateCell = row.insertCell();
    dateCell.className = "px-4 py-3 text-slate-400";
    dateCell.textContent = new Date(user.created_at).toLocaleDateString(
      "en-GB",
    );

    const gamesCell = row.insertCell();
    gamesCell.className = "px-4 py-3 text-slate-200";
    gamesCell.textContent = user.games;

    const roleCell = row.insertCell();
    roleCell.className = "px-4 py-3";
    const roleBadge = document.createElement("span");
    roleBadge.className = user.deletion_started_at
      ? "rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400"
      : user.role === "admin"
        ? "rounded-full bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-400"
        : "rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300";
    roleBadge.textContent = user.deletion_started_at
      ? "PENDING DELETION"
      : user.role.toUpperCase();
    roleCell.appendChild(roleBadge);

    const actionsCell = row.insertCell();
    actionsCell.className = "px-4 py-3 text-right";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn-table-edit";
    editButton.textContent = t("admin_users.edit");
    editButton.disabled =
      user.role === "admin" || Boolean(user.deletion_started_at);
    editButton.classList.toggle("opacity-30", editButton.disabled);
    editButton.classList.toggle("cursor-not-allowed", editButton.disabled);

    editButton.title = user.deletion_started_at
      ? "Account is pending deletion"
      : user.role === "admin"
        ? "Administrator accounts can only be managed in Supabase"
        : "Promote user to ADMIN";

    editButton.addEventListener("click", async () => {
      const confirmed = await confirmDialog({
        title: t("admin_users.promote_title"),
        message: t("admin_users.promote_message", {
          email: user.email,
        }),
        confirmText: t("admin_users.promote_confirm"),
      });
      if (!confirmed) return;

      editButton.disabled = true;

      const { data, error } = await supabase.functions.invoke(
        "admin-dashboard",
        {
          body: {
            action: "update-role",
            userId: user.id,
            role: "admin",
          },
        },
      );

      if (error || !data?.success) {
        console.error("Promotion failed:", error, data);
        await confirmDialog({
          title: t("admin_users.promote_failed_title"),
          message: data?.error || t("admin_users.promote_failed_message"),
          alertOnly: true,
        });
        editButton.disabled = false;
        return;
      }

      await confirmDialog({
        title: t("admin_users.promote_success_title"),
        message: t("admin_users.promote_success_message", {
          email: user.email,
        }),
        alertOnly: true,
      });
      await initAdminUsers();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn-table-delete";
    deleteButton.textContent = t("common.delete");
    deleteButton.disabled = user.role === "admin";
    deleteButton.classList.toggle("opacity-30", deleteButton.disabled);
    deleteButton.classList.toggle("cursor-not-allowed", deleteButton.disabled);

    deleteButton.title =
      user.role === "admin"
        ? "Administrator accounts can only be managed in Supabase"
        : user.deletion_started_at
          ? "Retry account deletion"
          : "Permanently delete user";

    deleteButton.textContent = user.deletion_started_at
      ? t("admin_users.delete")
      : t("common.delete");

    deleteButton.addEventListener("click", async () => {
      const confirmed = await confirmDialog({
        title: t("admin_users.delete_title"),
        message: t("admin_users.delete_message", {
          email: user.email,
          count: user.games,
        }),
        confirmText: t("admin_users.delete_confirm"),
      });

      if (!confirmed) return;

      deleteButton.disabled = true;

      const { data, error } = await supabase.functions.invoke(
        "admin-dashboard",
        {
          body: {
            action: "delete-user",
            userId: user.id,
          },
        },
      );

      if (error || !data?.success) {
        console.error("Deletion failed:", error, data);
        await confirmDialog({
          title: t("admin_users.delete_failed_title"),
          message: data?.error || t("admin_users.delete_failed_message"),
          alertOnly: true,
        });
        await initAdminUsers();
        return;
      }

      await confirmDialog({
        title: t("admin_users.delete_success_title"),
        message: t("admin_users.delete_success_message", {
          email: user.email,
        }),
        alertOnly: true,
      });
      await initAdminUsers();
    });

    const actions = document.createElement("div");
    actions.className = "flex items-center justify-end gap-2 whitespace-nowrap";

    actions.append(editButton, deleteButton);
    actionsCell.append(actions);
    row.append(actionsCell);
  }
}
