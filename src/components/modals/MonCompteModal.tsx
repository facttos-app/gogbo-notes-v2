import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { PasswordField } from '../ui/PasswordField';
import { 
  User, 
  KeyRound, 
  Mail, 
  Phone, 
  MapPin, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  ShieldCheck, 
  Save, 
  School, 
  GraduationCap,
  Sparkles,
  Check
} from 'lucide-react';

interface MonCompteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MonCompteModal: React.FC<MonCompteModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateMyProfile, updateMyPassword } = useAuth();
  const { selectedAnnee } = useAnnee();

  // Onglet actif : 'INFORMATIONS' (par défaut) ou 'MOT_DE_PASSE'
  const [activeTab, setActiveTab] = useState<'INFORMATIONS' | 'MOT_DE_PASSE'>('INFORMATIONS');

  // Champs du formulaire Mon Compte
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [matiere, setMatiere] = useState('');

  // États de chargement et retours
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Formulaire Mot de passe
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmMotDePasse, setConfirmMotDePasse] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  // Liste des matières officielles pour suggestions
  const officialMatieres = storage.getMatieres();

  // Attributions pédagogiques actives de cet utilisateur
  const userAffectations = useMemo(() => {
    if (!currentUser) return [];
    return storage.getAffectationsByProfile(currentUser.id, selectedAnnee.libelle);
  }, [currentUser, selectedAnnee.libelle]);

  // Liste des matières réellement attribuées à cet enseignant
  const assignedSubjects = useMemo(() => {
    if (!currentUser) return [];
    const matMap = new Map<string, { nom: string; code: string; classes: string[] }>();
    userAffectations.forEach((aff) => {
      const m = storage.getMatiereById(aff.matiere_id);
      const c = storage.getClasseById(aff.classe_id);
      if (m) {
        if (!matMap.has(m.id)) {
          matMap.set(m.id, { nom: m.nom, code: m.code, classes: [] });
        }
        if (c) {
          matMap.get(m.id)!.classes.push(c.nom);
        }
      }
    });
    return Array.from(matMap.values());
  }, [userAffectations, currentUser]);

  // Initialisation des champs lorsque le modal s'ouvre ou que currentUser change
  useEffect(() => {
    if (isOpen && currentUser) {
      setNom(currentUser.nom || '');
      setPrenom(currentUser.prenom || '');
      setEmail(currentUser.email || '');
      setTelephone(currentUser.telephone || '');
      setAdresse(currentUser.adresse || '');
      
      // Si la matière n'est pas explicitement définie, suggérer celle issue des attributions
      let defaultMatiere = currentUser.matiere || '';
      if (!defaultMatiere && assignedSubjects.length > 0) {
        defaultMatiere = assignedSubjects.map((s) => s.nom).join(' • ');
      }
      setMatiere(defaultMatiere);

      setProfileSuccess(null);
      setProfileError(null);
      setPassSuccess(null);
      setPassError(null);
      setAncienMotDePasse('');
      setNouveauMotDePasse('');
      setConfirmMotDePasse('');
    }
  }, [isOpen, currentUser, assignedSubjects]);

  if (!isOpen || !currentUser) return null;

  // Enregistrement des informations personnelles
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!nom.trim() || !prenom.trim()) {
      setProfileError('Le nom et les prénoms sont obligatoires.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setProfileError('Veuillez renseigner une adresse email valide.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateMyProfile({
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim().toLowerCase(),
        telephone: telephone.trim(),
        adresse: adresse.trim(),
        matiere: matiere.trim(),
      });

      if (res.success) {
        setProfileSuccess('✓ Vos informations personnelles ont été enregistrées avec succès. Elles sont persistées dans la base de données et seront conservées lors de vos prochaines connexions.');
      } else {
        setProfileError(res.error || 'Erreur lors de la mise à jour des informations.');
      }
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Erreur inattendue lors de l’enregistrement.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Enregistrement du mot de passe
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!ancienMotDePasse) {
      setPassError('Veuillez renseigner votre mot de passe actuel.');
      return;
    }

    if (!nouveauMotDePasse || nouveauMotDePasse.length < 6) {
      setPassError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (nouveauMotDePasse !== confirmMotDePasse) {
      setPassError('La confirmation ne correspond pas au nouveau mot de passe saisi.');
      return;
    }

    setSavingPass(true);
    try {
      const res = await updateMyPassword(ancienMotDePasse, nouveauMotDePasse);
      if (res.success) {
        setPassSuccess('✓ Mot de passe mis à jour et synchronisé avec succès.');
        setAncienMotDePasse('');
        setNouveauMotDePasse('');
        setConfirmMotDePasse('');
      } else {
        setPassError(res.error || 'Erreur lors du changement de mot de passe.');
      }
    } catch {
      setPassError('Erreur inattendue lors de la mise à jour.');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* En-tête Modal MON COMPTE */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/40 font-black text-sm">
              {currentUser.prenom.charAt(0)}{currentUser.nom.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base sm:text-lg leading-tight text-white">
                  MON COMPTE
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full uppercase">
                  {currentUser.role === 'CONCEPTEUR' ? 'CONCEPTEUR / SUPER ADMINISTRATEUR' : currentUser.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Consultez, complétez et modifiez vos informations personnelles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Onglets Navigation : Mes Informations / Sécurité */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 gap-1 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('INFORMATIONS')}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'INFORMATIONS'
                ? 'bg-white text-emerald-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-700" />
            <span>Mes Informations Personnelles</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MOT_DE_PASSE')}
            className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'MOT_DE_PASSE'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>Mot de passe & Sécurité</span>
          </button>
        </div>

        {/* Corps du formulaire scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* ========================================================= */}
          {/* ONGLET 1 : MES INFORMATIONS PERSONNELLES                  */}
          {/* ========================================================= */}
          {activeTab === 'INFORMATIONS' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileSuccess && (
                <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs sm:text-sm flex items-start space-x-2.5 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{profileSuccess}</div>
                </div>
              )}

              {profileError && (
                <div className="p-3.5 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs sm:text-sm flex items-start space-x-2.5 shadow-2xs">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{profileError}</div>
                </div>
              )}

              {/* Rappel des attributions pédagogiques actives pour cohérence */}
              {(userAffectations.length > 0 || assignedSubjects.length > 0) && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                  <div className="font-bold text-emerald-950 flex items-center space-x-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-700" />
                    <span>Attributions pédagogiques actives ({selectedAnnee.libelle}) :</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {assignedSubjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-[11px] font-bold shadow-2xs"
                      >
                        <span>{sub.nom}</span>
                        {sub.classes.length > 0 && (
                          <span className="ml-1 text-[10px] text-emerald-700 font-normal">
                            ({sub.classes.join(', ')})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Ces classes et matières vous ont été attribuées par le Censeur. La mise à jour de vos coordonnées personnelles n'altère aucune de vos attributions.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. NOM */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Nom de famille <span className="text-red-600 font-black">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      id="input-moncompte-nom"
                      type="text"
                      required
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Votre nom de famille"
                      className="w-full pl-9 pr-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white shadow-2xs"
                    />
                  </div>
                </div>

                {/* 2. PRÉNOMS */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Prénoms <span className="text-red-600 font-black">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      id="input-moncompte-prenom"
                      type="text"
                      required
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      placeholder="Vos prénoms"
                      className="w-full pl-9 pr-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* 3. EMAIL (Identifiant) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Email (Identifiant de connexion) <span className="text-red-600 font-black">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    id="input-moncompte-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adresse.email@ceggogbo.bj"
                    className="w-full pl-9 pr-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white font-medium shadow-2xs"
                  />
                </div>
                <span className="text-[11px] text-slate-600 mt-1 block font-medium">
                  Cet email est l'identifiant unique utilisé pour vous authentifier sur le portail GOGBO NOTES.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 4. CONTACT TÉLÉPHONE */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Contact téléphone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      id="input-moncompte-telephone"
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+229 97 00 00 00"
                      className="w-full pl-9 pr-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white font-medium shadow-2xs"
                    />
                  </div>
                </div>

                {/* 5. RÉSIDENCE / ADRESSE */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Résidence / Adresse
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      id="input-moncompte-adresse"
                      type="text"
                      value={adresse}
                      onChange={(e) => setAdresse(e.target.value)}
                      placeholder="ex. Adjohoun - Quartier Démè"
                      className="w-full pl-9 pr-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white font-medium shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* 6. MATIÈRE / DISCIPLINE */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Matière / Discipline d'enseignement
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    id="input-moncompte-matiere"
                    type="text"
                    value={matiere}
                    onChange={(e) => setMatiere(e.target.value)}
                    placeholder="ex. SVT, Mathématiques, Français (Lecture & Communication écrite)..."
                    className="w-full pl-9 pr-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white font-semibold shadow-2xs"
                  />
                </div>

                {/* Suggestions rapides selon les matières officielles */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">Suggestions :</span>
                  {officialMatieres.slice(0, 6).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMatiere(m.nom)}
                      className="text-[10px] bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 border border-slate-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      {m.code}
                    </button>
                  ))}
                  {assignedSubjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMatiere(assignedSubjects.map((s) => s.nom).join(' • '))}
                      className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                    >
                      Mes attributions
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cohérent avec vos attributions pédagogiques. Si vous enseignez plusieurs matières, elles sont toutes conservées sans conflit.
                </span>
              </div>

              {/* Boutons d'actions */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <span className="text-[11px] text-slate-500">
                  Dernière mise à jour : {currentUser.updated_at ? new Date(currentUser.updated_at).toLocaleDateString('fr-FR') : 'Initiale'}
                </span>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    id="btn-save-mon-compte-profile"
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Enregistrer mes informations</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* ONGLET 2 : MOT DE PASSE & SÉCURITÉ                        */}
          {/* ========================================================= */}
          {activeTab === 'MOT_DE_PASSE' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {passSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              {passError && (
                <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              {/* Ancien mot de passe avec 👁 */}
              <PasswordField
                id="mon-compte-old-pass"
                label="Ancien mot de passe actuel"
                value={ancienMotDePasse}
                onChange={(e) => setAncienMotDePasse(e.target.value)}
                placeholder="Saisissez votre mot de passe actuel"
                required
                helpText="Vérification de sécurité obligatoire avant modification."
              />

              {/* Nouveau mot de passe avec 👁 */}
              <PasswordField
                id="mon-compte-new-pass"
                label="Nouveau mot de passe"
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                placeholder="Minimum 6 caractères"
                required
                helpText="Doit comporter au moins 6 caractères."
              />

              {/* Confirmation nouveau mot de passe avec 👁 */}
              <PasswordField
                id="mon-compte-confirm-pass"
                label="Confirmation du nouveau mot de passe"
                value={confirmMotDePasse}
                onChange={(e) => setConfirmMotDePasse(e.target.value)}
                placeholder="Retapez exactement le nouveau mot de passe"
                required
              />

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  id="btn-save-mon-compte-password"
                  type="submit"
                  disabled={savingPass}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingPass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Modification en cours...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Modifier mon mot de passe</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
