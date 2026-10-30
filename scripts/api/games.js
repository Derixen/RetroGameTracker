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
    series (
        name
    ),
    platforms (
        name,
        manufacturer
    ),
    favorite,
    in_progress,
    completed
    
`,
    )
    .order("title");

  if (error) {
    throw error;
  }

  return data;
}
