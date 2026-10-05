import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { ProfesseurPrincipal, UserProfile, Classe } from '../../types';
import { 
  UserCheck, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  School, 
  GraduationCap, 
  X, 
  ShieldCheck, 
  Trash2,
  ArrowLeft,
  Edit3
} from 'lucide-react';

export interface GestionProfesseursPrincipauxProps {
  onBack?: () => void;
}

export const GestionProfesseursPrincipaux: React.FC<GestionProfesseursPrincipauxProps> = ({ onBack }) => {
  const { currentUser, isCenseur, isConcepteur, isDirecteur } = useAuth();
  const { selectedAnnee: activeAnneeObj, activeAnnee } = useAnnee();
  const canManage = isCenseur || isConcepteur || isDirecteur || currentUser?.role === 'CENSEUR' || currentUser?.role === 'CONCEPTEUR' || currentUser?.role === 'DIRECTEUR_GENERAL';

  // Extraction garantie en chaîne de caractères du libellé de l'année scolaire
  const currentAnneeLibelle = 
    (typeof activeAnneeObj === 'object' && activeAnneeObj?.libelle) 
      ? activeAnneeObj.libelle 
      : (typeof activeAnnee === 'object' && activeAnnee?.libelle)
        ? activeAnnee.libelle
        : storage.getParametres().annee_academique || '2026–2027';

  const anneesDisponibles = storage.getAnneesScolaires();

  // Année sélectionnée pour la consultation et attribution
  const [selectedAnnee, setSelectedAnnee] = useState<string>(currentAnneeLibelle);

  // Synchronisation si l'année change dans le contexte global
  useEffect(() => {
    if (activeAnneeObj && typeof activeAnneeObj === 'object' && activeAnneeObj.libelle) {
      setSelectedAnnee(activeAnneeObj.libelle);
    }
  }, [activeAnneeObj]);

  // État de rafraîchissement
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Filtres
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statutFilter, setStatutFilter] = useState<'TOUS' | 'ACTIF' | 'CLOTURE'>('ACTIF');

  // Messages de retour
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal d'attribution
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [formProfileId, setFormProfileId] = useState<string>('');
  const [formClasseId, setFormClasseId] = useState<string>('');
  const [formDateNomination, setFormDateNomination] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal de modification
  const [editingPP, setEditingPP] = useState<ProfesseurPrincipal | null>(null);
  const [editProfileId, setEditProfileId] = useState<string>('');
  const [editClasseId, setEditClasseId] = useState<string>('');
  const [editDateNomination, setEditDateNomination] = useState<string>('');

  // Modal de retrait / clôture
  const [retiringPP, setRetiringPP] = useState<ProfesseurPrincipal | null>(null);
  const [retireMotif, setRetireMotif] = useState<string>('Fin de mandat normal / Réorganisation pédagogique');

  // Modal de suppression
  const [deletingPP, setDeletingPP] = useState<ProfesseurPrincipal | null>(null);

  // Données chargées
  const allProfiles = useMemo(() => storage.getProfiles(), [refreshKey]);
  const classes = useMemo(() => storage.getClasses(), []);
  const allPP = useMemo(() => storage.getProfesseursPrincipaux(), [refreshKey]);

  // Enseignants éligibles (rôle ENSEIGNANT ou is_enseignant = true ou ayant une matière/attribution, statut ACTIF)
  const enseignants = useMemo(() => {
    return allProfiles
      .filter((p) => (p.is_enseignant || p.role === 'ENSEIGNANT' || (p.matiere && p.matiere.trim().length > 0)) && p.statut === 'ACTIF')
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [allProfiles]);

  // PP filtrés par année scolaire
  const ppForYear = useMemo(() => {
    const targetNorm = (selectedAnnee || '2026–2027').replace(/[-—–]/g, '-').trim();
    return allPP.filter((p) => (p.annee_scolaire || '').replace(/[-—–]/g, '-').trim() === targetNorm);
  }, [allPP, selectedAnnee]);

  // Vérifications temps réel pour le formulaire d'attribution
  const conflictTeacher = useMemo(() => {
    if (!formProfileId) return null;
    return ppForYear.find((p) => p.profile_id === formProfileId && p.statut === 'ACTIF');
  }, [ppForYear, formProfileId]);

  const conflictClass = useMemo(() => {
    if (!formClasseId) return null;
    return ppForYear.find((p) => p.classe_id === formClasseId && p.statut === 'ACTIF');
  }, [ppForYear, formClasseId]);

  // Vérifications temps réel pour la modification
  const conflictEditTeacher = useMemo(() => {
    if (!editingPP || !editProfileId) return null;
    return ppForYear.find((p) => p.id !== editingPP.id && p.profile_id === editProfileId && p.statut === 'ACTIF');
  }, [ppForYear, editingPP, editProfileId]);

  const conflictEditClass = useMemo(() => {
    if (!editingPP || !editClasseId) return null;
    return ppForYear.find((p) => p.id !== editingPP.id && p.classe_id === editClasseId && p.statut === 'ACTIF');
  }, [ppForYear, editingPP, editClasseId]);

  // Liste filtrée selon recherche et statut
  const filteredList = useMemo(() => {
    return ppForYear.filter((p) => {
      if (statutFilter !== 'TOUS' && p.statut !== statutFilter) return false;

      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase().trim();
        const prof = allProfiles.find((u) => u.id === p.profile_id);
        const cls = classes.find((c) => c.id === p.classe_id);
        const matchProf = prof ? `${prof.nom} ${prof.prenom}`.toLowerCase().includes(s) : false;
        const matchClass = cls ? cls.nom.toLowerCase().includes(s) : false;
        return matchProf || matchClass;
      }
      return true;
    }).sort((a, b) => {
      if (a.statut !== b.statut) return a.statut === 'ACTIF' ? -1 : 1;
      const clsA = classes.find((c) => c.id === a.classe_id)?.nom || '';
      const clsB = classes.find((c) => c.id === b.classe_id)?.nom || '';
      return clsA.localeCompare(clsB);
    });
  }, [ppForYear, statutFilter, searchTerm, allProfiles, classes]);

  // Statistiques de l'année sélectionnée
  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const activePPList = ppForYear.filter((p) => p.statut === 'ACTIF');
    const classesPourvues = new Set(activePPList.map((p) => p.classe_id)).size;
    const classesSansPP = Math.max(0, totalClasses - classesPourvues);
    const totalEnseignantsPP = new Set(activePPList.map((p) => p.profile_id)).size;
    return { totalClasses, classesPourvues, classesSansPP, totalEnseignantsPP, totalHistorique: ppForYear.length };
  }, [classes, ppForYear]);

  // Ouvrir modal d'attribution avec sélection par défaut
  const handleOpenAssign = () => {
    const activeTeacherIds = new Set(ppForYear.filter((p) => p.statut === 'ACTIF').map((p) => p.profile_id));
    const firstFreeTeacher = enseignants.find((e) => !activeTeacherIds.has(e.id));

    const activeClassIds = new Set(ppForYear.filter((p) => p.statut === 'ACTIF').map((p) => p.classe_id));
    const firstFreeClass = classes.find((c) => !activeClassIds.has(c.id));

    setFormProfileId(firstFreeTeacher?.id || enseignants[0]?.id || '');
    setFormClasseId(firstFreeClass?.id || classes[0]?.id || '');
    setFormDateNomination(new Date().toISOString().split('T')[0]);
    setIsAssignModalOpen(true);
  };

  // Soumission attribution
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !canManage) return;

    if (!formProfileId || !formClasseId) {
      setFeedback({ type: 'error', message: 'Veuillez sélectionner un enseignant et une classe valides.' });
      return;
    }

    try {
      await storage.assignProfesseurPrincipal(
        {
          profile_id: formProfileId,
          classe_id: formClasseId,
          annee_scolaire: selectedAnnee,
          date_nomination: formDateNomination,
        },
        currentUser
      );

      const prof = allProfiles.find((u) => u.id === formProfileId);
      const cls = classes.find((c) => c.id === formClasseId);

      setRefreshKey((k) => k + 1);
      setIsAssignModalOpen(false);
      setFeedback({
        type: 'success',
        message: `✓ ${prof?.nom} ${prof?.prenom} a été désigné(e) avec succès Professeur Principal de ${cls?.nom} pour l'année ${selectedAnnee}.`,
      });
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || "Erreur lors de l'attribution." });
    }
  };

  // Ouvrir modal de modification
  const handleOpenEdit = (pp: ProfesseurPrincipal) => {
    setEditingPP(pp);
    setEditProfileId(pp.profile_id);
    setEditClasseId(pp.classe_id);
    setEditDateNomination(pp.date_nomination || new Date(pp.created_at).toISOString().split('T')[0]);
  };

  // Soumission modification
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPP || !currentUser || !canManage) return;

    try {
      await storage.updateProfesseurPrincipal(
        editingPP.id,
        {
          profile_id: editProfileId,
          classe_id: editClasseId,
          date_nomination: editDateNomination,
        },
        currentUser
      );

      const prof = allProfiles.find((u) => u.id === editProfileId);
      const cls = classes.find((c) => c.id === editClasseId);

      setRefreshKey((k) => k + 1);
      setEditingPP(null);
      setFeedback({
        type: 'success',
        message: `✓ Attribution mise à jour avec succès : ${prof?.nom} ${prof?.prenom} est Professeur Principal de ${cls?.nom}.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erreur lors de la modification.' });
    }
  };

  // Clôture / Retrait
  const handleConfirmRetire = async () => {
    if (!retiringPP || !currentUser || !canManage) return;

    try {
      await storage.retirerProfesseurPrincipal(retiringPP.id, currentUser, retireMotif);
      setRefreshKey((k) => k + 1);
      setRetiringPP(null);
      setFeedback({
        type: 'success',
        message: "✓ L'attribution de Professeur Principal a été retirée. L'historique est fidèlement conservé.",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erreur lors du retrait.' });
    }
  };

  // Suppression définitive (en cas d'erreur de saisie accidentelle)
  const handleDeletePP = (pp: ProfesseurPrincipal) => {
    if (!currentUser || !canManage) return;
    setDeletingPP(pp);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPP || !currentUser || !canManage) return;
    try {
      await storage.deleteProfesseurPrincipal(deletingPP.id, currentUser);
      setRefreshKey((k) => k + 1);
      setDeletingPP(null);
      setFeedback({ type: 'success', message: 'Désignation supprimée avec succès.' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erreur lors de la suppression.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête officiel du module */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-xl p-5 sm:p-6 shadow-md border border-indigo-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Module Direction Pédagogique
              </span>
              <span className="text-indigo-300 text-xs">• Année scolaire {selectedAnnee}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1 text-white flex items-center space-x-2">
              <UserCheck className="w-6 h-6 text-indigo-400" />
              <span>GESTION DES PROFESSEURS PRINCIPAUX</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              Désignation des enseignants comme Professeurs Principaux de classes spécifiques.
              Règle absolue : <strong>1 Enseignant = 1 seule classe PP</strong> par année scolaire, et <strong>1 Classe = 1 seul PP actif</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-retour-censeur"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  window.history.back();
                }
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer border border-slate-700"
              title="Revenir à l'espace Censeur"
            >
              <ArrowLeft className="w-4 h-4 text-slate-300" />
              <span>← Retour</span>
            </button>

            {canManage && (
              <button
                id="btn-assigner-nouveau-pp"
                onClick={handleOpenAssign}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Désigner un Professeur Principal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification feedback */}
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
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-500 uppercase">Classes Officielles</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-baseline justify-between">
            <span>{stats.totalClasses}</span>
            <span className="text-[11px] font-normal text-slate-400">Total CEG</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-semibold text-emerald-600 uppercase">Classes Pourvues en PP</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 flex items-baseline justify-between">
            <span>{stats.classesPourvues}</span>
            <span className="text-[11px] font-bold text-emerald-600">
              {stats.totalClasses > 0 ? Math.round((stats.classesPourvues / stats.totalClasses) * 100) : 0} %
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-semibold text-amber-600 uppercase">Classes Sans PP</div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1 flex items-baseline justify-between">
            <span>{stats.classesSansPP}</span>
            <span className="text-[11px] font-normal text-amber-700">À désigner</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-semibold text-indigo-600 uppercase">PP Actifs Désignés</div>
          <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1 flex items-baseline justify-between">
            <span>{stats.totalEnseignantsPP}</span>
            <span className="text-[11px] font-normal text-indigo-500">Enseignants</span>
          </div>
        </div>
      </div>

      {/* Barre de contrôles & Filtres */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Sélecteur de l'année scolaire */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-slate-600">Année :</span>
            <select
              value={selectedAnnee}
              onChange={(e) => setSelectedAnnee(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {anneesDisponibles.map((a) => (
                <option key={a.id} value={a.libelle}>
                  {a.libelle} {a.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par statut */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setStatutFilter('ACTIF')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                statutFilter === 'ACTIF' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Actifs ({ppForYear.filter((p) => p.statut === 'ACTIF').length})
            </button>
            <button
              onClick={() => setStatutFilter('CLOTURE')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                statutFilter === 'CLOTURE' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Historique Clôturé ({ppForYear.filter((p) => p.statut === 'CLOTURE').length})
            </button>
            <button
              onClick={() => setStatutFilter('TOUS')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                statutFilter === 'TOUS' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({ppForYear.length})
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher enseignant, classe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tableau récapitulatif des attributions PP */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center space-x-2">
            <School className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              Professeurs Principaux désignés — Année {selectedAnnee} ({filteredList.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Règle stricte : 1 Enseignant = 1 seule classe PP • 1 Classe = 1 seul PP actif
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            {searchTerm || statutFilter !== 'TOUS'
              ? 'Aucune attribution ne correspond aux filtres actuels.'
              : `Aucun Professeur Principal n'est actuellement enregistré pour l'année scolaire ${selectedAnnee}.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5">Classe</th>
                  <th className="px-3.5 py-2.5">Professeur Principal (PP)</th>
                  <th className="px-3.5 py-2.5">Matière(s) de l'enseignant</th>
                  <th className="px-3.5 py-2.5">Année Scolaire</th>
                  <th className="px-3.5 py-2.5">Statut</th>
                  <th className="px-3.5 py-2.5">Date de désignation</th>
                  {canManage && <th className="px-3.5 py-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((pp) => {
                  const teacher = allProfiles.find((u) => u.id === pp.profile_id);
                  const cls = classes.find((c) => c.id === pp.classe_id);
                  const isActif = pp.statut === 'ACTIF';
                  const matieresEnseignant = teacher
                    ? storage.getMatieresAttribueesLabel(teacher.id, pp.annee_scolaire)
                    : '—';

                  return (
                    <tr key={pp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Classe */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {cls?.nom || pp.classe_id}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {cls?.niveau} {cls?.serie ? `(${cls.serie})` : ''}
                        </span>
                      </td>

                      {/* Enseignant */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="font-bold text-indigo-950 flex items-center space-x-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{teacher ? `${teacher.nom} ${teacher.prenom}` : 'Enseignant inconnu'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {teacher?.email} {teacher?.telephone ? `• ${teacher.telephone}` : ''}
                        </div>
                      </td>

                      {/* Matières attribuées */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="text-[11px] text-slate-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium">
                          {matieresEnseignant}
                        </span>
                      </td>

                      {/* Année scolaire */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-semibold text-slate-700">
                        {pp.annee_scolaire}
                      </td>

                      {/* Statut */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActif
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActif ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                          <span>{isActif ? 'PP ACTIF' : 'CLÔTURÉ'}</span>
                        </span>
                      </td>

                      {/* Période d'exercice / Date de désignation */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 text-[11px]">
                        <div>Désigné le : {pp.date_nomination || new Date(pp.created_at).toLocaleDateString('fr-FR')}</div>
                        {pp.date_fin && (
                          <div className="text-[10px] text-slate-400">
                            Fin : {pp.date_fin} {pp.motif_fin ? `(${pp.motif_fin})` : ''}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {isActif ? (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(pp)}
                                  className="px-2 py-1 text-xs font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer flex items-center space-x-1"
                                  title="Modifier cette désignation"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Modifier</span>
                                </button>

                                <button
                                  id={`btn-retirer-pp-${pp.id}`}
                                  onClick={() => {
                                    setRetiringPP(pp);
                                    setRetireMotif('Fin de mandat / Réorganisation pédagogique par le Censeur');
                                  }}
                                  className="px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
                                  title="Retirer cette attribution tout en conservant l'historique"
                                >
                                  Retirer la désignation
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Historique</span>
                            )}

                            <button
                              onClick={() => handleDeletePP(pp)}
                              className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                              title="Supprimer définitivement (erreur de saisie)"
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

      {/* Rappel des règles du Ministère & Direction Pédagogique */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 space-y-1.5">
        <div className="font-bold flex items-center space-x-1.5 text-indigo-950">
          <ShieldCheck className="w-4 h-4 text-indigo-700" />
          <span>Règles officielles de désignation des Professeurs Principaux (CEG GOGBO)</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-indigo-800 pl-1">
          <li><strong>Règle d'exclusivité stricte :</strong> Un enseignant ne peut être Professeur Principal que d'une seule classe active pour une même année scolaire.</li>
          <li><strong>Exclusivité par classe :</strong> Chaque classe ne dispose que d'un seul Professeur Principal actif pour l'année en cours.</li>
          <li><strong>Prérogatives du PP :</strong> Le Professeur Principal accède à son module dédié pour administrer et inscrire les apprenants de sa classe.</li>
          <li><strong>Sécurité & limitation :</strong> Le Professeur Principal ne peut en aucun cas modifier les notes, les coefficients ou administrer les élèves d'autres classes.</li>
        </ul>
      </div>

      {/* ==================================================================== */}
      {/* MODAL D'ATTRIBUTION D'UN PROFESSEUR PRINCIPAL */}
      {/* ==================================================================== */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold">Désigner un Professeur Principal</h3>
                  <p className="text-[11px] text-slate-300">Année scolaire : {selectedAnnee}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-5 space-y-4">
              {/* Enseignant */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Enseignant à désigner *
                </label>
                <select
                  value={formProfileId}
                  onChange={(e) => setFormProfileId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Sélectionner un enseignant...</option>
                  {enseignants.map((ens) => {
                    const alreadyPP = ppForYear.find((p) => p.profile_id === ens.id && p.statut === 'ACTIF');
                    const alreadyClass = alreadyPP ? classes.find((c) => c.id === alreadyPP.classe_id)?.nom : null;
                    return (
                      <option key={ens.id} value={ens.id}>
                        {ens.nom} {ens.prenom} {alreadyPP ? `⚠️ Déjà PP (${alreadyClass})` : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Avertissement si l'enseignant est déjà PP */}
                {conflictTeacher && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>⚠️ Enseignant déjà Professeur Principal :</strong> Cet enseignant est déjà désigné Professeur Principal de la classe <strong>{classes.find((c) => c.id === conflictTeacher.classe_id)?.nom || conflictTeacher.classe_id}</strong> pour l'année scolaire <strong>{selectedAnnee}</strong>.
                      <p className="mt-1 text-[11px] text-amber-800">
                        La règle absolue exige qu'un enseignant ne soit PP que d'une seule classe par année. Veuillez d'abord retirer ou clôturer son attribution actuelle.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Classe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Classe assignée *
                </label>
                <select
                  value={formClasseId}
                  onChange={(e) => setFormClasseId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Sélectionner une classe...</option>
                  {classes.map((cls) => {
                    const alreadyPP = ppForYear.find((p) => p.classe_id === cls.id && p.statut === 'ACTIF');
                    const profPP = alreadyPP ? allProfiles.find((u) => u.id === alreadyPP.profile_id) : null;
                    return (
                      <option key={cls.id} value={cls.id}>
                        {cls.nom} ({cls.niveau}) {alreadyPP ? `⚠️ Déjà pourvue (${profPP?.nom || 'PP actif'})` : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Avertissement si la classe est déjà pourvue */}
                {conflictClass && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>⚠️ Classe déjà pourvue :</strong> Cette classe possède déjà pour Professeur Principal actif : <strong>{allProfiles.find((u) => u.id === conflictClass.profile_id)?.nom} {allProfiles.find((u) => u.id === conflictClass.profile_id)?.prenom}</strong>.
                      <p className="mt-1 text-[11px] text-amber-800">
                        Une classe ne peut avoir qu'un seul PP actif. Veuillez d'abord retirer l'attribution actuelle pour la réassigner.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Année scolaire & date de nomination */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Année scolaire
                  </label>
                  <input
                    type="text"
                    value={selectedAnnee}
                    disabled
                    className="w-full border border-slate-200 bg-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Date de désignation
                  </label>
                  <input
                    type="date"
                    value={formDateNomination}
                    onChange={(e) => setFormDateNomination(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Actions du formulaire */}
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!!conflictTeacher || !!conflictClass}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm ${
                    conflictTeacher || conflictClass
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Confirmer la désignation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE MODIFICATION D'UNE DÉSIGNATION */}
      {/* ==================================================================== */}
      {editingPP && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-indigo-300" />
                <div>
                  <h3 className="text-sm font-bold">Modifier la désignation du Professeur Principal</h3>
                  <p className="text-[11px] text-indigo-200">Année scolaire : {editingPP.annee_scolaire}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPP(null)}
                className="text-indigo-200 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {/* Enseignant */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Enseignant désigné *
                </label>
                <select
                  value={editProfileId}
                  onChange={(e) => setEditProfileId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {enseignants.map((ens) => {
                    const alreadyPP = ppForYear.find((p) => p.id !== editingPP.id && p.profile_id === ens.id && p.statut === 'ACTIF');
                    const alreadyClass = alreadyPP ? classes.find((c) => c.id === alreadyPP.classe_id)?.nom : null;
                    return (
                      <option key={ens.id} value={ens.id}>
                        {ens.nom} {ens.prenom} {alreadyPP ? `⚠️ Déjà PP (${alreadyClass})` : ''}
                      </option>
                    );
                  })}
                </select>

                {conflictEditTeacher && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>⚠️ Enseignant déjà PP d'une autre classe :</strong> Cet enseignant est déjà désigné Professeur Principal de la classe <strong>{classes.find((c) => c.id === conflictEditTeacher.classe_id)?.nom}</strong>.
                    </div>
                  </div>
                )}
              </div>

              {/* Classe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Classe assignée *
                </label>
                <select
                  value={editClasseId}
                  onChange={(e) => setEditClasseId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {classes.map((cls) => {
                    const alreadyPP = ppForYear.find((p) => p.id !== editingPP.id && p.classe_id === cls.id && p.statut === 'ACTIF');
                    const profPP = alreadyPP ? allProfiles.find((u) => u.id === alreadyPP.profile_id) : null;
                    return (
                      <option key={cls.id} value={cls.id}>
                        {cls.nom} ({cls.niveau}) {alreadyPP ? `⚠️ Déjà pourvue (${profPP?.nom})` : ''}
                      </option>
                    );
                  })}
                </select>

                {conflictEditClass && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>⚠️ Classe déjà pourvue :</strong> Cette classe possède déjà un PP actif différent.
                    </div>
                  </div>
                )}
              </div>

              {/* Date de nomination */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Date de désignation
                </label>
                <input
                  type="date"
                  value={editDateNomination}
                  onChange={(e) => setEditDateNomination(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Actions du formulaire */}
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingPP(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!!conflictEditTeacher || !!conflictEditClass}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm ${
                    conflictEditTeacher || conflictEditClass
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE CLÔTURE / RETRAIT */}
      {/* ==================================================================== */}
      {retiringPP && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-amber-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <h3 className="text-sm font-bold">Retirer l'attribution de Professeur Principal</h3>
              </div>
              <button onClick={() => setRetiringPP(null)} className="text-amber-200 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-950 font-bold text-xs">
                « Voulez-vous réellement retirer la désignation de cet enseignant comme Professeur Principal ? »
              </div>

              <p className="text-xs text-slate-700">
                Vous êtes sur le point de mettre fin aux fonctions de Professeur Principal de{' '}
                <strong>
                  {allProfiles.find((u) => u.id === retiringPP.profile_id)?.nom}{' '}
                  {allProfiles.find((u) => u.id === retiringPP.profile_id)?.prenom}
                </strong>{' '}
                pour la classe de{' '}
                <strong>
                  {classes.find((c) => c.id === retiringPP.classe_id)?.nom}
                </strong>{' '}
                ({retiringPP.annee_scolaire}).
              </p>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                L'historique complet de cette attribution sera conservé avec la date de fin. La classe pourra ensuite être attribuée à un autre enseignant.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motif du retrait
                </label>
                <input
                  type="text"
                  value={retireMotif}
                  onChange={(e) => setRetireMotif(e.target.value)}
                  placeholder="Ex: Réorganisation pédagogique, mutation, congé..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRetiringPP(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRetire}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Confirmer le retrait
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE SUPPRESSION DÉFINITIVE */}
      {/* ==================================================================== */}
      {deletingPP && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-red-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-red-300" />
                <h3 className="text-sm font-bold">Supprimer la désignation</h3>
              </div>
              <button onClick={() => setDeletingPP(null)} className="text-red-200 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700">
                Confirmez-vous la suppression définitive de l'enregistrement de Professeur Principal de{' '}
                <strong>
                  {allProfiles.find((u) => u.id === deletingPP.profile_id)?.nom}{' '}
                  {allProfiles.find((u) => u.id === deletingPP.profile_id)?.prenom}
                </strong>{' '}
                pour la classe de{' '}
                <strong>
                  {classes.find((c) => c.id === deletingPP.classe_id)?.nom}
                </strong>{' '}
                ({deletingPP.annee_scolaire}) ?
              </p>
              <p className="text-[11px] text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200">
                Attention : Cette action est strictement réservée à la correction immédiate d'une erreur de saisie sans historique à conserver.
              </p>
              <div className="pt-2 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeletingPP(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Confirmer la suppression
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
