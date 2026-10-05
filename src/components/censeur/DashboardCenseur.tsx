import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/storage';
import { 
  Users, 
  GraduationCap, 
  School, 
  Network, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText,
  History,
  CalendarCheck,
  UserCheck,
  BarChart3
} from 'lucide-react';
import { TabKey } from '../Navigation';

interface DashboardCenseurProps {
  onNavigate: (tab: TabKey) => void;
}

export const DashboardCenseur: React.FC<DashboardCenseurProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const eleves = storage.getEleves();
  const activeEleves = eleves.filter((e) => e.statut === 'ACTIF');
  const profiles = storage.getProfiles();
  const teachers = profiles.filter((p) => p.is_enseignant && p.statut === 'ACTIF');
  const classes = storage.getClasses();
  const affectations = storage.getAffectations().filter((a) => a.statut === 'ACTIF');
  const activePeriode = storage.getActivePeriode();
  const logs = storage.getAuditLogs().slice(0, 5);
  const params = storage.getParametres();

  // Calcul du volume horaire total hebdomadaire
  const totalHeuresHebdo = affectations.reduce((acc, curr) => acc + curr.heures_hebdo, 0);

  // Répartition des élèves par cycle
  const premierCycleCount = activeEleves.filter((e) => {
    const cls = classes.find((c) => c.id === e.classe_id);
    return ['6ème', '5ème', '4ème', '3ème'].includes(cls?.niveau || '');
  }).length;

  const secondCycleCount = activeEleves.length - premierCycleCount;

  return (
    <div className="space-y-6">
      {/* Bannière de Bienvenue Direction Pédagogique */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-xl p-5 sm:p-6 shadow-md border border-emerald-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {currentUser?.role === 'CONCEPTEUR' ? 'CONCEPTEUR / SUPER ADMINISTRATEUR' : 'Direction Pédagogique (Censeur)'}
              </span>
              <span className="text-emerald-300 text-xs">• Année {params.annee_academique}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white">
              Tableau de bord opérationnel — {params.nom_etablissement}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Supervision centrale des effectifs, des 28 classes, des attributions de classe et du contrôle des notes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-censeur-goto-stats"
              onClick={() => onNavigate('resultats_statistiques')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-200" />
              <span>Résultats Statistiques</span>
            </button>
            <button
              id="btn-censeur-goto-discipline"
              onClick={() => onNavigate('surveillant')}
              className="bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-200" />
              <span>Discipline & Punitions</span>
            </button>
            <button
              id="btn-censeur-goto-presence"
              onClick={() => onNavigate('presence_enseignants')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-200" />
              <span>Présence Enseignants</span>
            </button>
            <button
              id="btn-censeur-goto-affectations"
              onClick={() => onNavigate('affectations')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Attribution de classe</span>
            </button>
            <button
              id="btn-censeur-goto-pp"
              onClick={() => onNavigate('professeurs_principaux')}
              className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-200" />
              <span>Professeurs Principaux</span>
            </button>
            <button
              onClick={() => onNavigate('historique_annees')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Historique des années</span>
            </button>
            <button
              onClick={() => onNavigate('pedagogique')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <span>Accéder à mes notes (SVT)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cartes statistiques principales (Anti-slop, clean and high contrast) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Élèves */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Élèves Actifs</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {activeEleves.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
            <span>1er Cycle: {premierCycleCount}</span>
            <span>2nd Cycle: {secondCycleCount}</span>
          </div>
        </div>

        {/* Enseignants */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Corps Enseignant</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {teachers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Professeurs & Personnels affectés
          </div>
        </div>

        {/* Classes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classes Ouvertes</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <School className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {classes.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Max 100 élèves / classe
          </div>
        </div>

        {/* Affectations & Heures */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Volume Horaire</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {totalHeuresHebdo} h
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {affectations.length} attributions de classe
          </div>
        </div>
      </div>

      {/* Raccourcis d'actions rapides Censeur */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-3 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Gestion rapide de l'établissement</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          <button
            id="card-btn-resultats-stats"
            onClick={() => onNavigate('resultats_statistiques')}
            className="p-3 text-left rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors group cursor-pointer shadow-2xs"
          >
            <BarChart3 className="w-5 h-5 text-emerald-700 mb-1.5 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-black text-emerald-950 uppercase tracking-wide">Résultats Statistiques</div>
            <div className="text-[10px] text-emerald-700 font-medium">Bilans S1, S2 et Annuel (CEG GOGBO)</div>
          </button>

          <button
            id="card-btn-surveillant-discipline"
            onClick={() => onNavigate('surveillant')}
            className="p-3 text-left rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-colors group cursor-pointer shadow-2xs"
          >
            <ShieldCheck className="w-5 h-5 text-rose-700 mb-1.5 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-black text-rose-950 uppercase tracking-wide">Discipline & Punitions</div>
            <div className="text-[10px] text-rose-700 font-medium">Consigner pour tout apprenant</div>
          </button>

          <button
            id="card-btn-presence-enseignants"
            onClick={() => onNavigate('presence_enseignants')}
            className="p-3 text-left rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 transition-colors group cursor-pointer shadow-2xs"
          >
            <CalendarCheck className="w-5 h-5 text-emerald-700 mb-1.5 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-black text-slate-900 uppercase tracking-wide">Présence Enseignants</div>
            <div className="text-[10px] text-emerald-700 font-medium">Pointage journalier & retards</div>
          </button>

          <button
            onClick={() => onNavigate('eleves')}
            className="p-3 text-left rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-colors group"
          >
            <Users className="w-5 h-5 text-emerald-700 mb-1.5 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-bold text-slate-900">Gérer les Élèves</div>
            <div className="text-[10px] text-slate-500">Inscriptions & mutations</div>
          </button>

          <button
            onClick={() => onNavigate('enseignants')}
            className="p-3 text-left rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-colors group"
          >
            <GraduationCap className="w-5 h-5 text-blue-700 mb-1.5 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-bold text-slate-900">Gérer les Enseignants</div>
            <div className="text-[10px] text-slate-500">Création de comptes</div>
          </button>

          <button
            id="card-btn-attribution-classe"
            onClick={() => onNavigate('affectations')}
            className="p-3 text-left rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors group cursor-pointer"
          >
            <Network className="w-5 h-5 text-emerald-700 mb-1.5 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-black text-emerald-950 uppercase tracking-wide">Attribution de classe</div>
            <div className="text-[10px] text-emerald-700 font-medium">Multi-classes par enseignant</div>
          </button>

          <button
            id="card-btn-professeurs-principaux"
            onClick={() => onNavigate('professeurs_principaux')}
            className="p-3 text-left rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 transition-colors group cursor-pointer shadow-2xs"
          >
            <UserCheck className="w-5 h-5 text-indigo-700 mb-1.5 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-black text-indigo-950 uppercase tracking-wide">Professeurs Principaux</div>
            <div className="text-[10px] text-indigo-700 font-medium">1 enseignant = 1 classe PP</div>
          </button>

          <button
            id="card-btn-gestion-parents"
            onClick={() => onNavigate('parents')}
            className="p-3 text-left rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 transition-colors group cursor-pointer"
          >
            <Users className="w-5 h-5 text-indigo-600 mb-1.5 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-bold text-slate-900">Espace Parents</div>
            <div className="text-[10px] text-slate-500">Rattachements & comptes</div>
          </button>

          <button
            onClick={() => onNavigate('periodes')}
            className="p-3 text-left rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-colors group"
          >
            <Calendar className="w-5 h-5 text-amber-700 mb-1.5 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-bold text-slate-900">Périodes Scolaires</div>
            <div className="text-[10px] text-slate-500">
              {activePeriode?.nom || 'Période active'} ({activePeriode?.is_locked ? 'Verrouillé' : 'Ouvert'})
            </div>
          </button>
        </div>
      </div>

      {/* Derniers journaux d'audit (Section 19) */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Traçabilité & Journal d'Audit récent</span>
          </h3>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
          >
            Voir tout le journal →
          </button>
        </div>

        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-1"
            >
              <div className="flex items-center space-x-2">
                <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                  {log.action}
                </span>
                <span className="font-semibold text-slate-800">{log.user_nom}</span>
                <span className="text-slate-500 truncate max-w-xs">{log.details}</span>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
