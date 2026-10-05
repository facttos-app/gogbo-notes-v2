-- ====================================================================
-- GOGBO NOTES V2 - SCHÉMA OFFICIEL POSTGRESQL / SUPABASE
-- CEG GOGBO (Commune d'Adjohoun, Arrondissement de Gangban)
-- Architecture : Pluriannuelle Pérenne (2026–2027, 2027–2028, 2028–2029...)
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TYPES ENUM
DO $$ BEGIN
  CREATE TYPE role_admin AS ENUM (
    'CONCEPTEUR',
    'DIRECTEUR_GENERAL',
    'CENSEUR',
    'SURVEILLANT_GENERAL',
    'COMPTABLE',
    'ENSEIGNANT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sexe_eleve AS ENUM ('M', 'F');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_compte AS ENUM ('ACTIF', 'INACTIF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_annee AS ENUM ('CLOTUREE', 'EN_COURS', 'A_VENIR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE langue_option AS ENUM ('AUCUNE', 'ALLEMAND', 'ESPAGNOL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE type_eval AS ENUM (
    'INTERROGATION_1',
    'INTERROGATION_2',
    'INTERROGATION_3',
    'DEVOIR_1',
    'DEVOIR_2',
    'INTERROGATION'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. TABLE ANNÉES SCOLAIRES
CREATE TABLE IF NOT EXISTS public.annees_scolaires (
  id TEXT PRIMARY KEY,
  libelle TEXT NOT NULL UNIQUE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  statut statut_annee NOT NULL DEFAULT 'A_VENIR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLE PROFILES (Personnels, Administrateurs et Enseignants)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  role role_admin NOT NULL DEFAULT 'ENSEIGNANT',
  is_enseignant BOOLEAN NOT NULL DEFAULT true,
  telephone TEXT,
  statut statut_compte NOT NULL DEFAULT 'ACTIF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLE CLASSES (28 classes officielles, max 100 élèves)
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  niveau TEXT NOT NULL,
  serie TEXT,
  effectif_max INT NOT NULL DEFAULT 100 CHECK (effectif_max <= 100),
  salle TEXT,
  statut statut_compte NOT NULL DEFAULT 'ACTIF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABLE MATIERES (minimum 11 matières officielles)
CREATE TABLE IF NOT EXISTS public.matieres (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  coefficient INT NOT NULL DEFAULT 2 CHECK (coefficient > 0),
  statut statut_compte NOT NULL DEFAULT 'ACTIF',
  is_langue_option BOOLEAN NOT NULL DEFAULT false,
  categorie TEXT NOT NULL DEFAULT 'GENERALE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLE ELEVES (Identité permanente de l'élève)
CREATE TABLE IF NOT EXISTS public.eleves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricule TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  sexe sexe_eleve NOT NULL,
  date_naissance DATE,
  lieu_naissance TEXT,
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  langue_vivante_2 langue_option NOT NULL DEFAULT 'AUCUNE',
  nom_parent TEXT,
  contact_parent TEXT,
  statut statut_compte NOT NULL DEFAULT 'ACTIF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABLE INSCRIPTIONS ANNUELLES DES ÉLÈVES (Pilier de l'architecture pluriannuelle)
-- Permet de conserver l'historique complet d'un élève : Jean en 6ème A (2026-2027), puis 5ème A (2027-2028)...
CREATE TABLE IF NOT EXISTS public.inscriptions_eleves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE RESTRICT,
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  annee_scolaire TEXT NOT NULL,
  statut statut_compte NOT NULL DEFAULT 'ACTIF',
  date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,
  redoublant BOOLEAN NOT NULL DEFAULT false,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_inscription_eleve_annee UNIQUE (eleve_id, annee_scolaire)
);

-- 9. TABLE PERIODES (Trimestres / Semestres rattachés à une année scolaire)
CREATE TABLE IF NOT EXISTS public.periodes (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  code TEXT NOT NULL,
  nom TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. TABLE ATTRIBUTIONS DE CLASSE (Affectations Pédagogiques Pluriannuelles)
-- Rattachées strictement à l'année scolaire pour éviter tout conflit ou écrasement
CREATE TABLE IF NOT EXISTS public.affectations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  matiere_id TEXT NOT NULL REFERENCES public.matieres(id) ON DELETE RESTRICT,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  heures_hebdo INT NOT NULL DEFAULT 4 CHECK (heures_hebdo > 0),
  statut statut_compte NOT NULL DEFAULT 'ACTIF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_affectation_annee UNIQUE (profile_id, classe_id, matiere_id, annee_scolaire)
);

-- 11. TABLE NOTES (Évaluations officielles avec isolation pluriannuelle)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE RESTRICT,
  affectation_id UUID NOT NULL REFERENCES public.affectations(id) ON DELETE RESTRICT,
  periode_id TEXT NOT NULL REFERENCES public.periodes(id) ON DELETE RESTRICT,
  annee_scolaire TEXT NOT NULL DEFAULT '2026–2027',
  valeur NUMERIC(4, 2) NOT NULL CHECK (valeur >= 0 AND valeur <= 20),
  type_evaluation type_eval NOT NULL DEFAULT 'DEVOIR_1',
  saisi_par UUID NOT NULL REFERENCES public.profiles(id),
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_note_eleve_eval UNIQUE (eleve_id, affectation_id, periode_id, type_evaluation)
);

-- 12. TABLE PARAMETRES ECOLE
CREATE TABLE IF NOT EXISTS public.parametres_ecole (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nom_etablissement TEXT NOT NULL DEFAULT 'CEG GOGBO',
  ministere TEXT NOT NULL,
  titre_plateforme TEXT NOT NULL,
  presentation TEXT NOT NULL,
  commune TEXT NOT NULL DEFAULT 'ADJOHOUN',
  arrondissement TEXT NOT NULL DEFAULT 'GANGBAN',
  annee_academique TEXT NOT NULL DEFAULT '2026–2027',
  directeur_nom TEXT,
  censeur_nom TEXT,
  devise TEXT DEFAULT 'Discipline — Travail — Succès',
  contact_email TEXT,
  contact_tel TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. TABLE AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_nom TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  table_cible TEXT NOT NULL,
  record_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. TABLE PRÉSENCE JOURNALIÈRE DES ENSEIGNANTS (Module Censeur)
DO $$ BEGIN
  CREATE TYPE statut_presence_enseignant AS ENUM ('PRESENT', 'RETARD', 'ABSENCE', 'PERMISSION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.presences_enseignants (
  id TEXT PRIMARY KEY,
  annee_scolaire TEXT NOT NULL,
  date DATE NOT NULL,
  enseignant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enseignant_nom TEXT NOT NULL,
  matieres_attribuees TEXT, -- Matières réellement attribuées au moment de la saisie
  statut statut_presence_enseignant NOT NULL DEFAULT 'PRESENT',
  motif TEXT,
  heure_arrivee TEXT,
  enregistre_par_id UUID REFERENCES public.profiles(id),
  enregistre_par_nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_enseignant_date_annee UNIQUE (enseignant_id, date, annee_scolaire)
);

-- 15. TABLE PROFESSEURS PRINCIPAUX (Module Censeur - Règle stricte 1 Enseignant = 1 Classe / 1 Classe = 1 PP)
DO $$ BEGIN
  CREATE TYPE statut_pp AS ENUM ('ACTIF', 'CLOTURE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.professeurs_principaux (
  id TEXT PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classe_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  annee_scolaire TEXT NOT NULL,
  statut statut_pp NOT NULL DEFAULT 'ACTIF',
  date_nomination DATE DEFAULT CURRENT_DATE,
  date_fin DATE,
  motif_fin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- CONTRAINTES STRICTES POSTGRESQL (GARANTIE AU NIVEAU DE LA BASE)
-- ====================================================================
-- RÈGLE 1 : Un enseignant ne peut être Professeur Principal que d'UNE SEULE classe active par année
CREATE UNIQUE INDEX IF NOT EXISTS idx_pp_unique_enseignant_annee_actif 
  ON public.professeurs_principaux (profile_id, annee_scolaire) 
  WHERE statut = 'ACTIF';

-- RÈGLE 2 : Une classe ne peut avoir qu'UN SEUL Professeur Principal actif par année
CREATE UNIQUE INDEX IF NOT EXISTS idx_pp_unique_classe_annee_actif 
  ON public.professeurs_principaux (classe_id, annee_scolaire) 
  WHERE statut = 'ACTIF';

-- ====================================================================
-- RLS (ROW LEVEL SECURITY) POLICIES - SÉCURITÉ PLURIANNUELLE ÉTANCHE
-- ====================================================================

ALTER TABLE public.annees_scolaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscriptions_eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametres_ecole ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presences_enseignants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professeurs_principaux ENABLE ROW LEVEL SECURITY;

-- Helper function: Récupérer le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS role_admin AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: Vérifier si une année scolaire est active et non clôturée
CREATE OR REPLACE FUNCTION public.is_annee_scolaire_active(p_annee TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_active FROM public.annees_scolaires WHERE libelle = p_annee), true);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ANNÉES SCOLAIRES
CREATE POLICY "Lecture annees_scolaires pour tous les connectes"
  ON public.annees_scolaires FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Gestion annees_scolaires Censeur et DG"
  ON public.annees_scolaires FOR ALL
  TO authenticated
  USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

-- PROFILES Policies
CREATE POLICY "Lecture profiles par utilisateurs connectes"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Censeur et DG peuvent administrer les profils"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

-- CLASSES, MATIERES, PERIODES
CREATE POLICY "Lecture classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion classes Censeur" ON public.classes FOR ALL TO authenticated USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

CREATE POLICY "Lecture matieres" ON public.matieres FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion matieres Censeur" ON public.matieres FOR ALL TO authenticated USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

CREATE POLICY "Lecture periodes" ON public.periodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion periodes Censeur" ON public.periodes FOR ALL TO authenticated USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

-- ELEVES & INSCRIPTIONS ANNUELLES
CREATE POLICY "Lecture eleves" ON public.eleves FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion eleves Censeur et DG" ON public.eleves FOR ALL TO authenticated USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

CREATE POLICY "Lecture inscriptions" ON public.inscriptions_eleves FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion inscriptions Censeur et DG" ON public.inscriptions_eleves FOR ALL TO authenticated USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

-- ATTRIBUTIONS DE CLASSE (AFFECTATIONS)
CREATE POLICY "Lecture affectations" ON public.affectations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion affectations Censeur" ON public.affectations FOR ALL TO authenticated USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

-- ====================================================================
-- RLS DES NOTES : PRINCIPE STRICT D'ATTRIBUTION & ANNÉE NON CLÔTURÉE
-- ====================================================================

-- 1. Lecture des notes :
--    - Le Censeur, le DG et le SG peuvent consulter toutes les notes (y compris archives)
--    - L'enseignant peut consulter les notes liées à ses affectations
CREATE POLICY "Lecture notes securisee"
  ON public.notes FOR SELECT
  TO authenticated
  USING (
    public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL', 'SURVEILLANT_GENERAL')
    OR
    EXISTS (
      SELECT 1 FROM public.affectations a
      WHERE a.id = notes.affectation_id
        AND a.profile_id = auth.uid()
    )
  );

-- 2. Saisie et modification des notes :
--    - UNIQUEMENT par le titulaire de l'attribution active pour cette année !
--    - La période ne doit PAS être verrouillée !
--    - L'année scolaire ne doit PAS être clôturée !
CREATE POLICY "Insertion notes reservee au titulaire d attribution"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.affectations a
      JOIN public.periodes p ON p.id = notes.periode_id
      JOIN public.annees_scolaires an ON an.libelle = p.annee_scolaire
      WHERE a.id = notes.affectation_id
        AND a.profile_id = auth.uid()
        AND a.statut = 'ACTIF'
        AND p.is_locked = false
        AND an.is_active = true
        AND an.statut = 'EN_COURS'
    )
  );

CREATE POLICY "Modification notes reservee au titulaire d attribution"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.affectations a
      JOIN public.periodes p ON p.id = notes.periode_id
      JOIN public.annees_scolaires an ON an.libelle = p.annee_scolaire
      WHERE a.id = notes.affectation_id
        AND a.profile_id = auth.uid()
        AND a.statut = 'ACTIF'
        AND p.is_locked = false
        AND an.is_active = true
        AND an.statut = 'EN_COURS'
    )
  );

-- PARAMETRES & AUDIT LOGS
CREATE POLICY "Lecture parametres" ON public.parametres_ecole FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modification parametres Censeur et DG" ON public.parametres_ecole FOR ALL TO authenticated USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

CREATE POLICY "Lecture audit logs pour Censeur et DG"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

CREATE POLICY "Insertion audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ====================================================================
-- POLITIQUES RLS : PRÉSENCE JOURNALIÈRE DES ENSEIGNANTS
-- ====================================================================

-- 1. Consultation des présences :
--    - Censeur, DG, SG, Concepteur peuvent consulter toutes les présences
--    - Chaque enseignant peut voir ses propres présences/retards/absences
CREATE POLICY "Lecture presences_enseignants securisee"
  ON public.presences_enseignants FOR SELECT
  TO authenticated
  USING (
    public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL', 'SURVEILLANT_GENERAL')
    OR enseignant_id = auth.uid()
  );

-- 2. Insertion, mise à jour et suppression :
--    - STRICTEMENT RÉSERVÉES AU CENSEUR, DG ET CONCEPTEUR !
--    - Les enseignants ne peuvent JAMAIS modifier les enregistrements de présence
CREATE POLICY "Gestion presences_enseignants reservee Censeur et DG"
  ON public.presences_enseignants FOR ALL
  TO authenticated
  USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'))
  WITH CHECK (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL'));

-- ====================================================================
-- POLITIQUES RLS : PROFESSEURS PRINCIPAUX (PP)
-- ====================================================================

-- 1. Consultation des professeurs principaux :
CREATE POLICY "Lecture professeurs_principaux pour tous les connectes"
  ON public.professeurs_principaux FOR SELECT
  TO authenticated
  USING (true);

-- 2. Gestion des attributions PP (Censeur et Concepteur) :
CREATE POLICY "Gestion professeurs_principaux Censeur et Concepteur"
  ON public.professeurs_principaux FOR ALL
  TO authenticated
  USING (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR'))
  WITH CHECK (public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR'));

-- 3. Autorisation spéciale pour le PP actif d'inscrire des élèves dans SA classe :
CREATE POLICY "PP peut inscrire des apprenants dans sa classe"
  ON public.inscriptions_eleves FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_role() IN ('CONCEPTEUR', 'CENSEUR', 'DIRECTEUR_GENERAL')
    OR
    EXISTS (
      SELECT 1 FROM public.professeurs_principaux pp
      WHERE pp.profile_id = auth.uid()
        AND pp.classe_id = inscriptions_eleves.classe_id
        AND pp.annee_scolaire = inscriptions_eleves.annee_scolaire
        AND pp.statut = 'ACTIF'
    )
  );

-- Index d'optimisation
CREATE INDEX IF NOT EXISTS idx_inscriptions_eleve_annee ON public.inscriptions_eleves(eleve_id, annee_scolaire);
CREATE INDEX IF NOT EXISTS idx_inscriptions_classe_annee ON public.inscriptions_eleves(classe_id, annee_scolaire);
CREATE INDEX IF NOT EXISTS idx_affectations_annee ON public.affectations(annee_scolaire);
CREATE INDEX IF NOT EXISTS idx_notes_annee ON public.notes(annee_scolaire);
CREATE INDEX IF NOT EXISTS idx_periodes_annee ON public.periodes(annee_scolaire);
CREATE INDEX IF NOT EXISTS idx_presences_enseignants_date ON public.presences_enseignants(date);
CREATE INDEX IF NOT EXISTS idx_presences_enseignants_annee ON public.presences_enseignants(annee_scolaire);
CREATE INDEX IF NOT EXISTS idx_presences_enseignants_enseignant ON public.presences_enseignants(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_pp_annee ON public.professeurs_principaux(annee_scolaire);
CREATE INDEX IF NOT EXISTS idx_pp_profile ON public.professeurs_principaux(profile_id);
CREATE INDEX IF NOT EXISTS idx_pp_classe ON public.professeurs_principaux(classe_id);

