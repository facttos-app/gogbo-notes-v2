import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Récupération directe et sécurisée des variables d'environnement Vite
const readEnvVar = (value: unknown): string => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return '';
};

// Accès universel et sécurisé multi-environnements (Vite Client, Vercel, Node, SSR)
// Permet à la fois le remplacement statique natif de Vite au build et la sécurité à l'exécution
const rawUrl = (() => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    }
  } catch {}
  return '';
})();

const rawAnonKey = (() => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (
        import.meta.env.VITE_SUPABASE_ANON_KEY || 
        import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
        import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
        ''
      );
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      return (
        process.env.VITE_SUPABASE_ANON_KEY || 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
        ''
      );
    }
  } catch {}
  return '';
})();

const staticUrl = readEnvVar(rawUrl);
const staticAnonKey = readEnvVar(rawAnonKey);



// Résolution de configuration (avec possibilité de configuration souveraine locale)
// Projet Supabase de production (CEG GOGBO). L'URL et la clé « publishable » sont PUBLIQUES par conception :
// la protection des données repose sur les politiques RLS, jamais sur le secret de cette clé.
// Ne jamais placer ici la « Secret key » ni la clé service_role.
const PROD_SUPABASE_URL = 'https://kndlxabmtwaqxicwzsdl.supabase.co';
const PROD_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rUUB2uVUTie0yFEXX6TE9A_5tYVdoZp';

export function getEffectiveConfig(): { url: string; anonKey: string } {
  // Configuration de production prioritaire : ni variables obsolètes ni réglage local ne la remplacent.
  if (PROD_SUPABASE_URL && PROD_SUPABASE_PUBLISHABLE_KEY && !PROD_SUPABASE_PUBLISHABLE_KEY.startsWith('__')) {
    return { url: PROD_SUPABASE_URL, anonKey: PROD_SUPABASE_PUBLISHABLE_KEY };
  }

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

export type DiagnosticCategory = 
  | 'URL_ABSENTE'
  | 'URL_INVALIDE'
  | 'CLE_ABSENTE'
  | 'ERREUR_RESEAU'
  | 'PROJET_INACCESSIBLE'
  | 'AUTHENTIFICATION'
  | 'RLS_PERMISSION'
  | 'CONNEXION_REUSSIE';

export async function testSupabaseConnection(): Promise<{ 
  ok: boolean; 
  category: DiagnosticCategory;
  message: string; 
  details?: Record<string, unknown> 
}> {
  const { url, anonKey } = getEffectiveConfig();

  // 1. Diagnostic URL
  if (!url) {
    return {
      ok: false,
      category: 'URL_ABSENTE',
      message: "URL du projet absente : La variable VITE_SUPABASE_URL n'est pas renseignée dans cet environnement.",
      details: { hasUrl: false, hasAnonKey: Boolean(anonKey) },
    };
  }

  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return {
      ok: false,
      category: 'URL_INVALIDE',
      message: "URL invalide : L'adresse du projet Supabase doit impérativement débuter par https://",
      details: { urlProvided: url.replace(/^(https?:\/\/[^/]+).*/, '$1') },
    };
  }

  // 2. Diagnostic Clé publique
  if (!anonKey) {
    return {
      ok: false,
      category: 'CLE_ABSENTE',
      message: "Clé publique absente : La variable VITE_SUPABASE_ANON_KEY n'est pas renseignée dans cet environnement.",
      details: { hasUrl: true, hasAnonKey: false },
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      category: 'URL_INVALIDE',
      message: "Échec d'initialisation : Impossible d'instancier le client avec les paramètres fournis.",
      details: { isConfigured: false },
    };
  }

  // 3. Test de communication réelle non-destructive
  try {
    const t0 = performance.now();
    const { error, count, status } = await client
      .from('classes')
      .select('*', { count: 'exact', head: true });
    const latency = Math.round(performance.now() - t0);

    if (error) {
      const errLower = error.message.toLowerCase();
      const code = error.code || '';

      // Problème d'authentification / clé publique refusée
      if (
        code === 'PGRST301' || 
        status === 401 || 
        errLower.includes('jwt') || 
        errLower.includes('apikey') || 
        errLower.includes('invalid api key') ||
        errLower.includes('unauthorized')
      ) {
        return {
          ok: false,
          category: 'AUTHENTIFICATION',
          message: `Erreur d'authentification Supabase (HTTP ${status || 401}) : La clé publique Anon est rejetée ou invalide.`,
          details: { code, status, latencyMs: latency },
        };
      }

      // Problème de permissions / RLS
      if (
        code === '42501' || 
        status === 403 || 
        errLower.includes('permission denied') || 
        errLower.includes('row-level security') ||
        errLower.includes('rls')
      ) {
        return {
          ok: false,
          category: 'RLS_PERMISSION',
          message: `Politiques RLS PostgreSQL (Code ${code}) : Accès anonyme restreint sur la table des classes. Connexion établie mais permissions spécifiques requises.`,
          details: { code, status, latencyMs: latency },
        };
      }

      return {
        ok: false,
        category: 'PROJET_INACCESSIBLE',
        message: `Erreur PostgreSQL / Supabase : ${error.message} (Code: ${code || 'N/A'})`,
        details: { code, status, latencyMs: latency },
      };
    }

    return {
      ok: true,
      category: 'CONNEXION_REUSSIE',
      message: `Connexion réelle certifiée opérationnelle (${latency} ms). ${count !== null ? count + ' classes dénombrées dans la base centrale.' : ''}`,
      details: { count, latencyMs: latency, isConfigured: true },
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errLower = errMsg.toLowerCase();

    if (
      errLower.includes('failed to fetch') || 
      errLower.includes('network') || 
      errLower.includes('enotfound') ||
      errLower.includes('timeout')
    ) {
      return {
        ok: false,
        category: 'ERREUR_RESEAU',
        message: `Erreur réseau : Le serveur Supabase est inaccessible (échec de connexion, timeout ou hôte introuvable).`,
        details: { error: errMsg },
      };
    }

    return {
      ok: false,
      category: 'PROJET_INACCESSIBLE',
      message: `Projet inaccessible : ${errMsg}`,
      details: { error: errMsg },
    };
  }
}
