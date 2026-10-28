import { supabase } from "../supabase.js";

export async function getGames() {
  const { data, error } = await supabase
    .from("games")
    .select(
      `
    id,
    title,
    release_year,
    genre,
    developer,
    cover_url,
    created_at,
    series_id,
    platforms (
        name,
        manufacturer
    )
    
`,
    )
    .order("title");

  if (error) {
    throw error;
  }

  return data;
}
