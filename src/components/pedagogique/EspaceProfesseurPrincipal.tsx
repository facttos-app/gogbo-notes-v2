import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { Eleve, LangueOption, Sexe, NoteConduite, NoteConduiteHistorique, Periode } from '../../types';
import { 
  UserCheck, 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ShieldCheck, 
  ArrowLeft,
  GraduationCap,
  Calendar,
  Phone,
  Eye,
  Award,
  History,
  Check,
  FileText
} from 'lucide-react';

interface EspaceProfesseurPrincipalProps {
  onBack?: () => void;
}

export const EspaceProfesseurPrincipal: React.FC<EspaceProfesseurPrincipalProps> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const { selectedAnnee: anneeObj, activeAnnee } = useAnnee();

  const anneeLibelle = 
    (typeof anneeObj === 'object' && anneeObj?.libelle) 
      ? anneeObj.libelle 
      : (typeof activeAnnee === 'object' && activeAnnee?.libelle)
        ? activeAnnee.libelle
        : storage.getParametres().annee_academique || '2026–2027';

  // 1. VÉRIFICATION STRICTE DE SÉCURITÉ : L'enseignant doit être désigné PP ACTIF
  const ppAssignment = useMemo(() => {
    if (!currentUser) return null;
    return storage.getActiveProfesseurPrincipalByEnseignant(currentUser.id, anneeLibelle);
  }, [currentUser, anneeLibelle]);

  const classePP = useMemo(() => {
    if (!ppAssignment) return null;
    return storage.getClasseById(ppAssignment.classe_id);
  }, [ppAssignment]);

  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Onglet de l'Espace PP : Registre des élèves OU Note de Conduite
  const [activeTabPP, setActiveTabPP] = useState<'eleves' | 'conduite'>('eleves');

  // Périodes scolaires pour la note de conduite
  const periodes = useMemo(() => storage.getPeriodesByAnnee(anneeLibelle), [anneeLibelle]);
  const activePeriode = useMemo(() => {
    return periodes.find((p) => p.is_active) || periodes[0] || storage.getActivePeriode();
  }, [periodes]);
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>(activePeriode?.id || '');

  // Modals pour la conduite
  const [editingConduiteEleve, setEditingConduiteEleve] = useState<Eleve | null>(null);
  const [conduiteNoteInput, setConduiteNoteInput] = useState<number>(15);
  const [conduiteApprecInput, setConduiteApprecInput] = useState<string>('Bonne conduite');
  const [conduiteMotifInput, setConduiteMotifInput] = useState<string>('');
  const [viewingHistoryNote, setViewingHistoryNote] = useState<NoteConduite | null>(null);

  // Modals Elèves
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEleve, setEditingEleve] = useState<Eleve | null>(null);
  const [viewingEleve, setViewingEleve] = useState<Eleve | null>(null);

  // Form states
  const [matricule, setMatricule] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [sexe, setSexe] = useState<Sexe>('M');
  const [dateNaissance, setDateNaissance] = useState('2012-01-01');
  const [lieuNaissance, setLieuNaissance] = useState('');
  const [lv2, setLv2] = useState<LangueOption>('AUCUNE');
  const [nomParent, setNomParent] = useState('');
  const [contactParent, setContactParent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Récupérer UNIQUEMENT les élèves de la classe PP (Isolation étanche)
  const elevesClasse = useMemo(() => {
    if (!classePP) return [];
    const all = storage.getEleves();
    return all.filter((e) => e.classe_id === classePP.id);
  }, [classePP, refreshKey]);

  // Filtrage recherche
  const filteredEleves = useMemo(() => {
    return elevesClasse.filter((e) => {
      if (!searchTerm.trim()) return true;
      const s = searchTerm.toLowerCase().trim();
      const matchNom = `${e.nom} ${e.prenom}`.toLowerCase().includes(s);
      const matchMatricule = e.matricule.toLowerCase().includes(s);
      return matchNom || matchMatricule;
    }).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [elevesClasse, searchTerm]);

  // Statistiques de la classe
  const stats = useMemo(() => {
    const total = elevesClasse.length;
    const filles = elevesClasse.filter((e) => e.sexe === 'F').length;
    const garcons = elevesClasse.filter((e) => e.sexe === 'M').length;
    const placesRestantes = Math.max(0, 100 - total);
    return { total, filles, garcons, placesRestantes };
  }, [elevesClasse]);

  // SÉCURITÉ : Si l'utilisateur n'est pas PP actif, affichage d'un écran d'accès refusé
  if (!currentUser || !ppAssignment || !classePP) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-6 sm:p-8 text-center max-w-2xl mx-auto my-8">
        <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold">Accès Restreint — Espace Professeur Principal</h2>
        <p className="text-xs sm:text-sm text-red-700 mt-2">
          Vous n'êtes actuellement désigné Professeur Principal d'aucune classe pour l'année scolaire <strong>{anneeLibelle}</strong>.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Seul le Censeur est habilité à attribuer la fonction de Professeur Principal d'une classe.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-5 inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Revenir à mon espace pédagogique</span>
          </button>
        )}
      </div>
    );
  }

  // Ouvrir modal d'inscription
  const openAddModal = () => {
    const nextNum = String(storage.getEleves().length + 1).padStart(4, '0');
    setMatricule(`GOGBO-2026-${nextNum}`);
    setNom('');
    setPrenom('');
    setSexe('M');
    setDateNaissance('2012-01-01');
    setLieuNaissance('');
    setLv2('AUCUNE');
    setNomParent('');
    setContactParent('');
    setIsAddModalOpen(true);
  };

  // Soumission inscription apprenant
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !matricule.trim()) {
      setFeedback({ type: 'error', message: 'Le nom, prénom et matricule sont obligatoires.' });
      return;
    }

    setIsSubmitting(true);
    try {
      storage.createEleve(
        {
          matricule: matricule.trim().toUpperCase(),
          nom: nom.trim().toUpperCase(),
          prenom: prenom.trim(),
          sexe,
          date_naissance: dateNaissance,
          lieu_naissance: lieuNaissance.trim(),
          classe_id: classePP.id,
          langue_vivante_2: lv2,
          nom_parent: nomParent.trim(),
          contact_parent: contactParent.trim(),
          statut: 'ACTIF',
        },
        currentUser
      );

      setRefreshKey((k) => k + 1);
      setIsAddModalOpen(false);
      setFeedback({
        type: 'success',
        message: `✓ L'apprenant(e) ${nom.toUpperCase()} ${prenom} a été inscrit(e) avec succès dans votre classe de ${classePP.nom}.`,
      });
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || "Erreur lors de l'inscription." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ouvrir modal de modification administrative
  const openEditModal = (el: Eleve) => {
    setEditingEleve(el);
    setMatricule(el.matricule);
    setNom(el.nom);
    setPrenom(el.prenom);
    setSexe(el.sexe);
    setDateNaissance(el.date_naissance || '');
    setLieuNaissance(el.lieu_naissance || '');
    setLv2(el.langue_vivante_2 || 'AUCUNE');
    setNomParent(el.nom_parent || '');
    setContactParent(el.contact_parent || '');
  };

  // Soumission modification
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEleve) return;

    setIsSubmitting(true);
    try {
      await storage.updateEleveAsync(
        editingEleve.id,
        {
          matricule: matricule.trim().toUpperCase(),
          nom: nom.trim().toUpperCase(),
          prenom: prenom.trim(),
          sexe,
          date_naissance: dateNaissance,
          lieu_naissance: lieuNaissance.trim(),
          classe_id: classePP.id, // Verrouillé sur la classe PP
          langue_vivante_2: lv2,
          nom_parent: nomParent.trim(),
          contact_parent: contactParent.trim(),
        },
        currentUser
      );

      setRefreshKey((k) => k + 1);
      setEditingEleve(null);
      setFeedback({
        type: 'success',
        message: `✓ Les informations administratives de ${nom.toUpperCase()} ${prenom} ont été mises à jour.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erreur lors de la modification.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSuggestedAppreciation = (note: number): string => {
    if (note >= 18) return 'Excellente conduite';
    if (note >= 16) return 'Très bonne conduite';
    if (note >= 14) return 'Bonne conduite';
    if (note >= 12) return 'Conduite assez bien';
    if (note >= 10) return 'Conduite passable';
    if (note >= 8) return 'Conduite insuffisante';
    return 'Mauvaise conduite';
  };

  const handleOpenConduiteModal = (el: Eleve) => {
    const existing = storage.getNoteConduiteEleve(el.id, selectedPeriodeId, anneeLibelle);
    if (existing) {
      setConduiteNoteInput(existing.note);
      setConduiteApprecInput(existing.appreciation);
      setConduiteMotifInput('');
    } else {
      setConduiteNoteInput(15);
      setConduiteApprecInput('Bonne conduite');
      setConduiteMotifInput('');
    }
    setEditingConduiteEleve(el);
  };

  const handleSaveConduite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConduiteEleve || !currentUser || !classePP) return;

    if (conduiteNoteInput < 0 || conduiteNoteInput > 20) {
      setFeedback({ type: 'error', message: 'La note de conduite doit être comprise entre 0 et 20.' });
      return;
    }

    try {
      storage.saveNoteConduite(
        {
          eleve_id: editingConduiteEleve.id,
          classe_id: classePP.id,
          periode_id: selectedPeriodeId,
          annee_scolaire: anneeLibelle,
          note: Number(conduiteNoteInput),
          appreciation: conduiteApprecInput.trim() || getSuggestedAppreciation(Number(conduiteNoteInput)),
          motif_modification: conduiteMotifInput.trim() || undefined,
        },
        currentUser
      );

      setRefreshKey((k) => k + 1);
      setEditingConduiteEleve(null);
      setFeedback({
        type: 'success',
        message: `✓ Note de conduite (${conduiteNoteInput}/20) enregistrée pour ${editingConduiteEleve.nom} ${editingConduiteEleve.prenom}.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erreur lors de la sauvegarde de la note de conduite.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Bannière Officielle Professeur Principal */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-xl p-5 sm:p-6 shadow-md border border-indigo-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1">
                <span>⭐ Espace Professeur Principal</span>
              </span>
              <span className="text-indigo-300 text-xs">• Année scolaire {anneeLibelle}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1 text-white flex items-center space-x-2">
              <UserCheck className="w-6 h-6 text-indigo-400" />
              <span>PROFESSEUR PRINCIPAL → {classePP.nom}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              Titulaire de classe : <strong>{currentUser.prenom} {currentUser.nom}</strong>.
              Vous administrez le registre des apprenants et les nouvelles inscriptions pour la classe de <strong>{classePP.nom}</strong> ({classePP.niveau}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4 text-slate-300" />
                <span>← Espace Pédagogique</span>
              </button>
            )}

            <button
              id="btn-pp-inscrire-apprenant"
              onClick={openAddModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Inscrire un apprenant ({classePP.nom})</span>
            </button>
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

      {/* Cartes statistiques de la classe */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-500 uppercase">Apprenants Inscrits</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-baseline justify-between">
            <span>{stats.total}</span>
            <span className="text-[11px] font-normal text-slate-400">Total classe</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-semibold text-pink-600 uppercase">Filles (F)</div>
          <div className="text-xl sm:text-2xl font-black text-pink-700 mt-1 flex items-baseline justify-between">
            <span>{stats.filles}</span>
            <span className="text-[11px] font-bold text-pink-600">
              {stats.total > 0 ? Math.round((stats.filles / stats.total) * 100) : 0} %
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-semibold text-blue-600 uppercase">Garçons (M)</div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1 flex items-baseline justify-between">
            <span>{stats.garcons}</span>
            <span className="text-[11px] font-bold text-blue-600">
              {stats.total > 0 ? Math.round((stats.garcons / stats.total) * 100) : 0} %
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-semibold text-emerald-600 uppercase">Capacité / Places</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 flex items-baseline justify-between">
            <span>{stats.placesRestantes}</span>
            <span className="text-[11px] font-normal text-slate-400">/ 100 max</span>
          </div>
        </div>
      </div>

      {/* Sélecteur d'onglets Espace Professeur Principal */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-xl text-xs font-bold space-x-1">
        <button
          onClick={() => setActiveTabPP('eleves')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
            activeTabPP === 'eleves'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Registre des Apprenants ({elevesClasse.length})</span>
        </button>

        <button
          onClick={() => setActiveTabPP('conduite')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
            activeTabPP === 'conduite'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4 text-amber-600" />
          <span>Note de Conduite Officielle de la Classe</span>
        </button>
      </div>

      {/* VUE 1 : REGISTRE DES APPRENANTS */}
      {activeTabPP === 'eleves' && (
        <>
          {/* Barre de recherche & Filtres */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-800">
            Registre des apprenants de {classePP.nom} ({filteredEleves.length})
          </h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, matricule..."
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

      {/* Tableau des apprenants */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredEleves.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            {searchTerm
              ? 'Aucun apprenant ne correspond à votre recherche.'
              : `Aucun apprenant n'est encore inscrit dans la classe de ${classePP.nom}. Utilisez le bouton « Inscrire un apprenant » pour ajouter des élèves.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5">Matricule</th>
                  <th className="px-3.5 py-2.5">Nom & Prénoms</th>
                  <th className="px-3.5 py-2.5">Sexe</th>
                  <th className="px-3.5 py-2.5">Né(e) le</th>
                  <th className="px-3.5 py-2.5">LV2</th>
                  <th className="px-3.5 py-2.5">Parent / Contact</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEleves.map((el) => (
                  <tr key={el.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3.5 py-2.5 whitespace-nowrap font-mono font-bold text-slate-800">
                      {el.matricule}
                    </td>

                    <td className="px-3.5 py-2.5 whitespace-nowrap font-bold text-indigo-950">
                      {el.nom} {el.prenom}
                    </td>

                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          el.sexe === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {el.sexe === 'F' ? 'Fille' : 'Garçon'}
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 text-[11px]">
                      {el.date_naissance ? new Date(el.date_naissance).toLocaleDateString('fr-FR') : '—'}
                      {el.lieu_naissance && ` à ${el.lieu_naissance}`}
                    </td>

                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                        {el.langue_vivante_2 || 'AUCUNE'}
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5 whitespace-nowrap text-[11px] text-slate-600">
                      <div>{el.nom_parent || '—'}</div>
                      {el.contact_parent && (
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{el.contact_parent}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setViewingEleve(el)}
                          className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded cursor-pointer"
                          title="Voir la fiche détaillée"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openEditModal(el)}
                          className="px-2 py-1 text-xs font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer flex items-center space-x-1"
                          title="Modifier les informations administratives"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Modifier</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
    )}

      {/* VUE 2 : GESTION DE LA NOTE DE CONDUITE */}
      {activeTabPP === 'conduite' && (
        <div className="space-y-4">
          {/* Directive ministérielle officielle */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-2">
            <div className="flex items-center space-x-2 font-black text-amber-900 uppercase">
              <Award className="w-4 h-4 text-amber-700" />
              <span>RÈGLEMENT OFFICIEL DU CEG GOGBO : ATTRIBUTION EXCLUSIVE DE LA CONDUITE</span>
            </div>
            <p className="leading-relaxed text-amber-900">
              En tant que <strong>Professeur Principal de la classe de {classePP.nom}</strong>, vous êtes le seul responsable pédagogique habilité à renseigner la <strong>note de conduite</strong> des apprenants.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-semibold text-amber-950">
              <div className="bg-white/80 p-2 rounded border border-amber-200">
                ✓ <strong>Pas de devoirs ni d'interros :</strong> La conduite ne comporte aucune interrogation.
              </div>
              <div className="bg-white/80 p-2 rounded border border-amber-200">
                ✓ <strong>Pas de coefficient matière :</strong> N'influence pas le total des coefficients scolaires.
              </div>
              <div className="bg-white/80 p-2 rounded border border-amber-200">
                ✓ <strong>Traçabilité stricte :</strong> Toute modification est consignée dans l'historique officiel.
              </div>
            </div>
          </div>

          {/* Barre de sélection de la période */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <label className="text-xs font-bold text-slate-700">Période d'évaluation :</label>
              <select
                value={selectedPeriodeId}
                onChange={(e) => setSelectedPeriodeId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {periodes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.is_active ? '★ (Période active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              Classe : <strong className="text-slate-900">{classePP.nom}</strong> • Effectif : <strong className="text-slate-900">{elevesClasse.length} apprenants</strong>
            </div>
          </div>

          {/* Tableau des notes de conduite */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">Nom & Prénoms</th>
                    <th className="px-4 py-3 text-center">Sexe</th>
                    <th className="px-4 py-3 text-center">Note de Conduite</th>
                    <th className="px-4 py-3">Appréciation de Conduite</th>
                    <th className="px-4 py-3">Dernière mise à jour</th>
                    <th className="px-4 py-3 text-center">Historique</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {elevesClasse.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Aucun élève inscrit dans cette classe.
                      </td>
                    </tr>
                  ) : (
                    elevesClasse.map((el) => {
                      const noteEntry = storage.getNoteConduiteEleve(el.id, selectedPeriodeId, anneeLibelle);
                      const hasNote = noteEntry !== undefined;
                      const hasHistory = noteEntry?.historique && noteEntry.historique.length > 0;

                      return (
                        <tr key={el.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {el.matricule}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <span className="uppercase">{el.nom}</span> {el.prenom}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-600">
                            {el.sexe}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {hasNote ? (
                              <span className={`inline-block font-mono font-black text-sm px-2.5 py-0.5 rounded ${
                                noteEntry.note >= 14
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : noteEntry.note >= 10
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-rose-100 text-rose-900'
                              }`}>
                                {noteEntry.note.toFixed(1)} / 20
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Non noté</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {hasNote ? (
                              noteEntry.appreciation
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">
                            {hasNote ? (
                              <div>
                                <span>{new Date(noteEntry.updated_at || noteEntry.date_saisie).toLocaleDateString('fr-FR')}</span>
                                <span className="block text-[10px] text-slate-400">par {noteEntry.saisi_par_nom}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {hasHistory ? (
                              <button
                                onClick={() => setViewingHistoryNote(noteEntry)}
                                className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded cursor-pointer"
                                title="Voir les modifications antérieures"
                              >
                                <History className="w-3 h-3 text-amber-600" />
                                <span>{noteEntry.historique!.length} modif.</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleOpenConduiteModal(el)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 mx-auto ${
                                hasNote
                                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs'
                              }`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{hasNote ? 'Modifier' : 'Attribuer'}</span>
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
        </div>
      )}

      {/* Rappel des prérogatives et limites du Professeur Principal */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 space-y-1.5">
        <div className="font-bold flex items-center space-x-1.5 text-indigo-950">
          <ShieldCheck className="w-4 h-4 text-indigo-700" />
          <span>Cadre officiel d'exercice du Professeur Principal ({classePP.nom})</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-indigo-800 pl-1">
          <li><strong>Gestion de la classe :</strong> Vous êtes habilité à inscrire de nouveaux apprenants et à mettre à jour leurs informations administratives dans la classe de <strong>{classePP.nom}</strong>.</li>
          <li><strong>Isolation stricte :</strong> Vous ne pouvez ni administrer, ni muter des apprenants d'autres classes de l'établissement.</li>
          <li><strong>Notes & Coefficients :</strong> Seuls les enseignants titulaires de matières saisissent leurs notes. Les coefficients relèvent de la compétence du Censeur.</li>
        </ul>
      </div>

      {/* ==================================================================== */}
      {/* MODAL INSCRIPTION D'UN NOUVEL APPRENANT */}
      {/* ==================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold">Inscrire un nouvel apprenant</h3>
                  <p className="text-[11px] text-slate-300">Classe : {classePP.nom} • Année : {anneeLibelle}</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Matricule *
                  </label>
                  <input
                    type="text"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Classe assignée
                  </label>
                  <input
                    type="text"
                    value={`${classePP.nom} (${classePP.niveau})`}
                    disabled
                    className="w-full border border-slate-200 bg-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nom de famille *
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    placeholder="Ex: HOUNSOU"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Prénom(s) *
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    placeholder="Ex: Rodrigue"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Sexe *
                  </label>
                  <select
                    value={sexe}
                    onChange={(e) => setSexe(e.target.value as Sexe)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={dateNaissance}
                    onChange={(e) => setDateNaissance(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Langue Option (LV2)
                  </label>
                  <select
                    value={lv2}
                    onChange={(e) => setLv2(e.target.value as LangueOption)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="AUCUNE">AUCUNE</option>
                    <option value="ESPAGNOL">ESPAGNOL</option>
                    <option value="ALLEMAND">ALLEMAND</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Lieu de naissance
                </label>
                <input
                  type="text"
                  value={lieuNaissance}
                  onChange={(e) => setLieuNaissance(e.target.value)}
                  placeholder="Ex: Adjohoun, Porto-Novo, Cotonou..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nom du parent / tuteur
                  </label>
                  <input
                    type="text"
                    value={nomParent}
                    onChange={(e) => setNomParent(e.target.value)}
                    placeholder="Nom complet du responsable"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contact téléphonique parent
                  </label>
                  <input
                    type="text"
                    value={contactParent}
                    onChange={(e) => setContactParent(e.target.value)}
                    placeholder="Ex: +229 97 00 00 00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer l'inscription</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL MODIFICATION ADMINISTRATIVE */}
      {/* ==================================================================== */}
      {editingEleve && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-indigo-300" />
                <div>
                  <h3 className="text-sm font-bold">Modifier les informations administratives</h3>
                  <p className="text-[11px] text-indigo-200">Classe : {classePP.nom} ({editingEleve.matricule})</p>
                </div>
              </div>
              <button onClick={() => setEditingEleve(null)} className="text-indigo-200 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Matricule
                  </label>
                  <input
                    type="text"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Classe (Verrouillée)
                  </label>
                  <input
                    type="text"
                    value={classePP.nom}
                    disabled
                    className="w-full border border-slate-200 bg-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nom de famille *
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Prénom(s) *
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Sexe
                  </label>
                  <select
                    value={sexe}
                    onChange={(e) => setSexe(e.target.value as Sexe)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={dateNaissance}
                    onChange={(e) => setDateNaissance(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    LV2
                  </label>
                  <select
                    value={lv2}
                    onChange={(e) => setLv2(e.target.value as LangueOption)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="AUCUNE">AUCUNE</option>
                    <option value="ESPAGNOL">ESPAGNOL</option>
                    <option value="ALLEMAND">ALLEMAND</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Lieu de naissance
                </label>
                <input
                  type="text"
                  value={lieuNaissance}
                  onChange={(e) => setLieuNaissance(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nom du parent
                  </label>
                  <input
                    type="text"
                    value={nomParent}
                    onChange={(e) => setNomParent(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contact parent
                  </label>
                  <input
                    type="text"
                    value={contactParent}
                    onChange={(e) => setContactParent(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingEleve(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
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
      {/* MODAL FICHE DÉTAILLÉE APPRENANT */}
      {/* ==================================================================== */}
      {viewingEleve && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold">Fiche administrative de l'apprenant</h3>
              </div>
              <button onClick={() => setViewingEleve(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Identité</div>
                <div className="text-base font-bold text-slate-900">{viewingEleve.nom} {viewingEleve.prenom}</div>
                <div className="font-mono text-slate-600 mt-0.5">Matricule : {viewingEleve.matricule}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Classe</span>
                  <span className="font-bold text-slate-800">{classePP.nom} ({classePP.niveau})</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Sexe</span>
                  <span className="font-bold text-slate-800">{viewingEleve.sexe === 'F' ? 'Féminin' : 'Masculin'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Date de naissance</span>
                  <span className="font-bold text-slate-800">
                    {viewingEleve.date_naissance ? new Date(viewingEleve.date_naissance).toLocaleDateString('fr-FR') : '—'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Langue vivante 2</span>
                  <span className="font-bold text-slate-800">{viewingEleve.langue_vivante_2 || 'AUCUNE'}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Responsable légal / Contact</div>
                <div className="font-semibold text-slate-800">{viewingEleve.nom_parent || 'Non renseigné'}</div>
                {viewingEleve.contact_parent && (
                  <div className="text-slate-600 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{viewingEleve.contact_parent}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingEleve(null)}
                  className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL SAISIE / MODIFICATION DE LA NOTE DE CONDUITE */}
      {/* ==================================================================== */}
      {editingConduiteEleve && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-indigo-950 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">
                    Note de Conduite • {editingConduiteEleve.nom} {editingConduiteEleve.prenom}
                  </h3>
                  <p className="text-[11px] text-indigo-300">
                    Classe : {classePP.nom} • Période : {periodes.find(p => p.id === selectedPeriodeId)?.nom || selectedPeriodeId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingConduiteEleve(null)}
                className="text-indigo-300 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConduite} className="p-5 space-y-4">
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-950">
                <span className="font-bold">Professeur Principal : </span>
                <span>{currentUser.prenom} {currentUser.nom}. Vous êtes seul habilité à attribuer ou réviser cette note officielle.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Note de Conduite (sur 20) *
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    required
                    value={conduiteNoteInput}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setConduiteNoteInput(val);
                      setConduiteApprecInput(getSuggestedAppreciation(val));
                    }}
                    className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-base font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-bold text-slate-500">/ 20</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                    conduiteNoteInput >= 14 ? 'bg-emerald-100 text-emerald-800' :
                    conduiteNoteInput >= 10 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {conduiteApprecInput}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Appréciation officielle sur le bulletin *
                </label>
                <input
                  type="text"
                  required
                  value={conduiteApprecInput}
                  onChange={(e) => setConduiteApprecInput(e.target.value)}
                  placeholder="Ex: Excellente conduite, Très bonne conduite..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motif de la saisie ou de la modification
                </label>
                <input
                  type="text"
                  value={conduiteMotifInput}
                  onChange={(e) => setConduiteMotifInput(e.target.value)}
                  placeholder="Ex: Évaluation de fin de trimestre, Comportement exemplaire, Amélioration constatée..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Ce motif sera archivé dans l'historique officiel des modifications de conduite.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingConduiteEleve(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Enregistrer la note de conduite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL HISTORIQUE DES MODIFICATIONS DE LA CONDUITE */}
      {/* ==================================================================== */}
      {viewingHistoryNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">Historique de la Note de Conduite</h3>
                  <p className="text-[11px] text-slate-300">
                    Traçabilité officielle des révisions de note
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingHistoryNote(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Note actuelle :</span>
                  <span className="font-mono font-black text-sm text-indigo-900">
                    {viewingHistoryNote.note} / 20
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-slate-500">Appréciation :</span>
                  <span className="font-bold text-slate-800">{viewingHistoryNote.appreciation}</span>
                </div>
                <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
                  <span>Dernière saisie par :</span>
                  <span>{viewingHistoryNote.saisi_par_nom} ({new Date(viewingHistoryNote.updated_at || viewingHistoryNote.date_saisie).toLocaleString('fr-FR')})</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Chronologie des modifications ({viewingHistoryNote.historique?.length || 0})
                </h4>

                <div className="space-y-2">
                  {(!viewingHistoryNote.historique || viewingHistoryNote.historique.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">Aucune modification antérieure.</p>
                  ) : (
                    viewingHistoryNote.historique.map((h, idx) => (
                      <div key={idx} className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-slate-800">
                            {h.ancienne_note} / 20 → <strong className="text-indigo-900">{h.nouvelle_note} / 20</strong>
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(h.date).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Modifié par : <strong>{h.modifie_par_nom}</strong>
                        </div>
                        {h.motif && (
                          <div className="text-[11px] text-amber-900 italic bg-white/70 p-1.5 rounded">
                            Motif : {h.motif}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingHistoryNote(null)}
                  className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
