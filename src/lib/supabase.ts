import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Récupération directe des variables d'environnement Vite (remplacement statique garanti lors du build)
const metaEnv = (typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined) || {};
const staticUrl = metaEnv.VITE_SUPABASE_URL || metaEnv.NEXT_PUBLIC_SUPABASE_URL || '';
const staticAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Résolution de configuration (avec possibilité de configuration souveraine locale)
export function getEffectiveConfig(): { url: string; anonKey: string } {
  let url = staticUrl;
  let anonKey = staticAnonKey;

  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('gogbo_v2_custom_supabase_url');
    const customKey = localStorage.getItem('gogbo_v2_custom_supabase_anon_key');
    if (customUrl && customKey && customUrl.startsWith('http')) {
      url = customUrl;
      anonKey = customKey;
    }
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

export function saveCustomSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gogbo_v2_custom_supabase_url', url.trim());
    localStorage.setItem('gogbo_v2_custom_supabase_anon_key', anonKey.trim());
    clientInstance = null;
  }
}

export function clearCustomSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gogbo_v2_custom_supabase_url');
    localStorage.removeItem('gogbo_v2_custom_supabase_anon_key');
    clientInstance = null;
  }
}

export function checkIsSupabaseConfigured(): boolean {
  const { url, anonKey } = getEffectiveConfig();
  return Boolean(
    url && 
    anonKey && 
    url.startsWith('http') &&
    !url.includes('placeholder')
  );
}

export const isSupabaseConfigured = checkIsSupabaseConfigured();

export function getSupabaseConfigStatus(): {
  isConfigured: boolean;
  url: string;
  hasAnonKey: boolean;
  isCustomOverride: boolean;
  origin: string;
} {
  const { url, anonKey } = getEffectiveConfig();
  const configured = Boolean(url && anonKey && url.startsWith('http') && !url.includes('placeholder'));
  const isCustom = typeof window !== 'undefined' && Boolean(localStorage.getItem('gogbo_v2_custom_supabase_url'));
  return {
    isConfigured: configured,
    url: url ? url.replace(/^(https?:\/\/[^/]+).*/, '$1') : '',
    hasAnonKey: Boolean(anonKey && anonKey.length > 20),
    isCustomOverride: isCustom,
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  };
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getEffectiveConfig();
  if (!url || !anonKey || !url.startsWith('http') || url.includes('placeholder')) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; details?: Record<string, unknown> }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      message: "Variables Supabase non configurées dans l'environnement (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Utilisation du stockage local persistant actif.",
      details: { isConfigured: false },
    };
  }

  try {
    const t0 = performance.now();
    const { data, error, count } = await client.from('classes').select('*', { count: 'exact', head: true });
    const latency = Math.round(performance.now() - t0);

    if (error) {
      return { 
        ok: false, 
        message: `Erreur PostgreSQL / Supabase : ${error.message} (Code: ${error.code || 'N/A'})`,
        details: { error: error.message, code: error.code, latencyMs: latency }
      };
    }
    return { 
      ok: true, 
      message: `Connexion à PostgreSQL / Supabase réussie (${latency} ms). ${count !== null ? count + ' classes trouvées.' : ''}`,
      details: { count, latencyMs: latency, isConfigured: true }
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { 
      ok: false, 
      message: `Échec de connexion réseau Supabase: ${errMsg}`,
      details: { error: errMsg }
    };
  }
}
