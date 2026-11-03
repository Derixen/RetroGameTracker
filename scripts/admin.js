import { supabase } from "./supabase.js";

export async function isAdmin(user) {
  if (!user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to check admin role:", error);
    return false;
  }

  return data.role === "admin";
}

export async function getAdminUser() {
  const user = await getAuthenticatedUser();

  if (!user) return null;

  return (await isAdmin(user)) ? user : null;
}

export async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("deletion_started_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.deletion_started_at !== null) {
    return null;
  }

  return user;
}
