import { supabase } from "../supabase.js";

export async function getSeries() {
  const { data, error } = await supabase
    .from("series")
    .select("id, name, description")
    .order("name");

  if (error) {
    throw error;
  }

  return data;
}
