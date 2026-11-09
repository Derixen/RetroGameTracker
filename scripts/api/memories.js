import { supabase } from "../supabase.js";

export async function getGameMemory(gameId) {
  const { data, error } = await supabase
    .from("game_memories")
    .select("id, memory, played_year")
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveGameMemory(gameId, userId, memory, playedYear) {
  const { data, error } = await supabase
    .from("game_memories")
    .upsert(
      {
        game_id: gameId,
        user_id: userId,
        memory,
        played_year: playedYear,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,game_id" },
    )
    .select("id, memory, played_year")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGameMemory(memoryId) {
  const { data, error } = await supabase
    .from("game_memories")
    .delete()
    .eq("id", memoryId)
    .select("id");

  if (error) throw error;

  if (!data?.length) {
    throw new Error("Memory could not be deleted.");
  }
}
