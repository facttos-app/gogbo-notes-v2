import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { 
  getAppreciation, 
  getAppreciationColor, 
  calculerSyntheseMatiere,
  calculerClassementClasse
} from '../../lib/appreciation';
import { Eleve, Note, TypeEvaluation, Classe, Matiere, AffectationPedagogique } from '../../types';
import { 
  BookOpen, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  Award, 
  Lock, 
  FileText, 
  Calculator, 
  RefreshCw, 
  CheckCheck, 
  Calendar,
  Globe,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  ClipboardCheck
} from 'lucide-react';
import { ModalEnregistrerPunition } from '../discipline/ModalEnregistrerPunition';
import { AppelCoursSeance } from '../discipline/AppelCoursSeance';

interface EspacePedagogiqueProps {
  onOpenBulletin?: (eleveId: string, classeId: string, periodeId: string) => void;
}

type EvalInputKey = 'INTERROGATION_1' | 'INTERROGATION_2' | 'INTERROGATION_3' | 'DEVOIR_1' | 'DEVOIR_2';

export const EspacePedagogique: React.FC<EspacePedagogiqueProps> = ({ onOpenBulletin }) => {
  const { currentUser, isCenseur, isConcepteur } = useAuth();
  const { selectedAnnee, isArchive } = useAnnee();

  const allClasses = useMemo(() => storage.getClasses(), []);
  const allMatieresList = useMemo(() => storage.getMatieres(), []);
  const periodes = useMemo(
    () => storage.getPeriodesByAnnee(selectedAnnee?.libelle),
    [selectedAnnee?.libelle]
  );
  const activePeriode = periodes.find((p) => p.is_active) || periodes[0] || storage.getActivePeriode();

  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>(activePeriode?.id || '');

  // Synchroniser la période sélectionnée lors du changement d'année ou de périodes
  useEffect(() => {
    if (periodes.length > 0 && !periodes.some((p) => p.id === selectedPeriodeId)) {
      const active = periodes.find((p) => p.is_active) || periodes[0];
      if (active) setSelectedPeriodeId(active.id);
    }
  }, [periodes, selectedPeriodeId]);

  // Attributions de cet enseignant pour l'année visualisée
  const myAffectations = useMemo(
    () => storage.getAffectationsByProfile(currentUser?.id || '', selectedAnnee.libelle),
    [currentUser?.id, selectedAnnee.libelle]
  );

  // Toutes les attributions de l'année scolaire visualisée
  const allYearAffectations = useMemo(
    () => storage.getAffectations(selectedAnnee.libelle),
    [selectedAnnee.libelle]
  );

  // Mode de travail : 'MES_ATTRIBUTIONS' (si l'enseignant a des classes) ou 'VISION_GLOBALE' (toutes les 28 classes)
  const [viewMode, setViewMode] = useState<'MES_ATTRIBUTIONS' | 'VISION_GLOBALE'>(
    myAffectations.length > 0 ? 'MES_ATTRIBUTIONS' : 'VISION_GLOBALE'
  );

  // Attribution sélectionnée dans "Mes classes"
  const [selectedAffId, setSelectedAffId] = useState<string>(
    myAffectations.length > 0 ? myAffectations[0].id : ''
  );

  // Pour la vision globale : sélection libre parmi les 28 classes et matières
  const [globalClasseId, setGlobalClasseId] = useState<string>(allClasses[0]?.id || '');
  const [globalMatiereId, setGlobalMatiereId] = useState<string>(allMatieresList[0]?.id || '');

  const [activeTab, setActiveTab] = useState<'saisie' | 'appel' | 'resultats'>('saisie');

  // État de saisie des notes en cours (clé : `${eleveId}_${type}` -> valeur string)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isEditingCoef, setIsEditingCoef] = useState(false);
  const [isPunitionModalOpen, setIsPunitionModalOpen] = useState(false);
  const [newCoefValue, setNewCoefValue] = useState<number>(2);

  // Synchronisation de la sélection par défaut en mode "Mes attributions"
  useEffect(() => {
    if (myAffectations.length > 0) {
      if (!myAffectations.some((a) => a.id === selectedAffId)) {
        setSelectedAffId(myAffectations[0].id);
      }
    } else {
      setSelectedAffId('');
      setViewMode('VISION_GLOBALE');
    }
  }, [myAffectations, selectedAffId]);

  // Détermination de l'attribution, classe et matière actives selon le mode
  const currentAff: AffectationPedagogique | undefined = useMemo(() => {
    if (viewMode === 'MES_ATTRIBUTIONS') {
      return myAffectations.find((a) => a.id === selectedAffId) || myAffectations[0];
    }
    // Mode Vision Globale : chercher l'attribution officielle de la classe et matière
    return (
      allYearAffectations.find(
        (a) => a.classe_id === globalClasseId && a.matiere_id === globalMatiereId && a.statut === 'ACTIF'
      ) ||
      allYearAffectations.find(
        (a) => a.classe_id === globalClasseId && a.matiere_id === globalMatiereId
      )
    );
  }, [viewMode, myAffectations, selectedAffId, allYearAffectations, globalClasseId, globalMatiereId]);

  const classe: Classe | undefined = useMemo(() => {
    if (viewMode === 'MES_ATTRIBUTIONS') {
      return currentAff ? storage.getClasseById(currentAff.classe_id) : undefined;
    }
    return storage.getClasseById(globalClasseId) || allClasses[0];
  }, [viewMode, currentAff, globalClasseId, allClasses]);

  const matiere: Matiere | undefined = useMemo(() => {
    if (viewMode === 'MES_ATTRIBUTIONS') {
      return currentAff ? storage.getMatiereById(currentAff.matiere_id) : undefined;
    }
    return storage.getMatiereById(globalMatiereId) || allMatieresList[0];
  }, [viewMode, currentAff, globalMatiereId, allMatieresList]);

  const periode = periodes.find((p) => p.id === selectedPeriodeId) || periodes[0] || activePeriode;

  // Enseignant titulaire de l'attribution visualisée
  const assignedTeacher = useMemo(() => {
    if (!currentAff) return undefined;
    return storage.getProfileById(currentAff.profile_id);
  }, [currentAff]);

  // Détermination stricte des droits d'édition des notes :
  // Seul l'enseignant titulaire ou le Censeur/Concepteur peut saisir/modifier les notes
  // En mode consultation d'une classe non attribuée, c'est en LECTURE SEULE
  const isAssignedTeacher = currentAff && currentAff.profile_id === currentUser?.id;
  const isManager = isCenseur || isConcepteur || currentUser?.role === 'CENSEUR' || currentUser?.role === 'CONCEPTEUR';
  const canEdit = !isArchive && !periode?.is_locked && (isAssignedTeacher || isManager);

  // Professeur Principal de la classe pour l'utilisateur connecté
  const ppClasse = currentUser ? storage.getClasseProfesseurPrincipal(currentUser.id, selectedAnnee.libelle) : undefined;

  // Noms des matières enseignées par cet enseignant
  const teacherDisciplines = Array.from(
    new Set(
      myAffectations
        .map((a) => storage.getMatiereById(a.matiere_id)?.nom)
        .filter(Boolean)
    )
  ).join(' • ');

  // Coefficient propre à la classe affichée (et non le coefficient général de la matière)
  const [coefRefresh, setCoefRefresh] = useState(0);
  const coefClasse: number = useMemo(() => {
    if (!matiere) return 1;
    return classe ? storage.getCoefficientMatiere(matiere.id, classe.id, selectedAnnee.libelle) : matiere.coefficient;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matiere, classe, selectedAnnee.libelle, coefRefresh]);

  useEffect(() => {
    setNewCoefValue(coefClasse);
  }, [coefClasse]);

  const handleSaveTeacherCoef = async () => {
    if (!currentUser || !matiere || !classe || (!isAssignedTeacher && !isManager)) return;
    if (isArchive) {
      setStatusMessage({ type: 'error', text: 'Action refusée en consultation d’archive historique.' });
      return;
    }
    if (isNaN(newCoefValue) || newCoefValue < 1 || newCoefValue > 10) {
      setStatusMessage({ type: 'error', text: 'Le coefficient doit être compris entre 1 et 10.' });
      return;
    }
    try {
      storage.setCoefficientClasse(classe.id, matiere.id, Number(newCoefValue), selectedAnnee.libelle, currentUser);
      setCoefRefresh((n: number) => n + 1);
      setIsEditingCoef(false);
      triggerRecalculationVisual();
      setStatusMessage({
        type: 'success',
        text: `✓ Coefficient de « ${matiere.nom} » en ${classe.nom} mis à jour (${newCoefValue}). Les autres classes ne sont pas modifiées.`,
      });
    } catch (e: unknown) {
      setStatusMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Erreur lors de la modification du coefficient.',
      });
    }
  };

  // Élèves inscrits dans cette classe pour l'année scolaire visualisée
  const eleves: Eleve[] = classe ? storage.getElevesByClasse(classe.id, selectedAnnee.libelle) : [];

  // Notes existantes pour cette attribution et cette période
  const existingNotes: Note[] = useMemo(() => {
    if (!classe || !matiere || !selectedPeriodeId) return [];
    if (currentAff) {
      return storage.getNotesByAffectationAndPeriode(currentAff.id, selectedPeriodeId);
    }
    // Trouver toutes les attributions correspondantes
    const matchingAffIds = new Set(
      allYearAffectations
        .filter((a) => a.classe_id === classe.id && a.matiere_id === matiere.id)
        .map((a) => a.id)
    );
    return storage.getNotes().filter((n) => matchingAffIds.has(n.affectation_id) && n.periode_id === selectedPeriodeId);
  }, [classe?.id, matiere?.id, selectedPeriodeId, currentAff, allYearAffectations]);

  // Récupérer la valeur actuelle d'un champ d'évaluation (I1, I2, I3, D1, D2)
  const getInputValue = (eleveId: string, type: EvalInputKey): string => {
    const key = `${eleveId}_${type}`;
    if (noteInputs[key] !== undefined) {
      return noteInputs[key];
    }
    const note = existingNotes.find((n) => {
      if (n.eleve_id !== eleveId) return false;
      if (n.type_evaluation === type) return true;
      if (type === 'INTERROGATION_1' && n.type_evaluation === 'INTERROGATION') return true;
      return false;
    });
    return note !== undefined ? String(note.valeur) : '';
  };

  // Note déjà enregistrée pour cet élève et ce type d'évaluation (lecture à jour)
  const noteEnregistree = (eleveId: string, type: EvalInputKey): boolean => {
    if (!currentAff) return false;
    return storage.getNotesByAffectationAndPeriode(currentAff.id, selectedPeriodeId).some(
      (n) =>
        n.eleve_id === eleveId &&
        (n.type_evaluation === type || (type === 'INTERROGATION_1' && n.type_evaluation === 'INTERROGATION'))
    );
  };

  const handleInputChange = (eleveId: string, type: EvalInputKey, val: string) => {
    if (!canEdit) return;
    const cleaned = val.replace(',', '.');
    const key = `${eleveId}_${type}`;
    setNoteInputs((prev) => ({ ...prev, [key]: cleaned }));
  };

  const triggerRecalculationVisual = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setIsRecalculating(false);
    }, 250);
  };

  // Enregistrer toutes les notes pour un élève
  const handleSaveStudentRow = (eleve: Eleve) => {
    if (!currentUser || !currentAff || !matiere || !canEdit) return;
    setStatusMessage(null);

    const evalTypes: EvalInputKey[] = [
      'INTERROGATION_1',
      'INTERROGATION_2',
      'INTERROGATION_3',
      'DEVOIR_1',
      'DEVOIR_2',
    ];

    // Cases vidées alors qu'une note existait : la note est effacée (jamais enregistrée comme 0)
    const aEffacer = evalTypes.filter((type) => getInputValue(eleve.id, type).trim() === '' && noteEnregistree(eleve.id, type));
    if (
      aEffacer.length > 0 &&
      !window.confirm(
        `Effacer ${aEffacer.length} note(s) de ${eleve.nom} ${eleve.prenom} ? Une note effacée n'est pas comptée comme 0.`
      )
    ) {
      return;
    }

    let savedCount = 0;
    let deletedCount = 0;
    const errors: string[] = [];

    aEffacer.forEach((type) => {
      try {
        if (
          storage.deleteNote(
            { eleve_id: eleve.id, affectation_id: currentAff.id, periode_id: selectedPeriodeId, type_evaluation: type as TypeEvaluation },
            currentUser
          )
        ) {
          deletedCount++;
        }
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : 'Erreur');
      }
    });

    evalTypes.forEach((type) => {
      const rawVal = getInputValue(eleve.id, type);
      if (rawVal !== undefined && rawVal.trim() !== '') {
        const num = parseFloat(rawVal);
        if (isNaN(num) || num < 0 || num > 20) {
          errors.push(`${type} invalide (${rawVal})`);
        } else {
          try {
            storage.saveNote(
              {
                eleve_id: eleve.id,
                affectation_id: currentAff.id,
                periode_id: selectedPeriodeId,
                valeur: num,
                type_evaluation: type as TypeEvaluation,
              },
              currentUser
            );
            savedCount++;
          } catch (e: unknown) {
            errors.push(e instanceof Error ? e.message : 'Erreur');
          }
        }
      }
    });

    if (errors.length > 0) {
      setStatusMessage({ type: 'error', text: `Erreurs pour ${eleve.nom}: ${errors.join(', ')}` });
    } else if (savedCount > 0 || deletedCount > 0) {
      triggerRecalculationVisual();
      setLastSavedTime(new Date().toLocaleTimeString('fr-FR'));
      setStatusMessage({
        type: 'success',
        text: `✓ Notes enregistrées avec succès pour ${eleve.nom} ${eleve.prenom} (${savedCount} enregistrée(s), ${deletedCount} effacée(s) : une note effacée n'est jamais comptée comme 0). Moyenne et rang actualisés.`,
      });
    } else {
      setStatusMessage({ type: 'error', text: `Aucune note saisie pour ${eleve.nom} ${eleve.prenom}.` });
    }
  };

  // Enregistrer toutes les notes saisies pour toute la classe
  const handleSaveAllNotes = () => {
    if (!currentUser || !currentAff || !canEdit) return;
    setStatusMessage(null);

    const evalTypes: EvalInputKey[] = [
      'INTERROGATION_1',
      'INTERROGATION_2',
      'INTERROGATION_3',
      'DEVOIR_1',
      'DEVOIR_2',
    ];

    // Cases vidées alors qu'une note existait : la note est effacée (jamais enregistrée comme 0)
    const aEffacer: Array<{ eleveId: string; type: EvalInputKey }> = [];
    eleves.forEach((el) =>
      evalTypes.forEach((type) => {
        if (getInputValue(el.id, type).trim() === '' && noteEnregistree(el.id, type)) aEffacer.push({ eleveId: el.id, type });
      })
    );
    if (
      aEffacer.length > 0 &&
      !window.confirm(`Effacer ${aEffacer.length} note(s) dans cette classe ? Une note effacée n'est pas comptée comme 0.`)
    ) {
      return;
    }

    let totalSaved = 0;
    let totalDeleted = 0;
    const errors: string[] = [];

    aEffacer.forEach(({ eleveId, type }) => {
      try {
        if (
          storage.deleteNote(
            { eleve_id: eleveId, affectation_id: currentAff.id, periode_id: selectedPeriodeId, type_evaluation: type as TypeEvaluation },
            currentUser
          )
        ) {
          totalDeleted++;
        }
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : 'Erreur');
      }
    });

    eleves.forEach((el) => {
      evalTypes.forEach((type) => {
        const rawVal = getInputValue(el.id, type);
        if (rawVal !== undefined && rawVal.trim() !== '') {
          const num = parseFloat(rawVal);
          if (isNaN(num) || num < 0 || num > 20) {
            errors.push(`${el.nom} (${type}: ${rawVal})`);
          } else {
            try {
              storage.saveNote(
                {
                  eleve_id: el.id,
                  affectation_id: currentAff.id,
                  periode_id: selectedPeriodeId,
                  valeur: num,
                  type_evaluation: type as TypeEvaluation,
                },
                currentUser
              );
              totalSaved++;
            } catch (e: unknown) {
              errors.push(e instanceof Error ? e.message : 'Erreur');
            }
          }
        }
      });
    });

    if (errors.length > 0) {
      setStatusMessage({
        type: 'error',
        text: `Certaines notes n'ont pas pu être enregistrées : ${errors.slice(0, 3).join(' • ')}${errors.length > 3 ? ` (+${errors.length - 3} autres)` : ''}`,
      });
    } else if (totalSaved > 0 || totalDeleted > 0) {
      triggerRecalculationVisual();
      setLastSavedTime(new Date().toLocaleTimeString('fr-FR'));
      setStatusMessage({
        type: 'success',
        text: `✓ Succès total : ${totalDeleted > 0 ? `${totalDeleted} note(s) effacée(s) (jamais comptées comme 0), ` : ''}${totalSaved} note(s) enregistrée(s) dans la base de données. Moyennes de classe, classements et bulletins mis à jour.`,
      });
    } else {
      setStatusMessage({ type: 'error', text: 'Aucune nouvelle note à enregistrer dans la classe.' });
    }
  };

  // Calcul du classement et bulletins complets pour les résultats de la classe
  const allMatieres = storage.getMatieres();
  const allNotes = storage.getNotes();
  const allAffectations = storage.getAffectations(selectedAnnee.libelle);

  const { classement, bulletinsMap } = classe
    ? calculerClassementClasse(classe, eleves, periode, allMatieres, allNotes, allAffectations)
    : { classement: [], bulletinsMap: {} };

  return (
    <div className="space-y-6">
      {/* Bandeau d'en-tête Espace Pédagogique */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-xl p-4 sm:p-6 shadow-md border border-emerald-700/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/40">
                Espace Pédagogique — Consultation & Saisie Scolaire
              </span>
              {ppClasse && (
                <span className="bg-indigo-500/30 text-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-bold border border-indigo-400/40 flex items-center space-x-1">
                  <span>⭐ Professeur Principal ({ppClasse.nom})</span>
                </span>
              )}
              <span className="text-slate-300 text-xs">• Année {selectedAnnee.libelle}</span>
              {isArchive && (
                <span className="bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Lecture seule (Archives)
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1 text-white flex flex-wrap items-center gap-2">
              <span>{currentUser?.prenom} {currentUser?.nom}</span>
              {teacherDisciplines && (
                <span className="text-amber-400 font-bold text-base sm:text-lg">
                  — {teacherDisciplines}
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/90 mt-0.5">
              Vision globale de l'ensemble des 28 classes et saisie pour vos attributions officielles • CEG GOGBO
            </p>
          </div>

          {/* Sélecteur de période */}
          <div className="flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-lg border border-slate-700 text-xs">
            <span className="text-slate-400 pl-2">Période :</span>
            <select
              aria-label="Sélectionner la période scolaire"
              value={selectedPeriodeId}
              onChange={(e) => setSelectedPeriodeId(e.target.value)}
              className="bg-slate-800 text-white font-medium rounded px-2.5 py-1.5 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              {periodes.filter(Boolean).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom || p.code} {p?.is_locked ? '(Verrouillé)' : '(Ouvert)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bascule de mode : Mes attributions VS Vision Globale (28 Classes) */}
        <div className="mt-5 pt-4 border-t border-emerald-700/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 bg-emerald-950/60 p-1 rounded-xl border border-emerald-700/50">
            {myAffectations.length > 0 && (
              <button
                id="btn-mode-mes-attributions"
                onClick={() => {
                  setViewMode('MES_ATTRIBUTIONS');
                  setNoteInputs({});
                  setStatusMessage(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'MES_ATTRIBUTIONS'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Mes classes attribuées ({myAffectations.length})</span>
              </button>
            )}

            <button
              id="btn-mode-vision-globale"
              onClick={() => {
                setViewMode('VISION_GLOBALE');
                setNoteInputs({});
                setStatusMessage(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'VISION_GLOBALE'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Vision Globale (Toutes les 28 Classes)</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPunitionModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 bg-rose-700 hover:bg-rose-600 text-white shadow-xs"
              title="Consigner une punition pour n'importe quel élève du collège"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-200" />
              <span>+ Punir un apprenant (28 Classes)</span>
            </button>

            <div className="text-[11px] text-emerald-200/80 font-medium hidden sm:block">
              {viewMode === 'MES_ATTRIBUTIONS' ? (
                <span>Saisie & modification directe de vos notes de cours</span>
              ) : (
                <span>Consultation libre de toutes les classes (6ème à Terminale)</span>
              )}
            </div>
          </div>
        </div>

        {/* Boutons de sélection rapide selon le mode */}
        {viewMode === 'MES_ATTRIBUTIONS' ? (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2.5">
              {myAffectations.map((aff) => {
                const cls = storage.getClasseById(aff.classe_id);
                const mat = storage.getMatiereById(aff.matiere_id);
                const isSelected = aff.id === selectedAffId;
                return (
                  <button
                    key={aff.id}
                    id={`btn-select-aff-${aff.id}`}
                    onClick={() => {
                      setSelectedAffId(aff.id);
                      setNoteInputs({});
                      setStatusMessage(null);
                    }}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-white/60 scale-[1.02]'
                        : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-700/60 shadow-xs'
                    }`}
                  >
                    <span className="text-sm font-black">{cls?.nom}</span>
                    <span className="opacity-60">—</span>
                    <span className="font-semibold">{mat?.nom}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      isSelected ? 'bg-slate-950 text-amber-300' : 'bg-emerald-800 text-emerald-200'
                    }`}>
                      {aff.heures_hebdo}h
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Sélecteur libre de la classe et matière pour la Vision Globale */
          <div className="mt-3 p-3 bg-emerald-950/80 rounded-xl border border-emerald-700/60 flex flex-wrap items-center gap-3">
            {/* Sélecteur de Classe parmi les 28 */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-amber-300 font-bold flex items-center space-x-1">
                <Users className="w-3.5 h-3.5" />
                <span>Classe (28) :</span>
              </span>
              <select
                id="select-vision-globale-classe"
                aria-label="Sélectionner la classe pour la vision globale"
                value={globalClasseId}
                onChange={(e) => {
                  setGlobalClasseId(e.target.value);
                  setNoteInputs({});
                  setStatusMessage(null);
                }}
                className="bg-slate-900 text-white font-bold rounded-lg px-3 py-1.5 border border-emerald-600 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer text-xs"
              >
                {allClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({storage.getElevesByClasse(c.id, selectedAnnee.libelle).length} élèves)
                  </option>
                ))}
              </select>
            </div>

            {/* Sélecteur de Discipline */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-amber-300 font-bold flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Discipline :</span>
              </span>
              <select
                id="select-vision-globale-matiere"
                aria-label="Sélectionner la matière pour la vision globale"
                value={globalMatiereId}
                onChange={(e) => {
                  setGlobalMatiereId(e.target.value);
                  setNoteInputs({});
                  setStatusMessage(null);
                }}
                className="bg-slate-900 text-white font-bold rounded-lg px-3 py-1.5 border border-emerald-600 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer text-xs"
              >
                {allMatieresList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom} (Coef. {m.coefficient})
                  </option>
                ))}
              </select>
            </div>

            {/* Indicateur d'attribution pour cette classe/matière */}
            <div className="ml-auto text-xs flex items-center space-x-2">
              <span className="text-emerald-200">
                Titulaire :{' '}
                <strong className="text-white">
                  {assignedTeacher ? `${assignedTeacher.nom} ${assignedTeacher.prenom}` : 'Non attribué'}
                </strong>
              </span>
              {canEdit ? (
                <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  ✓ Saisie autorisée
                </span>
              ) : (
                <span className="bg-indigo-900 text-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-700 flex items-center space-x-1">
                  <Eye className="w-3 h-3 text-indigo-300" />
                  <span>Consultation seule</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Message informatif si l'utilisateur n'a pas encore de classes assignées */}
      {myAffectations.length === 0 && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2.5 shadow-2xs">
          <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Mode Consultation Globale Activé :</strong> Votre compte n'a pas encore de classe assignée pour la saisie de notes par le Censeur, mais vous bénéficiez d'une visibilité intégrale sur les <strong>28 classes</strong>, les élèves, les résultats et les bulletins de l'établissement ci-dessous.
          </div>
        </div>
      )}

      {/* Détail de la classe et matière active */}
      {classe && matiere && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Header de la vue classe */}
          <div className="px-4 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                {classe.nom.split(' ')[0]}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                    {classe.nom} — {matiere.nom}
                  </h3>
                  {!canEdit && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">
                      Lecture seule
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{eleves.length} apprenants</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center space-x-1.5">
                    <span>Coefficient en {classe?.nom} : <strong className={coefClasse > 0 ? 'text-slate-900' : 'text-amber-700'}>{coefClasse > 0 ? coefClasse : 'non défini'}</strong></span>
                    {canEdit && !isArchive && (
                      <button
                        onClick={() => setIsEditingCoef(!isEditingCoef)}
                        className="text-[10px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                        title="Modifier le coefficient de cette matière pour cette classe uniquement"
                      >
                        {isEditingCoef ? 'Fermer' : coefClasse > 0 ? '✎ Modifier Coef' : '✎ Définir le coefficient'}
                      </button>
                    )}
                  </span>
                  <span>•</span>
                  <span className="text-blue-700 font-medium">
                    Moy. Int. = (I1 + I2 + I3) ÷ 3
                  </span>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium">
                    Moy. Matière = (Moy. Int. + D1 + D2) ÷ 3
                  </span>
                </div>

                {isEditingCoef && canEdit && (
                  <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-indigo-900">Nouveau coefficient pour {matiere.nom} en {classe?.nom} uniquement :</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newCoefValue > 0 ? newCoefValue : ''}
                      placeholder="ex. 2"
                      onChange={(e) => setNewCoefValue(Number(e.target.value))}
                      className="w-16 bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-slate-900 text-center"
                    />
                    <button
                      onClick={handleSaveTeacherCoef}
                      className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-2.5 py-1 rounded text-xs cursor-pointer shadow-xs"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setIsEditingCoef(false)}
                      className="text-slate-600 hover:text-slate-800 text-xs px-2 py-1"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Saisie vs Appel vs Résultats */}
            <div className="flex bg-slate-200/80 p-1 rounded-lg text-xs font-medium w-full sm:w-auto">
              <button
                id="btn-tab-saisie-notes"
                onClick={() => setActiveTab('saisie')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'saisie'
                    ? 'bg-white text-emerald-800 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {canEdit ? 'Saisie des Notes (I1, I2, I3, D1, D2)' : 'Évaluations de la matière (Notes)'}
              </button>
              <button
                id="btn-tab-appel-cours"
                onClick={() => setActiveTab('appel')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  activeTab === 'appel'
                    ? 'bg-white text-emerald-800 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Faire l'appel de cours</span>
              </button>
              <button
                id="btn-tab-consultation-resultats"
                onClick={() => setActiveTab('resultats')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'resultats'
                    ? 'bg-white text-emerald-800 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Synthèse & Classement
              </button>
            </div>
          </div>

          {/* Indicateur de recalcul en temps réel */}
          {isRecalculating && (
            <div className="bg-amber-50 text-amber-800 border-b border-amber-200 px-4 py-1.5 text-xs flex items-center justify-center space-x-2 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span className="font-semibold">Actualisation instantanée des moyennes, classements et bulletins...</span>
            </div>
          )}

          {/* Message de statut */}
          {statusMessage && (
            <div
              className={`mx-4 sm:mx-6 mt-4 p-3 rounded-lg text-xs flex items-center justify-between space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-medium">{statusMessage.text}</span>
              </div>
              {lastSavedTime && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Enregistré à {lastSavedTime}
                </span>
              )}
            </div>
          )}

          {/* Contenu selon l'onglet actif */}
          {activeTab === 'saisie' ? (
            <div className="p-4 sm:p-6 space-y-4">
              {canEdit && (
                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  Pour <strong>effacer</strong> une note : videz sa case puis enregistrez. Une note effacée n’est{' '}
                  <strong>jamais comptée comme 0</strong> ; pour donner la note 0, tapez 0.
                </div>
              )}
              {/* Alerte si la période est verrouillée */}
              {periode?.is_locked && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    La saisie des notes pour <strong>{periode?.nom || 'cette période'}</strong> est actuellement clôturée par le Censeur des Études.
                  </span>
                </div>
              )}

              {/* Notice si en mode consultation seule */}
              {!canEdit && !periode?.is_locked && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Mode Consultation en Lecture Seule :</strong> Vous consultez les notes saisies par l'enseignant titulaire (<strong>{assignedTeacher ? `${assignedTeacher.nom} ${assignedTeacher.prenom}` : 'Non attribué'}</strong>).
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Consultation</span>
                </div>
              )}

              {/* Barre d'outils et bouton Enregistrer Toute la Classe (si canEdit) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-2 text-xs text-slate-700">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">
                    Tableau officiel de saisie simultanée — 3 Interrogations & 2 Devoirs
                  </span>
                </div>

                {canEdit && (
                  <button
                    id="btn-save-all-notes"
                    onClick={handleSaveAllNotes}
                    className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Enregistrer toutes les notes de la classe</span>
                  </button>
                )}
              </div>

              {/* Tableau officiel de saisie avec I1, I2, I3, Moy. Int, D1, D2, Moy. Matière, Points, Appréciation */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-2 sm:px-3 py-3 w-10 text-center">N°</th>
                      <th className="px-2 sm:px-3 py-3 w-24">Matricule</th>
                      <th className="px-3 sm:px-4 py-3 min-w-[160px]">Nom & Prénoms</th>
                      <th className="px-1 sm:px-2 py-3 text-center w-12">Sexe</th>
                      <th className="px-2 py-3 text-center w-20 bg-blue-50/70 text-blue-900 border-x border-blue-200/60 font-bold">
                        I1
                      </th>
                      <th className="px-2 py-3 text-center w-20 bg-blue-50/70 text-blue-900 border-r border-blue-200/60 font-bold">
                        I2
                      </th>
                      <th className="px-2 py-3 text-center w-20 bg-blue-50/70 text-blue-900 border-r border-blue-200/60 font-bold">
                        I3
                      </th>
                      <th className="px-2 py-3 text-center w-24 bg-blue-100/80 text-blue-950 font-black border-r border-blue-300">
                        Moy. Int.
                      </th>
                      <th className="px-2 py-3 text-center w-20 bg-emerald-50/70 text-emerald-900 border-r border-emerald-200/60 font-bold">
                        D1
                      </th>
                      <th className="px-2 py-3 text-center w-20 bg-emerald-50/70 text-emerald-900 border-r border-emerald-200/60 font-bold">
                        D2
                      </th>
                      <th className="px-2 py-3 text-center w-24 bg-emerald-100/80 text-emerald-950 font-black border-r border-emerald-300">
                        Moy. Matière
                      </th>
                      <th className="px-2 py-3 text-center w-16 bg-slate-100 font-bold border-r border-slate-200">
                        Points
                      </th>
                      <th className="px-3 py-3 min-w-[110px]">Appréciation</th>
                      <th className="px-3 py-3 text-right w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {eleves.map((eleve, index) => {
                      const vI1Str = getInputValue(eleve.id, 'INTERROGATION_1');
                      const vI2Str = getInputValue(eleve.id, 'INTERROGATION_2');
                      const vI3Str = getInputValue(eleve.id, 'INTERROGATION_3');
                      const vD1Str = getInputValue(eleve.id, 'DEVOIR_1');
                      const vD2Str = getInputValue(eleve.id, 'DEVOIR_2');

                      const nI1 = vI1Str.trim() !== '' ? parseFloat(vI1Str) : null;
                      const nI2 = vI2Str.trim() !== '' ? parseFloat(vI2Str) : null;
                      const nI3 = vI3Str.trim() !== '' ? parseFloat(vI3Str) : null;
                      const nD1 = vD1Str.trim() !== '' ? parseFloat(vD1Str) : null;
                      const nD2 = vD2Str.trim() !== '' ? parseFloat(vD2Str) : null;

                      // Calcul strict de la moyenne d'interrogation
                      const interros = [nI1, nI2, nI3].filter((x): x is number => x !== null && !isNaN(x) && x >= 0 && x <= 20);
                      let moyInterros: number | null = null;
                      if (interros.length > 0) {
                        if (interros.length === 3) {
                          moyInterros = Math.round(((nI1! + nI2! + nI3!) / 3) * 100) / 100;
                        } else {
                          moyInterros = Math.round((interros.reduce((a, b) => a + b, 0) / interros.length) * 100) / 100;
                        }
                      }

                      // Calcul strict de la moyenne de matière : (Moy. Int. + D1 + D2) ÷ 3
                      let moyMatiere: number | null = null;
                      const hasD1 = nD1 !== null && !isNaN(nD1) && nD1 >= 0 && nD1 <= 20;
                      const hasD2 = nD2 !== null && !isNaN(nD2) && nD2 >= 0 && nD2 <= 20;

                      if (moyInterros !== null && hasD1 && hasD2) {
                        moyMatiere = Math.round(((moyInterros + nD1! + nD2!) / 3) * 100) / 100;
                      } else {
                        const parts: number[] = [];
                        if (moyInterros !== null) parts.push(moyInterros);
                        if (hasD1) parts.push(nD1!);
                        if (hasD2) parts.push(nD2!);
                        if (parts.length > 0) {
                          moyMatiere = Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) / 100;
                        }
                      }

                      const points = moyMatiere !== null ? Math.round((moyMatiere * coefClasse) * 100) / 100 : null;
                      const appreciation = getAppreciation(moyMatiere);
                      const colorStyle = getAppreciationColor(appreciation);

                      return (
                        <tr key={eleve.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-2 sm:px-3 py-2.5 text-center font-bold text-slate-500">
                            {index + 1}
                          </td>
                          <td className="px-2 sm:px-3 py-2.5 font-mono text-[11px] text-slate-600 font-medium whitespace-nowrap">
                            {eleve.matricule}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5">
                            <div className="font-bold text-slate-900 text-xs">
                              {eleve.nom} {eleve.prenom}
                            </div>
                          </td>
                          <td className="px-1 sm:px-2 py-2.5 text-center">
                            <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                              eleve.sexe === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {eleve.sexe}
                            </span>
                          </td>

                          {/* Interrogation 1 */}
                          <td className="px-1.5 py-2 text-center bg-blue-50/20 border-x border-blue-100">
                            {canEdit ? (
                              <input
                                id={`input-i1-${eleve.id}`}
                                type="text"
                                inputMode="decimal"
                                disabled={!canEdit}
                                placeholder="—"
                                value={vI1Str}
                                onChange={(e) => handleInputChange(eleve.id, 'INTERROGATION_1', e.target.value)}
                                className={`w-14 text-center font-bold text-xs py-1 px-1 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                  nI1 !== null && (nI1 < 0 || nI1 > 20)
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-slate-300 bg-white text-slate-900'
                                }`}
                              />
                            ) : (
                              <span className="font-bold text-xs text-slate-800">
                                {nI1 !== null ? nI1 : '—'}
                              </span>
                            )}
                          </td>

                          {/* Interrogation 2 */}
                          <td className="px-1.5 py-2 text-center bg-blue-50/20 border-r border-blue-100">
                            {canEdit ? (
                              <input
                                id={`input-i2-${eleve.id}`}
                                type="text"
                                inputMode="decimal"
                                disabled={!canEdit}
                                placeholder="—"
                                value={vI2Str}
                                onChange={(e) => handleInputChange(eleve.id, 'INTERROGATION_2', e.target.value)}
                                className={`w-14 text-center font-bold text-xs py-1 px-1 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                  nI2 !== null && (nI2 < 0 || nI2 > 20)
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-slate-300 bg-white text-slate-900'
                                }`}
                              />
                            ) : (
                              <span className="font-bold text-xs text-slate-800">
                                {nI2 !== null ? nI2 : '—'}
                              </span>
                            )}
                          </td>

                          {/* Interrogation 3 */}
                          <td className="px-1.5 py-2 text-center bg-blue-50/20 border-r border-blue-100">
                            {canEdit ? (
                              <input
                                id={`input-i3-${eleve.id}`}
                                type="text"
                                inputMode="decimal"
                                disabled={!canEdit}
                                placeholder="—"
                                value={vI3Str}
                                onChange={(e) => handleInputChange(eleve.id, 'INTERROGATION_3', e.target.value)}
                                className={`w-14 text-center font-bold text-xs py-1 px-1 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                  nI3 !== null && (nI3 < 0 || nI3 > 20)
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-slate-300 bg-white text-slate-900'
                                }`}
                              />
                            ) : (
                              <span className="font-bold text-xs text-slate-800">
                                {nI3 !== null ? nI3 : '—'}
                              </span>
                            )}
                          </td>

                          {/* Moyenne Interrogations */}
                          <td className="px-2 py-2 text-center bg-blue-50/80 border-r border-blue-200">
                            {moyInterros !== null ? (
                              <span className="font-extrabold text-xs text-blue-900 font-mono">
                                {moyInterros.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[11px]">—</span>
                            )}
                          </td>

                          {/* Devoir 1 */}
                          <td className="px-1.5 py-2 text-center bg-emerald-50/20 border-r border-emerald-100">
                            {canEdit ? (
                              <input
                                id={`input-d1-${eleve.id}`}
                                type="text"
                                inputMode="decimal"
                                disabled={!canEdit}
                                placeholder="—"
                                value={vD1Str}
                                onChange={(e) => handleInputChange(eleve.id, 'DEVOIR_1', e.target.value)}
                                className={`w-14 text-center font-bold text-xs py-1 px-1 rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                  nD1 !== null && (nD1 < 0 || nD1 > 20)
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-slate-300 bg-white text-slate-900'
                                }`}
                              />
                            ) : (
                              <span className="font-bold text-xs text-slate-800">
                                {nD1 !== null ? nD1 : '—'}
                              </span>
                            )}
                          </td>

                          {/* Devoir 2 */}
                          <td className="px-1.5 py-2 text-center bg-emerald-50/20 border-r border-emerald-100">
                            {canEdit ? (
                              <input
                                id={`input-d2-${eleve.id}`}
                                type="text"
                                inputMode="decimal"
                                disabled={!canEdit}
                                placeholder="—"
                                value={vD2Str}
                                onChange={(e) => handleInputChange(eleve.id, 'DEVOIR_2', e.target.value)}
                                className={`w-14 text-center font-bold text-xs py-1 px-1 rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                  nD2 !== null && (nD2 < 0 || nD2 > 20)
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-slate-300 bg-white text-slate-900'
                                }`}
                              />
                            ) : (
                              <span className="font-bold text-xs text-slate-800">
                                {nD2 !== null ? nD2 : '—'}
                              </span>
                            )}
                          </td>

                          {/* Moyenne Matière */}
                          <td className="px-2 py-2 text-center bg-emerald-100/70 border-r border-emerald-300">
                            {moyMatiere !== null ? (
                              <span className="font-black text-xs text-emerald-950 font-mono">
                                {moyMatiere.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[11px]">—</span>
                            )}
                          </td>

                          {/* Points Pondérés */}
                          <td className="px-2 py-2 text-center bg-slate-50 border-r border-slate-200">
                            {points !== null ? (
                              <span className="font-bold text-xs text-slate-800 font-mono">
                                {points.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[11px]">—</span>
                            )}
                          </td>

                          {/* Appréciation */}
                          <td className="px-3 py-2 whitespace-nowrap">
                            {moyMatiere !== null ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${colorStyle.bg} ${colorStyle.border}`}>
                                {appreciation}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">En attente</span>
                            )}
                          </td>

                          {/* Action individuelle */}
                          <td className="px-2 py-2 text-right whitespace-nowrap">
                            {canEdit ? (
                              <button
                                id={`btn-save-row-${eleve.id}`}
                                disabled={!canEdit}
                                onClick={() => handleSaveStudentRow(eleve)}
                                className="p-1.5 rounded text-white font-medium text-xs transition-colors bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                                title="Enregistrer les notes de cet élève"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => onOpenBulletin && onOpenBulletin(eleve.id, classe.id, periode.id)}
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 rounded font-medium text-[10px] cursor-pointer"
                                title="Consulter le bulletin de cet apprenant"
                              >
                                <FileText className="w-3 h-3 text-emerald-600" />
                                <span>Bulletin</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'appel' ? (
            <div className="p-4 sm:p-6">
              <AppelCoursSeance 
                restrictToTeacher={!isCenseur && !isConcepteur} 
                initialClasseId={classe.id} 
              />
            </div>
          ) : (
            /* Consultation détaillée des résultats de la matière et moyennes générales */
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm sm:text-base flex items-center space-x-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Synthèse complète : {matiere.nom} — {classe.nom} ({periode.nom})</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Palmarès de la classe, moyennes générales et appréciations officielles du CEG GOGBO
                  </p>
                </div>

                <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
                  Effectif évalué : <strong>{classement.filter(c => c.moyenne_generale !== null).length} / {eleves.length}</strong> apprenants
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 sm:px-4 py-3">Rang</th>
                      <th className="px-3 sm:px-4 py-3">Matricule</th>
                      <th className="px-3 sm:px-4 py-3">Nom & Prénoms</th>
                      <th className="px-2 sm:px-4 py-3 text-center">I1</th>
                      <th className="px-2 sm:px-4 py-3 text-center">I2</th>
                      <th className="px-2 sm:px-4 py-3 text-center">I3</th>
                      <th className="px-2 sm:px-4 py-3 text-center bg-blue-50 text-blue-900 font-bold">Moy. Int.</th>
                      <th className="px-2 sm:px-4 py-3 text-center">Dev. 1</th>
                      <th className="px-2 sm:px-4 py-3 text-center">Dev. 2</th>
                      <th className="px-3 sm:px-4 py-3 text-center font-black bg-emerald-50 text-emerald-900">Moyenne {matiere.nom}</th>
                      <th className="px-3 sm:px-4 py-3 text-center font-black">Moyenne Générale</th>
                      <th className="px-3 sm:px-4 py-3">Appréciation</th>
                      <th className="px-3 sm:px-4 py-3 text-right">Bulletin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {classement.map((item) => {
                      const b = bulletinsMap[item.eleve_id];
                      const mn = b?.matieres_notes.find((m) => m.matiere_id === matiere.id);
                      const apprecStyle = getAppreciationColor(item.appreciation);

                      return (
                        <tr key={item.eleve_id} className="hover:bg-slate-50">
                          <td className="px-3 sm:px-4 py-3 font-bold text-slate-900">
                            {item.rang === 1 && item.moyenne_generale !== null ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                                🥇 {item.rang_label}
                              </span>
                            ) : (
                              <span>{item.rang_label}</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-3 font-mono text-slate-500 text-[11px]">
                            {item.matricule}
                          </td>
                          <td className="px-3 sm:px-4 py-3 font-semibold text-slate-800">
                            {item.nom} {item.prenom}
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center">
                            {mn?.interro_1 !== null && mn?.interro_1 !== undefined ? mn.interro_1 : '—'}
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center">
                            {mn?.interro_2 !== null && mn?.interro_2 !== undefined ? mn.interro_2 : '—'}
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center">
                            {mn?.interro_3 !== null && mn?.interro_3 !== undefined ? mn.interro_3 : '—'}
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center font-bold bg-blue-50/60 text-blue-900">
                            {mn?.moyenne_interros !== null && mn?.moyenne_interros !== undefined ? mn.moyenne_interros.toFixed(2) : '—'}
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center">
                            {mn?.devoir_1 !== null && mn?.devoir_1 !== undefined ? mn.devoir_1 : '—'}
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center">
                            {mn?.devoir_2 !== null && mn?.devoir_2 !== undefined ? mn.devoir_2 : '—'}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center font-black text-emerald-900 bg-emerald-50/70">
                            {mn?.moyenne !== null && mn?.moyenne !== undefined ? `${mn.moyenne.toFixed(2)}/20` : '—'}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center font-black text-sm text-slate-900">
                            {item.moyenne_generale !== null ? `${item.moyenne_generale.toFixed(2)}/20` : '—'}
                          </td>
                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${apprecStyle.bg} ${apprecStyle.border}`}>
                              {item.appreciation}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">
                            <button
                              id={`btn-open-bulletin-${item.eleve_id}`}
                              onClick={() => onOpenBulletin && onOpenBulletin(item.eleve_id, classe.id, periode.id)}
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-medium text-[11px] cursor-pointer"
                              title="Générer le bulletin scolaire"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Bulletin</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal punition ouvert à tout enseignant */}
      <ModalEnregistrerPunition
        isOpen={isPunitionModalOpen}
        onClose={() => setIsPunitionModalOpen(false)}
        onSuccess={() => {
          setStatusMessage({ type: 'success', text: 'Punition scolaire enregistrée avec succès.' });
          setTimeout(() => setStatusMessage(null), 3000);
        }}
      />
    </div>
  );
};
