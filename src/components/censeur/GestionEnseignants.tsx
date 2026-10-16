import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/storage';
import { RoleAdmin, UserProfile } from '../../types';
import { PasswordField } from '../ui/PasswordField';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  UserCheck, 
  UserX, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  X,
  BookOpen,
  Loader2,
  Lock,
  AlertTriangle
} from 'lucide-react';

export const GestionEnseignants: React.FC = () => {
  const { currentUser, isCenseur, isDirecteur } = useAuth();
  const canManage = isCenseur || isDirecteur;

  const [profiles, setProfiles] = useState<UserProfile[]>(storage.getProfiles());
  const affectations = storage.getAffectations();
  const classes = storage.getClasses();
  const matieres = storage.getMatieres();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  // Modal de confirmation de désactivation (Exigence 7)
  const [confirmToggleProfile, setConfirmToggleProfile] = useState<UserProfile | null>(null);

  // Form state
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [matiere, setMatiere] = useState('');
  const [role, setRole] = useState<RoleAdmin>('ENSEIGNANT');
  const [statut, setStatut] = useState<'ACTIF' | 'INACTIF'>('ACTIF');
  const [isEnseignant, setIsEnseignant] = useState(true);
  const [password, setPassword] = useState('');

  // États d'enregistrement (Exigence 8)
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshList = () => {
    setProfiles(storage.getProfiles());
  };

  const openCreateModal = () => {
    setEditingProfile(null);
    setNom('');
    setPrenom('');
    setEmail('');
    setTelephone('');
    setAdresse('');
    setMatiere(matieres[0]?.nom || 'Mathématiques');
    setRole('ENSEIGNANT');
    setStatut('ACTIF');
    setIsEnseignant(true);
    setPassword('Gogbo2026!');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: UserProfile) => {
    setEditingProfile(p);
    setNom(p.nom);
    setPrenom(p.prenom);
    setEmail(p.email);
    setTelephone(p.telephone || '');
    setAdresse(p.adresse || '');
    setMatiere(p.matiere || matieres[0]?.nom || '');
    setRole(p.role);
    setStatut(p.statut);
    setIsEnseignant(p.is_enseignant);
    setPassword('');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!nom.trim() || !prenom.trim() || !email.trim()) {
      setErrorMessage('Le nom, le prénom et l’email académique sont obligatoires.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingProfile) {
        // Enregistrement asynchrone réel avec sync Supabase & storage local
        await storage.updateProfileAsync(
          editingProfile.id,
          {
            nom: nom.trim().toUpperCase(),
            prenom: prenom.trim(),
            email: email.trim().toLowerCase(),
            telephone: telephone.trim() || undefined,
            adresse: adresse.trim() || undefined,
            matiere: matiere.trim() || undefined,
            role,
            is_enseignant: isEnseignant,
            statut,
            initial_password: password.trim() || undefined,
          },
          currentUser
        );
        setSuccessMessage(`✓ Modifications enregistrées avec succès pour le personnel ${nom.toUpperCase()} ${prenom}.`);
      } else {
        storage.createProfile(
          {
            nom: nom.trim().toUpperCase(),
            prenom: prenom.trim(),
            email: email.trim().toLowerCase(),
            telephone: telephone.trim() || undefined,
            adresse: adresse.trim() || undefined,
            matiere: matiere.trim() || undefined,
            role,
            is_enseignant: isEnseignant,
            statut,
            initial_password: password.trim() || 'Gogbo2026!',
          },
          currentUser
        );
        setSuccessMessage(`✓ Compte personnel créé et enregistré avec succès : ${nom.toUpperCase()} ${prenom}.`);
      }

      refreshList();
      setIsModalOpen(false);
    } catch (err: unknown) {
      console.error("Erreur lors de l'enregistrement de l'enseignant:", err);
      setErrorMessage("⚠ Impossible d'enregistrer les modifications. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!currentUser || !confirmToggleProfile) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      storage.toggleProfileStatus(confirmToggleProfile.id, currentUser);
      refreshList();
      setSuccessMessage(
        `✓ Statut du compte de ${confirmToggleProfile.nom} modifié avec succès (${
          confirmToggleProfile.statut === 'ACTIF' ? 'Désactivé' : 'Réactivé'
        }).`
      );
      setConfirmToggleProfile(null);
    } catch (err: unknown) {
      console.error("Erreur lors du changement de statut:", err);
      setErrorMessage("⚠ Impossible d'enregistrer les modifications. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.nom.toLowerCase().includes(term) ||
      p.prenom.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      p.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <GraduationCap className="w-6 h-6 text-emerald-700" />
            <span>Gestion des Personnels & Enseignants</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Modification des fiches autorisées, attribution des rôles et contrôle d'accès au CEG GOGBO
          </p>
        </div>

        {canManage && (
          <button
            id="btn-creer-enseignant"
            onClick={openCreateModal}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow-xs transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un enseignant / personnel</span>
          </button>
        )}
      </div>

      {/* Messages de statut conformes aux exigences */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs sm:text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 text-red-900 border border-red-300 rounded-xl text-xs sm:text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 hover:text-red-900 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-enseignants"
            type="text"
            placeholder="Rechercher par nom, prénom, email ou rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
        </div>
      </div>

      {/* Grille / Tableau des enseignants */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3 sm:px-4 py-3">Nom & Prénoms</th>
                <th className="px-3 sm:px-4 py-3">Rôle Administratif</th>
                <th className="px-3 sm:px-4 py-3">Fonction Pédagogique</th>
                <th className="px-3 sm:px-4 py-3">Attributions de classe</th>
                <th className="px-3 sm:px-4 py-3">Contact</th>
                <th className="px-3 sm:px-4 py-3">Statut</th>
                <th className="px-3 sm:px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">
                    Aucun personnel trouvé avec ces critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => {
                  const profAffs = affectations.filter((a) => a.profile_id === p.id && a.statut === 'ACTIF');
                  const isSelf = currentUser?.id === p.id;

                  return (
                    <tr key={p.id} id={`row-prof-${p.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 sm:px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {p.prenom.charAt(0)}{p.nom.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold">{p.nom} {p.prenom}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{p.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            p.role === 'CONCEPTEUR'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : p.role === 'DIRECTEUR_GENERAL'
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              : p.role === 'CENSEUR'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : p.role === 'SURVEILLANT_GENERAL'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : p.role === 'COMPTABLE'
                              ? 'bg-teal-100 text-teal-900 border border-teal-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {p.role === 'CONCEPTEUR' ? 'CONCEPTEUR / SUPER ADMINISTRATEUR' : p.role}
                        </span>
                      </td>

                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        {p.is_enseignant ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                            <BookOpen className="w-3 h-3" />
                            <span>Enseigne (Actif)</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Non assigné</span>
                        )}
                      </td>

                      <td className="px-3 sm:px-4 py-3">
                        {profAffs.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {profAffs.map((a) => {
                              const cls = classes.find((c) => c.id === a.classe_id);
                              const mat = matieres.find((m) => m.id === a.matiere_id);
                              return (
                                <span
                                  key={a.id}
                                  className="inline-block bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded border border-slate-200"
                                >
                                  {mat?.nom || 'Matière'} • <strong>{cls?.nom || 'Classe'}</strong> ({a.heures_hebdo}h)
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Aucune attribution de classe</span>
                        )}
                      </td>

                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-slate-600">
                        {p.telephone || '—'}
                      </td>

                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            p.statut === 'ACTIF'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {p.statut}
                        </span>
                      </td>

                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-right space-x-1">
                        {canManage ? (
                          <>
                            <button
                              id={`btn-edit-prof-${p.id}`}
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Modifier la fiche de ce personnel"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {!isSelf && (
                              <button
                                id={`btn-toggle-prof-${p.id}`}
                                onClick={() => setConfirmToggleProfile(p)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  p.statut === 'ACTIF'
                                    ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={p.statut === 'ACTIF' ? 'Désactiver ce compte' : 'Activer ce compte'}
                              >
                                {p.statut === 'ACTIF' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Lecture seule</span>
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

      {/* Modal création / modification enseignant */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingProfile ? `Modifier la fiche : ${editingProfile.nom} ${editingProfile.prenom}` : 'Créer un nouveau personnel'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingProfile ? 'Mettez à jour les informations autorisées ci-dessous.' : 'Renseignez les coordonnées et rôles du compte.'}
                </p>
              </div>
              <button 
                onClick={() => !isSaving && setIsModalOpen(false)} 
                disabled={isSaving}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5 text-xs sm:text-sm">Nom de famille <span className="text-red-600 font-black">*</span></label>
                  <input
                    id="modal-prof-nom"
                    type="text"
                    required
                    placeholder="Ex: DOSSOU-YOVO"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg uppercase focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1.5 text-xs sm:text-sm">Prénom(s) <span className="text-red-600 font-black">*</span></label>
                  <input
                    id="modal-prof-prenom"
                    type="text"
                    required
                    placeholder="Ex: Clément"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1.5 text-xs sm:text-sm">Email académique officiel (Identifiant) <span className="text-red-600 font-black">*</span></label>
                <input
                  id="modal-prof-email"
                  type="email"
                  required
                  placeholder="Ex: c.dossou@ceggogbo.bj"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg lowercase focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1.5 text-xs sm:text-sm">Numéro de téléphone</label>
                <input
                  id="modal-prof-telephone"
                  type="tel"
                  placeholder="Ex: +229 97 00 00 00"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-500 font-medium shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1.5 text-xs sm:text-sm">Rôle administratif attribué <span className="text-red-600 font-black">*</span></label>
                <select
                  id="modal-prof-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleAdmin)}
                  className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm bg-white text-slate-900 font-medium shadow-2xs"
                >
                  <option value="ENSEIGNANT">Enseignant</option>
                  <option value="CENSEUR">Censeur</option>
                  <option value="DIRECTEUR_GENERAL">Directeur Général</option>
                  <option value="CONCEPTEUR">CONCEPTEUR / SUPER ADMINISTRATEUR</option>
                  <option value="SURVEILLANT_GENERAL">Surveillant Général</option>
                  <option value="COMPTABLE">Comptable</option>
                </select>
              </div>

              {/* Champ Mot de passe sécurisé avec Toggle 👁 (Exigence 1) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <PasswordField
                  id="modal-prof-password"
                  label={editingProfile ? "Définir un nouveau mot de passe (optionnel)" : "Mot de passe initial du compte"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingProfile ? "Laisser vide pour ne pas changer" : "••••••••"}
                  required={!editingProfile}
                  helpText="Masqué par défaut. Utilisez l'icône 👁 pour vérifier les caractères avant enregistrement."
                />
              </div>

              {/* Double fonction : Possibilité d'enseigner pour tout rôle (Exigence 3) */}
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    id="modal-prof-is-enseignant"
                    type="checkbox"
                    checked={isEnseignant}
                    onChange={(e) => setIsEnseignant(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs sm:text-sm block">
                      Fonction pédagogique active (peut dispenser des cours et saisir des notes)
                    </span>
                    <span className="text-[11px] text-emerald-800 block mt-0.5 leading-relaxed">
                      Conformément à la Section 3, un Censeur, le Directeur Général ou tout personnel administratif peut avoir des classes assignées et saisir ses propres notes.
                    </span>
                  </div>
                </label>
              </div>

              {/* Bouton Enregistrer / Annuler avec état d'enregistrement en direct (Exigence 5 & 8) */}
              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  id="btn-valider-form-prof"
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-75"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enregistrement en cours...</span>
                    </>
                  ) : (
                    <span>Enregistrer les modifications</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation avant désactivation (Exigence 7) */}
      {confirmToggleProfile && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6">
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Confirmation de changement de statut
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Êtes-vous sûr de vouloir {confirmToggleProfile.statut === 'ACTIF' ? 'désactiver' : 'réactiver'} le compte de{' '}
                  <strong>{confirmToggleProfile.nom} {confirmToggleProfile.prenom}</strong> ({confirmToggleProfile.role}) ?
                </p>
                {confirmToggleProfile.statut === 'ACTIF' && (
                  <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg mt-2 border border-red-200">
                    Ce personnel ne pourra plus accéder à la plateforme ni saisir de notes tant que son compte restera inactif.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmToggleProfile(null)}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                id="btn-confirm-toggle-prof"
                type="button"
                onClick={handleConfirmToggleStatus}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 ${
                  confirmToggleProfile.statut === 'ACTIF'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enregistrement en cours...</span>
                  </>
                ) : (
                  <span>Confirmer la {confirmToggleProfile.statut === 'ACTIF' ? 'désactivation' : 'réactivation'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
