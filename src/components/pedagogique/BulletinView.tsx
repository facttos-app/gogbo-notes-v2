import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { 
  calculerClassementClasse, 
  calculerClassementAnnuelClasse,
  calculerMoyenneAnnuelle,
  getAppreciation,
  getAppreciationColor 
} from '../../lib/appreciation';
import { Classe, Eleve, Periode, BulletinEleve, BulletinAnnuelEleve, ParametresEcole } from '../../types';
import { 
  FileText, 
  Printer, 
  Users, 
  Calendar, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Layers,
  Award,
  BookOpen,
  Info
} from 'lucide-react';

interface BulletinViewProps {
  initialEleveId?: string;
  initialClasseId?: string;
  initialPeriodeId?: string;
}

export const BulletinView: React.FC<BulletinViewProps> = ({
  initialEleveId,
  initialClasseId,
  initialPeriodeId,
}) => {
  const { isCenseur, isDirecteur, affectations, currentUser } = useAuth();
  const { selectedAnnee, annees } = useAnnee();

  const classes = storage.getClasses();
  const periodes = storage.getPeriodesByAnnee(selectedAnnee?.libelle);
  const activePeriode = periodes.find((p) => p.is_active) || periodes[0] || storage.getActivePeriode();
  const parametres: ParametresEcole = storage.getParametres();

  // Toutes les 28 classes sont consultables par TOUS les utilisateurs authentifiés (Censeur, Concepteur, DG, Surveillant, Comptable, Enseignants)
  const allowedClasses = classes;

  const [selectedClasseId, setSelectedClasseId] = useState<string>(
    initialClasseId && allowedClasses.some((c) => c.id === initialClasseId)
      ? initialClasseId
      : (allowedClasses[0]?.id || '')
  );

  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>(
    initialPeriodeId || activePeriode?.id || ''
  );

  // Synchroniser la période sélectionnée si la liste change
  useEffect(() => {
    if (periodes.length > 0 && !periodes.some((p) => p.id === selectedPeriodeId)) {
      const active = periodes.find((p) => p.is_active) || periodes[0];
      if (active) setSelectedPeriodeId(active.id);
    }
  }, [periodes, selectedPeriodeId]);

  // Type de bulletin : Périodique (Semestre / Trimestre) ou Annuel (Synthèse S1 & S2)
  const [bulletinType, setBulletinType] = useState<'PERIODIQUE' | 'ANNUEL'>('PERIODIQUE');

  const selectedClasse = classes.find((c) => c.id === selectedClasseId);
  const selectedPeriode = periodes.find((p) => p.id === selectedPeriodeId) || periodes[0] || activePeriode;

  const eleves: Eleve[] = selectedClasse ? storage.getElevesByClasse(selectedClasse.id, selectedAnnee.libelle) : [];

  const [selectedEleveId, setSelectedEleveId] = useState<string>(
    initialEleveId && eleves.some((e) => e.id === initialEleveId)
      ? initialEleveId
      : (eleves[0]?.id || '')
  );

  // Mode génération : 'INDIVIDUEL' ou 'TOUTE_LA_CLASSE'
  const [printMode, setPrintMode] = useState<'INDIVIDUEL' | 'TOUTE_LA_CLASSE'>('INDIVIDUEL');

  // Observation personnalisée du Directeur (officielle pour l'impression)
  const [observationDirecteur, setObservationDirecteur] = useState<string>(
    "Travail satisfaisant. Maintenir les efforts et poursuivre avec la même rigueur dans toutes les disciplines."
  );

  // Observation spécifique pour le bulletin annuel
  const [observationDirecteurAnnuel, setObservationDirecteurAnnuel] = useState<string>(
    "Tableau d'honneur et félicitations du Conseil des Professeurs. Admis en classe supérieure pour l'année scolaire suivante."
  );

  const matieres = storage.getMatieres();
  const allNotes = storage.getNotes();
  const allAffectations = storage.getAffectations(selectedAnnee.libelle);

  // Recherche des périodes S1 et S2
  const periodeS1 = periodes.find((p) => p.code === 'S1') || periodes.find((p) => p.code === 'T1') || periodes[0];
  const periodeS2 = periodes.find((p) => p.code === 'S2') || periodes.find((p) => p.code === 'T2') || periodes[1] || periodes[0];

  // Calcul du classement périodique
  const { classement: classementPeriodique, bulletinsMap: bulletinsMapPeriodique } = React.useMemo(() => {
    if (!selectedClasse || !selectedPeriode) return { classement: [], bulletinsMap: {} };
    const presencesMap: Record<string, { totalAbsences: number; estAbandon: boolean }> = {};
    for (const e of eleves) {
      presencesMap[e.id] = {
        totalAbsences: storage.getEleveAbsencesCount(e.id, selectedAnnee.libelle, selectedPeriode.id),
        estAbandon: storage.isEleveAbandon(e.id, selectedAnnee.libelle),
      };
    }
    return calculerClassementClasse(
      selectedClasse,
      eleves,
      selectedPeriode,
      matieres,
      allNotes,
      allAffectations,
      presencesMap
    );
  }, [selectedClasse, eleves, selectedPeriode, matieres, allNotes, allAffectations, selectedAnnee.libelle]);

  // Calcul du classement annuel
  const { classement: classementAnnuel, bulletinsAnnuelsMap } = React.useMemo(() => {
    if (!selectedClasse) return { classement: [], bulletinsAnnuelsMap: {} };
    return calculerClassementAnnuelClasse(
      selectedClasse,
      eleves,
      periodeS1,
      periodeS2,
      matieres,
      allNotes,
      parametres.annee_academique || '2026–2027',
      allAffectations
    );
  }, [selectedClasse, eleves, periodeS1, periodeS2, matieres, allNotes, parametres.annee_academique, allAffectations]);

  // Si l'élève sélectionné n'est pas dans la liste lors d'un changement de classe
  React.useEffect(() => {
    if (eleves.length > 0 && (!selectedEleveId || !eleves.some((e) => e.id === selectedEleveId))) {
      setSelectedEleveId(eleves[0].id);
    }
  }, [selectedClasseId, eleves, selectedEleveId]);

  const currentEleve = eleves.find((e) => e.id === selectedEleveId);
  const currentBulletinPeriodique: BulletinEleve | undefined = currentEleve ? bulletinsMapPeriodique[currentEleve.id] : undefined;
  const currentBulletinAnnuel: BulletinAnnuelEleve | undefined = currentEleve ? bulletinsAnnuelsMap[currentEleve.id] : undefined;

  const handlePrint = () => {
    window.print();
  };

  // Liste des bulletins périodiques à afficher
  const bulletinsPeriodiquesToRender: BulletinEleve[] = React.useMemo(() => {
    if (printMode === 'TOUTE_LA_CLASSE') {
      return classementPeriodique
        .map((item) => bulletinsMapPeriodique[item.eleve_id])
        .filter((b): b is BulletinEleve => b !== undefined);
    }
    return currentBulletinPeriodique ? [currentBulletinPeriodique] : [];
  }, [printMode, classementPeriodique, bulletinsMapPeriodique, currentBulletinPeriodique]);

  // Liste des bulletins annuels à afficher
  const bulletinsAnnuelsToRender: BulletinAnnuelEleve[] = React.useMemo(() => {
    if (printMode === 'TOUTE_LA_CLASSE') {
      return classementAnnuel
        .map((item) => bulletinsAnnuelsMap[item.eleve_id])
        .filter((b): b is BulletinAnnuelEleve => b !== undefined);
    }
    return currentBulletinAnnuel ? [currentBulletinAnnuel] : [];
  }, [printMode, classementAnnuel, bulletinsAnnuelsMap, currentBulletinAnnuel]);

  if (!selectedClasse) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-xl mx-auto my-8">
        <p className="text-slate-700 font-semibold">Aucune classe disponible.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Panneau de configuration et de filtrage (Masqué à l'impression) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-6 h-6 text-emerald-700" />
              <span>Génération des Bulletins Scolaires Officiels</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Format officiel ministériel du CEG GOGBO • Calculs automatiques des moyennes & Impression A4
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-print-bulletin"
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs sm:text-sm shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer {printMode === 'TOUTE_LA_CLASSE' ? `la classe (${eleves.length})` : 'ce bulletin'} (A4)</span>
            </button>
          </div>
        </div>

        {/* Barre de sélection et bascule Périodique / Annuel */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          {/* Bascule Type de bulletin */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                id="btn-bulletin-periodique"
                onClick={() => setBulletinType('PERIODIQUE')}
                className={`px-3.5 py-1.5 rounded-md transition-all ${
                  bulletinType === 'PERIODIQUE'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulletin Périodique (Semestre / Trimestre)
              </button>
              <button
                id="btn-bulletin-annuel"
                onClick={() => setBulletinType('ANNUEL')}
                className={`px-3.5 py-1.5 rounded-md transition-all ${
                  bulletinType === 'ANNUEL'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulletin Annuel (Synthèse S1 & S2)
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500">Mode :</span>
              <button
                id="btn-mode-individuel"
                onClick={() => setPrintMode('INDIVIDUEL')}
                className={`px-3 py-1 rounded border text-xs font-medium ${
                  printMode === 'INDIVIDUEL'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Individuel
              </button>
              <button
                id="btn-mode-toute-classe"
                onClick={() => setPrintMode('TOUTE_LA_CLASSE')}
                className={`px-3 py-1 rounded border text-xs font-medium ${
                  printMode === 'TOUTE_LA_CLASSE'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Toute la classe ({eleves.length})
              </button>
            </div>
          </div>

          {/* Sélecteurs de Classe, Période et Élève */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Classe :</label>
              <select
                aria-label="Sélectionner la classe"
                value={selectedClasseId}
                onChange={(e) => setSelectedClasseId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500"
              >
                {allowedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({storage.getElevesByClasse(c.id).length} élèves)
                  </option>
                ))}
              </select>
            </div>

            {bulletinType === 'PERIODIQUE' && (
              <div>
                <label className="block text-slate-600 font-medium mb-1">Période d'évaluation :</label>
                <select
                  aria-label="Sélectionner la période d'évaluation"
                  value={selectedPeriodeId}
                  onChange={(e) => setSelectedPeriodeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                >
                  {periodes.filter(Boolean).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom || p.code} {p?.is_locked ? '(Clôturé)' : '(Actif)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {bulletinType === 'ANNUEL' && (
              <div>
                <label className="block text-slate-600 font-medium mb-1">Règle de calcul annuelle :</label>
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2 text-emerald-900 text-[11px] font-medium">
                  (MG S1 + (MG S2 × 2)) ÷ 3
                </div>
              </div>
            )}

            {printMode === 'INDIVIDUEL' && (
              <div>
                <label className="block text-slate-600 font-medium mb-1">Apprenant sélectionné :</label>
                <select
                  aria-label="Sélectionner l'apprenant"
                  value={selectedEleveId}
                  onChange={(e) => setSelectedEleveId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                >
                  {eleves.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.matricule} - {e.nom} {e.prenom}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Saisie de l'observation officielle de la Direction */}
          <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 text-xs">
            <span className="font-semibold text-slate-700 whitespace-nowrap">Observation du Directeur :</span>
            <input
              type="text"
              value={bulletinType === 'PERIODIQUE' ? observationDirecteur : observationDirecteurAnnuel}
              onChange={(e) => {
                if (bulletinType === 'PERIODIQUE') {
                  setObservationDirecteur(e.target.value);
                } else {
                  setObservationDirecteurAnnuel(e.target.value);
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-serif"
              placeholder="Texte officiel de l'observation du Directeur..."
            />
          </div>
        </div>
      </div>

      {/* ZONE DES BULLETIERES (ÉCRAN & IMPRESSION A4) */}
      <div className="space-y-8 print:space-y-0">
        {bulletinType === 'PERIODIQUE' ? (
          // ======================= BULLETINS PÉRIODIQUES =======================
          bulletinsPeriodiquesToRender.map((bulletin) => {
            const eleve = bulletin.eleve;

            return (
              <div
                key={eleve.id}
                className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:break-after-page"
                style={{ pageBreakAfter: 'always' }}
              >
                {/* EN-TÊTE OFFICIEL DU BÉNIN & CEG GOGBO */}
                <div className="border-b-2 border-slate-900 pb-3 mb-4">
                  <div className="grid grid-cols-3 gap-2 text-center items-center">
                    <div className="text-[9px] sm:text-[10px] leading-tight text-slate-700 font-serif uppercase">
                      <p className="font-bold">RÉPUBLIQUE DU BÉNIN</p>
                      <p>Ministère des Enseignements Secondaire, Technique et de la Formation Professionnelle</p>
                      <p className="font-semibold mt-0.5">DDESTFP OUÉMÉ</p>
                    </div>

                    <div className="text-center">
                      <div className="inline-block border-2 border-slate-900 px-3 py-1 font-serif">
                        <h1 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">
                          CEG GOGBO
                        </h1>
                        <p className="text-[9px] font-bold text-slate-700">
                          COMMUNE D'ADJOHOUN
                        </p>
                      </div>
                      <div className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mt-1">
                        BULLETIN SCOLAIRE PÉRIODIQUE
                      </div>
                    </div>

                    <div className="text-[9px] sm:text-[10px] leading-tight text-slate-700 font-serif text-right sm:text-center">
                      <p className="font-bold">ARRONDISSEMENT DE GANGBAN</p>
                      <p>Année Scolaire : <strong>{selectedAnnee.libelle || parametres.annee_academique || '2026–2027'}</strong></p>
                      <p className="font-bold text-slate-900">{selectedPeriode.nom.toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* IDENTIFICATION DE L'APPRENANT */}
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-4 text-xs font-serif print:bg-transparent">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-500 font-normal">Matricule : </span>
                      <strong className="font-mono text-slate-900">{eleve.matricule}</strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 font-normal">Nom & Prénoms : </span>
                      <strong className="text-slate-900 text-sm uppercase">{eleve.nom}</strong>{' '}
                      <strong className="text-slate-900">{eleve.prenom}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Sexe : </span>
                      <strong>{eleve.sexe === 'F' ? 'Féminin' : 'Masculin'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Classe : </span>
                      <strong className="text-slate-900 font-bold">{selectedClasse.nom}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Effectif : </span>
                      <strong>{bulletin.effectif_classe} apprenants</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Date de naissance : </span>
                      <strong>{eleve.date_naissance || 'Non renseignée'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Option LV2 : </span>
                      <strong>{eleve.langue_vivante_2 !== 'AUCUNE' ? eleve.langue_vivante_2 : 'Tronc Commun'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Total absences : </span>
                      <strong className="text-slate-900 font-bold">{bulletin.total_absences ?? 0} heure(s) / jour(s)</strong>
                    </div>
                    {bulletin.est_abandon && (
                      <div className="sm:col-span-2 flex items-center">
                        <span className="bg-red-700 text-white font-black px-2.5 py-1 rounded text-[10px] uppercase tracking-wider shadow-xs">
                          ⚠ STATUT : APPRENANT AYANT ABANDONNÉ
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* TABLEAU OFFICIEL DES NOTES AVEC LES 3 INTERROGATIONS SÉPARÉES */}
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border-collapse border border-slate-900 text-xs font-serif">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold text-[10px] sm:text-[11px] uppercase text-center border-b border-slate-900">
                        <th className="border border-slate-900 p-1.5 text-left">Matière</th>
                        <th className="border border-slate-900 p-1.5 w-12">I1</th>
                        <th className="border border-slate-900 p-1.5 w-12">I2</th>
                        <th className="border border-slate-900 p-1.5 w-12">I3</th>
                        <th className="border border-slate-900 p-1.5 w-16 bg-slate-200/60 font-black">Moy. Int.</th>
                        <th className="border border-slate-900 p-1.5 w-12">Dev. 1</th>
                        <th className="border border-slate-900 p-1.5 w-12">Dev. 2</th>
                        <th className="border border-slate-900 p-1.5 w-16 bg-slate-200 font-black">Moy /20</th>
                        <th className="border border-slate-900 p-1.5 w-10">Coef</th>
                        <th className="border border-slate-900 p-1.5 w-16 bg-slate-200/60 font-black">Points</th>
                        <th className="border border-slate-900 p-1.5 text-left">Appréciation du Professeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulletin.matieres_notes.map((mn) => {
                        const hasNotes = mn.moyenne !== null;
                        return (
                          <tr key={mn.matiere_id} className="text-center text-[11px] hover:bg-slate-50">
                            <td className="border border-slate-900 p-1.5 text-left font-bold text-slate-900">
                              {mn.matiere_nom}
                            </td>
                            <td className="border border-slate-900 p-1">
                              {mn.interro_1 !== null ? mn.interro_1 : '—'}
                            </td>
                            <td className="border border-slate-900 p-1">
                              {mn.interro_2 !== null ? mn.interro_2 : '—'}
                            </td>
                            <td className="border border-slate-900 p-1">
                              {mn.interro_3 !== null ? mn.interro_3 : '—'}
                            </td>
                            <td className="border border-slate-900 p-1 font-semibold bg-slate-50/50">
                              {mn.moyenne_interros !== null ? mn.moyenne_interros.toFixed(2) : '—'}
                            </td>
                            <td className="border border-slate-900 p-1">
                              {mn.devoir_1 !== null ? mn.devoir_1 : '—'}
                            </td>
                            <td className="border border-slate-900 p-1">
                              {mn.devoir_2 !== null ? mn.devoir_2 : '—'}
                            </td>
                            <td className="border border-slate-900 p-1 font-black bg-slate-100 text-slate-900">
                              {mn.moyenne !== null ? mn.moyenne.toFixed(2) : '—'}
                            </td>
                            <td className="border border-slate-900 p-1 font-bold">
                              {mn.coefficient}
                            </td>
                            <td className="border border-slate-900 p-1 font-bold bg-slate-50 text-slate-900">
                              {mn.points !== null ? mn.points.toFixed(2) : '—'}
                            </td>
                            <td className="border border-slate-900 p-1.5 text-left text-[10px] italic">
                              {hasNotes ? mn.appreciation : 'Non évalué'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* SYNTHÈSE DES RÉSULTATS OFFICIELS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-900 p-3 mb-4 font-serif text-xs bg-slate-50/50 print:bg-transparent">
                  <div className="space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Total des points obtenus :</span>
                      <strong className="text-slate-900 text-sm">{bulletin.total_points.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Total des coefficients appliqués :</span>
                      <strong className="text-slate-900 text-sm">{bulletin.total_coefficients}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="font-bold uppercase">Moyenne Générale :</span>
                      <strong className="text-base font-black px-2 py-0.5 bg-slate-900 text-white rounded">
                        {bulletin.moyenne_generale !== null ? `${bulletin.moyenne_generale.toFixed(2)} /20` : 'N.C'}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:border-l sm:border-slate-300 sm:pl-4">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Rang dans la classe :</span>
                      <strong className="text-slate-900 text-sm font-black">
                        {bulletin.rang_label ? `${bulletin.rang_label} sur ${bulletin.effectif_classe}` : 'Non Classé'}
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Appréciation Générale :</span>
                      <strong className="text-slate-900 font-bold">{bulletin.appreciation_generale}</strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Statut académique :</span>
                      <strong className={bulletin.moyenne_generale && bulletin.moyenne_generale >= 10 ? 'text-emerald-800' : 'text-red-700'}>
                        {bulletin.moyenne_generale && bulletin.moyenne_generale >= 10 ? 'ADMISSIBILITÉ / SUCCÈS' : 'EFFORTS SOUTENUS REQUIS'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* ZONE ASSIDUITÉ & NOTE DE CONDUITE (ATTRIBUTION STRICTE PROFESSEUR PRINCIPAL) */}
                {(() => {
                  const nc = storage.getNoteConduiteEleve(eleve.id, selectedPeriode.id, selectedAnnee.libelle);
                  const absences = storage.getPresencesByEleve(eleve.id, selectedAnnee.libelle);
                  const absNonJust = absences.filter(p => p.statut === 'ABSENT' && !p.justifie).length;
                  const absJust = absences.filter(p => p.statut === 'ABSENT' && p.justifie).length;
                  const retardsCount = absences.filter(p => p.statut === 'RETARD').length;

                  return (
                    <div className="border border-slate-900 p-3 mb-4 font-serif text-xs bg-slate-50/30 print:bg-transparent">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="font-bold uppercase text-[10px] text-slate-900 block border-b border-slate-300 pb-0.5">
                            DISCIPLINE & NOTE DE CONDUITE (Professeur Principal)
                          </span>
                          <div className="flex justify-between items-center pt-1">
                            <span>Note de Conduite Officielle :</span>
                            <strong className="font-mono text-sm font-black text-slate-900">
                              {nc ? `${nc.note.toFixed(1)} / 20` : 'En attente de saisie'}
                            </strong>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>Appréciation de conduite :</span>
                            <strong className="italic text-slate-800">{nc?.appreciation || '—'}</strong>
                          </div>
                          <div className="text-[10px] text-slate-500 pt-0.5">
                            Attribuée souverainement par le Professeur Principal • Sans coefficient matière
                          </div>
                        </div>

                        <div className="space-y-1 sm:border-l sm:border-slate-300 sm:pl-4">
                          <span className="font-bold uppercase text-[10px] text-slate-900 block border-b border-slate-300 pb-0.5">
                            ASSIDUITÉ & VIE SCOLAIRE (Surveillance Générale)
                          </span>
                          <div className="flex justify-between pt-1">
                            <span>Absences justifiées :</span>
                            <strong>{absJust}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Absences non justifiées :</span>
                            <strong className={absNonJust > 0 ? 'text-red-700 font-bold' : ''}>{absNonJust}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Retards constatés :</span>
                            <strong>{retardsCount}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ZONE EXCLUSIVE : OBSERVATION DU DIRECTEUR (CONFORME À LA RÈGLE 4) */}
                <div className="border border-slate-900 p-4 font-serif text-xs">
                  <div className="mb-4">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-slate-900 block border-b border-slate-900 pb-1">
                      OBSERVATION DU DIRECTEUR
                    </span>
                    <p className="italic text-slate-800 mt-2 min-h-[36px] leading-relaxed">
                      {observationDirecteur}
                    </p>
                  </div>

                  <div className="pt-2 text-right pr-6">
                    <p className="font-semibold text-slate-700 text-[11px]">
                      Fait à Gogbo, le Directeur
                    </p>
                    <div className="h-14 flex items-center justify-end">
                      <span className="text-[10px] text-slate-400 italic print:text-slate-300 mr-4">
                        [ Signature & Cachet Officiel ]
                      </span>
                    </div>
                    <p className="font-bold uppercase text-[12px] text-slate-900 tracking-wide">
                      {parametres.directeur_nom || 'M. KOUDERIN Mathias'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          // ======================= BULLETINS ANNUELS (SYNTHÈSE S1 & S2) =======================
          bulletinsAnnuelsToRender.map((bulletinAnnuel) => {
            const eleve = bulletinAnnuel.eleve;
            const apprecStyle = getAppreciationColor(bulletinAnnuel.appreciation_annuelle);

            return (
              <div
                key={eleve.id}
                className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:break-after-page"
                style={{ pageBreakAfter: 'always' }}
              >
                {/* EN-TÊTE OFFICIEL DU BÉNIN & CEG GOGBO POUR LE BULLETIN ANNUEL */}
                <div className="border-b-2 border-slate-900 pb-3 mb-4">
                  <div className="grid grid-cols-3 gap-2 text-center items-center">
                    <div className="text-[9px] sm:text-[10px] leading-tight text-slate-700 font-serif uppercase">
                      <p className="font-bold">RÉPUBLIQUE DU BÉNIN</p>
                      <p>Ministère des Enseignements Secondaire, Technique et de la Formation Professionnelle</p>
                      <p className="font-semibold mt-0.5">DDESTFP OUÉMÉ</p>
                    </div>

                    <div className="text-center">
                      <div className="inline-block border-2 border-slate-900 px-3 py-1 font-serif">
                        <h1 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">
                          CEG GOGBO
                        </h1>
                        <p className="text-[9px] font-bold text-slate-700">
                          COMMUNE D'ADJOHOUN
                        </p>
                      </div>
                      <div className="text-[10px] font-black text-amber-900 uppercase tracking-widest mt-1">
                        BULLETIN DE SYNTHÈSE ANNUELLE
                      </div>
                    </div>

                    <div className="text-[9px] sm:text-[10px] leading-tight text-slate-700 font-serif text-right sm:text-center">
                      <p className="font-bold">ARRONDISSEMENT DE GANGBAN</p>
                      <p>Année Scolaire : <strong>{bulletinAnnuel.annee_scolaire}</strong></p>
                      <p className="font-bold text-slate-900">RÉSULTATS DE FIN D'ANNÉE</p>
                    </div>
                  </div>
                </div>

                {/* IDENTIFICATION DE L'APPRENANT (RÈGLE 8) */}
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-4 text-xs font-serif print:bg-transparent">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-500 font-normal">Matricule : </span>
                      <strong className="font-mono text-slate-900">{eleve.matricule}</strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 font-normal">Nom & Prénoms : </span>
                      <strong className="text-slate-900 text-sm uppercase">{eleve.nom}</strong>{' '}
                      <strong className="text-slate-900">{eleve.prenom}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Sexe : </span>
                      <strong>{eleve.sexe === 'F' ? 'Féminin' : 'Masculin'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Classe : </span>
                      <strong className="text-slate-900 font-bold">{selectedClasse.nom}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Effectif : </span>
                      <strong>{bulletinAnnuel.effectif_classe} apprenants</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Année scolaire : </span>
                      <strong className="text-slate-900">{bulletinAnnuel.annee_scolaire}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-normal">Date de naissance : </span>
                      <strong>{eleve.date_naissance || 'Non renseignée'}</strong>
                    </div>
                  </div>
                </div>

                {/* TABLEAU RÉCAPITULATIF ANNUEL DES DEUX SEMESTRES ET DE LA MOYENNE ANNUELLE */}
                <div className="border border-slate-900 rounded-lg overflow-hidden mb-4 font-serif">
                  <div className="bg-slate-900 text-white p-2.5 text-center font-bold text-xs uppercase tracking-wider">
                    RÉCAPITULATIF OFFICIEL DES MOYENNES ANNUELLES — CEG GOGBO
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 text-center bg-white p-4">
                    <div className="p-3">
                      <span className="text-slate-500 text-xs block mb-1">Moyenne Générale du 1er Semestre</span>
                      <span className="text-xl font-black text-slate-800 font-mono">
                        {bulletinAnnuel.mg_semestre_1 !== null ? `${bulletinAnnuel.mg_semestre_1.toFixed(2)} /20` : 'En attente'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Coefficient 1</span>
                    </div>

                    <div className="p-3">
                      <span className="text-slate-500 text-xs block mb-1">Moyenne Générale du 2ème Semestre</span>
                      <span className="text-xl font-black text-slate-800 font-mono">
                        {bulletinAnnuel.mg_semestre_2 !== null ? `${bulletinAnnuel.mg_semestre_2.toFixed(2)} /20` : 'En attente'}
                      </span>
                      <span className="text-[10px] text-emerald-700 block mt-0.5 font-semibold">Coefficient 2 (Pondération double)</span>
                    </div>

                    <div className="p-3 bg-emerald-50/60">
                      <span className="text-emerald-950 text-xs font-bold block mb-1 uppercase">Moyenne Annuelle</span>
                      <span className="text-2xl font-black text-emerald-900 font-mono">
                        {bulletinAnnuel.moyenne_annuelle !== null ? `${bulletinAnnuel.moyenne_annuelle.toFixed(2)} /20` : 'N.C'}
                      </span>
                      <span className="text-[10px] text-emerald-800 block mt-0.5 font-medium">
                        Formule : (MG S1 + (MG S2 × 2)) ÷ 3
                      </span>
                    </div>
                  </div>
                </div>

                {/* SYNTHÈSE ANNUELLE CONFORME AU POINT 8 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-900 p-3 mb-4 font-serif text-xs bg-slate-50/50 print:bg-transparent">
                  <div className="space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Moyenne générale Semestre 1 :</span>
                      <strong className="text-slate-900 text-sm">
                        {bulletinAnnuel.mg_semestre_1 !== null ? `${bulletinAnnuel.mg_semestre_1.toFixed(2)} /20` : 'N.C'}
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Moyenne générale Semestre 2 :</span>
                      <strong className="text-slate-900 text-sm">
                        {bulletinAnnuel.mg_semestre_2 !== null ? `${bulletinAnnuel.mg_semestre_2.toFixed(2)} /20` : 'N.C'}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="font-bold uppercase text-slate-900">Moyenne Annuelle Officielle :</span>
                      <strong className="text-base font-black px-2.5 py-0.5 bg-emerald-900 text-white rounded">
                        {bulletinAnnuel.moyenne_annuelle !== null ? `${bulletinAnnuel.moyenne_annuelle.toFixed(2)} /20` : 'N.C'}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:border-l sm:border-slate-300 sm:pl-4">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Rang Annuel dans la classe :</span>
                      <strong className="text-slate-900 text-sm font-black">
                        {bulletinAnnuel.rang_annuel_label ? `${bulletinAnnuel.rang_annuel_label} sur ${bulletinAnnuel.effectif_classe}` : 'Non Classé'}
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span>Appréciation Annuelle :</span>
                      <strong className="text-slate-900 font-bold">{bulletinAnnuel.appreciation_annuelle}</strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 pt-0.5">
                      <span>Décision du Conseil d'Orientation :</span>
                      <strong className={bulletinAnnuel.moyenne_annuelle && bulletinAnnuel.moyenne_annuelle >= 10 ? 'text-emerald-800' : 'text-red-700'}>
                        {bulletinAnnuel.statut_annuel}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* ZONE ASSIDUITÉ & CONDUITE ANNUELLE */}
                {(() => {
                  const absences = storage.getPresencesByEleve(eleve.id, bulletinAnnuel.annee_scolaire);
                  const absNonJust = absences.filter(p => p.statut === 'ABSENT' && !p.justifie).length;
                  const absJust = absences.filter(p => p.statut === 'ABSENT' && p.justifie).length;
                  const retardsCount = absences.filter(p => p.statut === 'RETARD').length;
                  const allNc = storage.getNotesConduite(bulletinAnnuel.annee_scolaire).filter(n => n.eleve_id === eleve.id);
                  const moyConduite = allNc.length > 0 ? (allNc.reduce((acc, curr) => acc + curr.note, 0) / allNc.length) : null;

                  return (
                    <div className="border border-slate-900 p-3 mb-4 font-serif text-xs bg-slate-50/30 print:bg-transparent">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="font-bold uppercase text-[10px] text-slate-900 block border-b border-slate-300 pb-0.5">
                            SYNTHÈSE DE LA CONDUITE ANNUELLE (Professeur Principal)
                          </span>
                          <div className="flex justify-between items-center pt-1">
                            <span>Moyenne de conduite annuelle :</span>
                            <strong className="font-mono text-sm font-black text-slate-900">
                              {moyConduite !== null ? `${moyConduite.toFixed(1)} / 20` : 'En attente'}
                            </strong>
                          </div>
                          <div className="text-[10px] text-slate-500 pt-0.5">
                            Évaluation globale de l'attitude et de la discipline scolaire de l'apprenant.
                          </div>
                        </div>

                        <div className="space-y-1 sm:border-l sm:border-slate-300 sm:pl-4">
                          <span className="font-bold uppercase text-[10px] text-slate-900 block border-b border-slate-300 pb-0.5">
                            BILAN ANNUEL D'ASSIDUITÉ (Surveillance Générale)
                          </span>
                          <div className="flex justify-between pt-1">
                            <span>Total absences justifiées :</span>
                            <strong>{absJust}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Total absences non justifiées :</span>
                            <strong className={absNonJust > 0 ? 'text-red-700 font-bold' : ''}>{absNonJust}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Total retards constatés :</span>
                            <strong>{retardsCount}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ZONE EXCLUSIVE : OBSERVATION DU DIRECTEUR (CONFORME À LA RÈGLE 4) */}
                <div className="border border-slate-900 p-4 font-serif text-xs">
                  <div className="mb-4">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-slate-900 block border-b border-slate-900 pb-1">
                      OBSERVATION DU DIRECTEUR
                    </span>
                    <p className="italic text-slate-800 mt-2 min-h-[36px] leading-relaxed">
                      {observationDirecteurAnnuel}
                    </p>
                  </div>

                  <div className="pt-2 text-right pr-6">
                    <p className="font-semibold text-slate-700 text-[11px]">
                      Fait à Gogbo, le Directeur
                    </p>
                    <div className="h-14 flex items-center justify-end">
                      <span className="text-[10px] text-slate-400 italic print:text-slate-300 mr-4">
                        [ Signature & Cachet Officiel ]
                      </span>
                    </div>
                    <p className="font-bold uppercase text-[12px] text-slate-900 tracking-wide">
                      {parametres.directeur_nom || 'M. KOUDERIN Mathias'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
