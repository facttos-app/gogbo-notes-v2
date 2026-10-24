import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { construireExportNotes, ID_CONDUITE_SEULE } from '../../lib/exportNotes';
import { genererXlsx, telechargerXlsx, telechargerZip } from '../../lib/exportXlsx';
import { Download, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import type { Eleve } from '../../types';

type CodeSemestre = 'S1' | 'S2';

function nomFichierSur(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const ExportNotesSemestre: React.FC = () => {
  const { currentUser, isCenseur } = useAuth();
  const { selectedAnnee } = useAnnee();
  const anneeLibelle = selectedAnnee?.libelle || storage.getParametres().annee_academique || '2026–2027';

  const [semestre, setSemestre] = useState<CodeSemestre>('S1');
  const [classeId, setClasseId] = useState<string>('');
  const [matiereId, setMatiereId] = useState<string>('');

  const classes = useMemo(() => storage.getClasses(), []);
  const matieres = useMemo(() => storage.getMatieres(), []);
  const affectations = useMemo(() => storage.getAffectations(anneeLibelle), [anneeLibelle]);
  const notes = useMemo(() => storage.getNotes(), []);
  const notesConduite = useMemo(() => storage.getNotesConduite(anneeLibelle), [anneeLibelle]);
  const periode = useMemo(
    () => storage.getPeriodesByAnnee(anneeLibelle).find((p) => p.code === semestre),
    [anneeLibelle, semestre]
  );

  const elevesParClasse = useMemo(() => {
    const res: Record<string, Eleve[]> = {};
    for (const c of classes) res[c.id] = storage.getElevesByClasse(c.id, anneeLibelle);
    return res;
  }, [classes, anneeLibelle]);

  // Matières proposées : celles qui sont enseignées dans la classe choisie (ou dans au moins une classe)
  const matieresProposees = useMemo(() => {
    const ids = new Set(
      affectations
        .filter((a) => a.statut === 'ACTIF' && (!classeId || a.classe_id === classeId))
        .map((a) => a.matiere_id)
    );
    return matieres
      .filter((m) => ids.has(m.id) && m.code !== 'CONDUITE')
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [affectations, matieres, classeId]);

  const resultat = useMemo(() => {
    if (!periode) return null;
    return construireExportNotes({
      classes,
      matieres,
      affectations,
      notes,
      notesConduite,
      periode,
      elevesParClasse,
      classeId: classeId || undefined,
      matiereId: matiereId || undefined,
    });
  }, [periode, classes, matieres, affectations, notes, notesConduite, elevesParClasse, classeId, matiereId]);

  if (!isCenseur) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-700">
        Cet espace est réservé au Censeur.
      </div>
    );
  }

  const classesAvecPages = resultat ? resultat.classes.filter((c) => c.feuilles.length > 0) : [];

  const telecharger = () => {
    if (!resultat || !periode || classesAvecPages.length === 0) return;
    const base = `${semestre}_${anneeLibelle}`;
    if (classeId) {
      const c = classesAvecPages[0];
      telechargerXlsx(`${nomFichierSur(c.classe.nom)}_${base}.xlsx`, c.feuilles);
    } else {
      telechargerZip(
        `notes_toutes_classes_${base}.zip`,
        classesAvecPages.map((c) => ({
          nom: `${nomFichierSur(c.classe.nom)}_${base}.xlsx`,
          contenu: genererXlsx(c.feuilles),
        }))
      );
    }
    if (currentUser) {
      const classeNom = classeId ? classes.find((c) => c.id === classeId)?.nom || 'classe' : 'toutes les classes';
      storage.addAuditLog({
        user_id: currentUser.id,
        user_nom: `${currentUser.nom} ${currentUser.prenom}`,
        user_role: currentUser.role,
        action: 'EXPORT_NOTES_SEMESTRE',
        table_cible: 'notes',
        details: `Export Excel ${periode.nom} ${anneeLibelle} : ${resultat.totalLignes} lignes (${classeNom}).`,
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2 mb-1">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-black text-slate-900">Export des notes par semestre</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Un classeur Excel par classe. Chaque matière a sa page, avec matricule, nom, prénoms, sexe, date et lieu de
          naissance, moyenne d’interrogation, devoir 1 et devoir 2. La page « Conduite » contient une seule moyenne.
          Année {anneeLibelle}.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Semestre</label>
          <div className="flex space-x-2">
            {(['S1', 'S2'] as CodeSemestre[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setSemestre(code)}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  semestre === code
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {code === 'S1' ? '1er semestre' : '2ème semestre'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="export-classe" className="block text-xs font-bold text-slate-700 mb-1.5">Classe</label>
          <select
            id="export-classe"
            value={classeId}
            onChange={(e) => {
              setClasseId(e.target.value);
              setMatiereId('');
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white"
          >
            <option value="">Toutes les classes (un classeur par classe, dans un ZIP)</option>
            {[...classes]
              .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label htmlFor="export-matiere" className="block text-xs font-bold text-slate-700 mb-1.5">Pages à inclure</label>
          <select
            id="export-matiere"
            value={matiereId}
            onChange={(e) => setMatiereId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white"
          >
            <option value="">Toutes les matières et la conduite</option>
            {matieresProposees.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom} uniquement
              </option>
            ))}
            <option value={ID_CONDUITE_SEULE}>Conduite uniquement</option>
          </select>
        </div>
      </div>

      {!periode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Le semestre choisi n’existe pas pour l’année {anneeLibelle}.</span>
        </div>
      )}

      {resultat && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-xs text-slate-700">
            <strong>{resultat.totalLignes}</strong> ligne(s) dans <strong>{classesAvecPages.length}</strong> classeur(s),
            dont{' '}
            <strong className={resultat.totalSansNote > 0 ? 'text-amber-700' : 'text-emerald-700'}>
              {resultat.totalSansNote}
            </strong>{' '}
            sans aucune note (cellules laissées vides).
          </div>
          {classesAvecPages.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="py-1.5 pr-3 font-bold">Classe</th>
                    <th className="py-1.5 pr-3 font-bold">Élèves</th>
                    <th className="py-1.5 pr-3 font-bold">Pages</th>
                    <th className="py-1.5 pr-3 font-bold">Lignes</th>
                    <th className="py-1.5 font-bold">Sans note</th>
                  </tr>
                </thead>
                <tbody>
                  {classesAvecPages.map((c) => (
                    <tr key={c.classe.id} className="border-b border-slate-100 text-slate-800">
                      <td className="py-1.5 pr-3 font-semibold">{c.classe.nom}</td>
                      <td className="py-1.5 pr-3">{c.eleves}</td>
                      <td className="py-1.5 pr-3">{c.feuilles.length}</td>
                      <td className="py-1.5 pr-3">{c.lignes}</td>
                      <td className="py-1.5">{c.lignesSansNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {classesAvecPages.length === 0 && (
            <div className="text-xs text-amber-800">
              Aucune ligne : aucune matière n’est attribuée à cette sélection pour l’année {anneeLibelle}.
            </div>
          )}
          <button
            id="btn-export-notes-semestre"
            type="button"
            onClick={telecharger}
            disabled={classesAvecPages.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{classeId ? 'Télécharger le classeur Excel' : 'Télécharger les classeurs (ZIP)'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
