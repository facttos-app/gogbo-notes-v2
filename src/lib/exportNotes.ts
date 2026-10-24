// Construction des tableaux d'export des notes d'un semestre (moyenne d'interrogation + 2 devoirs).
// Fonction pure : elle ne lit aucune donnée par elle-même, ce qui permet de la tester.
import { calculerSyntheseMatiere } from './appreciation';
import type { AffectationPedagogique, Classe, Eleve, Matiere, Note, Periode } from '../types';
import type { CelluleXlsx, FeuilleXlsx } from './exportXlsx';

export const ENTETES_EXPORT_NOTES = [
  'Classe',
  'Matière',
  'Matricule',
  'Nom',
  'Prénoms',
  'Moyenne d’interrogation',
  'Devoir 1',
  'Devoir 2',
];

export interface ParametresExportNotes {
  classes: Classe[];
  matieres: Matiere[];
  affectations: AffectationPedagogique[]; // affectations de l'année
  notes: Note[];
  periode: Periode;
  elevesParClasse: Record<string, Eleve[]>;
  classeId?: string; // toutes les classes si absent
  matiereId?: string; // toutes les matières si absent
}

export interface ResumeClasseExport {
  classe: string;
  eleves: number;
  matieres: number;
  lignes: number;
  lignesSansNote: number;
}

export interface ResultatExportNotes {
  feuilles: FeuilleXlsx[];
  resumes: ResumeClasseExport[];
  totalLignes: number;
  totalSansNote: number;
}

function arrondir(valeur: number | null): number | null {
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return null;
  return Math.round(valeur * 100) / 100;
}

function compareFr(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' });
}

export function construireExportNotes(p: ParametresExportNotes): ResultatExportNotes {
  const feuilles: FeuilleXlsx[] = [];
  const resumes: ResumeClasseExport[] = [];
  let totalLignes = 0;
  let totalSansNote = 0;

  // Notes du semestre, rangées par élève (évite de reparcourir toutes les notes pour chaque élève)
  const notesParEleve = new Map<string, Note[]>();
  for (const n of p.notes) {
    if (n.periode_id !== p.periode.id) continue;
    const liste = notesParEleve.get(n.eleve_id);
    if (liste) liste.push(n);
    else notesParEleve.set(n.eleve_id, [n]);
  }

  const classes = p.classes
    .filter((c) => !p.classeId || c.id === p.classeId)
    .sort((a, b) => compareFr(a.nom, b.nom));

  for (const classe of classes) {
    const affectationsClasse = p.affectations.filter((a) => a.classe_id === classe.id && a.statut === 'ACTIF');
    const idsMatieres = new Set(affectationsClasse.map((a) => a.matiere_id));
    const matieresClasse = p.matieres
      .filter((m) => idsMatieres.has(m.id) && (!p.matiereId || m.id === p.matiereId))
      .sort((a, b) => compareFr(a.nom, b.nom));
    const eleves = [...(p.elevesParClasse[classe.id] || [])].sort(
      (a, b) => compareFr(a.nom, b.nom) || compareFr(a.prenom, b.prenom)
    );

    const lignes: CelluleXlsx[][] = [ENTETES_EXPORT_NOTES];
    let sansNote = 0;

    for (const mat of matieresClasse) {
      const idsAffectations = new Set(
        affectationsClasse.filter((a) => a.matiere_id === mat.id).map((a) => a.id)
      );
      for (const eleve of eleves) {
        // Langue vivante 2 : seuls les élèves concernés apparaissent
        if (mat.is_langue_option) {
          if (mat.code === 'ALLEMAND' && eleve.langue_vivante_2 !== 'ALLEMAND') continue;
          if (mat.code === 'ESPAGNOL' && eleve.langue_vivante_2 !== 'ESPAGNOL') continue;
        }
        const notesMatiere = (notesParEleve.get(eleve.id) || []).filter((n) =>
          idsAffectations.has(n.affectation_id)
        );
        const s = calculerSyntheseMatiere(mat, notesMatiere);
        const mi = arrondir(s.moyenne_interros);
        const d1 = arrondir(s.devoir_1);
        const d2 = arrondir(s.devoir_2);
        if (mi === null && d1 === null && d2 === null) sansNote += 1;
        lignes.push([classe.nom, mat.nom, eleve.matricule, eleve.nom, eleve.prenom, mi, d1, d2]);
      }
    }

    const nbLignes = lignes.length - 1;
    resumes.push({
      classe: classe.nom,
      eleves: eleves.length,
      matieres: matieresClasse.length,
      lignes: nbLignes,
      lignesSansNote: sansNote,
    });
    if (nbLignes > 0) {
      feuilles.push({ nom: classe.nom, lignes, largeurs: [14, 26, 14, 22, 28, 22, 10, 10] });
      totalLignes += nbLignes;
      totalSansNote += sansNote;
    }
  }

  return { feuilles, resumes, totalLignes, totalSansNote };
}
