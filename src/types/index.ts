export type RoleAdmin = 
  | 'CONCEPTEUR'
  | 'DIRECTEUR_GENERAL'
  | 'CENSEUR'
  | 'SURVEILLANT_GENERAL'
  | 'COMPTABLE'
  | 'ENSEIGNANT'
  | 'PARENT';

export type Sexe = 'M' | 'F';

export type StatutCompte = 'ACTIF' | 'INACTIF';

export type CodePeriode = 'T1' | 'T2' | 'T3' | 'S1' | 'S2';

export type LangueOption = 'AUCUNE' | 'ALLEMAND' | 'ESPAGNOL';

export interface UserProfile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: RoleAdmin;
  is_enseignant: boolean; // Directeur, Censeur, SG ou Comptable peuvent aussi enseigner
  telephone?: string;
  adresse?: string; // Résidence / Adresse
  matiere?: string; // Matière / Discipline
  statut: StatutCompte;
  created_at: string;
  updated_at: string;
}

export interface EnseignantProfile {
  id: string;
  profile_id: string;
  matricule_prof: string;
  specialite: string;
  diplome?: string;
  created_at: string;
}

export interface Classe {
  id: string;
  nom: string; // e.g. "6ème A", "3ème B", "Terminale D"
  niveau: '6ème' | '5ème' | '4ème' | '3ème' | 'Seconde' | 'Première' | 'Terminale';
  serie?: 'A' | 'AB' | 'C' | 'D' | 'Scientifique' | 'Littéraire' | 'Générale';
  effectif_max: number; // Always 100 max
  salle?: string;
  annee_scolaire?: string;
  statut?: StatutCompte;
}

export interface Matiere {
  id: string;
  code: string;
  nom: string;
  coefficient: number;
  statut: StatutCompte;
  is_langue_option: boolean; // Allemand / Espagnol
  categorie: 'LITTERAIRE' | 'SCIENTIFIQUE' | 'GENERALE' | 'CONDUITE';
  annee_scolaire?: string;
}

export interface CoefficientClasse {
  id: string;
  annee_scolaire: string;
  classe_id: string;
  matiere_id: string;
  coefficient: number;
  updated_at?: string;
}

export interface Eleve {
  id: string;
  matricule: string; // Unique
  nom: string;
  prenom: string;
  sexe: Sexe;
  date_naissance: string; // YYYY-MM-DD
  lieu_naissance?: string;
  classe_id: string; // Classe courante / par défaut
  langue_vivante_2: LangueOption;
  nom_parent?: string;
  contact_parent?: string;
  statut: StatutCompte;
  created_at: string;
  updated_at: string;
}

export interface InscriptionEleve {
  id: string;
  eleve_id: string;
  classe_id: string;
  annee_scolaire: string; // Ex: "2026–2027", "2027–2028"
  statut: StatutCompte;
  date_inscription: string;
  redoublant?: boolean;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnneeScolaire {
  id: string;
  libelle: string; // Ex: "2026–2027", "2027–2028", "2028–2029"
  date_debut: string;
  date_fin: string;
  is_active: boolean;
  statut: 'CLOTUREE' | 'EN_COURS' | 'A_VENIR';
  created_at: string;
}

export interface Periode {
  id: string;
  annee_scolaire: string; // "2026–2027"
  code: CodePeriode;
  nom: string; // "1er trimestre", "2ème trimestre", "3ème trimestre"
  is_active: boolean;
  is_locked: boolean; // Verrouillage par le Censeur
  date_debut: string;
  date_fin: string;
}

export type PeriodeScolaire = Periode;

export interface AffectationPedagogique {
  id: string;
  profile_id: string; // L'utilisateur enseignant (ou Censeur/DG qui enseigne)
  classe_id: string;
  matiere_id: string;
  annee_scolaire: string; // Ex: "2026–2027", "2027–2028"
  heures_hebdo: number;
  statut: StatutCompte;
  created_at: string;
  updated_at: string;
}

// Alias officiel conformément aux directives V2 : « Attribution de classe »
export type AttributionClasse = AffectationPedagogique;

export type TypeEvaluation = 
  | 'INTERROGATION_1' 
  | 'INTERROGATION_2' 
  | 'INTERROGATION_3' 
  | 'DEVOIR_1' 
  | 'DEVOIR_2' 
  | 'INTERROGATION';

export interface Note {
  id: string;
  eleve_id: string;
  affectation_id: string;
  periode_id: string;
  annee_scolaire?: string; // Rattachée directement à l'année scolaire
  valeur: number; // 0 à 20
  type_evaluation: TypeEvaluation;
  saisi_par: string; // User ID
  observation?: string;
  created_at: string;
  updated_at: string;
}

export interface NoteSyntheseMatiere {
  matiere_id: string;
  matiere_nom: string;
  matiere_code: string;
  coefficient: number;
  notes: Note[];
  interro_1: number | null;
  interro_2: number | null;
  interro_3: number | null;
  moyenne_interros: number | null;
  devoir_1: number | null;
  devoir_2: number | null;
  moyenne: number | null;
  points: number | null;
  appreciation: string;
}

export interface BulletinEleve {
  eleve: Eleve;
  classe: Classe;
  periode: Periode;
  matieres_notes: NoteSyntheseMatiere[];
  total_points: number;
  total_coefficients: number;
  moyenne_generale: number | null;
  appreciation_generale: string;
  rang?: number;
  rang_label?: string; // "1er", "2ème", etc.
  effectif_classe: number;
  observation_directeur?: string;
  total_absences?: number;
  est_abandon?: boolean;
  note_conduite?: number | null;
  appreciation_conduite?: string;
}

export interface ResultatClassementEleve {
  rang: number;
  rang_label: string;
  eleve_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  classe_id: string;
  classe_nom: string;
  total_points: number;
  total_coefficients: number;
  moyenne_generale: number | null;
  appreciation: string;
  ex_aequo: boolean;
}

export interface BulletinAnnuelEleve {
  eleve: Eleve;
  classe: Classe;
  annee_scolaire: string;
  mg_semestre_1: number | null;
  mg_semestre_2: number | null;
  moyenne_annuelle: number | null;
  rang_annuel?: number;
  rang_annuel_label?: string;
  appreciation_annuelle: string;
  statut_annuel?: string;
  effectif_classe: number;
  observation_directeur?: string;
}

export interface ResultatClassementAnnuel {
  rang: number;
  rang_label: string;
  eleve_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  classe_id: string;
  classe_nom: string;
  mg_semestre_1: number | null;
  mg_semestre_2: number | null;
  moyenne_annuelle: number | null;
  appreciation_annuelle: string;
  ex_aequo: boolean;
}

export interface ParametresEcole {
  nom_etablissement: string;
  ministere: string;
  titre_plateforme: string;
  presentation: string;
  commune: string;
  arrondissement: string;
  annee_academique: string;
  directeur_nom: string;
  censeur_nom: string;
  devise: string;
  contact_email: string;
  contact_tel: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_nom: string;
  user_role: RoleAdmin;
  action: string;
  table_cible: string;
  record_id?: string;
  details?: string;
  created_at: string;
}

export type StatutPresence = 'PRESENT' | 'ABSENT' | 'RETARD' | 'ABANDON';

export interface EnregistrementPresence {
  id: string;
  annee_scolaire: string; // Ex: "2026–2027"
  classe_id: string;
  eleve_id: string;
  date: string; // YYYY-MM-DD
  statut: StatutPresence;
  motif?: string;
  justifie?: boolean;
  heure_retard?: string;
  enregistre_par_id: string;
  enregistre_par_nom: string;
  date_saisie: string;
  periode_id?: string;
  // Attributs pour présence et absences par cours / séance
  enseignant_id?: string;
  enseignant_nom?: string;
  matiere_id?: string;
  matiere_nom?: string;
  seance_id?: string;
  heure_debut?: string;
  heure_fin?: string;
  created_at: string;
  updated_at: string;
}

export type TranchePaiement = 'TRANCHE_1' | 'TRANCHE_2' | 'TRANCHE_3' | 'SOLDE_TOTAL';
export type StatutPaiement = 'NON_SOLDE' | 'PARTIEL' | 'SOLDE';
export type ModePaiement = 'ESPECES' | 'MOBILE_MONEY' | 'VIREMENT_BANCAIRE' | 'CHEQUE';
export type CategorieContribution = 'SCOLARITE' | 'TSHIRT' | 'CARTE_SCOLAIRE' | 'AUTRE';

export interface ContributionConfig {
  id: string;
  libelle: string; // Ex: "Contribution scolaire", "T-shirt / tenue de sport", "Carte scolaire"
  categorie: CategorieContribution;
  annee_scolaire: string; // Ex: "2026–2027"
  montant_prevu: number; // Montant exigé par apprenant (saisi par le Comptable)
  public_cible: 'TOUS' | 'PREMIER_CYCLE' | 'SECOND_CYCLE' | string; // Classe spécifique ou 'TOUS'
  classe_id?: string; // Si restreint à une classe
  observation?: string;
  statut: StatutCompte;
  created_at: string;
  updated_at: string;
}

export type CategorieDepense = 
  | 'FONCTIONNEMENT'
  | 'PEDAGOGIE'
  | 'MATERIEL_EQUIPEMENT'
  | 'ENTRETIEN_REPARATIONS'
  | 'REUNIONS_CONSEILS'
  | 'PRIMES_GRATIFICATIONS'
  | 'ANIMATIONS_PEDAGOGIQUES'
  | 'SPORT_CULTURE'
  | 'IMPREVUS'
  | 'AUTRE';

export interface DepenseBudgetaire {
  id: string;
  annee_scolaire: string;
  libelle: string; // Libellé de la dépense
  categorie: CategorieDepense;
  montant_alloue: number; // Montant prévu / budget alloué
  montant_depense: number; // Montant réel dépensé
  date_depense: string; // YYYY-MM-DD
  beneficiaire: string; // Prestataire, enseignant, fournisseur
  piece_justificative?: string; // N° facture, reçu, bon de commande
  observation?: string;
  enregistre_par_id: string;
  enregistre_par_nom: string;
  created_at: string;
  updated_at: string;
}

export interface PaiementContribution {
  id: string;
  numero_recu: string;
  annee_scolaire: string; // Ex: "2026–2027"
  eleve_id: string;
  classe_id: string;
  tranche: TranchePaiement;
  contribution_id?: string;
  contribution_libelle?: string;
  categorie_contribution?: CategorieContribution;
  montant_paye: number;
  montant_total_exige: number;
  reste_a_payer: number;
  statut_paiement: StatutPaiement;
  mode_paiement: ModePaiement;
  reference_recu?: string;
  observation?: string;
  enregistre_par_id: string;
  enregistre_par_nom: string;
  date_paiement: string;
  created_at: string;
  updated_at: string;
}

// ====================================================================
// MODULE : PRÉSENCE JOURNALIÈRE DES ENSEIGNANTS (RÉSERVÉ AU CENSEUR)
// ====================================================================
export type StatutPresenceEnseignant = 'PRESENT' | 'RETARD' | 'ABSENCE' | 'PERMISSION';

export interface PresenceEnseignant {
  id: string;
  annee_scolaire: string; // Ex: "2026–2027"
  date: string; // YYYY-MM-DD
  enseignant_id: string;
  enseignant_nom: string;
  matieres_attribuees?: string; // Matières attribuées au moment de la saisie (conservation historique fidèle)
  statut: StatutPresenceEnseignant;
  motif?: string; // Maladie, Permission administrative, Mission, Raisons personnelles, Retard justifié, Autre ou texte libre
  heure_arrivee?: string; // Ex: "07:45", "08:15" (notamment pour retard)
  enregistre_par_id: string;
  enregistre_par_nom: string;
  created_at: string;
  updated_at: string;
}

// ====================================================================
// MODULE : PROFESSEURS PRINCIPAUX (RÉSERVÉ AU CENSEUR)
// ====================================================================
export type StatutProfesseurPrincipal = 'ACTIF' | 'CLOTURE';

export interface ProfesseurPrincipal {
  id: string;
  profile_id: string;
  classe_id: string;
  annee_scolaire: string; // Ex: "2026–2027"
  statut: StatutProfesseurPrincipal;
  date_nomination?: string;
  date_fin?: string;
  motif_fin?: string;
  created_at: string;
  updated_at: string;
}

// ====================================================================
// MODULE : ESPACE PARENTS D'ÉLÈVES
// ====================================================================
export type LienParental = 'PERE' | 'MERE' | 'TUTEUR' | 'AUTRE';

export interface ParentProfile {
  id: string;
  profile_id?: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  profession?: string;
  adresse?: string;
  statut: StatutCompte;
  created_at: string;
  updated_at: string;
}

export interface ParentEleve {
  id: string;
  parent_id: string;
  eleve_id: string;
  lien_parental: LienParental;
  statut: StatutCompte;
  created_at: string;
  updated_at: string;
}

// ====================================================================
// MODULE : DISCIPLINE & VIE SCOLAIRE (SURVEILLANT GÉNÉRAL)
// ====================================================================
export type TypeIncidentDisciplinaire = 
  | 'INDISCIPLINE'
  | 'RETARD_REPETE'
  | 'ABSENCE_NON_JUSTIFIEE'
  | 'INSOUFFRANCE'
  | 'BAVARDAGES_REPETES'
  | 'REFUS_DE_TRAVAIL'
  | 'DEGRADATION_MATERIEL'
  | 'TRICHERIE'
  | 'AUTRE';

export interface IncidentDisciplinaire {
  id: string;
  annee_scolaire: string; // Ex: "2026–2027"
  date: string; // YYYY-MM-DD
  eleve_id: string;
  classe_id: string;
  type_incident: TypeIncidentDisciplinaire | string;
  description: string;
  mesure_prise: string; // Ex: "Avertissement verbal", "Blâme", "Corvée d'intérêt général", "Convocation des parents", "Exclusion temporaire"
  observation?: string;
  signale_par_id: string;
  signale_par_nom: string;
  created_at: string;
  updated_at: string;
}

// ====================================================================
// MODULE : NOTIFICATIONS PARENTS
// ====================================================================
export type TypeNotificationParent = 
  | 'NOTE' 
  | 'BULLETIN' 
  | 'ABSENCE' 
  | 'RETARD' 
  | 'PAIEMENT' 
  | 'DISCIPLINE' 
  | 'COMMUNIQUE';

export interface NotificationParent {
  id: string;
  parent_id: string;
  eleve_id: string;
  annee_scolaire: string;
  titre: string;
  message: string;
  type: TypeNotificationParent;
  date_envoi: string;
  lu: boolean;
  created_at: string;
}

// ====================================================================
// MODULE : NOTE DE CONDUITE (ATTRIBUTION STRICTE AU PROFESSEUR PRINCIPAL)
// ====================================================================
export interface NoteConduiteHistorique {
  ancienne_note: number;
  nouvelle_note: number;
  modifie_par_id: string;
  modifie_par_nom: string;
  date: string;
  motif?: string;
}

export interface NoteConduite {
  id: string;
  annee_scolaire: string; // Ex: "2026–2027"
  periode_id: string;
  classe_id: string;
  eleve_id: string;
  note: number; // 0 à 20
  appreciation: string;
  saisi_par_id: string;
  saisi_par_nom: string;
  date_saisie: string;
  historique?: NoteConduiteHistorique[];
  created_at: string;
  updated_at: string;
}

// ====================================================================
// MODULE : PUNITIONS SCOLAIRES QUOTIDIENNES (OUVERT À TOUT LE PERSONNEL)
// ====================================================================
export type CategorieFautePunition = 
  | 'BAVARDAGE_INDISCIPLINE'
  | 'RETARD'
  | 'DEVOIR_NON_FAIT'
  | 'NOURRITURE_CLASSE'
  | 'TENUE_PROPRETE'
  | 'AUTRE';

export type StatutPunition = 'ACTIVE' | 'ANNULEE';

export interface PunitionScolaire {
  id: string;
  annee_scolaire: string;
  classe_id: string;
  eleve_id: string;
  date: string;
  heure?: string;
  categorie_faute: CategorieFautePunition | string;
  faute_motif: string;
  punition_appliquee: string;
  duree_modalite?: string;
  observation?: string;
  auteur_id: string;
  auteur_nom: string;
  auteur_role: RoleAdmin;
  statut: StatutPunition;
  annule_par_id?: string;
  annule_par_nom?: string;
  annule_le?: string;
  motif_annulation?: string;
  created_at: string;
  updated_at: string;
}

// ====================================================================
// MODULE : SANCTIONS DISCIPLINAIRES ADMINISTRATIVES (DIRECTION / CENSEUR)
// ====================================================================
export type StatutSanction = 'PROPOSEE' | 'VALIDEE' | 'EXECUTEE' | 'CLOTUREE';

export interface SanctionDisciplinaire {
  id: string;
  annee_scolaire: string;
  classe_id: string;
  eleve_id: string;
  date_decision: string;
  nature_decision: string; // Avertissement écrit, Blâme, Exclusion temporaire classe, Exclusion temporaire collège, Conseil de discipline, Exclusion définitive
  motif: string;
  autorite_decision: string;
  procedure_reference?: string;
  duree_jours?: number;
  date_debut?: string;
  date_fin?: string;
  observation?: string;
  notification_parents: boolean;
  piece_jointe_ref?: string;
  statut: StatutSanction;
  enregistre_par_id: string;
  enregistre_par_nom: string;
  created_at: string;
  updated_at: string;
}

// ====================================================================
// MODULE : SÉANCES DE COURS & EMPLOI DU TEMPS
// ====================================================================
export type JourSemaine = 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI' | 'SAMEDI';

export interface SeanceCours {
  id: string;
  annee_scolaire: string;
  affectation_id: string;
  classe_id: string;
  matiere_id: string;
  enseignant_id: string;
  enseignant_nom?: string;
  jour: JourSemaine;
  heure_debut: string; // "08:00"
  heure_fin: string;   // "10:00"
  salle?: string;
  statut?: StatutCompte;
  created_at: string;
  updated_at: string;
}


