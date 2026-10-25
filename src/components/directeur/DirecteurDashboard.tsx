import React from 'react';
import { storage } from '../../lib/storage';
import { LayoutDashboard, Users, School, GraduationCap, Award, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { TabKey } from '../Navigation';

interface DirecteurDashboardProps {
  onNavigate: (tab: TabKey) => void;
}

export const DirecteurDashboard: React.FC<DirecteurDashboardProps> = ({ onNavigate }) => {
  const eleves = storage.getEleves().filter((e) => e.statut === 'ACTIF');
  const classes = storage.getClasses();
  const profiles = storage.getProfiles().filter((p) => p.statut === 'ACTIF');
  const affectations = storage.getAffectations().filter((a) => a.statut === 'ACTIF');
  const activePeriode = storage.getActivePeriode();
  const params = storage.getParametres();

  const totalGarcons = eleves.filter((e) => e.sexe === 'M').length;
  const totalFilles = eleves.filter((e) => e.sexe === 'F').length;

  return (
    <div className="space-y-6">
      {/* Bannière Direction Générale */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-xl p-5 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Direction Générale
              </span>
              <span className="text-emerald-300 text-xs">• Supervision Académique Globale</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white">
              Espace du Directeur — {storage.getDirecteurNom() || params.nom_etablissement}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Consultation des effectifs, taux de parité, structure des 28 classes et accès à votre attribution de classe.
            </p>
          </div>

          <button
            onClick={() => onNavigate('pedagogique')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <span>Mon cours de Mathématiques</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Élèves</span>
            <Users className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {eleves.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalGarcons} Garçons • {totalFilles} Filles
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taux de Parité</span>
            <Award className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-900 mt-2">
            {eleves.length > 0 ? Math.round((totalFilles / eleves.length) * 100) : 0}% Filles
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {eleves.length > 0 ? Math.round((totalGarcons / eleves.length) * 100) : 0}% Garçons
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classes Actives</span>
            <School className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {classes.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Premier & Second cycle
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enseignants</span>
            <GraduationCap className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {profiles.filter((p) => p.is_enseignant).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {affectations.length} cours attribués
          </div>
        </div>
      </div>

      {/* Raccourcis de consultation */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-3">Consultation générale de l'établissement</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate('eleves')}
            className="p-3 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <div className="text-xs font-bold text-slate-900">Registre des Élèves</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Consulter les fiches et coordonnées</div>
          </button>

          <button
            onClick={() => onNavigate('classes')}
            className="p-3 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <div className="text-xs font-bold text-slate-900">Effectifs des 28 Classes</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Suivre le remplissage par niveau</div>
          </button>

          <button
            onClick={() => onNavigate('affectations')}
            className="p-3 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <div className="text-xs font-bold text-slate-900">Affectations des Professeurs</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Consulter la répartition horaire</div>
          </button>
        </div>
      </div>
    </div>
  );
};
