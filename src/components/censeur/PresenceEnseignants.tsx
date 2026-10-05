import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { 
  UserProfile, 
  PresenceEnseignant, 
  StatutPresenceEnseignant 
} from '../../types';
import { 
  CalendarCheck, 
  Clock, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  History, 
  Calendar, 
  Edit3, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  FileText,
  Save,
  RotateCcw,
  Sparkles,
  Users,
  BookOpen,
  AlertCircle
} from 'lucide-react';

const MOTIFS_SUGGESTIONS = [
  'Maladie',
  'Permission administrative',
  'Mission',
  'Raisons personnelles',
  'Retard justifié',
  'Panne de transport',
  'Devoirs familiaux',
  'Autre'
];

export const PresenceEnseignants: React.FC = () => {
  const { currentUser, isCenseur } = useAuth();
  const { anneeActive } = useAnnee();
  // Seul le Censeur, selon ses attributions officielles, dispose des droits d'écriture et de modification.
  const canManage = currentUser?.role === 'CENSEUR' || isCenseur;

  const currentAnnee = anneeActive?.libelle || storage.getParametres().annee_academique || '2026–2027';

  // Navigation interne par onglets
  const [activeTab, setActiveTab] = useState<'journee' | 'formulaire' | 'historique'>('journee');

  // Année scolaire active pour le pointage journalier (par défaut l'année en cours)
  const [selectedAnnee, setSelectedAnnee] = useState<string>(currentAnnee);

  // Date sélectionnée pour le pointage journalier (par défaut aujourd'hui YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // État des profils enseignants
  const allProfiles = storage.getProfiles();
  const enseignants = useMemo(() => {
    return allProfiles
      .filter((p) => (p.is_enseignant || p.role === 'ENSEIGNANT') && p.statut === 'ACTIF')
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [allProfiles]);

  // Présences stockées (rafraîchies par timestamp)
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const presences = useMemo(() => {
    return storage.getPresencesEnseignants();
  }, [refreshKey]);

  // Messages d'alerte / rétroaction
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal / Formulaire d'édition détaillée ou correction
  const [editingPresence, setEditingPresence] = useState<{
    id?: string;
    enseignant_id: string;
    enseignant_nom: string;
    annee_scolaire: string;
    date: string;
    statut: StatutPresenceEnseignant;
    motif: string;
    heure_arrivee: string;
  } | null>(null);

  // Filtres pour l'historique
  const [histEnseignantId, setHistEnseignantId] = useState<string>('TOUS');
  const [histStatut, setHistStatut] = useState<string>('TOUS');
  const [histDateDebut, setHistDateDebut] = useState<string>('');
  const [histDateFin, setHistDateFin] = useState<string>('');
  const [histAnnee, setHistAnnee] = useState<string>(currentAnnee);
  const [histSearch, setHistSearch] = useState<string>('');

  // Formulaire d'enregistrement unique
  const [formAnnee, setFormAnnee] = useState<string>(currentAnnee);
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formEnseignantId, setFormEnseignantId] = useState<string>(enseignants[0]?.id || '');
  const [formStatut, setFormStatut] = useState<StatutPresenceEnseignant>('PRESENT');
  const [formMotif, setFormMotif] = useState<string>('');
  const [formHeureArrivee, setFormHeureArrivee] = useState<string>('08:00');

  // Présences pour la date et l'année scolaire sélectionnées (Mode Journée)
  const dailyPresencesMap = useMemo(() => {
    const map = new Map<string, PresenceEnseignant>();
    presences.forEach((p) => {
      if (p.date === selectedDate && p.annee_scolaire === selectedAnnee) {
        map.set(p.enseignant_id, p);
      }
    });
    return map;
  }, [presences, selectedDate, selectedAnnee]);

  // Statistiques de la journée
  const dailyStats = useMemo(() => {
    let presents = 0;
    let retards = 0;
    let absences = 0;
    let permissions = 0;

    dailyPresencesMap.forEach((p) => {
      if (p.statut === 'PRESENT') presents++;
      else if (p.statut === 'RETARD') retards++;
      else if (p.statut === 'ABSENCE') absences++;
      else if (p.statut === 'PERMISSION') permissions++;
    });

    const totalEnseignants = enseignants.length;
    const pointes = presents + retards + absences + permissions;
    const nonPointes = Math.max(0, totalEnseignants - pointes);

    return { totalEnseignants, presents, retards, absences, permissions, pointes, nonPointes };
  }, [dailyPresencesMap, enseignants]);

  // Fonction de pointage rapide d'un enseignant
  const handleQuickPoint = async (
    enseignant: UserProfile, 
    statut: StatutPresenceEnseignant,
    options?: { motif?: string; heure_arrivee?: string }
  ) => {
    if (!currentUser || !canManage) return;

    // Récupération stricte depuis la table réelle d'attribution de classe
    const matieresAttribuees = storage.getMatieresAttribueesLabel(enseignant.id, selectedAnnee);

    try {
      await storage.savePresenceEnseignant(
        {
          annee_scolaire: selectedAnnee,
          date: selectedDate,
          enseignant_id: enseignant.id,
          enseignant_nom: `${enseignant.nom} ${enseignant.prenom}`,
          matieres_attribuees: matieresAttribuees,
          statut,
          motif: options?.motif ?? '',
          heure_arrivee: statut === 'RETARD' ? (options?.heure_arrivee || '07:45') : '',
          enregistre_par_id: currentUser.id,
          enregistre_par_nom: `${currentUser.nom} ${currentUser.prenom}`,
        },
        currentUser
      );

      setRefreshKey((k) => k + 1);
      setFeedback({
        type: 'success',
        message: `${statut} enregistré pour ${enseignant.nom} ${enseignant.prenom} (${matieresAttribuees})`,
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || "Erreur lors de l'enregistrement",
      });
    }
  };

  // Marquer tous les non-pointés comme PRÉSENTS
  const handleMarquerTousPresents = async () => {
    if (!currentUser || !canManage) return;

    const aPointer = enseignants.filter((e) => !dailyPresencesMap.has(e.id));
    if (aPointer.length === 0) {
      setFeedback({ type: 'success', message: 'Tous les enseignants sont déjà pointés pour cette journée.' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    try {
      const entries = aPointer.map((e) => ({
        annee_scolaire: selectedAnnee,
        date: selectedDate,
        enseignant_id: e.id,
        enseignant_nom: `${e.nom} ${e.prenom}`,
        matieres_attribuees: storage.getMatieresAttribueesLabel(e.id, selectedAnnee),
        statut: 'PRESENT' as StatutPresenceEnseignant,
        motif: '',
        heure_arrivee: '',
        enregistre_par_id: currentUser.id,
        enregistre_par_nom: `${currentUser.nom} ${currentUser.prenom}`,
      }));

      await storage.batchSavePresencesEnseignants(entries, currentUser);
      setRefreshKey((k) => k + 1);
      setFeedback({
        type: 'success',
        message: `${aPointer.length} enseignant(s) marqué(s) PRÉSENT avec succès !`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erreur lors du pointage collectif' });
    }
  };

  // Enregistrer ou mettre à jour via la modal d'édition
  const handleSaveModal = async () => {
    if (!editingPresence || !currentUser || !canManage) return;

    const anneeCible = editingPresence.annee_scolaire || selectedAnnee;
    const matieresSnapshot = storage.getMatieresAttribueesLabel(editingPresence.enseignant_id, anneeCible);

    try {
      await storage.savePresenceEnseignant(
        {
          annee_scolaire: anneeCible,
          date: editingPresence.date,
          enseignant_id: editingPresence.enseignant_id,
          enseignant_nom: editingPresence.enseignant_nom,
          matieres_attribuees: matieresSnapshot,
          statut: editingPresence.statut,
          motif: editingPresence.motif,
          heure_arrivee: editingPresence.statut === 'RETARD' ? editingPresence.heure_arrivee : '',
          enregistre_par_id: currentUser.id,
          enregistre_par_nom: `${currentUser.nom} ${currentUser.prenom}`,
        },
        currentUser
      );

      setRefreshKey((k) => k + 1);
      setEditingPresence(null);
      setFeedback({
        type: 'success',
        message: `Situation mise à jour pour ${editingPresence.enseignant_nom} (${editingPresence.statut})`,
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erreur de mise à jour' });
    }
  };

  // Enregistrement depuis le formulaire individuel
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !canManage) return;

    const prof = enseignants.find((p) => p.id === formEnseignantId);
    if (!prof) {
      setFeedback({ type: 'error', message: 'Veuillez sélectionner un enseignant valide.' });
      return;
    }

    const matieresAttribuees = storage.getMatieresAttribueesLabel(prof.id, formAnnee);

    try {
      await storage.savePresenceEnseignant(
        {
          annee_scolaire: formAnnee,
          date: formDate,
          enseignant_id: prof.id,
          enseignant_nom: `${prof.nom} ${prof.prenom}`,
          matieres_attribuees: matieresAttribuees,
          statut: formStatut,
          motif: formMotif,
          heure_arrivee: formStatut === 'RETARD' ? formHeureArrivee : '',
          enregistre_par_id: currentUser.id,
          enregistre_par_nom: `${currentUser.nom} ${currentUser.prenom}`,
        },
        currentUser
      );

      setRefreshKey((k) => k + 1);
      setFeedback({
        type: 'success',
        message: `Présence enregistrée pour ${prof.nom} ${prof.prenom} [${matieresAttribuees}] (${formStatut}) !`,
      });
      setTimeout(() => setFeedback(null), 3500);
      setFormMotif('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erreur lors de la soumission' });
    }
  };

  // Suppression d'un enregistrement
  const handleDeletePresence = async (id: string, nom: string) => {
    if (!currentUser || !canManage) return;
    if (!window.confirm(`Confirmez-vous la suppression de l'enregistrement de présence de ${nom} ?`)) {
      return;
    }

    try {
      await storage.deletePresenceEnseignant(id, currentUser);
      setRefreshKey((k) => k + 1);
      setFeedback({ type: 'success', message: 'Enregistrement supprimé avec succès.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erreur lors de la suppression' });
    }
  };

  // Déplacement de la date (Jour précédent / Jour suivant)
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Liste filtrée pour l'historique
  const filteredHistorique = useMemo(() => {
    return presences
      .filter((p) => {
        if (histAnnee && p.annee_scolaire !== histAnnee) return false;
        if (histEnseignantId !== 'TOUS' && p.enseignant_id !== histEnseignantId) return false;
        if (histStatut !== 'TOUS' && p.statut !== histStatut) return false;
        if (histDateDebut && p.date < histDateDebut) return false;
        if (histDateFin && p.date > histDateFin) return false;
        if (histSearch.trim()) {
          const s = histSearch.toLowerCase().trim();
          const matchNom = p.enseignant_nom.toLowerCase().includes(s);
          const matchMotif = (p.motif || '').toLowerCase().includes(s);
          const matchMatiere = (p.matieres_attribuees || '').toLowerCase().includes(s);
          if (!matchNom && !matchMotif && !matchMatiere) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.enseignant_nom.localeCompare(b.enseignant_nom));
  }, [presences, histAnnee, histEnseignantId, histStatut, histDateDebut, histDateFin, histSearch]);

  // Statistiques de l'historique filtré
  const historiqueStats = useMemo(() => {
    const total = filteredHistorique.length;
    const presents = filteredHistorique.filter((p) => p.statut === 'PRESENT').length;
    const retards = filteredHistorique.filter((p) => p.statut === 'RETARD').length;
    const absences = filteredHistorique.filter((p) => p.statut === 'ABSENCE').length;
    const permissions = filteredHistorique.filter((p) => p.statut === 'PERMISSION').length;
    const tauxPresence = total > 0 ? Math.round(((presents + retards) / total) * 100) : 0;

    return { total, presents, retards, absences, permissions, tauxPresence };
  }, [filteredHistorique]);

  const anneesDisponibles = storage.getAnneesScolaires();

  // Si l'utilisateur n'a pas les droits de gestion et se trouvait sur le formulaire de saisie, on le redirige vers la consultation journalière
  const currentTabSafe = (!canManage && activeTab === 'formulaire') ? 'journee' : activeTab;

  return (
    <div className="space-y-6">
      {/* En-tête officiel du module */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-xl p-5 sm:p-6 shadow-md border border-emerald-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                canManage ? 'bg-emerald-400 text-slate-950' : 'bg-sky-400 text-slate-950'
              }`}>
                {canManage ? 'Espace Censeur — Saisie & Gestion' : 'Consultation — Lecture Seule'}
              </span>
              <span className="text-emerald-300 text-xs">• Année {selectedAnnee}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1 text-white flex items-center space-x-2">
              <CalendarCheck className="w-6 h-6 text-emerald-400" />
              <span>PRÉSENCE JOURNALIÈRE DES ENSEIGNANTS</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {canManage 
                ? "Enregistrement quotidien, gestion des retards, absences et permissions du corps professoral du CEG GOGBO. Matières issues exclusivement des attributions réelles."
                : "Consultation officielle du journal de présence des enseignants en lecture seule. Données certifiées par la Direction Pédagogique du CEG GOGBO."
              }
            </p>
          </div>

          {/* Boutons d'onglets principaux */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('journee')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                currentTabSafe === 'journee'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{canManage ? 'Pointage du Jour' : 'Pointage du Jour (Consultation)'}</span>
            </button>
            {canManage && (
              <button
                onClick={() => setActiveTab('formulaire')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  currentTabSafe === 'formulaire'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Saisie Détaillée</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('historique')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                currentTabSafe === 'historique'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{canManage ? 'Historique & Stats' : 'Historique & Registre'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bannière informative Mode Lecture Seule pour tous les non-Censeurs */}
      {!canManage && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-100 rounded-lg text-sky-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-sky-950 flex items-center space-x-2">
                <span>Journal en Lecture Seule</span>
                <span className="text-[10px] bg-sky-200 text-sky-800 px-1.5 py-0.5 rounded font-bold uppercase">
                  {currentUser?.role || 'Utilisateur'}
                </span>
              </div>
              <div className="text-[11px] text-sky-800 mt-0.5">
                Vous avez un accès complet à la consultation du journal de présence des enseignants, à la recherche et aux statistiques. Seul le <strong>Censeur</strong> est habilité à enregistrer ou modifier les présences.
              </div>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-bold text-sky-700 bg-white border border-sky-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Aucune modification autorisée
          </span>
        </div>
      )}

      {/* Message de notification / feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ONGLET 1 : POINTAGE DU JOUR (VUE QUOTIDIENNE RAPIDE) */}
      {/* ==================================================================== */}
      {activeTab === 'journee' && (
        <div className="space-y-4">
          {/* Barre de contrôle de date, Année & Actions rapides */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Jour précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={() => shiftDate(1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Jour suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-[11px] font-semibold text-emerald-700 hover:underline px-2 py-1 rounded bg-emerald-50 border border-emerald-200 cursor-pointer"
              >
                Aujourd'hui
              </button>

              {/* Sélecteur de l'année scolaire de référence */}
              <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
                <span className="text-[11px] font-bold text-slate-500">Année :</span>
                <select
                  value={selectedAnnee}
                  onChange={(e) => setSelectedAnnee(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {anneesDisponibles.map((a) => (
                    <option key={a.id} value={a.libelle}>
                      {a.libelle} {a.is_active ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action groupée - Réservée au Censeur */}
            <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
              <span className="text-xs text-slate-500 hidden sm:inline">
                {dailyStats.pointes} / {dailyStats.totalEnseignants} pointés
              </span>
              {canManage && (
                <button
                  onClick={handleMarquerTousPresents}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
                  title="Marquer automatiquement tous les enseignants non encore pointés aujourd'hui comme Présents"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Marquer tous les non-pointés comme Présents</span>
                </button>
              )}
            </div>
          </div>

          {/* Cartes récapitulatives de la journée sélectionnée */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Présents</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                {dailyStats.presents}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-amber-600 uppercase">Retards</div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
                {dailyStats.retards}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-red-600 uppercase">Absences</div>
              <div className="text-xl sm:text-2xl font-black text-red-600 mt-0.5">
                {dailyStats.absences}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-purple-600 uppercase">Permissions</div>
              <div className="text-xl sm:text-2xl font-black text-purple-600 mt-0.5">
                {dailyStats.permissions}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Non pointés</div>
              <div className="text-xl sm:text-2xl font-black text-slate-500 mt-0.5">
                {dailyStats.nonPointes}
              </div>
            </div>
          </div>

          {/* Liste des enseignants pour la journée (Tableau structuré & Mobile-friendly) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  Situation des Enseignants — {new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-500">
                  Attributions scolaires : <span className="font-bold text-emerald-800">{selectedAnnee}</span>
                </span>
                <span className="text-[11px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  {enseignants.length} enseignants
                </span>
              </div>
            </div>

            {enseignants.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun enseignant actif enregistré dans le système.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {enseignants.map((ens) => {
                  const presence = dailyPresencesMap.get(ens.id);
                  const isPresent = presence?.statut === 'PRESENT';
                  const isRetard = presence?.statut === 'RETARD';
                  const isAbsence = presence?.statut === 'ABSENCE';
                  const isPermission = presence?.statut === 'PERMISSION';

                  // Récupération stricte et dédupliquée des matières depuis les attributions réelles
                  const matieresAttribuees = storage.getMatieresAttribueesLabel(ens.id, selectedAnnee);
                  const hasAttribution = matieresAttribuees !== 'Aucune matière attribuée';

                  return (
                    <div
                      key={ens.id}
                      className="p-3 sm:p-4 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3"
                    >
                      {/* Enseignant & Matière(s) attribuée(s) */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {ens.nom} {ens.prenom}
                          </span>
                          {ens.role !== 'ENSEIGNANT' && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                              {ens.role}
                            </span>
                          )}
                        </div>

                        {/* Matière(s) attribuée(s) — STRICTEMENT DÉDUITES DES ATTRIBUTIONS DE CLASSE */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-semibold text-slate-500">Matière(s) :</span>
                          {hasAttribution ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                              <BookOpen className="w-3 h-3 mr-1 text-blue-600 shrink-0" />
                              {matieresAttribuees}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200 italic">
                              <AlertCircle className="w-3 h-3 mr-1 text-amber-600 shrink-0" />
                              Aucune matière attribuée
                            </span>
                          )}
                        </div>

                        {/* Statut actuel et détails */}
                        <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                          {presence ? (
                            <>
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  isPresent
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isRetard
                                    ? 'bg-amber-100 text-amber-800'
                                    : isAbsence
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {isPresent && <Check className="w-3 h-3" />}
                                {isRetard && <Clock className="w-3 h-3" />}
                                {isAbsence && <UserX className="w-3 h-3" />}
                                {isPermission && <FileText className="w-3 h-3" />}
                                <span>{presence.statut}</span>
                              </span>

                              {isRetard && presence.heure_arrivee && (
                                <span className="text-[11px] text-amber-800 font-semibold">
                                  Arrivée à {presence.heure_arrivee}
                                </span>
                              )}

                              {presence.motif && (
                                <span className="text-[11px] text-slate-600 italic">
                                  — Motif : {presence.motif}
                                </span>
                              )}

                              <span className="text-[10px] text-slate-400">
                                (par {presence.enregistre_par_nom})
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Non encore renseigné aujourd'hui
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Boutons d'actions de pointage (Réservés exclusivement au Censeur) */}
                      {canManage ? (
                        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto justify-end">
                          {/* Bouton Présent */}
                          <button
                            onClick={() => handleQuickPoint(ens, 'PRESENT')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title="Pointer Présent"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Présent</span>
                          </button>

                          {/* Bouton Retard */}
                          <button
                            onClick={() => {
                              setEditingPresence({
                                id: presence?.id,
                                enseignant_id: ens.id,
                                enseignant_nom: `${ens.nom} ${ens.prenom}`,
                                annee_scolaire: selectedAnnee,
                                date: selectedDate,
                                statut: 'RETARD',
                                motif: presence?.motif || 'Retard justifié',
                                heure_arrivee: presence?.heure_arrivee || '07:45',
                              });
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                              isRetard
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                            }`}
                            title="Signaler un retard"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Retard</span>
                          </button>

                          {/* Bouton Absence */}
                          <button
                            onClick={() => {
                              setEditingPresence({
                                id: presence?.id,
                                enseignant_id: ens.id,
                                enseignant_nom: `${ens.nom} ${ens.prenom}`,
                                annee_scolaire: selectedAnnee,
                                date: selectedDate,
                                statut: 'ABSENCE',
                                motif: presence?.motif || 'Maladie',
                                heure_arrivee: '',
                              });
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                              isAbsence
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
                            }`}
                            title="Signaler une absence"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Absence</span>
                          </button>

                          {/* Bouton Permission */}
                          <button
                            onClick={() => {
                              setEditingPresence({
                                id: presence?.id,
                                enseignant_id: ens.id,
                                enseignant_nom: `${ens.nom} ${ens.prenom}`,
                                annee_scolaire: selectedAnnee,
                                date: selectedDate,
                                statut: 'PERMISSION',
                                motif: presence?.motif || 'Permission administrative',
                                heure_arrivee: '',
                              });
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                              isPermission
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                            }`}
                            title="Signaler une permission"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Permission</span>
                          </button>

                          {/* Modifier / Corriger */}
                          {presence && (
                            <button
                              onClick={() => {
                                setEditingPresence({
                                  id: presence.id,
                                  enseignant_id: ens.id,
                                  enseignant_nom: `${ens.nom} ${ens.prenom}`,
                                  annee_scolaire: presence.annee_scolaire || selectedAnnee,
                                  date: selectedDate,
                                  statut: presence.statut,
                                  motif: presence.motif || '',
                                  heure_arrivee: presence.heure_arrivee || '',
                                });
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Corriger ou modifier la saisie"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-full lg:w-auto flex justify-end items-center">
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>{presence ? `Enregistré (${presence.statut})` : 'Non pointé par le Censeur'}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ONGLET 2 : SAISIE DÉTAILLÉE / FORMULAIRE INDIVIDUEL (RÉSERVÉ AU CENSEUR) */}
      {/* ==================================================================== */}
      {activeTab === 'formulaire' && canManage && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 max-w-2xl mx-auto">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-200 mb-5">
            <Plus className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Enregistrer une situation d'enseignant
              </h2>
              <p className="text-[11px] text-slate-500">
                La matière est déterminée automatiquement à partir de l'attribution de classe réelle.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            {/* Année scolaire & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Année scolaire *
                </label>
                <select
                  value={formAnnee}
                  onChange={(e) => setFormAnnee(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {anneesDisponibles.map((a) => (
                    <option key={a.id} value={a.libelle}>
                      {a.libelle} {a.is_active ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Date du pointage *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Enseignant */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Enseignant concerné *
              </label>
              <select
                value={formEnseignantId}
                onChange={(e) => setFormEnseignantId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {enseignants.map((ens) => {
                  const mats = storage.getMatieresAttribueesLabel(ens.id, formAnnee);
                  return (
                    <option key={ens.id} value={ens.id}>
                      {ens.nom} {ens.prenom} — [{mats}]
                    </option>
                  );
                })}
              </select>

              {/* Affichage en direct de la matière réellement attribuée */}
              {formEnseignantId && (
                <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-slate-500">Matière(s) attribuée(s) en {formAnnee} :</span>
                  {(() => {
                    const mats = storage.getMatieresAttribueesLabel(formEnseignantId, formAnnee);
                    return mats !== 'Aucune matière attribuée' ? (
                      <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center">
                        <BookOpen className="w-3 h-3 mr-1 text-blue-600" />
                        {mats}
                      </span>
                    ) : (
                      <span className="font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 italic flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                        Aucune matière attribuée
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Statut */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Statut de présence *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['PRESENT', 'RETARD', 'ABSENCE', 'PERMISSION'] as StatutPresenceEnseignant[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFormStatut(st)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center space-x-1.5 cursor-pointer ${
                      formStatut === st
                        ? st === 'PRESENT'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : st === 'RETARD'
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : st === 'ABSENCE'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'PRESENT' && <Check className="w-3.5 h-3.5" />}
                    {st === 'RETARD' && <Clock className="w-3.5 h-3.5" />}
                    {st === 'ABSENCE' && <UserX className="w-3.5 h-3.5" />}
                    {st === 'PERMISSION' && <FileText className="w-3.5 h-3.5" />}
                    <span>{st}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Heure d'arrivée si RETARD */}
            {formStatut === 'RETARD' && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Heure d'arrivée de l'enseignant *</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    required
                    value={formHeureArrivee}
                    onChange={(e) => setFormHeureArrivee(e.target.value)}
                    className="border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex space-x-1">
                    {['07:30', '07:45', '08:00', '08:15', '08:30'].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setFormHeureArrivee(h)}
                        className="text-[10px] bg-white border border-amber-200 text-amber-800 px-2 py-1 rounded hover:bg-amber-100 cursor-pointer font-semibold"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Motif / Observation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motif / Observation {formStatut !== 'PRESENT' && <span className="text-amber-600">*</span>}
              </label>

              {/* Suggestions en 1 clic */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {MOTIFS_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setFormMotif(sug)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                      formMotif === sug
                        ? 'bg-slate-800 text-white border-slate-800 font-bold'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={formMotif}
                onChange={(e) => setFormMotif(e.target.value)}
                placeholder="Préciser le motif ou saisir une observation libre..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setFormMotif('');
                  setActiveTab('journee');
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer la présence</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ONGLET 3 : HISTORIQUE DES PRÉSENCES & STATISTIQUES */}
      {/* ==================================================================== */}
      {activeTab === 'historique' && (
        <div className="space-y-4">
          {/* Cartes de statistiques globales selon les filtres */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Total Saisies</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {historiqueStats.total}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-semibold text-emerald-600 uppercase">Présents</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                {historiqueStats.presents}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-semibold text-amber-600 uppercase">Retards</div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
                {historiqueStats.retards}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-semibold text-red-600 uppercase">Absences</div>
              <div className="text-xl sm:text-2xl font-black text-red-600 mt-0.5">
                {historiqueStats.absences}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-semibold text-purple-600 uppercase">Permissions</div>
              <div className="text-xl sm:text-2xl font-black text-purple-600 mt-0.5">
                {historiqueStats.permissions}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-semibold text-blue-600 uppercase">Taux Présence</div>
              <div className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5">
                {historiqueStats.tauxPresence} %
              </div>
            </div>
          </div>

          {/* Filtres multicritères */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span>Filtrer et rechercher dans l'historique</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Année scolaire */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Année scolaire
                </label>
                <select
                  value={histAnnee}
                  onChange={(e) => setHistAnnee(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Toutes les années</option>
                  {anneesDisponibles.map((a) => (
                    <option key={a.id} value={a.libelle}>
                      {a.libelle} {a.is_active ? '(En cours)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enseignant */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Enseignant
                </label>
                <select
                  value={histEnseignantId}
                  onChange={(e) => setHistEnseignantId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="TOUS">Tous les enseignants</option>
                  {enseignants.map((ens) => (
                    <option key={ens.id} value={ens.id}>
                      {ens.nom} {ens.prenom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Statut
                </label>
                <select
                  value={histStatut}
                  onChange={(e) => setHistStatut(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="TOUS">Tous les statuts</option>
                  <option value="PRESENT">PRÉSENT</option>
                  <option value="RETARD">RETARD</option>
                  <option value="ABSENCE">ABSENCE</option>
                  <option value="PERMISSION">PERMISSION</option>
                </select>
              </div>

              {/* Date Début */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Du (Date début)
                </label>
                <input
                  type="date"
                  value={histDateDebut}
                  onChange={(e) => setHistDateDebut(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Date Fin */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Au (Date fin)
                </label>
                <input
                  type="date"
                  value={histDateFin}
                  onChange={(e) => setHistDateFin(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Recherche textuelle libre */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={histSearch}
                onChange={(e) => setHistSearch(e.target.value)}
                placeholder="Rechercher par nom d'enseignant, matière, motif ou observation..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Tableau / Liste de l'historique */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center space-x-2">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Enregistrements de présence ({filteredHistorique.length})</span>
              </h3>
              {(histEnseignantId !== 'TOUS' || histStatut !== 'TOUS' || histDateDebut || histDateFin || histSearch) && (
                <button
                  onClick={() => {
                    setHistEnseignantId('TOUS');
                    setHistStatut('TOUS');
                    setHistDateDebut('');
                    setHistDateFin('');
                    setHistSearch('');
                  }}
                  className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>

            {filteredHistorique.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun enregistrement ne correspond aux critères sélectionnés.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">Enseignant</th>
                      <th className="px-3.5 py-2.5">Matière(s) attribuée(s)</th>
                      <th className="px-3.5 py-2.5">Statut</th>
                      <th className="px-3.5 py-2.5">Heure / Motif</th>
                      <th className="px-3.5 py-2.5">Année</th>
                      <th className="px-3.5 py-2.5">Enregistré par</th>
                      {canManage && <th className="px-3.5 py-2.5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistorique.map((p) => {
                      // Récupération fidèle : priorité au snapshot enregistré lors de la saisie (historique préservé),
                      // sinon déduction depuis l'attribution réelle de cette année historique.
                      const matieresAffichees = p.matieres_attribuees || storage.getMatieresAttribueesLabel(p.enseignant_id, p.annee_scolaire);
                      const hasMat = matieresAffichees !== 'Aucune matière attribuée';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-900">
                            {new Date(p.date + 'T12:00:00Z').toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {p.enseignant_nom}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {hasMat ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                                <BookOpen className="w-3 h-3 mr-1 text-blue-600 shrink-0" />
                                {matieresAffichees}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200 italic">
                                <AlertCircle className="w-3 h-3 mr-1 text-amber-600 shrink-0" />
                                Aucune matière attribuée
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.statut === 'PRESENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.statut === 'RETARD'
                                  ? 'bg-amber-100 text-amber-800'
                                  : p.statut === 'ABSENCE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              <span>{p.statut}</span>
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600 max-w-xs truncate">
                            {p.heure_arrivee && (
                              <span className="font-semibold text-amber-800 mr-1.5">
                                [Arrivée : {p.heure_arrivee}]
                              </span>
                            )}
                            {p.motif || '—'}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                            {p.annee_scolaire}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                            <div>{p.enregistre_par_nom}</div>
                            <div className="text-[9px] text-slate-400">
                              {new Date(p.updated_at || p.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          {canManage && (
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => {
                                    setEditingPresence({
                                      id: p.id,
                                      enseignant_id: p.enseignant_id,
                                      enseignant_nom: p.enseignant_nom,
                                      annee_scolaire: p.annee_scolaire,
                                      date: p.date,
                                      statut: p.statut,
                                      motif: p.motif || '',
                                      heure_arrivee: p.heure_arrivee || '',
                                    });
                                  }}
                                  className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                                  title="Modifier l'enregistrement"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePresence(p.id, p.enseignant_nom)}
                                  className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE MODIFICATION / CORRECTION D'UNE PRÉSENCE (RÉSERVÉE AU CENSEUR) */}
      {/* ==================================================================== */}
      {editingPresence && canManage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-emerald-400" />
                  <span>Corriger / Modifier la présence</span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {editingPresence.enseignant_nom} — {editingPresence.date} ({editingPresence.annee_scolaire || selectedAnnee})
                </p>
              </div>
              <button
                onClick={() => setEditingPresence(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Rappel de la matière attribuée */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Matière(s) attribuée(s) :</span>
                {(() => {
                  const mats = storage.getMatieresAttribueesLabel(
                    editingPresence.enseignant_id,
                    editingPresence.annee_scolaire || selectedAnnee
                  );
                  return mats !== 'Aucune matière attribuée' ? (
                    <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center">
                      <BookOpen className="w-3 h-3 mr-1 text-blue-600" />
                      {mats}
                    </span>
                  ) : (
                    <span className="font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 italic flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                      Aucune matière attribuée
                    </span>
                  );
                })()}
              </div>

              {/* Statut */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Statut *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PRESENT', 'RETARD', 'ABSENCE', 'PERMISSION'] as StatutPresenceEnseignant[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setEditingPresence({
                          ...editingPresence,
                          statut: st,
                        })
                      }
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                        editingPresence.statut === st
                          ? st === 'PRESENT'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'RETARD'
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : st === 'ABSENCE'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-purple-600 text-white border-purple-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Heure d'arrivée si RETARD */}
              {editingPresence.statut === 'RETARD' && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Heure d'arrivée *</span>
                  </label>
                  <input
                    type="time"
                    value={editingPresence.heure_arrivee}
                    onChange={(e) =>
                      setEditingPresence({
                        ...editingPresence,
                        heure_arrivee: e.target.value,
                      })
                    }
                    className="w-full border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Motif / Observation */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Motif / Observation
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {MOTIFS_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() =>
                        setEditingPresence({
                          ...editingPresence,
                          motif: sug,
                        })
                      }
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                        editingPresence.motif === sug
                          ? 'bg-slate-800 text-white border-slate-800 font-bold'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={editingPresence.motif}
                  onChange={(e) =>
                    setEditingPresence({
                      ...editingPresence,
                      motif: e.target.value,
                    })
                  }
                  placeholder="Saisie libre du motif ou de l'observation..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingPresence(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-white cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Valider la modification</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
