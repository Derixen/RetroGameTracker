import { supabase } from "../supabase.js";
import { confirmDialog } from "../components/confirmDialog.js";
import { t } from "../i18n.js";

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
    if (!user) throw new Error(t("profile.user_not_authenticated"));

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    emailElement.textContent = user.email ?? "—";

    roleElement.textContent =
      profile.role === "admin"
        ? t("profile.administrator")
        : t("profile.regular_user");

    createdElement.textContent = new Date(user.created_at).toLocaleDateString(
      document.documentElement.lang || "en",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  } catch (error) {
    console.error("Failed to load profile:", error);

    emailElement.textContent = t("profile.unavailable");
    roleElement.textContent = t("profile.unavailable");
    createdElement.textContent = t("profile.unavailable");

    await confirmDialog({
      title: t("profile.load_failed_title"),
      message: t("profile.load_failed_message"),
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
        throw new Error(t("profile.no_email"));
      }

      const redirectTo = new URL("./", window.location.href.split("#")[0]).href;

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo,
      });

      if (error) throw error;

      await confirmDialog({
        title: t("profile.reset_email_sent_title"),
        message: t("profile.reset_email_sent_message"),
        alertOnly: true,
      });
    } catch (error) {
      console.error("Password reset failed:", error);

      await confirmDialog({
        title: t("profile.reset_failed_title"),
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
      title: t("profile.delete_account_title"),
      message: t("profile.delete_account_message"),
      confirmText: t("profile.delete_account_confirm"),
      cancelText: t("profile.delete_account_cancel"),
    });

    if (!confirmed) return;

    const password = await confirmDialog({
      title: t("profile.confirm_deletion_title"),
      message: t("profile.confirm_deletion_message"),
      confirmText: t("profile.confirm_deletion_button"),
      cancelText: t("profile.delete_account_cancel"),
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
          throw new Error(t("profile.too_many_attempts"));
        }

        if (response?.status === 403) {
          throw new Error(t("profile.incorrect_password"));
        }

        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error ?? t("profile.deletion_failed_message"));
      }

      await supabase.auth.signOut();

      await confirmDialog({
        title: t("profile.account_deleted_title"),
        message: t("profile.account_deleted_message"),
        alertOnly: true,
      });

      window.location.hash = "#/home";
    } catch (error) {
      console.error("Account deletion failed:", error);

      await confirmDialog({
        title: t("profile.deletion_failed_title"),
        message: error.message,
        alertOnly: true,
      });
    } finally {
      deleteAccountButton.disabled = false;
    }
  });
}
