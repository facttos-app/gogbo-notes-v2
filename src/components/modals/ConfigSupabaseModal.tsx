import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Save, 
  RotateCcw, 
  ExternalLink,
  ShieldCheck,
  Server
} from 'lucide-react';
import { 
  getSupabaseConfigStatus, 
  testSupabaseConnection, 
  saveCustomSupabaseConfig, 
  clearCustomSupabaseConfig,
  getEffectiveConfig 
} from '../../lib/supabase';

interface ConfigSupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigSupabaseModal: React.FC<ConfigSupabaseModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState(getEffectiveConfig());
  const [status, setStatus] = useState(getSupabaseConfigStatus());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; details?: Record<string, unknown> } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
      setStatus(getSupabaseConfigStatus());
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Erreur de test réseau',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!config.url || !config.anonKey) {
      alert("Veuillez renseigner l'URL Supabase et la clé Anon.");
      return;
    }
    saveCustomSupabaseConfig(config.url, config.anonKey);
    setStatus(getSupabaseConfigStatus());
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      window.location.reload();
    }, 1200);
  };

  const handleResetToEnv = () => {
    clearCustomSupabaseConfig();
    setConfig(getEffectiveConfig());
    setStatus(getSupabaseConfigStatus());
    setTestResult(null);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* En-tête */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                État & Diagnostic Supabase
              </h3>
              <p className="text-[11px] text-slate-300">
                Liaison centrale des données GOGBO NOTES V2
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-slate-700">
          {/* État actuel */}
          <div className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
            status.isConfigured 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            {status.isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold">
                {status.isConfigured ? 'Configuration Supabase active' : 'Mode local : Supabase non détecté'}
              </div>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                {status.isConfigured
                  ? `Connecté à l'instance : ${status.url}`
                  : "Les variables d'environnement Vercel (VITE_SUPABASE_URL) ne sont pas chargées dans ce navigateur. Vous pouvez les renseigner ci-dessous."}
              </p>
              {status.isCustomOverride && (
                <div className="mt-1 text-[10px] text-indigo-700 font-semibold">
                  (Configuration manuelle enregistrée dans ce navigateur)
                </div>
              )}
            </div>
          </div>

          {/* Formulaire de configuration */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                URL du projet Supabase (VITE_SUPABASE_URL)
              </label>
              <input
                type="url"
                placeholder="https://votre-projet.supabase.co"
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-500 bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Clé Publique Anon (VITE_SUPABASE_ANON_KEY)
              </label>
              <textarea
                rows={2}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={config.anonKey}
                onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-500 bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium shadow-2xs"
              />
            </div>
          </div>

          {/* Résultat du test de connexion */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs ${
              testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              <div className="font-bold flex items-center space-x-1.5">
                {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                <span>{testResult.ok ? 'Connexion réussie' : 'Échec de connexion'}</span>
              </div>
              <p className="mt-1 text-[11px]">{testResult.message}</p>
            </div>
          )}

          {saveSuccess && (
            <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold text-center animate-pulse">
              ✓ Paramètres enregistrés ! Rechargement de la page...
            </div>
          )}

          {/* Boutons d'action */}
          <div className="pt-2 flex flex-wrap gap-2 justify-between items-center border-t border-slate-200">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Test en cours...' : 'Tester la connexion'}</span>
            </button>

            <div className="flex items-center space-x-2">
              {status.isCustomOverride && (
                <button
                  type="button"
                  onClick={handleResetToEnv}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                  title="Réinitialiser vers les variables d'environnement Vercel"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Variables Vercel</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer & Activer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
