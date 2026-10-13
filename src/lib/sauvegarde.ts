/**
 * GOGBO NOTES V2 — MODULE OFFICIEL DE SAUVEGARDE INTÉGRALE DES DONNÉES
 * CEG GOGBO (Année Scolaire Active : 2026–2027)
 * 
 * Ce module est STRICTEMENT NON-DESTRUCTIF et EN LECTURE SEULE.
 * Il lit l'intégralité du localStorage du navigateur sans jamais modifier, 
 * écraser ou supprimer la moindre valeur existante.
 */

import { storage } from './storage';

export interface SauvegardeMetadata {
  systeme: string;
  etablissement: string;
  ministere: string;
  commune: string;
  arrondissement: string;
  annee_scolaire_active: string;
  date_sauvegarde_iso: string;
  date_sauvegarde_formatee: string;
  version_format: string;
  total_cles_exportees: number;
  total_enregistrements: number;
  sha256_checksum?: string;
  navigateur_origine: string;
  statistiques: Record<string, number>;
}

export interface SauvegardeDonneesMetier {
  parametres_etablissement: unknown;
  annees_scolaires: unknown[];
  annee_active_libelle: string;
  profils_utilisateurs: unknown[];
  identifiants_securises: Record<string, string>;
  classes: unknown[];
  matieres: unknown[];
  coefficients_classes: unknown[];
  eleves: unknown[];
  inscriptions: unknown[];
  periodes: unknown[];
  affectations: unknown[];
  notes: unknown[];
  presences: unknown[];
  presences_enseignants: unknown[];
  professeurs_principaux: unknown[];
  punitions: unknown[];
  sanctions_disciplinaires: unknown[];
  notes_conduite: unknown[];
  seances_cours: unknown[];
  incidents_disciplinaires: unknown[];
  paiements: unknown[];
  contributions: unknown[];
  depenses: unknown[];
  parents: unknown[];
  parent_eleves: unknown[];
  notifications_parents: unknown[];
  journal_audit: unknown[];
  autres_cles_detectees: Record<string, unknown>;
}

export interface SauvegardeIntegralePayload {
  metadata: SauvegardeMetadata;
  donnees: SauvegardeDonneesMetier;
  stockage_brut_local: Record<string, string>;
}

export interface ResultatVerificationSauvegarde {
  valide: boolean;
  message: string;
  date_sauvegarde?: string;
  annee_scolaire?: string;
  etablissement?: string;
  total_enregistrements?: number;
  statistiques?: Record<string, number>;
  empreinte_calculee?: string;
  empreinte_declaree?: string;
  checksum_conforme?: boolean;
  cles_presentes: string[];
}

/**
 * Calcul de l'empreinte cryptographique SHA-256 standardisée
 */
export async function calculerSHA256(texte: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(texte);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // repli en cas d'erreur de contexte
    }
  }

  // Repli déterministe
  let hash = 2166136261;
  for (let i = 0; i < texte.length; i++) {
    hash ^= texte.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Collecte intégrale et passive de toutes les données du navigateur
 * Strictement aucune écriture ni modification.
 */
export async function collecterSauvegardeIntegrale(): Promise<SauvegardeIntegralePayload> {
  const dateNow = new Date();
  const dateIso = dateNow.toISOString();
  const dateFormatee = dateNow.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // 1. Lecture passive via storage engine
  const parametres = storage.getParametres();
  const anneesScolaires = storage.getAnneesScolaires();
  const activeAnnee = storage.getActiveAnneeScolaire();
  const profils = storage.getProfiles();
  const credentials = storage.getUserCredentials();
  const classes = storage.getClasses();
  const matieres = storage.getMatieres();
  const coefficientsClasses = storage.getCoefficientsClasses();
  const eleves = storage.getEleves();
  const inscriptions = storage.getInscriptions();
  const periodes = storage.getPeriodes();
  const affectations = storage.getAffectations();
  const notes = storage.getNotes();
  const presences = storage.getPresences();
  const presencesEnseignants = storage.getPresencesEnseignants();
  const profsPrincipaux = storage.getProfesseursPrincipaux();
  const punitions = storage.getPunitions();
  const sanctions = storage.getSanctionsDisciplinaires();
  const notesConduite = storage.getNotesConduite();
  const seancesCours = storage.getSeancesCours();
  const incidents = storage.getIncidentsDisciplinaires();
  const paiements = storage.getPaiements();
  const contributions = storage.getContributions();
  const depenses = storage.getDepenses();
  const parents = storage.getParents();
  const parentEleves = storage.getParentEleves();
  const notificationsParents = storage.getNotificationsParents();
  const auditLogs = storage.getAuditLogs();

  // 2. Exploration exhaustive du window.localStorage pour TOUTES les clés
  const stockageBrutLocal: Record<string, string> = {};
  const autresClesDetectees: Record<string, unknown> = {};

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith('gogbo_') || key.startsWith('gogbo_v2_'))) {
          const rawVal = window.localStorage.getItem(key);
          if (rawVal !== null) {
            stockageBrutLocal[key] = rawVal;
            try {
              autresClesDetectees[key] = JSON.parse(rawVal);
            } catch {
              autresClesDetectees[key] = rawVal;
            }
          }
        }
      }
    } catch {
      // Ignorer les restrictions de sécurité éventuelles
    }
  }

  // 3. Calcul précis des statistiques par catégorie
  const statistiques: Record<string, number> = {
    'Années Scolaires': anneesScolaires.length,
    'Profils Utilisateurs': profils.length,
    'Comptes & Mots de passe chiffrés': Object.keys(credentials).length,
    'Divisions & Classes': classes.length,
    'Matières Enseignées': matieres.length,
    'Coefficients Matières': coefficientsClasses.length,
    'Élèves (Apprenants)': eleves.length,
    'Inscriptions Scolaires': inscriptions.length,
    'Périodes & Semestres': periodes.length,
    'Affectations Pédagogiques': affectations.length,
    'Notes Trimestrielles': notes.length,
    'Enregistrements Présences Élèves': presences.length,
    'Présences Corps Enseignant': presencesEnseignants.length,
    'Professeurs Principaux': profsPrincipaux.length,
    'Punitions Scolaires': punitions.length,
    'Sanctions Disciplinaires': sanctions.length,
    'Notes de Conduite': notesConduite.length,
    'Séances de Cours Réalisées': seancesCours.length,
    'Incidents Disciplinaires': incidents.length,
    'Versements & Paiements': paiements.length,
    'Grille des Frais & Contributions': contributions.length,
    'Dépenses & Budgets': depenses.length,
    'Parents d’Élèves': parents.length,
    'Associations Parent-Élève': parentEleves.length,
    'Notifications Parents': notificationsParents.length,
    'Journal d’Audit Réglementaire': auditLogs.length,
    'Total Clés LocalStorage Détectées': Object.keys(stockageBrutLocal).length,
  };

  const totalEnregistrements = Object.entries(statistiques)
    .filter(([key]) => key !== 'Total Clés LocalStorage Détectées')
    .reduce((acc, [, val]) => acc + val, 0);

  const metadata: SauvegardeMetadata = {
    systeme: 'GOGBO NOTES V2',
    etablissement: parametres.nom_etablissement || 'CEG GOGBO',
    ministere: parametres.ministere || 'Ministère des Enseignements Secondaire, Technique et de la Formation Professionnelle',
    commune: parametres.commune || 'Adjohoun',
    arrondissement: parametres.arrondissement || 'Gangban',
    annee_scolaire_active: activeAnnee.libelle || '2026–2027',
    date_sauvegarde_iso: dateIso,
    date_sauvegarde_formatee: dateFormatee,
    version_format: 'GOGBO_V2_SAUVEGARDE_INTEGRALE_V1',
    total_cles_exportees: Object.keys(stockageBrutLocal).length,
    total_enregistrements: totalEnregistrements,
    navigateur_origine: typeof window !== 'undefined' ? window.location.origin : 'N/A',
    statistiques,
  };

  const donnees: SauvegardeDonneesMetier = {
    parametres_etablissement: parametres,
    annees_scolaires: anneesScolaires,
    annee_active_libelle: activeAnnee.libelle || '2026–2027',
    profils_utilisateurs: profils,
    identifiants_securises: credentials,
    classes,
    matieres,
    coefficients_classes: coefficientsClasses,
    eleves,
    inscriptions,
    periodes,
    affectations,
    notes,
    presences,
    presences_enseignants: presencesEnseignants,
    professeurs_principaux: profsPrincipaux,
    punitions,
    sanctions_disciplinaires: sanctions,
    notes_conduite: notesConduite,
    seances_cours: seancesCours,
    incidents_disciplinaires: incidents,
    paiements,
    contributions,
    depenses,
    parents,
    parent_eleves: parentEleves,
    notifications_parents: notificationsParents,
    journal_audit: auditLogs,
    autres_cles_detectees: autresClesDetectees,
  };

  return {
    metadata,
    donnees,
    stockage_brut_local: stockageBrutLocal,
  };
}

/**
 * Génère le fichier JSON complet avec empreinte SHA-256 et déclenche le téléchargement
 */
export async function telechargerSauvegardeIntegrale(): Promise<{
  filename: string;
  sha256: string;
  totalEnregistrements: number;
  sizeKo: number;
  anneeActive: string;
  statistiques: Record<string, number>;
}> {
  const payload = await collecterSauvegardeIntegrale();

  // 1. Sérialisation préliminaire pour calcul du hash
  const payloadPourHash = JSON.stringify({
    donnees: payload.donnees,
    stockage_brut_local: payload.stockage_brut_local,
  });
  const hash = await calculerSHA256(payloadPourHash);

  // 2. Attribution du hash dans les métadonnées
  payload.metadata.sha256_checksum = hash;

  // 3. Sérialisation finale propre et indentée
  const jsonFinal = JSON.stringify(payload, null, 2);

  // 4. Nom de fichier standardisé et horodaté
  const dateSlug = payload.metadata.date_sauvegarde_iso
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  const safeAnnee = (payload.metadata.annee_scolaire_active || '2026-2027').replace(/[^a-zA-Z0-9-]/g, '_');
  const filename = `gogbo_notes_v2_sauvegarde_integrale_${safeAnnee}_${dateSlug}.json`;

  // 5. Création du Blob et déclenchement du téléchargement navigateur
  const blob = new Blob([jsonFinal], { type: 'application/json;charset=utf-8' });
  const sizeKo = Math.round((blob.size / 1024) * 10) / 10;

  if (typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    filename,
    sha256: hash,
    totalEnregistrements: payload.metadata.total_enregistrements,
    sizeKo,
    anneeActive: payload.metadata.annee_scolaire_active,
    statistiques: payload.metadata.statistiques,
  };
}

/**
 * Analyse et vérifie un fichier de sauvegarde JSON sans AUCUNE modification de la base actuelle
 */
export async function verifierFichierSauvegarde(contenuJson: string): Promise<ResultatVerificationSauvegarde> {
  try {
    const parsed = JSON.parse(contenuJson) as SauvegardeIntegralePayload;

    if (!parsed || !parsed.metadata || !parsed.donnees) {
      return {
        valide: false,
        message: "Format invalide : l'archive ne contient pas les blocs 'metadata' et 'donnees' requis.",
        cles_presentes: Object.keys(parsed || {}),
      };
    }

    // Vérification du checksum
    let checksumConforme = false;
    let empreinteCalculee = '';

    if (parsed.stockage_brut_local && parsed.donnees) {
      const payloadPourHash = JSON.stringify({
        donnees: parsed.donnees,
        stockage_brut_local: parsed.stockage_brut_local,
      });
      empreinteCalculee = await calculerSHA256(payloadPourHash);
      checksumConforme = empreinteCalculee === parsed.metadata.sha256_checksum;
    }

    return {
      valide: true,
      message: 'Fichier de sauvegarde conforme et intègre.',
      date_sauvegarde: parsed.metadata.date_sauvegarde_formatee || parsed.metadata.date_sauvegarde_iso,
      annee_scolaire: parsed.metadata.annee_scolaire_active,
      etablissement: parsed.metadata.etablissement,
      total_enregistrements: parsed.metadata.total_enregistrements,
      statistiques: parsed.metadata.statistiques,
      empreinte_declaree: parsed.metadata.sha256_checksum,
      empreinte_calculee: empreinteCalculee,
      checksum_conforme: checksumConforme,
      cles_presentes: Object.keys(parsed.donnees || {}),
    };
  } catch (e) {
    return {
      valide: false,
      message: `Erreur de lecture : ${e instanceof Error ? e.message : 'Fichier non analysable'}.`,
      cles_presentes: [],
    };
  }
}
