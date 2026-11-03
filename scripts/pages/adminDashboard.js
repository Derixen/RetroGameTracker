import { supabase } from "../supabase.js";

export async function initAdminDashboard() {
  const { data, error } = await supabase.functions.invoke("admin-dashboard");

  if (error) {
    console.error("Failed to load admin dashboard:", error);
    return;
  }

  console.log("Admin Dashboard Data:", data);

  document.getElementById("admin-total-users").textContent = data.totalUsers;

  document.getElementById("admin-total-games").textContent = data.totalGames;

  document.getElementById("admin-active-today").textContent = data.activeToday;

  document.getElementById("admin-new-users").textContent =
    data.newUsersThisWeek;

  renderLoginChart(data.dailyLogins);
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
    editButton.className =
      "mr-3 font-semibold text-cyan-400 hover:text-cyan-300";
    editButton.textContent = "Edit";
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
      const confirmed = confirm(
        `Promote ${user.email} to ADMIN?\n\n` +
          "This will grant the user administrative privileges.",
      );

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
        alert(data?.error || "Failed to promote user.");
        editButton.disabled = false;
        return;
      }

      alert(`${user.email} is now an ADMIN.`);
      await initAdminDashboard();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "font-semibold text-red-400 hover:text-red-300";
    deleteButton.textContent = "Delete";
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
      ? "Retry Delete"
      : "Delete";

    deleteButton.addEventListener("click", async () => {
      const confirmed = confirm(
        `Permanently delete ${user.email}?\n\n` +
          `This will delete their account and ${user.games} games, ` +
          "along with their series and completion records.\n\n" +
          "THIS CANNOT BE UNDONE.",
      );

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
        alert(
          data?.error ||
            "Account deletion failed or is incomplete. Please retry.",
        );
        await initAdminDashboard();
        return;
      }

      alert(`${user.email} has been permanently deleted.`);
      await initAdminDashboard();
    });

    actionsCell.append(editButton, deleteButton);
  }
}

function renderLoginChart(dailyLogins) {
  const container = document.getElementById("admin-login-chart");
  if (!container) return;

  const max = Math.max(1, ...dailyLogins.map((day) => day.signins));

  container.innerHTML = `
    <div class="flex h-56 items-end gap-1 border-b border-slate-700 pb-2">
      ${dailyLogins
        .map((day) => {
          const height = (day.signins / max) * 100;

          return `
            <div
              class="group relative flex h-full min-w-0 flex-1 items-end"
              title="${day.date}: ${day.signins} sign-ins, ${day.unique_users} unique users"
            >
              <div
                class="w-full rounded-t bg-pink-500 transition hover:bg-pink-400"
                style="height: ${height}%"
              ></div>
            </div>
          `;
        })
        .join("")}
    </div>

    <div class="mt-3 flex justify-between text-xs text-slate-400">
      <span>${dailyLogins[0]?.date ?? ""}</span>
      <span>${dailyLogins.at(-1)?.date ?? ""}</span>
    </div>

    <div class="mt-4 flex items-center gap-2 text-xs text-slate-400">
      <span class="h-3 w-3 rounded bg-pink-500"></span>
      Daily sign-in events
    </div>
  `;
}
