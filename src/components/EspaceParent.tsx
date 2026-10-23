import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { 
  Eleve, 
  Classe, 
  Periode, 
  ParentProfile, 
  ParentEleve, 
  EnregistrementPresence, 
  IncidentDisciplinaire, 
  PunitionScolaire, 
  NoteConduite,
  PaiementContribution,
  ContributionConfig,
  BulletinEleve
} from '../../types';
import { 
  Users, 
  GraduationCap, 
  FileText, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  CreditCard, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Receipt, 
  TrendingUp, 
  User, 
  Award,
  ChevronRight,
  School,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { BulletinView } from '../pedagogique/BulletinView';
import { 
  calculerSyntheseMatiere, 
  calculerMoyenneAnnuelle, 
  calculerClassementClasse, 
  getAppreciation, 
  getAppreciationColor 
} from '../../lib/appreciation';

export const EspaceParent: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedAnnee } = useAnnee();
  const anneeLibelle = selectedAnnee?.libelle || storage.getParametres().annee_academique || '2026–2027';

  // Retrouver le profil parent
  const parentProfile: ParentProfile | undefined = useMemo(() => {
    if (!currentUser) return undefined;
    return (
      storage.getParentByProfileId(currentUser.id) ||
      (currentUser.telephone ? storage.getParentByPhoneOrEmail(currentUser.telephone) : undefined) ||
      (currentUser.email ? storage.getParentByPhoneOrEmail(currentUser.email) : undefined)
    );
  }, [currentUser]);

  // Liens parent-élèves
  const liensEleves: ParentEleve[] = useMemo(() => {
    if (!parentProfile) return [];
    return storage.getParentElevesByParent(parentProfile.id);
  }, [parentProfile]);

  // Liste des enfants
  const mesEnfants = useMemo(() => {
    const list: { eleve: Eleve; lien: ParentEleve; classe?: Classe }[] = [];
    liensEleves.forEach((l) => {
      const el = storage.getEleveById(l.eleve_id);
      if (el) {
        const cl = storage.getClasseById(el.classe_id);
        list.push({ eleve: el, lien: l, classe: cl });
      }
    });
    return list;
  }, [liensEleves]);

  const [selectedEnfantId, setSelectedEnfantId] = useState<string>(
    mesEnfants[0]?.eleve.id || ''
  );

  const selectedChildData = useMemo(() => {
    return mesEnfants.find((m) => m.eleve.id === selectedEnfantId) || mesEnfants[0];
  }, [mesEnfants, selectedEnfantId]);

  const eleve = selectedChildData?.eleve;
  const classe = selectedChildData?.classe;
  const lien = selectedChildData?.lien;

  // Périodes scolaires
  const periodes = useMemo(() => {
    return storage.getPeriodesByAnnee(anneeLibelle);
  }, [anneeLibelle]);

  const activePeriode = useMemo(() => {
    return periodes.find((p) => p.is_active) || periodes[0] || storage.getActivePeriode();
  }, [periodes]);

  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>(
    activePeriode?.id || ''
  );

  // Onglet interne de consultation parent
  const [activeTab, setActiveTab] = useState<
    'synthese' | 'notes' | 'bulletin' | 'discipline' | 'finances'
  >('synthese');

  // Matières de la classe de l'enfant (filtrées selon l'option LV2 si applicable)
  const matieresClasse = useMemo(() => {
    const allMatieres = storage.getMatieres();
    if (!eleve) return allMatieres;
    return allMatieres.filter((m) => {
      if (!m.is_langue_option) return true;
      if (m.code.toUpperCase() === 'ALL' && eleve.langue_vivante_2 === 'ALLEMAND') return true;
      if (m.code.toUpperCase() === 'ESP' && eleve.langue_vivante_2 === 'ESPAGNOL') return true;
      return false;
    });
  }, [eleve]);

  const allNotes = useMemo(() => storage.getNotes(), []);
  const allAffectations = useMemo(() => storage.getAffectations(anneeLibelle), [anneeLibelle]);

  // Synthèse des notes par matière pour la période sélectionnée
  const syntheseMatieres = useMemo(() => {
    if (!eleve || !selectedPeriodeId) return [];
    const notesElevePeriode = allNotes.filter(
      (n) => n.eleve_id === eleve.id && n.periode_id === selectedPeriodeId
    );
    return matieresClasse.map((m) => {
      const notesMat = notesElevePeriode.filter((n) => n.matiere_id === m.id);
      // Coefficient propre à la classe de l'enfant
      const coefClasse = classe ? storage.getCoefficientMatiere(m.id, classe.id, anneeLibelle) : m.coefficient;
      const matClasse = { ...m, coefficient: coefClasse };
      const synthese = calculerSyntheseMatiere(matClasse, notesMat);
      return { matiere: matClasse, synthese };
    });
  }, [eleve, classe, anneeLibelle, selectedPeriodeId, matieresClasse, allNotes]);

  // Périodes S1 et S2 pour le calcul des moyennes semestrielles et annuelle
  const periodeS1 = useMemo(() => periodes.find((p) => p.numero === 1 || p.nom.toLowerCase().includes('1')), [periodes]);
  const periodeS2 = useMemo(() => periodes.find((p) => p.numero === 2 || p.nom.toLowerCase().includes('2')), [periodes]);

  const moyennesEleve = useMemo(() => {
    if (!eleve || !classe || !periodeS1) return { s1: null, s2: null, annuel: null, totalPoints: 0, totalCoefs: 0 };

    const { bulletinsMap: bS1Map } = calculerClassementClasse(classe, [eleve], periodeS1, matieresClasse, allNotes, allAffectations);
    const b1 = bS1Map[eleve.id];
    const mg1 = b1?.moyenne_generale ?? null;

    let mg2: number | null = null;
    let b2TotalPoints = 0;
    let b2TotalCoefs = 0;
    if (periodeS2) {
      const { bulletinsMap: bS2Map } = calculerClassementClasse(classe, [eleve], periodeS2, matieresClasse, allNotes, allAffectations);
      const b2 = bS2Map[eleve.id];
      mg2 = b2?.moyenne_generale ?? null;
      b2TotalPoints = b2?.total_points ?? 0;
      b2TotalCoefs = b2?.total_coefficients ?? 0;
    }

    const currentBulletin = selectedPeriodeId === periodeS2?.id ? { points: b2TotalPoints, coefs: b2TotalCoefs } : { points: b1?.total_points ?? 0, coefs: b1?.total_coefficients ?? 0 };
    const annuel = calculerMoyenneAnnuelle(mg1, mg2);

    return { 
      s1: mg1, 
      s2: mg2, 
      annuel,
      totalPoints: currentBulletin.points,
      totalCoefs: currentBulletin.coefs
    };
  }, [eleve, classe, periodeS1, periodeS2, selectedPeriodeId, matieresClasse, allNotes, allAffectations]);

  // Données de l'élève sélectionné
  const presences = useMemo(() => {
    if (!eleve) return [];
    return storage
      .getPresencesByEleve(eleve.id, anneeLibelle)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [eleve, anneeLibelle]);

  const absencesNonJustifiees = presences.filter((p) => p.statut === 'ABSENT' && !p.justifie).length;
  const absencesJustifiees = presences.filter((p) => p.statut === 'ABSENT' && p.justifie).length;
  const retards = presences.filter((p) => p.statut === 'RETARD').length;

  const punitions: PunitionScolaire[] = useMemo(() => {
    if (!eleve) return [];
    return storage.getPunitionsByEleve(eleve.id, anneeLibelle);
  }, [eleve, anneeLibelle]);

  const incidents: IncidentDisciplinaire[] = useMemo(() => {
    if (!eleve) return [];
    return storage
      .getIncidentsDisciplinaires(anneeLibelle)
      .filter((inc) => inc.eleve_id === eleve.id);
  }, [eleve, anneeLibelle]);

  // Note de conduite attribuée par le Professeur Principal
  const noteConduite: NoteConduite | undefined = useMemo(() => {
    if (!eleve || !selectedPeriodeId) return undefined;
    return storage.getNoteConduiteEleve(eleve.id, selectedPeriodeId, anneeLibelle);
  }, [eleve, selectedPeriodeId, anneeLibelle]);

  // Données financières réelles de l'enfant
  const contributionsConfigs = useMemo(() => {
    return storage.getContributions(anneeLibelle);
  }, [anneeLibelle]);

  const paiementsEleve = useMemo(() => {
    if (!eleve) return [];
    return storage.getPaiementsByEleve(eleve.id, anneeLibelle);
  }, [eleve, anneeLibelle]);

  const totalPaye = paiementsEleve.reduce((acc, p) => acc + (p.montant || 0), 0);

  // Calcul du montant prévu pour la classe de l'enfant
  const totalPrevu = useMemo(() => {
    if (!classe) return 0;
    return contributionsConfigs
      .filter((c) => c.public_cible === 'TOUS' || c.classe_id === classe.id)
      .reduce((acc, c) => acc + (c.montant_prevu || 0), 0);
  }, [contributionsConfigs, classe]);

  const resteAPayer = Math.max(0, totalPrevu - totalPaye);

  // Si aucun enfant rattaché
  if (mesEnfants.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-2xl mx-auto my-12 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Bienvenue sur l'Espace Parents du CEG GOGBO
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Bonjour <strong className="text-slate-800">{currentUser?.prenom} {currentUser?.nom}</strong>, aucun apprenant n'est actuellement rattaché à votre compte pour l'année scolaire <strong>{anneeLibelle}</strong>.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 text-left space-y-2">
          <p className="font-bold flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Comment rattacher vos enfants ?</span>
          </p>
          <p>
            Veuillez vous rapprocher de la <strong>Direction Pédagogique (Censeur)</strong> ou du secrétariat du CEG GOGBO muni du numéro de téléphone <strong>{currentUser?.telephone || currentUser?.identifiant}</strong> et des matricules de vos enfants pour activer leur suivi officiel en ligne.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête Espace Parents */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-400 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Espace Famille & Parents
              </span>
              <span className="text-indigo-200 text-xs">• Année {anneeLibelle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white flex items-center space-x-2">
              <span>Portail de Suivi Parental</span>
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1">
              Parent connecté : <strong>{currentUser?.prenom} {currentUser?.nom}</strong> ({lien?.lien_parental || 'PARENT'}) • CEG GOGBO
            </p>
          </div>
        </div>
      </div>

      {/* SECTION OFFICIELLE « MES ENFANTS » (Exigence : sélection claire parmi tous les enfants rattachés) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              MES ENFANTS ({mesEnfants.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Cliquez sur l'enfant désiré pour consulter son dossier scolaire individuel
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mesEnfants.map((m, idx) => {
            const isSelected = (selectedChildData?.eleve.id === m.eleve.id);
            return (
              <button
                key={m.eleve.id}
                onClick={() => setSelectedEnfantId(m.eleve.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-500 shadow-xs ring-2 ring-indigo-400/50'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate">
                      {m.eleve.nom} {m.eleve.prenom}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-bold flex items-center space-x-1 mt-0.5">
                      <School className="w-3 h-3 shrink-0" />
                      <span>Classe : {m.classe?.nom || 'Sans classe'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      Matricule: {m.eleve.matricule} • {m.lien.lien_parental}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <span className="bg-indigo-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2">
                    En consultation
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Carte d'identité de l'enfant sélectionné */}
      {eleve && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-xl shrink-0">
              {eleve.nom.charAt(0)}{eleve.prenom.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-slate-900 uppercase">
                  {eleve.nom} {eleve.prenom}
                </h3>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                  {eleve.matricule}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center space-x-1">
                  <School className="w-3.5 h-3.5 text-indigo-600" />
                  <strong className="text-slate-800">{classe?.nom || 'Classe inconnue'}</strong>
                </span>
                <span>•</span>
                <span>Né(e) le : <strong>{eleve.date_naissance || '—'}</strong></span>
                <span>•</span>
                <span>Sexe : <strong>{eleve.sexe === 'F' ? 'Féminin' : 'Masculin'}</strong></span>
                <span>•</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  {eleve.statut === 'ACTIF' ? 'Inscrit Régulier' : eleve.statut}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Période active</span>
              <select
                value={selectedPeriodeId}
                onChange={(e) => setSelectedPeriodeId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg py-1 px-2.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {periodes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.is_active ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Navigation par onglets thématiques */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-xl text-xs font-bold space-x-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('synthese')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'synthese'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4 text-indigo-600" />
          <span>Synthèse & Conduite</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-white text-indigo-900 shadow-xs ring-1 ring-emerald-400'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>Notes & Matières Détaillées</span>
        </button>

        <button
          onClick={() => setActiveTab('bulletin')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'bulletin'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Bulletin Scolaire Officiel</span>
        </button>

        <button
          onClick={() => setActiveTab('discipline')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'discipline'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Présences & Discipline ({presences.length + punitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('finances')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'finances'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-teal-600" />
          <span>Contributions & Versements</span>
        </button>
      </div>

      {/* CONTENU 1 : SYNTHÈSE & NOTE DE CONDUITE */}
      {activeTab === 'synthese' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Carte Conduite officielle */}
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200 p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-1">
                    Conduite officielle
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-indigo-950 font-mono">
                      {noteConduite ? `${noteConduite.note} / 20` : '— / 20'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-indigo-800 block mt-1">
                    {noteConduite?.appreciation || 'En attente de notation par le Professeur Principal'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-100 text-[11px] text-slate-500">
                Attribuée par le <strong>Professeur Principal</strong> ({classe?.nom})
              </div>
            </div>

            {/* Carte Assiduité */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Assiduité du trimestre
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-slate-900 font-mono">
                      {absencesNonJustifiees + absencesJustifiees}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">absence(s)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 mt-1">
                    <span className="text-emerald-700">{absencesJustifiees} justifiée(s)</span>
                    <span>•</span>
                    <span className="text-rose-700">{absencesNonJustifiees} non justifiée(s)</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                {retards > 0 ? (
                  <span className="text-amber-700 font-bold">{retards} retard(s) enregistré(s)</span>
                ) : (
                  <span className="text-emerald-700 font-semibold">Aucun retard consigné</span>
                )}
              </div>
            </div>

            {/* Carte Situation Financière */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Situation Versements
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {totalPaye.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-xs text-slate-500">FCFA payés</span>
                  </div>
                  <span className={`text-xs font-bold block mt-1 ${
                    resteAPayer === 0 && totalPrevu > 0
                      ? 'text-emerald-700'
                      : resteAPayer > 0
                      ? 'text-amber-700'
                      : 'text-slate-500'
                  }`}>
                    {resteAPayer === 0 && totalPrevu > 0
                      ? 'Scolarité entièrement soldée'
                      : `Reste à verser : ${resteAPayer.toLocaleString('fr-FR')} FCFA`}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                Total annuel prévu : <strong>{totalPrevu.toLocaleString('fr-FR')} FCFA</strong>
              </div>
            </div>
          </div>

          {/* Renseignements pédagogiques et règles de discipline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <School className="w-4 h-4 text-indigo-600" />
              <span>Rappel des Engagements Pédagogiques & Règlement Intérieur</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                <p className="font-bold text-slate-800">1. Présence et ponctualité aux cours</p>
                <p className="leading-relaxed">
                  L'apprenant doit être présent dès 06h45 pour la montée des couleurs et le début des cours à 07h00. Toute absence doit être motivée et justifiée auprès de la surveillance générale sous 48 heures.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                <p className="font-bold text-slate-800">2. Conduite et travail personnel</p>
                <p className="leading-relaxed">
                  La note de conduite est souverainement renseignée par le Professeur Principal. Elle évalue l'assiduité, le respect du corps professoral, la discipline collective et la tenue en classe.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU 2 : NOTES & MATIÈRES DÉTAILLÉES (Exigence : interrogations, devoirs, moyennes et annuel) */}
      {activeTab === 'notes' && eleve && classe && (
        <div className="space-y-6">
          {/* Cartes récapitulatives des moyennes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Moyenne Semestre 1
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {moyennesEleve.s1 !== null ? `${moyennesEleve.s1.toFixed(2)} / 20` : '— / 20'}
              </div>
              <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                {moyennesEleve.s1 !== null ? getAppreciation(moyennesEleve.s1) : 'En cours de saisie'}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Moyenne Semestre 2
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {moyennesEleve.s2 !== null ? `${moyennesEleve.s2.toFixed(2)} / 20` : '— / 20'}
              </div>
              <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                {moyennesEleve.s2 !== null ? getAppreciation(moyennesEleve.s2) : 'En cours de saisie'}
              </span>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200 p-4 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-1">
                Moyenne Annuelle (S1 + S2×2) ÷ 3
              </span>
              <div className="text-2xl font-black text-indigo-950 font-mono">
                {moyennesEleve.annuel !== null ? `${moyennesEleve.annuel.toFixed(2)} / 20` : '— / 20'}
              </div>
              <span className="text-[11px] font-bold text-indigo-800 mt-1 block">
                {moyennesEleve.annuel !== null ? (
                  moyennesEleve.annuel >= 10 ? '✓ Admis en classe supérieure' : '⚠ Travail et soutien requis'
                ) : 'Calculée après le S2'}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                Note de Conduite
              </span>
              <div className="text-2xl font-black text-emerald-950 font-mono">
                {noteConduite ? `${noteConduite.note} / 20` : '— / 20'}
              </div>
              <span className="text-[11px] font-semibold text-slate-600 mt-1 block truncate">
                {noteConduite?.appreciation || 'Professeur Principal'}
              </span>
            </div>
          </div>

          {/* Tableau détaillé des interrogations et devoirs par matière */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Détail des Évaluations par Matière — {periodes.find((p) => p.id === selectedPeriodeId)?.nom || 'Période active'}</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Formule officielle : Moyenne Matière = [Moyenne des Interrogations + Devoir 1 + Devoir 2] ÷ 3
                </p>
              </div>
              <span className="text-xs bg-indigo-100 text-indigo-900 font-bold px-3 py-1 rounded-lg">
                Classe : {classe.nom}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3.5 py-3">Matière</th>
                    <th className="px-2.5 py-3 text-center">Coef</th>
                    <th className="px-2.5 py-3 text-center">Interro 1</th>
                    <th className="px-2.5 py-3 text-center">Interro 2</th>
                    <th className="px-2.5 py-3 text-center">Interro 3</th>
                    <th className="px-3 py-3 text-center bg-indigo-50/60 font-bold text-indigo-950">Moy. Interros</th>
                    <th className="px-2.5 py-3 text-center">Devoir 1</th>
                    <th className="px-2.5 py-3 text-center">Devoir 2</th>
                    <th className="px-3 py-3 text-center bg-emerald-50/60 font-black text-emerald-950">Moy. Matière</th>
                    <th className="px-3 py-3 text-center font-bold">Points</th>
                    <th className="px-3 py-3">Appréciation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {syntheseMatieres.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                        Aucune matière configurée pour cette classe.
                      </td>
                    </tr>
                  ) : (
                    syntheseMatieres.map(({ matiere, synthese }) => {
                      const apprec = getAppreciation(synthese.moyenne_matiere);
                      const apprecColor = getAppreciationColor(apprec);
                      return (
                        <tr key={matiere.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3.5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {matiere.nom}
                            <span className="text-[10px] text-slate-400 block font-normal">{matiere.code}</span>
                          </td>
                          <td className="px-2.5 py-2.5 text-center font-mono font-bold text-slate-700">
                            {matiere.coefficient}
                          </td>
                          <td className="px-2.5 py-2.5 text-center font-mono">
                            {synthese.interrogations[0] !== null && synthese.interrogations[0] !== undefined
                              ? synthese.interrogations[0].toFixed(2)
                              : '—'}
                          </td>
                          <td className="px-2.5 py-2.5 text-center font-mono">
                            {synthese.interrogations[1] !== null && synthese.interrogations[1] !== undefined
                              ? synthese.interrogations[1].toFixed(2)
                              : '—'}
                          </td>
                          <td className="px-2.5 py-2.5 text-center font-mono">
                            {synthese.interrogations[2] !== null && synthese.interrogations[2] !== undefined
                              ? synthese.interrogations[2].toFixed(2)
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold bg-indigo-50/40 text-indigo-900">
                            {synthese.moyenne_interrogations !== null
                              ? synthese.moyenne_interrogations.toFixed(2)
                              : '—'}
                          </td>
                          <td className="px-2.5 py-2.5 text-center font-mono">
                            {synthese.devoir1 !== null && synthese.devoir1 !== undefined
                              ? synthese.devoir1.toFixed(2)
                              : '—'}
                          </td>
                          <td className="px-2.5 py-2.5 text-center font-mono">
                            {synthese.devoir2 !== null && synthese.devoir2 !== undefined
                              ? synthese.devoir2.toFixed(2)
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-black text-sm bg-emerald-50/50 text-emerald-950">
                            {synthese.moyenne_matiere !== null
                              ? `${synthese.moyenne_matiere.toFixed(2)}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">
                            {synthese.points_obtenus !== null
                              ? synthese.points_obtenus.toFixed(2)
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            {synthese.moyenne_matiere !== null ? (
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${apprecColor.bg}`}>
                                {apprec}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Non évalué</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Ligne récapitulative du semestre */}
                <tfoot className="bg-slate-900 text-white font-bold text-xs">
                  <tr>
                    <td className="px-3.5 py-3 uppercase tracking-wider text-[11px]">
                      TOTAL DU SEMESTRE
                    </td>
                    <td className="px-2.5 py-3 text-center font-mono font-black text-amber-300">
                      {moyennesEleve.totalCoefs}
                    </td>
                    <td colSpan={6} className="text-right px-3 py-3 text-slate-300 text-[11px]">
                      Total Points Obtenus :
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-black text-emerald-300 text-sm">
                      {moyennesEleve.totalPoints > 0 ? (Math.round((moyennesEleve.totalPoints / (moyennesEleve.totalCoefs || 1)) * 100) / 100).toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-black text-white">
                      {moyennesEleve.totalPoints.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-slate-300 text-[10px]">
                      {moyennesEleve.totalPoints > 0 && getAppreciation(Math.round((moyennesEleve.totalPoints / (moyennesEleve.totalCoefs || 1)) * 100) / 100)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU 3 : BULLETIN SCOLAIRE OFFICIEL */}
      {activeTab === 'bulletin' && eleve && classe && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 p-4 rounded-xl text-xs flex justify-between items-center">
            <span>
              Consultation directe du <strong>bulletin officiel</strong> pour <strong>{eleve.nom} {eleve.prenom}</strong> ({classe.nom}) pour l'année {anneeLibelle}.
            </span>
          </div>

          <BulletinView
            initialEleveId={eleve.id}
            initialClasseId={classe.id}
            initialPeriodeId={selectedPeriodeId}
          />
        </div>
      )}

      {/* CONTENU 3 : PRÉSENCES & DISCIPLINE */}
      {activeTab === 'discipline' && (
        <div className="space-y-6">
          {/* Tableau des présences */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Registre des Absences et Retards ({presences.length})</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-600">
                Année {anneeLibelle}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-center">Détail / Heure</th>
                    <th className="px-4 py-3">Motif & Justification</th>
                    <th className="px-4 py-3">Consigné par</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {presences.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Aucune absence ni retard enregistré pour cet apprenant.
                      </td>
                    </tr>
                  ) : (
                    presences.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                          {p.date}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.statut === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.statut === 'ABSENT'
                                ? 'bg-amber-100 text-amber-800'
                                : p.statut === 'RETARD'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {p.statut}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                          {p.heure_retard || (p.statut === 'ABSENT' ? (p.justifie ? 'Justifiée' : 'Non justifiée') : '—')}
                        </td>
                        <td className="px-4 py-3 text-slate-600 italic">
                          {p.motif || 'Aucun motif renseigné'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {p.enregistre_par_nom || 'Surveillance Générale'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tableau des punitions scolaires */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Mesures Disciplinaires & Punitions ({punitions.length})</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-600">
                Année {anneeLibelle}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3">Motif constaté</th>
                    <th className="px-4 py-3 font-bold text-slate-900">Punition appliquée</th>
                    <th className="px-4 py-3">Auteur</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3">Observation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {punitions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Aucune punition scolaire consignée.
                      </td>
                    </tr>
                  ) : (
                    punitions.map((pun) => {
                      const isAnnulee = pun.statut === 'ANNULEE';
                      return (
                        <tr key={pun.id} className={`hover:bg-slate-50 ${isAnnulee ? 'bg-slate-50/50' : ''}`}>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                            {pun.date} {pun.heure ? `(${pun.heure})` : ''}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-rose-50 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200">
                              {pun.categorie_faute}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <span className={isAnnulee ? 'line-through text-slate-400' : ''}>
                              {pun.faute_motif}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-black text-rose-900">
                            <span className={isAnnulee ? 'line-through text-slate-400 font-medium' : ''}>
                              {pun.punition_appliquee}
                            </span>
                            {pun.duree_modalite && (
                              <span className="block text-[10px] font-normal text-slate-500">
                                Modalité : {pun.duree_modalite}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-[11px]">
                            {pun.auteur_nom} ({pun.auteur_role})
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
                          <td className="px-4 py-3 text-slate-500 italic">
                            {isAnnulee ? (
                              <span className="text-red-700 not-italic font-medium">
                                Annulée le {pun.annule_le || ''}
                              </span>
                            ) : (
                              pun.observation || '—'
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

      {/* CONTENU 4 : CONTRIBUTIONS & VERSEMENTS */}
      {activeTab === 'finances' && (
        <div className="space-y-6">
          {/* Synthèse du compte financier */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-teal-600" />
              <span>Situation des Contributions Scolaires — Année {anneeLibelle}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block mb-1">Montant total dû</span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {totalPrevu.toLocaleString('fr-FR')} <span className="text-sm font-normal">FCFA</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs text-emerald-800 block mb-1">Total versé à la comptabilité</span>
                <span className="text-2xl font-black text-emerald-950 font-mono">
                  {totalPaye.toLocaleString('fr-FR')} <span className="text-sm font-normal">FCFA</span>
                </span>
              </div>

              <div className={`p-4 rounded-xl border ${
                resteAPayer > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <span className="text-xs block mb-1 font-semibold">Reste à solder</span>
                <span className="text-2xl font-black font-mono">
                  {resteAPayer.toLocaleString('fr-FR')} <span className="text-sm font-normal">FCFA</span>
                </span>
              </div>
            </div>
          </div>

          {/* Reçus des versements effectués */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                <span>Historique des Versements Reçus ({paiementsEleve.length})</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-600">
                Comptabilité officielle CEG GOGBO
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 font-mono">Réf. Reçu</th>
                    <th className="px-4 py-3">Rubrique</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3 text-center">Mode</th>
                    <th className="px-4 py-3">Perçu par</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paiementsEleve.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Aucun reçu de paiement enregistré à ce jour pour cet apprenant.
                      </td>
                    </tr>
                  ) : (
                    paiementsEleve.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-700">{p.date_paiement}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {p.reference_recu || '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {p.type_contribution}
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-right text-emerald-950">
                          {p.montant.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                            {p.mode_paiement}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-[11px]">
                          {p.recu_par_nom || 'Comptabilité'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {p.statut}
                          </span>
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
    </div>
  );
};
