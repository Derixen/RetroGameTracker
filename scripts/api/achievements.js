import { supabase } from "../supabase.js";

// Get all earned achievements for a game.
export async function getGameAchievements(gameId, userId) {
  const { data, error } = await supabase
    .from("game_achievements")
    .select("id, achievement_id, earned_at")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .order("earned_at", { ascending: true });

  if (error) throw error;

  return data;
}

// Award a new achievement badge.
export async function addGameAchievement(gameId, userId, achievementId) {
  const { data, error } = await supabase
    .from("game_achievements")
    .insert({
      game_id: gameId,
      user_id: userId,
      achievement_id: achievementId,
    })
    .select("id, achievement_id, earned_at")
    .single();

  if (error) throw error;

  return data;
}

// Remove an earned achievement badge.
export async function deleteGameAchievement(achievementRecordId, userId) {
  const { data, error } = await supabase
    .from("game_achievements")
    .delete()
    .eq("id", achievementRecordId)
    .eq("user_id", userId)
    .select("id");

  if (error) throw error;

  if (!data?.length) {
    throw new Error("Achievement could not be removed.");
  }
}
