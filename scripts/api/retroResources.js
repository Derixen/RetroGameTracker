import { supabase } from "../supabase.js";

/**
 * Get all visible retro resources.
 * Supabase RLS ensures only authenticated users
 * can access these records.
 */
export async function getRetroResources() {
  const { data, error } = await supabase
    .from("retro_resources")
    .select("id, name, url, category, description, sort_order")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load retro resources:", error);
    throw error;
  }

  return data ?? [];
}

/**
 * Get all resources, including hidden entries.
 * Intended for the administrator management page.
 * Supabase RLS restricts hidden records to admins.
 */
export async function getAdminRetroResources() {
  const { data, error } = await supabase
    .from("retro_resources")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/**
 * Create a new resource.
 * Only administrators are allowed by RLS.
 */
export async function addRetroResource(resource) {
  const { data, error } = await supabase
    .from("retro_resources")
    .insert(resource)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Update an existing resource.
 * Only administrators are allowed by RLS.
 */
export async function updateRetroResource(id, changes) {
  const { data, error } = await supabase
    .from("retro_resources")
    .update(changes)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Delete a resource.
 * Only administrators are allowed by RLS.
 */
export async function deleteRetroResource(id) {
  const { error } = await supabase
    .from("retro_resources")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
