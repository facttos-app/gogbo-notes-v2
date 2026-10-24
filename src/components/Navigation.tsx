import React from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../lib/storage';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  GraduationCap, 
  Network, 
  School, 
  Layers, 
  CalendarDays, 
  History, 
  Settings,
  ShieldCheck,
  CreditCard,
  LogOut,
  User,
  Trophy,
  FileText,
  CalendarCheck,
  UserCheck,
  BarChart3
} from 'lucide-react';

export type TabKey = 
  | 'censeur_dashboard'
  | 'presence_enseignants'
  | 'resultats_statistiques'
  | 'pedagogique'
  | 'professeur_principal_espace'
  | 'classement'
  | 'bulletins'
  | 'eleves'
  | 'parents'
  | 'espace_parent'
  | 'enseignants'
  | 'affectations'
  | 'professeurs_principaux'
  | 'classes'
  | 'matieres'
  | 'periodes'
  | 'audit'
  | 'parametres'
  | 'directeur_stats'
  | 'surveillant'
  | 'comptable'
  | 'historique_annees'
  | 'export_notes'
  | 'import_eleves';

interface NavigationProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenMonCompte?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab, onOpenMonCompte }) => {
  const { currentUser, isCenseur, isDirecteur, isConcepteur, isSurveillant, isComptable, hasPedagogicalAssignments, logout } = useAuth();

  if (!currentUser) return null;

  // Détermination des onglets disponibles selon le profil
  const getTabs = () => {
    const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [];

    // 0. ESPACE PARENT D'ÉLÈVE
    if (currentUser.role === 'PARENT') {
      tabs.push({
        key: 'espace_parent',
        label: 'Mon Espace Famille & Enfants',
        icon: <Users className="w-4 h-4 text-indigo-500" />,
        badge: 'Mes Enfants',
      });
      return tabs;
    }

    // 1. ESPACE DIRECTEUR GÉNÉRAL
    if (isDirecteur) {
      tabs.push({
        key: 'directeur_stats',
        label: 'Supervision & Stats',
        icon: <LayoutDashboard className="w-4 h-4" />,
      });
      // Le DG a-t-il une affectation pédagogique ? (Ex: Terminale D Mathématiques)
      if (hasPedagogicalAssignments || currentUser.is_enseignant) {
        tabs.push({
          key: 'pedagogique',
          label: 'Espace Pédagogique',
          icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
          badge: 'Mes Notes',
        });
      }
      tabs.push(
        { key: 'resultats_statistiques', label: 'Résultats Statistiques', icon: <BarChart3 className="w-4 h-4 text-emerald-400" />, badge: '3 Bilans' },
        { key: 'classement', label: 'Classement', icon: <Trophy className="w-4 h-4 text-amber-400" /> },
        { key: 'bulletins', label: 'Bulletins Scolaires', icon: <FileText className="w-4 h-4 text-emerald-400" /> },
        { key: 'surveillant', label: 'Discipline & Punitions', icon: <ShieldCheck className="w-4 h-4 text-rose-400" /> },
        { key: 'presence_enseignants', label: 'Présence Enseignants', icon: <CalendarCheck className="w-4 h-4 text-emerald-400" /> },
        { key: 'eleves', label: 'Consultation Élèves', icon: <Users className="w-4 h-4" /> },
        { key: 'parents', label: 'Parents d’Élèves', icon: <Users className="w-4 h-4 text-indigo-400" /> },
        { key: 'enseignants', label: 'Enseignants', icon: <GraduationCap className="w-4 h-4" /> },
        { key: 'affectations', label: 'Attribution de classe', icon: <Network className="w-4 h-4 text-emerald-400" /> },
        { key: 'professeurs_principaux', label: 'Professeurs Principaux', icon: <UserCheck className="w-4 h-4 text-indigo-400" /> },
        { key: 'classes', label: 'Classes (28)', icon: <School className="w-4 h-4" /> },
        { key: 'historique_annees', label: 'Historique des années', icon: <History className="w-4 h-4 text-amber-400" />, badge: 'Archives' },
        { key: 'audit', label: 'Journal d’Audit', icon: <History className="w-4 h-4" /> }
      );
      return tabs;
    }

    // 2. ESPACE CENSEUR & CONCEPTEUR / SUPER ADMINISTRATEUR
    if (isCenseur || isConcepteur) {
      tabs.push(
        {
          key: 'censeur_dashboard',
          label: 'Tableau de bord',
          icon: <LayoutDashboard className="w-4 h-4" />,
        }
      );
      // Le Censeur enseigne également (Ex: 4ème A & 3ème B SVT)
      if (hasPedagogicalAssignments || currentUser.is_enseignant) {
        tabs.push({
          key: 'pedagogique',
          label: 'Espace Pédagogique',
          icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
          badge: 'Mes Classes',
        });
      }
      tabs.push(
        { key: 'resultats_statistiques', label: 'Résultats Statistiques', icon: <BarChart3 className="w-4 h-4 text-emerald-400" />, badge: 'Global CEG' },
        { key: 'presence_enseignants', label: 'Présence Journalière Enseignants', icon: <CalendarCheck className="w-4 h-4 text-emerald-400" />, badge: 'Quotidien' },
        { key: 'classement', label: 'Classement', icon: <Trophy className="w-4 h-4 text-amber-500" /> },
        { key: 'bulletins', label: 'Bulletins Scolaires', icon: <FileText className="w-4 h-4 text-emerald-600" /> },
        { key: 'surveillant', label: 'Discipline & Punitions', icon: <ShieldCheck className="w-4 h-4 text-rose-400" /> },
        { key: 'eleves', label: 'Élèves', icon: <Users className="w-4 h-4" /> },
        { key: 'parents', label: 'Gestion Parents', icon: <Users className="w-4 h-4 text-indigo-400" /> },
        { key: 'enseignants', label: 'Enseignants', icon: <GraduationCap className="w-4 h-4" /> },
        { key: 'affectations', label: 'Attribution de classe', icon: <Network className="w-4 h-4 text-emerald-500" /> },
        { key: 'professeurs_principaux', label: 'Professeurs Principaux', icon: <UserCheck className="w-4 h-4 text-indigo-400" /> },
        { key: 'classes', label: 'Classes (28)', icon: <School className="w-4 h-4" /> },
        { key: 'matieres', label: 'Matières & Coefs', icon: <Layers className="w-4 h-4" /> },
        { key: 'export_notes', label: 'Export des notes (semestre)', icon: <FileText className="w-4 h-4 text-emerald-400" />, badge: 'Excel' },
        { key: 'import_eleves', label: 'Inscrire des élèves (fichier)', icon: <Users className="w-4 h-4 text-emerald-400" />, badge: 'Import' },
        { key: 'periodes', label: 'Périodes', icon: <CalendarDays className="w-4 h-4" /> },
        { key: 'historique_annees', label: 'Historique des années', icon: <History className="w-4 h-4 text-amber-500" />, badge: 'Archives' },
        { key: 'audit', label: 'Journal d’Audit', icon: <History className="w-4 h-4" /> },
        { key: 'parametres', label: 'Paramètres', icon: <Settings className="w-4 h-4" /> }
      );
      return tabs;
    }

    // 3. ESPACE SURVEILLANT GÉNÉRAL
    if (isSurveillant) {
      tabs.push(
        {
          key: 'surveillant',
          label: 'Discipline & Présences',
          icon: <ShieldCheck className="w-4 h-4" />,
        }
      );
      if (hasPedagogicalAssignments || currentUser.is_enseignant) {
        tabs.push({
          key: 'pedagogique',
          label: 'Espace Pédagogique',
          icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
        });
      }
      tabs.push(
        { key: 'resultats_statistiques', label: 'Résultats Statistiques', icon: <BarChart3 className="w-4 h-4 text-emerald-500" />, badge: '3 Bilans' },
        { key: 'eleves', label: 'Apprenants (28 Classes)', icon: <Users className="w-4 h-4" /> },
        { key: 'classement', label: 'Classement & Résultats', icon: <Trophy className="w-4 h-4 text-amber-500" /> },
        { key: 'bulletins', label: 'Bulletins Scolaires', icon: <FileText className="w-4 h-4 text-emerald-500" /> },
        { key: 'enseignants', label: 'Enseignants', icon: <GraduationCap className="w-4 h-4" /> },
        { key: 'affectations', label: 'Attribution de classe', icon: <Network className="w-4 h-4 text-emerald-400" /> },
        { key: 'professeurs_principaux', label: 'Professeurs Principaux', icon: <UserCheck className="w-4 h-4 text-indigo-400" /> },
        { key: 'presence_enseignants', label: 'Présence Enseignants', icon: <CalendarCheck className="w-4 h-4 text-emerald-500" /> },
        { key: 'classes', label: 'Classes (28)', icon: <School className="w-4 h-4" /> },
        { key: 'comptable', label: 'Activités Comptable', icon: <CreditCard className="w-4 h-4 text-teal-400" /> },
        { key: 'audit', label: 'Activités Censeur', icon: <History className="w-4 h-4" /> },
        { key: 'historique_annees', label: 'Historique des années', icon: <History className="w-4 h-4 text-amber-400" />, badge: 'Archives' }
      );
      return tabs;
    }

    // 4. ESPACE COMPTABLE
    if (isComptable) {
      tabs.push(
        {
          key: 'comptable',
          label: 'Comptabilité & Versements',
          icon: <CreditCard className="w-4 h-4" />,
        }
      );
      if (hasPedagogicalAssignments || currentUser.is_enseignant) {
        tabs.push({
          key: 'pedagogique',
          label: 'Espace Pédagogique',
          icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
        });
      }
      tabs.push(
        { key: 'resultats_statistiques', label: 'Résultats Statistiques', icon: <BarChart3 className="w-4 h-4 text-emerald-500" />, badge: '3 Bilans' },
        { key: 'eleves', label: 'Apprenants (28 Classes)', icon: <Users className="w-4 h-4" /> },
        { key: 'classement', label: 'Classement & Résultats', icon: <Trophy className="w-4 h-4 text-amber-500" /> },
        { key: 'bulletins', label: 'Bulletins Scolaires', icon: <FileText className="w-4 h-4 text-emerald-500" /> },
        { key: 'enseignants', label: 'Enseignants', icon: <GraduationCap className="w-4 h-4" /> },
        { key: 'affectations', label: 'Attribution de classe', icon: <Network className="w-4 h-4 text-emerald-400" /> },
        { key: 'professeurs_principaux', label: 'Professeurs Principaux', icon: <UserCheck className="w-4 h-4 text-indigo-400" /> },
        { key: 'presence_enseignants', label: 'Présence Enseignants', icon: <CalendarCheck className="w-4 h-4 text-emerald-500" /> },
        { key: 'classes', label: 'Classes (28)', icon: <School className="w-4 h-4" /> },
        { key: 'surveillant', label: 'Surveillance & Discipline', icon: <ShieldCheck className="w-4 h-4 text-blue-400" /> },
        { key: 'audit', label: 'Activités Censeur', icon: <History className="w-4 h-4" /> },
        { key: 'historique_annees', label: 'Historique des années', icon: <History className="w-4 h-4 text-amber-400" />, badge: 'Archives' }
      );
      return tabs;
    }

    // 5. ESPACE ENSEIGNANT (CONSULTATION GLOBALE DE TOUTES LES INFORMATIONS SCOLAIRES)
    tabs.push(
      {
        key: 'pedagogique',
        label: 'Mon Espace Pédagogique',
        icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
        badge: 'Mes Notes',
      }
    );

    // Si l'enseignant est Professeur Principal d'une classe pour l'année active
    const activeAnneeLibelle = storage.getActiveAnneeScolaire().libelle;
    const ppAssignment = currentUser ? storage.getActiveProfesseurPrincipalByEnseignant(currentUser.id, activeAnneeLibelle) : undefined;
    const ppClasse = ppAssignment ? storage.getClasseById(ppAssignment.classe_id) : undefined;

    if (ppAssignment && ppClasse) {
      tabs.push({
        key: 'professeur_principal_espace',
        label: `Professeur Principal (${ppClasse.nom})`,
        icon: <UserCheck className="w-4 h-4 text-indigo-400" />,
        badge: ppClasse.nom,
      });
    }

    tabs.push(
      { key: 'resultats_statistiques', label: 'Résultats Statistiques', icon: <BarChart3 className="w-4 h-4 text-emerald-500" />, badge: '3 Bilans' },
      { key: 'eleves', label: 'Apprenants (28 Classes)', icon: <Users className="w-4 h-4" /> },
      { key: 'classement', label: 'Classement & Résultats', icon: <Trophy className="w-4 h-4 text-amber-500" /> },
      { key: 'bulletins', label: 'Bulletins Scolaires', icon: <FileText className="w-4 h-4 text-emerald-500" /> },
      { key: 'enseignants', label: 'Corps Enseignant', icon: <GraduationCap className="w-4 h-4" /> },
      { key: 'affectations', label: 'Attribution de classe', icon: <Network className="w-4 h-4 text-emerald-400" /> },
      { key: 'professeurs_principaux', label: 'Professeurs Principaux', icon: <UserCheck className="w-4 h-4 text-indigo-400" /> },
      { key: 'presence_enseignants', label: 'Présence Enseignants', icon: <CalendarCheck className="w-4 h-4 text-emerald-400" /> },
      { key: 'classes', label: 'Classes (28)', icon: <School className="w-4 h-4" /> },
      { key: 'surveillant', label: 'Surveillance & Discipline', icon: <ShieldCheck className="w-4 h-4 text-blue-400" /> },
      { key: 'comptable', label: 'Activités Comptable', icon: <CreditCard className="w-4 h-4 text-teal-400" /> },
      { key: 'audit', label: 'Activités du Censeur', icon: <History className="w-4 h-4" /> },
      { key: 'historique_annees', label: 'Historique des années', icon: <History className="w-4 h-4 text-amber-400" />, badge: 'Archives' }
    );

    return tabs;
  };

  const tabs = getTabs();

  return (
    <nav id="nav-gogbo-tabs" className="bg-white border-b border-slate-200 sticky top-[73px] sm:top-[77px] z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none no-scrollbar">
          {/* BOUTON DE DÉCONNEXION OBLIGATOIREMENT À GAUCHE (EXIGENCE 14) */}
          <button
            id="btn-logout-left"
            onClick={logout}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-900 border border-red-200 transition-all shadow-2xs shrink-0"
            title="Fermer la session et retourner au portail de connexion"
          >
            <LogOut className="w-4 h-4 rotate-180 text-red-600" />
            <span>↪ Déconnexion</span>
          </button>

          {/* BOUTON MON COMPTE PERSONNEL (EXIGENCE 7) */}
          {onOpenMonCompte && (
            <button
              id="btn-mon-compte-nav"
              onClick={onOpenMonCompte}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200 transition-all shrink-0"
              title="Modifier mon identifiant ou mon mot de passe"
            >
              <User className="w-4 h-4 text-slate-500" />
              <span>Mon compte</span>
            </button>
          )}

          {/* SÉPARATEUR VERTICAL SUBTIL */}
          <div className="h-6 w-px bg-slate-300 mx-1 shrink-0"></div>

          {/* LISTE DES ONGLETS DE NAVIGATION DÉPENDANTS DU RÔLE */}
          {tabs.map((tab) => {
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-btn-${tab.key}`}
                onClick={() => onSelectTab(tab.key)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                      isActive ? 'bg-amber-400 text-slate-900' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
