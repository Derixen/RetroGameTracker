import { supabase } from "../supabase.js";
import { confirmDialog } from "../components/confirmDialog.js";

export async function initProfile() {
  const emailElement = document.getElementById("profile-email");
  const roleElement = document.getElementById("profile-role");
  const createdElement = document.getElementById("profile-created");

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("User not authenticated.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    emailElement.textContent = user.email ?? "—";

    roleElement.textContent =
      profile.role === "admin" ? "Administrator" : "Regular User";

    createdElement.textContent = new Date(user.created_at).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  } catch (error) {
    console.error("Failed to load profile:", error);

    emailElement.textContent = "Unavailable";
    roleElement.textContent = "Unavailable";
    createdElement.textContent = "Unavailable";

    await confirmDialog({
      title: "Failed to Load Profile",
      message:
        "Your account information could not be loaded. Please try again.",
      alertOnly: true,
    });
  }

  const changePasswordButton = document.getElementById(
    "profile-change-password",
  );

  changePasswordButton.addEventListener("click", async () => {
    changePasswordButton.disabled = true;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.email) {
        throw new Error("No email address found.");
      }

      const redirectTo = new URL("./", window.location.href.split("#")[0]).href;

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo,
      });

      if (error) throw error;

      await confirmDialog({
        title: "Password Reset Email Sent",
        message: "Check your email for a link to change your password.",
        alertOnly: true,
      });
    } catch (error) {
      console.error("Password reset failed:", error);

      await confirmDialog({
        title: "Password Reset Failed",
        message: error.message,
        alertOnly: true,
      });
    } finally {
      changePasswordButton.disabled = false;
    }
  });

  const deleteAccountButton = document.getElementById("profile-delete-account");

  deleteAccountButton.addEventListener("click", async () => {
    const confirmed = await confirmDialog({
      title: "Delete My Account",
      message:
        "This permanently deletes your account and game collection. This action cannot be undone. Continue?",
      confirmText: "Continue",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    const password = await confirmDialog({
      title: "Confirm Account Deletion",
      message:
        "Enter your account password to permanently delete your account.",
      confirmText: "Delete My Account",
      cancelText: "Cancel",
      passwordInput: true,
    });

    if (!password) return;

    deleteAccountButton.disabled = true;

    try {
      const { data, error } = await supabase.functions.invoke(
        "delete-my-account",
        { body: { password } },
      );

      if (error) {
        const response = error.context;

        if (response?.status === 429) {
          throw new Error(
            "Too many incorrect attempts. Please try again in 15 minutes.",
          );
        }

        if (response?.status === 403) {
          throw new Error(
            "Incorrect password or account deletion not permitted.",
          );
        }

        throw error;
      }
      if (!data?.success) {
        throw new Error(data?.error ?? "Account deletion failed.");
      }

      await supabase.auth.signOut();

      await confirmDialog({
        title: "Account Deleted",
        message: "Your account and game collection have been deleted.",
        alertOnly: true,
      });

      window.location.hash = "#/home";
    } catch (error) {
      console.error("Account deletion failed:", error);

      await confirmDialog({
        title: "Deletion Failed",
        message: error.message,
        alertOnly: true,
      });
    } finally {
      deleteAccountButton.disabled = false;
    }
  });
}
