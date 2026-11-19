import { supabase } from "../supabase.js";

export async function getGameMemory(gameId, userId) {
  const { data, error } = await supabase
    .from("game_memories")
    .select("id, memory, played_year, image_path")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveGameMemory(
  gameId,
  userId,
  memory,
  playedYear,
  imagePath = undefined,
) {
  const payload = {
    game_id: gameId,
    user_id: userId,
    memory,
    played_year: playedYear,
    updated_at: new Date().toISOString(),
  };

  // Only change the image when a new path is supplied.
  if (imagePath !== undefined) {
    payload.image_path = imagePath;
  }

  const { data, error } = await supabase
    .from("game_memories")
    .upsert(payload, { onConflict: "user_id,game_id" })
    .select("id, memory, played_year, image_path")
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

export async function uploadMemoryImage(gameId, userId, file) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type) || file.size > maxSize) {
    throw new Error("Invalid image. Use JPG, PNG, or WebP (max 5 MB).");
  }

  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[file.type];

  const filePath = `${userId}/${gameId}/${crypto.randomUUID()}.${extension}`;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== userId) {
    throw new Error("You must be signed in to upload an image.");
  }

  const { error } = await supabase.storage
    .from("memory-images")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  return filePath;
}
