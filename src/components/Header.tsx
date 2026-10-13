import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAnnee } from '../context/AnneeContext';
import { storage } from '../lib/storage';
import { 
  GraduationCap, 
  LogOut, 
  UserCheck, 
  Menu, 
  X, 
  CheckCircle2, 
  Building2, 
  FileText,
  Calendar,
  Archive,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  onOpenTestModal: () => void;
  onOpenSqlModal: () => void;
  onOpenMonCompte?: () => void;
  onOpenSauvegardeModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenTestModal, onOpenSqlModal, onOpenMonCompte, onOpenSauvegardeModal }) => {
  const { currentUser, logout, switchUser } = useAuth();
  const { annees, activeAnnee, selectedAnnee, setSelectedAnnee, isArchive } = useAnnee();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profiles = storage.getProfiles();
  const periodesList = storage.getPeriodesByAnnee(selectedAnnee?.libelle || '2026–2027');
  const activePeriode = periodesList.find((p) => p.is_active) || periodesList[0] || storage.getActivePeriode();
  const params = storage.getParametres();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'CONCEPTEUR':
        return 'CONCEPTEUR / SUPER ADMINISTRATEUR';
      case 'DIRECTEUR_GENERAL':
        return 'Directeur Général';
      case 'CENSEUR':
        return 'Censeur (Admin)';
      case 'SURVEILLANT_GENERAL':
        return 'Surveillant Général';
      case 'COMPTABLE':
        return 'Comptable';
      case 'ENSEIGNANT':
        return 'Enseignant';
      default:
        return role;
    }
  };

  return (
    <header id="header-gogbo" className="bg-slate-900 text-white shadow-md border-b border-emerald-700/40 sticky top-0 z-40">
      {/* Bandeau officiel Bénin */}
      <div className="bg-emerald-800 text-emerald-100 text-xs px-3 py-1 flex flex-wrap justify-between items-center border-b border-emerald-900 font-sans tracking-wide">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span className="font-semibold uppercase tracking-wider text-[11px] sm:text-xs">
            RÉPUBLIQUE DU BÉNIN • {params.ministere}
          </span>
        </div>
        <div className="hidden md:flex items-center space-x-3 text-[11px]">
          <span>Commune : <strong>{params.commune}</strong></span>
          <span>•</span>
          <span>Arrondissement : <strong>{params.arrondissement}</strong></span>
          <span>•</span>
          <div className="flex items-center space-x-1.5 bg-emerald-950 px-2 py-0.5 rounded text-amber-300 font-medium">
            <Calendar className="w-3 h-3 text-amber-400" />
            <span>Année {selectedAnnee.libelle}</span>
            {selectedAnnee.is_active ? (
              <span className="bg-emerald-600 text-white text-[9px] px-1 rounded uppercase font-bold">Active</span>
            ) : selectedAnnee.statut === 'CLOTUREE' ? (
              <span className="bg-red-800 text-red-100 text-[9px] px-1 rounded uppercase font-bold">Clôturée</span>
            ) : (
              <span className="bg-blue-800 text-blue-100 text-[9px] px-1 rounded uppercase font-bold">À venir</span>
            )}
          </div>
        </div>
      </div>

      {/* Barre principale */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        {/* Identité CEG GOGBO */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-emerald-700 text-amber-300 flex items-center justify-center font-bold text-lg sm:text-xl shadow-inner border border-emerald-500/50">
            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-white leading-tight">
                CEG GOGBO
              </h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-500/30 uppercase">
                GOGBO NOTES V2
              </span>
            </div>
            <p className="text-xs text-slate-300 hidden sm:block truncate max-w-md">
              Système Numérique Officiel de Gestion Scolaire
            </p>
          </div>
        </div>

        {/* Actions centrales : Sélecteur d'Année Pluriannuelle & Période */}
        <div className="hidden lg:flex items-center space-x-3">
          {/* Sélecteur d'Année Scolaire */}
          <div className="bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400">Année :</span>
            <select
              id="select-header-annee"
              aria-label="Sélectionner l'année scolaire"
              value={selectedAnnee.id}
              onChange={(e) => {
                const target = annees.find((a) => a.id === e.target.value);
                if (target) setSelectedAnnee(target);
              }}
              className="bg-slate-900 text-amber-300 font-bold text-xs rounded border border-slate-700 py-0.5 px-2 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              {annees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.libelle} {a.is_active ? '★ (En cours)' : a.statut === 'CLOTUREE' ? '🔒 (Archivée)' : '⏳ (À venir)'}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs flex items-center space-x-2">
            <span className="text-slate-400">Période :</span>
            <span className="font-semibold text-emerald-400">{activePeriode?.nom || 'Période active'}</span>
            {(activePeriode?.is_locked || isArchive) ? (
              <span className="bg-red-900/60 text-red-200 text-[10px] px-1.5 py-0.5 rounded">Verrouillé</span>
            ) : (
              <span className="bg-emerald-900/60 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded">Saisie Ouverte</span>
            )}
          </div>

          <button
            id="btn-run-tests"
            onClick={onOpenTestModal}
            className="flex items-center space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            title="Tester les scénarios A à G et les 25 tests obligatoires"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validation des 25 Tests (A-G & 1-25)</span>
          </button>

          <button
            id="btn-view-sql"
            onClick={onOpenSqlModal}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Schéma Supabase / PostgreSQL"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>SQL Supabase</span>
          </button>

          <button
            id="btn-sauvegarde-integrale"
            onClick={onOpenSauvegardeModal}
            className="flex items-center space-x-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 text-xs px-2.5 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
            title="Télécharger la sauvegarde intégrale de toutes les données réelles (JSON)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sauvegarde Intégrale</span>
          </button>
        </div>

        {/* Profil utilisateur & Sélecteur de rôle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {currentUser && (
            <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700 px-2 sm:px-3 py-1 rounded-lg">
              <button
                id="header-btn-mon-compte"
                type="button"
                onClick={onOpenMonCompte}
                className="flex items-center space-x-2 text-left cursor-pointer hover:opacity-90 transition-opacity"
                title="Mon Compte personnel (Consulter et modifier mes informations)"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  {currentUser.prenom.charAt(0)}{currentUser.nom.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {currentUser.prenom} {currentUser.nom}
                  </div>
                  <div className="text-[10px] text-amber-300 font-medium">
                    {getRoleLabel(currentUser.role)}
                    {currentUser.is_enseignant && currentUser.role !== 'ENSEIGNANT' && (
                      <span className="text-emerald-300 ml-1">(+ Enseignant)</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Changement de compte / test direct */}
              <div className="pl-1 border-l border-slate-700 ml-1">
                <select
                  id="select-active-user"
                  aria-label="Changer d'utilisateur connecté"
                  value={currentUser.id}
                  onChange={(e) => switchUser(e.target.value)}
                  className="bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} {p.prenom} — {p.role}
                    </option>
                  ))}
                </select>
              </div>

              <button
                id="btn-header-logout"
                onClick={logout}
                title="Déconnexion"
                className="p-1.5 text-slate-400 hover:text-red-400 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bouton mobile menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-800 border-t border-slate-700 px-4 py-3 space-y-3">
          <div className="text-xs text-slate-300 pb-2 border-b border-slate-700 flex justify-between">
            <span>Période active : <strong className="text-emerald-400">{activePeriode.nom}</strong></span>
            <span>Année <strong>{params.annee_academique}</strong></span>
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTestModal();
              }}
              className="flex items-center space-x-2 w-full text-left bg-amber-500/10 text-amber-300 p-2 rounded border border-amber-500/30 text-xs font-medium"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lancer la vérification des 14 Tests</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSqlModal();
              }}
              className="flex items-center space-x-2 w-full text-left bg-slate-700 text-slate-200 p-2 rounded text-xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Voir le schéma SQL Supabase / PostgreSQL</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSauvegardeModal?.();
              }}
              className="flex items-center space-x-2 w-full text-left bg-emerald-600/20 text-emerald-300 p-2 rounded border border-emerald-500/40 text-xs font-semibold cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sauvegarde Intégrale des Données (JSON)</span>
            </button>
          </div>
        </div>
      )}

      {/* Bandeau officiel de Consultation Historique (Exigences 5 & 6) */}
      {(isArchive || selectedAnnee.id !== activeAnnee.id) && (
        <div id="banner-archive-mode" className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-amber-100 border-t border-b border-amber-600/70 px-4 py-2 text-xs shadow-inner flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider shadow-2xs flex items-center space-x-1">
              <Archive className="w-3.5 h-3.5" />
              <span>CONSULTATION HISTORIQUE</span>
            </span>
            <span className="font-extrabold text-amber-200 text-xs sm:text-sm">
              CONSULTATION HISTORIQUE — ANNÉE SCOLAIRE {selectedAnnee.libelle}
            </span>
            <span className="text-amber-300/80 text-[11px] hidden md:inline">
              • Mode lecture seule (Archives officielles protégées)
            </span>
          </div>
          <button
            id="btn-retour-annee-active-header"
            onClick={() => setSelectedAnnee(activeAnnee)}
            className="flex items-center space-x-1.5 text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1 rounded-md font-black transition-all shadow-xs cursor-pointer hover:shadow-sm"
            title="Revenir immédiatement à l'année scolaire active en cours"
          >
            <span>RETOUR À L'ANNÉE ACTIVE ({activeAnnee.libelle})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
