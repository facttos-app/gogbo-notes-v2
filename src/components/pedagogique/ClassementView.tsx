import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { calculerClassementClasse, getAppreciationColor } from '../../lib/appreciation';
import { Classe, Periode } from '../../types';
import { 
  Trophy, 
  Award, 
  Users, 
  Printer, 
  FileText, 
  Filter, 
  ArrowUpDown, 
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';

interface ClassementViewProps {
  onOpenBulletin?: (eleveId: string, classeId: string, periodeId: string) => void;
}

export const ClassementView: React.FC<ClassementViewProps> = ({ onOpenBulletin }) => {
  const { currentUser, isCenseur, isDirecteur, affectations } = useAuth();
  const { selectedAnnee, annees } = useAnnee();

  const classes = storage.getClasses();
  const periodes = storage.getPeriodesByAnnee(selectedAnnee?.libelle);
  const activePeriode = periodes.find((p) => p.is_active) || periodes[0] || storage.getActivePeriode();

  // Toutes les 28 classes sont consultables par TOUS les utilisateurs authentifiés
  const allowedClasses = classes;

  const [selectedClasseId, setSelectedClasseId] = useState<string>(
    classes[0]?.id || ''
  );
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>(activePeriode?.id || '');

  // Synchroniser la période sélectionnée si la liste change
  React.useEffect(() => {
    if (periodes.length > 0 && !periodes.some((p) => p.id === selectedPeriodeId)) {
      const active = periodes.find((p) => p.is_active) || periodes[0];
      if (active) setSelectedPeriodeId(active.id);
    }
  }, [periodes, selectedPeriodeId]);

  const selectedClasse: Classe | undefined = classes.find((c) => c.id === selectedClasseId);
  const selectedPeriode: Periode | undefined = periodes.find((p) => p.id === selectedPeriodeId) || periodes[0] || activePeriode;

  const eleves = selectedClasse ? storage.getElevesByClasse(selectedClasse.id, selectedAnnee.libelle) : [];
  const matieres = storage.getMatieres();
  const allNotes = storage.getNotes();
  const allAffectations = storage.getAffectations(selectedAnnee.libelle);

  // Calcul du classement en temps réel
  const { classement, bulletinsMap } = React.useMemo(() => {
    if (!selectedClasse || !selectedPeriode) return { classement: [], bulletinsMap: {} };
    return calculerClassementClasse(
      selectedClasse,
      eleves,
      selectedPeriode,
      matieres,
      allNotes,
      allAffectations
    );
  }, [selectedClasse, eleves, selectedPeriode, matieres, allNotes, allAffectations]);

  // Statistiques de la classe
  const stats = React.useMemo(() => {
    const evaluates = classement.filter((c) => c.moyenne_generale !== null);
    if (evaluates.length === 0) {
      return {
        effectif: eleves.length,
        evalues: 0,
        moyenneClasse: null,
        reussiteCount: 0,
        tauxReussite: 0,
        maxMoyenne: null,
        minMoyenne: null,
      };
    }

    const somme = evaluates.reduce((acc, curr) => acc + (curr.moyenne_generale || 0), 0);
    const moyenneClasse = Math.round((somme / evaluates.length) * 100) / 100;
    const reussiteCount = evaluates.filter((c) => (c.moyenne_generale || 0) >= 10).length;
    const tauxReussite = Math.round((reussiteCount / evaluates.length) * 100);
    const maxMoyenne = evaluates[0]?.moyenne_generale ?? null;
    const minMoyenne = evaluates[evaluates.length - 1]?.moyenne_generale ?? null;

    return {
      effectif: eleves.length,
      evalues: evaluates.length,
      moyenneClasse,
      reussiteCount,
      tauxReussite,
      maxMoyenne,
      minMoyenne,
    };
  }, [classement, eleves.length]);

  const handlePrint = () => {
    window.print();
  };

  if (!selectedClasse) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-xl mx-auto my-8">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="text-slate-700 font-semibold">Aucune classe disponible pour votre compte.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête & Filtres (Masqué à l'impression) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              <span>Classement & Palmarès Officiel</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Calcul automatique des moyennes générales, rangs et appréciations par classe
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-print-classement"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le Palmarès</span>
            </button>
          </div>
        </div>

        {/* Sélecteurs Classe et Période */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-slate-700 flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Classe :</span>
              </span>
              <select
                id="select-classe-classement"
                aria-label="Sélectionner la classe pour le classement"
                value={selectedClasseId}
                onChange={(e) => setSelectedClasseId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
              >
                {allowedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({storage.getElevesByClasse(c.id).length} élèves)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-slate-700">Trimestre :</span>
              <select
                id="select-periode-classement"
                aria-label="Sélectionner la période pour le classement"
                value={selectedPeriodeId}
                onChange={(e) => setSelectedPeriodeId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
              >
                {periodes.filter(Boolean).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom || p.code} {p?.is_locked ? '🔒' : '🔓'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Règle égalité : <span className="text-slate-800 font-bold">1er, 2ème, 2ème ex, 4ème</span> (CEG GOGBO)
          </div>
        </div>

        {/* Cartes de Synthèse Statistique */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Moyenne de la classe</div>
            <div className="text-xl font-black text-emerald-800 mt-0.5">
              {stats.moyenneClasse !== null ? `${stats.moyenneClasse} /20` : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{stats.evalues} élèves évalués</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Taux de Réussite (≥ 10)</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {stats.tauxReussite}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{stats.reussiteCount} / {stats.evalues} admis</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Plus forte moyenne</div>
            <div className="text-xl font-black text-amber-600 mt-0.5">
              {stats.maxMoyenne !== null ? `${stats.maxMoyenne} /20` : '—'}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">🥇 1er de la classe</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-medium text-slate-500">Plus faible moyenne</div>
            <div className="text-xl font-black text-slate-700 mt-0.5">
              {stats.minMoyenne !== null ? `${stats.minMoyenne} /20` : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Dernier classé</div>
          </div>
        </div>
      </div>

      {/* DOCUMENT OFFICIEL DE CLASSEMENT (VISIBLE ÉCRAN ET IMPRESSION) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        {/* En-tête officiel pour l'impression */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 print:bg-white">
          <div className="text-center space-y-1">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-500 font-semibold">
              République du Bénin • Ministère des Enseignements Secondaire, Technique et de la Formation Professionnelle
            </div>
            <h3 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-tight">
              Collège d'Enseignement Général de GOGBO (CEG GOGBO)
            </h3>
            <div className="inline-block bg-amber-100 text-amber-900 border border-amber-300 font-black px-3 py-0.5 rounded text-xs uppercase tracking-wider mt-1">
              Palmarès & Classement Trimestriel — {selectedPeriode?.nom}
            </div>
            <div className="text-xs text-slate-600 font-medium pt-1">
              Classe : <strong className="text-slate-900">{selectedClasse.nom}</strong> | Effectif : <strong>{eleves.length} apprenants</strong> | Année Académique : <strong>2026–2027</strong>
            </div>
          </div>
        </div>

        {/* Tableau du classement */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3 sm:px-4 py-3 text-center w-16">Rang</th>
                <th className="px-3 sm:px-4 py-3">Matricule</th>
                <th className="px-3 sm:px-4 py-3">Nom & Prénoms</th>
                <th className="px-2 sm:px-4 py-3 text-center">Sexe</th>
                <th className="px-3 sm:px-4 py-3 text-center">Total Points</th>
                <th className="px-3 sm:px-4 py-3 text-center">Total Coef.</th>
                <th className="px-3 sm:px-4 py-3 text-center font-black">Moyenne Générale</th>
                <th className="px-3 sm:px-4 py-3">Appréciation</th>
                <th className="px-3 sm:px-4 py-3 text-right print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {classement.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Aucun apprenant enregistré dans cette classe.
                  </td>
                </tr>
              ) : (
                classement.map((item) => {
                  const apprecStyle = getAppreciationColor(item.appreciation);
                  const isTop1 = item.rang === 1 && item.moyenne_generale !== null;
                  const isTop3 = item.rang <= 3 && item.moyenne_generale !== null;

                  return (
                    <tr 
                      key={item.eleve_id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTop1 ? 'bg-amber-50/40 font-medium' : ''
                      }`}
                    >
                      {/* Rang */}
                      <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                        {item.moyenne_generale === null ? (
                          <span className="text-slate-400 font-medium">N.C</span>
                        ) : isTop1 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-xs border border-amber-300">
                            🥇 {item.rang_label}
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                            {item.rang === 2 ? '🥈' : '🥉'} {item.rang_label}
                          </span>
                        ) : (
                          <span className="font-bold text-slate-700">
                            {item.rang_label}
                          </span>
                        )}
                      </td>

                      {/* Matricule */}
                      <td className="px-3 sm:px-4 py-3 font-mono text-[11px] text-slate-600 font-semibold whitespace-nowrap">
                        {item.matricule}
                      </td>

                      {/* Nom & Prénom */}
                      <td className="px-3 sm:px-4 py-3">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {item.nom} {item.prenom}
                        </div>
                      </td>

                      {/* Sexe */}
                      <td className="px-2 sm:px-4 py-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          item.sexe === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.sexe}
                        </span>
                      </td>

                      {/* Total Points */}
                      <td className="px-3 sm:px-4 py-3 text-center font-mono font-medium text-slate-700">
                        {item.moyenne_generale !== null ? item.total_points.toFixed(2) : '—'}
                      </td>

                      {/* Total Coef */}
                      <td className="px-3 sm:px-4 py-3 text-center font-mono text-slate-600">
                        {item.total_coefficients > 0 ? item.total_coefficients : '—'}
                      </td>

                      {/* Moyenne Générale sur 20 */}
                      <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                        {item.moyenne_generale !== null ? (
                          <span className={`inline-block px-2.5 py-1 rounded-md font-black text-sm ${
                            item.moyenne_generale >= 10
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {item.moyenne_generale.toFixed(2)} /20
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Non noté</span>
                        )}
                      </td>

                      {/* Appréciation */}
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${apprecStyle.bg} ${apprecStyle.border}`}>
                          {item.appreciation}
                        </span>
                      </td>

                      {/* Action Bulletin (Masqué à l'impression) */}
                      <td className="px-3 sm:px-4 py-3 text-right print:hidden whitespace-nowrap">
                        <button
                          id={`btn-voir-bulletin-${item.eleve_id}`}
                          onClick={() => onOpenBulletin && onOpenBulletin(item.eleve_id, selectedClasse.id, selectedPeriode.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-medium text-[11px] transition-colors"
                          title="Générer et consulter le bulletin scolaire"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Bulletin</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pied de page d'attestation pour impression */}
        <div className="hidden print:block p-8 pt-6 text-xs text-slate-800 border-t border-slate-300">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <p className="font-semibold text-slate-600">Le Censeur des Études</p>
              <div className="h-20" />
              <p className="font-bold uppercase underline">M. HOUNSA Dieudonné</p>
            </div>
            <div>
              <p className="font-semibold text-slate-600">Le Directeur du CEG GOGBO</p>
              <div className="h-20" />
              <p className="font-bold uppercase underline">M. HOUNWANOU Marcellin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
