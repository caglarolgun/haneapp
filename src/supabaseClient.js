import { createClient } from "@supabase/supabase-js";

// Bu iki değeri Supabase projenden alıp .env dosyasına
// (yerelde) ve Vercel'in Environment Variables kısmına
// (canlıda) ekleyeceksin. Kodun içine asla direkt yazma.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase bağlantı bilgileri eksik. .env dosyana VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değerlerini eklediğinden emin ol."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
