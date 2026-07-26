export interface SecretKeysConfig {
  gemini_api_key: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_key: string;
  bkash_app_key: string;
  bkash_app_secret: string;
  nagad_app_key: string;
  nagad_app_secret: string;
  custom_webhook_secret: string;
}

export const getSecretKeys = (): SecretKeysConfig => {
  try {
    const saved = localStorage.getItem('parodorshi_secret_keys');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        gemini_api_key: parsed.gemini_api_key || process.env.GEMINI_API_KEY || '',
        supabase_url: parsed.supabase_url || import.meta.env.VITE_SUPABASE_URL || '',
        supabase_anon_key: parsed.supabase_anon_key || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        supabase_service_key: parsed.supabase_service_key || '',
        bkash_app_key: parsed.bkash_app_key || '',
        bkash_app_secret: parsed.bkash_app_secret || '',
        nagad_app_key: parsed.nagad_app_key || '',
        nagad_app_secret: parsed.nagad_app_secret || '',
        custom_webhook_secret: parsed.custom_webhook_secret || ''
      };
    }
  } catch (e) {
    console.error("[SecretKeys] Failed loading secret keys:", e);
  }
  return {
    gemini_api_key: process.env.GEMINI_API_KEY || '',
    supabase_url: import.meta.env.VITE_SUPABASE_URL || '',
    supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    supabase_service_key: '',
    bkash_app_key: '',
    bkash_app_secret: '',
    nagad_app_key: '',
    nagad_app_secret: '',
    custom_webhook_secret: ''
  };
};

export const getSecretKey = (keyName: keyof SecretKeysConfig): string => {
  const keys = getSecretKeys();
  return keys[keyName] || '';
};

export const saveSecretKeys = (keys: Partial<SecretKeysConfig>): SecretKeysConfig => {
  const current = getSecretKeys();
  const updated = { ...current, ...keys };
  try {
    localStorage.setItem('parodorshi_secret_keys', JSON.stringify(updated));
  } catch (e) {
    console.error("[SecretKeys] Failed saving secret keys:", e);
  }
  return updated;
};
