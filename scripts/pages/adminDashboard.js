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
