import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { 
  EnregistrementPresence, 
  StatutPresence, 
  IncidentDisciplinaire, 
  TypeIncidentDisciplinaire, 
  PunitionScolaire,
  Eleve, 
  Classe, 
  Periode 
} from '../../types';
import { ModalEnregistrerPunition } from '../discipline/ModalEnregistrerPunition';
import { 
  ShieldCheck, 
  Users, 
  School, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  Clock, 
  UserX,
  FileCheck,
  AlertOctagon,
  ArrowRight,
  BookOpen,
  Check,
  FileWarning,
  Eye,
  ClipboardCheck,
  Ban,
  X
} from 'lucide-react';
import { AppelCoursSeance } from '../discipline/AppelCoursSeance';
import { TabKey } from '../Navigation';

interface SurveillantDashboardProps {
  onNavigate: (tab: TabKey) => void;
}

type ModuleView = 'saisie' | 'appel_seance' | 'registre' | 'retards' | 'discipline' | 'bilan';

export const SurveillantDashboard: React.FC<SurveillantDashboardProps> = ({ onNavigate }) => {
  const { currentUser, isSurveillant, isCenseur, isDirecteur, isConcepteur } = useAuth();
  const { selectedAnnee, activeAnnee, isArchive } = useAnnee();

  const [currentView, setCurrentView] = useState<ModuleView>('saisie');
  const [selectedClasseId, setSelectedClasseId] = useState<string>('cls-6a');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canModify = !isArchive && (isSurveillant || isCenseur || isDirecteur || isConcepteur);

  const classes = storage.getClasses();
  const periodes = storage.getPeriodesByAnnee(selectedAnnee.libelle);
  const activePeriode = periodes.find((p) => p.is_active) || periodes[0] || storage.getActivePeriode();
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>(activePeriode?.id || '');

  // Élèves de la classe pour l'année scolaire sélectionnée
  const elevesClasse: Eleve[] = useMemo(() => {
    return storage.getElevesByClasse(selectedClasseId, selectedAnnee.libelle);
  }, [selectedClasseId, selectedAnnee.libelle]);

  // État local de la feuille d'appel du jour (clé: eleveId -> { statut, motif, justifie, heure_retard })
  const [appelState, setAppelState] = useState<
    Record<string, { statut: StatutPresence; motif: string; justifie: boolean; heure_retard: string }>
  >({});

  // Initialisation de la feuille d'appel quand la classe change
  useEffect(() => {
    const initial: Record<string, { statut: StatutPresence; motif: string; justifie: boolean; heure_retard: string }> = {};
    const existingDatePresences = storage
      .getPresencesByClasse(selectedClasseId, selectedAnnee.libelle)
      .filter((p) => p.date === selectedDate);
    const existingMap = new Map(existingDatePresences.map((p) => [p.eleve_id, p]));

    elevesClasse.forEach((el) => {
      const existing = existingMap.get(el.id);
      if (existing) {
        initial[el.id] = {
          statut: existing.statut,
          motif: existing.motif || '',
          justifie: existing.justifie ?? false,
          heure_retard: existing.heure_retard || '',
        };
      } else {
        initial[el.id] = {
          statut: 'PRESENT',
          motif: '',
          justifie: false,
          heure_retard: '',
        };
      }
    });
    setAppelState(initial);
  }, [selectedClasseId, selectedDate, elevesClasse, selectedAnnee.libelle]);

  // Données de présences, incidents et punitions
  const [presencesAnnee, setPresencesAnnee] = useState<EnregistrementPresence[]>(() =>
    storage.getPresencesByAnnee(selectedAnnee.libelle)
  );
  const [incidentsAnnee, setIncidentsAnnee] = useState<IncidentDisciplinaire[]>(() =>
    storage.getIncidentsDisciplinaires(selectedAnnee.libelle)
  );
  const [punitionsAnnee, setPunitionsAnnee] = useState<PunitionScolaire[]>(() =>
    storage.getPunitions(selectedAnnee.libelle)
  );
  const [isPunitionModalOpen, setIsPunitionModalOpen] = useState(false);
  const [punitionFilterClasse, setPunitionFilterClasse] = useState('ALL');
  const [punitionSearch, setPunitionSearch] = useState('');

  // Annulation certifiée de punition (Conservation intégrale de l'historique et de la traçabilité)
  const [punitionToAnnuler, setPunitionToAnnuler] = useState<PunitionScolaire | null>(null);
  const [motifAnnulationInput, setMotifAnnulationInput] = useState('');
  const [isAnnulating, setIsAnnulating] = useState(false);

  // Tous les enseignants et tous les membres du personnel administratif autorisés (Censeur, Directeur, Surveillant, Comptable, Concepteur, Enseignants)
  const canPunish = !isArchive && !!currentUser && currentUser.role !== 'PARENT';

  const refreshData = () => {
    setPresencesAnnee(storage.getPresencesByAnnee(selectedAnnee.libelle));
    setIncidentsAnnee(storage.getIncidentsDisciplinaires(selectedAnnee.libelle));
    setPunitionsAnnee(storage.getPunitions(selectedAnnee.libelle));
  };

  const handleConfirmAnnulerPunition = () => {
    if (!currentUser || !punitionToAnnuler) return;
    setIsAnnulating(true);
    try {
      storage.annulerPunition(punitionToAnnuler.id, currentUser, motifAnnulationInput);
      refreshData();
      setStatusMessage({ 
        type: 'success', 
        text: '✓ La punition a été annulée avec succès. L’état passe à ANNULÉE et l’historique est intégralement conservé.' 
      });
      setTimeout(() => setStatusMessage(null), 4000);
      setPunitionToAnnuler(null);
      setMotifAnnulationInput('');
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e?.message || "Erreur lors de l'annulation de la punition." });
    } finally {
      setIsAnnulating(false);
    }
  };

  const handleDeletePunition = (id: string) => {
    if (!currentUser) return;
    const target = punitionsAnnee.find((p) => p.id === id);
    if (target) {
      setPunitionToAnnuler(target);
      setMotifAnnulationInput('');
    }
  };

  const filteredPunitions = useMemo(() => {
    return punitionsAnnee.filter((p) => {
      if (punitionFilterClasse !== 'ALL' && p.classe_id !== punitionFilterClasse) return false;
      if (punitionSearch.trim()) {
        const s = punitionSearch.toLowerCase().trim();
        const el = storage.getEleveById(p.eleve_id);
        const matchEl = el ? `${el.nom} ${el.prenom} ${el.matricule}`.toLowerCase().includes(s) : false;
        const matchMotif = (p.faute_motif || '').toLowerCase().includes(s);
        const matchPun = (p.punition_appliquee || '').toLowerCase().includes(s);
        const matchAuteur = (p.auteur_nom || '').toLowerCase().includes(s);
        return matchEl || matchMotif || matchPun || matchAuteur;
      }
      return true;
    });
  }, [punitionsAnnee, punitionFilterClasse, punitionSearch]);

  useEffect(() => {
    refreshData();
  }, [selectedAnnee.libelle]);

  // -------------------------------------------------------------
  // 1. POINTAGE JOURNALIER
  // -------------------------------------------------------------
  const handleSaveFeuilleAppel = () => {
    if (!currentUser || !canModify) {
      setStatusMessage({ type: 'error', text: 'Action refusée : permissions insuffisantes ou année en lecture seule.' });
      return;
    }

    try {
      let count = 0;
      elevesClasse.forEach((el) => {
        const row = appelState[el.id] || { statut: 'PRESENT', motif: '', justifie: false, heure_retard: '' };
        storage.savePresence(
          {
            annee_scolaire: selectedAnnee.libelle,
            classe_id: selectedClasseId,
            eleve_id: el.id,
            date: selectedDate,
            statut: row.statut,
            motif: row.motif || (row.statut === 'PRESENT' ? 'Présent en cours' : undefined),
            justifie: row.justifie,
            heure_retard: row.statut === 'RETARD' ? (row.heure_retard || '07:30') : undefined,
            enregistre_par_id: currentUser.id,
            enregistre_par_nom: `${currentUser.nom} ${currentUser.prenom}`,
            date_saisie: new Date().toISOString(),
            periode_id: selectedPeriodeId,
          },
          currentUser
        );
        count++;
      });

      setStatusMessage({
        type: 'success',
        text: `✓ Contrôle des présences enregistré avec succès pour la classe (${count} apprenants pointés le ${selectedDate}).`,
      });
      refreshData();
    } catch (e: unknown) {
      setStatusMessage({ type: 'error', text: e instanceof Error ? e.message : 'Erreur lors de l’enregistrement.' });
    }
  };

  const handleQuickSaveRow = (eleve: Eleve, statut: StatutPresence) => {
    if (!currentUser || !canModify) {
      setStatusMessage({ type: 'error', text: 'Opération refusée en consultation d’archives historiques.' });
      return;
    }

    const row = appelState[eleve.id] || { statut: 'PRESENT', motif: '', justifie: false, heure_retard: '' };
    setAppelState((prev) => ({
      ...prev,
      [eleve.id]: { ...row, statut },
    }));

    try {
      storage.savePresence(
        {
          annee_scolaire: selectedAnnee.libelle,
          classe_id: selectedClasseId,
          eleve_id: eleve.id,
          date: selectedDate,
          statut,
          motif: row.motif || undefined,
          justifie: row.justifie,
          heure_retard: statut === 'RETARD' ? (row.heure_retard || '07:30') : undefined,
          enregistre_par_id: currentUser.id,
          enregistre_par_nom: `${currentUser.nom} ${currentUser.prenom}`,
          date_saisie: new Date().toISOString(),
          periode_id: selectedPeriodeId,
        },
        currentUser
      );
      setStatusMessage({
        type: 'success',
        text: `✓ Statut "${statut}" consigné pour ${eleve.nom} ${eleve.prenom}.`,
      });
      refreshData();
    } catch (e: unknown) {
      setStatusMessage({ type: 'error', text: e instanceof Error ? e.message : 'Erreur lors de l’enregistrement.' });
    }
  };

  const handleDeletePresence = (id: string) => {
    if (!currentUser || !canModify) return;
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet enregistrement de présence ?")) {
      try {
        storage.deletePresence(id, currentUser);
        setStatusMessage({ type: 'success', text: '✓ Enregistrement supprimé avec succès.' });
        refreshData();
      } catch (e: unknown) {
        setStatusMessage({ type: 'error', text: e instanceof Error ? e.message : 'Erreur lors de la suppression.' });
      }
    }
  };

  // -------------------------------------------------------------
  // 2. DISCIPLINE & INCIDENTS
  // -------------------------------------------------------------
  const [discClasseId, setDiscClasseId] = useState<string>(classes[0]?.id || 'cls-6a');
  const elevesDiscClasse = useMemo(() => {
    return storage.getElevesByClasse(discClasseId, selectedAnnee.libelle);
  }, [discClasseId, selectedAnnee.libelle]);

  const [discEleveId, setDiscEleveId] = useState<string>(elevesDiscClasse[0]?.id || '');
  const [discDate, setDiscDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [discType, setDiscType] = useState<TypeIncidentDisciplinaire>('INDISCIPLINE');
  const [discDescription, setDiscDescription] = useState<string>('');
  const [discMesure, setDiscMesure] = useState<string>('Avertissement verbal');
  const [discObs, setDiscObs] = useState<string>('');

  useEffect(() => {
    if (elevesDiscClasse.length > 0 && !elevesDiscClasse.some((e) => e.id === discEleveId)) {
      setDiscEleveId(elevesDiscClasse[0].id);
    }
  }, [elevesDiscClasse, discEleveId]);

  const handleSaveIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !canModify) {
      setStatusMessage({ type: 'error', text: 'Action refusée : permissions insuffisantes.' });
      return;
    }
    if (!discEleveId) {
      setStatusMessage({ type: 'error', text: 'Veuillez sélectionner un élève.' });
      return;
    }
    if (!discDescription.trim()) {
      setStatusMessage({ type: 'error', text: 'Veuillez décrire brièvement l’incident.' });
      return;
    }

    try {
      const el = storage.getEleveById(discEleveId);
      storage.saveIncident(
        {
          annee_scolaire: selectedAnnee.libelle,
          date: discDate,
          eleve_id: discEleveId,
          classe_id: discClasseId,
          type_incident: discType,
          description: discDescription.trim(),
          mesure_prise: discMesure.trim(),
          observation: discObs.trim() || undefined,
          signale_par_id: currentUser.id,
          signale_par_nom: `${currentUser.nom} ${currentUser.prenom}`,
        },
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: `✓ Incident disciplinaire enregistré pour l'élève ${el?.nom} ${el?.prenom}.`,
      });

      setDiscDescription('');
      setDiscObs('');
      refreshData();
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erreur lors de l’enregistrement de l’incident.',
      });
    }
  };

  const handleDeleteIncident = (id: string) => {
    if (!currentUser || !canModify) return;
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet incident disciplinaire ?")) {
      try {
        storage.deleteIncident(id, currentUser);
        setStatusMessage({ type: 'success', text: '✓ Incident disciplinaire supprimé.' });
        refreshData();
      } catch (err: unknown) {
        setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur de suppression.' });
      }
    }
  };

  // -------------------------------------------------------------
  // FILTRES ET STATISTIQUES
  // -------------------------------------------------------------
  const [searchEleve, setSearchEleve] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<'ALL' | StatutPresence>('ALL');
  const [filtreClasse, setFiltreClasse] = useState<string>('ALL');

  const filteredPresences = useMemo(() => {
    return presencesAnnee.filter((p) => {
      if (filtreClasse !== 'ALL' && p.classe_id !== filtreClasse) return false;
      if (filtreStatut !== 'ALL' && p.statut !== filtreStatut) return false;
      if (searchEleve.trim() !== '') {
        const el = storage.getEleveById(p.eleve_id);
        const searchStr = `${el?.nom || ''} ${el?.prenom || ''} ${el?.matricule || ''}`.toLowerCase();
        if (!searchStr.includes(searchEleve.toLowerCase())) return false;
      }
      return true;
    });
  }, [presencesAnnee, filtreClasse, filtreStatut, searchEleve]);

  // Retards enregistrés
  const retardsAnnee = useMemo(() => {
    return presencesAnnee.filter((p) => p.statut === 'RETARD');
  }, [presencesAnnee]);

  // Totaux statistiques
  const totalAbsencesAnnee = presencesAnnee.filter((p) => p.statut === 'ABSENT').length;
  const totalAbsencesJustifiees = presencesAnnee.filter((p) => p.statut === 'ABSENT' && p.justifie).length;
  const totalAbandonsAnnee = presencesAnnee.filter((p) => p.statut === 'ABANDON').length;
  const allEleves = storage.getElevesByAnnee(selectedAnnee.libelle);

  return (
    <div className="space-y-6">
      {/* 1. EN-TÊTE OFFICIEL DU MODULE */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                <span>Surveillance Générale & Vie Scolaire • CEG GOGBO</span>
              </span>
              <span className="text-indigo-200 text-xs">• Année {selectedAnnee.libelle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1 text-white flex items-center space-x-2">
              <span>VIE SCOLAIRE, PRÉSENCES, RETARDS & DISCIPLINE</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              Pointage journalier des 28 classes, gestion rigoureuse des absences et justificatifs, consignation des retards et signalement des situations d'abandon et d'indiscipline scolaire.
            </p>
          </div>

          {/* Navigation interne du module */}
          <div className="flex flex-wrap items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700 gap-1 shrink-0">
            <button
              onClick={() => setCurrentView('saisie')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentView === 'saisie'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Pointage du Jour</span>
            </button>
            <button
              id="btn-surveillant-appel-seance"
              onClick={() => setCurrentView('appel_seance')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentView === 'appel_seance'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Appel par Cours / Séance</span>
            </button>
            <button
              onClick={() => setCurrentView('registre')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentView === 'registre'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Registre ({presencesAnnee.length})</span>
            </button>
            <button
              onClick={() => setCurrentView('retards')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentView === 'retards'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Retards ({retardsAnnee.length})</span>
            </button>
            <button
              onClick={() => setCurrentView('discipline')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentView === 'discipline'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <FileWarning className="w-3.5 h-3.5 text-rose-300" />
              <span>Discipline ({incidentsAnnee.length})</span>
            </button>
            <button
              onClick={() => setCurrentView('bilan')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentView === 'bilan'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Bilan & Abandons</span>
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center justify-between space-x-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. STATS RAPIDES */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase">Élèves Inscrits ({selectedAnnee.libelle})</div>
            <div className="text-xl font-black text-slate-900">{allEleves.length} apprenants</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase">Absences Enregistrées</div>
            <div className="text-xl font-black text-amber-700">{totalAbsencesAnnee} ({totalAbsencesJustifiees} justifiées)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase">Abandons Constatés</div>
            <div className="text-xl font-black text-rose-700">{totalAbandonsAnnee} cas</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase">Divisions Surveillées</div>
            <div className="text-xl font-black text-slate-900">{classes.length} classes</div>
          </div>
        </div>
      </div>

      {/* 3. VUE : APPEL PAR COURS / SÉANCE DE COURS (Exigences 8 & 9) */}
      {currentView === 'appel_seance' && (
        <AppelCoursSeance restrictToTeacher={false} />
      )}

      {/* 4. VUE 1 : POINTAGE JOURNALIER PAR CLASSE */}
      {currentView === 'saisie' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Classe à pointer
                </label>
                <select
                  value={selectedClasseId}
                  onChange={(e) => setSelectedClasseId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.niveau})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Date du pointage
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Période scolaire
                </label>
                <select
                  value={selectedPeriodeId}
                  onChange={(e) => setSelectedPeriodeId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {periodes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} {p.is_active ? '★ (Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  onClick={handleSaveFeuilleAppel}
                  disabled={!canModify}
                  className="w-full bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-400 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Valider l’appel de la classe</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Matricule</th>
                  <th className="px-4 py-3">Nom & Prénoms</th>
                  <th className="px-4 py-3 text-center">Sexe</th>
                  <th className="px-4 py-3 text-center">Statut du jour</th>
                  <th className="px-4 py-3 text-center">Heure / Justifié</th>
                  <th className="px-4 py-3">Motif / Observation</th>
                  <th className="px-4 py-3 text-center">Total Absences</th>
                  <th className="px-4 py-3 text-center">Action Rapide</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {elevesClasse.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Aucun élève inscrit dans cette classe pour l’année {selectedAnnee.libelle}.
                    </td>
                  </tr>
                ) : (
                  elevesClasse.map((el) => {
                    const row = appelState[el.id] || { statut: 'PRESENT', motif: '', justifie: false, heure_retard: '' };
                    const totalAbs = storage.getEleveAbsencesCount(el.id, selectedAnnee.libelle);
                    const isAbandon = storage.isEleveAbandon(el.id, selectedAnnee.libelle);

                    return (
                      <tr 
                        key={el.id} 
                        className={`hover:bg-slate-50 transition-colors ${
                          row.statut === 'ABANDON' || isAbandon ? 'bg-red-50/50' : row.statut === 'ABSENT' ? 'bg-amber-50/40' : row.statut === 'RETARD' ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {el.matricule}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <span className="uppercase">{el.nom}</span> {el.prenom}
                          {isAbandon && (
                            <span className="ml-2 bg-red-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                              Abandon
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-600">
                          {el.sexe}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
                            <button
                              onClick={() => {
                                setAppelState((prev) => ({
                                  ...prev,
                                  [el.id]: { ...row, statut: 'PRESENT' },
                                }));
                              }}
                              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                row.statut === 'PRESENT'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Présent
                            </button>
                            <button
                              onClick={() => {
                                setAppelState((prev) => ({
                                  ...prev,
                                  [el.id]: { ...row, statut: 'ABSENT' },
                                }));
                              }}
                              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                row.statut === 'ABSENT'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => {
                                setAppelState((prev) => ({
                                  ...prev,
                                  [el.id]: { ...row, statut: 'RETARD' },
                                }));
                              }}
                              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                row.statut === 'RETARD'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Retard
                            </button>
                            <button
                              onClick={() => {
                                setAppelState((prev) => ({
                                  ...prev,
                                  [el.id]: { ...row, statut: 'ABANDON' },
                                }));
                              }}
                              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                row.statut === 'ABANDON'
                                  ? 'bg-red-700 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Abandon
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.statut === 'RETARD' ? (
                            <input
                              type="time"
                              value={row.heure_retard || '07:30'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAppelState((prev) => ({
                                  ...prev,
                                  [el.id]: { ...row, heure_retard: val },
                                }));
                              }}
                              className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono"
                            />
                          ) : row.statut === 'ABSENT' ? (
                            <label className="inline-flex items-center space-x-1 cursor-pointer text-[11px] font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={row.justifie}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setAppelState((prev) => ({
                                    ...prev,
                                    [el.id]: { ...row, justifie: checked },
                                  }));
                                }}
                                className="rounded text-indigo-600 focus:ring-0"
                              />
                              <span>Justifié</span>
                            </label>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            placeholder="Motif / Observation..."
                            value={row.motif}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAppelState((prev) => ({
                                ...prev,
                                [el.id]: { ...row, motif: val },
                              }));
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            totalAbs > 3 ? 'bg-red-100 text-red-800' : totalAbs > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {totalAbs} abs.
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleQuickSaveRow(el, row.statut)}
                            disabled={!canModify}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold px-2 py-1 rounded border border-slate-300 transition-colors cursor-pointer"
                            title="Consigner immédiatement pour cet élève"
                          >
                            ✓ Consigner
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. VUE 2 : REGISTRE COMPLET */}
      {currentView === 'registre' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registre Historique des Événements d’Assiduité
              </h3>
              <p className="text-xs text-slate-500">
                Consultation, recherche et justification des saisies d’absences, retards et abandons pour l’année {selectedAnnee.libelle}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher élève..."
                  value={searchEleve}
                  onChange={(e) => setSearchEleve(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={filtreClasse}
                onChange={(e) => setFiltreClasse(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>

              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="ABSENT">Absences uniquement</option>
                <option value="RETARD">Retards uniquement</option>
                <option value="ABANDON">Abandons uniquement</option>
                <option value="PRESENT">Présences</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Élève Concerné</th>
                  <th className="px-3.5 py-2.5">Classe</th>
                  <th className="px-3.5 py-2.5 text-center">Statut</th>
                  <th className="px-3.5 py-2.5 text-center">Justification / Heure</th>
                  <th className="px-3.5 py-2.5">Motif / Observation</th>
                  <th className="px-3.5 py-2.5">Enregistré par</th>
                  <th className="px-3.5 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPresences.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Aucune saisie de présence correspondant aux critères sélectionnés.
                    </td>
                  </tr>
                ) : (
                  filteredPresences.map((p) => {
                    const el = storage.getEleveById(p.eleve_id);
                    const cls = storage.getClasseById(p.classe_id);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2.5 font-mono text-slate-700">
                          {p.date}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                          {el ? `${el.nom} ${el.prenom}` : p.eleve_id}
                          <span className="block font-mono text-[10px] text-slate-400 font-normal">
                            {el?.matricule}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-700">
                          {cls?.nom || p.classe_id}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.statut === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.statut === 'ABSENT'
                              ? 'bg-amber-100 text-amber-800'
                              : p.statut === 'RETARD'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {p.statut}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {p.statut === 'RETARD' && p.heure_retard && (
                            <span className="font-mono text-slate-700 font-bold">{p.heure_retard}</span>
                          )}
                          {p.statut === 'ABSENT' && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              p.justifie ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {p.justifie ? 'Justifiée' : 'Non justifiée'}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 italic">
                          {p.motif || '—'}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">
                          {p.enregistre_par_nom || 'Surveillance'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {canModify && (
                            <button
                              onClick={() => handleDeletePresence(p.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                              title="Supprimer cet enregistrement"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. VUE 3 : REGISTRE DÉDIÉ DES RETARDS */}
      {currentView === 'retards' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Registre Spécial des Retards d'Élèves ({retardsAnnee.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Suivi chronologique des retards avec consignation de l'heure d'arrivée, du motif et de la classe.
              </p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded border border-amber-200">
              Année {selectedAnnee.libelle}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Heure d'arrivée</th>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3">Motif & Observation</th>
                  <th className="px-4 py-3">Enregistré par</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {retardsAnnee.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Aucun retard consigné pour l’année {selectedAnnee.libelle}.
                    </td>
                  </tr>
                ) : (
                  retardsAnnee.map((p) => {
                    const el = storage.getEleveById(p.eleve_id);
                    const cls = storage.getClasseById(p.classe_id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-700">{p.date}</td>
                        <td className="px-4 py-3 font-mono font-black text-indigo-900">{p.heure_retard || '07:30'}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {el?.nom} {el?.prenom}
                          <span className="block font-mono text-[10px] text-slate-400 font-normal">{el?.matricule}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{cls?.nom}</td>
                        <td className="px-4 py-3 text-slate-600 italic">{p.motif || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{p.enregistre_par_nom}</td>
                        <td className="px-4 py-3 text-center">
                          {canModify && (
                            <button
                              onClick={() => handleDeletePresence(p.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                              title="Supprimer ce retard"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. VUE 4 : ESPACE DISCIPLINE & INCIDENTS */}
      {currentView === 'discipline' && (
        <div className="space-y-6">
          {/* SECTION 1 : MODULE DE PUNITIONS SCOLAIRES (Accessible à tout le personnel) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-rose-600" />
                  <span>Registre Général des Punitions Scolaires ({punitionsAnnee.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conformément au règlement du collège, tout enseignant ou membre administratif peut consigner une punition pour tout apprenant (28 classes).
                </p>
              </div>

              {canPunish && (
                <button
                  onClick={() => setIsPunitionModalOpen(true)}
                  className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Consigner une Punition (28 Classes)</span>
                </button>
              )}
            </div>

            {/* Filtres de recherche */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Filtrer par classe :</label>
                <select
                  value={punitionFilterClasse}
                  onChange={(e) => setPunitionFilterClasse(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="ALL">Toutes les classes ({classes.length})</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Recherche rapide :</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Élève, matricule, motif, auteur..."
                    value={punitionSearch}
                    onChange={(e) => setPunitionSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Tableau des punitions */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Apprenant & Matricule</th>
                    <th className="px-4 py-3">Classe</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3">Motif constaté</th>
                    <th className="px-4 py-3 font-bold text-slate-900">Punition appliquée</th>
                    <th className="px-4 py-3">Auteur (Certifié)</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3">Traçabilité & Annulation</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPunitions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        Aucune punition scolaire enregistrée pour ces critères.
                      </td>
                    </tr>
                  ) : (
                    filteredPunitions.map((p) => {
                      const el = storage.getEleveById(p.eleve_id);
                      const cls = storage.getClasseById(p.classe_id);
                      const isAnnulee = p.statut === 'ANNULEE';
                      const isAuthor = !!currentUser && currentUser.id === p.auteur_id;
                      const isSurveillantGen = !!currentUser && (currentUser.role === 'SURVEILLANT_GENERAL' || isSurveillant);
                      const isConcepteur = !!currentUser && currentUser.role === 'CONCEPTEUR';
                      // Seul l'auteur de la punition ou le Surveillant Général peut annuler la punition
                      const canAnnuler = !isAnnulee && (isAuthor || isSurveillantGen || isConcepteur);

                      return (
                        <tr key={p.id} className={`hover:bg-slate-50 ${isAnnulee ? 'bg-slate-50/60' : ''}`}>
                          <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                            {p.date} {p.heure ? `(${p.heure})` : ''}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {el ? `${el.nom} ${el.prenom}` : p.eleve_id}
                            <span className="block font-mono text-[10px] text-slate-400 font-normal">
                              {el?.matricule}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {cls?.nom || p.classe_id}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-rose-50 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200 whitespace-nowrap">
                              {p.categorie_faute}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            <div className={isAnnulee ? 'line-through text-slate-400' : ''}>
                              {p.faute_motif}
                            </div>
                            {p.observation && (
                              <span className="block text-[10px] text-slate-400 italic">
                                Obs: {p.observation}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-black text-rose-900">
                            <span className={isAnnulee ? 'line-through text-slate-400 font-medium' : ''}>
                              {p.punition_appliquee}
                            </span>
                            {p.duree_modalite && (
                              <span className="block text-[10px] font-normal text-slate-500">
                                Modalité: {p.duree_modalite}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-[11px] whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{p.auteur_nom}</div>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">{p.auteur_role}</span>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {isAnnulee ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300">
                                ANNULÉE
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px] min-w-[190px]">
                            {isAnnulee ? (
                              <div className="bg-red-50/70 border border-red-200/80 rounded-md p-2 text-slate-700 space-y-0.5">
                                <div><strong className="text-red-900 font-bold">Annulée par :</strong> {p.annule_par_nom || 'Opérateur autorisé'}</div>
                                <div><strong className="text-red-900 font-bold">Date :</strong> {p.annule_le || '—'}</div>
                                {p.motif_annulation && (
                                  <div className="text-[10px] text-slate-600 italic">
                                    <strong>Motif :</strong> {p.motif_annulation}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>En vigueur</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {canAnnuler ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPunitionToAnnuler(p);
                                  setMotifAnnulationInput('');
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-900 border border-rose-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                title="Annuler cette punition (l'historique et la traçabilité restent conservés)"
                              >
                                <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Annuler la punition</span>
                              </button>
                            ) : isAnnulee ? (
                              <span className="text-slate-400 text-[11px] italic">Annulée</span>
                            ) : (
                              <span className="text-slate-400 text-xs" title="Seul l'auteur ou le Surveillant Général peut annuler cette punition">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2 : INCIDENTS DISCIPLINAIRES MAJEURS */}
          {canModify && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <FileWarning className="w-4 h-4 text-rose-600" />
                  <span>Enregistrer un Incident Disciplinaire</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Consignez les actes d'indiscipline, les mesures disciplinaires prises et les convocations de parents.
                </p>
              </div>

              <form onSubmit={handleSaveIncident} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Classe de l'élève *
                  </label>
                  <select
                    value={discClasseId}
                    onChange={(e) => setDiscClasseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Élève concerné *
                  </label>
                  <select
                    value={discEleveId}
                    onChange={(e) => setDiscEleveId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {elevesDiscClasse.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.nom} {el.prenom} ({el.matricule})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Date de l'incident *
                  </label>
                  <input
                    type="date"
                    required
                    value={discDate}
                    onChange={(e) => setDiscDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Type d'incident *
                  </label>
                  <select
                    value={discType}
                    onChange={(e) => setDiscType(e.target.value as TypeIncidentDisciplinaire)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="INDISCIPLINE">Indiscipline générale</option>
                    <option value="RETARD_REPETE">Retards répétés</option>
                    <option value="ABSENCE_NON_JUSTIFIEE">Absence injustifiée répétée</option>
                    <option value="INSOUFFRANCE">Insolence / Insoumission</option>
                    <option value="BAVARDAGES_REPETES">Bavardages répétés</option>
                    <option value="REFUS_DE_TRAVAIL">Refus d'obtempérer / de travail</option>
                    <option value="DEGRADATION_MATERIEL">Dégradation de matériel</option>
                    <option value="TRICHERIE">Fraude ou tricherie</option>
                    <option value="AUTRE">Autre incident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mesure disciplinaire prise *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Avertissement verbal, Convocation des parents, Retenue..."
                    value={discMesure}
                    onChange={(e) => setDiscMesure(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Observation complémentaire
                  </label>
                  <input
                    type="text"
                    placeholder="Détails / suites données..."
                    value={discObs}
                    onChange={(e) => setDiscObs(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Description détaillée des faits *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Explication précise des faits constatés par la surveillance ou l'enseignant..."
                    value={discDescription}
                    onChange={(e) => setDiscDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs py-2 px-5 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Enregistrer l'incident disciplinaire</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Registre des incidents */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">
                Registre des Incidents Disciplinaires ({incidentsAnnee.length})
              </h3>
              <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                Année {selectedAnnee.libelle}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Élève & Matricule</th>
                    <th className="px-4 py-3">Classe</th>
                    <th className="px-4 py-3">Type Incident</th>
                    <th className="px-4 py-3">Description des Faits</th>
                    <th className="px-4 py-3">Mesure Prise</th>
                    <th className="px-4 py-3">Signalé par</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {incidentsAnnee.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Aucun incident disciplinaire enregistré pour l’année {selectedAnnee.libelle}.
                      </td>
                    </tr>
                  ) : (
                    incidentsAnnee.map((inc) => {
                      const el = storage.getEleveById(inc.eleve_id);
                      const cls = storage.getClasseById(inc.classe_id);
                      return (
                        <tr key={inc.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-700">{inc.date}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {el?.nom} {el?.prenom}
                            <span className="block font-mono text-[10px] text-slate-400 font-normal">{el?.matricule}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{cls?.nom}</td>
                          <td className="px-4 py-3">
                            <span className="bg-rose-50 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              {inc.type_incident}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-800 max-w-xs">{inc.description}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{inc.mesure_prise}</td>
                          <td className="px-4 py-3 text-slate-500">{inc.signale_par_nom}</td>
                          <td className="px-4 py-3 text-center">
                            {canModify && (
                              <button
                                onClick={() => handleDeleteIncident(inc.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                                title="Supprimer cet incident"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. VUE 5 : BILAN ASSIDUITÉ & REGISTRE DES ABANDONS */}
      {currentView === 'bilan' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bilan Assiduité & Registre des Abandons
              </h3>
              <p className="text-xs text-slate-500">
                Synthèse cumulative des absences par élève et repérage des situations d'abandon scolaire.
              </p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-800 font-bold px-3 py-1 rounded-full border border-indigo-200">
              Année Scolaire {selectedAnnee.libelle}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cas d'abandons déclarés */}
            <div className="border border-red-200 rounded-xl p-4 bg-red-50/40 space-y-3">
              <div className="flex items-center space-x-2 text-red-900 font-bold text-sm">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                <span>Liste Officielle des Abandons ({totalAbandonsAnnee})</span>
              </div>
              <p className="text-xs text-red-800">
                Les apprenants listés ci-dessous portent la mention réglementaire "ABANDONNÉ" sur leur bulletin officiel.
              </p>

              {totalAbandonsAnnee === 0 ? (
                <div className="bg-white/80 p-4 rounded-lg text-center text-xs text-slate-500 border border-slate-200">
                  Aucun cas d’abandon scolaire enregistré pour l’année {selectedAnnee.libelle}.
                </div>
              ) : (
                <div className="space-y-2">
                  {presencesAnnee
                    .filter((p) => p.statut === 'ABANDON')
                    .map((p) => {
                      const el = storage.getEleveById(p.eleve_id);
                      const cls = storage.getClasseById(p.classe_id);
                      return (
                        <div key={p.id} className="bg-white p-3 rounded-lg border border-red-200 shadow-2xs flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {el?.nom} {el?.prenom}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Matricule: {el?.matricule} • Classe: {cls?.nom}
                            </div>
                            {p.motif && (
                              <div className="text-[10px] text-red-700 italic mt-0.5">
                                Motif: {p.motif}
                              </div>
                            )}
                          </div>
                          <span className="bg-red-700 text-white font-black text-[10px] px-2 py-0.5 rounded uppercase">
                            Abandonné
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Élèves à forte assiduité défaillante */}
            <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/40 space-y-3">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Apprenants à Vigilance Absences</span>
              </div>
              <p className="text-xs text-amber-800">
                Élèves ayant cumulé des absences répétées au cours de la session.
              </p>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {allEleves
                  .map((el) => ({
                    eleve: el,
                    absCount: storage.getEleveAbsencesCount(el.id, selectedAnnee.libelle),
                    isAbandon: storage.isEleveAbandon(el.id, selectedAnnee.libelle),
                  }))
                  .filter((item) => item.absCount > 0)
                  .sort((a, b) => b.absCount - a.absCount)
                  .map((item) => {
                    const cls = storage.getClasseOfEleve(item.eleve.id, selectedAnnee.libelle);
                    return (
                      <div key={item.eleve.id} className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {item.eleve.nom} {item.eleve.prenom}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Classe: {cls?.nom} • Matricule: {item.eleve.matricule}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-amber-100 text-amber-900 font-bold text-xs px-2.5 py-1 rounded">
                            {item.absCount} absence(s)
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'enregistrement des punitions scolaires pour tout le personnel */}
      <ModalEnregistrerPunition
        isOpen={isPunitionModalOpen}
        onClose={() => setIsPunitionModalOpen(false)}
        onSuccess={() => {
          refreshData();
          setStatusMessage({ type: 'success', text: 'Punition scolaire enregistrée avec succès.' });
          setTimeout(() => setStatusMessage(null), 3000);
        }}
      />

      {/* Modal officiel de confirmation d'annulation d'une punition avec traçabilité */}
      {punitionToAnnuler && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 text-white px-5 py-4 flex items-center justify-between border-b border-rose-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-500/40">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight text-white">
                    Confirmation d'Annulation de Punition
                  </h3>
                  <p className="text-[11px] text-rose-200">
                    Traçabilité réglementaire obligatoire • CEG GOGBO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPunitionToAnnuler(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs sm:text-sm font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>« Voulez-vous vraiment annuler cette punition ? »</span>
              </div>

              {/* Détails de la punition à annuler */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700">
                <div>
                  <strong className="text-slate-900">Apprenant :</strong>{' '}
                  <span className="font-semibold text-slate-900">
                    {storage.getEleveById(punitionToAnnuler.eleve_id)?.nom}{' '}
                    {storage.getEleveById(punitionToAnnuler.eleve_id)?.prenom}
                  </span>{' '}
                  <span className="text-slate-500">
                    ({storage.getClasseById(punitionToAnnuler.classe_id)?.nom || punitionToAnnuler.classe_id})
                  </span>
                </div>
                <div>
                  <strong className="text-slate-900">Auteur initial :</strong>{' '}
                  <span className="text-slate-800 font-medium">
                    {punitionToAnnuler.auteur_nom} ({punitionToAnnuler.auteur_role})
                  </span>
                </div>
                <div>
                  <strong className="text-slate-900">Date de la punition :</strong>{' '}
                  <span className="font-mono text-slate-800">{punitionToAnnuler.date}</span>
                </div>
                <div>
                  <strong className="text-slate-900">Motif constaté :</strong>{' '}
                  <span className="text-slate-800">{punitionToAnnuler.faute_motif}</span>
                </div>
                <div>
                  <strong className="text-slate-900">Punition appliquée :</strong>{' '}
                  <span className="font-bold text-rose-800">{punitionToAnnuler.punition_appliquee}</span>
                </div>
              </div>

              {/* Règle de traçabilité claire */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
                <div className="font-bold text-blue-950">Certification de traçabilité :</div>
                <div className="text-blue-800">
                  Cette punition <strong>ne disparaîtra pas silencieusement</strong>. Son statut passera à <strong>ANNULÉE</strong> dans l'historique avec certification de votre identité ({currentUser?.nom} {currentUser?.prenom}) et l'horodatage officiel de l'annulation.
                </div>
              </div>

              {/* Motif éventuel d'annulation */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Motif de l'annulation (optionnel) :
                </label>
                <input
                  type="text"
                  placeholder="Ex: Entente avec les parents, mesure éducative alternative, etc."
                  value={motifAnnulationInput}
                  onChange={(e) => setMotifAnnulationInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPunitionToAnnuler(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Conserver la punition (Retour)
                </button>
                <button
                  type="button"
                  disabled={isAnnulating}
                  onClick={handleConfirmAnnulerPunition}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{isAnnulating ? 'Annulation en cours...' : "Confirmer l'annulation"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
