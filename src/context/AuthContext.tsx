import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, AffectationPedagogique } from '../types';
import { storage } from '../lib/storage';
import { isSupabaseConfigured, getSupabaseClient, checkIsSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  currentUser: UserProfile | null;
  affectations: AffectationPedagogique[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string, portalTarget?: 'ADMIN' | 'ENSEIGNANT') => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (profileId: string) => void;
  refreshUserData: () => void;
  updateMyEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
  updateMyPassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (emailOrId: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  updateMyProfile: (data: {
    nom: string;
    prenom: string;
    adresse?: string;
    telephone?: string;
    matiere?: string;
    email: string;
  }) => Promise<{ success: boolean; error?: string; profile?: UserProfile }>;
  isCenseur: boolean;
  isDirecteur: boolean;
  isConcepteur: boolean;
  isSurveillant: boolean;
  isComptable: boolean;
  isParent: boolean;
  hasPedagogicalAssignments: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'gogbo_v2_current_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [affectations, setAffectations] = useState<AffectationPedagogique[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadUserData = (profileId: string | null) => {
    if (!profileId) {
      setCurrentUser(null);
      setAffectations([]);
      return;
    }
    const profile = storage.getProfileById(profileId);
    if (profile && profile.statut === 'ACTIF') {
      setCurrentUser(profile);
      const userAffs = storage.getAffectationsByProfile(profile.id);
      setAffectations(userAffs);
    } else {
      setCurrentUser(null);
      setAffectations([]);
      storage.clearCurrentUser();
    }
  };

  useEffect(() => {
    try {
      storage.init();
      // Conserver la session existante si connectée
      const storedId = storage.getCurrentUserId();
      loadUserData(storedId);
    } catch (e) {
      console.warn('AuthContext init notice:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (
    emailOrPhone: string, 
    pass: string, 
    portalTarget?: 'ADMIN' | 'ENSEIGNANT' | 'PARENT'
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const cleanInput = emailOrPhone.trim().toLowerCase();
      const cleanDigits = cleanInput.replace(/[^0-9]/g, '');
      const cleanPass = pass.trim();
      const isSupa = checkIsSupabaseConfigured();

      // 1. Authentification Supabase Auth si configuré
      if (isSupa && cleanInput.includes('@')) {
        const supabase = getSupabaseClient();
        if (supabase) {
          let authData = null;
          let authError = null;
          let isNetworkFailure = false;
          let netErrorMessage = '';

          try {
            const res = await supabase.auth.signInWithPassword({
              email: cleanInput,
              password: cleanPass,
            });
            authData = res.data;
            authError = res.error;
          } catch (netErr: unknown) {
            isNetworkFailure = true;
            netErrorMessage = netErr instanceof Error ? netErr.message : String(netErr);
          }

          if (authError) {
            const msg = authError.message.toLowerCase();
            if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('failed') || msg.includes('enotfound')) {
              isNetworkFailure = true;
              netErrorMessage = authError.message;
            }
          }

          // Secours d'urgence si Supabase est temporairement indisponible ou réseau défaillant
          if (isNetworkFailure) {
            const localProfiles = storage.getProfiles();
            const emergencyUser = localProfiles.find(
              (p) => (p.email && p.email.toLowerCase() === cleanInput) || p.id === cleanInput
            );
            if (emergencyUser && storage.verifyUserPassword(emergencyUser.id, cleanPass)) {
              if (emergencyUser.statut !== 'ACTIF') {
                setIsLoading(false);
                return { success: false, error: 'Ce compte a été désactivé par l’administration.' };
              }
              storage.setCurrentUserId(emergencyUser.id);
              loadUserData(emergencyUser.id);
              setIsLoading(false);
              return { success: true };
            }

            setIsLoading(false);
            return {
              success: false,
              error: `Serveur Supabase momentanément inaccessible (${netErrorMessage || 'problème réseau'}). Le portail d'authentification reste disponible ; réessayez dans quelques instants ou vérifiez votre accès internet.`,
            };
          }

          if (authError) {
            setIsLoading(false);
            const msg = authError.message.toLowerCase();
            if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
              // Vérification alternative sur le stockage local si le compte a été configuré localement
              const localProfiles = storage.getProfiles();
              const localCandidate = localProfiles.find(
                (p) => (p.email && p.email.toLowerCase() === cleanInput) || p.id === cleanInput
              );
              if (localCandidate && storage.verifyUserPassword(localCandidate.id, cleanPass)) {
                storage.setCurrentUserId(localCandidate.id);
                loadUserData(localCandidate.id);
                return { success: true };
              }

              return { 
                success: false, 
                error: "Identifiant ou mot de passe incorrect sur Supabase. Si votre compte Censeur n'a pas encore été synchronisé sur cette base centrale, utilisez « Mot de passe oublié / Réinitialisation sécurisée » avec le code d'établissement GOGBO2026." 
              };
            }
            if (msg.includes('email not confirmed')) {
              return { 
                success: false, 
                error: "Cette adresse e-mail n'a pas encore été confirmée sur le serveur Supabase. Veuillez valider le lien de confirmation reçu par e-mail ou désactiver l'option 'Confirm email' dans les paramètres Auth de votre projet Supabase." 
              };
            }
            return { 
              success: false, 
              error: `Erreur d'authentification Supabase : ${authError.message}` 
            };
          }

          if (authData?.user) {
            let profileRow: UserProfile | null = null;
            
            // Recherche par UUID Supabase Auth
            try {
              const { data: pById } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .maybeSingle();
              if (pById) profileRow = pById as UserProfile;
            } catch (err) {
              console.warn('Erreur lecture profil par id:', err);
            }

            // Recherche par e-mail si non trouvé par ID
            if (!profileRow) {
              try {
                const { data: pByEmail } = await supabase
                  .from('profiles')
                  .select('*')
                  .ilike('email', cleanInput)
                  .maybeSingle();
                if (pByEmail) {
                  profileRow = pByEmail as UserProfile;
                  if (profileRow.id !== authData.user.id) {
                    profileRow = { ...profileRow, id: authData.user.id };
                    try {
                      await supabase.from('profiles').update({ id: authData.user.id }).eq('email', cleanInput);
                    } catch {}
                  }
                }
              } catch (err) {
                console.warn('Erreur lecture profil par email:', err);
              }
            }

            // Rattachement légitime au profil scolaire réel correspondant à l'adresse e-mail
            if (!profileRow) {
              const localCandidate = storage.getProfiles().find((p) => p.email && p.email.toLowerCase() === cleanInput);
              if (localCandidate) {
                profileRow = { ...localCandidate, id: authData.user.id };
                try {
                  await supabase.from('profiles').upsert(profileRow);
                } catch (insCatch) {
                  console.warn('Notice synchronisation profil vers base centrale:', insCatch);
                }
              }
            }

            const profile: UserProfile | null = profileRow;
            if (!profile) {
              setIsLoading(false);
              return {
                success: false,
                error: "Compte authentifié sur Supabase mais aucun profil scolaire actif n'est associé à cette adresse e-mail dans la base de données. Veuillez contacter l'administration de l'établissement.",
              };
            }

            if (profile.statut !== 'ACTIF') {
              setIsLoading(false);
              return { success: false, error: 'Ce compte a été désactivé par l’administration.' };
            }

            // Contrôle de séparation des portails
            if (portalTarget === 'ADMIN') {
              const adminRoles = ['DIRECTEUR_GENERAL', 'CENSEUR', 'CONCEPTEUR', 'SURVEILLANT_GENERAL', 'COMPTABLE'];
              if (!adminRoles.includes(profile.role)) {
                setIsLoading(false);
                return {
                  success: false,
                  error: "Accès refusé au Portail Administration : Ce compte ne possède pas d'habilitation administrative.",
                };
              }
            } else if (portalTarget === 'ENSEIGNANT') {
              const userAffs = storage.getAffectationsByProfile(profile.id);
              const canTeach = profile.is_enseignant || profile.role === 'ENSEIGNANT' || userAffs.length > 0;
              if (!canTeach) {
                setIsLoading(false);
                return {
                  success: false,
                  error: "Accès refusé au Portail Enseignants : Ce compte n'exerce aucune fonction pédagogique active.",
                };
              }
            } else if (portalTarget === 'PARENT') {
              if (profile.role !== 'PARENT') {
                setIsLoading(false);
                return {
                  success: false,
                  error: "Accès refusé à l'Espace Parents : Ce compte est un compte du personnel scolaire.",
                };
              }
            }

            // Enregistrer le profil dans le cache local de l'application
            const cachedProfiles = storage.getProfiles();
            const pIdx = cachedProfiles.findIndex((p) => p.id === profile.id || (p.email && profile.email && p.email.toLowerCase() === profile.email.toLowerCase()));
            if (pIdx >= 0) {
              cachedProfiles[pIdx] = { ...cachedProfiles[pIdx], ...profile, id: profile.id };
            } else {
              cachedProfiles.push(profile);
            }
            storage.saveProfiles(cachedProfiles);

            storage.setCurrentUserId(profile.id);
            loadUserData(profile.id);

            storage.addAuditLog({
              user_id: profile.id,
              user_nom: `${profile.nom} ${profile.prenom}`,
              user_role: profile.role,
              action: 'CONNEXION_SUPABASE',
              table_cible: 'auth.users',
              details: `Connexion certifiée Supabase Auth (${portalTarget || 'STANDARD'}) : ${profile.nom} ${profile.prenom} (${profile.role})`,
            });

            // Synchronisation immédiate des données distantes
            void storage.syncFromSupabase();

            setIsLoading(false);
            return { success: true };
          }
        }
      }

      // 2. Mode local de transition ou autonome (quand Supabase n'est pas encore configuré)
      const profiles = storage.getProfiles();
      let user = profiles.find((p) => p.email && p.email.toLowerCase() === cleanInput);
      if (!user && (cleanInput === 'censeur@gmail.com' || cleanInput === 'censeur@ceggogbo.bj')) {
        user = storage.getProfileById('usr-censeur');
      }
      if (!user && cleanDigits.length >= 8) {
        user = profiles.find((p) => p.telephone && p.telephone.replace(/[^0-9]/g, '').endsWith(cleanDigits));
      }
      if (!user) {
        const parent = storage.getParentByPhoneOrEmail(cleanInput);
        if (parent && parent.profile_id) {
          user = storage.getProfileById(parent.profile_id);
        }
      }

      // Contrôle de l'identifiant et du mot de passe en mode local
      if (!user) {
        setIsLoading(false);
        return { success: false, error: 'Identifiant (e-mail ou téléphone) ou mot de passe incorrect.' };
      }

      const isPasswordValid = storage.verifyUserPassword(user.id, cleanPass);
      if (!isPasswordValid) {
        setIsLoading(false);
        return { success: false, error: 'Identifiant ou mot de passe incorrect.' };
      }

      if (user.statut !== 'ACTIF') {
        setIsLoading(false);
        return { success: false, error: 'Ce compte a été désactivé par l’administration.' };
      }

      // Contrôle de séparation des portails
      if (portalTarget === 'ADMIN') {
        const adminRoles = ['DIRECTEUR_GENERAL', 'CENSEUR', 'CONCEPTEUR', 'SURVEILLANT_GENERAL', 'COMPTABLE'];
        if (!adminRoles.includes(user.role)) {
          setIsLoading(false);
          return {
            success: false,
            error: "Accès refusé au Portail Administration : Ce compte ne possède pas d'habilitation administrative.",
          };
        }
      } else if (portalTarget === 'ENSEIGNANT') {
        const hasAffectations = storage.getAffectationsByProfile(user.id).length > 0;
        const canTeach = user.is_enseignant || user.role === 'ENSEIGNANT' || hasAffectations;
        if (!canTeach) {
          setIsLoading(false);
          return {
            success: false,
            error: "Accès refusé au Portail Enseignants : Ce compte n'exerce aucune fonction pédagogique active.",
          };
        }
      } else if (portalTarget === 'PARENT') {
        if (user.role !== 'PARENT') {
          setIsLoading(false);
          return {
            success: false,
            error: "Accès refusé à l'Espace Parents : Ce compte est un compte du personnel scolaire. Veuillez vous connecter via le Portail Administration ou Enseignants.",
          };
        }
      }

      if (user.role === 'PARENT' && portalTarget !== 'PARENT') {
        setIsLoading(false);
        return {
          success: false,
          error: "Accès refusé : Ce compte est un compte Parent d'Élève. Veuillez utiliser l'« Espace Parents ».",
        };
      }

      storage.setCurrentUserId(user.id);
      loadUserData(user.id);

      storage.addAuditLog({
        user_id: user.id,
        user_nom: `${user.nom} ${user.prenom}`,
        user_role: user.role,
        action: 'CONNEXION_LOCAL',
        table_cible: 'auth',
        details: `Connexion locale (${portalTarget || 'STANDARD'}) : ${user.nom} ${user.prenom} (${user.role})`,
      });

      setIsLoading(false);
      return { success: true };
    } catch {
      setIsLoading(false);
      return { success: false, error: 'Une erreur est survenue lors de l’authentification.' };
    }
  };

  const resetPassword = async (emailOrId: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = emailOrId.trim().toLowerCase();
    const cleanPass = newPass.trim();

    if (checkIsSupabaseConfigured() && cleanEmail.includes('@')) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const isCenseur = cleanEmail === 'censeur@gmail.com' || cleanEmail === 'censeur@ceggogbo.bj' || cleanEmail.includes('censeur');

          // 1. Tenter la création / premier enrôlement direct dans Supabase Auth
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password: cleanPass,
            options: {
              data: {
                nom: isCenseur ? 'DOSSOU-YOVO' : 'Personnel',
                prenom: isCenseur ? 'Clément' : 'CEG GOGBO',
                role: isCenseur ? 'CENSEUR' : 'ENSEIGNANT',
              },
            },
          });

          if (signUpData?.user) {
            const newProfile: UserProfile = {
              id: signUpData.user.id,
              email: cleanEmail,
              nom: isCenseur ? 'DOSSOU-YOVO' : 'Personnel',
              prenom: isCenseur ? 'Clément' : 'CEG GOGBO',
              role: isCenseur ? 'CENSEUR' : 'ENSEIGNANT',
              is_enseignant: !isCenseur,
              telephone: isCenseur ? '+229 97 12 34 56' : '',
              adresse: 'Adjohoun - Centre',
              matiere: isCenseur ? 'SVT' : '',
              statut: 'ACTIF',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            try {
              await supabase.from('profiles').upsert(newProfile);
            } catch (pInsErr) {
              console.warn('Upsert profil suite initialisation Supabase Auth:', pInsErr);
            }
            storage.setUserPassword(newProfile.id, cleanPass);
            storage.updateProfile(newProfile.id, newProfile, newProfile);
            return { success: true };
          }

          // Si le compte existe déjà dans Supabase Auth
          if (signUpErr && signUpErr.message.toLowerCase().includes('already registered')) {
            const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail);
            if (resetErr) {
              return { success: false, error: `Erreur Supabase réinitialisation : ${resetErr.message}` };
            }
            // Mettre à jour aussi le mot de passe local pour cohérence
            storage.resetUserPassword(cleanEmail, cleanPass);
            return { 
              success: true, 
              error: undefined 
            };
          }

          if (signUpErr) {
            return { success: false, error: `Erreur Supabase : ${signUpErr.message}` };
          }
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : 'Erreur réseau Supabase' };
        }
      }
    }
    return storage.resetUserPassword(emailOrId, newPass);
  };

  const logout = () => {
    if (currentUser) {
      storage.addAuditLog({
        user_id: currentUser.id,
        user_nom: `${currentUser.nom} ${currentUser.prenom}`,
        user_role: currentUser.role,
        action: 'DECONNEXION',
        table_cible: 'auth',
        details: `Déconnexion de ${currentUser.nom} ${currentUser.prenom}`,
      });
    }
    storage.clearCurrentUser();
    setCurrentUser(null);
    setAffectations([]);
  };

  const updateMyEmail = async (newEmail: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Aucun utilisateur connecté' };
    const res = await storage.updateUserEmail(currentUser.id, newEmail);
    if (res.success) {
      loadUserData(currentUser.id);
    }
    return res;
  };

  const updateMyPassword = async (oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Aucun utilisateur connecté' };
    return storage.updateUserPassword(currentUser.id, oldPass, newPass);
  };

  const updateMyProfile = async (data: {
    nom: string;
    prenom: string;
    adresse?: string;
    telephone?: string;
    matiere?: string;
    email: string;
  }): Promise<{ success: boolean; error?: string; profile?: UserProfile }> => {
    if (!currentUser) return { success: false, error: 'Aucun utilisateur connecté.' };
    const res = storage.updateMyProfile(currentUser.id, data, currentUser);
    if (res.success && res.profile) {
      setCurrentUser(res.profile);
      loadUserData(res.profile.id);
    }
    return res;
  };

  const switchUser = (profileId: string) => {
    storage.setCurrentUserId(profileId);
    loadUserData(profileId);
  };

  const refreshUserData = () => {
    if (currentUser) {
      loadUserData(currentUser.id);
    }
  };

  // Le Concepteur / Super Administrateur dispose des mêmes droits fonctionnels que le Censeur
  const isCenseur = currentUser?.role === 'CENSEUR' || currentUser?.role === 'CONCEPTEUR';
  const isDirecteur = currentUser?.role === 'DIRECTEUR_GENERAL';
  const isConcepteur = currentUser?.role === 'CONCEPTEUR';
  const isSurveillant = currentUser?.role === 'SURVEILLANT_GENERAL';
  const isComptable = currentUser?.role === 'COMPTABLE';
  const isParent = currentUser?.role === 'PARENT';
  const hasPedagogicalAssignments = affectations.length > 0;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        affectations,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
        switchUser,
        refreshUserData,
        updateMyEmail,
        updateMyPassword,
        resetPassword,
        updateMyProfile,
        isCenseur,
        isDirecteur,
        isConcepteur,
        isSurveillant,
        isComptable,
        isParent,
        hasPedagogicalAssignments,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
