import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { PeriodeScolaire } from '../../types';
import { CalendarDays, Lock, Unlock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

export const GestionPeriodes: React.FC = () => {
  const { currentUser, isCenseur } = useAuth();
  const { selectedAnnee, annees } = useAnnee();
  const [filterAnnee, setFilterAnnee] = useState<string>(selectedAnnee.libelle);
  const [periodes, setPeriodes] = useState<PeriodeScolaire[]>(storage.getPeriodes());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshList = () => {
    setPeriodes(storage.getPeriodes());
  };

  const displayedPeriodes = periodes.filter((p) => p.annee_scolaire === filterAnnee);

  const handleSetActive = (periodeId: string) => {
    if (!currentUser) return;
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      storage.setActivePeriode(periodeId, currentUser);
      refreshList();
      setSuccessMessage('Période active mise à jour.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleLock = (periodeId: string) => {
    if (!currentUser) return;
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const p = storage.toggleLockPeriode(periodeId, currentUser);
      refreshList();
      setSuccessMessage(
        `${p.nom} est désormais ${p.is_locked ? 'VERROUILLÉ (Saisie bloquée)' : 'DÉVERROUILLÉ (Saisie autorisée)'}.`
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <CalendarDays className="w-6 h-6 text-emerald-700" />
            <span>Gestion des Périodes Scolaires</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Contrôle des trimestres et semestres par année scolaire, activation et verrouillage strict
          </p>
        </div>

        {/* Sélecteur d'année */}
        <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-slate-500 font-medium">Année :</span>
          <select
            value={filterAnnee}
            onChange={(e) => setFilterAnnee(e.target.value)}
            className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            {annees.map((a) => (
              <option key={a.id} value={a.libelle}>
                {a.libelle} {a.is_active ? '(En cours)' : a.statut === 'CLOTUREE' ? '(Archivée)' : '(À venir)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Cartes des trimestres et semestres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayedPeriodes.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-slate-400 text-sm">
            Aucune période enregistrée pour l'année scolaire {filterAnnee}.
          </div>
        ) : (
          displayedPeriodes.map((p) => {
            return (
              <div
                key={p.id}
                className={`rounded-xl p-5 border transition-all ${
                  p.is_active
                    ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 opacity-90'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                    {p.code} • {p.annee_scolaire}
                  </span>
                  {p.is_active && (
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Période Active
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-slate-900 text-lg mb-1">{p.nom}</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Du {p.date_debut ? new Date(p.date_debut).toLocaleDateString('fr-FR') : 'N/A'} au{' '}
                  {p.date_fin ? new Date(p.date_fin).toLocaleDateString('fr-FR') : 'N/A'}
                </p>

                <div className="pt-3 border-t border-slate-200 flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">État de la saisie :</span>
                    {p?.is_locked ? (
                      <span className="inline-flex items-center space-x-1 text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[11px]">
                        <Lock className="w-3 h-3" />
                        <span>Verrouillé</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        <Unlock className="w-3 h-3" />
                        <span>Ouvert à la saisie</span>
                      </span>
                    )}
                  </div>

                  {isCenseur && (
                    <div className="pt-2 flex space-x-2">
                      {!p.is_active && (
                        <button
                          onClick={() => handleSetActive(p.id)}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium transition-colors cursor-pointer"
                        >
                          Définir active
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleLock(p.id)}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                          p?.is_locked
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {p?.is_locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>{p?.is_locked ? 'Déverrouiller' : 'Verrouiller'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
