import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = "https://cmusbkxuwikrpdrkkbsl.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_f-mymjUHI1oBAO2dg1OpCQ_rXg7ctii";

let SUPABASE_URL = DEFAULT_SUPABASE_URL;
let SUPABASE_PUBLIC_KEY = DEFAULT_SUPABASE_ANON_KEY;

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasCustomUrl = envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http');

if (hasCustomUrl) {
  const customUrl = envUrl.trim();
  if (customUrl.toLowerCase().includes("cmusbkxuwikrpdrkkbsl.supabase.co")) {
    // If it's pointing to the default project url, strictly pair it with the working default key
    SUPABASE_URL = DEFAULT_SUPABASE_URL;
    SUPABASE_PUBLIC_KEY = DEFAULT_SUPABASE_ANON_KEY;
    console.log("[Supabase / INIT] Using default project URL. Aligning with default working Anon Key.");
  } else {
    // Genuine custom production project URL
    SUPABASE_URL = customUrl;
    if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
      SUPABASE_PUBLIC_KEY = envKey.trim();
      console.log("[Supabase / INIT] Using custom production Supabase URL:", SUPABASE_URL);
    } else {
      console.warn("[Supabase / INIT] Custom URL provided but Anon Key is missing. Falling back to default anon key.");
    }
  }
} else {
  // Empty, missing, or invalid URL format (e.g., placeholder string without http prefix)
  SUPABASE_URL = DEFAULT_SUPABASE_URL;
  SUPABASE_PUBLIC_KEY = DEFAULT_SUPABASE_ANON_KEY;
  console.log("[Supabase / INIT] Active environment VITE_SUPABASE_URL is missing or invalid. Falling back to default URL and key.");
}

console.log("[Supabase / INIT] Supabase URL loaded:", SUPABASE_URL);
console.log("[Supabase / INIT] Initializing Supabase client...");
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
console.log("[Supabase / INIT] Supabase client initialized.");

