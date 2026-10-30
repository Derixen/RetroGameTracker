import { supabase } from "../supabase.js";

// Get all completions for a specific game
export async function getGameCompletions(gameId) {
  const { data, error } = await supabase
    .from("game_completions")
    .select("*")
    .eq("game_id", gameId)
    .order("completed_year", { ascending: false })
    .order("completed_month", { ascending: false, nullsFirst: false })
    .order("completed_day", { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return data;
}

// Add a new completion record
export async function addGameCompletion(completion) {
  const { data, error } = await supabase
    .from("game_completions")
    .insert(completion)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// Delete a completion record
export async function deleteGameCompletion(id) {
  const { error } = await supabase
    .from("game_completions")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function updateGameCompletion(id, changes) {
  const { data, error } = await supabase
    .from("game_completions")
    .update(changes)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
