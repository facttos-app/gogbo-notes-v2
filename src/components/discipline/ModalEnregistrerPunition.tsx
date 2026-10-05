import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { Classe, Eleve, CategorieFautePunition, PunitionScolaire } from '../../types';
import { 
  ShieldAlert, 
  X, 
  Check, 
  AlertTriangle, 
  Clock, 
  User, 
  BookOpen, 
  HelpCircle,
  School
} from 'lucide-react';

interface ModalEnregistrerPunitionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (punition: PunitionScolaire) => void;
  preselectedClasseId?: string;
  preselectedEleveId?: string;
}

// ----------------------------------------------------------------------
// GRILLE OFFICIELLE DES FAUTES ET PUNITIONS DU RÈGLEMENT INTÉRIEUR
// ----------------------------------------------------------------------
export interface GrilleCategorie {
  id: CategorieFautePunition;
  libelle: string;
  motifs: string[];
  punitions: string[];
}

export const GRILLE_PUNITIONS_OFFICIELLE: GrilleCategorie[] = [
  {
    id: 'BAVARDAGE_INDISCIPLINE',
    libelle: 'A. Bavardage / indiscipline en classe',
    motifs: [
      'Bavardages répétés perturbant le cours',
      'Indiscipline caractérisée',
      'Perturbation active du cours',
      "Refus d'obéir à une consigne pédagogique",
      'Insolence ou manque de respect envers un camarade',
    ],
    punitions: [
      'Rappel à l’ordre officiel',
      'Avertissement oral avec inscription au registre',
      'Travail supplémentaire à caractère pédagogique',
      'Changement de place dans la classe',
    ],
  },
  {
    id: 'RETARD',
    libelle: 'B. Retard aux cours',
    motifs: [
      'Retard non justifié au début du cours',
      'Retards répétés à la première heure',
      'Flânerie dans la cour après la sonnerie',
    ],
    punitions: [
      'Rappel à l’ordre',
      'Avertissement consigné',
      'Retenue réglementaire sous surveillance',
    ],
  },
  {
    id: 'DEVOIR_NON_FAIT',
    libelle: 'C. Devoir non fait / leçon non sue',
    motifs: [
      'Devoir maison non fait sans motif valable',
      'Leçon du jour non sue lors du contrôle oral',
      'Oubli répété du matériel ou cahier de cours',
      'Refus de travail personnel en classe',
    ],
    punitions: [
      'Travail pédagogique supplémentaire à rendre',
      'Devoir de rattrapage sous surveillance',
      'Copie / synthèse pédagogique du cours',
    ],
  },
  {
    id: 'NOURRITURE_CLASSE',
    libelle: 'D. Nourriture / chewing-gum en classe',
    motifs: [
      'Consommation d’aliments ou friandises pendant le cours',
      'Mâchage de chewing-gum en classe',
      'Dépôt de déchets sous la table d’étude',
    ],
    punitions: [
      'Rappel à l’ordre immédiat',
      'Nettoyage de la salle / mesure pédagogique',
      'Retenue selon le règlement intérieur',
    ],
  },
  {
    id: 'TENUE_PROPRETE',
    libelle: 'E. Manque de propreté / tenue négligée',
    motifs: [
      'Uniforme scolaire non conforme ou négligé',
      'Absence du macaron / insigne officiel',
      'Manque de propreté corporelle ou de la table',
    ],
    punitions: [
      'Rappel à l’ordre',
      'Mesure éducative autorisée',
      'Signalement à la vie scolaire',
    ],
  },
  {
    id: 'AUTRE',
    libelle: 'F. Autre motif réglementaire',
    motifs: [
      'Fraude ou tentative de tricherie',
      'Utilisation non autorisée de téléphone portable',
      'Dégradation involontaire de mobilier',
      'Autre manquement au règlement',
    ],
    punitions: [
      'Rappel à l’ordre solennel',
      'Avertissement écrit',
      'Mesure d’intérêt général scolaire',
      'Convocation transmise aux parents',
    ],
  },
];

export const ModalEnregistrerPunition: React.FC<ModalEnregistrerPunitionProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedClasseId,
  preselectedEleveId,
}) => {
  const { currentUser } = useAuth();
  const { selectedAnnee } = useAnnee();
  const anneeLibelle = selectedAnnee?.libelle || storage.getParametres().annee_academique || '2026–2027';

  const classes = useMemo(() => storage.getClasses(), []);
  const [selectedClasseId, setSelectedClasseId] = useState<string>(
    preselectedClasseId || classes[0]?.id || 'cls-6a'
  );

  const elevesClasse = useMemo(() => {
    return storage.getElevesByClasse(selectedClasseId, anneeLibelle);
  }, [selectedClasseId, anneeLibelle]);

  const [selectedEleveId, setSelectedEleveId] = useState<string>(
    preselectedEleveId || elevesClasse[0]?.id || ''
  );

  // Mettre à jour l'élève si la classe change
  React.useEffect(() => {
    if (elevesClasse.length > 0 && !elevesClasse.some((e) => e.id === selectedEleveId)) {
      setSelectedEleveId(elevesClasse[0].id);
    }
  }, [selectedClasseId, elevesClasse, selectedEleveId]);

  // États du formulaire
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [heure, setHeure] = useState<string>('');
  const [categorie, setCategorie] = useState<CategorieFautePunition>('BAVARDAGE_INDISCIPLINE');
  const [motif, setMotif] = useState<string>(GRILLE_PUNITIONS_OFFICIELLE[0].motifs[0]);
  const [punition, setPunition] = useState<string>(GRILLE_PUNITIONS_OFFICIELLE[0].punitions[0]);
  const [customMotif, setCustomMotif] = useState<string>('');
  const [customPunition, setCustomPunition] = useState<string>('');
  const [dureeModalite, setDureeModalite] = useState<string>('');
  const [observation, setObservation] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mettre à jour les motifs et punitions selon la catégorie
  const currentGridCat = useMemo(() => {
    return GRILLE_PUNITIONS_OFFICIELLE.find((g) => g.id === categorie) || GRILLE_PUNITIONS_OFFICIELLE[0];
  }, [categorie]);

  const handleCategorieChange = (catId: CategorieFautePunition) => {
    setCategorie(catId);
    const cat = GRILLE_PUNITIONS_OFFICIELLE.find((g) => g.id === catId);
    if (cat) {
      setMotif(cat.motifs[0] || '');
      setPunition(cat.punitions[0] || '');
      setCustomMotif('');
      setCustomPunition('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!selectedEleveId) {
      setErrorMessage("Veuillez sélectionner un apprenant.");
      return;
    }

    const finalMotif = customMotif.trim() || motif;
    const finalPunition = customPunition.trim() || punition;

    if (!finalMotif) {
      setErrorMessage("Veuillez préciser le motif de la punition.");
      return;
    }

    if (!finalPunition) {
      setErrorMessage("Veuillez préciser la punition appliquée.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const saved = storage.savePunition(
        {
          annee_scolaire: anneeLibelle,
          classe_id: selectedClasseId,
          eleve_id: selectedEleveId,
          date,
          heure: heure.trim() || undefined,
          categorie_faute: categorie,
          faute_motif: finalMotif,
          punition_appliquee: finalPunition,
          duree_modalite: dureeModalite.trim() || undefined,
          observation: observation.trim() || undefined,
        },
        currentUser
      );

      if (onSuccess) {
        onSuccess(saved);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Erreur lors de l'enregistrement de la punition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-6 overflow-hidden animate-in fade-in duration-200">
        {/* En-tête officiel du formulaire */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 text-white flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                  Discipline Quotidienne
                </span>
                <span className="text-[11px] text-rose-200">• Année {anneeLibelle}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Enregistrer une Punition Scolaire
              </h3>
              <p className="text-[11px] text-slate-300">
                Accessible à tout enseignant et membre administratif pour tout apprenant du collège.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message d'erreur */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-xs text-red-900 font-semibold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulaire de saisie */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Identité de l'auteur (Verrouillée automatiquement pour authenticité) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-slate-500">Auteur de la punition : </span>
                <strong className="text-slate-900 font-bold">
                  {currentUser?.prenom} {currentUser?.nom}
                </strong>
                <span className="ml-1.5 bg-slate-200 text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase">
                  {currentUser?.role}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ✓ Authentification certifiée
            </span>
          </div>

          {/* 1. Sélection de la Classe et de l'Élève (Toutes les 28 classes sont accessibles) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                <School className="w-3.5 h-3.5 text-indigo-600" />
                <span>Classe de l'apprenant (28 Classes) *</span>
              </label>
              <select
                value={selectedClasseId}
                onChange={(e) => setSelectedClasseId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.niveau})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Vous pouvez punir tout élève, même s'il n'est pas dans vos classes habituelles.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Apprenant concerné ({elevesClasse.length}) *
              </label>
              <select
                value={selectedEleveId}
                onChange={(e) => setSelectedEleveId(e.target.value)}
                required
                disabled={elevesClasse.length === 0}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer disabled:bg-slate-200"
              >
                {elevesClasse.length === 0 ? (
                  <option value="">Aucun élève dans cette classe</option>
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

          {/* 2. Date et Heure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Date de l'incident *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Heure constatée (facultative)
              </label>
              <input
                type="time"
                value={heure}
                onChange={(e) => setHeure(e.target.value)}
                placeholder="Ex: 08:30"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* 3. Catégorie de faute selon la Grille Officielle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center space-x-1">
              <span>Grille réglementaire des fautes scolaires *</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GRILLE_PUNITIONS_OFFICIELLE.map((g) => {
                const isSelected = categorie === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleCategorieChange(g.id)}
                    className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 border-rose-400 text-rose-950 font-bold shadow-2xs ring-1 ring-rose-400'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-rose-600' : 'bg-slate-300'}`} />
                      <span>{g.libelle}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Faute / Motif constaté */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Motif constaté *
            </label>
            <select
              value={motif}
              onChange={(e) => {
                setMotif(e.target.value);
                setCustomMotif('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              {currentGridCat.motifs.map((m, idx) => (
                <option key={idx} value={m}>
                  {m}
                </option>
              ))}
              <option value="__CUSTOM__">Autre motif personnalisé...</option>
            </select>

            {motif === '__CUSTOM__' && (
              <input
                type="text"
                required
                placeholder="Saisissez précisément le motif de la faute..."
                value={customMotif}
                onChange={(e) => setCustomMotif(e.target.value)}
                className="w-full border border-rose-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 animate-in fade-in"
              />
            )}
          </div>

          {/* 5. Punition appliquée */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Punition appliquée *
            </label>
            <select
              value={punition}
              onChange={(e) => {
                setPunition(e.target.value);
                setCustomPunition('');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              {currentGridCat.punitions.map((p, idx) => (
                <option key={idx} value={p}>
                  {p}
                </option>
              ))}
              <option value="__CUSTOM__">Autre punition éducative conforme...</option>
            </select>

            {punition === '__CUSTOM__' && (
              <input
                type="text"
                required
                placeholder="Précisez la punition éducative appliquée..."
                value={customPunition}
                onChange={(e) => setCustomPunition(e.target.value)}
                className="w-full border border-rose-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 animate-in fade-in"
              />
            )}
          </div>

          {/* 6. Durée / Modalités */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Durée ou modalités de réalisation (facultatif)
            </label>
            <input
              type="text"
              placeholder="Ex: Retenue 1h samedi 08h-09h, Exercice N°3 p.45 à rendre lundi, Copie 2 fois..."
              value={dureeModalite}
              onChange={(e) => setDureeModalite(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* 7. Observation complémentaire */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Observation / Circonstances (facultatif)
            </label>
            <textarea
              rows={2}
              placeholder="Détails complémentaires sur le comportement, attitude de l'élève..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Règle éthique obligatoire */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-950 space-y-1">
            <span className="font-bold flex items-center space-x-1.5 text-rose-900">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>INTERDICTIONS RÈGLEMENTAIRES STRICTES (RÉPUBLIQUE DU BÉNIN)</span>
            </span>
            <p>
              1. <strong>Aucun zéro académique :</strong> Il est strictement interdit d'utiliser une note d'interrogation ou de devoir comme sanction disciplinaire.
            </p>
            <p>
              2. <strong>Aucun châtiment corporel :</strong> Toute violence physique ou injure est formellement bannie et punie par la loi.
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || elevesClasse.length === 0}
              className="px-5 py-2 bg-rose-700 hover:bg-rose-600 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Consigner la punition'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
