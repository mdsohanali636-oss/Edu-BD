import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Log Supabase keys to troubleshoot the active environment configuration
  console.log("[ViteConfig] Available environment keys:", Object.keys(env).filter(k => k.includes("SUPABASE") || k.includes("KEY")));
  if (env.VITE_SUPABASE_URL || env.SUPABASE_URL) {
    console.log("[ViteConfig] Found Supabase URL key:", env.VITE_SUPABASE_URL ? "VITE_SUPABASE_URL" : "SUPABASE_URL");
  }
  if (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY) {
    console.log("[ViteConfig] Found Supabase anon key configured in active host environment.");
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Ensure Supabase environment variables are properly defined and exposed to client browser bundle
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
