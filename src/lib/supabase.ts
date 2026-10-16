import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Récupération directe et sécurisée des variables d'environnement Vite
const readEnvVar = (value: unknown): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return '';
};

// Accès explicite statique pour permettre le remplacement au build Vite sans dépendance à process.env
const staticUrl = 
  readEnvVar(import.meta.env?.VITE_SUPABASE_URL) || 
  readEnvVar(import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) || 
  '';

const staticAnonKey = 
  readEnvVar(import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  readEnvVar(import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || 
  '';

// Résolution de configuration (avec possibilité de configuration souveraine locale)
export function getEffectiveConfig(): { url: string; anonKey: string } {
  let url = staticUrl;
  let anonKey = staticAnonKey;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const customUrl = localStorage.getItem('gogbo_v2_custom_supabase_url');
      const customKey = localStorage.getItem('gogbo_v2_custom_supabase_anon_key');
      if (customUrl && customKey && customUrl.startsWith('http')) {
        url = customUrl;
        anonKey = customKey;
      }
    }
  } catch (e) {
    console.warn('Notice lecture localStorage config Supabase:', e);
  }

  return { url: (url || '').trim(), anonKey: (anonKey || '').trim() };
}

export function saveCustomSupabaseConfig(url: string, anonKey: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('gogbo_v2_custom_supabase_url', url.trim());
      localStorage.setItem('gogbo_v2_custom_supabase_anon_key', anonKey.trim());
      clientInstance = null;
      isSupabaseConfigured = checkIsSupabaseConfigured();
    }
  } catch (e) {
    console.warn('Notice écriture localStorage config Supabase:', e);
  }
}

export function clearCustomSupabaseConfig(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('gogbo_v2_custom_supabase_url');
      localStorage.removeItem('gogbo_v2_custom_supabase_anon_key');
      clientInstance = null;
      isSupabaseConfigured = checkIsSupabaseConfigured();
    }
  } catch (e) {
    console.warn('Notice suppression localStorage config Supabase:', e);
  }
}

export function checkIsSupabaseConfigured(): boolean {
  try {
    const { url, anonKey } = getEffectiveConfig();
    const configured = Boolean(
      url && 
      anonKey && 
      url.startsWith('http') &&
      !url.includes('placeholder')
    );
    isSupabaseConfigured = configured;
    return configured;
  } catch {
    return false;
  }
}

export let isSupabaseConfigured: boolean = checkIsSupabaseConfigured();

export function getSupabaseConfigStatus(): {
  isConfigured: boolean;
  url: string;
  hasAnonKey: boolean;
  isCustomOverride: boolean;
  origin: string;
} {
  try {
    const { url, anonKey } = getEffectiveConfig();
    const configured = Boolean(url && anonKey && url.startsWith('http') && !url.includes('placeholder'));
    let isCustom = false;
    try {
      isCustom = typeof window !== 'undefined' && Boolean(localStorage.getItem('gogbo_v2_custom_supabase_url'));
    } catch {}
    
    return {
      isConfigured: configured,
      url: url ? url.replace(/^(https?:\/\/[^/]+).*/, '$1') : '',
      hasAnonKey: Boolean(anonKey && anonKey.length > 20),
      isCustomOverride: isCustom,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    };
  } catch {
    return {
      isConfigured: false,
      url: '',
      hasAnonKey: false,
      isCustomOverride: false,
      origin: '',
    };
  }
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  try {
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
  } catch (err) {
    console.warn('Erreur initialisation client Supabase:', err);
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; details?: Record<string, unknown> }> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return {
        ok: false,
        message: "Variables Supabase non configurées dans l'environnement (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Utilisation du stockage local persistant actif.",
        details: { isConfigured: false },
      };
    }

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
