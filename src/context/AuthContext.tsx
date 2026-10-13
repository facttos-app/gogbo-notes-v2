import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, AffectationPedagogique } from '../types';
import { storage } from '../lib/storage';
import { isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';

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

      // 1. Authentification Supabase Auth si configuré
      if (isSupabaseConfigured && cleanInput.includes('@')) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: cleanInput,
            password: cleanPass,
          });

          if (authError) {
            setIsLoading(false);
            const msg = authError.message.toLowerCase();
            if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
              return { 
                success: false, 
                error: "Identifiant ou mot de passe incorrect sur le serveur central Supabase." 
              };
            }
            if (msg.includes('email not confirmed')) {
              return { 
                success: false, 
                error: "Cette adresse e-mail n'a pas encore été confirmée sur le serveur Supabase." 
              };
            }
            return { 
              success: false, 
              error: `Erreur d'authentification Supabase : ${authError.message}` 
            };
          }

          if (authData?.user) {
            // Récupérer le profil scolaire lié depuis public.profiles
            const { data: profileRow, error: pErr } = await supabase
              .from('profiles')
              .select('*')
              .or(`id.eq.${authData.user.id},email.eq.${cleanInput}`)
              .maybeSingle();

            if (pErr) {
              console.warn('Erreur lecture profil Supabase:', pErr);
            }

            let profile: UserProfile | null = profileRow as UserProfile | null;
            if (!profile) {
              // Vérifier dans le stockage local pour rattrapage
              profile = storage.getProfiles().find((p) => p.email.toLowerCase() === cleanInput) || null;
            }

            if (!profile) {
              setIsLoading(false);
              return {
                success: false,
                error: "Compte authentifié sur Supabase mais aucun profil scolaire actif rattaché dans la table 'profiles'.",
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

            setIsLoading(false);
            return { success: true };
          }
        }
      }

      // 2. Mode local de transition (quand Supabase n'est pas configuré dans l'environnement)
      const profiles = storage.getProfiles();
      let user = profiles.find((p) => p.email.toLowerCase() === cleanInput);
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
    if (isSupabaseConfigured && cleanEmail.includes('@')) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
          if (error) {
            return { success: false, error: `Erreur Supabase réinitialisation : ${error.message}` };
          }
          return { 
            success: true, 
            error: undefined 
          };
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
