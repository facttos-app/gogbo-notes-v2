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

      // Tentative Supabase Auth si configuré
      if (isSupabaseConfigured && cleanInput.includes('@')) {
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            await supabase.auth.signInWithPassword({
              email: cleanInput,
              password: cleanPass,
            });
          } catch (e) {
            console.warn('Supabase Auth signIn notice:', e);
          }
        }
      }

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

      // 1. Vérification de l'existence de l'identifiant et du mot de passe
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

      // 2. Contrôle de séparation des portails (Exigences officielles)
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

      // Interdire l'accès des comptes parents aux portails du personnel
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
        action: 'CONNEXION',
        table_cible: 'auth',
        details: `Connexion réussie via Portail ${portalTarget || 'STANDARD'} : ${user.nom} ${user.prenom} (${user.role})`,
      });

      setIsLoading(false);
      return { success: true };
    } catch {
      setIsLoading(false);
      return { success: false, error: 'Une erreur est survenue lors de l’authentification.' };
    }
  };

  const resetPassword = async (emailOrId: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
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
