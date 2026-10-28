import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://ybkwqmefcwupavhlsxyb.supabase.co";
const supabaseKey = "sb_publishable_WaK9h8afgJNxAE4VtBuGxA_5yBKj41U";

export const supabase = createClient(supabaseUrl, supabaseKey);
