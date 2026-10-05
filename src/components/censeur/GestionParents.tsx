import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { ParentProfile, LienParental, Eleve } from '../../types';
import { 
  Users, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Link, 
  Unlink, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  UserCheck, 
  GraduationCap, 
  Edit3, 
  Lock, 
  Eye,
  KeyRound
} from 'lucide-react';

export const GestionParents: React.FC = () => {
  const { currentUser, isCenseur, isConcepteur } = useAuth();
  const { selectedAnnee, isArchive } = useAnnee();
  const canManage = isCenseur || isConcepteur;

  const [parents, setParents] = useState<ParentProfile[]>(storage.getParents());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIF' | 'INACTIF'>('ALL');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Création / Édition Parent
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentProfile | null>(null);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState('');
  const [adresse, setAdresse] = useState('');
  const [password, setPassword] = useState('Passer123!');
  const [defaultLien, setDefaultLien] = useState<LienParental>('PERE');

  // Modal Rattachement d'élève
  const [linkingParent, setLinkingParent] = useState<ParentProfile | null>(null);
  const [linkClasseFilter, setLinkClasseFilter] = useState<string>('ALL');
  const [selectedEleveId, setSelectedEleveId] = useState<string>('');
  const [lienParental, setLienParental] = useState<LienParental>('PERE');
  const [eleveSearchTerm, setEleveSearchTerm] = useState('');
  const [linkModalNotice, setLinkModalNotice] = useState<string | null>(null);

  const allEleves = useMemo(() => storage.getEleves(selectedAnnee.libelle), [selectedAnnee.libelle]);
  const classes = useMemo(() => storage.getClasses(), []);

  const refreshParents = () => {
    setParents(storage.getParents());
  };

  const handleOpenCreateModal = () => {
    setEditingParent(null);
    setNom('');
    setPrenom('');
    setTelephone('+229 ');
    setEmail('');
    setProfession('');
    setAdresse('');
    setDefaultLien('PERE');
    setPassword('Passer123!');
    setIsModalOpen(true);
    setStatusMessage(null);
  };

  const handleOpenEditModal = (parent: ParentProfile) => {
    setEditingParent(parent);
    setNom(parent.nom);
    setPrenom(parent.prenom);
    setTelephone(parent.telephone);
    setEmail(parent.email || '');
    setProfession(parent.profession || '');
    setAdresse(parent.adresse || '');
    setPassword('');
    setIsModalOpen(true);
    setStatusMessage(null);
  };

  const handleSaveParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !canManage) return;

    if (!nom.trim() || !prenom.trim() || !telephone.trim()) {
      setStatusMessage({ type: 'error', text: 'Le nom, le prénom et le téléphone sont obligatoires.' });
      return;
    }

    try {
      if (editingParent) {
        storage.updateParent(
          editingParent.id,
          {
            nom: nom.trim().toUpperCase(),
            prenom: prenom.trim(),
            telephone: telephone.trim(),
            email: email.trim().toLowerCase() || undefined,
            profession: profession.trim() || undefined,
            adresse: adresse.trim() || undefined,
          },
          currentUser
        );
        if (password.trim() && editingParent.profile_id) {
          storage.setUserPassword(editingParent.profile_id, password.trim());
        }
        setStatusMessage({ type: 'success', text: `Compte parent de ${nom} ${prenom} mis à jour avec succès.` });
        setIsModalOpen(false);
        refreshParents();
      } else {
        const created = storage.createParent(
          {
            nom,
            prenom,
            telephone,
            email: email || undefined,
            profession: profession || undefined,
            adresse: adresse || undefined,
            password: password || 'Passer123!',
          },
          currentUser
        );
        setIsModalOpen(false);
        refreshParents();
        setStatusMessage({ 
          type: 'success', 
          text: `Nouveau compte parent créé avec succès pour ${nom} ${prenom}. Vous pouvez maintenant lui rattacher ses enfants.` 
        });
        // Ouvrir automatiquement le modal pour rattacher ses enfants (Enfant 1, Enfant 2, etc.)
        handleOpenLinkModal(created);
      }
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de l’opération.' });
    }
  };

  const handleToggleStatus = (parent: ParentProfile) => {
    if (!currentUser || !canManage) return;
    try {
      const updated = storage.toggleParentStatus(parent.id, currentUser);
      setStatusMessage({
        type: 'success',
        text: `Compte parent désormais ${updated.statut === 'ACTIF' ? 'ACTIVÉ' : 'DÉSACTIVÉ'}.`,
      });
      refreshParents();
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur statut.' });
    }
  };

  const handleOpenLinkModal = (parent: ParentProfile) => {
    setLinkingParent(parent);
    setLinkClasseFilter(classes[0]?.id || 'ALL');
    setSelectedEleveId('');
    setLienParental('PERE');
    setEleveSearchTerm('');
    setLinkModalNotice(null);
  };

  const handleConfirmLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !canManage || !linkingParent || !selectedEleveId) {
      setLinkModalNotice("Veuillez sélectionner un apprenant valide.");
      return;
    }

    try {
      const student = storage.getEleveById(selectedEleveId);
      const studentClass = student ? storage.getClasseById(student.classe_id) : undefined;
      
      storage.linkParentToEleve(
        {
          parent_id: linkingParent.id,
          eleve_id: selectedEleveId,
          lien_parental: lienParental,
        },
        currentUser
      );
      
      refreshParents();
      setLinkModalNotice(
        `Apprenant ${student ? `${student.nom} ${student.prenom} (${studentClass?.nom || 'Classe'})` : ''} rattaché avec succès ! Cliquez sur « Ajouter un autre enfant » ci-dessous pour rattacher un 2e, 3e, etc.`
      );
      setSelectedEleveId('');
    } catch (err: unknown) {
      setLinkModalNotice(err instanceof Error ? err.message : 'Erreur lors du rattachement.');
    }
  };

  const handleUnlink = (linkId: string) => {
    if (!currentUser || !canManage) return;
    if (window.confirm("Confirmez-vous le détachement de cet apprenant du compte parent ?")) {
      try {
        storage.unlinkParentFromEleve(linkId, currentUser);
        setStatusMessage({ type: 'success', text: 'Apprenant détaché avec succès.' });
        refreshParents();
      } catch (err: unknown) {
        setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur détachement.' });
      }
    }
  };

  const filteredParents = useMemo(() => {
    return parents.filter((p) => {
      if (statusFilter !== 'ALL' && p.statut !== statusFilter) return false;
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const searchStr = `${p.nom} ${p.prenom} ${p.telephone} ${p.email || ''}`.toLowerCase();
        return searchStr.includes(q);
      }
      return true;
    });
  }, [parents, statusFilter, searchTerm]);

  const filteredElevesForLink = useMemo(() => {
    let list = allEleves;
    if (linkClasseFilter !== 'ALL') {
      list = list.filter((e) => e.classe_id === linkClasseFilter);
    }
    if (eleveSearchTerm.trim()) {
      const q = eleveSearchTerm.toLowerCase();
      list = list.filter((e) => {
        const cls = classes.find((c) => c.id === e.classe_id);
        return (
          e.nom.toLowerCase().includes(q) ||
          e.prenom.toLowerCase().includes(q) ||
          e.matricule.toLowerCase().includes(q) ||
          (cls && cls.nom.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [allEleves, classes, linkClasseFilter, eleveSearchTerm]);

  return (
    <div className="space-y-6">
      {/* 1. EN-TÊTE OFFICIEL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-slate-950" />
                <span>Administration & Liaison Familles • CEG GOGBO</span>
              </span>
              <span className="text-indigo-200 text-xs">• Année {selectedAnnee.libelle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1 text-white flex items-center space-x-2">
              <span>GESTION DES COMPTES PARENTS D'ÉLÈVES</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl">
              Procédure sécurisée de délivrance des accès parents. Chaque parent est formellement rattaché par le Censeur ou la Direction à son ou ses propres enfants pour la consultation mobile confidentielle.
            </p>
          </div>

          {canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow transition flex items-center space-x-2 cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Créer un Compte Parent</span>
            </button>
          )}
        </div>
      </div>

      {/* Message de notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un parent (nom, téléphone, e-mail)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-semibold">Statut :</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIF' | 'INACTIF')}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIF">Comptes Actifs</option>
            <option value="INACTIF">Comptes Inactifs</option>
          </select>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md font-mono">
            {filteredParents.length} parent(s)
          </span>
        </div>
      </div>

      {/* 2. LISTE DES COMPTES PARENTS ET ENFANTS RATTACHÉS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredParents.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
            Aucun compte parent trouvé selon ces critères de recherche.
          </div>
        ) : (
          filteredParents.map((parent) => {
            const links = storage.getParentElevesByParent(parent.id);
            return (
              <div
                key={parent.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">ID: {parent.id}</span>
                      <h3 className="text-base font-black text-slate-900 mt-0.5">
                        {parent.nom} {parent.prenom}
                      </h3>
                      {parent.profession && (
                        <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>{parent.profession}</span>
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        parent.statut === 'ACTIF'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {parent.statut}
                    </span>
                  </div>

                  {/* Coordonnées de contact */}
                  <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-mono font-bold text-slate-800">{parent.telephone}</span>
                      <span className="text-[10px] text-slate-400">(Identifiant de connexion)</span>
                    </div>
                    {parent.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{parent.email}</span>
                      </div>
                    )}
                    {parent.adresse && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{parent.adresse}</span>
                      </div>
                    )}
                  </div>

                  {/* Enfants rattachés */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                      <span className="flex items-center space-x-1.5">
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                        <span>Enfants rattachés ({links.length})</span>
                      </span>
                      {canManage && (
                        <button
                          onClick={() => handleOpenLinkModal(parent)}
                          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ Ajouter un enfant</span>
                        </button>
                      )}
                    </div>

                    {links.length === 0 ? (
                      <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                        ⚠️ Aucun enfant rattaché à ce compte pour le moment.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {links.map((link) => {
                          const eleve = storage.getEleveById(link.eleve_id);
                          const cls = eleve ? classes.find((c) => c.id === eleve.classe_id) : undefined;
                          return (
                            <div
                              key={link.id}
                              className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900">
                                  {eleve ? `${eleve.nom} ${eleve.prenom}` : link.eleve_id}
                                </span>
                                <span className="text-[11px] text-slate-500 ml-2">
                                  ({cls?.nom || 'Classe'}) • Matricule: {eleve?.matricule}
                                </span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-2 font-mono">
                                  {link.lien_parental}
                                </span>
                              </div>
                              {canManage && (
                                <button
                                  onClick={() => handleUnlink(link.id)}
                                  className="text-red-500 hover:text-red-700 p-1 transition cursor-pointer"
                                  title="Détacher cet enfant"
                                >
                                  <Unlink className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions sur le compte parent */}
                {canManage && (
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleToggleStatus(parent)}
                      className={`text-xs px-2.5 py-1.5 rounded font-medium transition cursor-pointer ${
                        parent.statut === 'ACTIF'
                          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {parent.statut === 'ACTIF' ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(parent)}
                      className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. MODAL CRÉATION / ÉDITION PARENT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex justify-between items-center">
              <h3 className="font-bold text-base sm:text-lg flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>{editingParent ? 'Modifier le Compte Parent' : 'Créer un Nouveau Compte Parent'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParent} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: HOUENOU"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prénoms *</label>
                  <input
                    type="text"
                    required
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Ex: Paul"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Numéro de Téléphone * <span className="text-slate-400 font-normal">(Sert d'identifiant de connexion)</span>
                </label>
                <input
                  type="text"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+229 97 00 00 00"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Adresse E-mail (facultative)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@gmail.com"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Profession</label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Ex: Enseignant, Artisan"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse / Résidence</label>
                <input
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Ex: Adjohoun Centre"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mot de passe initial {editingParent && <span className="text-slate-400 font-normal">(Laisser vide si inchangé)</span>}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Passer123!"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Le mot de passe par défaut est : <code>Passer123!</code></p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold shadow cursor-pointer"
                >
                  {editingParent ? 'Mettre à jour' : 'Créer le Compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL RATTACHEMENT D'UN ÉLÈVE À UN PARENT */}
      {linkingParent && (() => {
        const currentLinks = storage.getParentElevesByParent(linkingParent.id);
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
                    Liaison Multi-Enfants • CEG GOGBO
                  </span>
                  <h3 className="font-bold text-base sm:text-lg flex items-center space-x-2 mt-0.5">
                    <UserPlus className="w-5 h-5 text-emerald-400" />
                    <span>Rattacher un enfant à {linkingParent.nom} {linkingParent.prenom}</span>
                  </h3>
                </div>
                <button onClick={() => setLinkingParent(null)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                {/* Liste des enfants déjà rattachés à ce parent */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center space-x-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                      <span>Enfants actuellement rattachés à ce compte ({currentLinks.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Même compte pour la fratrie</span>
                  </div>

                  {currentLinks.length === 0 ? (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                      Aucun enfant n'est encore rattaché. Utilisez le formulaire ci-dessous pour ajouter le 1er enfant.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {currentLinks.map((l, index) => {
                        const el = storage.getEleveById(l.eleve_id);
                        const cls = el ? classes.find((c) => c.id === el.classe_id) : undefined;
                        return (
                          <div
                            key={l.id}
                            className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <div>
                                <strong className="text-slate-900">{el ? `${el.nom} ${el.prenom}` : l.eleve_id}</strong>
                                <span className="text-[11px] text-emerald-700 font-bold ml-1.5">
                                  → {cls?.nom || 'Classe'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono ml-2">
                                  ({l.lien_parental})
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnlink(l.id)}
                              className="text-red-500 hover:text-red-700 text-xs font-semibold p-1 cursor-pointer"
                              title="Détacher cet enfant"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notification de succès ou d'erreur */}
                {linkModalNotice && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">{linkModalNotice}</p>
                    </div>
                  </div>
                )}

                {/* Formulaire d'ajout d'enfant */}
                <form onSubmit={handleConfirmLink} className="space-y-3.5 pt-1">
                  <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 pb-1 border-b border-slate-200">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>Ajouter un enfant à la fratrie de ce parent :</span>
                  </div>

                  {/* 1. Sélection de la classe de l'enfant */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      1. Sélectionner la classe actuelle de l'enfant *
                    </label>
                    <select
                      value={linkClasseFilter}
                      onChange={(e) => {
                        setLinkClasseFilter(e.target.value);
                        setSelectedEleveId('');
                      }}
                      className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="ALL">Toutes les classes du collège ({classes.length})</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom} ({c.niveau})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Recherche et sélection de l'apprenant */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      2. Sélectionner l'apprenant * {filteredElevesForLink.length > 0 && `(${filteredElevesForLink.length} disponible(s))`}
                    </label>
                    <input
                      type="text"
                      placeholder="Filtrer par nom ou matricule..."
                      value={eleveSearchTerm}
                      onChange={(e) => setEleveSearchTerm(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 mb-1.5"
                    />
                    <select
                      required
                      value={selectedEleveId}
                      onChange={(e) => setSelectedEleveId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Choisir l'enfant à rattacher --</option>
                      {filteredElevesForLink.map((e) => {
                        const cls = classes.find((c) => c.id === e.classe_id);
                        const isAlreadyLinked = currentLinks.some((l) => l.eleve_id === e.id);
                        return (
                          <option key={e.id} value={e.id} disabled={isAlreadyLinked}>
                            {e.nom} {e.prenom} ({cls?.nom || 'Classe'}) — Matricule: {e.matricule} {isAlreadyLinked ? '(Déjà rattaché)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 3. Lien parental */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">3. Type de lien de parenté *</label>
                    <select
                      value={lienParental}
                      onChange={(e) => setLienParental(e.target.value as LienParental)}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="PERE">Père</option>
                      <option value="MERE">Mère</option>
                      <option value="TUTEUR">Tuteur Légal / Tutrice</option>
                      <option value="AUTRE">Autre lien familial légitime</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLinkingParent(null)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Fermer / Terminer
                    </button>

                    <button
                      type="submit"
                      disabled={!selectedEleveId}
                      className={`px-5 py-2 rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer ${
                        selectedEleveId
                          ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Ajouter cet enfant</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
