import { supabase } from "./supabase.js";
import { isAdmin } from "./admin.js";

export async function initAuth() {
  const loginLink = document.getElementById("auth-login");
  const logoutButton = document.getElementById("auth-logout");
  const adminLink = document.getElementById("auth-admin");
  const manageSeriesLink = document.getElementById("auth-manage-series");
  const managePlatformsLink = document.getElementById("auth-manage-platforms");

  function updateAuthUI(session) {
    const signedIn = Boolean(session?.user);

    loginLink.hidden = signedIn;
    logoutButton.hidden = !signedIn;
    adminLink.hidden = !signedIn;
    manageSeriesLink.hidden = !signedIn;
    managePlatformsLink.hidden = !isAdmin(session?.user);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  updateAuthUI(session);

  supabase.auth.onAuthStateChange((_event, session) => {
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
