import { supabase } from "./supabase.js";

const ADMIN_USER_ID = "443984a6-3e40-48c8-9437-1e6676e08749";

export function isAdmin(user) {
  return user?.id === ADMIN_USER_ID;
}

export async function getAdminUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !isAdmin(user)) {
    return null;
  }

  return user;
}
