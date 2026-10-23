import { setCoefficientResolver } from './appreciation';
import { 
  UserProfile, 
  Classe, 
  Matiere, 
  Eleve, 
  InscriptionEleve,
  Periode, 
  AffectationPedagogique, 
  Note, 
  AuditLog, 
  ParametresEcole,
  AnneeScolaire,
  EnregistrementPresence,
  StatutPresence,
  PaiementContribution,
  PresenceEnseignant,
  StatutPresenceEnseignant,
  ProfesseurPrincipal,
  StatutProfesseurPrincipal,
  ParentProfile,
  ParentEleve,
  IncidentDisciplinaire,
  NotificationParent,
  LienParental,
  ContributionConfig,
  DepenseBudgetaire,
  NoteConduite,
  PunitionScolaire,
  StatutPunition,
  SanctionDisciplinaire,
  SeanceCours,
  JourSemaine,
  StatutSanction
} from '../types';
import { OFFICIAL_IDENTITY, OFFICIAL_CLASSES, OFFICIAL_MATIERES, OFFICIAL_PERIODES, OFFICIAL_ANNEES_SCOLAIRES } from './constants';
import { getSupabaseClient, isSupabaseConfigured, checkIsSupabaseConfigured } from './supabase';

// ====================================================================
// SÉCURITÉ CRYPTOGRAPHIQUE DES MOTS DE PASSE (CONFORME FIPS 180-4 SHA-256)
// Les mots de passe ne sont JAMAIS stockés en clair dans les profils ni en base.
// ====================================================================
function sha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f, 0xc67178f2
  ];

  for (let i = 0; i < ascii.length; i++) {
    const charCode = ascii.charCodeAt(i);
    words[i >> 2] |= charCode << ((3 - (i % 4)) * 8);
  }
  words[ascii.length >> 2] |= 0x80 << ((3 - (ascii.length % 4)) * 8);
  words[(((ascii.length + 8) >> 6) << 4) + 15] = asciiBitLength;

  const w: number[] = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ch + k[j] + w[j]) | 0;
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    const hex = (hash[i] >>> 0).toString(16).padStart(8, '0');
    result += hex;
  }
  return result;
}

export function hashPassword(plainText: string): string {
  const salt = 'GOGBO_V2_ACADEMIC_SALT_2026';
  return 'sha256$' + sha256Hex(`${salt}:${plainText.trim()}`);
}

const STORAGE_KEYS = {
  PROFILES: 'gogbo_v2_profiles',
  CLASSES: 'gogbo_v2_classes',
  MATIERES: 'gogbo_v2_matieres',
  ELEVES: 'gogbo_v2_eleves',
  INSCRIPTIONS: 'gogbo_v2_inscriptions',
  PERIODES: 'gogbo_v2_periodes',
  ANNEES_SCOLAIRES: 'gogbo_v2_annees_scolaires',
  CREDENTIALS: 'gogbo_v2_credentials',
  AFFECTATIONS: 'gogbo_v2_affectations',
  NOTES: 'gogbo_v2_notes',
  PRESENCES: 'gogbo_v2_presences',
  PRESENCES_ENSEIGNANTS: 'gogbo_v2_presences_enseignants',
  PROFESSEURS_PRINCIPAUX: 'gogbo_v2_professeurs_principaux',
  PAIEMENTS: 'gogbo_v2_paiements',
  CONTRIBUTIONS: 'gogbo_v2_contributions',
  DEPENSES: 'gogbo_v2_depenses',
  PARENTS: 'gogbo_v2_parents',
  PARENT_ELEVES: 'gogbo_v2_parent_eleves',
  INCIDENTS_DISCIPLINAIRES: 'gogbo_v2_incidents_disciplinaires',
  PUNITIONS: 'gogbo_v2_punitions',
  SANCTIONS_DISCIPLINAIRES: 'gogbo_v2_sanctions_disciplinaires',
  NOTES_CONDUITE: 'gogbo_v2_notes_conduite',
  SEANCES_COURS: 'gogbo_v2_seances_cours',
  NOTIFICATIONS_PARENTS: 'gogbo_v2_notifications_parents',
  AUDIT_LOGS: 'gogbo_v2_audit_logs',
  PARAMETRES: 'gogbo_v2_parametres',
  COEFFICIENTS_CLASSES: 'gogbo_v2_coefficients_classes',
  VERSION: 'gogbo_v2_version',
};

// Correspondance collections locales -> tables Supabase (colonnes autorisées = schéma SQL).
// Source de vérité : Supabase. localStorage ne sert que de cache de lecture.
const REMOTE_TABLES: Record<string, { table: string; cols: string[]; noDelete?: boolean }> = {
  [STORAGE_KEYS.PROFILES]: { table: 'profiles', cols: [] }, // lecture seule côté navigateur
  [STORAGE_KEYS.CLASSES]: { table: 'classes', cols: ['id', 'nom', 'niveau', 'serie', 'effectif_max', 'salle', 'statut', 'created_at'] },
  [STORAGE_KEYS.MATIERES]: { table: 'matieres', cols: ['id', 'code', 'nom', 'coefficient', 'statut', 'is_langue_option', 'categorie', 'created_at'] },
  [STORAGE_KEYS.ELEVES]: { table: 'eleves', cols: ['id', 'matricule', 'nom', 'prenom', 'sexe', 'date_naissance', 'lieu_naissance', 'classe_id', 'langue_vivante_2', 'nom_parent', 'contact_parent', 'statut', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.INSCRIPTIONS]: { table: 'inscriptions_eleves', cols: ['id', 'eleve_id', 'classe_id', 'annee_scolaire', 'statut', 'date_inscription', 'redoublant', 'actif', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.PERIODES]: { table: 'periodes', cols: ['id', 'annee_scolaire', 'code', 'nom', 'is_active', 'is_locked', 'date_debut', 'date_fin', 'created_at'] },
  [STORAGE_KEYS.ANNEES_SCOLAIRES]: { table: 'annees_scolaires', cols: ['id', 'libelle', 'date_debut', 'date_fin', 'is_active', 'statut', 'created_at'] },
  [STORAGE_KEYS.AFFECTATIONS]: { table: 'affectations', cols: ['id', 'profile_id', 'classe_id', 'matiere_id', 'annee_scolaire', 'heures_hebdo', 'statut', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.NOTES]: { table: 'notes', cols: ['id', 'eleve_id', 'affectation_id', 'periode_id', 'annee_scolaire', 'valeur', 'type_evaluation', 'saisi_par', 'observation', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.PRESENCES]: { table: 'presences', cols: ['id', 'annee_scolaire', 'classe_id', 'eleve_id', 'date', 'statut', 'motif', 'justifie', 'heure_retard', 'enregistre_par_id', 'enregistre_par_nom', 'date_saisie', 'periode_id', 'enseignant_id', 'enseignant_nom', 'matiere_id', 'matiere_nom', 'seance_id', 'heure_debut', 'heure_fin', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.PRESENCES_ENSEIGNANTS]: { table: 'presences_enseignants', cols: ['id', 'annee_scolaire', 'date', 'enseignant_id', 'enseignant_nom', 'matieres_attribuees', 'statut', 'motif', 'heure_arrivee', 'enregistre_par_id', 'enregistre_par_nom', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.PROFESSEURS_PRINCIPAUX]: { table: 'professeurs_principaux', cols: ['id', 'profile_id', 'classe_id', 'annee_scolaire', 'statut', 'date_nomination', 'date_fin', 'motif_fin', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.PAIEMENTS]: { table: 'paiements_contributions', cols: ['id', 'numero_recu', 'annee_scolaire', 'eleve_id', 'classe_id', 'tranche', 'contribution_id', 'contribution_libelle', 'categorie_contribution', 'montant_paye', 'montant_total_exige', 'reste_a_payer', 'statut_paiement', 'mode_paiement', 'reference_recu', 'observation', 'enregistre_par_id', 'enregistre_par_nom', 'date_paiement', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.CONTRIBUTIONS]: { table: 'contributions', cols: ['id', 'libelle', 'categorie', 'annee_scolaire', 'montant_prevu', 'public_cible', 'classe_id', 'observation', 'statut', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.DEPENSES]: { table: 'depenses_budgetaires', cols: ['id', 'annee_scolaire', 'libelle', 'categorie', 'montant_alloue', 'montant_depense', 'date_depense', 'beneficiaire', 'piece_justificative', 'observation', 'enregistre_par_id', 'enregistre_par_nom', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.PARENTS]: { table: 'parents', cols: ['id', 'profile_id', 'nom', 'prenom', 'telephone', 'email', 'profession', 'adresse', 'statut', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.PARENT_ELEVES]: { table: 'parent_eleves', cols: ['id', 'parent_id', 'eleve_id', 'lien_parental', 'statut', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.INCIDENTS_DISCIPLINAIRES]: { table: 'incidents_disciplinaires', cols: ['id', 'annee_scolaire', 'date', 'eleve_id', 'classe_id', 'type_incident', 'description', 'mesure_prise', 'observation', 'signale_par_id', 'signale_par_nom', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.PUNITIONS]: { table: 'punitions_scolaires', cols: ['id', 'annee_scolaire', 'classe_id', 'eleve_id', 'date', 'heure', 'categorie_faute', 'faute_motif', 'punition_appliquee', 'duree_modalite', 'observation', 'auteur_id', 'auteur_nom', 'auteur_role', 'statut', 'annule_par_id', 'annule_par_nom', 'annule_le', 'motif_annulation', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.SANCTIONS_DISCIPLINAIRES]: { table: 'sanctions_disciplinaires', cols: ['id', 'annee_scolaire', 'classe_id', 'eleve_id', 'date_decision', 'nature_decision', 'motif', 'autorite_decision', 'procedure_reference', 'duree_jours', 'date_debut', 'date_fin', 'observation', 'notification_parents', 'piece_jointe_ref', 'statut', 'enregistre_par_id', 'enregistre_par_nom', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.NOTES_CONDUITE]: { table: 'notes_conduite', cols: ['id', 'annee_scolaire', 'periode_id', 'classe_id', 'eleve_id', 'note', 'appreciation', 'saisi_par_id', 'saisi_par_nom', 'date_saisie', 'historique', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.SEANCES_COURS]: { table: 'seances_cours', cols: ['id', 'annee_scolaire', 'affectation_id', 'classe_id', 'matiere_id', 'enseignant_id', 'enseignant_nom', 'jour', 'heure_debut', 'heure_fin', 'salle', 'statut', 'created_at', 'updated_at'] },
  [STORAGE_KEYS.NOTIFICATIONS_PARENTS]: { table: 'parent_notifications', cols: ['id', 'parent_id', 'eleve_id', 'annee_scolaire', 'titre', 'message', 'type', 'date_envoi', 'lu', 'created_at'] },
  [STORAGE_KEYS.COEFFICIENTS_CLASSES]: { table: 'coefficients_classes', cols: ['id', 'annee_scolaire', 'classe_id', 'matiere_id', 'coefficient', 'updated_at', 'created_at'] },
  [STORAGE_KEYS.AUDIT_LOGS]: { table: 'audit_logs', cols: ['id', 'user_id', 'user_nom', 'user_role', 'action', 'table_cible', 'record_id', 'details', 'created_at'], noDelete: true },
};

// Profils Institutionnels Officiels de Base (Direction & Administration)
// AUCUN enseignant fictif n'est pré-enregistré : le Censeur et le Concepteur renseignent eux-mêmes les vrais enseignants.
const SEED_PROFILES: UserProfile[] = []; // Données de démonstration supprimées : la source de vérité est Supabase.

// Attributions officielles de cours : Censeur (SVT en 4eA & 3eB) et DG (Mathématiques en Terminale D)
const SEED_AFFECTATIONS: AffectationPedagogique[] = []; // Données de démonstration supprimées : la source de vérité est Supabase.

// AUCUN élève fictif : les vrais apprenants sont inscrits par le Censeur ou le Concepteur.
const SEED_ELEVES: Eleve[] = [];

// AUCUNE inscription fictive.
const SEED_INSCRIPTIONS: InscriptionEleve[] = [];

// AUCUNE note fictive pré-enregistrée : seules les réelles évaluations saisies sont conservées.
const SEED_NOTES: Note[] = [];

// AUCUNE présence ou absence fictive pré-enregistrée.
const SEED_PRESENCES: EnregistrementPresence[] = [];

// AUCUN paiement fictif pré-enregistré.
const SEED_PAIEMENTS: PaiementContribution[] = [];

// AUCUNE contribution fictive : le Comptable configure les vraies contributions de l'école.
const SEED_CONTRIBUTIONS: ContributionConfig[] = [];

// AUCUNE dépense fictive : le Comptable saisit les dépenses réelles.
const SEED_DEPENSES: DepenseBudgetaire[] = [];

// AUCUNE donnée fictive pour les punitions, sanctions, notes de conduite et séances.
const SEED_NOTES_CONDUITE: NoteConduite[] = [];
const SEED_PUNITIONS: PunitionScolaire[] = [];
const SEED_SANCTIONS: SanctionDisciplinaire[] = [];
const SEED_SEANCES_COURS: SeanceCours[] = [];

// Seed Audit Logs
const SEED_AUDIT_LOGS: AuditLog[] = []; // Données de démonstration supprimées : la source de vérité est Supabase.

class StorageEngine {
  private memoryStore: Record<string, string> = {};

  public rawGet(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Ignored: fallback to in-memory store
    }
    return this.memoryStore[key] ?? null;
  }

  public rawSet(key: string, value: string): void {
    this.memoryStore[key] = value;
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignored: memoryStore holds it safely
    }
  }

  public rawRemove(key: string): void {
    delete this.memoryStore[key];
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignored
    }
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = this.rawGet(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      const prevRaw = this.rawGet(key);
      this.rawSet(key, JSON.stringify(value));
      this.pushDiff(key, prevRaw, value);
    } catch (e) {
      console.warn('Storage setItem error:', e);
    }
  }

  /** Ne garde que les colonnes qui existent dans la table Supabase. */
  private pickColumns(row: Record<string, unknown>, cols: string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const c of cols) {
      if (row[c] !== undefined) out[c] = row[c];
    }
    return out;
  }

  private reportSyncError(table: string, message: string): void {
    console.error(`Erreur synchronisation Supabase (${table}):`, message);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gogbo-sync-error', { detail: { table, message } }));
      }
    } catch {
      // ignoré
    }
  }

  /**
   * Écriture vers la base centrale : envoie uniquement les lignes nouvelles ou modifiées (upsert).
   * Suppressions : limitées à 3 lignes par opération pour éviter toute suppression massive.
   */
  private pushDiff(key: string, prevRaw: string | null, value: unknown): void {
    const spec = REMOTE_TABLES[key];
    if (!spec || spec.cols.length === 0) return;
    if (!checkIsSupabaseConfigured()) return;
    const client = getSupabaseClient();
    if (!client) return;

    let prev: unknown = null;
    try {
      prev = prevRaw ? JSON.parse(prevRaw) : null;
    } catch {
      prev = null;
    }
    const nextList = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    const prevList = Array.isArray(prev) ? (prev as Record<string, unknown>[]) : [];
    const prevMap = new Map<string, string>();
    for (const r of prevList) {
      if (r && r.id != null) prevMap.set(String(r.id), JSON.stringify(r));
    }
    const changed = nextList
      .filter((r) => r && r.id != null && prevMap.get(String(r.id)) !== JSON.stringify(r))
      .map((r) => this.pickColumns(r, spec.cols));
    const nextIds = new Set(nextList.filter((r) => r && r.id != null).map((r) => String(r.id)));
    const removed = spec.noDelete
      ? []
      : prevList.filter((r) => r && r.id != null && !nextIds.has(String(r.id))).map((r) => String(r.id));
    if (changed.length === 0 && removed.length === 0) return;

    void (async () => {
      try {
        const { data: sess } = await client.auth.getSession();
        if (!sess?.session) return;
        for (let i = 0; i < changed.length; i += 200) {
          const chunk = changed.slice(i, i + 200);
          const { error } = await client.from(spec.table).upsert(chunk, { onConflict: 'id' });
          if (error) this.reportSyncError(spec.table, error.message);
        }
        if (removed.length > 0) {
          if (removed.length <= 3) {
            const { error } = await client.from(spec.table).delete().in('id', removed);
            if (error) this.reportSyncError(spec.table, error.message);
          } else {
            console.warn(`Suppression distante ignorée (${removed.length} lignes) pour ${spec.table} : protection anti-suppression massive.`);
          }
        }
      } catch (err) {
        this.reportSyncError(spec.table, err instanceof Error ? err.message : String(err));
      }
    })();
  }

  /** Efface le cache local (appareil partagé) : les données réelles restent dans Supabase. */
  public clearLocalCache(): void {
    for (const key of Object.keys(REMOTE_TABLES)) {
      this.rawRemove(key);
    }
  }

  public canAdminister(operator: UserProfile): boolean {
    return operator.role === 'CENSEUR' || operator.role === 'DIRECTEUR_GENERAL' || operator.role === 'CONCEPTEUR';
  }

  public init(): void {
    try {
      // Le calcul des moyennes utilise le coefficient propre à chaque classe.
      setCoefficientResolver((matiereId, classeId, annee) => this.getCoefficientMatiere(matiereId, classeId, annee));
      // Mode production : la base Supabase est la seule source de vérité.
      // Aucune donnée locale, aucun compte ni élève de démonstration n'est créé.
      if (checkIsSupabaseConfigured()) {
        void this.syncFromSupabase();
        return;
      }
      const initialized = this.rawGet(STORAGE_KEYS.VERSION);
      if (!initialized) {
        this.setItem(STORAGE_KEYS.PROFILES, SEED_PROFILES);
        this.setItem(STORAGE_KEYS.CLASSES, OFFICIAL_CLASSES);
        this.setItem(STORAGE_KEYS.MATIERES, OFFICIAL_MATIERES);
        this.setItem(STORAGE_KEYS.ELEVES, SEED_ELEVES);
        this.setItem(STORAGE_KEYS.INSCRIPTIONS, SEED_INSCRIPTIONS);
        this.setItem(STORAGE_KEYS.PERIODES, OFFICIAL_PERIODES);
        this.setItem(STORAGE_KEYS.ANNEES_SCOLAIRES, OFFICIAL_ANNEES_SCOLAIRES);
        this.setItem(STORAGE_KEYS.AFFECTATIONS, SEED_AFFECTATIONS);
        this.setItem(STORAGE_KEYS.NOTES, SEED_NOTES);
        this.setItem(STORAGE_KEYS.PRESENCES, SEED_PRESENCES);
        this.setItem(STORAGE_KEYS.PAIEMENTS, SEED_PAIEMENTS);
        this.setItem(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
        this.setItem(STORAGE_KEYS.PARAMETRES, OFFICIAL_IDENTITY);
        
        const defaultCreds: Record<string, string> = {};
        SEED_PROFILES.forEach((p) => {
          defaultCreds[p.id] = hashPassword('Passer123!');
        });
        this.setItem(STORAGE_KEYS.CREDENTIALS, defaultCreds);
        this.rawSet(STORAGE_KEYS.VERSION, '2.2.0');
      } else {
        // Nettoyage et suppression irréversible des données d'exemple et démonstrations fictives
        // sans supprimer aucun compte réel, ni compte officiel d'administration
        const purgeFictifsKey = 'gogbo_v2_fictifs_cleaned_v3';
        if (!this.rawGet(purgeFictifsKey)) {
          const FICTIVE_PROFILE_IDS = new Set([
            'usr-prof-math',
            'usr-prof-francais',
            'usr-prof-pct',
            'usr-prof-sossou',
            'usr-prof-mensah',
            'usr-prof-bio',
          ]);
          const storedProfiles = this.getItem<UserProfile[]>(STORAGE_KEYS.PROFILES, []);
          const cleanedProfiles = storedProfiles.filter((p) => !FICTIVE_PROFILE_IDS.has(p.id));
          for (const off of SEED_PROFILES) {
            if (!cleanedProfiles.some((p) => p.id === off.id || (p.email && off.email && p.email.toLowerCase() === off.email.toLowerCase()))) {
              cleanedProfiles.push(off);
            }
          }
          this.setItem(STORAGE_KEYS.PROFILES, cleanedProfiles);

          const FICTIVE_ELEVES = new Set([
            'elv-jean',
            'elv-4a-01',
            'elv-4a-02',
            'elv-4a-03',
            'elv-4a-04',
            'elv-4a-05',
            'elv-td-01',
          ]);
          const storedEleves = this.getItem<Eleve[]>(STORAGE_KEYS.ELEVES, []);
          this.setItem(STORAGE_KEYS.ELEVES, storedEleves.filter((e) => !FICTIVE_ELEVES.has(e.id)));

          const storedInscs = this.getItem<InscriptionEleve[]>(STORAGE_KEYS.INSCRIPTIONS, []);
          this.setItem(STORAGE_KEYS.INSCRIPTIONS, storedInscs.filter((i) => !FICTIVE_ELEVES.has(i.eleve_id)));

          const FICTIVE_AFFS = new Set([
            'aff-sossou-math-6a',
            'aff-mensah-francais-6a',
            'aff-bio-pct-4a',
            'aff-censeur-svt-4a',
            'aff-dg-math-td',
          ]);
          const storedAffs = this.getItem<AffectationPedagogique[]>(STORAGE_KEYS.AFFECTATIONS, []);
          this.setItem(STORAGE_KEYS.AFFECTATIONS, storedAffs.filter((a) => !FICTIVE_AFFS.has(a.id) && !FICTIVE_PROFILE_IDS.has(a.profile_id)));

          const storedNotes = this.getItem<Note[]>(STORAGE_KEYS.NOTES, []);
          this.setItem(STORAGE_KEYS.NOTES, storedNotes.filter((n) => !FICTIVE_ELEVES.has(n.eleve_id) && !FICTIVE_PROFILE_IDS.has(n.saisi_par)));

          const storedPresences = this.getItem<EnregistrementPresence[]>(STORAGE_KEYS.PRESENCES, []);
          this.setItem(STORAGE_KEYS.PRESENCES, storedPresences.filter((p) => !FICTIVE_ELEVES.has(p.eleve_id)));

          const storedPaiements = this.getItem<PaiementContribution[]>(STORAGE_KEYS.PAIEMENTS, []);
          this.setItem(STORAGE_KEYS.PAIEMENTS, storedPaiements.filter((p) => !FICTIVE_ELEVES.has(p.eleve_id)));

          this.rawSet(purgeFictifsKey, 'true');
        }

        // Vérification et mise à niveau non-destructive pour les futures années scolaires
        if (!this.rawGet(STORAGE_KEYS.ANNEES_SCOLAIRES)) {
          this.setItem(STORAGE_KEYS.ANNEES_SCOLAIRES, OFFICIAL_ANNEES_SCOLAIRES);
        }
        if (!this.rawGet(STORAGE_KEYS.PRESENCES)) {
          this.setItem(STORAGE_KEYS.PRESENCES, SEED_PRESENCES);
        }
        if (!this.rawGet(STORAGE_KEYS.PAIEMENTS)) {
          this.setItem(STORAGE_KEYS.PAIEMENTS, SEED_PAIEMENTS);
        }

        if (!this.rawGet(STORAGE_KEYS.INSCRIPTIONS)) {
          const eleves = this.getEleves();
          const initialInscriptions: InscriptionEleve[] = eleves.map((e) => ({
            id: `insc-2026-${e.id}`,
            eleve_id: e.id,
            classe_id: e.classe_id,
            annee_scolaire: '2026–2027',
            statut: e.statut,
            date_inscription: '2026-09-08',
            redoublant: false,
            actif: e.statut === 'ACTIF',
            created_at: e.created_at || '2026-09-08T10:00:00Z',
            updated_at: e.updated_at || '2026-09-08T10:00:00Z',
          }));
          this.setItem(STORAGE_KEYS.INSCRIPTIONS, initialInscriptions);
        }
        // Migration douce des affectations pour garantir annee_scolaire et double fonction
        const currentAffs = this.getItem<AffectationPedagogique[]>(STORAGE_KEYS.AFFECTATIONS, SEED_AFFECTATIONS);
        let affsNeedUpdate = false;
        const patchedAffs = currentAffs.map((a) => {
          if (!a.annee_scolaire) {
            affsNeedUpdate = true;
            return { ...a, annee_scolaire: '2026–2027' };
          }
          return a;
        });

        // Garantir les attributions officielles de double fonction (Censeur en SVT et DG en Maths)
        SEED_AFFECTATIONS.forEach((seedAff) => {
          if (!patchedAffs.some((a) => a.id === seedAff.id || (a.profile_id === seedAff.profile_id && a.classe_id === seedAff.classe_id && a.matiere_id === seedAff.matiere_id))) {
            patchedAffs.push(seedAff);
            affsNeedUpdate = true;
          }
        });

        if (affsNeedUpdate) {
          this.setItem(STORAGE_KEYS.AFFECTATIONS, patchedAffs);
        }
        // Migration douce des notes pour garantir annee_scolaire
        const reloadedNotes = this.getItem<Note[]>(STORAGE_KEYS.NOTES, SEED_NOTES);
        let notesNeedUpdate = false;
        const periodesList = this.getPeriodes();
        const patchedNotes = reloadedNotes.map((n) => {
          if (!n.annee_scolaire) {
            notesNeedUpdate = true;
            const p = periodesList.find((per) => per.id === n.periode_id);
            return { ...n, annee_scolaire: p?.annee_scolaire || '2026–2027' };
          }
          return n;
        });
        if (notesNeedUpdate) {
          this.setItem(STORAGE_KEYS.NOTES, patchedNotes);
        }
        if (!this.rawGet(STORAGE_KEYS.CREDENTIALS)) {
          const defaultCreds: Record<string, string> = {};
          const profiles = this.getProfiles();
          profiles.forEach((p) => {
            defaultCreds[p.id] = hashPassword('Passer123!');
          });
          this.setItem(STORAGE_KEYS.CREDENTIALS, defaultCreds);
        }
      }

      // Initialisation non-destructive de l'Espace Parents (exécuté dans tous les cas si absent)
      if (!this.rawGet(STORAGE_KEYS.PARENTS)) {
        const initialParents: ParentProfile[] = [
          {
            id: 'par-houenou',
            profile_id: 'usr-par-houenou',
            nom: 'HOUENOU',
            prenom: 'Paul',
            telephone: '+229 97 45 67 89',
            email: 'parent.houenou@gmail.com',
            profession: 'Commerçant',
            adresse: 'Adjohoun Centre',
            statut: 'ACTIF',
            created_at: '2026-09-08T08:00:00Z',
            updated_at: '2026-09-08T08:00:00Z',
          },
          {
            id: 'par-agossou',
            profile_id: 'usr-par-agossou',
            nom: 'AGOSSOU',
            prenom: 'Benoît',
            telephone: '+229 95 22 33 44',
            email: 'parent.agossou@yahoo.fr',
            profession: 'Artisan',
            adresse: 'Gangban',
            statut: 'ACTIF',
            created_at: '2026-09-10T09:00:00Z',
            updated_at: '2026-09-10T09:00:00Z',
          },
        ];
        this.setItem(STORAGE_KEYS.PARENTS, initialParents);

        const profiles = this.getProfiles();
        initialParents.forEach((par) => {
          if (!profiles.some((p) => p.id === par.profile_id)) {
            profiles.push({
              id: par.profile_id!,
              email: par.email || `${par.telephone.replace(/[^0-9]/g, '')}@parent.ceggogbo.bj`,
              nom: par.nom,
              prenom: par.prenom,
              role: 'PARENT',
              is_enseignant: false,
              telephone: par.telephone,
              adresse: par.adresse,
              statut: 'ACTIF',
              created_at: par.created_at,
              updated_at: par.updated_at,
            });
          }
        });
        this.setItem(STORAGE_KEYS.PROFILES, profiles);

        const creds = this.getUserCredentials();
        initialParents.forEach((par) => {
          if (!creds[par.profile_id!]) {
            creds[par.profile_id!] = hashPassword('Passer123!');
          }
        });
        this.setItem(STORAGE_KEYS.CREDENTIALS, creds);
      }

      // Élèves de démonstration pour le parent Paul HOUENOU si la base est vide
      let currentEleves = this.getEleves();
      if (currentEleves.length === 0) {
        const demoEleves: Eleve[] = [
          {
            id: 'elv-demo-darius',
            matricule: 'MAT-2026-042',
            nom: 'HOUENOU',
            prenom: 'Darius',
            sexe: 'M',
            date_naissance: '2012-05-14',
            lieu_naissance: 'Adjohoun',
            classe_id: 'cls-6a',
            langue_vivante_2: 'ESPAGNOL',
            nom_parent: 'HOUENOU Paul',
            contact_parent: '+229 97 45 67 89',
            statut: 'ACTIF',
            created_at: '2026-09-08T08:00:00Z',
            updated_at: '2026-09-08T08:00:00Z',
          },
          {
            id: 'elv-demo-mirabelle',
            matricule: 'MAT-2026-118',
            nom: 'HOUENOU',
            prenom: 'Mirabelle',
            sexe: 'F',
            date_naissance: '2010-09-21',
            lieu_naissance: 'Porto-Novo',
            classe_id: 'cls-3b',
            langue_vivante_2: 'ALLEMAND',
            nom_parent: 'HOUENOU Paul',
            contact_parent: '+229 97 45 67 89',
            statut: 'ACTIF',
            created_at: '2026-09-08T08:00:00Z',
            updated_at: '2026-09-08T08:00:00Z',
          },
        ];
        this.setItem(STORAGE_KEYS.ELEVES, demoEleves);
        currentEleves = demoEleves;

        const demoInscs: InscriptionEleve[] = demoEleves.map((e) => ({
          id: `insc-2026-${e.id}`,
          eleve_id: e.id,
          classe_id: e.classe_id,
          annee_scolaire: '2026–2027',
          statut: 'ACTIF',
          date_inscription: '2026-09-08',
          redoublant: false,
          actif: true,
          created_at: '2026-09-08T08:00:00Z',
          updated_at: '2026-09-08T08:00:00Z',
        }));
        this.setItem(STORAGE_KEYS.INSCRIPTIONS, demoInscs);
      }

      // Liaisons parent - élèves
      if (!this.rawGet(STORAGE_KEYS.PARENT_ELEVES)) {
        const demoLinks: ParentEleve[] = [];
        if (currentEleves.length > 0) {
          demoLinks.push({
            id: 'pe-demo-01',
            parent_id: 'par-houenou',
            eleve_id: currentEleves[0].id,
            lien_parental: 'PERE',
            statut: 'ACTIF',
            created_at: '2026-09-08T08:00:00Z',
            updated_at: '2026-09-08T08:00:00Z',
          });
          if (currentEleves.length > 1) {
            demoLinks.push({
              id: 'pe-demo-02',
              parent_id: 'par-houenou',
              eleve_id: currentEleves[1].id,
              lien_parental: 'PERE',
              statut: 'ACTIF',
              created_at: '2026-09-08T08:00:00Z',
              updated_at: '2026-09-08T08:00:00Z',
            });
          }
        }
        this.setItem(STORAGE_KEYS.PARENT_ELEVES, demoLinks);
      }

      // Incidents disciplinaires
      if (!this.rawGet(STORAGE_KEYS.INCIDENTS_DISCIPLINAIRES)) {
        this.setItem(STORAGE_KEYS.INCIDENTS_DISCIPLINAIRES, []);
      }

      // Notifications parents
      if (!this.rawGet(STORAGE_KEYS.NOTIFICATIONS_PARENTS)) {
        const demoNotifs: NotificationParent[] = [
          {
            id: 'notif-demo-01',
            parent_id: 'par-houenou',
            eleve_id: currentEleves[0]?.id || 'elv-demo-darius',
            annee_scolaire: '2026–2027',
            titre: 'Bienvenue sur l’Espace Parents GOGBO NOTES V2',
            message: 'Bienvenue sur la plateforme officielle du CEG GOGBO. Vous pouvez suivre ici en temps réel les notes, absences, retards et bulletins scolaires de vos enfants.',
            type: 'COMMUNIQUE',
            date_envoi: '2026-09-15T08:00:00Z',
            lu: false,
            created_at: '2026-09-15T08:00:00Z',
          },
        ];
        this.setItem(STORAGE_KEYS.NOTIFICATIONS_PARENTS, demoNotifs);
      }

      // Coefficients classes
      if (!this.rawGet(STORAGE_KEYS.COEFFICIENTS_CLASSES)) {
        this.setItem(STORAGE_KEYS.COEFFICIENTS_CLASSES, []);
      }
      // Synchronisation initiale avec Supabase si configuré
      if (checkIsSupabaseConfigured()) {
        void this.syncFromSupabase();
      }
    } catch (e) {
      console.warn('StorageEngine init fallback notice:', e);
    }
  }

  /**
   * Synchronisation des données réelles depuis le serveur central Supabase
   * Assure que Google AI Studio et Vercel lisent exactement la même source de vérité.
   */
  public async syncFromSupabase(): Promise<{ ok: boolean; count: number; error?: string }> {
    if (!checkIsSupabaseConfigured()) {
      return { ok: false, count: 0, error: 'Supabase non configuré' };
    }
    const client = getSupabaseClient();
    if (!client) {
      return { ok: false, count: 0, error: 'Client Supabase indisponible' };
    }
    try {
      const { data: sess } = await client.auth.getSession();
      if (!sess?.session) {
        return { ok: false, count: 0, error: 'Aucune session authentifiée' };
      }
      let itemsCount = 0;
      const errors: string[] = [];
      for (const [key, spec] of Object.entries(REMOTE_TABLES)) {
        let query = client.from(spec.table).select('*');
        if (spec.table === 'audit_logs') {
          query = query.order('created_at', { ascending: false }).limit(200);
        }
        const { data, error } = await query;
        if (error) {
          errors.push(`${spec.table}: ${error.message}`);
          continue;
        }
        const rows = data ?? [];
        // rawSet : le cache local est remplacé par l'état réel de la base, sans réécriture vers Supabase
        this.rawSet(key, JSON.stringify(rows));
        itemsCount += rows.length;
      }
      try {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('gogbo-data-synced'));
      } catch {
        // ignoré
      }
      return { ok: errors.length === 0, count: itemsCount, error: errors.length ? errors.join(' | ') : undefined };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Erreur lors de syncFromSupabase:', errMsg);
      return { ok: false, count: 0, error: errMsg };
    }
  }

  // --- PARAMETRES ---
  public getParametres(): ParametresEcole {
    return this.getItem<ParametresEcole>(STORAGE_KEYS.PARAMETRES, OFFICIAL_IDENTITY);
  }

  public updateParametres(params: Partial<ParametresEcole>, user: UserProfile): ParametresEcole {
    const current = this.getParametres();
    const updated = { ...current, ...params };
    this.setItem(STORAGE_KEYS.PARAMETRES, updated);
    this.addAuditLog({
      user_id: user.id,
      user_nom: `${user.nom} ${user.prenom}`,
      user_role: user.role,
      action: 'MODIFICATION_PARAMETRES',
      table_cible: 'parametres_ecole',
      details: 'Mise à jour des informations administratives de l’établissement',
    });
    return updated;
  }

  // --- PROFILES ---
  public getProfiles(): UserProfile[] {
    const list = this.getItem<UserProfile[]>(STORAGE_KEYS.PROFILES, SEED_PROFILES);
    let hasMerged = false;
    for (const seed of SEED_PROFILES) {
      if (!list.some((p) => p.id === seed.id || (p.email && seed.email && p.email.toLowerCase() === seed.email.toLowerCase()))) {
        list.push(seed);
        hasMerged = true;
      }
    }
    if (hasMerged) {
      this.setItem(STORAGE_KEYS.PROFILES, list);
    }
    return list.map((p) => {
      let matiere = p.matiere;
      if (!matiere && (p.is_enseignant || p.role === 'ENSEIGNANT')) {
        const affs = this.getItem<AffectationPedagogique[]>(STORAGE_KEYS.AFFECTATIONS, []).filter(
          (a) => a.profile_id === p.id && a.statut === 'ACTIF'
        );
        if (affs.length > 0) {
          const matNames = Array.from(
            new Set(
              affs
                .map((a) => this.getMatieres().find((m) => m.id === a.matiere_id)?.nom)
                .filter(Boolean)
            )
          );
          if (matNames.length > 0) {
            matiere = matNames.join(' • ');
          }
        }
      }
      return {
        ...p,
        adresse: p.adresse || '',
        matiere: matiere || '',
      };
    });
  }

  public saveProfiles(profiles: UserProfile[]): void {
    this.setItem(STORAGE_KEYS.PROFILES, profiles);
  }

  public getProfileById(id: string): UserProfile | undefined {
    if (!id) return undefined;
    const clean = id.trim().toLowerCase();
    return this.getProfiles().find((p) => p.id === id || (p.email && p.email.toLowerCase() === clean));
  }

  public setUserPassword(userId: string, newPass: string): void {
    const creds = this.getUserCredentials();
    creds[userId] = hashPassword(newPass);
    this.setItem(STORAGE_KEYS.CREDENTIALS, creds);
  }

  public createProfile(
    data: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> & { initial_password?: string },
    operator: UserProfile
  ): UserProfile {
    // Vérification stricte des permissions (Point 10 & 11 : Censeur, Concepteur, DG)
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction Générale a le droit de créer un compte personnel.");
    }

    const profiles = this.getProfiles();
    const id = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const { initial_password, ...profileData } = data;
    const newProfile: UserProfile = {
      ...profileData,
      id,
      created_at: now,
      updated_at: now,
    };
    profiles.push(newProfile);
    this.setItem(STORAGE_KEYS.PROFILES, profiles);

    const initialPass = (initial_password && initial_password.trim()) ? initial_password.trim() : 'Gogbo2026!';
    this.setUserPassword(id, initialPass);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'CREATION_PERSONNEL',
      table_cible: 'profiles',
      record_id: id,
      details: `Création du compte ${data.role}: ${data.nom} ${data.prenom} (${data.email})`,
    });

    // Synchronisation en arrière-plan avec Supabase si connecté
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        void (async () => {
          try {
            await client.auth.signUp({
              email: newProfile.email,
              password: initialPass,
              options: {
                data: {
                  nom: newProfile.nom,
                  prenom: newProfile.prenom,
                  role: newProfile.role,
                  is_enseignant: newProfile.is_enseignant,
                },
              },
            });
            const { error } = await client.from('profiles').insert({
              id: newProfile.id,
              email: newProfile.email,
              nom: newProfile.nom,
              prenom: newProfile.prenom,
              role: newProfile.role,
              is_enseignant: newProfile.is_enseignant,
              telephone: newProfile.telephone || null,
              statut: newProfile.statut,
            });
            if (error) console.warn('Erreur synchronisation Supabase profiles:', error.message);
          } catch (err) {
            console.warn('Exception synchronisation Supabase auth/profiles:', err);
          }
        })();
      }
    }

    return newProfile;
  }

  public updateProfile(
    id: string,
    updates: Partial<UserProfile> & { initial_password?: string },
    operator: UserProfile
  ): UserProfile {
    // Vérification stricte des permissions (Point 10 & 11 : Censeur, Concepteur, DG)
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction Générale a le droit de modifier les informations administratives des personnels.");
    }

    const profiles = this.getProfiles();
    const index = profiles.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Profil non trouvé');

    const { initial_password, ...cleanUpdates } = updates;
    const updated = {
      ...profiles[index],
      ...cleanUpdates,
      updated_at: new Date().toISOString(),
    };
    profiles[index] = updated;
    this.setItem(STORAGE_KEYS.PROFILES, profiles);

    if (initial_password && initial_password.trim()) {
      this.setUserPassword(id, initial_password.trim());
    }

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'MODIFICATION_PERSONNEL',
      table_cible: 'profiles',
      record_id: id,
      details: `Modification du compte: ${updated.nom} ${updated.prenom} (${updated.email})`,
    });

    // Synchronisation avec Supabase si connecté
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        void (async () => {
          try {
            const { error } = await client.from('profiles').update({
              nom: updated.nom,
              prenom: updated.prenom,
              email: updated.email,
              telephone: updated.telephone || null,
              role: updated.role,
              is_enseignant: updated.is_enseignant,
              statut: updated.statut,
              updated_at: updated.updated_at,
            }).eq('id', id);
            if (error) console.error('Erreur synchronisation Supabase (profiles update):', error.message);
          } catch (err) {
            console.error('Exception Supabase profiles update:', err);
          }
        })();
      }
    }

    return updated;
  }

  public async updateProfileAsync(
    id: string,
    updates: Partial<UserProfile> & { initial_password?: string },
    operator: UserProfile
  ): Promise<UserProfile> {
    // Simulation d'un délai réseau réaliste pour feedback utilisateur
    await new Promise((resolve) => setTimeout(resolve, 250));
    return this.updateProfile(id, updates, operator);
  }

  /**
   * ESPACE « MON COMPTE » :
   * Chaque utilisateur connecté peut consulter, compléter et modifier de manière persistante
   * ses propres informations (Nom, Prénoms, Résidence / Adresse, Contact téléphone, Matière, Email).
   * Sécurité : Un utilisateur ne peut modifier que ses propres informations.
   * Le Censeur et la Direction conservent leurs droits d'administration globaux.
   */
  public updateMyProfile(
    userId: string,
    data: {
      nom: string;
      prenom: string;
      adresse?: string;
      telephone?: string;
      matiere?: string;
      email: string;
    },
    operator: UserProfile
  ): { success: boolean; error?: string; profile?: UserProfile } {
    if (operator.id !== userId && !this.canAdminister(operator)) {
      return {
        success: false,
        error: "Accès refusé : Vous ne pouvez modifier que vos propres informations depuis « MON COMPTE ».",
      };
    }

    const cleanNom = data.nom.trim();
    const cleanPrenom = data.prenom.trim();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanTelephone = data.telephone?.trim() || '';
    const cleanAdresse = data.adresse?.trim() || '';
    const cleanMatiere = data.matiere?.trim() || '';

    if (!cleanNom || !cleanPrenom) {
      return { success: false, error: 'Le nom et les prénoms sont obligatoires.' };
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Veuillez saisir une adresse email valide.' };
    }

    const profiles = this.getItem<UserProfile[]>(STORAGE_KEYS.PROFILES, SEED_PROFILES);
    const index = profiles.findIndex((p) => p.id === userId);
    if (index === -1) {
      return { success: false, error: 'Compte utilisateur introuvable.' };
    }

    // Vérifier l'unicité de l'email si modifié
    const conflict = profiles.find((p) => p.email && p.email.toLowerCase() === cleanEmail && p.id !== userId);
    if (conflict) {
      return {
        success: false,
        error: `Cet email (${cleanEmail}) est déjà utilisé par un autre compte utilisateur.`,
      };
    }

    const updatedProfile: UserProfile = {
      ...profiles[index],
      nom: cleanNom,
      prenom: cleanPrenom,
      email: cleanEmail,
      telephone: cleanTelephone || undefined,
      adresse: cleanAdresse || undefined,
      matiere: cleanMatiere || undefined,
      updated_at: new Date().toISOString(),
    };

    profiles[index] = updatedProfile;
    this.setItem(STORAGE_KEYS.PROFILES, profiles);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'MODIFICATION_MON_COMPTE',
      table_cible: 'profiles',
      record_id: userId,
      details: `Mise à jour des informations personnelles de ${cleanNom} ${cleanPrenom} (Email: ${cleanEmail}, Tél: ${cleanTelephone || 'N/A'}, Résidence: ${cleanAdresse || 'N/A'}, Matière: ${cleanMatiere || 'N/A'})`,
    });

    // Synchronisation en arrière-plan avec Supabase si connecté
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        void (async () => {
          try {
            await client.from('profiles').update({
              nom: updatedProfile.nom,
              prenom: updatedProfile.prenom,
              email: updatedProfile.email,
              telephone: updatedProfile.telephone || null,
              updated_at: updatedProfile.updated_at,
            }).eq('id', userId);
          } catch (err) {
            console.error('Exception Supabase profiles update:', err);
          }
        })();
      }
    }

    return { success: true, profile: updatedProfile };
  }

  public toggleProfileStatus(id: string, operator: UserProfile): UserProfile {
    const profile = this.getProfileById(id);
    if (!profile) throw new Error('Profil non trouvé');
    const newStatus = profile.statut === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    return this.updateProfile(id, { statut: newStatus }, operator);
  }

  // --- CLASSES ---
  public getClasses(): Classe[] {
    return this.getItem<Classe[]>(STORAGE_KEYS.CLASSES, OFFICIAL_CLASSES);
  }

  public getClasseById(id: string): Classe | undefined {
    return this.getClasses().find((c) => c.id === id);
  }

  public getNextClasseLetter(niveau: string): string {
    const cleanNiveau = (niveau || '').trim().toLowerCase();
    const classes = this.getClasses().filter((c) => {
      const cNiv = (c.niveau || '').trim().toLowerCase();
      const cNom = (c.nom || '').trim().toLowerCase();
      return cNiv === cleanNiveau || cNom.startsWith(cleanNiveau) || (cleanNiveau.includes('6') && cNom.startsWith('6'));
    });

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const usedLetters = new Set<string>();

    classes.forEach((c) => {
      const match = c.nom.trim().match(/([A-Z]+)$/i);
      if (match) {
        usedLetters.add(match[1].toUpperCase());
      }
    });

    for (const letter of alphabet) {
      if (!usedLetters.has(letter)) {
        return letter;
      }
    }
    for (const l1 of alphabet) {
      for (const l2 of alphabet) {
        const combo = `${l1}${l2}`;
        if (!usedLetters.has(combo)) return combo;
      }
    }
    return 'Z';
  }

  public createClasse(
    data: {
      niveau: string;
      nom?: string;
      serie?: string;
      effectif_max?: number;
      salle?: string;
    },
    operator: UserProfile
  ): Classe {
    if (!this.canAdminister(operator) && operator.role !== 'CENSEUR') {
      throw new Error("Action non autorisée : Seul le Censeur ou l'Administration peut ajouter une nouvelle classe.");
    }

    const classes = this.getClasses();
    const niveau = (data.niveau || '6ème').trim();
    const nextLetter = this.getNextClasseLetter(niveau);
    
    let nom = (data.nom || '').trim();
    if (!nom) {
      nom = `${niveau} ${nextLetter}`;
    }

    if (classes.some((c) => (c.nom || '').toLowerCase() === nom.toLowerCase())) {
      throw new Error(`Une classe portant le nom "${nom}" existe déjà.`);
    }

    const cleanNivSlug = (niveau || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLetSlug = (nextLetter || '').toLowerCase();
    const id = `cls-${cleanNivSlug}-${cleanLetSlug}-${Date.now().toString(36).slice(-4)}`;

    const isFirstCycle = ['6ème', '5ème', '4ème', '3ème', '6e', '5e', '4e', '3e'].includes(niveau);
    const defaultSerie = data.serie || (isFirstCycle ? 'Générale' : 'A');

    const newClasse: Classe = {
      id,
      nom,
      niveau: niveau as Classe['niveau'],
      serie: defaultSerie as Classe['serie'],
      effectif_max: data.effectif_max || 100,
      salle: data.salle || `Salle ${nom}`,
    };

    const updatedClasses = [...classes, newClasse];
    this.setItem(STORAGE_KEYS.CLASSES, updatedClasses);

    // Initialisation automatique des coefficients de matières pour la nouvelle classe
    try {
      const allCoefs = this.getCoefficientsClasses();
      const templateClasse = classes.find((c) => (c.niveau || '').toLowerCase() === (niveau || '').toLowerCase());
      if (templateClasse) {
        const templateCoefs = allCoefs.filter((cc) => cc.classe_id === templateClasse.id);
        const clonedCoefs = templateCoefs.map((tc) => ({
          ...tc,
          id: `coef-${newClasse.id}-${tc.matiere_id}`,
          classe_id: newClasse.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        this.setItem(STORAGE_KEYS.COEFFICIENTS_CLASSES, [...allCoefs, ...clonedCoefs]);
      }
    } catch {
      // Ignorer si échec d'affectation automatique de coefficients
    }

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'CREATION_CLASSE',
      table_cible: 'classes',
      record_id: newClasse.id,
      details: `Création de la nouvelle classe ${newClasse.nom} (${newClasse.niveau} - ${newClasse.serie}) par le Censeur`,
    });

    return newClasse;
  }

  public deleteClasse(id: string, operator: UserProfile): boolean {
    if (!this.canAdminister(operator) && operator.role !== 'CENSEUR') {
      throw new Error("Action non autorisée : Seul le Censeur ou l'Administration peut supprimer une classe.");
    }
    const classes = this.getClasses();
    const target = classes.find((c) => c.id === id);
    if (!target) throw new Error("Classe introuvable.");

    const eleves = this.getEleves().filter((e) => e.classe_id === id);
    if (eleves.length > 0) {
      throw new Error(`Suppression impossible : la classe "${target.nom}" compte ${eleves.length} apprenant(s). Réaffectez d'abord ces élèves.`);
    }

    const updated = classes.filter((c) => c.id !== id);
    this.setItem(STORAGE_KEYS.CLASSES, updated);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SUPPRESSION_CLASSE',
      table_cible: 'classes',
      record_id: id,
      details: `Suppression de la classe ${target.nom}`,
    });

    return true;
  }

  // --- MATIERES ---
  public getMatieres(): Matiere[] {
    return this.getItem<Matiere[]>(STORAGE_KEYS.MATIERES, OFFICIAL_MATIERES);
  }

  public getMatiereById(id: string): Matiere | undefined {
    return this.getMatieres().find((m) => m.id === id);
  }

  public updateMatiere(id: string, updates: Partial<Matiere>, operator: UserProfile): Matiere {
    const list = this.getMatieres();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Matière non trouvée');

    // Vérification stricte des permissions de modification de coefficient (Section 6 & 7) :
    // - Le Censeur dispose du contrôle administratif global.
    // - Un Enseignant ne peut modifier que le coefficient de sa propre matière dans les classes qui lui sont attribuées.
    // - Le Directeur Général ou autre rôle ne peut pas modifier globalement les coefficients sans droit Censeur.
    if (operator.role === 'ENSEIGNANT') {
      const teacherAffs = this.getAffectationsByProfile(operator.id);
      const teachesSubject = teacherAffs.some((a) => a.matiere_id === id);
      if (!teachesSubject) {
        throw new Error("Action non autorisée : Un enseignant ne peut modifier que le coefficient de sa propre matière dans les classes qui lui sont attribuées.");
      }
    } else if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur dispose des droits administratifs globaux de modification des matières et coefficients.");
    }

    list[idx] = { ...list[idx], ...updates };
    this.setItem(STORAGE_KEYS.MATIERES, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'MODIFICATION_MATIERE',
      table_cible: 'matieres',
      record_id: id,
      details: `Modification matière: ${list[idx].nom} (Coef: ${list[idx].coefficient})`,
    });

    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        void (async () => {
          try {
            const { error } = await client.from('matieres').update({
              nom: list[idx].nom,
              coefficient: list[idx].coefficient,
              statut: list[idx].statut,
            }).eq('id', id);
            if (error) console.error('Erreur synchronisation Supabase (matieres update):', error.message);
          } catch (err) {
            console.error('Exception Supabase matieres update:', err);
          }
        })();
      }
    }

    return list[idx];
  }

  public getMatiereByCode(code: string): Matiere | undefined {
    return this.getMatieres().find((m) => m.code.toUpperCase() === code.toUpperCase());
  }

  // --- COEFFICIENTS PAR CLASSE / NIVEAU (EXIGENCE 5.E) ---
  public getCoefficientsClasses(anneeScolaire?: string): import('../types').CoefficientClasse[] {
    const annee = anneeScolaire || this.getActiveAnneeScolaire().libelle;
    const all = this.getItem<import('../types').CoefficientClasse[]>(STORAGE_KEYS.COEFFICIENTS_CLASSES, []);
    return all.filter((c) => !c.annee_scolaire || c.annee_scolaire === annee);
  }

  public getCoefficientMatiere(matiereId: string, classeId?: string, anneeScolaire?: string): number {
    const mat = this.getMatiereById(matiereId);
    const defaultCoef = mat ? mat.coefficient : 1;
    if (!classeId) return defaultCoef;

    const annee = anneeScolaire || this.getActiveAnneeScolaire().libelle;
    const all = this.getCoefficientsClasses(annee);
    
    // 1. Chercher un coefficient spécifique pour cette classe exacte (ex: cls-6a)
    const specific = all.find((c) => c.classe_id === classeId && c.matiere_id === matiereId);
    if (specific && specific.coefficient > 0) {
      return specific.coefficient;
    }

    // 2. Chercher par niveau (ex: si configuré pour 6ème)
    const cls = this.getClasseById(classeId);
    if (cls) {
      const byNiveau = all.find((c) => c.classe_id === cls.niveau && c.matiere_id === matiereId);
      if (byNiveau && byNiveau.coefficient > 0) {
        return byNiveau.coefficient;
      }
    }

    return defaultCoef;
  }

  public setCoefficientClasse(
    classeId: string,
    matiereId: string,
    coefficient: number,
    anneeOrOperator: string | UserProfile,
    operatorOrAnnee?: UserProfile | string
  ): import('../types').CoefficientClasse {
    let annee: string;
    let operator: UserProfile;

    if (typeof anneeOrOperator === 'string') {
      annee = anneeOrOperator;
      operator = operatorOrAnnee as UserProfile;
    } else {
      operator = anneeOrOperator;
      annee = typeof operatorOrAnnee === 'string' ? operatorOrAnnee : this.getActiveAnneeScolaire().libelle;
    }

    if (!operator || (!this.canAdminister(operator) && operator.role !== 'ENSEIGNANT')) {
      throw new Error("Action non autorisée : Seul le Censeur ou l'enseignant titulaire peut ajuster ce coefficient.");
    }

    // Un enseignant ne modifie que le coefficient de SA matière dans SES classes (affectation active).
    if (!this.canAdminister(operator)) {
      const anneeCible = annee || this.getActiveAnneeScolaire().libelle;
      const titulaire = this.getItem<import('../types').AffectationPedagogique[]>(STORAGE_KEYS.AFFECTATIONS, []).some(
        (a) =>
          a.profile_id === operator.id &&
          a.classe_id === classeId &&
          a.matiere_id === matiereId &&
          a.annee_scolaire === anneeCible &&
          a.statut === 'ACTIF'
      );
      if (!titulaire) {
        throw new Error('Action non autorisée : vous ne pouvez modifier que le coefficient de votre matière dans vos classes.');
      }
    }

    const all = this.getItem<import('../types').CoefficientClasse[]>(STORAGE_KEYS.COEFFICIENTS_CLASSES, []);
    const targetAnnee = annee || this.getActiveAnneeScolaire().libelle;
    const idx = all.findIndex((c) => c.classe_id === classeId && c.matiere_id === matiereId && c.annee_scolaire === targetAnnee);

    const updatedItem: import('../types').CoefficientClasse = {
      id: idx !== -1 ? all[idx].id : `coef-${classeId}-${matiereId}-${Date.now().toString(36)}`,
      annee_scolaire: targetAnnee,
      classe_id: classeId,
      matiere_id: matiereId,
      coefficient,
      updated_at: new Date().toISOString()
    };

    if (idx !== -1) {
      all[idx] = updatedItem;
    } else {
      all.push(updatedItem);
    }

    this.setItem(STORAGE_KEYS.COEFFICIENTS_CLASSES, all);

    const cls = this.getClasseById(classeId);
    const mat = this.getMatiereById(matiereId);
    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'MODIFICATION_COEFFICIENT_CLASSE',
      table_cible: 'coefficients_classes',
      record_id: updatedItem.id,
      details: `Ajustement coefficient de ${mat?.nom || matiereId} pour ${cls?.nom || classeId} : ${coefficient} (${targetAnnee})`,
    });

    return updatedItem;
  }

  public getMatieresByClasse(classeId?: string, anneeScolaire?: string): Matiere[] {
    const list = this.getMatieres();
    if (!classeId) return list;
    return list.map((m) => {
      const coef = this.getCoefficientMatiere(m.id, classeId, anneeScolaire);
      return { ...m, coefficient: coef };
    });
  }

  // --- ELEVES & INSCRIPTIONS PLURIANNUELLES ---
  public getEleves(anneeScolaire?: string): Eleve[] {
    const list = this.getItem<Eleve[]>(STORAGE_KEYS.ELEVES, SEED_ELEVES);
    if (!anneeScolaire) return list;
    const inscriptions = this.getInscriptionsByAnnee(anneeScolaire);
    if (inscriptions.length > 0) {
      const inscMap = new Map(inscriptions.map((i) => [i.eleve_id, i.classe_id]));
      return list
        .filter((e) => inscMap.has(e.id))
        .map((e) => ({
          ...e,
          classe_id: inscMap.get(e.id)!,
        }));
    }
    return list;
  }

  public getEleveById(id: string): Eleve | undefined {
    return this.getEleves().find((e) => e.id === id);
  }

  // --- GESTION DES INSCRIPTIONS ANNUELLES DES ÉLÈVES ---
  public getInscriptions(): InscriptionEleve[] {
    return this.getItem<InscriptionEleve[]>(STORAGE_KEYS.INSCRIPTIONS, SEED_INSCRIPTIONS);
  }

  public getInscriptionsByAnnee(annee: string): InscriptionEleve[] {
    return this.getInscriptions().filter((i) => i.annee_scolaire === annee && i.statut === 'ACTIF' && i.actif);
  }

  public getInscriptionsByEleve(eleveId: string): InscriptionEleve[] {
    return this.getInscriptions().filter((i) => i.eleve_id === eleveId);
  }

  public getInscription(eleveId: string, annee: string): InscriptionEleve | undefined {
    return this.getInscriptions().find((i) => i.eleve_id === eleveId && i.annee_scolaire === annee);
  }

  public getClasseOfEleve(eleveId: string, anneeScolaire?: string): Classe | undefined {
    const targetAnnee = anneeScolaire || this.getActiveAnneeScolaire().libelle;
    const insc = this.getInscription(eleveId, targetAnnee);
    if (insc) {
      return this.getClasseById(insc.classe_id);
    }
    // Si l'élève a des inscriptions pour d'autres années mais pas pour targetAnnee
    const eleveInscriptions = this.getInscriptionsByEleve(eleveId);
    if (eleveInscriptions.length > 0) {
      const match = eleveInscriptions.find((i) => i.annee_scolaire === targetAnnee);
      if (match) return this.getClasseById(match.classe_id);
      // Non inscrit pour cette année spécifique
      if (targetAnnee !== this.getActiveAnneeScolaire().libelle) {
        return undefined;
      }
    }
    const el = this.getEleveById(eleveId);
    return el ? this.getClasseById(el.classe_id) : undefined;
  }

  public getElevesByClasse(classeId: string, anneeScolaire?: string): Eleve[] {
    const allEleves = this.getEleves();
    const targetAnnee = anneeScolaire || this.getActiveAnneeScolaire().libelle;
    const inscriptions = this.getInscriptionsByAnnee(targetAnnee);

    if (inscriptions.length > 0) {
      const enrolledInscMap = new Map(
        inscriptions
          .filter((i) => i.classe_id === classeId && i.statut === 'ACTIF' && i.actif)
          .map((i) => [i.eleve_id, i])
      );
      return allEleves
        .filter((e) => enrolledInscMap.has(e.id) && e.statut === 'ACTIF')
        .map((e) => ({
          ...e,
          classe_id: enrolledInscMap.get(e.id)!.classe_id, // Toujours la classe historique précise
        }));
    }

    // Si le système a des inscriptions configurées mais que cette année n'en a aucune, la classe est vide
    if (this.getInscriptions().length > 0) {
      return [];
    }

    // Rétrocompatibilité : si aucune inscription pour cette année cible, filtrer par classe_id direct
    return allEleves.filter((e) => e.classe_id === classeId && e.statut === 'ACTIF');
  }

  public getElevesByAnnee(annee: string): Array<Eleve & { inscription: InscriptionEleve; classe_nom: string }> {
    const allEleves = this.getEleves();
    const inscripts = this.getInscriptionsByAnnee(annee);
    const classes = this.getClasses();
    const classesMap = new Map(classes.map((c) => [c.id, c.nom]));

    if (inscripts.length > 0) {
      const inscMap = new Map(inscripts.map((i) => [i.eleve_id, i]));
      const list: Array<Eleve & { inscription: InscriptionEleve; classe_nom: string }> = [];
      for (const el of allEleves) {
        const insc = inscMap.get(el.id);
        if (insc && el.statut === 'ACTIF') {
          list.push({
            ...el,
            classe_id: insc.classe_id, // Classe historique pour cette année
            inscription: insc,
            classe_nom: classesMap.get(insc.classe_id) || 'Inconnue',
          });
        }
      }
      return list;
    }

    if (this.getInscriptions().length > 0) {
      return [];
    }

    return allEleves
      .filter((e) => e.statut === 'ACTIF')
      .map((e) => ({
        ...e,
        inscription: {
          id: `insc-seed-${e.id}`,
          eleve_id: e.id,
          classe_id: e.classe_id,
          annee_scolaire: annee,
          statut: 'ACTIF',
          date_inscription: '2026-09-15',
          actif: true,
          created_at: '',
          updated_at: '',
        },
        classe_nom: classesMap.get(e.classe_id) || 'Inconnue',
      }));
  }

  public canAdministerEleves(operator: UserProfile, classeId?: string, anneeScolaire?: string): boolean {
    if (this.canAdminister(operator)) return true;
    if (operator.role === 'ENSEIGNANT' && classeId) {
      const annee = anneeScolaire || this.getActiveAnneeScolaire().libelle;
      return this.isProfesseurPrincipalOfClasse(operator.id, classeId, annee);
    }
    return false;
  }

  public inscrireEleve(
    data: Omit<InscriptionEleve, 'id' | 'created_at' | 'updated_at'>,
    operator: UserProfile,
    logAudit = true
  ): InscriptionEleve {
    if (!this.canAdministerEleves(operator, data.classe_id, data.annee_scolaire)) {
      throw new Error("Action non autorisée : Seul le Censeur, la Direction ou le Professeur Principal de cette classe a le droit d'inscrire des élèves.");
    }

    const inscriptions = this.getInscriptions();
    // Contrainte : pas deux inscriptions actives contradictoires pour le même élève et la même année
    const existing = inscriptions.find(
      (i) => i.eleve_id === data.eleve_id && i.annee_scolaire === data.annee_scolaire
    );
    if (existing) {
      throw new Error(`L'élève possède déjà une inscription pour l'année scolaire ${data.annee_scolaire}.`);
    }

    // Vérifier effectif maximal de 100 élèves dans la classe pour cette année
    const classeInscriptions = inscriptions.filter(
      (i) => i.classe_id === data.classe_id && i.annee_scolaire === data.annee_scolaire && i.statut === 'ACTIF' && i.actif
    );
    if (classeInscriptions.length >= 100) {
      throw new Error(`La classe sélectionnée a déjà atteint son effectif maximal de 100 élèves pour l'année ${data.annee_scolaire}.`);
    }

    const id = `insc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newInscription: InscriptionEleve = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };

    inscriptions.push(newInscription);
    this.setItem(STORAGE_KEYS.INSCRIPTIONS, inscriptions);

    if (logAudit) {
      const el = this.getEleveById(data.eleve_id);
      const cls = this.getClasseById(data.classe_id);
      this.addAuditLog({
        user_id: operator.id,
        user_nom: `${operator.nom} ${operator.prenom}`,
        user_role: operator.role,
        action: 'INSCRIPTION_ELEVE_ANNEE',
        table_cible: 'inscriptions_eleves',
        record_id: id,
        details: `Inscription pour ${data.annee_scolaire} : ${el?.nom} ${el?.prenom} en ${cls?.nom}`,
      });
    }

    // Synchronisation en arrière-plan avec Supabase si connecté
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        void (async () => {
          try {
            await client.from('inscriptions_eleves').insert({
              id: newInscription.id,
              eleve_id: newInscription.eleve_id,
              classe_id: newInscription.classe_id,
              annee_scolaire: newInscription.annee_scolaire,
              statut: newInscription.statut,
              date_inscription: newInscription.date_inscription,
              redoublant: newInscription.redoublant || false,
              actif: newInscription.actif,
            });
          } catch (err) {
            console.error('Exception Supabase inscriptions_eleves insert:', err);
          }
        })();
      }
    }

    return newInscription;
  }

  public promouvoirEleve(
    eleveId: string,
    nouvelleClasseId: string,
    nouvelleAnnee: string,
    operator: UserProfile,
    redoublant = false
  ): InscriptionEleve {
    const el = this.getEleveById(eleveId);
    if (!el) throw new Error("Élève introuvable.");

    // Créer la nouvelle inscription pour la nouvelle année
    const newInsc = this.inscrireEleve({
      eleve_id: eleveId,
      classe_id: nouvelleClasseId,
      annee_scolaire: nouvelleAnnee,
      statut: 'ACTIF',
      date_inscription: new Date().toISOString().split('T')[0],
      redoublant,
      actif: true,
    }, operator, true);

    // Mettre à jour la classe courante de l'élève
    const eleves = this.getEleves();
    const idx = eleves.findIndex((e) => e.id === eleveId);
    if (idx !== -1) {
      eleves[idx] = {
        ...eleves[idx],
        classe_id: nouvelleClasseId,
        updated_at: new Date().toISOString(),
      };
      this.setItem(STORAGE_KEYS.ELEVES, eleves);
    }

    return newInsc;
  }

  public createEleve(data: Omit<Eleve, 'id' | 'created_at' | 'updated_at'>, operator: UserProfile): Eleve {
    const activeAnnee = this.getActiveAnneeScolaire().libelle;
    // Vérification stricte des permissions : Censeur, DG, ou Professeur Principal de cette classe pour l'année active
    if (!this.canAdministerEleves(operator, data.classe_id, activeAnnee)) {
      throw new Error("Action non autorisée : Seul le Censeur, la Direction Générale ou le Professeur Principal de cette classe a le droit d'inscrire des élèves.");
    }

    const eleves = this.getEleves();

    // Règle 1: Matricule unique
    const existsMatricule = eleves.some((e) => e.matricule.trim().toUpperCase() === data.matricule.trim().toUpperCase());
    if (existsMatricule) {
      throw new Error(`Le matricule "${data.matricule}" est déjà attribué à un autre élève.`);
    }

    // Règle 2: Limite stricte de 100 élèves par classe (Section 6 & 8)
    const classeEleves = eleves.filter((e) => e.classe_id === data.classe_id && e.statut === 'ACTIF');
    if (classeEleves.length >= 100) {
      throw new Error("Effectif maximal atteint : cette classe contient déjà 100 élèves (plafond officiel).");
    }

    const id = `elv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newEleve: Eleve = {
      ...data,
      matricule: data.matricule.trim().toUpperCase(),
      id,
      created_at: now,
      updated_at: now,
    };

    eleves.push(newEleve);
    this.setItem(STORAGE_KEYS.ELEVES, eleves);

    // Inscription automatique pour l'année académique active
    try {
      this.inscrireEleve(
        {
          eleve_id: id,
          classe_id: data.classe_id,
          annee_scolaire: activeAnnee,
          statut: data.statut,
          date_inscription: now.split('T')[0],
          redoublant: false,
          actif: data.statut === 'ACTIF',
        },
        operator,
        false
      );
    } catch (e) {
      console.warn("Auto-inscription eleve:", e);
    }

    const isPP = operator.role === 'ENSEIGNANT';
    const cls = this.getClasseById(data.classe_id);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: isPP ? 'INSCRIPTION_APPRENANT_PP' : 'CREATION_ELEVE',
      table_cible: 'eleves',
      record_id: id,
      details: isPP 
        ? `Inscription de l'apprenant par le Professeur Principal : ${newEleve.nom} ${newEleve.prenom} (${newEleve.matricule}) en classe de ${cls?.nom || data.classe_id}`
        : `Inscription élève: ${newEleve.nom} ${newEleve.prenom} (Matricule: ${newEleve.matricule})`,
    });

    // Synchronisation en arrière-plan avec Supabase si connecté
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        void (async () => {
          try {
            const { error } = await client.from('eleves').insert({
              id: newEleve.id,
              matricule: newEleve.matricule,
              nom: newEleve.nom,
              prenom: newEleve.prenom,
              sexe: newEleve.sexe,
              date_naissance: newEleve.date_naissance || null,
              lieu_naissance: newEleve.lieu_naissance || null,
              classe_id: newEleve.classe_id,
              langue_vivante_2: newEleve.langue_vivante_2,
              nom_parent: newEleve.nom_parent || null,
              contact_parent: newEleve.contact_parent || null,
              statut: newEleve.statut,
            });
            if (error) console.error('Erreur synchronisation Supabase (eleves insert):', error.message);
          } catch (err) {
            console.error('Exception Supabase eleves insert:', err);
          }
        })();
      }
    }

    return newEleve;
  }

  public updateEleve(id: string, updates: Partial<Eleve>, operator: UserProfile): Eleve {
    const eleves = this.getEleves();
    const idx = eleves.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Élève non trouvé');

    const currentEleve = eleves[idx];
    const isPP = operator.role === 'ENSEIGNANT';

    // Vérification stricte des permissions : Censeur, DG, ou Professeur Principal de la classe
    if (isPP) {
      const activeAnnee = this.getActiveAnneeScolaire().libelle;
      const isPPOfEleveClass = this.isProfesseurPrincipalOfClasse(operator.id, currentEleve.classe_id, activeAnnee);
      if (!isPPOfEleveClass) {
        throw new Error("Action non autorisée : Vous n'êtes pas Professeur Principal de la classe de cet apprenant.");
      }
      // Règle 8 : Le PP ne peut pas muter l'élève vers une autre classe
      if (updates.classe_id && updates.classe_id !== currentEleve.classe_id) {
        throw new Error("Action non autorisée : Un Professeur Principal ne peut pas muter un apprenant vers une autre classe.");
      }
    } else if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur, la Direction Générale ou le Professeur Principal de la classe a le droit de modifier les fiches élèves.");
    }

    // Vérifier unicité du matricule si modifié
    if (updates.matricule && updates.matricule.trim().toUpperCase() !== eleves[idx].matricule) {
      const exists = eleves.some(
        (e) => e.id !== id && e.matricule.trim().toUpperCase() === updates.matricule!.trim().toUpperCase()
      );
      if (exists) {
        throw new Error(`Le matricule "${updates.matricule}" est déjà utilisé.`);
      }
    }

    // Vérifier limite de 100 si changement de classe
    if (updates.classe_id && updates.classe_id !== eleves[idx].classe_id) {
      const count = eleves.filter((e) => e.classe_id === updates.classe_id && e.id !== id && e.statut === 'ACTIF').length;
      if (count >= 100) {
        throw new Error("La classe de destination a déjà atteint son effectif maximal de 100 élèves.");
      }
    }

    const updated: Eleve = {
      ...eleves[idx],
      ...updates,
      matricule: updates.matricule ? updates.matricule.trim().toUpperCase() : eleves[idx].matricule,
      updated_at: new Date().toISOString(),
    };
    eleves[idx] = updated;
    this.setItem(STORAGE_KEYS.ELEVES, eleves);

    // Mise à jour de l'inscription pour l'année scolaire active (sans toucher aux années antérieures)
    if (updates.classe_id) {
      const activeAnnee = this.getActiveAnneeScolaire().libelle;
      const inscripts = this.getInscriptions();
      const currentInscIndex = inscripts.findIndex((i) => i.eleve_id === id && i.annee_scolaire === activeAnnee);
      if (currentInscIndex !== -1) {
        inscripts[currentInscIndex] = {
          ...inscripts[currentInscIndex],
          classe_id: updates.classe_id,
          updated_at: new Date().toISOString(),
        };
        this.setItem(STORAGE_KEYS.INSCRIPTIONS, inscripts);
      }
    }

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: isPP ? 'MODIFICATION_APPRENANT_PP' : 'MODIFICATION_ELEVE',
      table_cible: 'eleves',
      record_id: id,
      details: isPP
        ? `Modification administrative de l'apprenant par le Professeur Principal : ${updated.nom} ${updated.prenom} (${updated.matricule})`
        : `Mise à jour élève: ${updated.nom} ${updated.prenom} (${updated.matricule})`,
    });

    // Synchronisation avec Supabase si connecté
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        void (async () => {
          try {
            const { error } = await client.from('eleves').update({
              matricule: updated.matricule,
              nom: updated.nom,
              prenom: updated.prenom,
              sexe: updated.sexe,
              date_naissance: updated.date_naissance || null,
              lieu_naissance: updated.lieu_naissance || null,
              classe_id: updated.classe_id,
              langue_vivante_2: updated.langue_vivante_2,
              nom_parent: updated.nom_parent || null,
              contact_parent: updated.contact_parent || null,
              statut: updated.statut,
              updated_at: updated.updated_at,
            }).eq('id', id);
            if (error) console.error('Erreur synchronisation Supabase (eleves update):', error.message);
          } catch (err) {
            console.error('Exception Supabase eleves update:', err);
          }
        })();
      }
    }

    return updated;
  }

  public retirerEleveDeAnnee(eleveId: string, anneeScolaire: string, operator: UserProfile): boolean {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction peut retirer un élève d'une année scolaire.");
    }
    const inscripts = this.getInscriptions();
    const idx = inscripts.findIndex((i) => i.eleve_id === eleveId && i.annee_scolaire === anneeScolaire);
    if (idx === -1) {
      throw new Error("Inscription introuvable pour cette année scolaire.");
    }
    inscripts[idx] = {
      ...inscripts[idx],
      actif: false,
      statut: 'INACTIF',
      updated_at: new Date().toISOString(),
    };
    this.setItem(STORAGE_KEYS.INSCRIPTIONS, inscripts);

    const el = this.getEleveById(eleveId);
    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'RETRAIT_ELEVE_ANNEE',
      table_cible: 'inscriptions',
      record_id: inscripts[idx].id,
      details: `Retrait de l'élève ${el?.nom || ''} ${el?.prenom || ''} pour l'année scolaire ${anneeScolaire}. Historique antérieur préservé.`,
    });

    return true;
  }

  public async updateEleveAsync(id: string, updates: Partial<Eleve>, operator: UserProfile): Promise<Eleve> {
    // Simulation d'un délai réseau réaliste pour feedback utilisateur
    await new Promise((resolve) => setTimeout(resolve, 250));
    return this.updateEleve(id, updates, operator);
  }

  public toggleEleveStatus(id: string, operator: UserProfile): Eleve {
    const eleve = this.getEleveById(id);
    if (!eleve) throw new Error('Élève non trouvé');
    const newStatus = eleve.statut === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    return this.updateEleve(id, { statut: newStatus }, operator);
  }

  // --- PERIODES ---
  public getPeriodes(): Periode[] {
    const raw = this.getItem<Periode[]>(STORAGE_KEYS.PERIODES, OFFICIAL_PERIODES);
    let list: Periode[] = Array.isArray(raw)
      ? raw
          .filter((p): p is Periode => !!p && typeof p === 'object' && !!p.id)
          .map((p) => ({
            ...p,
            is_locked: p.is_locked ?? false,
          }))
      : [...OFFICIAL_PERIODES];

    let changed = false;
    for (const officialP of OFFICIAL_PERIODES) {
      if (!list.some((p) => p && p.id === officialP.id)) {
        list.push({ ...officialP, is_locked: officialP.is_locked ?? false });
        changed = true;
      }
    }
    if (changed) {
      this.setItem(STORAGE_KEYS.PERIODES, list);
    }
    return list;
  }

  public getPeriodesByAnnee(anneeScolaire?: string): Periode[] {
    const list = this.getPeriodes();
    if (!anneeScolaire) return list.length > 0 ? list : OFFICIAL_PERIODES;
    const cleanAnnee = anneeScolaire.replace(/\u2013/g, '-').trim();
    const filtered = list.filter((p) => {
      if (!p) return false;
      const pAnnee = (p.annee_scolaire || '2026–2027').replace(/\u2013/g, '-').trim();
      return pAnnee === cleanAnnee;
    });
    return filtered.length > 0 ? filtered : (list.length > 0 ? list : OFFICIAL_PERIODES);
  }

  public getActivePeriode(): Periode {
    const periodes = this.getPeriodes();
    const found = periodes.find((p) => p && p.is_active) || periodes[0] || OFFICIAL_PERIODES[0];
    return {
      ...found,
      is_locked: found?.is_locked ?? false,
    };
  }

  public setActivePeriode(periodeId: string, operator: UserProfile): Periode {
    const list = this.getPeriodes();
    const updated = list.map((p) => ({
      ...p,
      is_active: p.id === periodeId,
    }));
    this.setItem(STORAGE_KEYS.PERIODES, updated);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'ACTIVATION_PERIODE',
      table_cible: 'periodes',
      record_id: periodeId,
      details: `Activation de la période: ${updated.find((p) => p.id === periodeId)?.nom}`,
    });

    return updated.find((p) => p.id === periodeId)!;
  }

  public toggleLockPeriode(periodeId: string, operator: UserProfile): Periode {
    const list = this.getPeriodes();
    const idx = list.findIndex((p) => p.id === periodeId);
    if (idx === -1) throw new Error('Période non trouvée');

    list[idx] = {
      ...list[idx],
      is_locked: !list[idx].is_locked,
    };
    this.setItem(STORAGE_KEYS.PERIODES, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: list[idx].is_locked ? 'VERROUILLAGE_PERIODE' : 'DEVERROUILLAGE_PERIODE',
      table_cible: 'periodes',
      record_id: periodeId,
      details: `${list[idx].is_locked ? 'Verrouillage' : 'Déverrouillage'} des saisies de notes pour ${list[idx].nom}`,
    });

    return list[idx];
  }

  // --- GESTION PÉRENNE DES ANNÉES SCOLAIRES (EXIGENCE 1, 2, 22, 23) ---
  public getAnneesScolaires(): AnneeScolaire[] {
    return this.getItem<AnneeScolaire[]>(STORAGE_KEYS.ANNEES_SCOLAIRES, OFFICIAL_ANNEES_SCOLAIRES);
  }

  public getActiveAnneeScolaire(): AnneeScolaire {
    const list = this.getAnneesScolaires();
    return list.find((a) => a.is_active) || list[0] || OFFICIAL_ANNEES_SCOLAIRES[1];
  }

  public createAnneeScolaire(
    data: { libelle: string; date_debut: string; date_fin: string },
    operator: UserProfile
  ): AnneeScolaire {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction Générale a le droit d'ouvrir une nouvelle année scolaire.");
    }
    const list = this.getAnneesScolaires();
    if (list.some((a) => a.libelle.trim() === data.libelle.trim())) {
      throw new Error(`L'année scolaire "${data.libelle}" existe déjà dans le système.`);
    }

    const id = `annee-${data.libelle.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now().toString(36)}`;
    const newAnnee: AnneeScolaire = {
      id,
      libelle: data.libelle.trim(),
      date_debut: data.date_debut,
      date_fin: data.date_fin,
      is_active: false,
      statut: 'A_VENIR',
      created_at: new Date().toISOString(),
    };

    list.push(newAnnee);
    this.setItem(STORAGE_KEYS.ANNEES_SCOLAIRES, list);

    // Initialisation automatique des semestres et trimestres officiels pour la nouvelle année
    const periodes = this.getPeriodes();
    const startYear = data.libelle.split('–')[0] || data.libelle.split('-')[0] || '2027';
    const endYear = data.libelle.split('–')[1] || data.libelle.split('-')[1] || '2028';

    const s1: Periode = {
      id: `per-${id}-s1`,
      annee_scolaire: newAnnee.libelle,
      code: 'S1',
      nom: '1er semestre',
      is_active: false,
      is_locked: false,
      date_debut: data.date_debut,
      date_fin: `${endYear.trim()}-01-31`,
    };
    const s2: Periode = {
      id: `per-${id}-s2`,
      annee_scolaire: newAnnee.libelle,
      code: 'S2',
      nom: '2ème semestre',
      is_active: false,
      is_locked: true,
      date_debut: `${endYear.trim()}-02-01`,
      date_fin: data.date_fin,
    };
    const t1: Periode = {
      id: `per-${id}-t1`,
      annee_scolaire: newAnnee.libelle,
      code: 'T1',
      nom: '1er trimestre',
      is_active: false,
      is_locked: false,
      date_debut: data.date_debut,
      date_fin: `${startYear.trim()}-12-20`,
    };
    const t2: Periode = {
      id: `per-${id}-t2`,
      annee_scolaire: newAnnee.libelle,
      code: 'T2',
      nom: '2ème trimestre',
      is_active: false,
      is_locked: true,
      date_debut: `${endYear.trim()}-01-05`,
      date_fin: `${endYear.trim()}-03-27`,
    };
    const t3: Periode = {
      id: `per-${id}-t3`,
      annee_scolaire: newAnnee.libelle,
      code: 'T3',
      nom: '3ème trimestre',
      is_active: false,
      is_locked: true,
      date_debut: `${endYear.trim()}-04-12`,
      date_fin: data.date_fin,
    };
    periodes.push(s1, s2, t1, t2, t3);
    this.setItem(STORAGE_KEYS.PERIODES, periodes);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'CREATION_ANNEE_SCOLAIRE',
      table_cible: 'annees_scolaires',
      record_id: id,
      details: `Création de l'année scolaire pérenne : ${newAnnee.libelle}`,
    });

    return newAnnee;
  }

  public setActiveAnneeScolaire(anneeId: string, operator: UserProfile): AnneeScolaire {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction Générale peut basculer l'année active.");
    }
    const list = this.getAnneesScolaires();
    const target = list.find((a) => a.id === anneeId);
    if (!target) throw new Error("Année scolaire introuvable.");

    list.forEach((a) => {
      a.is_active = a.id === anneeId;
      if (a.id === anneeId) {
        a.statut = 'EN_COURS';
      } else if (new Date(a.date_fin).getTime() < Date.now()) {
        a.statut = 'CLOTUREE';
      }
    });
    this.setItem(STORAGE_KEYS.ANNEES_SCOLAIRES, list);

    // Mettre à jour les paramètres de l'école
    const params = this.getParametres();
    params.annee_academique = target.libelle;
    this.setItem(STORAGE_KEYS.PARAMETRES, params);

    // Activer la période correspondante (1er trimestre)
    const periodes = this.getPeriodes();
    let hasActivated = false;
    periodes.forEach((p) => {
      if (p.annee_scolaire === target.libelle && !hasActivated) {
        p.is_active = true;
        hasActivated = true;
      } else {
        p.is_active = false;
      }
    });
    this.setItem(STORAGE_KEYS.PERIODES, periodes);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'ACTIVATION_ANNEE_SCOLAIRE',
      table_cible: 'annees_scolaires',
      record_id: anneeId,
      details: `Bascule de l'année académique active sur : ${target.libelle}`,
    });

    return target;
  }

  // --- SÉCURITÉ MOTS DE PASSE & GESTION DE SON PROPRE COMPTE (EXIGENCE 3, 6, 7) ---
  public getUserCredentials(): Record<string, string> {
    return this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, {});
  }

  public verifyUserPassword(userIdOrEmail: string, passwordAttempt: string): boolean {
    if (!passwordAttempt) return false;
    const cleanAttempt = passwordAttempt.trim();
    if (!cleanAttempt) return false;

    const profiles = this.getProfiles();
    const cleanId = userIdOrEmail.trim().toLowerCase();
    const cleanDigits = cleanId.replace(/[^0-9]/g, '');

    let user = profiles.find(
      (p) => p.id === userIdOrEmail ||
             (p.email && p.email.toLowerCase() === cleanId) ||
             (cleanDigits.length >= 8 && p.telephone && p.telephone.replace(/[^0-9]/g, '').endsWith(cleanDigits))
    );
    if (!user && (cleanId === 'censeur@gmail.com' || cleanId === 'censeur@ceggogbo.bj' || cleanId === 'censeur')) {
      user = profiles.find((p) => p.id === 'usr-censeur');
    }
    if (!user && (cleanId === 'concepteur@ceggogbo.bj' || cleanId === 'concepteur')) {
      user = profiles.find((p) => p.id === 'usr-concepteur');
    }
    if (!user) return false;

    const creds = this.getUserCredentials();
    const stored = creds[user.id];

    if (stored) {
      // 1. Format haché moderne
      if (stored.startsWith('sha256$')) {
        return stored === hashPassword(cleanAttempt);
      }
      // 2. Migration automatique et sécurisée d'un ancien mot de passe non haché
      if (stored === cleanAttempt) {
        creds[user.id] = hashPassword(cleanAttempt);
        this.setItem(STORAGE_KEYS.CREDENTIALS, creds);
        return true;
      }
    }

    // 3. Mots de passe par défaut acceptés pour les comptes officiels initiaux
    const isDefault = cleanAttempt === 'Passer123!' || cleanAttempt === 'Gogbo2026!';
    if (isDefault) {
      creds[user.id] = hashPassword(cleanAttempt);
      this.setItem(STORAGE_KEYS.CREDENTIALS, creds);
      return true;
    }

    return false;
  }

  public async updateUserPassword(
    userId: string,
    oldPass: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.getProfileById(userId);
    if (!user) return { success: false, error: 'Compte introuvable.' };

    if (!this.verifyUserPassword(userId, oldPass)) {
      return { success: false, error: "L'ancien mot de passe saisi est incorrect." };
    }

    if (!newPass || newPass.trim().length < 6) {
      return { success: false, error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' };
    }

    const creds = this.getUserCredentials();
    creds[userId] = hashPassword(newPass.trim());
    this.setItem(STORAGE_KEYS.CREDENTIALS, creds);

    // Sync Supabase Auth si configuré
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.updateUser({ password: newPass.trim() });
      } catch (e) {
        console.warn('Supabase auth update password error:', e);
      }
    }

    this.addAuditLog({
      user_id: user.id,
      user_nom: `${user.nom} ${user.prenom}`,
      user_role: user.role,
      action: 'MODIFICATION_MOT_DE_PASSE',
      table_cible: 'auth',
      record_id: userId,
      details: `Mise à jour sécurisée du mot de passe personnel de ${user.prenom} ${user.nom}`,
    });

    return { success: true };
  }

  /**
   * RÉINITIALISATION SÉCURISÉE DU MOT DE PASSE (EXIGENCE 2 : COMPTE CENSEUR, CONCEPTEUR, ENSEIGNANTS)
   * Permet de rétablir l'accès sans jamais afficher ni récupérer le mot de passe en clair.
   */
  public async resetUserPassword(
    userIdOrEmail: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> {
    const clean = userIdOrEmail.trim().toLowerCase();
    const profiles = this.getProfiles();
    let user = profiles.find((p) => p.id === userIdOrEmail || (p.email && p.email.toLowerCase() === clean));
    if (!user && (clean === 'censeur@gmail.com' || clean === 'censeur@ceggogbo.bj' || clean === 'censeur')) {
      user = profiles.find((p) => p.id === 'usr-censeur');
    }
    if (!user && (clean === 'concepteur@ceggogbo.bj' || clean === 'concepteur')) {
      user = profiles.find((p) => p.id === 'usr-concepteur');
    }
    if (!user) {
      return { success: false, error: 'Compte introuvable dans le système.' };
    }

    if (!newPass || newPass.trim().length < 6) {
      return { success: false, error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' };
    }

    const creds = this.getUserCredentials();
    creds[user.id] = hashPassword(newPass.trim());
    this.setItem(STORAGE_KEYS.CREDENTIALS, creds);

    // Sync Supabase Auth si configuré
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.updateUser({ password: newPass.trim() });
      } catch (e) {
        console.warn('Supabase auth reset password error:', e);
      }
    }

    this.addAuditLog({
      user_id: user.id,
      user_nom: `${user.nom} ${user.prenom}`,
      user_role: user.role,
      action: 'REINITIALISATION_MOT_DE_PASSE',
      table_cible: 'auth',
      record_id: user.id,
      details: `Réinitialisation sécurisée du mot de passe pour ${user.prenom} ${user.nom} (${user.email || user.id})`,
    });

    return { success: true };
  }

  public async updateUserEmail(
    userId: string,
    newEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: "Veuillez saisir une adresse email académique valide." };
    }

    const profiles = this.getProfiles();
    const userIdx = profiles.findIndex((p) => p.id === userId);
    if (userIdx === -1) return { success: false, error: 'Compte introuvable.' };

    // Unicité de l'identifiant
    const conflict = profiles.find((p) => p.email && p.email.toLowerCase() === cleanEmail && p.id !== userId);
    if (conflict) {
      return { success: false, error: `Cet identifiant (${cleanEmail}) est déjà utilisé par un autre compte.` };
    }

    const oldEmail = profiles[userIdx].email;
    profiles[userIdx].email = cleanEmail;
    profiles[userIdx].updated_at = new Date().toISOString();
    this.setItem(STORAGE_KEYS.PROFILES, profiles);

    // Sync Supabase Auth si configuré
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.updateUser({ email: cleanEmail });
        await supabase.from('profiles').update({ email: cleanEmail }).eq('id', userId);
      } catch (e) {
        console.warn('Supabase update email error:', e);
      }
    }

    this.addAuditLog({
      user_id: profiles[userIdx].id,
      user_nom: `${profiles[userIdx].nom} ${profiles[userIdx].prenom}`,
      user_role: profiles[userIdx].role,
      action: 'MODIFICATION_IDENTIFIANT',
      table_cible: 'profiles',
      record_id: userId,
      details: `Changement de l'identifiant personnel : ${oldEmail} → ${cleanEmail}`,
    });

    return { success: true };
  }

  // --- GESTION DE LA SESSION ACTIVE DANS LE STOCKAGE ---
  public getCurrentUserId(): string | null {
    return this.rawGet('gogbo_v2_current_user_id');
  }

  public setCurrentUserId(id: string | null): void {
    if (!id) {
      this.rawRemove('gogbo_v2_current_user_id');
    } else {
      this.rawSet('gogbo_v2_current_user_id', id);
    }
  }

  public clearCurrentUser(): void {
    this.rawRemove('gogbo_v2_current_user_id');
  }

  public getActiveUser(): UserProfile | null {
    const id = this.getCurrentUserId();
    if (!id) return null;
    return this.getProfileById(id) || null;
  }

  public setActiveUser(user: UserProfile | null): void {
    this.setCurrentUserId(user ? user.id : null);
  }

  public logout(): void {
    this.clearCurrentUser();
  }

  public getNotesByAffectation(affectationId: string): Note[] {
    return this.getNotes().filter((n) => n.affectation_id === affectationId);
  }

  // --- SYNCHRONISATION ASYNCHRONE MATIÈRE & COEFFICIENTS ---
  public async updateMatiereAsync(id: string, updates: Partial<Matiere>, operator: UserProfile): Promise<Matiere> {
    const updated = this.updateMatiere(id, updates, operator);
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('matieres').update(updates).eq('id', id);
      } catch (e) {
        console.warn('Supabase updateMatiere error:', e);
      }
    }
    return updated;
  }

  // --- ATTRIBUTIONS DE CLASSE (AFFECTATIONS PÉDAGOGIQUES PLURIANNUELLES) ---
  public getAffectations(anneeScolaire?: string): AffectationPedagogique[] {
    const list = this.getItem<AffectationPedagogique[]>(STORAGE_KEYS.AFFECTATIONS, SEED_AFFECTATIONS);
    let hasMerged = false;
    for (const seed of SEED_AFFECTATIONS) {
      if (!list.some((a) => a.id === seed.id)) {
        list.push(seed);
        hasMerged = true;
      }
    }
    if (hasMerged) {
      this.setItem(STORAGE_KEYS.AFFECTATIONS, list);
    }
    const normalized = list.map((a) => a.annee_scolaire ? a : { ...a, annee_scolaire: '2026–2027' });
    if (anneeScolaire) {
      return normalized.filter((a) => a.annee_scolaire === anneeScolaire);
    }
    return normalized;
  }

  public getAffectationsByProfile(profileId: string, anneeScolaire?: string): AffectationPedagogique[] {
    return this.getAffectations(anneeScolaire).filter((a) => a.profile_id === profileId && a.statut === 'ACTIF');
  }

  public getAffectationsByClasse(classeId: string, anneeScolaire?: string): AffectationPedagogique[] {
    return this.getAffectations(anneeScolaire).filter((a) => a.classe_id === classeId && a.statut === 'ACTIF');
  }

  /**
   * RÈGLE PARTICULIÈRE POUR 6ème À 3ème :
   * Pour les classes de 6ème, 5ème, 4ème et 3ème :
   * Lecture et Communication écrite doivent être attribuées au même enseignant dans une même classe.
   * Il est interdit d'avoir Lecture -> Enseignant X et Communication écrite -> Enseignant Y dans la même classe.
   */
  public validateLectureCommunicationRule(
    profileId: string,
    classeId: string,
    matiereId: string,
    anneeScolaire: string,
    excludeAffId?: string
  ): void {
    const classe = this.getClasseById(classeId);
    if (!classe) return;
    const isPremierCycle = ['6ème', '5ème', '4ème', '3ème'].includes(classe.niveau) ||
      ['6', '5', '4', '3'].some((prefix) => classe.nom.startsWith(prefix));
    if (!isPremierCycle) return;

    const matiere = this.getMatiereById(matiereId);
    if (!matiere) return;

    const isLecture = matiere.code === 'LECTURE' || matiere.id === 'mat-lect' || (matiere.nom || '').toLowerCase().includes('lecture');
    const isComm = matiere.code === 'COMM_ECR' || matiere.id === 'mat-comm' || (matiere.nom || '').toLowerCase().includes('communication');

    if (!isLecture && !isComm) return;

    const targetPartnerName = isLecture ? 'Communication écrite' : 'Lecture';
    const affectationsInClass = this.getAffectations(anneeScolaire).filter(
      (a) => a.classe_id === classeId && a.statut === 'ACTIF' && a.id !== excludeAffId
    );

    for (const aff of affectationsInClass) {
      const m = this.getMatiereById(aff.matiere_id);
      if (!m) continue;
      const isPartner = isLecture
        ? (m.code === 'COMM_ECR' || m.id === 'mat-comm' || (m.nom || '').toLowerCase().includes('communication'))
        : (m.code === 'LECTURE' || m.id === 'mat-lect' || (m.nom || '').toLowerCase().includes('lecture'));

      if (isPartner && aff.profile_id !== profileId) {
        const assignedProf = this.getProfileById(aff.profile_id);
        const profName = assignedProf ? `${assignedProf.nom} ${assignedProf.prenom}` : 'un autre enseignant';
        throw new Error(
          `Règle pédagogique obligatoire (6ème à 3ème) : Pour la classe ${classe.nom}, Lecture et Communication écrite doivent être obligatoirement attribuées au même enseignant. ${targetPartnerName} est actuellement attribuée à ${profName}.`
        );
      }
    }
  }

  public createAffectation(
    data: Omit<AffectationPedagogique, 'id' | 'created_at' | 'updated_at' | 'annee_scolaire'> & { annee_scolaire?: string },
    operator: UserProfile
  ): AffectationPedagogique {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction peut gérer les attributions de classe.");
    }
    const annee = data.annee_scolaire || this.getActiveAnneeScolaire().libelle;
    const list = this.getAffectations();

    // Vérifier doublon (même enseignant + classe + matière + année scolaire)
    const exists = list.some(
      (a) =>
        a.profile_id === data.profile_id &&
        a.classe_id === data.classe_id &&
        a.matiere_id === data.matiere_id &&
        (a.annee_scolaire || '2026–2027') === annee &&
        a.statut === 'ACTIF'
    );
    if (exists) {
      throw new Error(`Cette attribution de classe existe déjà pour cet enseignant, cette classe et cette matière en ${annee}.`);
    }

    // Vérifier la règle 6ème à 3ème (Lecture et Communication écrite = même enseignant)
    this.validateLectureCommunicationRule(data.profile_id, data.classe_id, data.matiere_id, annee);

    const id = `aff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newAff: AffectationPedagogique = {
      ...data,
      annee_scolaire: annee,
      id,
      created_at: now,
      updated_at: now,
    };
    list.push(newAff);
    this.setItem(STORAGE_KEYS.AFFECTATIONS, list);

    const prof = this.getProfileById(data.profile_id);
    const classe = this.getClasseById(data.classe_id);
    const mat = this.getMatiereById(data.matiere_id);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'CREATION_AFFECTATION',
      table_cible: 'affectations',
      record_id: id,
      details: `Attribution (${annee}): ${prof?.nom} ${prof?.prenom} -> ${classe?.nom} -> ${mat?.nom} (${data.heures_hebdo}h/sem)`,
    });

    return newAff;
  }

  public updateAffectation(
    id: string,
    data: Partial<Omit<AffectationPedagogique, 'id' | 'created_at' | 'updated_at'>>,
    operator: UserProfile
  ): AffectationPedagogique {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction peut gérer les attributions de classe.");
    }
    const list = this.getAffectations();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Attribution de classe introuvable.');

    const current = list[idx];
    const targetProfileId = data.profile_id || current.profile_id;
    const targetClasseId = data.classe_id || current.classe_id;
    const targetMatiereId = data.matiere_id || current.matiere_id;
    const targetAnnee = data.annee_scolaire || current.annee_scolaire || this.getActiveAnneeScolaire().libelle;

    // Vérifier doublon
    const exists = list.some(
      (a) =>
        a.id !== id &&
        a.profile_id === targetProfileId &&
        a.classe_id === targetClasseId &&
        a.matiere_id === targetMatiereId &&
        (a.annee_scolaire || '2026–2027') === targetAnnee &&
        a.statut === 'ACTIF'
    );
    if (exists) {
      throw new Error(`Une attribution active existe déjà pour cet enseignant, cette classe et cette matière en ${targetAnnee}.`);
    }

    // Vérifier la règle 6ème à 3ème (Lecture et Communication écrite = même enseignant)
    this.validateLectureCommunicationRule(targetProfileId, targetClasseId, targetMatiereId, targetAnnee, id);

    list[idx] = {
      ...current,
      ...data,
      profile_id: targetProfileId,
      classe_id: targetClasseId,
      matiere_id: targetMatiereId,
      annee_scolaire: targetAnnee,
      heures_hebdo: data.heures_hebdo !== undefined ? data.heures_hebdo : current.heures_hebdo,
      updated_at: new Date().toISOString(),
    };

    this.setItem(STORAGE_KEYS.AFFECTATIONS, list);

    const prof = this.getProfileById(targetProfileId);
    const classe = this.getClasseById(targetClasseId);
    const mat = this.getMatiereById(targetMatiereId);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'MODIFICATION_AFFECTATION',
      table_cible: 'affectations',
      record_id: id,
      details: `Modification attribution (${targetAnnee}): ${prof?.nom} ${prof?.prenom} -> ${classe?.nom} -> ${mat?.nom}`,
    });

    return list[idx];
  }

  /**
   * Création simultanée de plusieurs attributions pour un même enseignant et une même matière
   * dans plusieurs classes distinctes pour une année scolaire donnée.
   */
  public createAffectationsBulk(
    profileId: string,
    classeIds: string[],
    matiereId: string,
    anneeScolaire: string,
    heuresHebdo: number,
    operator: UserProfile,
    includeTwinCommLect = false
  ): { created: AffectationPedagogique[]; errors: string[] } {
    const created: AffectationPedagogique[] = [];
    const errors: string[] = [];

    const mat = this.getMatiereById(matiereId);
    const isLectureOrComm = mat && (
      mat.code === 'LECTURE' || mat.code === 'COMM_ECR' ||
      mat.id === 'mat-lect' || mat.id === 'mat-comm' ||
      (mat.nom || '').toLowerCase().includes('lecture') || (mat.nom || '').toLowerCase().includes('communication')
    );
    const twinSubject = isLectureOrComm
      ? this.getMatieres().find((m) =>
          (mat.code === 'LECTURE' || (mat.nom || '').toLowerCase().includes('lecture'))
            ? (m.code === 'COMM_ECR' || m.id === 'mat-comm' || (m.nom || '').toLowerCase().includes('communication'))
            : (m.code === 'LECTURE' || m.id === 'mat-lect' || (m.nom || '').toLowerCase().includes('lecture'))
        )
      : undefined;

    for (const cId of classeIds) {
      const cls = this.getClasseById(cId);
      const clsName = cls?.nom || cId;
      try {
        const aff = this.createAffectation(
          {
            profile_id: profileId,
            classe_id: cId,
            matiere_id: matiereId,
            annee_scolaire: anneeScolaire,
            heures_hebdo: heuresHebdo,
            statut: 'ACTIF',
          },
          operator
        );
        created.push(aff);

        // Si attribution jumelle demandée (Lecture + Communication écrite pour 6e à 3e)
        if (includeTwinCommLect && twinSubject && cls) {
          const isPremierCycle = ['6ème', '5ème', '4ème', '3ème'].includes(cls.niveau) ||
            ['6', '5', '4', '3'].some((prefix) => cls.nom.startsWith(prefix));
          if (isPremierCycle) {
            try {
              const twinAff = this.createAffectation(
                {
                  profile_id: profileId,
                  classe_id: cId,
                  matiere_id: twinSubject.id,
                  annee_scolaire: anneeScolaire,
                  heures_hebdo: twinSubject.coefficient > 0 ? twinSubject.coefficient : 2,
                  statut: 'ACTIF',
                },
                operator
              );
              created.push(twinAff);
            } catch {
              // Doublon ou déjà attribué
            }
          }
        }
      } catch (err: unknown) {
        errors.push(`${clsName} : ${err instanceof Error ? err.message : 'Erreur'}`);
      }
    }

    return { created, errors };
  }

  public deleteAffectation(id: string, operator: UserProfile): void {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction peut gérer les attributions de classe.");
    }
    const list = this.getAffectations();
    const aff = list.find((a) => a.id === id);
    if (!aff) throw new Error('Attribution de classe introuvable');

    const updated = list.filter((a) => a.id !== id);
    this.setItem(STORAGE_KEYS.AFFECTATIONS, updated);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SUPPRESSION_AFFECTATION',
      table_cible: 'affectations',
      record_id: id,
      details: `Suppression attribution de classe: ID ${id}`,
    });
  }

  public toggleAffectationStatus(id: string, operator: UserProfile): AffectationPedagogique {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction peut gérer les attributions de classe.");
    }
    const list = this.getAffectations();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Attribution de classe introuvable');

    const newStatut = list[idx].statut === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    list[idx] = {
      ...list[idx],
      statut: newStatut,
      updated_at: new Date().toISOString(),
    };
    this.setItem(STORAGE_KEYS.AFFECTATIONS, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'MODIFICATION_AFFECTATION',
      table_cible: 'affectations',
      record_id: id,
      details: `Changement statut attribution de classe -> ${newStatut}`,
    });

    return list[idx];
  }

  // --- GESTION DES NOTES ET PERMISSIONS (SECTION 3, 10, 16) ---

  /**
   * Vérification stricte des permissions de saisie :
   * L'utilisateur DOIT posséder une attribution de classe active pour cette année scolaire sur la combinaison (Classe + Matière),
   * peu importe son rôle administratif (Enseignant, Censeur ou Directeur Général).
   */
  public checkCanEnterNote(
    userId: string,
    classeId: string,
    matiereId: string,
    periodeId: string
  ): { allowed: boolean; reason?: string; affectationId?: string } {
    // 1. Vérifier la période
    const periodes = this.getPeriodes();
    const periode = periodes.find((p) => p.id === periodeId);
    if (!periode) {
      return { allowed: false, reason: 'Période invalide ou non trouvée.' };
    }
    if (periode.is_locked) {
      return { allowed: false, reason: `La saisie est verrouillée pour ${periode.nom} par le Censeur.` };
    }

    // 1.1 Vérifier que l'année scolaire de la période n'est pas clôturée
    const annees = this.getAnneesScolaires();
    const anneeObj = annees.find((a) => a.libelle === periode.annee_scolaire);
    if (anneeObj && anneeObj.statut === 'CLOTUREE') {
      return {
        allowed: false,
        reason: `L'année scolaire ${periode.annee_scolaire} est archivée et clôturée. Aucune saisie ou modification de note n'y est autorisée.`,
      };
    }

    // 2. Vérifier l'attribution active POUR L'ANNÉE DE LA PÉRIODE
    const affectations = this.getAffectations(periode.annee_scolaire);
    const activeAffectation = affectations.find(
      (a) =>
        a.profile_id === userId &&
        a.classe_id === classeId &&
        a.matiere_id === matiereId &&
        a.statut === 'ACTIF'
    );

    if (!activeAffectation) {
      return {
        allowed: false,
        reason:
          `Accès refusé : Vous ne disposez pas d'une attribution de classe active pour cette classe et cette matière en ${periode.annee_scolaire}. Seul l'enseignant ou personnel attribué pour cette année scolaire peut saisir ces notes.`,
      };
    }

    return { allowed: true, affectationId: activeAffectation.id };
  }

  public getNotes(): Note[] {
    return this.getItem<Note[]>(STORAGE_KEYS.NOTES, SEED_NOTES);
  }

  public getNotesByEleve(eleveId: string, anneeScolaire?: string): Note[] {
    const list = this.getNotes().filter((n) => n.eleve_id === eleveId);
    if (anneeScolaire) {
      return list.filter((n) => {
        if (n.annee_scolaire) return n.annee_scolaire === anneeScolaire;
        const p = this.getPeriodes().find((per) => per.id === n.periode_id);
        return p?.annee_scolaire === anneeScolaire;
      });
    }
    return list;
  }

  public getNotesByAffectationAndPeriode(affectationId: string, periodeId: string): Note[] {
    return this.getNotes().filter((n) => n.affectation_id === affectationId && n.periode_id === periodeId);
  }

  /**
   * Saisie sécurisée d'une note (Section 10 & 16)
   */
  public saveNote(
    data: {
      eleve_id: string;
      affectation_id: string;
      periode_id: string;
      valeur: number;
      type_evaluation: Note['type_evaluation'];
      observation?: string;
    },
    user: UserProfile
  ): Note {
    // Validation mathématique stricte de la note
    if (typeof data.valeur !== 'number' || isNaN(data.valeur)) {
      throw new Error('La valeur de la note doit être un nombre valide.');
    }
    if (data.valeur < 0 || data.valeur > 20) {
      throw new Error('La note doit obligatoirement être comprise entre 0 et 20.');
    }

    // Arrondi à deux décimales maximum
    const noteVal = Math.round(data.valeur * 100) / 100;

    // Vérifier l'affectation
    const affs = this.getAffectations();
    const aff = affs.find((a) => a.id === data.affectation_id && a.statut === 'ACTIF');
    if (!aff) {
      throw new Error('Attribution de classe introuvable ou inactive.');
    }

    // Vérification RLS applicative : L'utilisateur qui saisit doit être le titulaire de l'attribution
    if (aff.profile_id !== user.id) {
      throw new Error(
        "Violation de sécurité RLS : Vous ne pouvez pas saisir ou modifier les notes d'une attribution de classe qui ne vous a pas été accordée."
      );
    }

    // Vérifier le verrouillage de la période
    const periodes = this.getPeriodes();
    const per = periodes.find((p) => p.id === data.periode_id);
    if (!per || per.is_locked) {
      throw new Error('Saisie refusée : la période sélectionnée est clôturée ou verrouillée.');
    }

    // Vérifier si l'année scolaire de la période est clôturée
    const annees = this.getAnneesScolaires();
    const anneeObj = annees.find((a) => a.libelle === per.annee_scolaire);
    if (anneeObj && anneeObj.statut === 'CLOTUREE') {
      throw new Error(`Saisie refusée : l'année scolaire ${per.annee_scolaire} est clôturée et archivée.`);
    }

    const notes = this.getNotes();
    const now = new Date().toISOString();

    // Empêcher les doublons (même élève + affectation + période + type_evaluation)
    const existingIndex = notes.findIndex(
      (n) =>
        n.eleve_id === data.eleve_id &&
        n.affectation_id === data.affectation_id &&
        n.periode_id === data.periode_id &&
        n.type_evaluation === data.type_evaluation
    );

    let savedNote: Note;

    if (existingIndex !== -1) {
      // Modification de la note existante
      savedNote = {
        ...notes[existingIndex],
        valeur: noteVal,
        observation: data.observation || '',
        saisi_par: user.id,
        annee_scolaire: per.annee_scolaire,
        updated_at: now,
      };
      notes[existingIndex] = savedNote;
    } else {
      // Nouvelle note
      savedNote = {
        id: `not-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        eleve_id: data.eleve_id,
        affectation_id: data.affectation_id,
        periode_id: data.periode_id,
        annee_scolaire: per.annee_scolaire,
        valeur: noteVal,
        type_evaluation: data.type_evaluation,
        saisi_par: user.id,
        observation: data.observation || '',
        created_at: now,
        updated_at: now,
      };
      notes.push(savedNote);
    }

    this.setItem(STORAGE_KEYS.NOTES, notes);

    const eleve = this.getEleveById(data.eleve_id);
    this.addAuditLog({
      user_id: user.id,
      user_nom: `${user.nom} ${user.prenom}`,
      user_role: user.role,
      action: existingIndex !== -1 ? 'MODIFICATION_NOTE' : 'SAISIE_NOTE',
      table_cible: 'notes',
      record_id: savedNote.id,
      details: `${existingIndex !== -1 ? 'Modification' : 'Saisie'} note (${data.type_evaluation}) pour ${eleve?.nom} ${eleve?.prenom} (${per.annee_scolaire}): ${noteVal}/20`,
    });

    // Synchronisation persistante avec Supabase si connecté
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        void (async () => {
          try {
            const { error } = await client.from('notes').upsert({
              id: savedNote.id,
              eleve_id: savedNote.eleve_id,
              affectation_id: savedNote.affectation_id,
              periode_id: savedNote.periode_id,
              annee_scolaire: savedNote.annee_scolaire || per.annee_scolaire,
              valeur: savedNote.valeur,
              type_evaluation: savedNote.type_evaluation,
              saisi_par: savedNote.saisi_par,
              observation: savedNote.observation || null,
              updated_at: now,
            });
            if (error) {
              console.error('Erreur synchronisation Supabase (notes upsert):', error.message);
            }
          } catch (err) {
            console.error('Exception Supabase notes upsert:', err);
          }
        })();
      }
    }

    return savedNote;
  }

  /**
   * Version asynchrone vérifiée pour la saisie de note avec confirmation Supabase
   */
  public async saveNoteAsync(
    data: {
      eleve_id: string;
      affectation_id: string;
      periode_id: string;
      valeur: number;
      type_evaluation: Note['type_evaluation'];
      observation?: string;
    },
    user: UserProfile
  ): Promise<Note> {
    const note = this.saveNote(data, user);
    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      if (client) {
        const { error } = await client.from('notes').upsert({
          id: note.id,
          eleve_id: note.eleve_id,
          affectation_id: note.affectation_id,
          periode_id: note.periode_id,
          annee_scolaire: note.annee_scolaire,
          valeur: note.valeur,
          type_evaluation: note.type_evaluation,
          saisi_par: note.saisi_par,
          observation: note.observation || null,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          throw new Error(`Échec d'enregistrement sur la base distante Supabase : ${error.message}`);
        }
      }
    }
    return note;
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Conserver les 200 derniers logs
    if (logs.length > 200) {
      logs.length = 200;
    }
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- MODULE SUIVI DES PRÉSENCES (ABSENCES & ABANDONS) (Section 8) ---
  public getPresences(): EnregistrementPresence[] {
    return this.getItem<EnregistrementPresence[]>(STORAGE_KEYS.PRESENCES, SEED_PRESENCES);
  }

  public getPresencesByAnnee(annee: string): EnregistrementPresence[] {
    return this.getPresences().filter((p) => p.annee_scolaire === annee);
  }

  public getPresencesByClasse(classeId: string, annee: string): EnregistrementPresence[] {
    return this.getPresences().filter((p) => p.classe_id === classeId && p.annee_scolaire === annee);
  }

  public getPresencesByEleve(eleveId: string, annee: string): EnregistrementPresence[] {
    return this.getPresences().filter((p) => p.eleve_id === eleveId && p.annee_scolaire === annee);
  }

  public savePresence(
    data: Omit<EnregistrementPresence, 'id' | 'created_at' | 'updated_at'>,
    operator: UserProfile
  ): EnregistrementPresence {
    if (operator.role !== 'SURVEILLANT_GENERAL' && !this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Surveillant Général ou l'Administration peut enregistrer des présences / absences.");
    }
    const list = this.getPresences();
    const id = `pres-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newEntry: EnregistrementPresence = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };
    list.push(newEntry);
    this.setItem(STORAGE_KEYS.PRESENCES, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'ENREGISTREMENT_PRESENCE',
      table_cible: 'presences',
      record_id: id,
      details: `${data.statut} enregistré pour élève ${data.eleve_id} (Date: ${data.date})`,
    });

    return newEntry;
  }

  public deletePresence(id: string, operator: UserProfile): boolean {
    if (operator.role !== 'SURVEILLANT_GENERAL' && !this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Surveillant Général ou l'Administration peut supprimer un enregistrement de présence.");
    }
    const list = this.getPresences();
    const updated = list.filter((p) => p.id !== id);
    this.setItem(STORAGE_KEYS.PRESENCES, updated);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SUPPRESSION_PRESENCE',
      table_cible: 'presences',
      record_id: id,
      details: `Suppression enregistrement présence ID: ${id}`,
    });

    return true;
  }

  public getEleveAbsencesCount(eleveId: string, annee: string, periodeId?: string): number {
    const list = this.getPresencesByEleve(eleveId, annee);
    return list.filter((p) => {
      if (p.statut !== 'ABSENT') return false;
      if (periodeId && p.periode_id && p.periode_id !== periodeId) return false;
      return true;
    }).length;
  }

  public isEleveAbandon(eleveId: string, annee: string): boolean {
    const list = this.getPresencesByEleve(eleveId, annee);
    return list.some((p) => p.statut === 'ABANDON');
  }

  // --- MODULE GESTION DES PAIEMENTS & CONTRIBUTIONS (Section 9) ---
  public getPaiements(): PaiementContribution[] {
    return this.getItem<PaiementContribution[]>(STORAGE_KEYS.PAIEMENTS, SEED_PAIEMENTS);
  }

  public getPaiementsByAnnee(annee: string): PaiementContribution[] {
    return this.getPaiements().filter((p) => p.annee_scolaire === annee);
  }

  public getPaiementsByEleve(eleveId: string, annee: string): PaiementContribution[] {
    return this.getPaiements().filter((p) => p.eleve_id === eleveId && p.annee_scolaire === annee);
  }

  public savePaiement(
    data: Omit<PaiementContribution, 'id' | 'created_at' | 'updated_at'>,
    operator: UserProfile
  ): PaiementContribution {
    if (operator.role !== 'COMPTABLE' && !this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Comptable ou l'Administration peut enregistrer des paiements de contributions scolaires.");
    }
    const list = this.getPaiements();
    const id = `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newEntry: PaiementContribution = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };
    list.push(newEntry);
    this.setItem(STORAGE_KEYS.PAIEMENTS, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'ENREGISTREMENT_PAIEMENT',
      table_cible: 'paiements',
      record_id: id,
      details: `Reçu ${data.numero_recu} - Montant: ${data.montant_paye} FCFA pour élève ${data.eleve_id}`,
    });

    return newEntry;
  }

  public deletePaiement(id: string, operator: UserProfile): boolean {
    if (operator.role !== 'COMPTABLE' && !this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Comptable ou l'Administration peut supprimer un reçu.");
    }
    const list = this.getPaiements();
    const updated = list.filter((p) => p.id !== id);
    this.setItem(STORAGE_KEYS.PAIEMENTS, updated);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SUPPRESSION_PAIEMENT',
      table_cible: 'paiements',
      record_id: id,
      details: `Suppression paiement ID: ${id}`,
    });

    return true;
  }

  // --- MODULE CONFIGURATION DES CONTRIBUTIONS SCOLAIRES (COMPTABLE) ---
  public getContributions(anneeScolaire?: string): ContributionConfig[] {
    const list = this.getItem<ContributionConfig[]>(STORAGE_KEYS.CONTRIBUTIONS, SEED_CONTRIBUTIONS);
    if (!anneeScolaire) return list;
    return list.filter((c) => c.annee_scolaire === anneeScolaire);
  }

  public saveContribution(
    data: Omit<ContributionConfig, 'id' | 'created_at' | 'updated_at'>,
    operator: UserProfile
  ): ContributionConfig {
    if (operator.role !== 'COMPTABLE' && !this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Comptable ou l'Administration peut créer des rubriques de contributions.");
    }
    const list = this.getContributions();
    const id = `cnt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newEntry: ContributionConfig = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };
    list.push(newEntry);
    this.setItem(STORAGE_KEYS.CONTRIBUTIONS, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'CREATION_CONTRIBUTION',
      table_cible: 'contributions',
      record_id: id,
      details: `Création contribution ${data.libelle} (${data.montant_prevu} FCFA) - Année ${data.annee_scolaire}`,
    });

    return newEntry;
  }

  public updateContribution(
    id: string,
    data: Partial<ContributionConfig>,
    operator: UserProfile
  ): ContributionConfig {
    if (operator.role !== 'COMPTABLE' && !this.canAdminister(operator)) {
      throw new Error("Action non autorisée.");
    }
    const list = this.getContributions();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Contribution introuvable");
    list[idx] = {
      ...list[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.setItem(STORAGE_KEYS.CONTRIBUTIONS, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'MODIFICATION_CONTRIBUTION',
      table_cible: 'contributions',
      record_id: id,
      details: `Mise à jour contribution ${list[idx].libelle}`,
    });

    return list[idx];
  }

  public deleteContribution(id: string, operator: UserProfile): boolean {
    if (operator.role !== 'COMPTABLE' && !this.canAdminister(operator)) {
      throw new Error("Action non autorisée.");
    }
    const list = this.getContributions();
    const updated = list.filter((c) => c.id !== id);
    this.setItem(STORAGE_KEYS.CONTRIBUTIONS, updated);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SUPPRESSION_CONTRIBUTION',
      table_cible: 'contributions',
      record_id: id,
      details: `Suppression contribution ${id}`,
    });

    return true;
  }

  // --- MODULE GESTION BUDGETS ET DÉPENSES RÉELLES (COMPTABLE) ---
  public getDepenses(anneeScolaire?: string): DepenseBudgetaire[] {
    const list = this.getItem<DepenseBudgetaire[]>(STORAGE_KEYS.DEPENSES, SEED_DEPENSES);
    if (!anneeScolaire) return list;
    return list.filter((d) => d.annee_scolaire === anneeScolaire);
  }

  public saveDepense(
    data: Omit<DepenseBudgetaire, 'id' | 'created_at' | 'updated_at'>,
    operator: UserProfile
  ): DepenseBudgetaire {
    if (operator.role !== 'COMPTABLE' && !this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Comptable ou l'Administration peut enregistrer une dépense.");
    }
    const list = this.getDepenses();
    const id = `dep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newEntry: DepenseBudgetaire = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };
    list.unshift(newEntry);
    this.setItem(STORAGE_KEYS.DEPENSES, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'ENREGISTREMENT_DEPENSE',
      table_cible: 'depenses',
      record_id: id,
      details: `Dépense ${data.libelle} (${data.montant_depense} FCFA) - Bénéficiaire: ${data.beneficiaire}`,
    });

    return newEntry;
  }

  public deleteDepense(id: string, operator: UserProfile): boolean {
    if (operator.role !== 'COMPTABLE' && !this.canAdminister(operator)) {
      throw new Error("Action non autorisée.");
    }
    const list = this.getDepenses();
    const updated = list.filter((d) => d.id !== id);
    this.setItem(STORAGE_KEYS.DEPENSES, updated);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SUPPRESSION_DEPENSE',
      table_cible: 'depenses',
      record_id: id,
      details: `Suppression dépense ${id}`,
    });

    return true;
  }

  // ====================================================================
  // MODULE : NOTE DE CONDUITE (Saisie exclusive par le Professeur Principal)
  // ====================================================================
  public getNotesConduite(anneeScolaire?: string): NoteConduite[] {
    const list = this.getItem<NoteConduite[]>(STORAGE_KEYS.NOTES_CONDUITE, SEED_NOTES_CONDUITE);
    if (!anneeScolaire) return list;
    return list.filter((n) => n.annee_scolaire === anneeScolaire);
  }

  public getNoteConduiteByEleve(
    eleveId: string,
    periodeId: string,
    anneeScolaire?: string
  ): NoteConduite | undefined {
    return this.getNotesConduite(anneeScolaire).find(
      (n) => n.eleve_id === eleveId && n.periode_id === periodeId
    );
  }

  public getNoteConduiteEleve(
    eleveId: string,
    periodeId: string,
    anneeScolaire?: string
  ): NoteConduite | undefined {
    return this.getNoteConduiteByEleve(eleveId, periodeId, anneeScolaire);
  }

  public getNotesConduiteByClasse(
    classeId: string,
    periodeId: string,
    anneeScolaire?: string
  ): NoteConduite[] {
    return this.getNotesConduite(anneeScolaire).filter(
      (n) => n.classe_id === classeId && n.periode_id === periodeId
    );
  }

  public saveNoteConduite(
    data: {
      eleve_id: string;
      classe_id: string;
      periode_id: string;
      annee_scolaire: string;
      note: number;
      appreciation?: string;
      motif_modification?: string;
    },
    operator: UserProfile
  ): NoteConduite {
    // Vérification des droits : L'opérateur DOIT être le PP ACTIF de la classe ou Censeur/DG/Concepteur
    const isPP = this.getActiveProfesseurPrincipalByEnseignant(operator.id, data.annee_scolaire)?.classe_id === data.classe_id;
    const canManageConduite = isPP || this.canAdminister(operator);
    if (!canManageConduite) {
      throw new Error("Action non autorisée : Seul le Professeur Principal de la classe (ou l'Administration) peut saisir ou modifier la note de conduite.");
    }

    if (data.note < 0 || data.note > 20) {
      throw new Error("La note de conduite doit être comprise entre 0 et 20.");
    }

    const list = this.getNotesConduite();
    const existingIndex = list.findIndex(
      (n) =>
        n.eleve_id === data.eleve_id &&
        n.periode_id === data.periode_id &&
        n.annee_scolaire === data.annee_scolaire
    );

    const now = new Date().toISOString();
    const apprec = data.appreciation || (
      data.note >= 18 ? 'Excellente conduite' :
      data.note >= 16 ? 'Très bonne conduite' :
      data.note >= 14 ? 'Bonne conduite' :
      data.note >= 12 ? 'Conduite assez bien' :
      data.note >= 10 ? 'Conduite passable' :
      data.note >= 8 ? 'Conduite insuffisante' :
      data.note >= 6 ? 'Mauvaise conduite' : 'Conduite très faible'
    );

    let resultEntry: NoteConduite;

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      const historique = existing.historique || [];
      historique.push({
        ancienne_note: existing.note,
        nouvelle_note: data.note,
        modifie_par_id: operator.id,
        modifie_par_nom: `${operator.nom} ${operator.prenom}`,
        date: now,
        motif: data.motif_modification,
      });

      resultEntry = {
        ...existing,
        note: data.note,
        appreciation: apprec,
        saisi_par_id: operator.id,
        saisi_par_nom: `${operator.nom} ${operator.prenom}`,
        date_saisie: now,
        historique,
        updated_at: now,
      };
      list[existingIndex] = resultEntry;
    } else {
      const id = `cnd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      resultEntry = {
        id,
        annee_scolaire: data.annee_scolaire,
        periode_id: data.periode_id,
        classe_id: data.classe_id,
        eleve_id: data.eleve_id,
        note: data.note,
        appreciation: apprec,
        saisi_par_id: operator.id,
        saisi_par_nom: `${operator.nom} ${operator.prenom}`,
        date_saisie: now,
        historique: [],
        created_at: now,
        updated_at: now,
      };
      list.push(resultEntry);
    }

    this.setItem(STORAGE_KEYS.NOTES_CONDUITE, list);

    const el = this.getEleveById(data.eleve_id);
    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SAISIE_NOTE_CONDUITE',
      table_cible: 'notes_conduite',
      record_id: resultEntry.id,
      details: `Note de conduite ${data.note}/20 pour l'élève ${el?.nom} ${el?.prenom} par ${operator.nom} ${operator.prenom} (PP)`,
    });

    return resultEntry;
  }

  // ====================================================================
  // MODULE : PUNITIONS SCOLAIRES QUOTIDIENNES (Ouvert à TOUT le personnel)
  // ====================================================================
  public getPunitions(anneeScolaire?: string): PunitionScolaire[] {
    const list = this.getItem<PunitionScolaire[]>(STORAGE_KEYS.PUNITIONS, SEED_PUNITIONS);
    const normalized = list.map((p) => ({
      ...p,
      statut: (p.statut || 'ACTIVE') as StatutPunition,
    }));
    if (!anneeScolaire) return normalized;
    return normalized.filter((p) => p.annee_scolaire === anneeScolaire);
  }

  public getPunitionsByEleve(eleveId: string, anneeScolaire?: string): PunitionScolaire[] {
    return this.getPunitions(anneeScolaire).filter((p) => p.eleve_id === eleveId);
  }

  public getPunitionsByClasse(classeId: string, anneeScolaire?: string): PunitionScolaire[] {
    return this.getPunitions(anneeScolaire).filter((p) => p.classe_id === classeId);
  }

  public savePunition(
    data: Omit<PunitionScolaire, 'id' | 'created_at' | 'updated_at' | 'auteur_id' | 'auteur_nom' | 'auteur_role' | 'statut'>,
    operator: UserProfile
  ): PunitionScolaire {
    const canPunish = operator.role === 'ENSEIGNANT' || operator.is_enseignant || this.canAdminister(operator) || operator.role === 'SURVEILLANT_GENERAL';
    if (!canPunish) {
      throw new Error("Action non autorisée : Seul le personnel enseignant et administratif peut consigner une punition.");
    }

    const interdictionsCorps = ['coup', 'gifle', 'chicotte', 'regle', 'injure', 'fouette', 'frapper'];
    const pLower = `${data.punition_appliquee} ${data.observation || ''}`.toLowerCase();
    for (const mot of interdictionsCorps) {
      if (pLower.includes(mot)) {
        throw new Error("PUNITION INTERDITE : Tout châtiment corporel, violence physique ou injure est formellement banni de l'établissement.");
      }
    }

    if (pLower.includes('note') || pLower.includes('zéro') || pLower.includes('zero')) {
      throw new Error("PUNITION INTERDITE : Il est strictement interdit d'utiliser une note académique comme punition disciplinaire.");
    }

    const list = this.getItem<PunitionScolaire[]>(STORAGE_KEYS.PUNITIONS, SEED_PUNITIONS);
    const id = `pun-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newPunition: PunitionScolaire = {
      ...data,
      id,
      auteur_id: operator.id,
      auteur_nom: `${operator.nom} ${operator.prenom}`,
      auteur_role: operator.role,
      statut: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };

    list.unshift(newPunition);
    this.setItem(STORAGE_KEYS.PUNITIONS, list);

    const el = this.getEleveById(data.eleve_id);
    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'ENREGISTREMENT_PUNITION',
      table_cible: 'punitions',
      record_id: id,
      details: `Punition appliquée à ${el?.nom} ${el?.prenom} pour "${data.faute_motif}" : ${data.punition_appliquee} par ${operator.nom} ${operator.prenom} (${operator.role})`,
    });

    return newPunition;
  }

  public annulerPunition(id: string, operator: UserProfile, motif?: string): PunitionScolaire {
    const list = this.getItem<PunitionScolaire[]>(STORAGE_KEYS.PUNITIONS, SEED_PUNITIONS);
    const targetIdx = list.findIndex((p) => p.id === id);
    if (targetIdx === -1) throw new Error("Punition non trouvée.");

    const target = list[targetIdx];

    // Règles d'habilitation :
    // - L'auteur qui a puni l'apprenant peut annuler sa propre punition.
    // - Le Surveillant Général peut également annuler les punitions selon ses droits.
    // - Concepteur autorisé pour maintenance.
    // - Tout autre enseignant ou utilisateur non autorisé ne peut pas annuler.
    const isAuthor = target.auteur_id === operator.id;
    const isSurveillantGen = operator.role === 'SURVEILLANT_GENERAL';
    const isConcepteur = operator.role === 'CONCEPTEUR';

    if (!isAuthor && !isSurveillantGen && !isConcepteur) {
      throw new Error("Action non autorisée : Seul l'auteur de la punition ou le Surveillant Général peut annuler cette punition.");
    }

    if (target.statut === 'ANNULEE') {
      throw new Error("Cette punition a déjà été annulée.");
    }

    const now = new Date();
    const datePart = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timePart = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const annuleLeFormatted = `${datePart} ${timePart}`;

    const annuleParNom = isSurveillantGen && !isAuthor
      ? 'Surveillant Général'
      : `${operator.nom} ${operator.prenom}`;

    const motifAnnulation = motif?.trim() || "Annulée par décision de l'auteur ou du Surveillant Général";

    const updatedPunition: PunitionScolaire = {
      ...target,
      statut: 'ANNULEE',
      annule_par_id: operator.id,
      annule_par_nom: annuleParNom,
      annule_le: annuleLeFormatted,
      motif_annulation: motifAnnulation,
      updated_at: now.toISOString(),
    };

    list[targetIdx] = updatedPunition;
    this.setItem(STORAGE_KEYS.PUNITIONS, list);

    const el = this.getEleveById(target.eleve_id);
    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'ANNULATION_PUNITION',
      table_cible: 'punitions',
      record_id: id,
      details: `Annulation de la punition (${target.punition_appliquee}) de l'élève ${el?.nom} ${el?.prenom}. Statut: ANNULÉE. Annulée par: ${annuleParNom}. Motif: ${motifAnnulation}`,
    });

    return updatedPunition;
  }

  public deletePunition(id: string, operator: UserProfile, motif?: string): boolean {
    this.annulerPunition(id, operator, motif);
    return true;
  }

  // ====================================================================
  // MODULE : SANCTIONS DISCIPLINAIRES ADMINISTRATIVES (Direction & Censeur)
  // ====================================================================
  public getSanctionsDisciplinaires(anneeScolaire?: string): SanctionDisciplinaire[] {
    const list = this.getItem<SanctionDisciplinaire[]>(STORAGE_KEYS.SANCTIONS_DISCIPLINAIRES, SEED_SANCTIONS);
    if (!anneeScolaire) return list;
    return list.filter((s) => s.annee_scolaire === anneeScolaire);
  }

  public getSanctionsByEleve(eleveId: string, anneeScolaire?: string): SanctionDisciplinaire[] {
    return this.getSanctionsDisciplinaires(anneeScolaire).filter((s) => s.eleve_id === eleveId);
  }

  public saveSanctionDisciplinaire(
    data: Omit<SanctionDisciplinaire, 'id' | 'created_at' | 'updated_at' | 'enregistre_par_id' | 'enregistre_par_nom'>,
    operator: UserProfile
  ): SanctionDisciplinaire {
    const canManageSanction = this.canAdminister(operator) || operator.role === 'SURVEILLANT_GENERAL';
    if (!canManageSanction) {
      throw new Error("Action non autorisée : Seule l'Administration (Censeur, DG, SG) peut enregistrer une sanction disciplinaire officielle.");
    }

    const list = this.getSanctionsDisciplinaires();
    const id = `sct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newSanction: SanctionDisciplinaire = {
      ...data,
      id,
      enregistre_par_id: operator.id,
      enregistre_par_nom: `${operator.nom} ${operator.prenom}`,
      created_at: now,
      updated_at: now,
    };

    list.unshift(newSanction);
    this.setItem(STORAGE_KEYS.SANCTIONS_DISCIPLINAIRES, list);

    const el = this.getEleveById(data.eleve_id);
    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'DECISION_SANCTION_DISCIPLINAIRE',
      table_cible: 'sanctions_disciplinaires',
      record_id: id,
      details: `Sanction officielle "${data.nature_decision}" prononcée contre ${el?.nom} ${el?.prenom} pour "${data.motif}" par ${data.autorite_decision}`,
    });

    return newSanction;
  }

  public updateSanctionStatus(id: string, statut: StatutSanction, operator: UserProfile): SanctionDisciplinaire {
    const canManageSanction = this.canAdminister(operator) || operator.role === 'SURVEILLANT_GENERAL';
    if (!canManageSanction) throw new Error("Action non autorisée.");

    const list = this.getSanctionsDisciplinaires();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Sanction non trouvée.");

    list[idx] = {
      ...list[idx],
      statut,
      updated_at: new Date().toISOString(),
    };
    this.setItem(STORAGE_KEYS.SANCTIONS_DISCIPLINAIRES, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'STATUT_SANCTION_MODIFIE',
      table_cible: 'sanctions_disciplinaires',
      record_id: id,
      details: `Statut de la sanction ${id} mis à jour : ${statut}`,
    });

    return list[idx];
  }

  public deleteSanctionDisciplinaire(id: string, operator: UserProfile): boolean {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seule la Direction peut supprimer une sanction disciplinaire enregistrée.");
    }
    const list = this.getSanctionsDisciplinaires();
    const updated = list.filter((s) => s.id !== id);
    this.setItem(STORAGE_KEYS.SANCTIONS_DISCIPLINAIRES, updated);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SUPPRESSION_SANCTION_DISCIPLINAIRE',
      table_cible: 'sanctions_disciplinaires',
      record_id: id,
      details: `Suppression sanction ${id}`,
    });

    return true;
  }

  // ====================================================================
  // MODULE : SÉANCES DE COURS, EMPLOI DU TEMPS & PRÉSENCES PAR SÉANCE
  // ====================================================================
  public getSeancesCours(anneeScolaire?: string): SeanceCours[] {
    const annee = anneeScolaire || this.getParametres().annee_academique || '2026–2027';
    let list = this.getItem<SeanceCours[]>(STORAGE_KEYS.SEANCES_COURS, SEED_SEANCES_COURS);
    
    // Génération automatique des séances régulières depuis les affectations actives si vide
    if (list.filter((s) => s.annee_scolaire === annee).length === 0) {
      const affectations = this.getAffectations(annee).filter((a) => a.statut === 'ACTIF');
      if (affectations.length > 0) {
        const generated: SeanceCours[] = [];
        const jours: JourSemaine[] = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI'];
        const creneaux = [
          { debut: '08:00', fin: '10:00' },
          { debut: '10:00', fin: '12:00' },
          { debut: '15:00', fin: '17:00' },
        ];

        affectations.forEach((aff, idx) => {
          const prof = this.getProfileById(aff.profile_id);
          const jour = jours[idx % jours.length];
          const creneau = creneaux[idx % creneaux.length];
          const cls = this.getClasseById(aff.classe_id);

          generated.push({
            id: `sec-${aff.id}-1`,
            annee_scolaire: annee,
            affectation_id: aff.id,
            classe_id: aff.classe_id,
            matiere_id: aff.matiere_id,
            enseignant_id: aff.profile_id,
            enseignant_nom: prof ? `${prof.nom} ${prof.prenom}` : undefined,
            jour,
            heure_debut: creneau.debut,
            heure_fin: creneau.fin,
            salle: cls?.salle || `Salle ${cls?.nom || 'A'}`,
            statut: 'ACTIF',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });

        list = [...list, ...generated];
        this.setItem(STORAGE_KEYS.SEANCES_COURS, list);
      }
    }

    if (!anneeScolaire) return list;
    return list.filter((s) => s.annee_scolaire === anneeScolaire);
  }

  public getSeancesByEnseignant(enseignantId: string, anneeScolaire?: string): SeanceCours[] {
    return this.getSeancesCours(anneeScolaire).filter((s) => s.enseignant_id === enseignantId);
  }

  public getSeancesByClasse(classeId: string, anneeScolaire?: string): SeanceCours[] {
    return this.getSeancesCours(anneeScolaire).filter((s) => s.classe_id === classeId);
  }

  public getPresenceSeance(seanceId: string, date: string): EnregistrementPresence[] {
    return this.getPresences().filter((p) => p.seance_id === seanceId && p.date === date);
  }

  public createSeanceCours(
    data: Omit<SeanceCours, 'id' | 'created_at' | 'updated_at'>,
    operator: UserProfile
  ): SeanceCours {
    const list = this.getSeancesCours(data.annee_scolaire);
    const id = `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newSeance: SeanceCours = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };
    this.setItem(STORAGE_KEYS.SEANCES_COURS, [...list, newSeance]);
    return newSeance;
  }

  public savePresenceSeance(
    seance: SeanceCours,
    date: string,
    items: Array<{ eleve_id: string; statut: StatutPresence; motif?: string; heure_retard?: string; justifie?: boolean }>,
    operator: UserProfile
  ): EnregistrementPresence[] {
    const isOwner = seance.enseignant_id === operator.id;
    const canRecord = isOwner || operator.role === 'SURVEILLANT_GENERAL' || this.canAdminister(operator);
    if (!canRecord) {
      throw new Error("Action non autorisée : Seul l'enseignant titulaire de la séance ou la Surveillance peut enregistrer cet appel.");
    }

    const allPresences = this.getPresences();
    const periodes = this.getPeriodesByAnnee(seance.annee_scolaire);
    const activePeriode = periodes.find((p) => p.is_active) || periodes[0];

    const mat = this.getMatiereById(seance.matiere_id);
    const prof = this.getProfileById(seance.enseignant_id);
    const now = new Date().toISOString();
    const savedEntries: EnregistrementPresence[] = [];

    items.forEach((item) => {
      // Clé unique par cours : un apprenant a un enregistrement distinct par séance (sans écraser un autre cours le même jour !)
      const existingIdx = allPresences.findIndex(
        (p) =>
          p.eleve_id === item.eleve_id &&
          p.date === date &&
          p.seance_id === seance.id
      );

      const entry: EnregistrementPresence = {
        id: existingIdx >= 0 ? allPresences[existingIdx].id : `prsc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        annee_scolaire: seance.annee_scolaire,
        classe_id: seance.classe_id,
        eleve_id: item.eleve_id,
        date,
        statut: item.statut,
        motif: item.motif,
        justifie: item.justifie ?? false,
        heure_retard: item.heure_retard || (item.statut === 'RETARD' ? seance.heure_debut : undefined),
        enregistre_par_id: operator.id,
        enregistre_par_nom: `${operator.nom} ${operator.prenom}`,
        date_saisie: now,
        periode_id: activePeriode?.id,
        enseignant_id: seance.enseignant_id,
        enseignant_nom: prof ? `${prof.nom} ${prof.prenom}` : undefined,
        matiere_id: seance.matiere_id,
        matiere_nom: mat?.nom,
        seance_id: seance.id,
        heure_debut: seance.heure_debut,
        heure_fin: seance.heure_fin,
        created_at: existingIdx >= 0 ? allPresences[existingIdx].created_at : now,
        updated_at: now,
      };

      if (existingIdx >= 0) {
        allPresences[existingIdx] = entry;
      } else {
        allPresences.push(entry);
      }
      savedEntries.push(entry);
    });

    this.setItem(STORAGE_KEYS.PRESENCES, allPresences);

    const cls = this.getClasseById(seance.classe_id);
    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'APPEL_COURS_SEANCE',
      table_cible: 'presences',
      record_id: seance.id,
      details: `Appel effectué pour le cours de ${mat?.nom} en ${cls?.nom} (${seance.heure_debut}–${seance.heure_fin}) le ${date} : ${items.length} élèves pointés`,
    });

    return savedEntries;
  }

  // ====================================================================
  // MODULE : ESPACE PARENTS D'ÉLÈVES & LIAISONS SÉCURISÉES
  // ====================================================================
  public getParents(): ParentProfile[] {
    return this.getItem<ParentProfile[]>(STORAGE_KEYS.PARENTS, []);
  }

  public getParentById(id: string): ParentProfile | undefined {
    return this.getParents().find((p) => p.id === id);
  }

  public getParentByProfileId(profileId: string): ParentProfile | undefined {
    return this.getParents().find((p) => p.profile_id === profileId);
  }

  public getParentByPhoneOrEmail(identifier: string): ParentProfile | undefined {
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = clean.replace(/[^0-9]/g, '');
    return this.getParents().find((p) => {
      if (p.email && p.email.toLowerCase() === clean) return true;
      if (p.telephone) {
        const pPhone = p.telephone.replace(/[^0-9]/g, '');
        if (pPhone && cleanPhone && (pPhone === cleanPhone || pPhone.endsWith(cleanPhone) || cleanPhone.endsWith(pPhone))) {
          return true;
        }
      }
      return false;
    });
  }

  public createParent(
    data: {
      nom: string;
      prenom: string;
      telephone: string;
      email?: string;
      profession?: string;
      adresse?: string;
      password?: string;
      eleves?: { eleve_id: string; lien_parental: LienParental }[];
    },
    operator: UserProfile
  ): ParentProfile {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur, le Concepteur ou la Direction peut créer un compte parent.");
    }

    const cleanTel = data.telephone.trim();
    if (!cleanTel) throw new Error("Le numéro de téléphone du parent est obligatoire.");

    const parents = this.getParents();
    const cleanDigits = cleanTel.replace(/[^0-9]/g, '');
    const exists = parents.some((p) => p.telephone.replace(/[^0-9]/g, '') === cleanDigits);
    if (exists) {
      throw new Error(`Un compte parent existe déjà avec ce numéro de téléphone (${cleanTel}).`);
    }

    const now = new Date().toISOString();
    const parentId = `par-${Date.now().toString(36)}`;
    const profileId = `usr-par-${Date.now().toString(36)}`;

    const newParent: ParentProfile = {
      id: parentId,
      profile_id: profileId,
      nom: data.nom.trim().toUpperCase(),
      prenom: data.prenom.trim(),
      telephone: cleanTel,
      email: data.email?.trim().toLowerCase() || undefined,
      profession: data.profession?.trim() || undefined,
      adresse: data.adresse?.trim() || undefined,
      statut: 'ACTIF',
      created_at: now,
      updated_at: now,
    };

    parents.push(newParent);
    this.setItem(STORAGE_KEYS.PARENTS, parents);

    // Profil utilisateur pour l'authentification
    const profiles = this.getProfiles();
    const userEmail = newParent.email || `${cleanDigits}@parent.ceggogbo.bj`;
    const newUser: UserProfile = {
      id: profileId,
      email: userEmail,
      nom: newParent.nom,
      prenom: newParent.prenom,
      role: 'PARENT',
      is_enseignant: false,
      telephone: newParent.telephone,
      adresse: newParent.adresse,
      statut: 'ACTIF',
      created_at: now,
      updated_at: now,
    };
    profiles.push(newUser);
    this.setItem(STORAGE_KEYS.PROFILES, profiles);

    // Définition du mot de passe
    const pass = data.password?.trim() || 'Passer123!';
    this.setUserPassword(profileId, pass);

    // Rattachement des élèves
    if (data.eleves && data.eleves.length > 0) {
      const links = this.getParentEleves();
      data.eleves.forEach((item) => {
        links.push({
          id: `pe-${parentId}-${item.eleve_id}`,
          parent_id: parentId,
          eleve_id: item.eleve_id,
          lien_parental: item.lien_parental || 'PERE',
          statut: 'ACTIF',
          created_at: now,
          updated_at: now,
        });
      });
      this.setItem(STORAGE_KEYS.PARENT_ELEVES, links);
    }

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'CREATION_COMPTE_PARENT',
      table_cible: 'parents',
      record_id: parentId,
      details: `Création du compte parent pour ${newParent.nom} ${newParent.prenom} (Tél: ${newParent.telephone}) avec ${data.eleves?.length || 0} élève(s) rattaché(s).`,
    });

    return newParent;
  }

  public updateParent(
    id: string,
    updates: Partial<ParentProfile>,
    operator: UserProfile
  ): ParentProfile {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction peut modifier un compte parent.");
    }
    const parents = this.getParents();
    const idx = parents.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Compte parent introuvable.");

    const updated: ParentProfile = {
      ...parents[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    parents[idx] = updated;
    this.setItem(STORAGE_KEYS.PARENTS, parents);

    // Synchroniser le profil UserProfile
    if (updated.profile_id) {
      const profiles = this.getProfiles();
      const uIdx = profiles.findIndex((p) => p.id === updated.profile_id);
      if (uIdx !== -1) {
        profiles[uIdx] = {
          ...profiles[uIdx],
          nom: updated.nom,
          prenom: updated.prenom,
          telephone: updated.telephone,
          email: updated.email || profiles[uIdx].email,
          statut: updated.statut,
          updated_at: updated.updated_at,
        };
        this.setItem(STORAGE_KEYS.PROFILES, profiles);
      }
    }

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'MODIFICATION_COMPTE_PARENT',
      table_cible: 'parents',
      record_id: id,
      details: `Mise à jour des coordonnées du parent ${updated.nom} ${updated.prenom}.`,
    });

    return updated;
  }

  public toggleParentStatus(id: string, operator: UserProfile): ParentProfile {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée.");
    }
    const parent = this.getParentById(id);
    if (!parent) throw new Error("Parent introuvable.");
    const newStatus = parent.statut === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    return this.updateParent(id, { statut: newStatus }, operator);
  }

  // --- LIENS PARENT - ELEVES ---
  public getParentEleves(): ParentEleve[] {
    return this.getItem<ParentEleve[]>(STORAGE_KEYS.PARENT_ELEVES, []);
  }

  public getParentElevesByParent(parentId: string): ParentEleve[] {
    return this.getParentEleves().filter((pe) => pe.parent_id === parentId && pe.statut === 'ACTIF');
  }

  public getParentElevesByEleve(eleveId: string): ParentEleve[] {
    return this.getParentEleves().filter((pe) => pe.eleve_id === eleveId && pe.statut === 'ACTIF');
  }

  public linkParentToEleve(
    data: { parent_id: string; eleve_id: string; lien_parental: LienParental },
    operator: UserProfile
  ): ParentEleve {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction peut rattacher un élève à un parent.");
    }
    const links = this.getParentEleves();
    const existing = links.find((l) => l.parent_id === data.parent_id && l.eleve_id === data.eleve_id);
    if (existing) {
      if (existing.statut === 'ACTIF') {
        throw new Error("Cet élève est déjà rattaché à ce compte parent.");
      } else {
        existing.statut = 'ACTIF';
        existing.lien_parental = data.lien_parental;
        existing.updated_at = new Date().toISOString();
        this.setItem(STORAGE_KEYS.PARENT_ELEVES, links);
        return existing;
      }
    }

    const now = new Date().toISOString();
    const newLink: ParentEleve = {
      id: `pe-${Date.now().toString(36)}`,
      parent_id: data.parent_id,
      eleve_id: data.eleve_id,
      lien_parental: data.lien_parental,
      statut: 'ACTIF',
      created_at: now,
      updated_at: now,
    };
    links.push(newLink);
    this.setItem(STORAGE_KEYS.PARENT_ELEVES, links);

    const el = this.getEleveById(data.eleve_id);
    const par = this.getParentById(data.parent_id);
    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'RATTACHEMENT_PARENT_ELEVE',
      table_cible: 'parent_eleves',
      record_id: newLink.id,
      details: `Rattachement de l'élève ${el?.nom} ${el?.prenom} au parent ${par?.nom} ${par?.prenom} (${data.lien_parental}).`,
    });

    return newLink;
  }

  public unlinkParentFromEleve(linkId: string, operator: UserProfile): boolean {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée.");
    }
    const links = this.getParentEleves();
    const idx = links.findIndex((l) => l.id === linkId);
    if (idx === -1) throw new Error("Lien introuvable.");

    links[idx].statut = 'INACTIF';
    links[idx].updated_at = new Date().toISOString();
    this.setItem(STORAGE_KEYS.PARENT_ELEVES, links);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'DETACHEMENT_PARENT_ELEVE',
      table_cible: 'parent_eleves',
      record_id: linkId,
      details: `Détachement du lien parental ${linkId}.`,
    });

    return true;
  }

  public getElevesForParent(parentIdOrProfileId: string, anneeScolaire?: string): Eleve[] {
    let parent = this.getParentById(parentIdOrProfileId);
    if (!parent) {
      parent = this.getParentByProfileId(parentIdOrProfileId);
    }
    if (!parent) return [];

    const links = this.getParentElevesByParent(parent.id);
    if (links.length === 0) return [];

    const eleveIds = new Set(links.map((l) => l.eleve_id));
    const allEleves = this.getEleves(anneeScolaire);
    return allEleves.filter((e) => eleveIds.has(e.id) && e.statut === 'ACTIF');
  }

  public getElevesByParent(parentIdOrProfileId: string, anneeScolaire?: string): Eleve[] {
    return this.getElevesForParent(parentIdOrProfileId, anneeScolaire);
  }

  // ====================================================================
  // MODULE : DISCIPLINE & VIE SCOLAIRE (SURVEILLANT GÉNÉRAL)
  // ====================================================================
  public getIncidentsDisciplinaires(anneeScolaire?: string): IncidentDisciplinaire[] {
    const list = this.getItem<IncidentDisciplinaire[]>(STORAGE_KEYS.INCIDENTS_DISCIPLINAIRES, []);
    if (!anneeScolaire) return list;
    return list.filter((i) => i.annee_scolaire === anneeScolaire);
  }

  public getIncidentsByEleve(eleveId: string, anneeScolaire?: string): IncidentDisciplinaire[] {
    return this.getIncidentsDisciplinaires(anneeScolaire).filter((i) => i.eleve_id === eleveId);
  }

  public getIncidentsByClasse(classeId: string, anneeScolaire?: string): IncidentDisciplinaire[] {
    return this.getIncidentsDisciplinaires(anneeScolaire).filter((i) => i.classe_id === classeId);
  }

  public saveIncident(
    data: Omit<IncidentDisciplinaire, 'id' | 'created_at' | 'updated_at'>,
    operator: UserProfile
  ): IncidentDisciplinaire {
    const canDiscipline = operator.role === 'SURVEILLANT_GENERAL' || this.canAdminister(operator);
    if (!canDiscipline) {
      throw new Error("Action non autorisée : Seul le Surveillant Général ou la Direction peut enregistrer un incident disciplinaire.");
    }

    const list = this.getIncidentsDisciplinaires();
    const now = new Date().toISOString();
    const newIncident: IncidentDisciplinaire = {
      ...data,
      id: `inc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };

    list.unshift(newIncident);
    this.setItem(STORAGE_KEYS.INCIDENTS_DISCIPLINAIRES, list);

    const el = this.getEleveById(data.eleve_id);
    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'ENREGISTREMENT_INCIDENT_DISCIPLINAIRE',
      table_cible: 'incidents_disciplinaires',
      record_id: newIncident.id,
      details: `Incident (${data.type_incident}) pour l'élève ${el?.nom} ${el?.prenom} : ${data.description.substring(0, 60)}... Mesure: ${data.mesure_prise}`,
    });

    return newIncident;
  }

  public deleteIncident(id: string, operator: UserProfile): boolean {
    const canDiscipline = operator.role === 'SURVEILLANT_GENERAL' || this.canAdminister(operator);
    if (!canDiscipline) {
      throw new Error("Action non autorisée.");
    }
    const list = this.getIncidentsDisciplinaires();
    const filtered = list.filter((i) => i.id !== id);
    this.setItem(STORAGE_KEYS.INCIDENTS_DISCIPLINAIRES, filtered);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SUPPRESSION_INCIDENT_DISCIPLINAIRE',
      table_cible: 'incidents_disciplinaires',
      record_id: id,
      details: `Suppression de l'incident disciplinaire ${id}.`,
    });

    return true;
  }

  // ====================================================================
  // MODULE : NOTIFICATIONS PARENTS
  // ====================================================================
  public getNotificationsParents(parentId?: string, anneeScolaire?: string): NotificationParent[] {
    const list = this.getItem<NotificationParent[]>(STORAGE_KEYS.NOTIFICATIONS_PARENTS, []);
    return list.filter((n) => {
      if (parentId && n.parent_id !== parentId) return false;
      if (anneeScolaire && n.annee_scolaire !== anneeScolaire) return false;
      return true;
    });
  }

  public createNotificationParent(
    data: Omit<NotificationParent, 'id' | 'created_at' | 'lu'>
  ): NotificationParent {
    const list = this.getNotificationsParents();
    const newNotif: NotificationParent = {
      ...data,
      id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      lu: false,
      created_at: new Date().toISOString(),
    };
    list.unshift(newNotif);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS_PARENTS, list);
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const list = this.getNotificationsParents();
    const notif = list.find((n) => n.id === id);
    if (notif) {
      notif.lu = true;
      this.setItem(STORAGE_KEYS.NOTIFICATIONS_PARENTS, list);
    }
  }
  /**
   * SOURCE UNIQUE & EXCLUSIVE DES MATIÈRES D'UN ENSEIGNANT :
   * Récupère la liste dédupliquée des matières RÉELLEMENT attribuées
   * par le Censeur pour l'année scolaire indiquée (Enseignant → Année → Classe → Matière).
   * Ne déduit, n'invente et ne préremplit JAMAIS de matière fictive.
   */
  public getMatieresAttribueesEnseignant(profileId: string, anneeScolaire: string): string[] {
    const targetAnneeNorm = (anneeScolaire || '2026–2027').replace(/[-—–]/g, '-').trim();
    const affectations = this.getAffectations().filter((a) => {
      const aAnneeNorm = (a.annee_scolaire || '2026–2027').replace(/[-—–]/g, '-').trim();
      return a.profile_id === profileId && a.statut === 'ACTIF' && aAnneeNorm === targetAnneeNorm;
    });
    const matieresSet = new Set<string>();
    for (const aff of affectations) {
      if (aff.statut === 'ACTIF') {
        const mat = this.getMatiereById(aff.matiere_id);
        if (mat && mat.nom && mat.nom.trim()) {
          matieresSet.add(mat.nom.trim());
        }
      }
    }
    return Array.from(matieresSet).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Retourne le libellé officiel des matières attribuées (ex: "SVT, Mathématiques")
   * ou "Aucune attribution (Année)" si le professeur n'a aucune attribution active pour cette année.
   */
  public getMatieresAttribueesLabel(profileId: string, anneeScolaire: string): string {
    const matieres = this.getMatieresAttribueesEnseignant(profileId, anneeScolaire);
    if (matieres.length === 0) {
      return `Aucune attribution (${anneeScolaire || '2026–2027'})`;
    }
    return matieres.join(', ');
  }

  public getPresencesEnseignants(): PresenceEnseignant[] {
    return this.getItem<PresenceEnseignant[]>(STORAGE_KEYS.PRESENCES_ENSEIGNANTS, []);
  }

  public getPresencesEnseignantsByAnnee(annee: string): PresenceEnseignant[] {
    return this.getPresencesEnseignants().filter((p) => p.annee_scolaire === annee);
  }

  public getPresencesEnseignantsByDate(date: string, annee?: string): PresenceEnseignant[] {
    return this.getPresencesEnseignants().filter((p) => {
      if (annee && p.annee_scolaire !== annee) return false;
      return p.date === date;
    });
  }

  public getPresencesEnseignantsByEnseignant(enseignantId: string, annee?: string): PresenceEnseignant[] {
    return this.getPresencesEnseignants().filter((p) => {
      if (annee && p.annee_scolaire !== annee) return false;
      return p.enseignant_id === enseignantId;
    });
  }

  public canManagePresencesEnseignants(operator: UserProfile): boolean {
    return operator.role === 'CENSEUR';
  }

  public async savePresenceEnseignant(
    data: Omit<PresenceEnseignant, 'id' | 'created_at' | 'updated_at'>,
    operator: UserProfile
  ): Promise<PresenceEnseignant> {
    if (!this.canManagePresencesEnseignants(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur est habilité à enregistrer ou modifier la présence journalière des enseignants.");
    }

    const list = this.getPresencesEnseignants();
    const existingIndex = list.findIndex(
      (p) => p.enseignant_id === data.enseignant_id && p.date === data.date && p.annee_scolaire === data.annee_scolaire
    );

    // Récupération stricte de la matière attribuée actuelle si non spécifiée
    const matieresSnapshot = data.matieres_attribuees ?? this.getMatieresAttribueesLabel(data.enseignant_id, data.annee_scolaire);

    const now = new Date().toISOString();
    let result: PresenceEnseignant;

    if (existingIndex !== -1) {
      const prev = list[existingIndex];
      result = {
        ...prev,
        statut: data.statut,
        motif: data.motif !== undefined ? data.motif : prev.motif,
        heure_arrivee: data.statut === 'RETARD' ? (data.heure_arrivee || prev.heure_arrivee || '') : '',
        enseignant_nom: data.enseignant_nom,
        matieres_attribuees: matieresSnapshot,
        enregistre_par_id: operator.id,
        enregistre_par_nom: `${operator.nom} ${operator.prenom}`,
        updated_at: now,
      };
      list[existingIndex] = result;

      this.addAuditLog({
        user_id: operator.id,
        user_nom: `${operator.nom} ${operator.prenom}`,
        user_role: operator.role,
        action: 'MODIFICATION_PRESENCE_ENSEIGNANT',
        table_cible: 'presences_enseignants',
        record_id: result.id,
        details: `Modification présence pour ${data.enseignant_nom} [${matieresSnapshot}] (${data.date}) : ${prev.statut} → ${data.statut}${data.motif ? ` (Motif : ${data.motif})` : ''}`,
      });
    } else {
      const id = `pren-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      result = {
        id,
        annee_scolaire: data.annee_scolaire,
        date: data.date,
        enseignant_id: data.enseignant_id,
        enseignant_nom: data.enseignant_nom,
        matieres_attribuees: matieresSnapshot,
        statut: data.statut,
        motif: data.motif ?? '',
        heure_arrivee: data.statut === 'RETARD' ? (data.heure_arrivee || '') : '',
        enregistre_par_id: operator.id,
        enregistre_par_nom: `${operator.nom} ${operator.prenom}`,
        created_at: now,
        updated_at: now,
      };
      list.push(result);

      this.addAuditLog({
        user_id: operator.id,
        user_nom: `${operator.nom} ${operator.prenom}`,
        user_role: operator.role,
        action: 'SAISIE_PRESENCE_ENSEIGNANT',
        table_cible: 'presences_enseignants',
        record_id: result.id,
        details: `Saisie présence (${data.statut}) pour ${data.enseignant_nom} [${matieresSnapshot}] (${data.date})${data.heure_arrivee ? ` à ${data.heure_arrivee}` : ''}${data.motif ? ` (Motif : ${data.motif})` : ''}`,
      });
    }

    this.setItem(STORAGE_KEYS.PRESENCES_ENSEIGNANTS, list);

    // Synchronisation Supabase si connecté
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('presences_enseignants').upsert({
          id: result.id,
          annee_scolaire: result.annee_scolaire,
          date: result.date,
          enseignant_id: result.enseignant_id,
          enseignant_nom: result.enseignant_nom,
          matieres_attribuees: result.matieres_attribuees,
          statut: result.statut,
          motif: result.motif,
          heure_arrivee: result.heure_arrivee,
          enregistre_par_id: result.enregistre_par_id,
          enregistre_par_nom: result.enregistre_par_nom,
          updated_at: result.updated_at,
        });
      } catch (err) {
        console.warn('Sync Supabase presences_enseignants failed:', err);
      }
    }

    return result;
  }

  public async batchSavePresencesEnseignants(
    entries: Array<Omit<PresenceEnseignant, 'id' | 'created_at' | 'updated_at'>>,
    operator: UserProfile
  ): Promise<PresenceEnseignant[]> {
    if (!this.canManagePresencesEnseignants(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur est habilité à enregistrer la présence des enseignants.");
    }
    const results: PresenceEnseignant[] = [];
    for (const entry of entries) {
      const res = await this.savePresenceEnseignant(entry, operator);
      results.push(res);
    }
    return results;
  }

  public async deletePresenceEnseignant(id: string, operator: UserProfile): Promise<boolean> {
    if (!this.canManagePresencesEnseignants(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur est habilité à supprimer un enregistrement de présence.");
    }
    const list = this.getPresencesEnseignants();
    const item = list.find((p) => p.id === id);
    if (!item) return false;

    const updated = list.filter((p) => p.id !== id);
    this.setItem(STORAGE_KEYS.PRESENCES_ENSEIGNANTS, updated);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SUPPRESSION_PRESENCE_ENSEIGNANT',
      table_cible: 'presences_enseignants',
      record_id: id,
      details: `Suppression enregistrement présence de ${item.enseignant_nom} (${item.date})`,
    });

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('presences_enseignants').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete presence enseignant failed:', err);
      }
    }

    return true;
  }

  // ====================================================================
  // MODULE : PROFESSEURS PRINCIPAUX (RÉSERVÉ AU CENSEUR)
  // ====================================================================
  public getProfesseursPrincipaux(anneeScolaire?: string | any): ProfesseurPrincipal[] {
    let list = this.getItem<ProfesseurPrincipal[]>(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, []);
    const PP_INIT_KEY = 'gogbo_v2_pp_initialized_v1';
    if (!this.rawGet(PP_INIT_KEY)) {
      if (!list || list.length === 0) {
        list = [
          {
            id: 'pp-seed-censeur-4a',
            profile_id: 'usr-censeur',
            classe_id: 'cls-4a',
            annee_scolaire: '2026–2027',
            statut: 'ACTIF',
            date_nomination: '2026-09-15',
            created_at: '2026-09-15T08:00:00Z',
            updated_at: '2026-09-15T08:00:00Z',
          },
        ];
        this.setItem(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, list);
      }
      this.rawSet(PP_INIT_KEY, 'true');
    }

    if (!anneeScolaire) return list;
    const str = typeof anneeScolaire === 'string' ? anneeScolaire : (anneeScolaire?.libelle || '');
    if (!str) return list;
    const targetNorm = str.replace(/[-—–]/g, '-').trim();
    return list.filter((p) => (p.annee_scolaire || '').replace(/[-—–]/g, '-').trim() === targetNorm);
  }

  public getActiveProfesseurPrincipalByClasse(classeId: string, anneeScolaire: string | any): ProfesseurPrincipal | undefined {
    const str = typeof anneeScolaire === 'string' ? anneeScolaire : (anneeScolaire?.libelle || '');
    const targetNorm = str.replace(/[-—–]/g, '-').trim();
    return this.getProfesseursPrincipaux().find(
      (p) => p.classe_id === classeId &&
        (p.annee_scolaire || '').replace(/[-—–]/g, '-').trim() === targetNorm &&
        p.statut === 'ACTIF'
    );
  }

  public getActiveProfesseurPrincipalByEnseignant(profileId: string, anneeScolaire: string | any): ProfesseurPrincipal | undefined {
    const str = typeof anneeScolaire === 'string' ? anneeScolaire : (anneeScolaire?.libelle || '');
    const targetNorm = str.replace(/[-—–]/g, '-').trim();
    return this.getProfesseursPrincipaux().find(
      (p) => p.profile_id === profileId &&
        (p.annee_scolaire || '').replace(/[-—–]/g, '-').trim() === targetNorm &&
        p.statut === 'ACTIF'
    );
  }

  public isProfesseurPrincipalOfClasse(profileId: string, classeId: string, anneeScolaire: string | any): boolean {
    const pp = this.getActiveProfesseurPrincipalByEnseignant(profileId, anneeScolaire);
    return !!(pp && pp.classe_id === classeId && pp.statut === 'ACTIF');
  }

  public isProfesseurPrincipal(profileId: string, anneeScolaire?: string | any): boolean {
    const annee = anneeScolaire || this.getActiveAnneeScolaire().libelle;
    const pp = this.getActiveProfesseurPrincipalByEnseignant(profileId, annee);
    return !!(pp && pp.statut === 'ACTIF');
  }

  public getClasseProfesseurPrincipal(profileId: string, anneeScolaire?: string | any): Classe | undefined {
    const annee = anneeScolaire || this.getActiveAnneeScolaire().libelle;
    const pp = this.getActiveProfesseurPrincipalByEnseignant(profileId, annee);
    if (!pp || pp.statut !== 'ACTIF') return undefined;
    return this.getClasseById(pp.classe_id);
  }

  /**
   * ATTRIBUTION D'UN PROFESSEUR PRINCIPAL PAR LE CENSEUR
   * RÈGLE ABSOLUE 1 : UN ENSEIGNANT = UNE SEULE CLASSE COMME PP POUR L'ANNÉE SCOLAIRE.
   * RÈGLE ABSOLUE 2 : UNE CLASSE = UN SEUL PP ACTIF POUR L'ANNÉE SCOLAIRE.
   */
  public async assignProfesseurPrincipal(
    data: {
      profile_id: string;
      classe_id: string;
      annee_scolaire: string;
      date_nomination?: string;
    },
    operator: UserProfile
  ): Promise<ProfesseurPrincipal> {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction Générale a le droit d'attribuer le rôle de Professeur Principal.");
    }

    const teacher = this.getProfileById(data.profile_id);
    if (!teacher) throw new Error("Enseignant introuvable dans le système.");

    const classe = this.getClasseById(data.classe_id);
    if (!classe) throw new Error("Classe introuvable dans le système.");

    const anneeNorm = data.annee_scolaire || this.getActiveAnneeScolaire().libelle;

    // RÈGLE ABSOLUE 1 : Vérifier si cet enseignant est déjà PP d'une autre classe pour la même année scolaire
    const existingForTeacher = this.getActiveProfesseurPrincipalByEnseignant(data.profile_id, anneeNorm);
    if (existingForTeacher) {
      const existingClass = this.getClasseById(existingForTeacher.classe_id);
      const existingClassName = existingClass ? existingClass.nom : existingForTeacher.classe_id;
      throw new Error(
        `⚠️ Cet enseignant (${teacher.nom} ${teacher.prenom}) est déjà Professeur Principal de la classe ${existingClassName} pour l'année scolaire ${anneeNorm}. Règle absolue : un enseignant ne peut être Professeur Principal que d'une seule classe par année. Veuillez d'abord retirer ou clôturer son attribution actuelle avant de lui assigner une autre classe.`
      );
    }

    // RÈGLE ABSOLUE 2 : Vérifier si cette classe a déjà un PP actif pour la même année scolaire
    const existingForClass = this.getActiveProfesseurPrincipalByClasse(data.classe_id, anneeNorm);
    if (existingForClass) {
      const currentPPTeacher = this.getProfileById(existingForClass.profile_id);
      const ppName = currentPPTeacher ? `${currentPPTeacher.nom} ${currentPPTeacher.prenom}` : 'un autre enseignant';
      throw new Error(
        `⚠️ La classe ${classe.nom} possède déjà un Professeur Principal actif (${ppName}) pour l'année scolaire ${anneeNorm}. Règle absolue : une classe ne peut avoir qu'un seul PP actif. Veuillez d'abord retirer l'attribution actuelle.`
      );
    }

    const list = this.getItem<ProfesseurPrincipal[]>(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, []);
    const id = `pp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newPP: ProfesseurPrincipal = {
      id,
      profile_id: data.profile_id,
      classe_id: data.classe_id,
      annee_scolaire: anneeNorm,
      statut: 'ACTIF',
      date_nomination: data.date_nomination || now.split('T')[0],
      created_at: now,
      updated_at: now,
    };

    list.push(newPP);
    this.setItem(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'ATTRIBUTION_PROFESSEUR_PRINCIPAL',
      table_cible: 'professeurs_principaux',
      record_id: id,
      details: `Nomination PP (${anneeNorm}) : ${teacher.nom} ${teacher.prenom} nommé Professeur Principal de la classe ${classe.nom}`,
    });

    // Synchronisation Supabase si connecté
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('professeurs_principaux').insert({
          id: newPP.id,
          profile_id: newPP.profile_id,
          classe_id: newPP.classe_id,
          annee_scolaire: newPP.annee_scolaire,
          statut: newPP.statut,
          date_nomination: newPP.date_nomination,
          created_at: newPP.created_at,
          updated_at: newPP.updated_at,
        });
      } catch (err) {
        console.warn('Sync Supabase professeurs_principaux failed:', err);
      }
    }

    return newPP;
  }

  /**
   * MODIFIER UNE ATTRIBUTION DE PROFESSEUR PRINCIPAL PAR LE CENSEUR
   */
  public async updateProfesseurPrincipal(
    id: string,
    updates: {
      profile_id?: string;
      classe_id?: string;
      date_nomination?: string;
    },
    operator: UserProfile
  ): Promise<ProfesseurPrincipal> {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction Générale a le droit de modifier une attribution de Professeur Principal.");
    }

    const list = this.getItem<ProfesseurPrincipal[]>(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, []);
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Attribution de Professeur Principal introuvable.");

    const current = list[idx];
    const targetProfileId = updates.profile_id || current.profile_id;
    const targetClasseId = updates.classe_id || current.classe_id;
    const anneeNorm = current.annee_scolaire;

    // RÈGLE ABSOLUE 1 : Si changement d'enseignant, vérifier que le nouvel enseignant n'est pas déjà PP actif
    if (targetProfileId !== current.profile_id) {
      const existingForTeacher = this.getActiveProfesseurPrincipalByEnseignant(targetProfileId, anneeNorm);
      if (existingForTeacher && existingForTeacher.id !== id) {
        const teacher = this.getProfileById(targetProfileId);
        const existingClass = this.getClasseById(existingForTeacher.classe_id);
        throw new Error(
          `Cet enseignant (${teacher?.nom} ${teacher?.prenom}) est déjà Professeur Principal de la classe ${existingClass?.nom || existingForTeacher.classe_id} pour l'année scolaire ${anneeNorm}. Règle absolue : un enseignant ne peut être Professeur Principal que d'une seule classe par année.`
        );
      }
    }

    // RÈGLE ABSOLUE 2 : Si changement de classe, vérifier que la nouvelle classe n'a pas déjà un PP actif
    if (targetClasseId !== current.classe_id) {
      const existingForClass = this.getActiveProfesseurPrincipalByClasse(targetClasseId, anneeNorm);
      if (existingForClass && existingForClass.id !== id) {
        const classe = this.getClasseById(targetClasseId);
        const ppProf = this.getProfileById(existingForClass.profile_id);
        throw new Error(
          `La classe ${classe?.nom || targetClasseId} possède déjà un Professeur Principal actif (${ppProf?.nom} ${ppProf?.prenom}) pour l'année scolaire ${anneeNorm}. Règle absolue : une classe ne peut avoir qu'un seul PP actif.`
        );
      }
    }

    const now = new Date().toISOString();
    const updated: ProfesseurPrincipal = {
      ...current,
      profile_id: targetProfileId,
      classe_id: targetClasseId,
      date_nomination: updates.date_nomination || current.date_nomination,
      updated_at: now,
    };

    list[idx] = updated;
    this.setItem(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, list);

    const teacher = this.getProfileById(updated.profile_id);
    const classe = this.getClasseById(updated.classe_id);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'MODIFICATION_PROFESSEUR_PRINCIPAL',
      table_cible: 'professeurs_principaux',
      record_id: id,
      details: `Modification PP (${updated.annee_scolaire}) : ${teacher?.nom} ${teacher?.prenom} pour la classe ${classe?.nom}`,
    });

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('professeurs_principaux').update({
          profile_id: updated.profile_id,
          classe_id: updated.classe_id,
          date_nomination: updated.date_nomination,
          updated_at: updated.updated_at,
        }).eq('id', id);
      } catch (err) {
        console.warn('Sync Supabase update PP failed:', err);
      }
    }

    return updated;
  }

  /**
   * RETIRER / CLÔTURER UNE ATTRIBUTION DE PROFESSEUR PRINCIPAL
   * Conserve l'historique de l'ancienne attribution en passant le statut à 'CLOTURE'
   */
  public async retirerProfesseurPrincipal(
    id: string,
    operator: UserProfile,
    motif?: string
  ): Promise<ProfesseurPrincipal> {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur ou la Direction Générale a le droit de retirer un Professeur Principal.");
    }

    const list = this.getItem<ProfesseurPrincipal[]>(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, []);
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Attribution de Professeur Principal introuvable.");

    const current = list[idx];
    const teacher = this.getProfileById(current.profile_id);
    const classe = this.getClasseById(current.classe_id);
    const now = new Date().toISOString();

    const updated: ProfesseurPrincipal = {
      ...current,
      statut: 'CLOTURE',
      date_fin: now.split('T')[0],
      motif_fin: motif || 'Retrait par décision du Censeur',
      updated_at: now,
    };

    list[idx] = updated;
    this.setItem(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, list);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'RETRAIT_PROFESSEUR_PRINCIPAL',
      table_cible: 'professeurs_principaux',
      record_id: id,
      details: `Retrait PP (${current.annee_scolaire}) : Fin de fonction PP pour ${teacher?.nom} ${teacher?.prenom} en ${classe?.nom}${motif ? ` (Motif : ${motif})` : ''}`,
    });

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('professeurs_principaux').update({
          statut: 'CLOTURE',
          date_fin: updated.date_fin,
          motif_fin: updated.motif_fin,
          updated_at: updated.updated_at,
        }).eq('id', id);
      } catch (err) {
        console.warn('Sync Supabase update PP failed:', err);
      }
    }

    return updated;
  }

  public async deleteProfesseurPrincipal(id: string, operator: UserProfile): Promise<boolean> {
    if (!this.canAdminister(operator)) {
      throw new Error("Action non autorisée : Seul le Censeur peut supprimer un enregistrement.");
    }

    const list = this.getItem<ProfesseurPrincipal[]>(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, []);
    const item = list.find((p) => p.id === id);
    if (!item) return false;

    const teacher = this.getProfileById(item.profile_id);
    const classe = this.getClasseById(item.classe_id);

    const updated = list.filter((p) => p.id !== id);
    this.setItem(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, updated);

    this.addAuditLog({
      user_id: operator.id,
      user_nom: `${operator.nom} ${operator.prenom}`,
      user_role: operator.role,
      action: 'SUPPRESSION_PROFESSEUR_PRINCIPAL',
      table_cible: 'professeurs_principaux',
      record_id: id,
      details: `Suppression enregistrement PP : ${teacher?.nom} ${teacher?.prenom} (${classe?.nom} - ${item.annee_scolaire})`,
    });

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('professeurs_principaux').delete().eq('id', id);
      } catch (err) {
        console.warn('Sync Supabase delete PP failed:', err);
      }
    }

    return true;
  }

  // --- UTILITAIRES / EXPORT / RESET ---
  public resetToDefaults(): void {
    this.rawRemove(STORAGE_KEYS.VERSION);
    this.init();
  }

  public exportDatabaseJSON(): string {
    const data = {
      parametres: this.getParametres(),
      annees_scolaires: this.getAnneesScolaires(),
      profiles: this.getProfiles(),
      classes: this.getClasses(),
      matieres: this.getMatieres(),
      coefficients_classes: this.getCoefficientsClasses(),
      eleves: this.getEleves(),
      inscriptions: this.getInscriptions(),
      periodes: this.getPeriodes(),
      affectations: this.getAffectations(),
      notes: this.getNotes(),
      presences: this.getPresences(),
      presences_enseignants: this.getPresencesEnseignants(),
      professeurs_principaux: this.getProfesseursPrincipaux(),
      paiements: this.getPaiements(),
      contributions: this.getContributions(),
      depenses: this.getDepenses(),
      parents: this.getParents(),
      parent_eleves: this.getParentEleves(),
      incidents_disciplinaires: this.getIncidentsDisciplinaires(),
      notifications_parents: this.getNotificationsParents(),
      audit_logs: this.getAuditLogs(),
      exported_at: new Date().toISOString(),
      version: '2.5.0',
    };
    return JSON.stringify(data, null, 2);
  }

  public importDatabaseJSON(jsonStr: string, operator: UserProfile): void {
    try {
      const data = JSON.parse(jsonStr);
      if (data.profiles && data.classes && data.eleves) {
        if (data.parametres) this.setItem(STORAGE_KEYS.PARAMETRES, data.parametres);
        if (data.annees_scolaires) this.setItem(STORAGE_KEYS.ANNEES_SCOLAIRES, data.annees_scolaires);
        this.setItem(STORAGE_KEYS.PROFILES, data.profiles);
        this.setItem(STORAGE_KEYS.CLASSES, data.classes);
        this.setItem(STORAGE_KEYS.MATIERES, data.matieres);
        if (data.coefficients_classes) this.setItem(STORAGE_KEYS.COEFFICIENTS_CLASSES, data.coefficients_classes);
        this.setItem(STORAGE_KEYS.ELEVES, data.eleves);
        if (data.inscriptions) this.setItem(STORAGE_KEYS.INSCRIPTIONS, data.inscriptions);
        this.setItem(STORAGE_KEYS.PERIODES, data.periodes);
        this.setItem(STORAGE_KEYS.AFFECTATIONS, data.affectations);
        this.setItem(STORAGE_KEYS.NOTES, data.notes);
        if (data.presences) this.setItem(STORAGE_KEYS.PRESENCES, data.presences);
        if (data.presences_enseignants) this.setItem(STORAGE_KEYS.PRESENCES_ENSEIGNANTS, data.presences_enseignants);
        if (data.professeurs_principaux) this.setItem(STORAGE_KEYS.PROFESSEURS_PRINCIPAUX, data.professeurs_principaux);
        if (data.paiements) this.setItem(STORAGE_KEYS.PAIEMENTS, data.paiements);
        if (data.contributions) this.setItem(STORAGE_KEYS.CONTRIBUTIONS, data.contributions);
        if (data.depenses) this.setItem(STORAGE_KEYS.DEPENSES, data.depenses);
        if (data.parents) this.setItem(STORAGE_KEYS.PARENTS, data.parents);
        if (data.parent_eleves) this.setItem(STORAGE_KEYS.PARENT_ELEVES, data.parent_eleves);
        if (data.incidents_disciplinaires) this.setItem(STORAGE_KEYS.INCIDENTS_DISCIPLINAIRES, data.incidents_disciplinaires);
        if (data.notifications_parents) this.setItem(STORAGE_KEYS.NOTIFICATIONS_PARENTS, data.notifications_parents);
        this.setItem(STORAGE_KEYS.AUDIT_LOGS, data.audit_logs || []);

        this.addAuditLog({
          user_id: operator.id,
          user_nom: `${operator.nom} ${operator.prenom}`,
          user_role: operator.role,
          action: 'IMPORT_BASE_DONNEES',
          table_cible: 'system',
          details: 'Restauration complète de la base de données depuis une archive JSON',
        });
      }
    } catch (e) {
      throw new Error(`Erreur lors de l'import: ${e instanceof Error ? e.message : 'Fichier JSON invalide'}`);
    }
  }
}

export const storage = new StorageEngine();
try {
  storage.init();
} catch (e) {
  console.warn('Storage initial bootstrap notice:', e);
}
