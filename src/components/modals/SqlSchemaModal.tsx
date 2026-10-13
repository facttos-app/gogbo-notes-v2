import React, { useState } from 'react';
import { FileText, Copy, Check, X, Shield, Database, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { testSupabaseConnection, getSupabaseConfigStatus } from '../../lib/supabase';

interface SqlSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlSchemaModal: React.FC<SqlSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'schema' | 'additive' | 'seed'>('schema');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  if (!isOpen) return null;

  const configStatus = getSupabaseConfigStatus();

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (e: unknown) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Erreur de test' });
    } finally {
      setTesting(false);
    }
  };

  const schemaSql = `-- PostgreSQL / Supabase Schema (RLS, Policies & Security)
-- Fichier source : /supabase/schema.sql
-- Pour exécuter dans Supabase SQL Editor :
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  niveau TEXT NOT NULL,
  serie TEXT NOT NULL,
  effectif_max INTEGER NOT NULL DEFAULT 100 CHECK (effectif_max <= 100)
);

CREATE TABLE IF NOT EXISTS public.matieres (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  coefficient NUMERIC NOT NULL DEFAULT 1 CHECK (coefficient > 0),
  statut TEXT NOT NULL DEFAULT 'ACTIF',
  is_langue_option BOOLEAN NOT NULL DEFAULT FALSE,
  categorie TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.affectations (
  id TEXT PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classe_id TEXT NOT NULL REFERENCES public.classes(id),
  matiere_id TEXT NOT NULL REFERENCES public.matieres(id),
  heures_hebdo NUMERIC NOT NULL DEFAULT 1 CHECK (heures_hebdo > 0),
  statut TEXT NOT NULL DEFAULT 'ACTIF',
  CONSTRAINT unique_affectation_active UNIQUE (profile_id, classe_id, matiere_id)
);

CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  eleve_id TEXT NOT NULL REFERENCES public.eleves(id),
  affectation_id TEXT NOT NULL REFERENCES public.affectations(id),
  periode_id TEXT NOT NULL REFERENCES public.periodes(id),
  valeur NUMERIC NOT NULL CHECK (valeur >= 0 AND valeur <= 20),
  type_evaluation TEXT NOT NULL CHECK (type_evaluation IN ('DEVOIR_1', 'DEVOIR_2', 'INTERROGATION')),
  observation TEXT,
  CONSTRAINT unique_note_eleve_affectation_type UNIQUE (eleve_id, affectation_id, periode_id, type_evaluation)
);

-- RLS POLICIES (Row-Level Security)
-- 14. PRÉSENCE JOURNALIÈRE DES ENSEIGNANTS (CENSEUR)
CREATE TABLE IF NOT EXISTS public.presences_enseignants (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL,
  date DATE NOT NULL,
  enseignant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enseignant_nom TEXT NOT NULL,
  matieres_attribuees TEXT,
  statut TEXT NOT NULL CHECK (statut IN ('PRESENT', 'RETARD', 'ABSENCE', 'PERMISSION')),
  motif TEXT,
  heure_arrivee TEXT,
  enregistre_par_id UUID REFERENCES public.profiles(id),
  enregistre_par_nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_enseignant_date_annee UNIQUE (enseignant_id, date, annee_scolaire)
);

ALTER TABLE public.presences_enseignants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestion presences_enseignants Censeur et DG"
  ON public.presences_enseignants FOR ALL
  TO authenticated
  USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'))
  WITH CHECK (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

CREATE POLICY "Lecture presences_enseignants propre compte"
  ON public.presences_enseignants FOR SELECT
  TO authenticated
  USING (enseignant_id = auth.uid() OR public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL', 'SURVEILLANT_GENERAL'));

-- 15. PROFESSEURS PRINCIPAUX (RÈGLE ABSOLUE : 1 ENSEIGNANT = 1 CLASSE PP / 1 CLASSE = 1 PP)
CREATE TABLE IF NOT EXISTS public.professeurs_principaux (
  id TEXT PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  annee_scolaire TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'CLOTURE')),
  date_nomination DATE DEFAULT CURRENT_DATE,
  date_fin DATE,
  motif_fin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RÈGLES ABSOLUES POSTGRESQL :
CREATE UNIQUE INDEX IF NOT EXISTS idx_pp_unique_enseignant_annee_actif 
  ON public.professeurs_principaux (profile_id, annee_scolaire) 
  WHERE statut = 'ACTIF';

CREATE UNIQUE INDEX IF NOT EXISTS idx_pp_unique_classe_annee_actif 
  ON public.professeurs_principaux (classe_id, annee_scolaire) 
  WHERE statut = 'ACTIF';

ALTER TABLE public.professeurs_principaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture professeurs_principaux" ON public.professeurs_principaux FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion PP Censeur et Concepteur" ON public.professeurs_principaux FOR ALL TO authenticated USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR'));`;

  const additiveMigrationSql = `-- ====================================================================
-- GOGBO NOTES V2 — MIGRATION ADDITIVE DE COMPLÉTUDE
-- CEG GOGBO (Année Scolaire Active : 2026–2027)
-- Fichier source : /supabase/migrations/20261013_additive_schema_and_tables.sql
-- STRICTEMENT ADDITIVE : AUCUN DROP, AUCUN TRUNCATE, AUCUN DELETE
-- ====================================================================

-- Tables Discipline & Vie Scolaire
CREATE TABLE IF NOT EXISTS public.presences (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  eleve_id TEXT NOT NULL,
  date DATE NOT NULL,
  statut TEXT NOT NULL DEFAULT 'PRESENT',
  motif TEXT,
  justifie BOOLEAN DEFAULT false,
  heure_retard TEXT,
  enregistre_par_id TEXT NOT NULL,
  enregistre_par_nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notes_conduite (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  periode_id TEXT NOT NULL REFERENCES public.periodes(id) ON DELETE RESTRICT,
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  eleve_id TEXT NOT NULL,
  note NUMERIC(4, 2) NOT NULL CHECK (note >= 0 AND note <= 20),
  appreciation TEXT NOT NULL,
  saisi_par_id TEXT NOT NULL,
  saisi_par_nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_note_conduite_eleve_periode UNIQUE (eleve_id, periode_id, annee_scolaire)
);

CREATE TABLE IF NOT EXISTS public.punitions_scolaires (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  eleve_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  categorie_faute TEXT NOT NULL,
  faute_motif TEXT NOT NULL,
  punition_appliquee TEXT NOT NULL,
  auteur_id TEXT NOT NULL,
  auteur_nom TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.sanctions_disciplinaires (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  eleve_id TEXT NOT NULL,
  nature_decision TEXT NOT NULL,
  motif TEXT NOT NULL,
  autorite_decision TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'VALIDEE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Tables Finances (Comptable)
CREATE TABLE IF NOT EXISTS public.contributions (
  id TEXT PRIMARY KEY,
  libelle TEXT NOT NULL,
  montant_prevu NUMERIC(10, 2) NOT NULL,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  statut TEXT NOT NULL DEFAULT 'ACTIF'
);

CREATE TABLE IF NOT EXISTS public.paiements_contributions (
  id TEXT PRIMARY KEY,
  numero_recu TEXT NOT NULL UNIQUE,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  eleve_id TEXT NOT NULL,
  classe_id TEXT NOT NULL REFERENCES public.classes(id),
  tranche TEXT NOT NULL,
  montant_paye NUMERIC(10, 2) NOT NULL,
  reste_a_payer NUMERIC(10, 2) NOT NULL,
  statut_paiement TEXT NOT NULL,
  mode_paiement TEXT NOT NULL,
  enregistre_par_nom TEXT NOT NULL,
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS public.depenses_budgetaires (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  libelle TEXT NOT NULL,
  montant_depense NUMERIC(10, 2) NOT NULL,
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  beneficiaire TEXT NOT NULL
);

-- Tables Parents & Notifications
CREATE TABLE IF NOT EXISTS public.parents (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT NOT NULL UNIQUE,
  email TEXT
);

CREATE TABLE IF NOT EXISTS public.parent_eleves (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  eleve_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.parent_notifications (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  eleve_id TEXT NOT NULL,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT false,
  date_envoi TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);`;

  const seedSql = `-- Initialisation des 28 Classes Officielles et Matières
-- Fichier source : /supabase/seed.sql
INSERT INTO public.classes (id, nom, niveau, serie, effectif_max) VALUES
  ('cls-6a', '6ème A', '6ème', 'Générale', 100),
  ('cls-6b', '6ème B', '6ème', 'Générale', 100),
  -- (28 classes au total : 16 au Premier Cycle, 12 au Second Cycle)
  ('cls-td', 'Terminale D', 'Terminale', 'D', 100)
ON CONFLICT (id) DO NOTHING;`;

  const handleCopy = () => {
    const textToCopy = tab === 'schema' ? schemaSql : tab === 'additive' ? additiveMigrationSql : seedSql;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">
                Architecture SQL & Sécurité RLS Supabase
              </h3>
              <p className="text-[11px] text-slate-300">
                Schéma PostgreSQL officiel avec politiques d'accès Row Level Security
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Onglets, statut et bouton copier */}
        <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-2 justify-between items-center">
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setTab('schema')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                tab === 'schema' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              1. schema.sql (Base RLS)
            </button>
            <button
              onClick={() => setTab('additive')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                tab === 'additive' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              2. Migration Additive 2026 (Tous Modules)
            </button>
            <button
              onClick={() => setTab('seed')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                tab === 'seed' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              3. seed.sql (Données Initiales)
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Test en cours...' : 'Tester Connexion'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded text-xs font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copied ? 'Copié !' : 'Copier SQL'}</span>
            </button>
          </div>
        </div>

        {/* Diagnostic de connexion Supabase en direct */}
        {testResult && (
          <div className={`px-5 py-2.5 text-xs border-b flex items-center justify-between ${
            testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center space-x-2">
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-medium">{testResult.message}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {configStatus.isConfigured ? `URL: ${configStatus.url}` : 'Env: Variables non définies'}
            </span>
          </div>
        )}

        {/* Code SQL */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 text-emerald-300 font-mono text-[11px] leading-relaxed">
          <pre className="whitespace-pre-wrap">
            {tab === 'schema' ? schemaSql : tab === 'additive' ? additiveMigrationSql : seedSql}
          </pre>
        </div>

        {/* Pied de page */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
          <span>
            {tab === 'additive' 
              ? 'Fichier additif sans destruction : /supabase/migrations/20261013_additive_schema_and_tables.sql' 
              : 'Fichiers disponibles dans le projet : /supabase/schema.sql & /supabase/seed.sql'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
