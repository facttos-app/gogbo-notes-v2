import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { SeanceCours, StatutPresence, Eleve, EnregistrementPresence } from '../../types';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  UserX, 
  Users, 
  Save, 
  CheckCheck,
  Calendar,
  BookOpen,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';

interface AppelCoursSeanceProps {
  restrictToTeacher?: boolean;
  initialClasseId?: string;
}

export const AppelCoursSeance: React.FC<AppelCoursSeanceProps> = ({
  restrictToTeacher = false,
  initialClasseId,
}) => {
  const { currentUser, isSurveillant, isCenseur, isDirecteur, isConcepteur } = useAuth();
  const { selectedAnnee, isArchive } = useAnnee();
  const anneeLibelle = selectedAnnee?.libelle || storage.getParametres().annee_academique || '2026–2027';

  const canAdmin = isSurveillant || isCenseur || isDirecteur || isConcepteur;

  // 1. Liste des classes autorisées
  const allClasses = storage.getClasses();
  const teacherAffs = useMemo(() => {
    if (!currentUser) return [];
    return storage.getAffectationsByProfile(currentUser.id, anneeLibelle);
  }, [currentUser, anneeLibelle]);

  const teacherClasseIds = useMemo(() => {
    return Array.from(new Set(teacherAffs.map((a) => a.classe_id)));
  }, [teacherAffs]);

  const availableClasses = useMemo(() => {
    if (restrictToTeacher && !canAdmin) {
      return allClasses.filter((c) => teacherClasseIds.includes(c.id));
    }
    return allClasses;
  }, [allClasses, restrictToTeacher, canAdmin, teacherClasseIds]);

  const [selectedClasseId, setSelectedClasseId] = useState<string>(() => {
    if (initialClasseId && availableClasses.some((c) => c.id === initialClasseId)) {
      return initialClasseId;
    }
    return availableClasses[0]?.id || '';
  });

  // Date de l'appel
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // 2. Séances de cours disponibles pour la classe et l'enseignant
  const allSeancesClasse = useMemo(() => {
    if (!selectedClasseId) return [];
    return storage.getSeancesByClasse(selectedClasseId, anneeLibelle);
  }, [selectedClasseId, anneeLibelle]);

  const availableSeances = useMemo(() => {
    if (restrictToTeacher && !canAdmin) {
      return allSeancesClasse.filter((s) => s.enseignant_id === currentUser?.id);
    }
    return allSeancesClasse;
  }, [allSeancesClasse, restrictToTeacher, canAdmin, currentUser?.id]);

  const [selectedSeanceId, setSelectedSeanceId] = useState<string>('');

  // Synchroniser la séance sélectionnée lorsque la classe change
  useEffect(() => {
    if (availableSeances.length > 0) {
      setSelectedSeanceId(availableSeances[0].id);
    } else {
      setSelectedSeanceId('');
    }
  }, [availableSeances]);

  const activeSeance: SeanceCours | undefined = useMemo(() => {
    return availableSeances.find((s) => s.id === selectedSeanceId) || availableSeances[0];
  }, [availableSeances, selectedSeanceId]);

  // 3. Élèves de la classe
  const eleves: Eleve[] = useMemo(() => {
    if (!selectedClasseId) return [];
    return storage.getElevesByClasse(selectedClasseId, anneeLibelle);
  }, [selectedClasseId, anneeLibelle]);

  // 4. État du pointage de la séance
  interface EleveAppelState {
    statut: StatutPresence;
    motif: string;
    heure_retard: string;
    justifie: boolean;
  }
  const [itemsState, setItemsState] = useState<Record<string, EleveAppelState>>({});
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingRecords, setExistingRecords] = useState<EnregistrementPresence[]>([]);

  // Charger les présences existantes pour cette séance et cette date
  const loadExistingPresences = () => {
    if (!activeSeance || !selectedDate) {
      setExistingRecords([]);
      return;
    }
    const recs = storage.getPresenceSeance(activeSeance.id, selectedDate);
    setExistingRecords(recs);

    const recMap = new Map(recs.map((r) => [r.eleve_id, r]));
    const newItems: Record<string, EleveAppelState> = {};

    eleves.forEach((el) => {
      const rec = recMap.get(el.id);
      if (rec) {
        newItems[el.id] = {
          statut: rec.statut,
          motif: rec.motif || '',
          heure_retard: rec.heure_retard || (rec.statut === 'RETARD' ? activeSeance.heure_debut : ''),
          justifie: rec.justifie ?? false,
        };
      } else {
        newItems[el.id] = {
          statut: 'PRESENT',
          motif: '',
          heure_retard: '',
          justifie: false,
        };
      }
    });
    setItemsState(newItems);
  };

  useEffect(() => {
    loadExistingPresences();
  }, [activeSeance?.id, selectedDate, eleves.length]);

  // Actions rapides
  const handleMarkAllPresent = () => {
    const updated: Record<string, EleveAppelState> = {};
    eleves.forEach((el) => {
      updated[el.id] = {
        statut: 'PRESENT',
        motif: '',
        heure_retard: '',
        justifie: false,
      };
    });
    setItemsState(updated);
  };

  const handleUpdateStudent = (eleveId: string, updates: Partial<EleveAppelState>) => {
    setItemsState((prev) => {
      const current = prev[eleveId] || { statut: 'PRESENT', motif: '', heure_retard: '', justifie: false };
      return {
        ...prev,
        [eleveId]: { ...current, ...updates },
      };
    });
  };

  // Validation de l'appel
  const handleValiderAppel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (isArchive) {
      setStatusMsg({ type: 'error', text: 'Impossible d’enregistrer un appel sur une année scolaire archivée.' });
      return;
    }

    if (!activeSeance) {
      setStatusMsg({ type: 'error', text: 'Veuillez sélectionner un cours ou une séance valide.' });
      return;
    }

    // Contrôle d'autorisation strict (Exigence 9)
    const isOwner = activeSeance.enseignant_id === currentUser.id;
    const canRecord = isOwner || isSurveillant || isCenseur || isDirecteur || isConcepteur;
    if (!canRecord) {
      setStatusMsg({
        type: 'error',
        text: 'Action non autorisée : Vous ne pouvez faire l’appel que pour vos propres cours attribués.',
      });
      return;
    }

    try {
      const itemsToSave = eleves.map((el) => {
        const row = itemsState[el.id] || { statut: 'PRESENT', motif: '', heure_retard: '', justifie: false };
        return {
          eleve_id: el.id,
          statut: row.statut,
          motif: row.motif.trim() || undefined,
          heure_retard: row.statut === 'RETARD' ? (row.heure_retard || activeSeance.heure_debut) : undefined,
          justifie: row.justifie,
        };
      });

      const saved = storage.savePresenceSeance(activeSeance, selectedDate, itemsToSave, currentUser);
      loadExistingPresences();

      const mat = storage.getMatiereById(activeSeance.matiere_id);
      const cls = storage.getClasseById(activeSeance.classe_id);
      setStatusMsg({
        type: 'success',
        text: `✓ L’appel a été validé avec succès pour le cours de ${mat?.nom || 'la matière'} en ${cls?.nom} (${activeSeance.heure_debut}–${activeSeance.heure_fin}). ${saved.length} apprenant(s) pointé(s).`,
      });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la validation de l’appel.' });
    }
  };

  const isAlreadyValidated = existingRecords.length > 0;
  const allItemsList = Object.values(itemsState) as EleveAppelState[];
  const presentsCount = allItemsList.filter((i) => i.statut === 'PRESENT').length;
  const absentsCount = allItemsList.filter((i) => i.statut === 'ABSENT').length;
  const retardsCount = allItemsList.filter((i) => i.statut === 'RETARD').length;

  return (
    <div className="space-y-5">
      {/* Bannière de notification */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2.5 shadow-xs ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-red-50 text-red-900 border border-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Barre de sélection et filtres de séance */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-700" />
              <span>Feuille d’Appel & Présences par Séance de Cours</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pointage nominatif des apprenants lié à l'horaire, la matière et l'enseignant
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-bold">
              Session {anneeLibelle}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 1. Sélection de la classe */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Classe concernée <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClasseId}
              onChange={(e) => setSelectedClasseId(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.nom} ({cls.niveau} - {cls.serie})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Sélection de la date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Date de la séance <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 3. Séance / Cours */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cours / Créneau horaire <span className="text-red-500">*</span>
            </label>
            {availableSeances.length > 0 ? (
              <select
                value={selectedSeanceId}
                onChange={(e) => setSelectedSeanceId(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                {availableSeances.map((s) => {
                  const m = storage.getMatiereById(s.matiere_id);
                  return (
                    <option key={s.id} value={s.id}>
                      {m?.nom || 'Cours'} ({s.heure_debut}–{s.heure_fin}) • {s.enseignant_nom || 'Enseignant'}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Aucun cours régulier configuré pour cette sélection.
              </div>
            )}
          </div>
        </div>

        {/* Détails du cours sélectionné & État de validation */}
        {activeSeance && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
            <div className="flex items-center space-x-3">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <BookOpen className="w-4 h-4" />
              </span>
              <div>
                <span className="font-extrabold text-slate-900">
                  {storage.getMatiereById(activeSeance.matiere_id)?.nom || 'Matière'}
                </span>
                <span className="text-slate-500 ml-2">
                  Créneau : <strong className="text-slate-800">{activeSeance.heure_debut} – {activeSeance.heure_fin}</strong>
                </span>
                <span className="text-slate-500 ml-2 font-medium">
                  • Enseignant : <strong className="text-slate-800">{activeSeance.enseignant_nom || '—'}</strong>
                </span>
              </div>
            </div>

            {/* État de validation clair (Exigence 8 & 9) */}
            <div>
              {isAlreadyValidated ? (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs">
                  <CheckCheck className="w-4 h-4 text-emerald-700" />
                  <span>Appel VALIDÉ pour ce cours ({existingRecords[0]?.enregistre_par_nom || 'Validé'})</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>En attente de validation</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Résumé du pointage en temps réel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Apprenants inscrits</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">{eleves.length}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Présents pointés</span>
          <div className="text-xl font-black text-emerald-800 mt-0.5">{presentsCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-red-200 shadow-xs">
          <span className="text-[10px] font-bold text-red-700 uppercase">Absents</span>
          <div className="text-xl font-black text-red-700 mt-0.5">{absentsCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase">En retard</span>
          <div className="text-xl font-black text-amber-700 mt-0.5">{retardsCount}</div>
        </div>
      </div>

      {/* Feuille de présence & Appel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="text-xs font-bold text-slate-700">
            Liste d'appel des apprenants ({eleves.length})
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tout pointer Présent</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <th className="px-3 py-2.5 text-left w-12">N°</th>
                <th className="px-3 py-2.5 text-left w-24">Matricule</th>
                <th className="px-3 py-2.5 text-left min-w-[160px]">Nom & Prénoms</th>
                <th className="px-3 py-2.5 text-center min-w-[280px]">Statut de Présence</th>
                <th className="px-3 py-2.5 text-left min-w-[180px]">Observation / Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eleves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Aucun apprenant inscrit dans cette classe pour {anneeLibelle}.
                  </td>
                </tr>
              ) : (
                eleves.map((el, index) => {
                  const state = itemsState[el.id] || { statut: 'PRESENT', motif: '', heure_retard: '', justifie: false };
                  const isPresent = state.statut === 'PRESENT';
                  const isAbsent = state.statut === 'ABSENT';
                  const isRetard = state.statut === 'RETARD';

                  return (
                    <tr
                      key={el.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isAbsent ? 'bg-red-50/40' : isRetard ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-slate-400 font-semibold">{index + 1}</td>
                      <td className="px-3 py-2 font-mono text-slate-600 font-bold">{el.matricule}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">
                        {el.nom} {el.prenom}
                        <span className="text-[10px] text-slate-400 ml-1.5 font-normal font-mono">
                          ({el.sexe === 'F' ? 'Fille' : 'Garçon'})
                        </span>
                      </td>

                      {/* Boutons de statut de présence */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateStudent(el.id, { statut: 'PRESENT' })}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                              isPresent
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Présent
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStudent(el.id, { statut: 'ABSENT' })}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                              isAbsent
                                ? 'bg-rose-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Absent
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStudent(el.id, { 
                              statut: 'RETARD', 
                              heure_retard: state.heure_retard || activeSeance?.heure_debut || '08:00' 
                            })}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                              isRetard
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Retard
                          </button>
                        </div>

                        {/* Champ supplémentaire si retard */}
                        {isRetard && (
                          <div className="mt-1.5 flex items-center justify-center space-x-2 text-[11px]">
                            <span className="text-slate-500 font-semibold">Arrivée :</span>
                            <input
                              type="time"
                              value={state.heure_retard}
                              onChange={(e) => handleUpdateStudent(el.id, { heure_retard: e.target.value })}
                              className="border border-amber-300 rounded px-1.5 py-0.5 font-mono text-xs bg-amber-50"
                            />
                          </div>
                        )}
                      </td>

                      {/* Observation & Justification */}
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={state.motif}
                            onChange={(e) => handleUpdateStudent(el.id, { motif: e.target.value })}
                            placeholder={
                              isAbsent ? 'Motif d’absence...' : isRetard ? 'Motif de retard...' : 'Observation...'
                            }
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                          {(isAbsent || isRetard) && (
                            <label className="flex items-center space-x-1.5 text-[11px] text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={state.justifie}
                                onChange={(e) => handleUpdateStudent(el.id, { justifie: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>Justifié avec certificat / mot des parents</span>
                            </label>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pied de page avec bouton de validation officiel */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500">
            {isAlreadyValidated ? (
              <span className="text-emerald-800 font-bold">
                ✓ Cet appel a déjà été validé. Toute modification mettra à jour l’historique officiel.
              </span>
            ) : (
              <span>Veuillez vérifier les présences avant de valider définitivement la feuille.</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleValiderAppel}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isAlreadyValidated ? 'Mettre à jour l’appel' : 'Valider l’appel de cours'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
