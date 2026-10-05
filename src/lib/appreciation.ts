import { 
  Note, 
  Matiere, 
  Eleve, 
  Classe, 
  Periode, 
  BulletinEleve, 
  NoteSyntheseMatiere, 
  AffectationPedagogique,
  ResultatClassementEleve 
} from '../types';

/**
 * Échelle officielle d'appréciation pour GOGBO NOTES V2 (Section 7) :
 * - 0 ≤ M < 6   → Très faible
 * - 6 ≤ M < 8   → Faible
 * - 8 ≤ M < 10  → Insuffisant
 * - 10 ≤ M < 11 → Passable
 * - 11 ≤ M < 12 → Acceptable
 * - 12 ≤ M < 14 → Assez bien
 * - 14 ≤ M < 16 → Bien
 * - 16 ≤ M < 18 → Très Bien
 * - 18 ≤ M ≤ 20 → Excellent
 */
export function getAppreciation(note: number | null | undefined): string {
  if (note === null || note === undefined || isNaN(note)) {
    return 'Non évalué';
  }

  const n = Math.round(note * 100) / 100;

  if (n < 0 || n > 20) {
    return 'Invalide';
  }
  if (n < 6) return 'Très faible';
  if (n < 8) return 'Faible';
  if (n < 10) return 'Insuffisant';
  if (n < 11) return 'Passable';
  if (n < 12) return 'Acceptable';
  if (n < 14) return 'Assez bien';
  if (n < 16) return 'Bien';
  if (n < 18) return 'Très Bien';
  return 'Excellent'; // 18 <= n <= 20
}

export function getAppreciationColor(appreciation: string): { bg: string; text: string; border: string } {
  switch (appreciation) {
    case 'Très faible':
    case 'Faible':
      return { bg: 'bg-red-50 text-red-700', text: 'text-red-700', border: 'border-red-200' };
    case 'Insuffisant':
      return { bg: 'bg-orange-50 text-orange-700', text: 'text-orange-700', border: 'border-orange-200' };
    case 'Passable':
    case 'Acceptable':
      return { bg: 'bg-amber-50 text-amber-800', text: 'text-amber-800', border: 'border-amber-200' };
    case 'Assez bien':
      return { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-200' };
    case 'Bien':
    case 'Très Bien':
      return { bg: 'bg-emerald-50 text-emerald-800', text: 'text-emerald-800', border: 'border-emerald-200' };
    case 'Excellent':
      return { bg: 'bg-purple-50 text-purple-800', text: 'text-purple-800', border: 'border-purple-200' };
    default:
      return { bg: 'bg-slate-50 text-slate-600', text: 'text-slate-600', border: 'border-slate-200' };
  }
}

/**
 * Calcul de la synthèse complète d'une matière selon la méthode officielle CEG GOGBO :
 * 
 * 1. Notes d'interrogation (3 notes) :
 *    Moyenne d'interrogation = (Interro 1 + Interro 2 + Interro 3) ÷ 3
 * 
 * 2. Notes de devoirs (2 notes) :
 *    Moyenne de devoirs = (Devoir 1 + Devoir 2) ÷ 2
 * 
 * 3. Moyenne matière :
 *    Moyenne matière = [(Interro 1 + Interro 2 + Interro 3) ÷ 3 + Devoir 1 + Devoir 2] ÷ 3
 *    Soit : (Moyenne d'interrogation + Devoir 1 + Devoir 2) ÷ 3
 * 
 * 4. Point obtenu = Moyenne matière × Coefficient
 */
export function calculerSyntheseMatiere(matiere: Matiere, notes: Note[]): NoteSyntheseMatiere {
  let interro1: number | null = null;
  let interro2: number | null = null;
  let interro3: number | null = null;
  let devoir1: number | null = null;
  let devoir2: number | null = null;

  // Extraction précise des notes
  const genericInterros: number[] = [];

  for (const n of notes) {
    if (n.type_evaluation === 'INTERROGATION_1') {
      interro1 = n.valeur;
    } else if (n.type_evaluation === 'INTERROGATION_2') {
      interro2 = n.valeur;
    } else if (n.type_evaluation === 'INTERROGATION_3') {
      interro3 = n.valeur;
    } else if (n.type_evaluation === 'INTERROGATION') {
      genericInterros.push(n.valeur);
    } else if (n.type_evaluation === 'DEVOIR_1') {
      devoir1 = n.valeur;
    } else if (n.type_evaluation === 'DEVOIR_2') {
      devoir2 = n.valeur;
    }
  }

  // Remplissage rétrocompatible si les notes d'interrogations sont étiquetées 'INTERROGATION'
  if (interro1 === null && genericInterros.length > 0) interro1 = genericInterros[0];
  if (interro2 === null && genericInterros.length > 1) interro2 = genericInterros[1];
  if (interro3 === null && genericInterros.length > 2) interro3 = genericInterros[2];

  // Calcul de la moyenne d'interrogation
  const interrosList = [interro1, interro2, interro3].filter((x): x is number => x !== null);
  let moyenneInterros: number | null = null;

  if (interrosList.length > 0) {
    if (interrosList.length === 3) {
      moyenneInterros = Math.round(((interro1! + interro2! + interro3!) / 3) * 100) / 100;
    } else {
      const sum = interrosList.reduce((a, b) => a + b, 0);
      moyenneInterros = Math.round((sum / interrosList.length) * 100) / 100;
    }
  }

  // Calcul de la moyenne de matière
  // Règle stricte : Moyenne matière = (Moyenne d'interrogation + Devoir 1 + Devoir 2) ÷ 3
  let moyenneMatiere: number | null = null;

  if (moyenneInterros !== null && devoir1 !== null && devoir2 !== null) {
    // Cas complet conforme à la règle 3
    moyenneMatiere = Math.round(((moyenneInterros + devoir1 + devoir2) / 3) * 100) / 100;
  } else {
    // Calcul temps réel progressif en cours de trimestre si toutes les épreuves ne sont pas encore saisies
    const composantes: number[] = [];
    if (moyenneInterros !== null) composantes.push(moyenneInterros);
    if (devoir1 !== null) composantes.push(devoir1);
    if (devoir2 !== null) composantes.push(devoir2);

    if (composantes.length > 0) {
      const sum = composantes.reduce((a, b) => a + b, 0);
      moyenneMatiere = Math.round((sum / composantes.length) * 100) / 100;
    }
  }

  // Point obtenu = Moyenne matière × Coefficient
  const points = moyenneMatiere !== null 
    ? Math.round((moyenneMatiere * matiere.coefficient) * 100) / 100 
    : null;

  const appreciation = getAppreciation(moyenneMatiere);

  return {
    matiere_id: matiere.id,
    matiere_nom: matiere.nom,
    matiere_code: matiere.code,
    coefficient: matiere.coefficient,
    notes,
    interro_1: interro1,
    interro_2: interro2,
    interro_3: interro3,
    moyenne_interros: moyenneInterros,
    devoir_1: devoir1,
    devoir_2: devoir2,
    moyenne: moyenneMatiere,
    points,
    appreciation,
  };
}

/**
 * Calcul de la moyenne pour une matière donnée à partir de ses notes
 */
export function calculerMoyenneMatiere(notes: Note[]): number | null {
  if (!notes || notes.length === 0) return null;
  const dummyMat: Matiere = {
    id: 'dummy',
    code: 'DUMMY',
    nom: 'Dummy',
    coefficient: 1,
    statut: 'ACTIF',
    is_langue_option: false,
    categorie: 'GENERALE',
  };
  const res = calculerSyntheseMatiere(dummyMat, notes);
  return res.moyenne;
}

/**
 * Formatage standard béninois du rang : 1 -> "1er", 2 -> "2ème", etc.
 */
export function formatRang(rang: number, exAequo = false): string {
  if (rang === 1) {
    return exAequo ? '1er ex' : '1er';
  }
  return exAequo ? `${rang}ème ex` : `${rang}ème`;
}

/**
 * Calcul du bulletin complet d'un élève pour une période donnée
 */
export function calculerBulletinEleve(
  eleve: Eleve,
  classe: Classe,
  periode: Periode,
  matieres: Matiere[],
  notesEleve: Note[],
  effectifClasse: number,
  affectations?: AffectationPedagogique[],
  totalAbsences?: number,
  estAbandon?: boolean
): BulletinEleve {
  const safeNotes = notesEleve || [];
  const matieresNotes: NoteSyntheseMatiere[] = [];
  let totalPoints = 0;
  let totalCoefficients = 0;

  for (const mat of matieres) {
    // Règle Langue Vivante 2 (Section 7) : Ne pas imposer Allemand ou Espagnol si l'élève n'a pas cette option
    if (mat.is_langue_option) {
      if (mat.code === 'ALLEMAND' && eleve.langue_vivante_2 !== 'ALLEMAND') {
        continue;
      }
      if (mat.code === 'ESPAGNOL' && eleve.langue_vivante_2 !== 'ESPAGNOL') {
        continue;
      }
    }

    // Filtrer les notes pour cette matière et cette période
    const validAffIds = affectations
      ? new Set(affectations.filter((a) => a.matiere_id === mat.id).map((a) => a.id))
      : null;

    const notesMatiere = safeNotes.filter((n) => {
      const matchPeriode = n.periode_id === periode.id;
      if (!matchPeriode) return false;
      if (validAffIds) return validAffIds.has(n.affectation_id);
      return true;
    });

    const synthese = calculerSyntheseMatiere(mat, notesMatiere);

    if (synthese.points !== null && synthese.moyenne !== null) {
      totalPoints += synthese.points;
      totalCoefficients += mat.coefficient;
    }

    matieresNotes.push(synthese);
  }

  // Moyenne générale = Total points pondérés ÷ Total des coefficients
  const moyenneGenerale = totalCoefficients > 0 
    ? Math.round((totalPoints / totalCoefficients) * 100) / 100 
    : null;

  return {
    eleve,
    classe,
    periode,
    matieres_notes: matieresNotes,
    total_points: Math.round(totalPoints * 100) / 100,
    total_coefficients: totalCoefficients,
    moyenne_generale: moyenneGenerale,
    appreciation_generale: getAppreciation(moyenneGenerale),
    effectif_classe: effectifClasse,
    total_absences: totalAbsences ?? 0,
    est_abandon: estAbandon ?? false,
  };
}

/**
 * Calcul automatique du classement de toute une classe pour une période donnée.
 * Règle de classement avec gestion stricte et équitable des égalités :
 * Si deux élèves ont la même moyenne, ils reçoivent le même rang (ex: 2ème ex),
 * et l'élève suivant prend le rang correspondant à son ordre physique (ex: 4ème).
 */
export function calculerClassementClasse(
  classe: Classe,
  eleves: Eleve[],
  periode: Periode,
  matieres: Matiere[],
  notesClasse: Note[],
  affectations?: AffectationPedagogique[],
  presencesMap?: Record<string, { totalAbsences: number; estAbandon: boolean }>
): { classement: ResultatClassementEleve[]; bulletinsMap: Record<string, BulletinEleve> } {
  const bulletinsMap: Record<string, BulletinEleve> = {};

  // 1. Calcul du bulletin pour chaque apprenant
  for (const el of eleves) {
    const elNotes = notesClasse.filter((n) => n.eleve_id === el.id);
    const pInfo = presencesMap ? presencesMap[el.id] : undefined;
    const b = calculerBulletinEleve(
      el, 
      classe, 
      periode, 
      matieres, 
      elNotes, 
      eleves.length, 
      affectations,
      pInfo?.totalAbsences,
      pInfo?.estAbandon
    );
    bulletinsMap[el.id] = b;
  }

  // 2. Tri du plus grand résultat au plus petit (avec gestion des élèves non évalués en fin de tableau)
  const sortedEleves = [...eleves].sort((a, b) => {
    const moyA = bulletinsMap[a.id]?.moyenne_generale ?? -1;
    const moyB = bulletinsMap[b.id]?.moyenne_generale ?? -1;
    return moyB - moyA;
  });

  // 3. Attribution du rang avec gestion des égalités
  const classement: ResultatClassementEleve[] = [];
  let currentRank = 1;

  for (let i = 0; i < sortedEleves.length; i++) {
    const el = sortedEleves[i];
    const b = bulletinsMap[el.id];
    const moy = b.moyenne_generale;

    // Détection de l'égalité avec l'élément précédent
    let isExAequo = false;
    if (i > 0) {
      const prevMoy = bulletinsMap[sortedEleves[i - 1].id]?.moyenne_generale;
      if (moy !== null && prevMoy !== null && moy === prevMoy) {
        isExAequo = true;
        // Le rang reste le même que le précédent
      } else {
        currentRank = i + 1;
      }
    } else {
      currentRank = 1;
    }

    // Détection si l'élément suivant a aussi la même note pour mentionner "ex"
    if (!isExAequo && i < sortedEleves.length - 1) {
      const nextMoy = bulletinsMap[sortedEleves[i + 1].id]?.moyenne_generale;
      if (moy !== null && nextMoy !== null && moy === nextMoy) {
        isExAequo = true;
      }
    }

    const rangLabel = moy !== null ? formatRang(currentRank, isExAequo) : 'N.C';

    b.rang = currentRank;
    b.rang_label = rangLabel;

    classement.push({
      rang: currentRank,
      rang_label: rangLabel,
      eleve_id: el.id,
      matricule: el.matricule,
      nom: el.nom,
      prenom: el.prenom,
      sexe: el.sexe,
      classe_id: classe.id,
      classe_nom: classe.nom,
      total_points: b.total_points,
      total_coefficients: b.total_coefficients,
      moyenne_generale: moy,
      appreciation: b.appreciation_generale,
      ex_aequo: isExAequo,
    });
  }

  return { classement, bulletinsMap };
}

/**
 * Calcul officiel de la moyenne annuelle du CEG GOGBO :
 * Formule obligatoire : (MG Semestre 1 + (MG Semestre 2 × 2)) ÷ 3
 * Exemple : S1 = 11,50 et S2 = 14,00 => (11,50 + 28,00) ÷ 3 = 13,17 / 20
 */
export function calculerMoyenneAnnuelle(
  mgSemestre1: number | null | undefined,
  mgSemestre2: number | null | undefined
): number | null {
  if (
    mgSemestre1 === null || mgSemestre1 === undefined || isNaN(mgSemestre1) ||
    mgSemestre2 === null || mgSemestre2 === undefined || isNaN(mgSemestre2)
  ) {
    return null;
  }
  const calc = (mgSemestre1 + (mgSemestre2 * 2)) / 3;
  return Math.round(calc * 100) / 100;
}

/**
 * Calcul automatique du classement et des bulletins annuels de la classe
 */
export function calculerClassementAnnuelClasse(
  classe: Classe,
  eleves: Eleve[],
  periodeS1: Periode,
  periodeS2: Periode,
  matieres: Matiere[],
  allNotes: Note[],
  anneeScolaire: string = '2026–2027',
  affectations?: AffectationPedagogique[],
  simulationS2Map?: Record<string, number>
): {
  classement: import('../types').ResultatClassementAnnuel[];
  bulletinsAnnuelsMap: Record<string, import('../types').BulletinAnnuelEleve>;
} {
  const { bulletinsMap: bulletinsS1 } = calculerClassementClasse(
    classe,
    eleves,
    periodeS1,
    matieres,
    allNotes,
    affectations
  );

  const { bulletinsMap: bulletinsS2 } = calculerClassementClasse(
    classe,
    eleves,
    periodeS2,
    matieres,
    allNotes,
    affectations
  );

  const bulletinsAnnuelsMap: Record<string, import('../types').BulletinAnnuelEleve> = {};

  for (const el of eleves) {
    const b1 = bulletinsS1[el.id];
    const b2 = bulletinsS2[el.id];

    const mg1 = b1?.moyenne_generale ?? null;
    let mg2 = b2?.moyenne_generale ?? null;

    // Simulation possible si les notes du S2 ne sont pas encore saisies
    if ((mg2 === null || isNaN(mg2)) && simulationS2Map && simulationS2Map[el.id] !== undefined) {
      mg2 = simulationS2Map[el.id];
    }

    const moyAnnuelle = calculerMoyenneAnnuelle(mg1, mg2);
    const appreciationAnnuelle = getAppreciation(moyAnnuelle);
    const statutAnnuel = moyAnnuelle !== null
      ? (moyAnnuelle >= 10 ? 'ADMIS EN CLASSE SUPÉRIEURE' : 'REDOUBLEMENT / SOUTIEN REQUIS')
      : 'EN COURS D’ÉVALUATION';

    bulletinsAnnuelsMap[el.id] = {
      eleve: el,
      classe,
      annee_scolaire: anneeScolaire,
      mg_semestre_1: mg1,
      mg_semestre_2: mg2,
      moyenne_annuelle: moyAnnuelle,
      appreciation_annuelle: appreciationAnnuelle,
      statut_annuel: statutAnnuel,
      effectif_classe: eleves.length,
    };
  }

  // Tri par moyenne annuelle décroissante
  const sortedEleves = [...eleves].sort((a, b) => {
    const moyA = bulletinsAnnuelsMap[a.id]?.moyenne_annuelle ?? -1;
    const moyB = bulletinsAnnuelsMap[b.id]?.moyenne_annuelle ?? -1;
    return moyB - moyA;
  });

  const classement: import('../types').ResultatClassementAnnuel[] = [];
  let currentRank = 1;

  for (let i = 0; i < sortedEleves.length; i++) {
    const el = sortedEleves[i];
    const b = bulletinsAnnuelsMap[el.id];
    const moy = b.moyenne_annuelle;

    let isExAequo = false;
    if (i > 0) {
      const prevMoy = bulletinsAnnuelsMap[sortedEleves[i - 1].id]?.moyenne_annuelle;
      if (moy !== null && prevMoy !== null && moy === prevMoy) {
        isExAequo = true;
      } else {
        currentRank = i + 1;
      }
    } else {
      currentRank = 1;
    }

    if (!isExAequo && i < sortedEleves.length - 1) {
      const nextMoy = bulletinsAnnuelsMap[sortedEleves[i + 1].id]?.moyenne_annuelle;
      if (moy !== null && nextMoy !== null && moy === nextMoy) {
        isExAequo = true;
      }
    }

    const rangLabel = moy !== null ? formatRang(currentRank, isExAequo) : 'N.C';
    b.rang_annuel = currentRank;
    b.rang_annuel_label = rangLabel;

    classement.push({
      rang: currentRank,
      rang_label: rangLabel,
      eleve_id: el.id,
      matricule: el.matricule,
      nom: el.nom,
      prenom: el.prenom,
      sexe: el.sexe,
      classe_id: classe.id,
      classe_nom: classe.nom,
      mg_semestre_1: b.mg_semestre_1,
      mg_semestre_2: b.mg_semestre_2,
      moyenne_annuelle: moy,
      appreciation_annuelle: b.appreciation_annuelle,
      ex_aequo: isExAequo,
    });
  }

  return { classement, bulletinsAnnuelsMap };
}
