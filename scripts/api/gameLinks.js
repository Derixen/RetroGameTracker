import { supabase } from "../supabase.js";

// Get all personal links for a game.
export async function getGameLinks(gameId, userId) {
  const { data, error } = await supabase
    .from("game_links")
    .select("id, name, url, category")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data;
}

// Add a new personal link.
export async function addGameLink(gameId, userId, name, url, category) {
  const { data, error } = await supabase
    .from("game_links")
    .insert({
      game_id: gameId,
      user_id: userId,
      name: name.trim(),
      url: url.trim(),
      category: category?.trim() || null,
    })
    .select("id, name, url, category")
    .single();

  if (error) throw error;

  return data;
}

// Update an existing personal link.
export async function updateGameLink(linkId, userId, name, url, category) {
  const { data, error } = await supabase
    .from("game_links")
    .update({
      name: name.trim(),
      url: url.trim(),
      category: category?.trim() || null,
    })
    .eq("id", linkId)
    .eq("user_id", userId)
    .select("id, name, url, category")
    .single();

  if (error) throw error;

  return data;
}

// Delete a personal link.
export async function deleteGameLink(linkId, userId) {
  const { data, error } = await supabase
    .from("game_links")
    .delete()
    .eq("id", linkId)
    .eq("user_id", userId)
    .select("id");

  if (error) throw error;

  if (!data?.length) {
    throw new Error("Link could not be deleted.");
  }
}
