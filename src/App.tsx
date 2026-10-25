/**
 * GOGBO NOTES V2
 * Système Numérique Officiel de Gestion Scolaire
 * CEG GOGBO — Année Académique 2026–2027
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AnneeProvider } from './context/AnneeContext';
import { Header } from './components/Header';
import { Navigation, TabKey } from './components/Navigation';
import { LoginView } from './components/auth/LoginView';
import { EspacePedagogique } from './components/pedagogique/EspacePedagogique';
import { DashboardCenseur } from './components/censeur/DashboardCenseur';
import { PresenceEnseignants } from './components/censeur/PresenceEnseignants';
import { GestionEleves } from './components/censeur/GestionEleves';
import { GestionEnseignants } from './components/censeur/GestionEnseignants';
import { GestionAffectations } from './components/censeur/GestionAffectations';
import { GestionProfesseursPrincipaux } from './components/censeur/GestionProfesseursPrincipaux';
import { EspaceProfesseurPrincipal } from './components/pedagogique/EspaceProfesseurPrincipal';
import { GestionClasses } from './components/censeur/GestionClasses';
import { GestionMatieres } from './components/censeur/GestionMatieres';
import { GestionPeriodes } from './components/censeur/GestionPeriodes';
import { JournalAudit } from './components/censeur/JournalAudit';
import { ParametresEtablissement } from './components/censeur/ParametresEtablissement';
import { HistoriqueAnneesScolaires } from './components/censeur/HistoriqueAnneesScolaires';
import { ExportNotesSemestre } from './components/censeur/ExportNotesSemestre';
import { ImportEleves } from './components/censeur/ImportEleves';
import { DirecteurDashboard } from './components/directeur/DirecteurDashboard';
import { SurveillantDashboard } from './components/surveillant/SurveillantDashboard';
import { ComptableDashboard } from './components/comptable/ComptableDashboard';
import { GestionParents } from './components/censeur/GestionParents';
import { EspaceParent } from './components/parents/EspaceParent';
import { ResultatsStatistiques } from './components/censeur/ResultatsStatistiques';
import { ClassementView } from './components/pedagogique/ClassementView';
import { BulletinView } from './components/pedagogique/BulletinView';
import { HomePage } from './components/home/HomePage';
import { SuiteTestsModal } from './components/modals/SuiteTestsModal';
import { SqlSchemaModal } from './components/modals/SqlSchemaModal';
import { MonCompteModal } from './components/modals/MonCompteModal';
import { SauvegardeIntegraleModal } from './components/modals/SauvegardeIntegraleModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ArrowLeft } from 'lucide-react';

const TAB_TITLES: Record<TabKey, string> = {
  censeur_dashboard: 'Tableau de bord Direction',
  presence_enseignants: 'Présence Enseignants',
  resultats_statistiques: 'Résultats Statistiques & Bilans',
  pedagogique: 'Espace Pédagogique & Notes',
  professeur_principal_espace: 'Espace Professeur Principal',
  classement: 'Classement Général',
  bulletins: 'Bulletins Scolaires Officiels',
  eleves: 'Gestion des Apprenants',
  parents: 'Gestion des Parents d’Élèves',
  espace_parent: 'Espace Famille & Suivi Parental',
  enseignants: 'Corps Enseignant',
  affectations: 'Attribution de Classes & Matières',
  professeurs_principaux: 'Désignation des Professeurs Principaux',
  classes: 'Divisions & Classes Pédagogiques',
  matieres: 'Matières & Coefficients',
  periodes: 'Périodes Scolaires',
  audit: 'Journal d’Audit Réglementaire',
  parametres: 'Paramètres de l’Établissement',
  directeur_stats: 'Supervision Direction Générale',
  surveillant: 'Discipline, Présences & Punitions',
  comptable: 'Comptabilité & Versements Scolaires',
  historique_annees: 'Archives & Historique des Années',
  export_notes: 'Export des notes par semestre',
  import_eleves: 'Inscrire des élèves depuis un fichier',
};

const MainAppContent: React.FC = () => {
  const { currentUser, isCenseur, isDirecteur, isConcepteur, isSurveillant, isComptable, isLoading } = useAuth();
  const getDefaultTab = (user: typeof currentUser): TabKey => {
    if (!user) return 'censeur_dashboard';
    if (user.role === 'PARENT') return 'espace_parent';
    if (user.role === 'DIRECTEUR_GENERAL') return 'directeur_stats';
    if (user.role === 'SURVEILLANT_GENERAL') return 'surveillant';
    if (user.role === 'COMPTABLE') return 'comptable';
    if (user.role === 'CENSEUR' || user.role === 'CONCEPTEUR') return 'censeur_dashboard';
    return 'pedagogique';
  };

  const [currentTab, setCurrentTab] = useState<TabKey>(() => getDefaultTab(currentUser));
  const [tabHistory, setTabHistory] = useState<TabKey[]>(() => [getDefaultTab(currentUser)]);
  const [bulletinTarget, setBulletinTarget] = useState<{ eleveId?: string; classeId?: string; periodeId?: string } | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  // Alerte visible si un enregistrement vers la base centrale échoue (au lieu d'une erreur silencieuse)
  const [erreurSync, setErreurSync] = useState<string | null>(null);
  useEffect(() => {
    const surErreur = (ev: Event) => {
      const detail = (ev as CustomEvent<{ table: string; message: string }>).detail;
      setErreurSync(detail ? `${detail.table} : ${detail.message}` : 'erreur inconnue');
    };
    window.addEventListener('gogbo-sync-error', surErreur);
    return () => window.removeEventListener('gogbo-sync-error', surErreur);
  }, []);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isMonCompteOpen, setIsMonCompteOpen] = useState(false);
  const [isSauvegardeModalOpen, setIsSauvegardeModalOpen] = useState(false);
  // Afficher par défaut la page de connexion officielle (Portails Admin & Enseignant & Parent)
  const [showLogin, setShowLogin] = useState(true);

  // Mettre à jour l'onglet par défaut et réinitialiser l'historique lorsque l'utilisateur change
  useEffect(() => {
    if (!currentUser) return;
    const def = getDefaultTab(currentUser);
    setCurrentTab(def);
    setTabHistory([def]);
  }, [currentUser?.id, currentUser?.role]);

  // Navigation avec enregistrement précis dans l'historique
  const handleNavigate = (newTab: TabKey) => {
    if (newTab === currentTab) return;
    setTabHistory((prev) => [...prev, newTab]);
    setCurrentTab(newTab);
  };

  // Revenir fidèlement à la page précédemment visitée (Exigence 2)
  const handleGoBack = () => {
    if (tabHistory.length > 1) {
      const nextHistory = tabHistory.slice(0, -1);
      const previousTab = nextHistory[nextHistory.length - 1];
      setTabHistory(nextHistory);
      setCurrentTab(previousTab);
    } else {
      // Secours cohérent : retour à l'espace d'accueil naturel du profil
      const def = getDefaultTab(currentUser);
      setTabHistory([def]);
      setCurrentTab(def);
    }
  };

  const canGoBack = tabHistory.length > 1 || currentTab !== getDefaultTab(currentUser);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Chargement de GOGBO NOTES V2...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (!showLogin) {
      return (
        <>
          <HomePage onAccederPlateforme={() => setShowLogin(true)} />
          <SauvegardeIntegraleModal
            isOpen={isSauvegardeModalOpen}
            onClose={() => setIsSauvegardeModalOpen(false)}
          />
        </>
      );
    }
    return (
      <>
        <LoginView 
          onBackToHome={() => setShowLogin(false)} 
          onOpenSauvegardeModal={() => setIsSauvegardeModalOpen(true)}
        />
        <SauvegardeIntegraleModal
          isOpen={isSauvegardeModalOpen}
          onClose={() => setIsSauvegardeModalOpen(false)}
        />
      </>
    );
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'censeur_dashboard':
        return <DashboardCenseur onNavigate={handleNavigate} />;
      case 'presence_enseignants':
        return <PresenceEnseignants />;
      case 'resultats_statistiques':
        return <ResultatsStatistiques />;
      case 'pedagogique':
        return (
          <EspacePedagogique 
            onOpenBulletin={(eleveId, classeId, periodeId) => {
              setBulletinTarget({ eleveId, classeId, periodeId });
              handleNavigate('bulletins');
            }}
          />
        );
      case 'classement':
        return (
          <ClassementView 
            onOpenBulletin={(eleveId, classeId, periodeId) => {
              setBulletinTarget({ eleveId, classeId, periodeId });
              handleNavigate('bulletins');
            }}
          />
        );
      case 'bulletins':
        return (
          <BulletinView
            initialEleveId={bulletinTarget?.eleveId}
            initialClasseId={bulletinTarget?.classeId}
            initialPeriodeId={bulletinTarget?.periodeId}
          />
        );
      case 'eleves':
        return <GestionEleves />;
      case 'enseignants':
        return <GestionEnseignants />;
      case 'affectations':
        return <GestionAffectations />;
      case 'professeurs_principaux':
        return (
          <GestionProfesseursPrincipaux 
            onBack={handleGoBack} 
          />
        );
      case 'professeur_principal_espace':
        return <EspaceProfesseurPrincipal onBack={handleGoBack} />;
      case 'classes':
        return <GestionClasses />;
      case 'matieres':
        return <GestionMatieres />;
      case 'periodes':
        return <GestionPeriodes />;
      case 'audit':
        return <JournalAudit />;
      case 'parametres':
        return <ParametresEtablissement />;
      case 'historique_annees':
        return (
          <HistoriqueAnneesScolaires
            onNavigate={handleNavigate}
            onOpenBulletin={(eleveId, classeId, periodeId) => {
              setBulletinTarget({ eleveId, classeId, periodeId });
              handleNavigate('bulletins');
            }}
          />
        );
      case 'export_notes':
        return <ExportNotesSemestre />;
      case 'import_eleves':
        return <ImportEleves />;
      case 'directeur_stats':
        return <DirecteurDashboard onNavigate={handleNavigate} />;
      case 'surveillant':
        return <SurveillantDashboard onNavigate={handleNavigate} />;
      case 'comptable':
        return <ComptableDashboard onNavigate={handleNavigate} />;
      case 'parents':
        return <GestionParents />;
      case 'espace_parent':
        return <EspaceParent />;
      default:
        return <EspacePedagogique />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 antialiased font-sans">
      {/* En-tête officiel */}
      <Header
        onOpenTestModal={() => setIsTestModalOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        onOpenMonCompte={() => setIsMonCompteOpen(true)}
        onOpenSauvegardeModal={() => setIsSauvegardeModalOpen(true)}
      />

      {erreurSync && (
        <div role="alert" className="print:hidden bg-red-600 text-white text-xs px-4 py-2.5 flex items-start justify-between space-x-3">
          <span>
            <strong>Enregistrement non effectué.</strong> Votre dernière saisie n’a pas été enregistrée dans la base
            centrale ({erreurSync}). Rechargez la page, vérifiez la saisie et recommencez ; si le message revient,
            contactez l’administrateur.
          </span>
          <button type="button" onClick={() => setErreurSync(null)} className="font-bold shrink-0" aria-label="Fermer l’alerte">
            ✕
          </button>
        </div>
      )}

      {/* Barre de navigation dynamique selon le profil avec déconnexion à gauche */}
      <Navigation 
        currentTab={currentTab} 
        onSelectTab={handleNavigate} 
        onOpenMonCompte={() => setIsMonCompteOpen(true)}
      />

      {/* Corps principal avec Bouton Retour universel et intelligent (Exigence 2) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 print:p-0 print:max-w-none">
        {canGoBack && (
          <div className="mb-3.5 flex items-center justify-between print:hidden">
            <button
              id="btn-retour-navigation"
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer group"
              title="Revenir à la page précédente"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
              <span>← Retour</span>
            </button>
            <div className="text-[11px] text-slate-500 hidden sm:flex items-center space-x-1.5 bg-slate-200/60 px-2.5 py-1 rounded-md">
              <span className="text-slate-400">Espace :</span>
              <span className="font-semibold text-slate-700">{TAB_TITLES[currentTab] || currentTab}</span>
            </div>
          </div>
        )}
        {renderTabContent()}
      </main>

      {/* Pied de page officiel Bénin */}
      <footer className="print:hidden bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            <strong>GOGBO NOTES V2</strong> — Système Numérique Officiel de Gestion Scolaire • CEG GOGBO
          </div>
          <div className="text-[11px] text-slate-500">
            Commune d'ADJOHOUN • Arrondissement de GANGBAN • Session 2026–2027
          </div>
        </div>
      </footer>

      {/* Modal Mon Compte Personnel (Exigence 7) */}
      <MonCompteModal
        isOpen={isMonCompteOpen}
        onClose={() => setIsMonCompteOpen(false)}
      />

      {/* Modal des 25 Tests obligatoires */}
      <SuiteTestsModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />

      {/* Modal du Schéma SQL Supabase */}
      <SqlSchemaModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      {/* Modal de Sauvegarde Intégrale des Données Réelles (CEG GOGBO 2026–2027) */}
      <SauvegardeIntegraleModal
        isOpen={isSauvegardeModalOpen}
        onClose={() => setIsSauvegardeModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AnneeProvider>
          <MainAppContent />
        </AnneeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
