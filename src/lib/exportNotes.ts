// Construction des classeurs d'export des notes d'un semestre.
// Un classeur par classe ; dans chaque classeur, une page par matière (moyenne d'interrogation,
// devoir 1, devoir 2) et une page « Conduite » (une seule moyenne).
// Fonction pure : elle ne lit aucune donnée par elle-même, ce qui permet de la tester.
import { calculerSyntheseMatiere } from './appreciation';
import type { AffectationPedagogique, Classe, Eleve, Matiere, Note, NoteConduite, Periode } from '../types';
import type { CelluleXlsx, FeuilleXlsx } from './exportXlsx';

export const ID_CONDUITE_SEULE = '__CONDUITE__';

const COLONNES_ELEVE = ['Matricule', 'Nom', 'Prénoms', 'Sexe', 'Date de naissance', 'Lieu de naissance'];

export const ENTETES_MATIERE = [
  'Classe',
  'Matière',
  ...COLONNES_ELEVE,
  'Moyenne d’interrogation',
  'Devoir 1',
  'Devoir 2',
];
export const ENTETES_CONDUITE = ['Classe', 'Matière', ...COLONNES_ELEVE, 'Moyenne de conduite'];

const LARGEURS_ELEVE = [14, 22, 28, 8, 16, 22];

export interface ParametresExportNotes {
  classes: Classe[];
  matieres: Matiere[];
  affectations: AffectationPedagogique[]; // affectations de l'année
  notes: Note[];
  notesConduite: NoteConduite[];
  periode: Periode;
  elevesParClasse: Record<string, Eleve[]>;
  classeId?: string; // toutes les classes si absent
  matiereId?: string; // toutes les matières (+ conduite) si absent ; ID_CONDUITE_SEULE = conduite uniquement
}

export interface ClasseExport {
  classe: Classe;
  feuilles: FeuilleXlsx[];
  eleves: number;
  matieres: number;
  lignes: number;
  lignesSansNote: number;
}

export interface ResultatExportNotes {
  classes: ClasseExport[];
  totalLignes: number;
  totalSansNote: number;
}

function arrondir(valeur: number | null | undefined): number | null {
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return null;
  return Math.round(valeur * 100) / 100;
}

function compareFr(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' });
}

function formaterDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
}

function identiteEleve(e: Eleve): CelluleXlsx[] {
  return [e.matricule, e.nom, e.prenom, e.sexe, formaterDate(e.date_naissance), e.lieu_naissance || ''];
}

// Nom de page : le nom complet s'il tient dans 31 caractères, sinon le code court (ex. SVT, PCT).
function nomPage(m: Matiere): string {
  return m.nom.length <= 31 ? m.nom : m.code || m.nom.slice(0, 31);
}

export function construireExportNotes(p: ParametresExportNotes): ResultatExportNotes {
  const sortie: ClasseExport[] = [];
  let totalLignes = 0;
  let totalSansNote = 0;

  const notesParEleve = new Map<string, Note[]>();
  for (const n of p.notes) {
    if (n.periode_id !== p.periode.id) continue;
    const liste = notesParEleve.get(n.eleve_id);
    if (liste) liste.push(n);
    else notesParEleve.set(n.eleve_id, [n]);
  }

  const conduiteParEleve = new Map<string, NoteConduite>();
  for (const c of p.notesConduite) {
    if (c.periode_id !== p.periode.id) continue;
    const precedente = conduiteParEleve.get(c.eleve_id);
    if (!precedente || (c.updated_at || '') > (precedente.updated_at || '')) conduiteParEleve.set(c.eleve_id, c);
  }

  const conduiteSeule = p.matiereId === ID_CONDUITE_SEULE;
  const classes = p.classes
    .filter((c) => !p.classeId || c.id === p.classeId)
    .sort((a, b) => compareFr(a.nom, b.nom));

  for (const classe of classes) {
    const affectationsClasse = p.affectations.filter((a) => a.classe_id === classe.id && a.statut === 'ACTIF');
    const idsMatieres = new Set(affectationsClasse.map((a) => a.matiere_id));
    // La conduite a sa propre page : elle n'est jamais traitée comme une matière à interrogations et devoirs.
    const matieresClasse = conduiteSeule
      ? []
      : p.matieres
          .filter(
            (m) =>
              m.code !== 'CONDUITE' && idsMatieres.has(m.id) && (!p.matiereId || m.id === p.matiereId)
          )
          .sort((a, b) => compareFr(a.nom, b.nom));
    const eleves = [...(p.elevesParClasse[classe.id] || [])].sort(
      (a, b) => compareFr(a.nom, b.nom) || compareFr(a.prenom, b.prenom)
    );

    const feuilles: FeuilleXlsx[] = [];
    let lignesClasse = 0;
    let sansNoteClasse = 0;

    for (const mat of matieresClasse) {
      const idsAffectations = new Set(affectationsClasse.filter((a) => a.matiere_id === mat.id).map((a) => a.id));
      const lignes: CelluleXlsx[][] = [ENTETES_MATIERE];
      for (const eleve of eleves) {
        if (mat.is_langue_option) {
          if (mat.code === 'ALLEMAND' && eleve.langue_vivante_2 !== 'ALLEMAND') continue;
          if (mat.code === 'ESPAGNOL' && eleve.langue_vivante_2 !== 'ESPAGNOL') continue;
        }
        const notesMatiere = (notesParEleve.get(eleve.id) || []).filter((n) => idsAffectations.has(n.affectation_id));
        const s = calculerSyntheseMatiere(mat, notesMatiere);
        const mi = arrondir(s.moyenne_interros);
        const d1 = arrondir(s.devoir_1);
        const d2 = arrondir(s.devoir_2);
        if (mi === null && d1 === null && d2 === null) sansNoteClasse += 1;
        lignes.push([classe.nom, mat.nom, ...identiteEleve(eleve), mi, d1, d2]);
      }
      if (lignes.length > 1) {
        feuilles.push({ nom: nomPage(mat), lignes, largeurs: [12, 30].concat(LARGEURS_ELEVE, [22, 10, 10]) });
        lignesClasse += lignes.length - 1;
      }
    }

    // Page « Conduite » : une seule moyenne par élève
    if (conduiteSeule || !p.matiereId) {
      const lignes: CelluleXlsx[][] = [ENTETES_CONDUITE];
      for (const eleve of eleves) {
        const note = arrondir(conduiteParEleve.get(eleve.id)?.note);
        if (note === null) sansNoteClasse += 1;
        lignes.push([classe.nom, 'Conduite', ...identiteEleve(eleve), note]);
      }
      if (lignes.length > 1) {
        feuilles.push({ nom: 'Conduite', lignes, largeurs: [12, 30].concat(LARGEURS_ELEVE, [22]) });
        lignesClasse += lignes.length - 1;
      }
    }

    sortie.push({
      classe,
      feuilles,
      eleves: eleves.length,
      matieres: matieresClasse.length,
      lignes: lignesClasse,
      lignesSansNote: sansNoteClasse,
    });
    totalLignes += lignesClasse;
    totalSansNote += sansNoteClasse;
  }

  return { classes: sortie, totalLignes, totalSansNote };
}
