import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { 
  PaiementContribution, 
  ContributionConfig, 
  DepenseBudgetaire, 
  TranchePaiement, 
  ModePaiement, 
  CategorieContribution, 
  CategorieDepense, 
  Eleve, 
  Classe 
} from '../../types';
import { 
  CreditCard, 
  Users, 
  School, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Printer, 
  Search, 
  Filter, 
  Receipt, 
  TrendingUp, 
  DollarSign, 
  Check, 
  Trash2, 
  ArrowRight,
  ShieldCheck,
  FileText,
  Tag,
  Wallet,
  PieChart,
  IdCard,
  QrCode,
  AlertTriangle,
  Edit,
  X
} from 'lucide-react';
import { TabKey } from '../Navigation';

interface ComptableDashboardProps {
  onNavigate: (tab: TabKey) => void;
}

type TabCompta = 'contributions' | 'nouveau' | 'registre' | 'cartes' | 'depenses' | 'etats';

export const ComptableDashboard: React.FC<ComptableDashboardProps> = ({ onNavigate }) => {
  const { currentUser, isComptable, isCenseur, isDirecteur, isConcepteur } = useAuth();
  const { selectedAnnee, isArchive } = useAnnee();

  const [activeTab, setActiveTab] = useState<TabCompta>('registre');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const classes = storage.getClasses();
  const allEleves = storage.getElevesByAnnee(selectedAnnee.libelle);
  const canModify = !isArchive && (isComptable || isCenseur || isDirecteur || isConcepteur);

  // -------------------------------------------------------------
  // DONNÉES FINANCIÈRES RÉELLES (SANS DONNÉES FICTIVES)
  // -------------------------------------------------------------
  const [contributions, setContributions] = useState<ContributionConfig[]>(() => 
    storage.getContributions(selectedAnnee.libelle)
  );
  const [paiementsAnnee, setPaiementsAnnee] = useState<PaiementContribution[]>(() => 
    storage.getPaiementsByAnnee(selectedAnnee.libelle)
  );
  const [depensesAnnee, setDepensesAnnee] = useState<DepenseBudgetaire[]>(() => 
    storage.getDepenses(selectedAnnee.libelle)
  );

  const refreshData = () => {
    setContributions(storage.getContributions(selectedAnnee.libelle));
    setPaiementsAnnee(storage.getPaiementsByAnnee(selectedAnnee.libelle));
    setDepensesAnnee(storage.getDepenses(selectedAnnee.libelle));
  };

  useEffect(() => {
    refreshData();
  }, [selectedAnnee.libelle]);

  // -------------------------------------------------------------
  // 1. GESTION DES RUBRIQUES DE CONTRIBUTIONS
  // -------------------------------------------------------------
  const [contribLibelle, setContribLibelle] = useState('');
  const [contribCategorie, setContribCategorie] = useState<CategorieContribution>('SCOLARITE');
  const [contribMontant, setContribMontant] = useState<number>(0);
  const [contribPublic, setContribPublic] = useState<string>('TOUS');
  const [contribClasseId, setContribClasseId] = useState<string>('');
  const [contribObs, setContribObs] = useState<string>('');
  const [editingContribId, setEditingContribId] = useState<string | null>(null);

  const handleSaveContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!canModify) {
      setStatusMessage({ type: 'error', text: 'Opération refusée : permissions insuffisantes ou année en lecture seule.' });
      return;
    }
    if (!contribLibelle.trim()) {
      setStatusMessage({ type: 'error', text: 'Veuillez saisir le libellé de la contribution.' });
      return;
    }
    if (contribMontant <= 0) {
      setStatusMessage({ type: 'error', text: 'Le montant prévu par apprenant doit être supérieur à zéro.' });
      return;
    }

    try {
      if (editingContribId) {
        storage.updateContribution(
          editingContribId,
          {
            libelle: contribLibelle.trim(),
            categorie: contribCategorie,
            montant_prevu: contribMontant,
            public_cible: contribPublic,
            classe_id: contribPublic === 'CLASSE' ? contribClasseId : undefined,
            observation: contribObs.trim() || undefined,
          },
          currentUser
        );
        setStatusMessage({ type: 'success', text: `✓ Contribution "${contribLibelle}" modifiée avec succès.` });
        setEditingContribId(null);
      } else {
        storage.saveContribution(
          {
            libelle: contribLibelle.trim(),
            categorie: contribCategorie,
            annee_scolaire: selectedAnnee.libelle,
            montant_prevu: contribMontant,
            public_cible: contribPublic,
            classe_id: contribPublic === 'CLASSE' ? contribClasseId : undefined,
            observation: contribObs.trim() || undefined,
            statut: 'ACTIF',
          },
          currentUser
        );
        setStatusMessage({ type: 'success', text: `✓ Nouvelle rubrique "${contribLibelle}" enregistrée (${contribMontant.toLocaleString()} FCFA / élève).` });
      }

      // Reset form
      setContribLibelle('');
      setContribMontant(0);
      setContribObs('');
      refreshData();
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.' });
    }
  };

  const handleEditContribution = (c: ContributionConfig) => {
    setEditingContribId(c.id);
    setContribLibelle(c.libelle);
    setContribCategorie(c.categorie);
    setContribMontant(c.montant_prevu);
    setContribPublic(c.public_cible);
    setContribClasseId(c.classe_id || '');
    setContribObs(c.observation || '');
  };

  const handleDeleteContribution = (id: string) => {
    if (!currentUser || !canModify) return;
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette rubrique de contribution ?")) {
      try {
        storage.deleteContribution(id, currentUser);
        setStatusMessage({ type: 'success', text: '✓ Rubrique de contribution supprimée.' });
        refreshData();
      } catch (err: unknown) {
        setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur de suppression.' });
      }
    }
  };

  // -------------------------------------------------------------
  // 2. ENREGISTREMENT D'UN PAIEMENT D'ÉLÈVE
  // -------------------------------------------------------------
  const [formClasseId, setFormClasseId] = useState<string>(classes[0]?.id || 'cls-6a');
  const elevesFormClasse = useMemo(() => {
    return storage.getElevesByClasse(formClasseId, selectedAnnee.libelle);
  }, [formClasseId, selectedAnnee.libelle]);

  const [formEleveId, setFormEleveId] = useState<string>(elevesFormClasse[0]?.id || '');
  const [formContribId, setFormContribId] = useState<string>(contributions[0]?.id || '');
  const [formTranche, setFormTranche] = useState<TranchePaiement>('TRANCHE_1');
  const [formMontant, setFormMontant] = useState<number>(0);
  const [formMode, setFormMode] = useState<ModePaiement>('ESPECES');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formReference, setFormReference] = useState<string>('');
  const [formObservation, setFormObservation] = useState<string>('');

  // Reçu sélectionné pour modal d'impression
  const [selectedRecuForPrint, setSelectedRecuForPrint] = useState<PaiementContribution | null>(null);

  // Synchronisation élève et contribution
  useEffect(() => {
    if (elevesFormClasse.length > 0 && !elevesFormClasse.some((e) => e.id === formEleveId)) {
      setFormEleveId(elevesFormClasse[0].id);
    }
  }, [elevesFormClasse, formEleveId]);

  useEffect(() => {
    if (contributions.length > 0 && !contributions.some((c) => c.id === formContribId)) {
      setFormContribId(contributions[0].id);
    }
  }, [contributions, formContribId]);

  // Contribution sélectionnée dans le formulaire de paiement
  const selectedFormContrib = useMemo(() => {
    return contributions.find((c) => c.id === formContribId) || contributions[0];
  }, [contributions, formContribId]);

  // Montant exigé par défaut pour cette contribution
  const montantExigeForm = selectedFormContrib?.montant_prevu || 0;

  // Calcul du total déjà versé par cet élève pour cette contribution
  const dejaPayePourContrib = useMemo(() => {
    if (!formEleveId) return 0;
    return paiementsAnnee
      .filter((p) => p.eleve_id === formEleveId && (p.contribution_id === formContribId || (!p.contribution_id && selectedFormContrib?.categorie === 'SCOLARITE')))
      .reduce((sum, curr) => sum + curr.montant_paye, 0);
  }, [paiementsAnnee, formEleveId, formContribId, selectedFormContrib]);

  const resteAPayerForm = Math.max(0, montantExigeForm - dejaPayePourContrib);

  // Pré-remplir le montant avec le reste à payer si non nul
  useEffect(() => {
    if (resteAPayerForm > 0 && formMontant === 0) {
      setFormMontant(resteAPayerForm);
    }
  }, [resteAPayerForm, formContribId, formEleveId]);

  const handleSavePaiement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!canModify) {
      setStatusMessage({ type: 'error', text: 'Impossible d’enregistrer : permissions insuffisantes ou année en lecture seule.' });
      return;
    }
    if (!formEleveId) {
      setStatusMessage({ type: 'error', text: 'Veuillez sélectionner un élève valide.' });
      return;
    }
    if (formMontant <= 0) {
      setStatusMessage({ type: 'error', text: 'Le montant payé doit être supérieur à zéro.' });
      return;
    }

    try {
      const nouveauCumul = dejaPayePourContrib + Number(formMontant);
      const reste = Math.max(0, montantExigeForm - nouveauCumul);
      const statut = reste === 0 ? 'SOLDE' : nouveauCumul > 0 ? 'PARTIEL' : 'NON_SOLDE';

      // Numérotation automatique du reçu officiel : REC-YYYY-XXXX
      const anneePrefix = selectedAnnee.libelle.split('–')[0].trim();
      const numSequence = String(paiementsAnnee.length + 1).padStart(4, '0');
      const numeroRecu = `REC-${anneePrefix}-${numSequence}`;

      const nouveau = storage.savePaiement(
        {
          numero_recu: numeroRecu,
          annee_scolaire: selectedAnnee.libelle,
          eleve_id: formEleveId,
          classe_id: formClasseId,
          tranche: formTranche,
          contribution_id: selectedFormContrib?.id,
          contribution_libelle: selectedFormContrib?.libelle || 'Contribution scolaire',
          categorie_contribution: selectedFormContrib?.categorie || 'SCOLARITE',
          montant_paye: Number(formMontant),
          montant_total_exige: montantExigeForm,
          reste_a_payer: reste,
          statut_paiement: statut,
          mode_paiement: formMode,
          reference_recu: formReference.trim() || undefined,
          observation: formObservation.trim() || undefined,
          enregistre_par_id: currentUser.id,
          enregistre_par_nom: `${currentUser.nom} ${currentUser.prenom}`,
          date_paiement: formDate,
        },
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: `✓ Versement enregistré avec succès sous le reçu officiel N° ${nouveau.numero_recu} (${formMontant.toLocaleString()} FCFA). Reste à solder : ${reste.toLocaleString()} FCFA.`,
      });

      setSelectedRecuForPrint(nouveau);
      setFormReference('');
      setFormObservation('');
      refreshData();
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erreur lors de l’enregistrement du versement.',
      });
    }
  };

  const handleDeletePaiement = (id: string) => {
    if (!currentUser || !canModify) return;
    if (window.confirm("Êtes-vous certain de vouloir annuler et supprimer ce versement ? Cette opération sera auditée.")) {
      try {
        storage.deletePaiement(id, currentUser);
        setStatusMessage({ type: 'success', text: '✓ Reçu supprimé de la comptabilité.' });
        refreshData();
      } catch (err: unknown) {
        setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la suppression.' });
      }
    }
  };

  // -------------------------------------------------------------
  // 3. BUDGETS ET DÉPENSES
  // -------------------------------------------------------------
  const [depenseLibelle, setDepenseLibelle] = useState('');
  const [depenseCategorie, setDepenseCategorie] = useState<CategorieDepense>('FONCTIONNEMENT');
  const [depenseAlloue, setDepenseAlloue] = useState<number>(0);
  const [depenseMontant, setDepenseMontant] = useState<number>(0);
  const [depenseDate, setDepenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [depenseBeneficiaire, setDepenseBeneficiaire] = useState('');
  const [depensePiece, setDepensePiece] = useState('');
  const [depenseObs, setDepenseObs] = useState('');

  const handleSaveDepense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !canModify) {
      setStatusMessage({ type: 'error', text: 'Action refusée : permissions requises.' });
      return;
    }
    if (!depenseLibelle.trim()) {
      setStatusMessage({ type: 'error', text: 'Veuillez saisir le libellé de la dépense.' });
      return;
    }
    if (depenseMontant <= 0) {
      setStatusMessage({ type: 'error', text: 'Le montant décaissé doit être supérieur à zéro.' });
      return;
    }
    if (!depenseBeneficiaire.trim()) {
      setStatusMessage({ type: 'error', text: 'Veuillez préciser le bénéficiaire ou prestataire.' });
      return;
    }

    try {
      storage.saveDepense(
        {
          annee_scolaire: selectedAnnee.libelle,
          libelle: depenseLibelle.trim(),
          categorie: depenseCategorie,
          montant_alloue: Number(depenseAlloue) || Number(depenseMontant),
          montant_depense: Number(depenseMontant),
          date_depense: depenseDate,
          beneficiaire: depenseBeneficiaire.trim(),
          piece_justificative: depensePiece.trim() || undefined,
          observation: depenseObs.trim() || undefined,
          enregistre_par_id: currentUser.id,
          enregistre_par_nom: `${currentUser.nom} ${currentUser.prenom}`,
        },
        currentUser
      );

      setStatusMessage({
        type: 'success',
        text: `✓ Dépense "${depenseLibelle}" enregistrée (${depenseMontant.toLocaleString()} FCFA).`,
      });

      setDepenseLibelle('');
      setDepenseMontant(0);
      setDepenseAlloue(0);
      setDepenseBeneficiaire('');
      setDepensePiece('');
      setDepenseObs('');
      refreshData();
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur d’enregistrement de la dépense.' });
    }
  };

  const handleDeleteDepense = (id: string) => {
    if (!currentUser || !canModify) return;
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette ligne de dépense ?")) {
      try {
        storage.deleteDepense(id, currentUser);
        setStatusMessage({ type: 'success', text: '✓ Dépense supprimée du registre.' });
        refreshData();
      } catch (err: unknown) {
        setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la suppression.' });
      }
    }
  };

  // -------------------------------------------------------------
  // 4. CARTES SCOLAIRES
  // -------------------------------------------------------------
  const [carteClasseId, setCarteClasseId] = useState<string>(classes[0]?.id || 'cls-6a');
  const elevesCarteClasse = useMemo(() => {
    return storage.getElevesByClasse(carteClasseId, selectedAnnee.libelle);
  }, [carteClasseId, selectedAnnee.libelle]);

  // -------------------------------------------------------------
  // FILTRES ET STATISTIQUES GLOBALES
  // -------------------------------------------------------------
  const [searchEleve, setSearchEleve] = useState('');
  const [filtreClasse, setFiltreClasse] = useState('ALL');
  const [filtreStatut, setFiltreStatut] = useState<'ALL' | 'SOLDE' | 'PARTIEL'>('ALL');
  const [filtreContrib, setFiltreContrib] = useState<string>('ALL');

  const filteredPaiements = useMemo(() => {
    return paiementsAnnee.filter((p) => {
      if (filtreClasse !== 'ALL' && p.classe_id !== filtreClasse) return false;
      if (filtreStatut !== 'ALL' && p.statut_paiement !== filtreStatut) return false;
      if (filtreContrib !== 'ALL' && p.contribution_id !== filtreContrib) return false;
      if (searchEleve.trim() !== '') {
        const el = storage.getEleveById(p.eleve_id);
        const q = `${el?.nom || ''} ${el?.prenom || ''} ${el?.matricule || ''} ${p.numero_recu}`.toLowerCase();
        if (!q.includes(searchEleve.toLowerCase())) return false;
      }
      return true;
    });
  }, [paiementsAnnee, filtreClasse, filtreStatut, filtreContrib, searchEleve]);

  // Totaux financiers réels
  const totalEncaisse = useMemo(() => {
    return paiementsAnnee.reduce((acc, curr) => acc + curr.montant_paye, 0);
  }, [paiementsAnnee]);

  const totalDepenses = useMemo(() => {
    return depensesAnnee.reduce((acc, curr) => acc + curr.montant_depense, 0);
  }, [depensesAnnee]);

  const soldeTresorerie = totalEncaisse - totalDepenses;

  // Calcul du cumul exigé total basé sur les contributions actives créées par le Comptable
  const totalExigibleTotal = useMemo(() => {
    let sum = 0;
    contributions.forEach((c) => {
      if (c.public_cible === 'TOUS') {
        sum += c.montant_prevu * allEleves.length;
      } else if (c.classe_id) {
        const nb = storage.getElevesByClasse(c.classe_id, selectedAnnee.libelle).length;
        sum += c.montant_prevu * nb;
      }
    });
    return sum;
  }, [contributions, allEleves.length, selectedAnnee.libelle]);

  const resteGlobalRecouvrer = Math.max(0, totalExigibleTotal - totalEncaisse);

  const getCumulPayeEleve = (eleveId: string) => {
    return paiementsAnnee
      .filter((p) => p.eleve_id === eleveId)
      .reduce((acc, curr) => acc + curr.montant_paye, 0);
  };

  return (
    <div className="space-y-6">
      {/* 1. EN-TÊTE OFFICIEL DE L'ESPACE FINANCES */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-xl p-5 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-950" />
                <span>Service Comptabilité & Économat • CEG GOGBO</span>
              </span>
              <span className="text-teal-200 text-xs">• Année {selectedAnnee.libelle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1 text-white flex items-center space-x-2">
              <span>GESTION FINANCIÈRE, CONTRIBUTIONS & BUDGET</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              Gestion intégrale de l'établissement : paramétrage des contributions réelles, enregistrement des versements d'apprenants, émission des reçus officiels, conception des cartes scolaires et exécution des dépenses budgétaires.
            </p>
          </div>

          {/* Navigation interne */}
          <div className="flex flex-wrap items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('registre')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'registre'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Registre Reçus ({paiementsAnnee.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('nouveau')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'nouveau'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Nouveau Versement</span>
            </button>
            <button
              onClick={() => setActiveTab('contributions')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'contributions'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-cyan-300" />
              <span>Contributions ({contributions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('cartes')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'cartes'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <IdCard className="w-3.5 h-3.5 text-indigo-300" />
              <span>Cartes Scolaires</span>
            </button>
            <button
              onClick={() => setActiveTab('depenses')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'depenses'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-rose-300" />
              <span>Budget & Dépenses ({depensesAnnee.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('etats')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'etats'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-emerald-300" />
              <span>Bilan Financier</span>
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
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
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

      {/* 2. TABLEAU DE BORD FINANCIER RÉEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase">Total Encaissé ({selectedAnnee.libelle})</div>
            <div className="text-xl font-black text-teal-800">{totalEncaisse.toLocaleString()} FCFA</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase">Dépenses Exécutées</div>
            <div className="text-xl font-black text-rose-700">{totalDepenses.toLocaleString()} FCFA</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase">Trésorerie Disponible</div>
            <div className={`text-xl font-black ${soldeTresorerie >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {soldeTresorerie.toLocaleString()} FCFA
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase">Reste Global à Recouvrer</div>
            <div className="text-xl font-black text-amber-700">{resteGlobalRecouvrer.toLocaleString()} FCFA</div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------------------- */}
      {/* 3. ONGLET : GESTION DES CONTRIBUTIONS                                            */}
      {/* --------------------------------------------------------------------------------- */}
      {activeTab === 'contributions' && (
        <div className="space-y-6">
          {/* Formulaire de configuration */}
          {canModify && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-teal-600" />
                    <span>{editingContribId ? 'Modifier la Contribution' : 'Créer une Nouvelle Rubrique de Contribution'}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Définissez les montants officiels réellement exigés pour l'année scolaire {selectedAnnee.libelle} (Scolarité, Tenue de sport / T-shirt, Cartes scolaires, etc.)
                  </p>
                </div>
                {editingContribId && (
                  <button
                    onClick={() => {
                      setEditingContribId(null);
                      setContribLibelle('');
                      setContribMontant(0);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Annuler la modification
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveContribution} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Libellé de la contribution *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Contribution scolaire annuelle, T-shirt / Tenue de sport, Carte d'identité scolaire..."
                    value={contribLibelle}
                    onChange={(e) => setContribLibelle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Catégorie
                  </label>
                  <select
                    value={contribCategorie}
                    onChange={(e) => setContribCategorie(e.target.value as CategorieContribution)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="SCOLARITE">Contribution Scolaire Principale</option>
                    <option value="TSHIRT">T-shirt / Tenue de sport</option>
                    <option value="CARTE_SCOLAIRE">Carte scolaire</option>
                    <option value="AUTRE">Autre contribution spécifique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Montant prévu par apprenant (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="500"
                    required
                    placeholder="Montant réel..."
                    value={contribMontant || ''}
                    onChange={(e) => setContribMontant(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Public concerné
                  </label>
                  <select
                    value={contribPublic}
                    onChange={(e) => setContribPublic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="TOUS">Tous les apprenants du collège</option>
                    <option value="PREMIER_CYCLE">Premier Cycle (6ème à 3ème)</option>
                    <option value="SECOND_CYCLE">Second Cycle (2nde à Tle)</option>
                    <option value="CLASSE">Une classe spécifique</option>
                  </select>
                </div>

                {contribPublic === 'CLASSE' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Classe concernée
                    </label>
                    <select
                      value={contribClasseId}
                      onChange={(e) => setContribClasseId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Observation / Délibération
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Décision de l'Assemblée Générale de l'APE..."
                    value={contribObs}
                    onChange={(e) => setContribObs(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs py-2 px-5 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>{editingContribId ? 'Mettre à jour la rubrique' : 'Enregistrer cette contribution'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tableau des contributions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">
                Rubriques de Contributions en vigueur ({contributions.length})
              </h3>
              <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                Année {selectedAnnee.libelle}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Libellé de la contribution</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3 text-right">Montant exigé / élève</th>
                    <th className="px-4 py-3">Public concerné</th>
                    <th className="px-4 py-3">Observation</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {contributions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500 font-medium">
                        Aucune donnée financière enregistrée.
                        <div className="text-xs text-slate-400 mt-1">
                          Le Comptable doit lui-même créer les contributions réelles utilisées par le CEG GOGBO (Scolarité, T-shirt, Cartes scolaires, etc.).
                        </div>
                      </td>
                    </tr>
                  ) : (
                    contributions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {c.libelle}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-teal-50 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            {c.categorie}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-teal-800 text-sm">
                          {c.montant_prevu.toLocaleString()} FCFA
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {c.public_cible === 'TOUS' ? 'Tous les apprenants' : c.public_cible}
                          {c.classe_id && ` (${storage.getClasseById(c.classe_id)?.nom})`}
                        </td>
                        <td className="px-4 py-3 text-slate-500 italic">
                          {c.observation || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {canModify && (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleEditContribution(c)}
                                className="text-slate-600 hover:text-teal-700 p-1 rounded hover:bg-teal-50 cursor-pointer"
                                title="Modifier"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteContribution(c.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* 4. ONGLET : NOUVEAU VERSEMENT                                                    */}
      {/* --------------------------------------------------------------------------------- */}
      {activeTab === 'nouveau' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          <div className="pb-3 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-teal-600" />
                <span>Enregistrement d'un Versement d'Apprenant</span>
              </h3>
              <p className="text-xs text-slate-500">
                Saisie officielle des encaissements par élève, calcul automatique du reliquat et délivrance instantanée du reçu numéroté.
              </p>
            </div>
            <span className="text-xs bg-teal-50 text-teal-800 font-bold px-3 py-1 rounded-full border border-teal-200">
              Session {selectedAnnee.libelle}
            </span>
          </div>

          {contributions.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 text-xs space-y-2">
              <div className="font-bold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Aucune rubrique de contribution configurée</span>
              </div>
              <p>
                Avant d'enregistrer des versements, vous devez configurer au moins une contribution (Scolarité, T-shirt / Tenue de sport, Cartes scolaires, etc.) dans l'onglet "Contributions".
              </p>
              <button
                onClick={() => setActiveTab('contributions')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded text-xs cursor-pointer"
              >
                Configurer une contribution maintenant
              </button>
            </div>
          ) : (
            <form onSubmit={handleSavePaiement} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Sélection Contribution */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Rubrique de contribution *
                  </label>
                  <select
                    value={formContribId}
                    onChange={(e) => setFormContribId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {contributions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.libelle} ({c.montant_prevu.toLocaleString()} FCFA)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Sélection Classe */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Classe de l'apprenant *
                  </label>
                  <select
                    value={formClasseId}
                    onChange={(e) => setFormClasseId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
                    ))}
                  </select>
                </div>

                {/* 3. Sélection Élève */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Élève concerné *
                  </label>
                  <select
                    value={formEleveId}
                    onChange={(e) => setFormEleveId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {elevesFormClasse.length === 0 ? (
                      <option value="">Aucun élève dans cette classe</option>
                    ) : (
                      elevesFormClasse.map((el) => (
                        <option key={el.id} value={el.id}>
                          {el.nom} {el.prenom} ({el.matricule})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Encadré d'état du compte de l'élève pour cette contribution */}
              {formEleveId && (
                <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[10px]">Montant Prévu Officiel</span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {montantExigeForm.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[10px]">Déjà Réglé par l'élève</span>
                    <span className="text-sm font-black text-teal-800 font-mono">
                      {dejaPayePourContrib.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[10px]">Reste Actuel à Payer</span>
                    <span className={`text-sm font-black font-mono ${resteAPayerForm > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {resteAPayerForm.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[10px]">Statut Actuel</span>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      resteAPayerForm === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : dejaPayePourContrib > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {resteAPayerForm === 0 ? '✓ Soldé' : dejaPayePourContrib > 0 ? 'Partiel' : 'Non Soldé'}
                    </span>
                  </div>
                </div>
              )}

              {/* Paramètres du versement */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Montant de ce Versement (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    value={formMontant || ''}
                    onChange={(e) => setFormMontant(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-black text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tranche / Échéance
                  </label>
                  <select
                    value={formTranche}
                    onChange={(e) => setFormTranche(e.target.value as TranchePaiement)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="TRANCHE_1">1ère Tranche (Rentrée)</option>
                    <option value="TRANCHE_2">2ème Tranche</option>
                    <option value="TRANCHE_3">3ème Tranche</option>
                    <option value="SOLDE_TOTAL">Solde Total / Unique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mode de règlement
                  </label>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value as ModePaiement)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ESPECES">Espèces (Caisse)</option>
                    <option value="MOBILE_MONEY">Mobile Money (MTN / Moov)</option>
                    <option value="VIREMENT_BANCAIRE">Virement Bancaire</option>
                    <option value="CHEQUE">Chèque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Date du versement
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Référence externe (N° bordereau / transaction)
                  </label>
                  <input
                    type="text"
                    placeholder="Optionnel (ex: TX-98273645...)"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Observation du Comptable
                  </label>
                  <input
                    type="text"
                    placeholder="Optionnel..."
                    value={formObservation}
                    onChange={(e) => setFormObservation(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  disabled={!canModify}
                  className="bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 text-white font-bold text-xs py-2.5 px-6 rounded-lg shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-amber-300" />
                  <span>Enregistrer le versement & Éditer le reçu officiel</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* 5. ONGLET : REGISTRE DES REÇUS & HISTORIQUE                                      */}
      {/* --------------------------------------------------------------------------------- */}
      {activeTab === 'registre' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registre Historique des Reçus de Caisse
              </h3>
              <p className="text-xs text-slate-500">
                Traçabilité officielle de tous les versements enregistrés pour l’année {selectedAnnee.libelle}.
              </p>
            </div>

            {/* Filtres de recherche */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher élève / reçu..."
                  value={searchEleve}
                  onChange={(e) => setSearchEleve(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                value={filtreContrib}
                onChange={(e) => setFiltreContrib(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Toutes contributions</option>
                {contributions.map((c) => (
                  <option key={c.id} value={c.id}>{c.libelle}</option>
                ))}
              </select>

              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="SOLDE">Soldés uniquement</option>
                <option value="PARTIEL">Partiellement soldés</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3.5 py-2.5">N° Reçu</th>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Élève & Matricule</th>
                  <th className="px-3.5 py-2.5">Classe</th>
                  <th className="px-3.5 py-2.5">Contribution</th>
                  <th className="px-3.5 py-2.5 text-right">Montant Versé</th>
                  <th className="px-3.5 py-2.5 text-right">Reste Dû</th>
                  <th className="px-3.5 py-2.5 text-center">Mode</th>
                  <th className="px-3.5 py-2.5">Enregistré par</th>
                  <th className="px-3.5 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPaiements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-400 font-medium">
                      Aucune donnée financière enregistrée.
                    </td>
                  </tr>
                ) : (
                  filteredPaiements.map((p) => {
                    const el = storage.getEleveById(p.eleve_id);
                    const cls = storage.getClasseById(p.classe_id);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-teal-900">
                          {p.numero_recu}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 font-mono">
                          {p.date_paiement}
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
                        <td className="px-3.5 py-2.5 text-slate-800">
                          {p.contribution_libelle || 'Contribution scolaire'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-black text-slate-900">
                          {p.montant_paye.toLocaleString()} F
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                          {p.reste_a_payer > 0 ? (
                            <span className="text-amber-700 font-bold">{p.reste_a_payer.toLocaleString()} F</span>
                          ) : (
                            <span className="text-emerald-700 font-bold">0 F (Soldé)</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {p.mode_paiement}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">
                          {p.enregistre_par_nom || 'Comptabilité'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => setSelectedRecuForPrint(p)}
                              className="text-teal-600 hover:text-teal-800 p-1 rounded hover:bg-teal-50 cursor-pointer"
                              title="Afficher et imprimer le reçu"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canModify && (
                              <button
                                onClick={() => handleDeletePaiement(p.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                                title="Supprimer ce reçu erroné"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* 6. ONGLET : CONCEPTION & IMPRESSION DES CARTES SCOLAIRES                          */}
      {/* --------------------------------------------------------------------------------- */}
      {activeTab === 'cartes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <IdCard className="w-5 h-5 text-indigo-600" />
                  <span>Conception & Impression des Cartes Scolaires Officielles</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Génération des cartes d'identité scolaire pour le CEG GOGBO (Année {selectedAnnee.libelle}) avec QR code et mentions d'usage.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={carteClasseId}
                  onChange={(e) => setCarteClasseId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({storage.getElevesByClasse(c.id, selectedAnnee.libelle).length} élèves)
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3.5 rounded-lg shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer la Planche</span>
                </button>
              </div>
            </div>

            {elevesCarteClasse.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Aucun apprenant inscrit dans cette classe pour l’année {selectedAnnee.libelle}.
              </div>
            ) : (
              <div className="pt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {elevesCarteClasse.map((el) => {
                  const cls = storage.getClasseById(carteClasseId);
                  const isCarteSoldee = paiementsAnnee.some(
                    (p) => p.eleve_id === el.id && (p.categorie_contribution === 'CARTE_SCOLAIRE' || p.tranche === 'SOLDE_TOTAL')
                  );

                  return (
                    <div
                      key={el.id}
                      className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white rounded-xl p-4 shadow-md border-2 border-amber-400 relative overflow-hidden flex flex-col justify-between"
                      style={{ minHeight: '220px' }}
                    >
                      {/* Filigrane discret */}
                      <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 pointer-events-none">
                        <School className="w-36 h-36 text-white" />
                      </div>

                      {/* En-tête de la carte */}
                      <div className="border-b border-amber-400/40 pb-2 flex justify-between items-center text-[10px]">
                        <div>
                          <div className="font-bold uppercase tracking-wider text-amber-300">RÉPUBLIQUE DU BÉNIN</div>
                          <div className="text-[8px] text-teal-200">CEG GOGBO • ADJOHOUN</div>
                        </div>
                        <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">
                          CARTE SCOLAIRE
                        </span>
                      </div>

                      {/* Corps */}
                      <div className="py-3 flex space-x-3 items-center">
                        {/* Emplacement Photo d'identité */}
                        <div className="w-20 h-24 bg-slate-800 border border-amber-300 rounded flex flex-col items-center justify-center text-center p-1 shrink-0">
                          <Users className="w-7 h-7 text-slate-500 mb-1" />
                          <span className="text-[7px] text-slate-400 uppercase font-bold">Photo Officielle</span>
                        </div>

                        {/* Renseignements élève */}
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase block font-semibold">Nom & Prénoms :</span>
                            <span className="font-black text-amber-300 uppercase leading-tight block">
                              {el.nom} {el.prenom}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div>
                              <span className="text-[8px] text-slate-400 block">Matricule :</span>
                              <span className="font-mono font-bold text-white">{el.matricule}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-400 block">Classe :</span>
                              <span className="font-bold text-white">{cls?.nom}</span>
                            </div>
                          </div>
                          <div className="text-[10px]">
                            <span className="text-[8px] text-slate-400 block">Né(e) le :</span>
                            <span className="text-slate-200 font-mono">{el.date_naissance}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bas de la carte */}
                      <div className="pt-2 border-t border-amber-400/40 flex justify-between items-center text-[9px]">
                        <div className="flex items-center space-x-1 text-slate-300 font-mono">
                          <QrCode className="w-4 h-4 text-amber-400" />
                          <span>{el.matricule}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-teal-200 font-bold block">{selectedAnnee.libelle}</span>
                          <span className="text-[8px] text-slate-400 italic">Signature de la Direction</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* 7. ONGLET : BUDGETS & DÉPENSES                                                   */}
      {/* --------------------------------------------------------------------------------- */}
      {activeTab === 'depenses' && (
        <div className="space-y-6">
          {canModify && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-rose-600" />
                  <span>Enregistrer une Dépense Budgétaire Réelle</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Consignez les sorties réelles de caisse de l'établissement (pédagogie, matériel, réparations, primes, réunions, etc.) pour l’année {selectedAnnee.libelle}.
                </p>
              </div>

              <form onSubmit={handleSaveDepense} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Libellé de la dépense *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Achat de craies et rames de papier pour examens blancs, Réparation toiture bâtiment C..."
                    value={depenseLibelle}
                    onChange={(e) => setDepenseLibelle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Catégorie
                  </label>
                  <select
                    value={depenseCategorie}
                    onChange={(e) => setDepenseCategorie(e.target.value as CategorieDepense)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="FONCTIONNEMENT">Fonctionnement général</option>
                    <option value="PEDAGOGIE">Matériel pédagogique & copies</option>
                    <option value="MATERIEL_EQUIPEMENT">Équipement & Mobilier</option>
                    <option value="ENTRETIEN_REPARATIONS">Entretien & Réparations</option>
                    <option value="REUNIONS_CONSEILS">Réunions, Conseils & AG</option>
                    <option value="PRIMES_GRATIFICATIONS">Primes & Gratifications</option>
                    <option value="ANIMATIONS_PEDAGOGIQUES">Animations Pédagogiques (UP)</option>
                    <option value="SPORT_CULTURE">Activités sportives & culturelles</option>
                    <option value="IMPREVUS">Imprévus & Secours</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Montant décaissé (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    placeholder="Montant réel dépensé..."
                    value={depenseMontant || ''}
                    onChange={(e) => setDepenseMontant(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-rose-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Montant alloué / prévu au budget
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Budget alloué si applicable..."
                    value={depenseAlloue || ''}
                    onChange={(e) => setDepenseAlloue(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Date du décaissement
                  </label>
                  <input
                    type="date"
                    required
                    value={depenseDate}
                    onChange={(e) => setDepenseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Bénéficiaire / Prestataire *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nom du prestataire ou intervenant..."
                    value={depenseBeneficiaire}
                    onChange={(e) => setDepenseBeneficiaire(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Pièce justificative (Facture / N° Reçu)
                  </label>
                  <input
                    type="text"
                    placeholder="N° de facture ou bon..."
                    value={depensePiece}
                    onChange={(e) => setDepensePiece(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Observation
                  </label>
                  <input
                    type="text"
                    placeholder="Détails complémentaires..."
                    value={depenseObs}
                    onChange={(e) => setDepenseObs(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs py-2 px-5 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Enregistrer la dépense</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tableau des dépenses */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">
                Journal des Dépenses Réalisées ({depensesAnnee.length})
              </h3>
              <span className="text-xs bg-rose-50 text-rose-800 font-bold px-2.5 py-0.5 rounded border border-rose-200">
                Total : {totalDepenses.toLocaleString()} FCFA
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Libellé de la dépense</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3 text-right">Montant Décaissé</th>
                    <th className="px-4 py-3">Bénéficiaire</th>
                    <th className="px-4 py-3">Pièce Justificative</th>
                    <th className="px-4 py-3">Enregistré par</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {depensesAnnee.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400 font-medium">
                        Aucune dépense enregistrée.
                      </td>
                    </tr>
                  ) : (
                    depensesAnnee.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {d.date_depense}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {d.libelle}
                          {d.observation && (
                            <span className="block text-[10px] text-slate-500 font-normal italic">
                              {d.observation}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            {d.categorie}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-rose-800 text-sm">
                          {d.montant_depense.toLocaleString()} FCFA
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {d.beneficiaire}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {d.piece_justificative || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {d.enregistre_par_nom}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {canModify && (
                            <button
                              onClick={() => handleDeleteDepense(d.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                              title="Supprimer cette dépense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* 8. ONGLET : ÉTATS FINANCIERS & BILAN GLOBAL                                      */}
      {/* --------------------------------------------------------------------------------- */}
      {activeTab === 'etats' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bilan Financier Global & Situation par Apprenant
              </h3>
              <p className="text-xs text-slate-500">
                Suivi des soldes par élève pour l’année académique {selectedAnnee.libelle}.
              </p>
            </div>
            <span className="text-xs bg-teal-50 text-teal-800 font-bold px-3 py-1 rounded-full border border-teal-200">
              Session {selectedAnnee.libelle}
            </span>
          </div>

          {/* Synthèse par classe */}
          <div className="overflow-x-auto">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Statistiques de Recouvrement par Classe (28 Classes)
            </h4>
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-2.5">Classe</th>
                  <th className="px-4 py-2.5 text-center">Effectif</th>
                  <th className="px-4 py-2.5 text-right">Total Versé</th>
                  <th className="px-4 py-2.5 text-center">Élèves Ayant Versé</th>
                  <th className="px-4 py-2.5 text-center">Taux Partiel/Complet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {classes.map((cls) => {
                  const elevesDeClasse = storage.getElevesByClasse(cls.id, selectedAnnee.libelle);
                  const paiementsClasse = paiementsAnnee.filter((p) => p.classe_id === cls.id);
                  const totalVerseClasse = paiementsClasse.reduce((s, p) => s + p.montant_paye, 0);
                  const payeursUniques = new Set(paiementsClasse.map((p) => p.eleve_id)).size;
                  const taux = elevesDeClasse.length > 0 ? Math.round((payeursUniques / elevesDeClasse.length) * 100) : 0;

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-bold text-slate-900">{cls.nom}</td>
                      <td className="px-4 py-2 text-center text-slate-700 font-semibold">{elevesDeClasse.length}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-teal-800">
                        {totalVerseClasse.toLocaleString()} FCFA
                      </td>
                      <td className="px-4 py-2 text-center text-slate-700">
                        {payeursUniques} / {elevesDeClasse.length}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          taux >= 80 ? 'bg-emerald-100 text-emerald-800' : taux >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {taux} %
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------------------- */}
      {/* 9. MODAL OFFICIEL D'IMPRESSION DU REÇU DE CAISSE                                 */}
      {/* --------------------------------------------------------------------------------- */}
      {selectedRecuForPrint && (
        <div className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-sm">
                  Reçu Officiel N° {selectedRecuForPrint.numero_recu}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded flex items-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer le Reçu</span>
                </button>
                <button
                  onClick={() => setSelectedRecuForPrint(null)}
                  className="p-1 text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Corps du reçu imprimable format officiel Bénin */}
            <div className="p-6 sm:p-8 bg-white text-slate-900 text-xs font-serif space-y-4">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <div className="font-bold uppercase text-[10px]">RÉPUBLIQUE DU BÉNIN</div>
                  <div className="text-[9px] text-slate-600">Ministère des Enseignements Secondaire, Technique et Professionnel</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">COLLEGE D'ENSEIGNEMENT GENERAL GOGBO</div>
                  <div className="text-[10px] text-slate-500">Commune d'Adjohoun • Arrondissement de Gangban</div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-teal-100 border border-teal-400 text-teal-950 font-black px-2 py-0.5 rounded text-[10px] uppercase">
                    REÇU DE CAISSE OFFICIEL
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 font-mono">
                    N° {selectedRecuForPrint.numero_recu}
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Date : <strong>{selectedRecuForPrint.date_paiement}</strong>
                  </div>
                </div>
              </div>

              {(() => {
                const el = storage.getEleveById(selectedRecuForPrint.eleve_id);
                const cls = storage.getClasseById(selectedRecuForPrint.classe_id);
                return (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-300 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 font-sans">Nom & Prénoms de l'Apprenant :</span>{' '}
                        <strong className="text-slate-900 uppercase">{el?.nom} {el?.prenom}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Matricule :</span>{' '}
                        <strong className="font-mono text-slate-900">{el?.matricule}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Classe :</span>{' '}
                        <strong className="text-slate-900">{cls?.nom}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Année Scolaire :</span>{' '}
                        <strong className="text-slate-900">{selectedRecuForPrint.annee_scolaire}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 font-sans">Rubrique :</span>{' '}
                        <strong>{selectedRecuForPrint.contribution_libelle || 'Contribution scolaire'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Mode de versement :</span>{' '}
                        <strong>{selectedRecuForPrint.mode_paiement}</strong>
                      </div>
                    </div>

                    <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center text-sm">
                      <span className="font-bold uppercase font-sans">Montant Encaissé :</span>
                      <strong className="text-base font-black px-3 py-1 bg-slate-900 text-white rounded font-mono">
                        {selectedRecuForPrint.montant_paye.toLocaleString()} FCFA
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1 text-slate-600">
                      <span>Reste dû pour cette contribution :</span>
                      <strong className="text-slate-900 font-mono">
                        {selectedRecuForPrint.reste_a_payer.toLocaleString()} FCFA
                      </strong>
                    </div>

                    {selectedRecuForPrint.reference_recu && (
                      <div className="text-[11px] text-slate-500 pt-1 font-mono">
                        Réf. externe : {selectedRecuForPrint.reference_recu}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="pt-4 grid grid-cols-2 gap-4 text-center">
                <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-600">
                  Signature du Versant / Parent
                </div>
                <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-600">
                  Le Service Comptable & Économat
                  <div className="font-bold text-slate-900 uppercase mt-4">
                    {selectedRecuForPrint.enregistre_par_nom || 'AGBOSSA Jeanne'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
