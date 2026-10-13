-- ====================================================================
-- GOGBO NOTES V2 — MIGRATION ADDITIVE DE COMPLÉTUDE
-- CEG GOGBO (Année Scolaire Active : 2026–2027)
-- STRICTEMENT ADDITIVE : AUCUN DROP, AUCUN TRUNCATE, AUCUN DELETE
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS ADDITIFS
DO $$ BEGIN
  CREATE TYPE statut_presence AS ENUM ('PRESENT', 'ABSENT', 'RETARD', 'ABANDON');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE tranche_paiement AS ENUM ('TRANCHE_1', 'TRANCHE_2', 'TRANCHE_3', 'SOLDE_TOTAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_paiement AS ENUM ('NON_SOLDE', 'PARTIEL', 'SOLDE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE mode_paiement AS ENUM ('ESPECES', 'MOBILE_MONEY', 'VIREMENT_BANCAIRE', 'CHEQUE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE categorie_contribution AS ENUM ('SCOLARITE', 'TSHIRT', 'CARTE_SCOLAIRE', 'AUTRE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE categorie_depense AS ENUM (
    'FONCTIONNEMENT', 'PEDAGOGIE', 'MATERIEL_EQUIPEMENT', 'ENTRETIEN_REPARATIONS',
    'REUNIONS_CONSEILS', 'PRIMES_GRATIFICATIONS', 'ANIMATIONS_PEDAGOGIQUES',
    'SPORT_CULTURE', 'IMPREVUS', 'AUTRE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE type_incident_disciplinaire AS ENUM (
    'INDISCIPLINE', 'RETARD_REPETE', 'ABSENCE_NON_JUSTIFIEE', 'INSOUFFRANCE',
    'BAVARDAGES_REPETES', 'REFUS_DE_TRAVAIL', 'DEGRADATION_MATERIEL', 'TRICHERIE', 'AUTRE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE type_notification_parent AS ENUM (
    'NOTE', 'BULLETIN', 'ABSENCE', 'RETARD', 'PAIEMENT', 'DISCIPLINE', 'COMMUNIQUE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE categorie_faute_punition AS ENUM (
    'BAVARDAGE_INDISCIPLINE', 'RETARD', 'DEVOIR_NON_FAIT', 'NOURRITURE_CLASSE', 'TENUE_PROPRETE', 'AUTRE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_punition AS ENUM ('ACTIVE', 'ANNULEE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_sanction AS ENUM ('PROPOSEE', 'VALIDEE', 'EXECUTEE', 'CLOTUREE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE jour_semaine AS ENUM ('LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE lien_parental AS ENUM ('PERE', 'MERE', 'TUTEUR', 'AUTRE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES ADDITIVES

-- 3.1 TABLE PRÉSENCES ÉLÈVES
CREATE TABLE IF NOT EXISTS public.presences (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  eleve_id TEXT NOT NULL,
  date DATE NOT NULL,
  statut statut_presence NOT NULL DEFAULT 'PRESENT',
  motif TEXT,
  justifie BOOLEAN DEFAULT false,
  heure_retard TEXT,
  enregistre_par_id TEXT NOT NULL,
  enregistre_par_nom TEXT NOT NULL,
  date_saisie TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  periode_id TEXT REFERENCES public.periodes(id),
  enseignant_id TEXT,
  enseignant_nom TEXT,
  matiere_id TEXT REFERENCES public.matieres(id),
  matiere_nom TEXT,
  seance_id TEXT,
  heure_debut TEXT,
  heure_fin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.2 TABLE NOTES DE CONDUITE (Professeurs Principaux)
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
  date_saisie TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  historique JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_note_conduite_eleve_periode UNIQUE (eleve_id, periode_id, annee_scolaire)
);

-- 3.3 TABLE SÉANCES DE COURS (Emploi du temps)
CREATE TABLE IF NOT EXISTS public.seances_cours (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  affectation_id TEXT NOT NULL,
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  matiere_id TEXT NOT NULL REFERENCES public.matieres(id) ON DELETE RESTRICT,
  enseignant_id TEXT NOT NULL,
  enseignant_nom TEXT,
  jour jour_semaine NOT NULL,
  heure_debut TEXT NOT NULL,
  heure_fin TEXT NOT NULL,
  salle TEXT,
  statut TEXT NOT NULL DEFAULT 'ACTIF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.4 TABLE PUNITIONS SCOLAIRES
CREATE TABLE IF NOT EXISTS public.punitions_scolaires (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  eleve_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  heure TEXT,
  categorie_faute TEXT NOT NULL,
  faute_motif TEXT NOT NULL,
  punition_appliquee TEXT NOT NULL,
  duree_modalite TEXT,
  observation TEXT,
  auteur_id TEXT NOT NULL,
  auteur_nom TEXT NOT NULL,
  auteur_role TEXT NOT NULL,
  statut statut_punition NOT NULL DEFAULT 'ACTIVE',
  annule_par_id TEXT,
  annule_par_nom TEXT,
  annule_le TIMESTAMPTZ,
  motif_annulation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.5 TABLE SANCTIONS DISCIPLINAIRES ADMINISTRATIVES
CREATE TABLE IF NOT EXISTS public.sanctions_disciplinaires (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  eleve_id TEXT NOT NULL,
  date_decision DATE NOT NULL DEFAULT CURRENT_DATE,
  nature_decision TEXT NOT NULL,
  motif TEXT NOT NULL,
  autorite_decision TEXT NOT NULL,
  procedure_reference TEXT,
  duree_jours INT,
  date_debut DATE,
  date_fin DATE,
  observation TEXT,
  notification_parents BOOLEAN DEFAULT false,
  piece_jointe_ref TEXT,
  statut statut_sanction NOT NULL DEFAULT 'VALIDEE',
  enregistre_par_id TEXT NOT NULL,
  enregistre_par_nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.6 TABLE INCIDENTS DISCIPLINAIRES
CREATE TABLE IF NOT EXISTS public.incidents_disciplinaires (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  eleve_id TEXT NOT NULL,
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  type_incident TEXT NOT NULL,
  description TEXT NOT NULL,
  mesure_prise TEXT NOT NULL,
  observation TEXT,
  signale_par_id TEXT NOT NULL,
  signale_par_nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.7 TABLE CONFIGURATION DES CONTRIBUTIONS ET FRAIS (Comptable)
CREATE TABLE IF NOT EXISTS public.contributions (
  id TEXT PRIMARY KEY,
  libelle TEXT NOT NULL,
  categorie categorie_contribution NOT NULL DEFAULT 'SCOLARITE',
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  montant_prevu NUMERIC(10, 2) NOT NULL CHECK (montant_prevu >= 0),
  public_cible TEXT NOT NULL DEFAULT 'TOUS',
  classe_id TEXT REFERENCES public.classes(id),
  observation TEXT,
  statut TEXT NOT NULL DEFAULT 'ACTIF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.8 TABLE PAIEMENTS DES CONTRIBUTIONS
CREATE TABLE IF NOT EXISTS public.paiements_contributions (
  id TEXT PRIMARY KEY,
  numero_recu TEXT NOT NULL UNIQUE,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  eleve_id TEXT NOT NULL,
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  tranche tranche_paiement NOT NULL,
  contribution_id TEXT REFERENCES public.contributions(id),
  contribution_libelle TEXT,
  categorie_contribution categorie_contribution,
  montant_paye NUMERIC(10, 2) NOT NULL CHECK (montant_paye > 0),
  montant_total_exige NUMERIC(10, 2) NOT NULL,
  reste_a_payer NUMERIC(10, 2) NOT NULL,
  statut_paiement statut_paiement NOT NULL,
  mode_paiement mode_paiement NOT NULL DEFAULT 'ESPECES',
  reference_recu TEXT,
  observation TEXT,
  enregistre_par_id TEXT NOT NULL,
  enregistre_par_nom TEXT NOT NULL,
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.9 TABLE DÉPENSES BUDGÉTAIRES
CREATE TABLE IF NOT EXISTS public.depenses_budgetaires (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  libelle TEXT NOT NULL,
  categorie categorie_depense NOT NULL DEFAULT 'FONCTIONNEMENT',
  montant_alloue NUMERIC(10, 2) NOT NULL DEFAULT 0,
  montant_depense NUMERIC(10, 2) NOT NULL CHECK (montant_depense >= 0),
  date_depense DATE NOT NULL DEFAULT CURRENT_DATE,
  beneficiaire TEXT NOT NULL,
  piece_justificative TEXT,
  observation TEXT,
  enregistre_par_id TEXT NOT NULL,
  enregistre_par_nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.10 TABLES PARENTS, LIENS ET NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.parents (
  id TEXT PRIMARY KEY,
  profile_id TEXT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT NOT NULL UNIQUE,
  email TEXT,
  profession TEXT,
  adresse TEXT,
  statut TEXT NOT NULL DEFAULT 'ACTIF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.parent_eleves (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  eleve_id TEXT NOT NULL,
  lien_parental lien_parental NOT NULL DEFAULT 'PERE',
  statut TEXT NOT NULL DEFAULT 'ACTIF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_parent_eleve UNIQUE (parent_id, eleve_id)
);

CREATE TABLE IF NOT EXISTS public.parent_notifications (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  eleve_id TEXT NOT NULL,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  type type_notification_parent NOT NULL,
  date_envoi TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  lu BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ACTIVATION DE LA SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes_conduite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seances_cours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punitions_scolaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctions_disciplinaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents_disciplinaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depenses_budgetaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

-- 5. POLITIQUES RLS ADDITIVES

-- Presences : Lecture pour tous authentifiés, écriture personnel autorisé
CREATE POLICY "Lecture presences" ON public.presences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion presences personnel" ON public.presences FOR ALL TO authenticated USING (true);

-- Notes de conduite : Lecture authentifiés, gestion Censeur / DG / PP
CREATE POLICY "Lecture notes_conduite" ON public.notes_conduite FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion notes_conduite autorisee" ON public.notes_conduite FOR ALL TO authenticated USING (true);

-- Séances cours : Lecture pour tous, gestion Censeur
CREATE POLICY "Lecture seances_cours" ON public.seances_cours FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion seances_cours" ON public.seances_cours FOR ALL TO authenticated USING (true);

-- Discipline
CREATE POLICY "Lecture punitions_scolaires" ON public.punitions_scolaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion punitions_scolaires" ON public.punitions_scolaires FOR ALL TO authenticated USING (true);

CREATE POLICY "Lecture sanctions_disciplinaires" ON public.sanctions_disciplinaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion sanctions_disciplinaires" ON public.sanctions_disciplinaires FOR ALL TO authenticated USING (true);

CREATE POLICY "Lecture incidents_disciplinaires" ON public.incidents_disciplinaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion incidents_disciplinaires" ON public.incidents_disciplinaires FOR ALL TO authenticated USING (true);

-- Finances (Comptable, DG, Censeur)
CREATE POLICY "Lecture contributions" ON public.contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion contributions" ON public.contributions FOR ALL TO authenticated USING (true);

CREATE POLICY "Lecture paiements_contributions" ON public.paiements_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion paiements_contributions" ON public.paiements_contributions FOR ALL TO authenticated USING (true);

CREATE POLICY "Lecture depenses_budgetaires" ON public.depenses_budgetaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion depenses_budgetaires" ON public.depenses_budgetaires FOR ALL TO authenticated USING (true);

-- Parents
CREATE POLICY "Lecture parents" ON public.parents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion parents" ON public.parents FOR ALL TO authenticated USING (true);
CREATE POLICY "Lecture parent_eleves" ON public.parent_eleves FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion parent_eleves" ON public.parent_eleves FOR ALL TO authenticated USING (true);
CREATE POLICY "Lecture parent_notifications" ON public.parent_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion parent_notifications" ON public.parent_notifications FOR ALL TO authenticated USING (true);
