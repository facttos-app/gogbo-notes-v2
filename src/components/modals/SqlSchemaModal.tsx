import React, { useState } from 'react';
import { FileText, Copy, Check, X, Shield, Database } from 'lucide-react';

interface SqlSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlSchemaModal: React.FC<SqlSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'schema' | 'seed'>('schema');

  if (!isOpen) return null;

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

  const seedSql = `-- Initialisation des 28 Classes Officielles et Matières
-- Fichier source : /supabase/seed.sql
INSERT INTO public.classes (id, nom, niveau, serie, effectif_max) VALUES
  ('cls-6a', '6ème A', '6ème', 'Générale', 100),
  ('cls-6b', '6ème B', '6ème', 'Générale', 100),
  -- (28 classes au total : 16 au Premier Cycle, 12 au Second Cycle)
  ('cls-td', 'Terminale D', 'Terminale', 'D', 100)
ON CONFLICT (id) DO NOTHING;`;

  const handleCopy = () => {
    const textToCopy = tab === 'schema' ? schemaSql : seedSql;
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

        {/* Onglets et bouton copier */}
        <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
          <div className="flex space-x-2 text-xs font-semibold">
            <button
              onClick={() => setTab('schema')}
              className={`px-3 py-1.5 rounded-md ${
                tab === 'schema' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-slate-700'
              }`}
            >
              schema.sql (Tables & Politiques RLS)
            </button>
            <button
              onClick={() => setTab('seed')}
              className={`px-3 py-1.5 rounded-md ${
                tab === 'seed' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white text-slate-700'
              }`}
            >
              seed.sql (Données Initiales)
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded text-xs font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copié !' : 'Copier SQL'}</span>
          </button>
        </div>

        {/* Code SQL */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 text-emerald-300 font-mono text-[11px] leading-relaxed">
          <pre className="whitespace-pre-wrap">{tab === 'schema' ? schemaSql : seedSql}</pre>
        </div>

        {/* Pied de page */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
          <span>Fichiers disponibles dans le projet : <code>/supabase/schema.sql</code> & <code>/supabase/seed.sql</code></span>
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
