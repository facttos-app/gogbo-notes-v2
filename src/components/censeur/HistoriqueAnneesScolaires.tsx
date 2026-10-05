import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { AnneeScolaire, Classe, Eleve, Periode, Matiere } from '../../types';
import { 
  calculerClassementClasse, 
  calculerClassementAnnuelClasse, 
  calculerSyntheseMatiere,
  getAppreciation, 
  getAppreciationColor,
  formatRang 
} from '../../lib/appreciation';
import { 
  History, 
  Calendar, 
  Users, 
  School, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Trophy, 
  ArrowRight, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Printer, 
  Layers, 
  Sparkles, 
  Clock, 
  Filter, 
  Eye, 
  Plus, 
  ShieldCheck,
  ChevronRight,
  Award,
  CreditCard,
  DollarSign,
  UserX,
  Receipt
} from 'lucide-react';
import { TabKey } from '../Navigation';

interface HistoriqueAnneesScolairesProps {
  onNavigate?: (tab: TabKey) => void;
  onOpenBulletin?: (eleveId: string, classeId: string, periodeId: string) => void;
}

type SubTab = 
  | 'synthese' 
  | 'eleves' 
  | 'classes' 
  | 'attributions' 
  | 'matieres' 
  | 'periodes' 
  | 'notes'
  | 'classements' 
  | 'bulletins'
  | 'absences'
  | 'paiements';

export const HistoriqueAnneesScolaires: React.FC<HistoriqueAnneesScolairesProps> = ({ 
  onNavigate, 
  onOpenBulletin 
}) => {
  const { currentUser, isCenseur, isDirecteur } = useAuth();
  const { annees, activeAnnee, selectedAnnee, setSelectedAnnee, refreshAnnees } = useAnnee();

  // Consultation locale de l'année historique sélectionnée (par défaut l'année actuellement sélectionnée dans l'application)
  const [consultingAnnee, setConsultingAnnee] = useState<AnneeScolaire>(selectedAnnee || activeAnnee);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('synthese');

  // Filtres et sélections pour les sous-onglets
  const [eleveSearch, setEleveSearch] = useState('');
  const [classeFilter, setClasseFilter] = useState<string>('ALL');

  // Filtres additionnels pour notes, absences et paiements
  const [notesMatiereFilter, setNotesMatiereFilter] = useState<string>('ALL');
  const [absenceSearch, setAbsenceSearch] = useState<string>('');
  const [absenceClasseFilter, setAbsenceClasseFilter] = useState<string>('ALL');
  const [paiementSearch, setPaiementSearch] = useState<string>('');
  const [paiementClasseFilter, setPaiementClasseFilter] = useState<string>('ALL');

  // Sélection pour les classements et bulletins
  const classes = useMemo(() => storage.getClasses(), []);
  const matieres = useMemo(() => storage.getMatieres(), []);

  // Données relatives à l'année consultée
  const periodesAnnee = useMemo(() => {
    return storage.getPeriodesByAnnee(consultingAnnee.libelle);
  }, [consultingAnnee.libelle]);

  const activePeriodeAnnee = useMemo(() => {
    return periodesAnnee.find((p) => p.is_active) || periodesAnnee[0];
  }, [periodesAnnee]);

  const [selectedClasseId, setSelectedClasseId] = useState<string>(classes[0]?.id || '');
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>(activePeriodeAnnee?.id || '');

  // Synchroniser la période sélectionnée si la liste change
  React.useEffect(() => {
    if (periodesAnnee.length > 0 && !periodesAnnee.some((p) => p.id === selectedPeriodeId)) {
      setSelectedPeriodeId(periodesAnnee[0].id);
    }
  }, [periodesAnnee, selectedPeriodeId]);

  // Modal création nouvelle année scolaire (si Censeur ou Directeur)
  const [showNewAnneeModal, setShowNewAnneeModal] = useState(false);
  const [newLibelle, setNewLibelle] = useState('2027–2028');
  const [newDateDebut, setNewDateDebut] = useState('2027-09-13');
  const [newDateFin, setNewDateFin] = useState('2028-06-30');
  const [creationMsg, setCreationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // État du modal d'affichage direct d'un bulletin historique
  const [bulletinModalEleve, setBulletinModalEleve] = useState<Eleve | null>(null);

  // Vérification de sécurité des permissions administratives
  if (!isCenseur && !isDirecteur) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-800">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="font-bold text-base">Accès restreint aux archives administratives</h3>
        <p className="text-xs text-red-600 mt-1">
          La consultation globale de l'historique des années scolaires est strictement réservée à l'Administration (Censeur et Direction Générale).
        </p>
      </div>
    );
  }

  // Effectifs et données pour l'année consultée
  const elevesAnnee = storage.getElevesByAnnee(consultingAnnee.libelle);
  const affectationsAnnee = storage.getAffectations(consultingAnnee.libelle);
  const allNotes = storage.getNotes();

  const totalGarcons = elevesAnnee.filter((e) => e.sexe === 'M').length;
  const totalFilles = elevesAnnee.filter((e) => e.sexe === 'F').length;

  const premierCycleNiveaux = ['6ème', '5ème', '4ème', '3ème'];
  const totalPremierCycle = elevesAnnee.filter((e) => {
    const cls = classes.find((c) => c.id === e.classe_id);
    return premierCycleNiveaux.includes(cls?.niveau || '');
  }).length;
  const totalSecondCycle = elevesAnnee.length - totalPremierCycle;

  // Calcul du volume horaire total hebdomadaire de cette année
  const totalHeuresHebdo = affectationsAnnee
    .filter((a) => a.statut === 'ACTIF')
    .reduce((acc, curr) => acc + curr.heures_hebdo, 0);

  // Enseignants uniques affectés cette année
  const teacherProfileIds = new Set(affectationsAnnee.map((a) => a.profile_id));
  const enseignantsAnnee = storage.getProfiles().filter((p) => teacherProfileIds.has(p.id) || p.is_enseignant);

  // Élèves filtrés pour l'onglet Élèves
  const filteredEleves = elevesAnnee.filter((e) => {
    const matchSearch =
      e.nom.toLowerCase().includes(eleveSearch.toLowerCase()) ||
      e.prenom.toLowerCase().includes(eleveSearch.toLowerCase()) ||
      e.matricule.toLowerCase().includes(eleveSearch.toLowerCase());
    const matchClasse = classeFilter === 'ALL' || e.classe_id === classeFilter;
    return matchSearch && matchClasse;
  });

  // Calcul du classement pour la classe et période sélectionnées dans cette année historique
  const currentClasse = classes.find((c) => c.id === selectedClasseId);
  const currentPeriode = periodesAnnee.find((p) => p.id === selectedPeriodeId) || periodesAnnee[0];
  const elevesClasse = currentClasse ? storage.getElevesByClasse(currentClasse.id, consultingAnnee.libelle) : [];

  const classementData = useMemo(() => {
    if (!currentClasse || !currentPeriode) return { classement: [], bulletinsMap: {} };
    return calculerClassementClasse(
      currentClasse,
      elevesClasse,
      currentPeriode,
      matieres,
      allNotes,
      affectationsAnnee
    );
  }, [currentClasse, elevesClasse, currentPeriode, matieres, allNotes, affectationsAnnee]);

  // Choisir une année scolaire à consulter
  const handleSelectConsultation = (annee: AnneeScolaire) => {
    setConsultingAnnee(annee);
    // Met également à jour le contexte global pour que toute l'application sache quelle année est visualisée
    setSelectedAnnee(annee);
  };

  // Revenir rapidement à l'année active
  const handleRetourAnneeActive = () => {
    setConsultingAnnee(activeAnnee);
    setSelectedAnnee(activeAnnee);
  };

  // Création d'une nouvelle année scolaire
  const handleCreateAnnee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setCreationMsg(null);
    try {
      const created = storage.createAnneeScolaire(
        { libelle: newLibelle, date_debut: newDateDebut, date_fin: newDateFin },
        currentUser
      );
      refreshAnnees();
      setCreationMsg({
        type: 'success',
        text: `✓ Année scolaire ${created.libelle} créée avec succès. Les semestres et trimestres ont été automatiquement configurés.`,
      });
      setShowNewAnneeModal(false);
    } catch (err: unknown) {
      setCreationMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erreur lors de la création de l’année scolaire.',
      });
    }
  };

  const isConsultingHistorical = consultingAnnee.id !== activeAnnee.id;

  return (
    <div className="space-y-6">
      {/* 1. EN-TÊTE OFFICIEL DE LA RUBRIQUE */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1">
                <History className="w-3.5 h-3.5 text-amber-700" />
                <span>Espace Administration • CEG GOGBO</span>
              </span>
              <span className="text-slate-500 text-xs">Archives & Pluriannualité</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center space-x-2">
              <span>HISTORIQUE DES ANNÉES SCOLAIRES</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              Consultation intégrale, pérenne et en lecture seule des données scolaires des années précédentes (élèves, classes, attributions, notes, moyennes, classements et bulletins scolaires) sans altérer l'année active en cours.
            </p>
          </div>

          {/* Actions : Ajouter une année / Année active actuelle */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowNewAnneeModal(true)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Ouvrir une nouvelle année académique"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Ouvrir une nouvelle année</span>
            </button>
          </div>
        </div>
      </div>

      {creationMsg && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center space-x-2 ${
            creationMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {creationMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{creationMsg.text}</span>
        </div>
      )}

      {/* 2. LISTE DES ANNÉES SCOLAIRES EXISTANTES (EXIGENCE 1 & 2) */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
              Registre des Années Scolaires Enregistrées
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {annees.length} année(s) dans le système
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {annees.map((annee) => {
            const isCurrentlyConsulted = consultingAnnee.id === annee.id;
            const isThisYearActive = annee.is_active;
            const yearEleves = storage.getInscriptionsByAnnee(annee.libelle);
            const yearAffs = storage.getAffectations(annee.libelle);
            const yearPeriodes = storage.getPeriodesByAnnee(annee.libelle);

            return (
              <div
                key={annee.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isCurrentlyConsulted
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/40 shadow-sm'
                    : isThisYearActive
                    ? 'bg-emerald-50/50 border-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="font-black text-slate-900 text-base sm:text-lg flex items-center space-x-1.5">
                      <span>{annee.libelle}</span>
                    </span>
                    {isThisYearActive ? (
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                        ★ Année Active
                      </span>
                    ) : annee.statut === 'CLOTUREE' ? (
                      <span className="bg-slate-800 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Archivée</span>
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        À Venir
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Période calendaire :</span>
                      <span className="font-medium text-slate-700">
                        {new Date(annee.date_debut).toLocaleDateString('fr-FR')} → {new Date(annee.date_fin).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Inscrits cette année-là :</span>
                      <span className="font-bold text-slate-800">{yearEleves.length} élèves</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Attributions de classe :</span>
                      <span className="font-semibold text-slate-700">{yearAffs.length} attributions</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Périodes officielles :</span>
                      <span className="text-slate-700 font-medium">{yearPeriodes.length} périodes (T1-T3, S1-S2)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80">
                  <button
                    id={`btn-consulter-annee-${annee.id}`}
                    onClick={() => handleSelectConsultation(annee)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      isCurrentlyConsulted
                        ? 'bg-amber-600 text-white shadow-xs'
                        : isThisYearActive
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>
                      {isCurrentlyConsulted
                        ? '✓ En consultation actuelle'
                        : isThisYearActive
                        ? 'CONSULTER L’ANNÉE ACTIVE'
                        : 'CONSULTER CETTE ANNÉE'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BANDEAU DE CONSULTATION HISTORIQUE OBLIGATOIRE (EXIGENCE 5 & 6) */}
      <div
        id="banner-consultation-historique-card"
        className={`rounded-xl p-4 sm:p-5 border shadow-xs transition-all ${
          isConsultingHistorical
            ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white border-amber-600'
            : 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white border-emerald-700'
        }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                isConsultingHistorical ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'
              }`}>
                {isConsultingHistorical ? 'ARCHIVES OFFICIELLES' : 'ANNÉE ACTIVE EN COURS'}
              </span>
              <span className="text-xs text-amber-200/90 font-mono">
                {isConsultingHistorical ? 'LECTURE SEULE • MODIFICATIONS BLOQUÉES' : 'SESSION DE TRAVAIL ACTUELLE'}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black mt-1 tracking-tight text-white">
              {isConsultingHistorical
                ? `CONSULTATION HISTORIQUE — ANNÉE SCOLAIRE ${consultingAnnee.libelle}`
                : `CONSULTATION DE L’ANNÉE SCOLAIRE ACTIVE ${consultingAnnee.libelle}`}
            </h3>

            <p className="text-xs text-slate-300 mt-0.5">
              {isConsultingHistorical
                ? `Vous visualisez l'historique complet et inaltérable de l'année ${consultingAnnee.libelle}. Les élèves, classes, notes, coefficients, classements et bulletins correspondent strictement à cette année-là.`
                : `Vous visualisez actuellement l'année scolaire active ${consultingAnnee.libelle}.`}
            </p>
          </div>

          {isConsultingHistorical && (
            <button
              id="btn-retour-annee-active-section"
              onClick={handleRetourAnneeActive}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center space-x-2 cursor-pointer shrink-0"
              title="Retourner immédiatement à l'année scolaire active"
            >
              <span>RETOUR À L'ANNÉE ACTIVE ({activeAnnee.libelle})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. NAVIGATION PAR ONGLET DANS LES DONNÉES HISTORIQUES (EXIGENCE 3) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-3 sm:px-6">
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar">
            <button
              onClick={() => setActiveSubTab('synthese')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'synthese'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Synthèse & Stats</span>
            </button>

            <button
              onClick={() => setActiveSubTab('eleves')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'eleves'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Élèves inscrits ({elevesAnnee.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('classes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'classes'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              <span>Classes de l'année (28)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('attributions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'attributions'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Enseignants & Attributions ({affectationsAnnee.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('matieres')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'matieres'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Matières & Coefs</span>
            </button>

            <button
              onClick={() => setActiveSubTab('periodes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'periodes'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Périodes ({periodesAnnee.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('notes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'notes'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>Notes de l'année</span>
            </button>

            <button
              onClick={() => setActiveSubTab('classements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'classements'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Classements & Moyennes</span>
            </button>

            <button
              onClick={() => setActiveSubTab('bulletins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'bulletins'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bulletins Historiques</span>
            </button>

            <button
              onClick={() => setActiveSubTab('absences')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'absences'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Absences & Abandons</span>
            </button>

            <button
              onClick={() => setActiveSubTab('paiements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeSubTab === 'paiements'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-teal-600" />
              <span>Contributions & Paiements</span>
            </button>
          </div>
        </div>

        {/* CORPS DE L'ONGLET SÉLECTIONNÉ */}
        <div className="p-4 sm:p-6">
          {/* SOUS-ONGLET 1 : SYNTHÈSE & STATISTIQUES */}
          {activeSubTab === 'synthese' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
                    <span>Élèves Inscrits</span>
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                    {elevesAnnee.length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                    <span>Garçons: {totalGarcons}</span>
                    <span>Filles: {totalFilles}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
                    <span>Répartition Cycles</span>
                    <School className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                    28 classes
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                    <span>1er Cycle: {totalPremierCycle}</span>
                    <span>2nd Cycle: {totalSecondCycle}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
                    <span>Enseignants</span>
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                    {enseignantsAnnee.length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Corps professoral affecté
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
                    <span>Volume Hebdo</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                    {totalHeuresHebdo} h
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {affectationsAnnee.length} attributions de classe
                  </div>
                </div>
              </div>

              {/* Statuts des Périodes de cette année */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>Périodes scolaires de l'année {consultingAnnee.libelle}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {periodesAnnee.map((p) => (
                    <div key={p.id} className="bg-white p-3 rounded-lg border border-slate-200 text-xs shadow-2xs">
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                        <span>{p.code}</span>
                        {p?.is_locked ? (
                          <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 font-bold flex items-center space-x-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Verrouillé</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold flex items-center space-x-1">
                            <Unlock className="w-2.5 h-2.5" />
                            <span>Ouvert</span>
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 mt-1">{p.nom}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Du {p.date_debut ? new Date(p.date_debut).toLocaleDateString('fr-FR') : 'N/A'} au {p.date_fin ? new Date(p.date_fin).toLocaleDateString('fr-FR') : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SOUS-ONGLET 2 : ÉLÈVES INSCRITS CETTE ANNÉE-LÀ */}
          {activeSubTab === 'eleves' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Recherche */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nom, prénom ou matricule..."
                      value={eleveSearch}
                      onChange={(e) => setEleveSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Filtre Classe */}
                  <div className="flex items-center space-x-1.5 text-xs">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={classeFilter}
                      onChange={(e) => setClasseFilter(e.target.value)}
                      className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Toutes les classes ({elevesAnnee.length})</option>
                      {classes.map((cls) => {
                        const countInClass = elevesAnnee.filter((e) => e.classe_id === cls.id).length;
                        return (
                          <option key={cls.id} value={cls.id}>
                            {cls.nom} ({countInClass})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {filteredEleves.length} élève(s) trouvé(s) pour l'année {consultingAnnee.libelle}
                </div>
              </div>

              {/* Tableau officiel des élèves de cette année */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">N°</th>
                      <th className="py-2.5 px-3">Matricule</th>
                      <th className="py-2.5 px-3">Nom & Prénom</th>
                      <th className="py-2.5 px-3">Sexe</th>
                      <th className="py-2.5 px-3">Classe cette année-là</th>
                      <th className="py-2.5 px-3">Date Inscription</th>
                      <th className="py-2.5 px-3">Statut</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredEleves.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                          Aucun élève inscrit trouvé pour l'année scolaire {consultingAnnee.libelle}.
                        </td>
                      </tr>
                    ) : (
                      filteredEleves.map((el, idx) => {
                        return (
                          <tr key={el.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{el.matricule}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {el.nom} {el.prenom}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  el.sexe === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                                }`}
                              >
                                {el.sexe === 'M' ? 'M' : 'F'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                                {el.classe_nom}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {el.inscription.date_inscription || '2026-09-15'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                ACTIF
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => setBulletinModalEleve(el)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-[11px] transition-colors cursor-pointer"
                                title={`Voir le bulletin historique de ${el.nom} ${el.prenom} pour ${consultingAnnee.libelle}`}
                              >
                                <FileText className="w-3 h-3 text-emerald-700" />
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
            </div>
          )}

          {/* SOUS-ONGLET 3 : STRUCTURE DES 28 CLASSES CETTE ANNÉE-LÀ */}
          {activeSubTab === 'classes' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                Effectifs et structure des 28 classes pour l'année scolaire <strong>{consultingAnnee.libelle}</strong>.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {classes.map((cls) => {
                  const classEleves = storage.getElevesByClasse(cls.id, consultingAnnee.libelle);
                  const classAffs = affectationsAnnee.filter((a) => a.classe_id === cls.id);
                  const totalClassHours = classAffs.reduce((acc, curr) => acc + curr.heures_hebdo, 0);

                  return (
                    <div
                      key={cls.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-700">
                            {cls.niveau}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Max 100</span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-base">{cls.nom}</h4>
                        <div className="text-xs font-black text-emerald-800 mt-1">
                          {classEleves.length} élève(s) inscrit(s)
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {classAffs.length} attributions • {totalClassHours} h/semaine
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                        <button
                          onClick={() => {
                            setSelectedClasseId(cls.id);
                            setActiveSubTab('classements');
                          }}
                          className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1"
                        >
                          <span>Voir le classement</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SOUS-ONGLET 4 : ENSEIGNANTS ET ATTRIBUTIONS CETTE ANNÉE-LÀ */}
          {activeSubTab === 'attributions' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                Liste des attributions de classe enregistrées pour l'année scolaire <strong>{consultingAnnee.libelle}</strong>.
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Professeur</th>
                      <th className="py-2.5 px-3">Classe</th>
                      <th className="py-2.5 px-3">Matière</th>
                      <th className="py-2.5 px-3">Heures/semaine</th>
                      <th className="py-2.5 px-3">Année Scolaire</th>
                      <th className="py-2.5 px-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {affectationsAnnee.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          Aucune attribution de classe enregistrée pour l'année scolaire {consultingAnnee.libelle}.
                        </td>
                      </tr>
                    ) : (
                      affectationsAnnee.map((aff) => {
                        const prof = storage.getProfiles().find((p) => p.id === aff.profile_id);
                        const cls = classes.find((c) => c.id === aff.classe_id);
                        const mat = matieres.find((m) => m.id === aff.matiere_id);

                        return (
                          <tr key={aff.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {prof ? `${prof.nom} ${prof.prenom}` : 'Enseignant non identifié'}
                              {prof?.role !== 'ENSEIGNANT' && (
                                <span className="ml-1 text-[10px] text-amber-700 bg-amber-50 px-1 rounded">
                                  ({prof?.role})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                {cls?.nom || 'Classe inconnue'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {mat?.nom || 'Matière inconnue'} (Coef: {mat?.coefficient})
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {aff.heures_hebdo} h
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {aff.annee_scolaire || consultingAnnee.libelle}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                {aff.statut}
                              </span>
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

          {/* SOUS-ONGLET 5 : MATIÈRES ET COEFFICIENTS */}
          {activeSubTab === 'matieres' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                Nomenclature et coefficients officiels des disciplines applicables au CEG GOGBO pour l'année <strong>{consultingAnnee.libelle}</strong>.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {matieres.map((mat) => (
                  <div key={mat.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                        {mat.code} • {mat.categorie}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">{mat.nom}</h4>
                      {mat.is_langue_option && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-1 rounded font-semibold">
                          Option LV2
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-semibold">Coef</div>
                      <div className="text-lg font-black text-emerald-700">{mat.coefficient}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SOUS-ONGLET 6 : PÉRIODES SCOLAIRES */}
          {activeSubTab === 'periodes' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                Périodes officielles (semestres et trimestres) configurées pour l'année <strong>{consultingAnnee.libelle}</strong>.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {periodesAnnee.map((p) => (
                  <div key={p.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-2">
                      <span className="font-bold">{p.code}</span>
                      {p?.is_locked ? (
                        <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-bold text-[10px] flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Verrouillé (Lecture seule)</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold text-[10px] flex items-center space-x-1">
                          <Unlock className="w-3 h-3" />
                          <span>Ouvert</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-base">{p.nom}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Du {p.date_debut ? new Date(p.date_debut).toLocaleDateString('fr-FR') : 'N/A'} au{' '}
                      {p.date_fin ? new Date(p.date_fin).toLocaleDateString('fr-FR') : 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SOUS-ONGLET 7 : CLASSEMENTS ET PALMARÈS */}
          {activeSubTab === 'classements' && (
            <div className="space-y-5">
              {/* Sélecteurs de Classe et Période */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Classe :</label>
                    <select
                      value={selectedClasseId}
                      onChange={(e) => setSelectedClasseId(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Période :</label>
                    <select
                      value={selectedPeriodeId}
                      onChange={(e) => setSelectedPeriodeId(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      {periodesAnnee.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Effectif évalué</div>
                  <div className="text-lg font-black text-emerald-800">
                    {classementData.classement.length} élève(s) classé(s)
                  </div>
                </div>
              </div>

              {/* Tableau officiel du classement */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Rang</th>
                      <th className="py-2.5 px-3">Matricule</th>
                      <th className="py-2.5 px-3">Nom & Prénom</th>
                      <th className="py-2.5 px-3">Sexe</th>
                      <th className="py-2.5 px-3">Total Coefs</th>
                      <th className="py-2.5 px-3">Total Points</th>
                      <th className="py-2.5 px-3">Moyenne Générale</th>
                      <th className="py-2.5 px-3">Appréciation Officielle</th>
                      <th className="py-2.5 px-3 text-right">Bulletin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {classementData.classement.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                          Aucun résultat ou élève enregistré dans cette classe pour l'année {consultingAnnee.libelle}.
                        </td>
                      </tr>
                    ) : (
                      classementData.classement.map((item) => {
                        const appColor = getAppreciationColor(item.appreciation);
                        const eleveObj = elevesClasse.find((e) => e.id === item.eleve_id);

                        return (
                          <tr key={item.eleve_id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-black text-slate-900">
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${
                                  item.rang === 1
                                    ? 'bg-amber-400 text-slate-950 font-black'
                                    : item.rang <= 3
                                    ? 'bg-slate-200 text-slate-900 font-bold'
                                    : 'text-slate-700'
                                }`}
                              >
                                {item.rang_label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 font-bold">{item.matricule}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {item.nom} {item.prenom}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                  item.sexe === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                                }`}
                              >
                                {item.sexe}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{item.total_coefficients}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{item.total_points}</td>
                            <td className="py-2.5 px-3 font-mono font-black text-sm">
                              {item.moyenne_generale !== null ? (
                                <span
                                  className={
                                    item.moyenne_generale >= 10 ? 'text-emerald-700' : 'text-red-700'
                                  }
                                >
                                  {item.moyenne_generale.toFixed(2)}/20
                                </span>
                              ) : (
                                <span className="text-slate-400">N.C</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${appColor.bg} ${appColor.border}`}
                              >
                                {item.appreciation}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {eleveObj && (
                                <button
                                  onClick={() => setBulletinModalEleve(eleveObj)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-[11px] transition-colors cursor-pointer"
                                  title="Consulter le bulletin officiel correspondant à cette année"
                                >
                                  <FileText className="w-3 h-3 text-emerald-700" />
                                  <span>Ouvrir</span>
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

          {/* SOUS-ONGLET 8 : VISIONNEUSE DE BULLETINS HISTORIQUES (EXIGENCE OBLIGATOIRE) */}
          {activeSubTab === 'bulletins' && (
            <HistoricalBulletinTab
              consultingAnnee={consultingAnnee}
              classes={classes}
              periodesAnnee={periodesAnnee}
              matieres={matieres}
              onNavigateGlobalBulletins={() => {
                setSelectedAnnee(consultingAnnee);
                if (onNavigate) onNavigate('bulletins');
              }}
            />
          )}

          {/* SOUS-ONGLET 9 : CONSULTATION DES NOTES HISTORIQUES (EXIGENCE 3) */}
          {activeSubTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Relevé des Évaluations & Notes de l'Année {consultingAnnee.libelle}</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Consultation intégrale en lecture seule des interrogations et devoirs de chaque apprenant.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedClasseId}
                    onChange={(e) => setSelectedClasseId(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>

                  <select
                    value={notesMatiereFilter}
                    onChange={(e) => setNotesMatiereFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Toutes les disciplines</option>
                    {matieres.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nom} (Coef {m.coefficient})
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedPeriodeId}
                    onChange={(e) => setSelectedPeriodeId(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {periodesAnnee.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tableau des notes de la classe sélectionnée */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Matricule</th>
                      <th className="py-2.5 px-3">Nom & Prénoms</th>
                      <th className="py-2.5 px-3">Matière</th>
                      <th className="py-2.5 px-2 text-center">Int. 1</th>
                      <th className="py-2.5 px-2 text-center">Int. 2</th>
                      <th className="py-2.5 px-2 text-center">Int. 3</th>
                      <th className="py-2.5 px-2 text-center">Moy. Int.</th>
                      <th className="py-2.5 px-2 text-center">Dev. 1</th>
                      <th className="py-2.5 px-2 text-center">Dev. 2</th>
                      <th className="py-2.5 px-2 text-center">Moyenne</th>
                      <th className="py-2.5 px-2 text-center">Coef</th>
                      <th className="py-2.5 px-2 text-center">Points</th>
                      <th className="py-2.5 px-3">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {elevesClasse.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-8 text-center text-slate-400">
                          Aucun élève inscrit en {currentClasse?.nom} pour l'année {consultingAnnee.libelle}.
                        </td>
                      </tr>
                    ) : (
                      elevesClasse.flatMap((el) => {
                        const targetMatieres = notesMatiereFilter === 'ALL'
                          ? matieres
                          : matieres.filter((m) => m.id === notesMatiereFilter);

                        const elNotes = allNotes.filter((n) => {
                          if (n.eleve_id !== el.id) return false;
                          if (n.periode_id !== selectedPeriodeId) return false;
                          return true;
                        });

                        return targetMatieres.map((m) => {
                          const notesM = elNotes.filter((n) => {
                            const aff = affectationsAnnee.find((a) => a.id === n.affectation_id);
                            return aff?.matiere_id === m.id;
                          });
                          const syn = calculerSyntheseMatiere(m, notesM);

                          return (
                            <tr key={`${el.id}-${m.id}`} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 font-mono font-bold text-slate-800">{el.matricule}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{el.nom} {el.prenom}</td>
                              <td className="py-2 px-3 font-semibold text-slate-700">{m.nom}</td>
                              <td className="py-2 px-2 text-center font-mono">{syn.interro_1 !== null ? syn.interro_1.toFixed(1) : '—'}</td>
                              <td className="py-2 px-2 text-center font-mono">{syn.interro_2 !== null ? syn.interro_2.toFixed(1) : '—'}</td>
                              <td className="py-2 px-2 text-center font-mono">{syn.interro_3 !== null ? syn.interro_3.toFixed(1) : '—'}</td>
                              <td className="py-2 px-2 text-center font-mono font-semibold bg-slate-50">{syn.moyenne_interros !== null ? syn.moyenne_interros.toFixed(2) : '—'}</td>
                              <td className="py-2 px-2 text-center font-mono">{syn.devoir_1 !== null ? syn.devoir_1.toFixed(1) : '—'}</td>
                              <td className="py-2 px-2 text-center font-mono">{syn.devoir_2 !== null ? syn.devoir_2.toFixed(1) : '—'}</td>
                              <td className="py-2 px-2 text-center font-black font-mono bg-slate-100">
                                {syn.moyenne !== null ? (
                                  <span className={syn.moyenne >= 10 ? 'text-emerald-800' : 'text-red-700'}>
                                    {syn.moyenne.toFixed(2)}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="py-2 px-2 text-center font-mono font-bold">{m.coefficient}</td>
                              <td className="py-2 px-2 text-center font-mono font-bold bg-slate-50">{syn.points !== null ? syn.points.toFixed(2) : '—'}</td>
                              <td className="py-2 px-3 text-slate-600 italic text-[11px]">{syn.appreciation}</td>
                            </tr>
                          );
                        });
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SOUS-ONGLET 10 : CONSULTATION DES ABSENCES & ABANDONS (EXIGENCE 3 & 8) */}
          {activeSubTab === 'absences' && (() => {
            const presencesHist = storage.getPresencesByAnnee(consultingAnnee.libelle);
            const filteredPresencesHist = presencesHist.filter((p) => {
              if (absenceClasseFilter !== 'ALL' && p.classe_id !== absenceClasseFilter) return false;
              if (absenceSearch.trim() !== '') {
                const el = storage.getEleveById(p.eleve_id);
                const q = `${el?.nom || ''} ${el?.prenom || ''} ${el?.matricule || ''}`.toLowerCase();
                if (!q.includes(absenceSearch.toLowerCase())) return false;
              }
              return true;
            });
            const totalAbs = presencesHist.filter((p) => p.statut === 'ABSENT').length;
            const totalAbn = presencesHist.filter((p) => p.statut === 'ABANDON').length;

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>Registre Historique des Présences, Absences & Abandons ({consultingAnnee.libelle})</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Archives immuables des absences et cas d'abandons déclarés pour l'année {consultingAnnee.libelle}.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Rechercher élève..."
                        value={absenceSearch}
                        onChange={(e) => setAbsenceSearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none"
                      />
                    </div>

                    <select
                      value={absenceClasseFilter}
                      onChange={(e) => setAbsenceClasseFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Toutes les classes</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                      <div className="text-[11px] font-bold text-amber-800 uppercase">Total Absences Historiques</div>
                      <div className="text-lg font-black text-amber-950">{totalAbs} absence(s)</div>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center space-x-3">
                    <UserX className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="text-[11px] font-bold text-red-800 uppercase">Abandons Déclarés</div>
                      <div className="text-lg font-black text-red-950">{totalAbn} cas</div>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Élève & Matricule</th>
                        <th className="py-2.5 px-3">Classe Historique</th>
                        <th className="py-2.5 px-2 text-center">Statut</th>
                        <th className="py-2.5 px-3">Motif / Observation</th>
                        <th className="py-2.5 px-3">Enregistré par</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredPresencesHist.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Aucun enregistrement d'assiduité trouvé pour cette sélection en {consultingAnnee.libelle}.
                          </td>
                        </tr>
                      ) : (
                        filteredPresencesHist.map((p) => {
                          const el = storage.getEleveById(p.eleve_id);
                          const cls = storage.getClasseById(p.classe_id);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-slate-700">{p.date}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">
                                {el ? `${el.nom} ${el.prenom}` : p.eleve_id}
                                <span className="block font-mono text-[10px] text-slate-400 font-normal">{el?.matricule}</span>
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-700">{cls?.nom}</td>
                              <td className="py-2 px-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  p.statut === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : p.statut === 'ABSENT' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {p.statut}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600 italic">{p.motif || '—'}</td>
                              <td className="py-2 px-3 text-slate-500 text-[11px]">{p.enregistre_par_nom || 'Surveillant'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* SOUS-ONGLET 11 : CONSULTATION DES PAIEMENTS & CONTRIBUTIONS (EXIGENCE 3 & 9) */}
          {activeSubTab === 'paiements' && (() => {
            const paiementsHist = storage.getPaiementsByAnnee(consultingAnnee.libelle);
            const filteredPaiementsHist = paiementsHist.filter((p) => {
              if (paiementClasseFilter !== 'ALL' && p.classe_id !== paiementClasseFilter) return false;
              if (paiementSearch.trim() !== '') {
                const el = storage.getEleveById(p.eleve_id);
                const q = `${el?.nom || ''} ${el?.prenom || ''} ${p.numero_recu}`.toLowerCase();
                if (!q.includes(paiementSearch.toLowerCase())) return false;
              }
              return true;
            });
            const totalEncaisseHist = paiementsHist.reduce((acc, curr) => acc + curr.montant_paye, 0);

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-teal-600" />
                      <span>Archives Comptables des Contributions Scolaires ({consultingAnnee.libelle})</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Consultation des versements, reçus de paiement et état de recouvrement pour l'année {consultingAnnee.libelle}.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Rechercher élève ou reçu..."
                        value={paiementSearch}
                        onChange={(e) => setPaiementSearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none"
                      />
                    </div>

                    <select
                      value={paiementClasseFilter}
                      onChange={(e) => setPaiementClasseFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Toutes les classes</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center space-x-3">
                  <DollarSign className="w-6 h-6 text-teal-700" />
                  <div>
                    <div className="text-[11px] font-bold text-teal-800 uppercase">Total des Contributions Encaissées en {consultingAnnee.libelle}</div>
                    <div className="text-xl font-black text-teal-950">{totalEncaisseHist.toLocaleString()} FCFA</div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">N° Reçu</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Élève & Matricule</th>
                        <th className="py-2.5 px-3">Classe</th>
                        <th className="py-2.5 px-3">Tranche</th>
                        <th className="py-2.5 px-3 text-right">Montant Versé</th>
                        <th className="py-2.5 px-3 text-right">Reste Dû</th>
                        <th className="py-2.5 px-2 text-center">Statut</th>
                        <th className="py-2.5 px-2 text-center">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredPaiementsHist.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            Aucun versement enregistré pour cette sélection en {consultingAnnee.libelle}.
                          </td>
                        </tr>
                      ) : (
                        filteredPaiementsHist.map((p) => {
                          const el = storage.getEleveById(p.eleve_id);
                          const cls = storage.getClasseById(p.classe_id);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-bold text-teal-800">{p.numero_recu}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{p.date_paiement}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">
                                {el ? `${el.nom} ${el.prenom}` : p.eleve_id}
                                <span className="block font-mono text-[10px] text-slate-400 font-normal">{el?.matricule}</span>
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-700">{cls?.nom}</td>
                              <td className="py-2 px-3 text-slate-600 font-medium">{p.tranche}</td>
                              <td className="py-2 px-3 text-right font-black text-slate-900">{p.montant_paye.toLocaleString()} F</td>
                              <td className="py-2 px-3 text-right font-semibold text-slate-600">{p.reste_a_payer.toLocaleString()} F</td>
                              <td className="py-2 px-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  p.statut_paiement === 'SOLDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {p.statut_paiement}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center text-[11px] text-slate-600">{p.mode_paiement}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 5. MODAL BULLETIN HISTORIQUE INDIVIDUEL (EXIGENCE OBLIGATOIRE POUR BULLETINS) */}
      {bulletinModalEleve && (
        <HistoricalBulletinModal
          eleve={bulletinModalEleve}
          consultingAnnee={consultingAnnee}
          periodesAnnee={periodesAnnee}
          matieres={matieres}
          onClose={() => setBulletinModalEleve(null)}
          onNavigateGlobalBulletins={() => {
            setSelectedAnnee(consultingAnnee);
            setBulletinModalEleve(null);
            if (onOpenBulletin) {
              onOpenBulletin(bulletinModalEleve.id, bulletinModalEleve.classe_id, periodesAnnee[0]?.id);
            } else if (onNavigate) {
              onNavigate('bulletins');
            }
          }}
        />
      )}

      {/* MODAL CRÉATION NOUVELLE ANNÉE */}
      {showNewAnneeModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Ouvrir une nouvelle année scolaire</span>
              </h3>
              <button
                onClick={() => setShowNewAnneeModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnee} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Libellé officiel de l'année scolaire :
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 2027–2028"
                  value={newLibelle}
                  onChange={(e) => setNewLibelle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date de début :</label>
                <input
                  type="date"
                  required
                  value={newDateDebut}
                  onChange={(e) => setNewDateDebut(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date de clôture :</label>
                <input
                  type="date"
                  required
                  value={newDateFin}
                  onChange={(e) => setNewDateFin(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewAnneeModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
                >
                  Créer l'année
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Composant de l'onglet Bulletin Historique interactif
 */
interface HistoricalBulletinTabProps {
  consultingAnnee: AnneeScolaire;
  classes: Classe[];
  periodesAnnee: Periode[];
  matieres: Matiere[];
  onNavigateGlobalBulletins: () => void;
}

const HistoricalBulletinTab: React.FC<HistoricalBulletinTabProps> = ({
  consultingAnnee,
  classes,
  periodesAnnee,
  matieres,
  onNavigateGlobalBulletins,
}) => {
  const [selectedClasseId, setSelectedClasseId] = useState<string>(classes[0]?.id || '');
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>(periodesAnnee[0]?.id || '');

  const elevesClasse = selectedClasseId
    ? storage.getElevesByClasse(selectedClasseId, consultingAnnee.libelle)
    : [];
  const [selectedEleveId, setSelectedEleveId] = useState<string>(elevesClasse[0]?.id || '');

  React.useEffect(() => {
    if (elevesClasse.length > 0 && !elevesClasse.some((e) => e.id === selectedEleveId)) {
      setSelectedEleveId(elevesClasse[0].id);
    }
  }, [elevesClasse, selectedEleveId]);

  const currentClasse = classes.find((c) => c.id === selectedClasseId);
  const currentPeriode = periodesAnnee.find((p) => p.id === selectedPeriodeId) || periodesAnnee[0];
  const currentEleve = elevesClasse.find((e) => e.id === selectedEleveId);

  const allNotes = storage.getNotes();
  const affectationsAnnee = storage.getAffectations(consultingAnnee.libelle);

  // Calcul du classement et des bulletins
  const { classement, bulletinsMap } = useMemo(() => {
    if (!currentClasse || !currentPeriode) return { classement: [], bulletinsMap: {} };
    return calculerClassementClasse(
      currentClasse,
      elevesClasse,
      currentPeriode,
      matieres,
      allNotes,
      affectationsAnnee
    );
  }, [currentClasse, elevesClasse, currentPeriode, matieres, allNotes, affectationsAnnee]);

  const bulletinEleve = currentEleve ? bulletinsMap[currentEleve.id] : null;

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Classe :</label>
            <select
              value={selectedClasseId}
              onChange={(e) => setSelectedClasseId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 cursor-pointer"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Période :</label>
            <select
              value={selectedPeriodeId}
              onChange={(e) => setSelectedPeriodeId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 cursor-pointer"
            >
              {periodesAnnee.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Élève :</label>
            <select
              value={selectedEleveId}
              onChange={(e) => setSelectedEleveId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 cursor-pointer"
            >
              {elevesClasse.length === 0 ? (
                <option value="">Aucun élève</option>
              ) : (
                elevesClasse.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.nom} {el.prenom} ({el.matricule})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Imprimer</span>
          </button>

          <button
            onClick={onNavigateGlobalBulletins}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ouvrir dans l’Espace Bulletins complet</span>
          </button>
        </div>
      </div>

      {/* Rendu du bulletin officiel */}
      {bulletinEleve ? (
        <BulletinPrintableContent
          bulletin={bulletinEleve}
          anneeLibelle={consultingAnnee.libelle}
        />
      ) : (
        <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
          Aucun bulletin disponible pour cette sélection dans l'année {consultingAnnee.libelle}.
        </div>
      )}
    </div>
  );
};

/**
 * Modal d'affichage direct du bulletin officiel
 */
interface HistoricalBulletinModalProps {
  eleve: Eleve;
  consultingAnnee: AnneeScolaire;
  periodesAnnee: Periode[];
  matieres: Matiere[];
  onClose: () => void;
  onNavigateGlobalBulletins: () => void;
}

const HistoricalBulletinModal: React.FC<HistoricalBulletinModalProps> = ({
  eleve,
  consultingAnnee,
  periodesAnnee,
  matieres,
  onClose,
  onNavigateGlobalBulletins,
}) => {
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>(periodesAnnee[0]?.id || '');
  const currentPeriode = periodesAnnee.find((p) => p.id === selectedPeriodeId) || periodesAnnee[0];
  const classe = storage.getClasseOfEleve(eleve.id, consultingAnnee.libelle) || storage.getClasseById(eleve.classe_id);
  const elevesClasse = classe ? storage.getElevesByClasse(classe.id, consultingAnnee.libelle) : [eleve];
  const allNotes = storage.getNotes();
  const affectationsAnnee = storage.getAffectations(consultingAnnee.libelle);

  const { bulletinsMap } = useMemo(() => {
    if (!classe || !currentPeriode) return { classement: [], bulletinsMap: {} };
    const presencesMap: Record<string, { totalAbsences: number; estAbandon: boolean }> = {};
    for (const e of elevesClasse) {
      presencesMap[e.id] = {
        totalAbsences: storage.getEleveAbsencesCount(e.id, consultingAnnee.libelle, currentPeriode.id),
        estAbandon: storage.isEleveAbandon(e.id, consultingAnnee.libelle),
      };
    }
    return calculerClassementClasse(
      classe,
      elevesClasse,
      currentPeriode,
      matieres,
      allNotes,
      affectationsAnnee,
      presencesMap
    );
  }, [classe, elevesClasse, currentPeriode, matieres, allNotes, affectationsAnnee, consultingAnnee.libelle]);

  const bulletin = bulletinsMap[eleve.id];

  return (
    <div className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-300">
        {/* En-tête du modal */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex justify-between items-center rounded-t-xl">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
              Bulletin Historique
            </span>
            <span className="font-bold text-sm">
              {eleve.nom} {eleve.prenom} • Année {consultingAnnee.libelle}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedPeriodeId}
              onChange={(e) => setSelectedPeriodeId(e.target.value)}
              className="bg-slate-800 text-amber-300 font-bold text-xs px-2 py-1 rounded border border-slate-700 cursor-pointer"
            >
              {periodesAnnee.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </select>

            <button
              onClick={() => window.print()}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white text-base font-bold ml-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenu du bulletin */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
          {bulletin ? (
            <BulletinPrintableContent bulletin={bulletin} anneeLibelle={consultingAnnee.libelle} />
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Bulletin indisponible pour cette période.
            </div>
          )}
        </div>

        {/* Pied de page du modal */}
        <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center rounded-b-xl">
          <span className="text-[11px] text-slate-500 font-medium">
            Session officielle {consultingAnnee.libelle} • Classe : {classe?.nom}
          </span>
          <button
            onClick={onNavigateGlobalBulletins}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
          >
            Ouvrir dans l’onglet Bulletins général →
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Présentation fidèle et officielle du Bulletin Béninois
 */
interface BulletinPrintableContentProps {
  bulletin: any;
  anneeLibelle: string;
}

const BulletinPrintableContent: React.FC<BulletinPrintableContentProps> = ({
  bulletin,
  anneeLibelle,
}) => {
  const { eleve, classe, periode, matieres_notes, total_points, total_coefficients, moyenne_generale, appreciation_generale, rang_label, effectif_classe } = bulletin;
  const params = storage.getParametres();

  return (
    <div className="bg-white p-5 sm:p-7 rounded-xl border border-slate-300 shadow-sm text-slate-900 text-xs space-y-4">
      {/* En-tête officiel République du Bénin */}
      <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start text-[11px]">
        <div>
          <div className="font-bold uppercase tracking-wider text-slate-900">
            RÉPUBLIQUE DU BÉNIN
          </div>
          <div className="text-[10px] text-slate-600">{params.ministere}</div>
          <div className="font-extrabold text-slate-900 text-sm mt-0.5">
            {params.nom_etablissement}
          </div>
          <div className="text-[10px] text-slate-500">
            Commune de {params.commune} • Arrondissement de {params.arrondissement}
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-amber-100 border border-amber-300 text-amber-950 font-black px-2 py-0.5 rounded text-[10px] uppercase">
            ARCHIVE OFFICIELLE
          </div>
          <div className="text-xs font-bold text-slate-900 mt-1">
            ANNÉE SCOLAIRE {anneeLibelle}
          </div>
          <div className="font-extrabold text-emerald-800 text-xs mt-0.5">
            BULLETIN DE NOTES • {periode?.nom?.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Cartouche d'identité de l'élève */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Matricule</span>
          <span className="font-mono font-black text-slate-900">{eleve.matricule}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Nom & Prénom</span>
          <span className="font-extrabold text-slate-900">
            {eleve.nom} {eleve.prenom}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Classe Historique</span>
          <span className="font-black text-emerald-800">{classe.nom}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Effectif Classe</span>
          <span className="font-bold text-slate-900">{effectif_classe} élèves</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Absences</span>
          <span className="font-bold text-slate-900">{bulletin.total_absences ?? 0} séance(s)</span>
        </div>
        {bulletin.est_abandon && (
          <div className="sm:col-span-2">
            <span className="bg-red-700 text-white font-black px-2 py-0.5 rounded text-[10px] uppercase">
              ⚠ STATUT : APPRENANT AYANT ABANDONNÉ
            </span>
          </div>
        )}
      </div>

      {/* Tableau des notes par matière */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="py-2 px-2.5">Discipline</th>
              <th className="py-2 px-2 text-center">Int. 1</th>
              <th className="py-2 px-2 text-center">Int. 2</th>
              <th className="py-2 px-2 text-center">Int. 3</th>
              <th className="py-2 px-2 text-center">Moy. Int.</th>
              <th className="py-2 px-2 text-center">Dev. 1</th>
              <th className="py-2 px-2 text-center">Dev. 2</th>
              <th className="py-2 px-2 text-center">Moy. Mat.</th>
              <th className="py-2 px-2 text-center">Coef</th>
              <th className="py-2 px-2 text-center">Points</th>
              <th className="py-2 px-2.5">Appréciation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matieres_notes.map((mn: any) => (
              <tr key={mn.matiere_id} className="hover:bg-slate-50/80">
                <td className="py-2 px-2.5 font-bold text-slate-900">{mn.matiere_nom}</td>
                <td className="py-2 px-2 text-center font-mono text-slate-600">
                  {mn.interro_1 !== null ? mn.interro_1.toFixed(1) : '-'}
                </td>
                <td className="py-2 px-2 text-center font-mono text-slate-600">
                  {mn.interro_2 !== null ? mn.interro_2.toFixed(1) : '-'}
                </td>
                <td className="py-2 px-2 text-center font-mono text-slate-600">
                  {mn.interro_3 !== null ? mn.interro_3.toFixed(1) : '-'}
                </td>
                <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700 bg-slate-50/50">
                  {mn.moyenne_interros !== null ? mn.moyenne_interros.toFixed(2) : '-'}
                </td>
                <td className="py-2 px-2 text-center font-mono text-slate-600">
                  {mn.devoir_1 !== null ? mn.devoir_1.toFixed(1) : '-'}
                </td>
                <td className="py-2 px-2 text-center font-mono text-slate-600">
                  {mn.devoir_2 !== null ? mn.devoir_2.toFixed(1) : '-'}
                </td>
                <td className="py-2 px-2 text-center font-mono font-extrabold text-slate-900 bg-slate-50">
                  {mn.moyenne !== null ? (
                    <span className={mn.moyenne >= 10 ? 'text-emerald-700' : 'text-red-700'}>
                      {mn.moyenne.toFixed(2)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="py-2 px-2 text-center font-mono text-slate-600">{mn.coefficient}</td>
                <td className="py-2 px-2 text-center font-mono font-bold text-slate-900">
                  {mn.points !== null ? mn.points.toFixed(2) : '-'}
                </td>
                <td className="py-2 px-2.5">
                  <span className="text-[10px] font-semibold text-slate-700">
                    {mn.appreciation}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Synthèse générale des résultats */}
      <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Points</span>
          <span className="font-mono font-black text-slate-900 text-sm">{total_points}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Coefs</span>
          <span className="font-mono font-black text-slate-900 text-sm">{total_coefficients}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Moyenne Générale</span>
          <span
            className={`font-mono font-black text-base ${
              moyenne_generale !== null && moyenne_generale >= 10 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {moyenne_generale !== null ? `${moyenne_generale.toFixed(2)}/20` : 'N.C'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Rang Officiel</span>
          <span className="font-black text-slate-900 text-base bg-amber-300 px-2 py-0.5 rounded">
            {rang_label || 'N.C'}
          </span>
        </div>
      </div>

      {/* Appréciation & Observation Direction */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            Appréciation Générale du Conseil des Professeurs
          </span>
          <span className="font-black text-slate-900 text-sm">{appreciation_generale}</span>
        </div>
        <div className="text-right text-[11px] text-slate-500">
          Observation Direction : <em>Travail régulier. Conserver ces acquis.</em>
        </div>
      </div>
    </div>
  );
};
