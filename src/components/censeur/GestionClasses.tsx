import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/storage';
import { Classe } from '../../types';
import { School, Users, BookOpen, Clock, Plus, Trash2, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

export const GestionClasses: React.FC = () => {
  const { currentUser, isCenseur, isConcepteur } = useAuth();
  const [classes, setClasses] = useState<Classe[]>(() => storage.getClasses());
  const eleves = storage.getEleves();
  const affectations = storage.getAffectations();
  const [selectedCycle, setSelectedCycle] = useState<'ALL' | 'PREMIER' | 'SECOND'>('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetNiveau, setTargetNiveau] = useState<string>('6ème');
  const [customNom, setCustomNom] = useState<string>('');
  const [customSerie, setCustomSerie] = useState<string>('Générale');
  const [customEffectifMax, setCustomEffectifMax] = useState<number>(100);
  const [customSalle, setCustomSalle] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canManage = isCenseur || isConcepteur || currentUser?.role === 'DIRECTEUR_GENERAL';

  const premierCycleNiveaux = ['6ème', '5ème', '4ème', '3ème', '6e', '5e', '4e', '3e'];
  const secondCycleNiveaux = ['Seconde', 'Première', 'Terminale', '2nde', '1ère', 'Tle'];

  const premierCycleClasses = classes.filter((cls) => premierCycleNiveaux.includes(cls.niveau));
  const secondCycleClasses = classes.filter((cls) => secondCycleNiveaux.includes(cls.niveau));

  const filteredClasses = classes.filter((cls) => {
    if (selectedCycle === 'PREMIER') return premierCycleNiveaux.includes(cls.niveau);
    if (selectedCycle === 'SECOND') return secondCycleNiveaux.includes(cls.niveau);
    return true;
  });

  const nextLetter = storage.getNextClasseLetter(targetNiveau);
  const suggestedNom = `${targetNiveau} ${nextLetter}`;

  const handleOpenAddModal = (niveau?: string) => {
    const niv = niveau || '6ème';
    setTargetNiveau(niv);
    const letter = storage.getNextClasseLetter(niv);
    setCustomNom(`${niv} ${letter}`);
    setCustomSerie(['6ème', '5ème', '4ème', '3ème'].includes(niv) ? 'Générale' : 'A');
    setCustomEffectifMax(100);
    setCustomSalle(`Salle ${niv} ${letter}`);
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleNiveauChange = (newNiv: string) => {
    setTargetNiveau(newNiv);
    const letter = storage.getNextClasseLetter(newNiv);
    setCustomNom(`${newNiv} ${letter}`);
    setCustomSerie(['6ème', '5ème', '4ème', '3ème'].includes(newNiv) ? 'Générale' : 'A');
    setCustomSalle(`Salle ${newNiv} ${letter}`);
  };

  const handleCreateClasse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !canManage) return;

    setErrorMsg(null);
    try {
      const created = storage.createClasse(
        {
          niveau: targetNiveau,
          nom: customNom.trim() || suggestedNom,
          serie: customSerie,
          effectif_max: customEffectifMax,
          salle: customSalle.trim() || undefined,
        },
        currentUser
      );

      const refreshed = storage.getClasses();
      setClasses(refreshed);
      setSuccessMsg(`✓ La classe ${created.nom} a été créée et intégrée avec succès ! Les coefficients et modules ont été configurés.`);
      setIsAddModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la création de la classe');
    }
  };

  const handleDeleteClasse = (cls: Classe) => {
    if (!currentUser || !canManage) return;
    const classEleves = eleves.filter((e) => e.classe_id === cls.id);
    if (classEleves.length > 0) {
      alert(`Impossible de supprimer la classe "${cls.nom}" : ${classEleves.length} apprenant(s) y sont rattaché(s).`);
      return;
    }
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement la classe "${cls.nom}" ?`)) {
      try {
        storage.deleteClasse(cls.id, currentUser);
        setClasses(storage.getClasses());
        setSuccessMsg(`✓ Classe "${cls.nom}" supprimée.`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages de confirmation */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-sm flex items-center space-x-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2">
            <School className="w-6 h-6 text-emerald-700" />
            <span>Structure Pédagogique — Classes ({classes.length})</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Répartition académique du CEG GOGBO ({premierCycleClasses.length} classes au Premier Cycle • {secondCycleClasses.length} classes au Second Cycle)
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {/* Bouton d'ajout continuel de classes par le Censeur (Exigence 7) */}
          {canManage && (
            <button
              id="btn-ajouter-nouvelle-classe"
              onClick={() => handleOpenAddModal('6ème')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une classe</span>
            </button>
          )}

          {/* Filtre Cycle */}
          <div className="flex bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setSelectedCycle('ALL')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedCycle === 'ALL' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Toutes ({classes.length})
            </button>
            <button
              onClick={() => setSelectedCycle('PREMIER')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedCycle === 'PREMIER' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              1er Cycle ({premierCycleClasses.length})
            </button>
            <button
              onClick={() => setSelectedCycle('SECOND')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                selectedCycle === 'SECOND' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              2nd Cycle ({secondCycleClasses.length})
            </button>
          </div>
        </div>
      </div>

      {/* Grille des classes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {filteredClasses.map((cls) => {
          const classEleves = eleves.filter((e) => e.classe_id === cls.id && e.statut === 'ACTIF');
          const classAffs = affectations.filter((a) => a.classe_id === cls.id && a.statut === 'ACTIF');
          const totalHours = classAffs.reduce((acc, curr) => acc + curr.heures_hebdo, 0);
          const percent = Math.min(100, Math.round((classEleves.length / cls.effectif_max) * 100));

          const isSecondCycle = secondCycleNiveaux.includes(cls.niveau);

          return (
            <div
              key={cls.id}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    isSecondCycle ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {cls.niveau} • {cls.serie}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Max: {cls.effectif_max}
                    </span>
                    {canManage && classEleves.length === 0 && (
                      <button
                        title="Supprimer la classe vide"
                        onClick={() => handleDeleteClasse(cls)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-0.5 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-extrabold text-slate-900 text-lg">{cls.nom}</h3>

                {/* Effectif et barre de progression (Règle max 100 élèves) */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-slate-600 flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Effectif :</span>
                    </span>
                    <span className={`font-bold ${percent >= 90 ? 'text-amber-600' : 'text-slate-800'}`}>
                      {classEleves.length} / {cls.effectif_max} élèves
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percent >= 100
                          ? 'bg-red-500'
                          : percent >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Détails Pédagogiques */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center space-x-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{classAffs.length} cours</span>
                </span>
                <span className="flex items-center space-x-1 font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{totalHours} h / sem</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal d'Ajout Continu de Classe par le Censeur (Exigence 7) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Ajouter une nouvelle classe
                  </h3>
                  <p className="text-xs text-slate-500">
                    Création dynamique et calcul automatique de la lettre
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateClasse} className="space-y-3.5">
              {/* Promotion / Niveau */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Promotion / Niveau <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetNiveau}
                  onChange={(e) => handleNiveauChange(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <optgroup label="Premier Cycle">
                    <option value="6ème">6ème</option>
                    <option value="5ème">5ème</option>
                    <option value="4ème">4ème</option>
                    <option value="3ème">3ème</option>
                  </optgroup>
                  <optgroup label="Second Cycle">
                    <option value="Seconde">Seconde</option>
                    <option value="Première">Première</option>
                    <option value="Terminale">Terminale</option>
                  </optgroup>
                </select>
              </div>

              {/* Notification dynamique de la prochaine lettre */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Prochaine lettre disponible calculée automatiquement : </span>
                  <span className="font-black text-emerald-700 font-mono text-sm px-1.5 py-0.5 bg-white rounded border border-emerald-300">
                    {nextLetter}
                  </span>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    Exemple de suite : {targetNiveau} A → {targetNiveau} B → {targetNiveau} C → {targetNiveau} D → <span className="font-bold">{suggestedNom}</span>
                  </p>
                </div>
              </div>

              {/* Nom de la classe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Intitulé officiel de la classe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customNom}
                  onChange={(e) => setCustomNom(e.target.value)}
                  placeholder={`Ex: ${suggestedNom}`}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              {/* Série et Effectif Max */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Série / Filière
                  </label>
                  <input
                    type="text"
                    value={customSerie}
                    onChange={(e) => setCustomSerie(e.target.value)}
                    placeholder="Générale, A, B, C, D..."
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Effectif maximal
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={150}
                    value={customEffectifMax}
                    onChange={(e) => setCustomEffectifMax(Number(e.target.value))}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Salle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Salle de cours (optionnel)
                </label>
                <input
                  type="text"
                  value={customSalle}
                  onChange={(e) => setCustomSalle(e.target.value)}
                  placeholder="Ex: Salle 12, Bâtiment B"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer la classe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
