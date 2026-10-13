import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Récupération sécurisée des variables d'environnement Vite
const env = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env || {};
const supabaseUrl = 
  env.VITE_SUPABASE_URL || 
  env.NEXT_PUBLIC_SUPABASE_URL || 
  '';

const supabaseAnonKey = 
  env.VITE_SUPABASE_ANON_KEY || 
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder')
);

export function getSupabaseConfigStatus(): {
  isConfigured: boolean;
  url: string;
  hasAnonKey: boolean;
  origin: string;
} {
  return {
    isConfigured: isSupabaseConfigured,
    url: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^/]+).*/, '$1') : '',
    hasAnonKey: Boolean(supabaseAnonKey && supabaseAnonKey.length > 20),
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  };
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
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
