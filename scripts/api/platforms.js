import { supabase } from "../supabase.js";

export async function getPlatforms() {
  const { data, error } = await supabase
    .from("platforms")
    .select("id, name, manufacturer, release_year")
    .order("release_year", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}
