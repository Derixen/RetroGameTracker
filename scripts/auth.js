import { supabase } from "./supabase.js";
import { isAdmin } from "./admin.js";

async function isPendingDeletion(user) {
  if (!user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("deletion_started_at")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to check account status:", error);
    return false;
  }

  return data.deletion_started_at !== null;
}

export async function initAuth() {
  const loginLink = document.getElementById("auth-login");
  const logoutButton = document.getElementById("auth-logout");
  const profileLink = document.getElementById("auth-profile");
  const adminLink = document.getElementById("auth-admin");
  const adminDashboardLink = document.getElementById("auth-admin-dashboard");
  const manageSeriesLink = document.getElementById("auth-manage-series");
  const managePlatformsLink = document.getElementById("auth-manage-platforms");

  async function updateAuthUI(session) {
    const signedIn = Boolean(session?.user);

    loginLink.hidden = signedIn;
    logoutButton.hidden = !signedIn;
    profileLink.hidden = !signedIn;
    adminLink.hidden = true;
    adminDashboardLink.hidden = true;
    manageSeriesLink.hidden = true;
    managePlatformsLink.hidden = true;

    if (signedIn) {
      const admin = await isAdmin(session.user);

      // Available to all authenticated users
      adminLink.hidden = false;
      manageSeriesLink.hidden = false;

      // Administrator-only features
      adminDashboardLink.hidden = !admin;
      managePlatformsLink.hidden = !admin;
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user && (await isPendingDeletion(session.user))) {
    await supabase.auth.signOut();
    window.location.hash = "#/home";
  } else {
    await updateAuthUI(session);
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      sessionStorage.setItem("passwordRecovery", "true");
      window.location.hash = "#/reset-password";
      return;
    }
    if (event === "SIGNED_OUT") {
      sessionStorage.removeItem("passwordRecovery");
    }
    if (event === "SIGNED_IN" && session?.user) {
      // Run asynchronously outside the authentication callback.
      setTimeout(async () => {
        if (await isPendingDeletion(session.user)) {
          const { error } = await supabase.auth.signOut();

          if (error) {
            console.error(
              "Failed to sign out pending-deletion account:",
              error,
            );
            return;
          }

          window.location.hash = "#/home";
          return;
        }

        await updateAuthUI(session);
        await recordLogin(session.user.id);
      }, 0);

      return;
    }

    updateAuthUI(session);
  });

  logoutButton.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error);
      return;
    }

    window.location.hash = "#/home";
  });
}

async function recordLogin(userId) {
  const { error } = await supabase
    .from("login_activity")
    .insert({ user_id: userId });

  if (error) {
    console.error("Failed to record login:", error);
  }
}
