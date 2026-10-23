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
    let cancelled = false;
    const boot = async () => {
      try {
        storage.init();
        if (checkIsSupabaseConfigured()) {
          // La session est restaurée uniquement depuis Supabase Auth ; aucune session locale n'est crue.
          const supabase = getSupabaseClient();
          const res = supabase ? await supabase.auth.getSession() : null;
          const uid = res?.data?.session?.user?.id ?? null;
          if (uid) {
            await storage.syncFromSupabase();
            if (!cancelled) {
              storage.setCurrentUserId(uid);
              loadUserData(uid);
            }
          } else {
            storage.clearCurrentUser();
          }
        } else {
          storage.clearCurrentUser();
        }
      } catch (e) {
        console.warn('AuthContext init notice:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
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

          if (isNetworkFailure) {
            setIsLoading(false);
            return {
              success: false,
              error: `Serveur inaccessible (${netErrorMessage || 'problème réseau'}). Vérifiez votre connexion internet puis réessayez dans quelques instants.`,
            };
          }

          if (authError) {
            setIsLoading(false);
            const msg = authError.message.toLowerCase();
            if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
              return {
                success: false,
                error: 'Identifiant ou mot de passe incorrect. En cas d’oubli, contactez l’administration de l’établissement.',
              };
            }
            if (msg.includes('email not confirmed')) {
              return { 
                success: false, 
                error: "Ce compte n'est pas encore activé. Contactez l'administration de l'établissement." 
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

            // Chargement des données réelles depuis la base centrale avant les contrôles d'accès
            await storage.syncFromSupabase();

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

      // Mode local supprimé : la connexion exige la base centrale Supabase.
      setIsLoading(false);
      if (!isSupa) {
        return {
          success: false,
          error: 'Configuration Supabase manquante sur ce déploiement (variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY). Contactez l’administrateur technique.',
        };
      }
      return { success: false, error: 'Identifiant (adresse e-mail) ou mot de passe incorrect.' };
    } catch {
      setIsLoading(false);
      return { success: false, error: 'Une erreur est survenue lors de l’authentification.' };
    }
  };

  // Réinitialisation en libre-service désactivée : elle permettait de créer des comptes et des profils
  // depuis le navigateur. Le mot de passe est réinitialisé par l'administration.
  const resetPassword = async (_emailOrId: string, _newPass: string): Promise<{ success: boolean; error?: string }> => {
    return {
      success: false,
      error: 'La réinitialisation en libre-service est désactivée. Contactez l’administration du CEG GOGBO pour réinitialiser votre mot de passe.',
    };
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
    void getSupabaseClient()?.auth.signOut();
    storage.clearCurrentUser();
    storage.clearLocalCache();
    setCurrentUser(null);
    setAffectations([]);
  };

  const updateMyEmail = async (newEmail: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Aucun utilisateur connecté' };
    if (checkIsSupabaseConfigured()) {
      return { success: false, error: 'Le changement de l’identifiant de connexion est réservé à l’administration.' };
    }
    const res = await storage.updateUserEmail(currentUser.id, newEmail);
    if (res.success) {
      loadUserData(currentUser.id);
    }
    return res;
  };

  const updateMyPassword = async (oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Aucun utilisateur connecté' };
    const supabase = getSupabaseClient();
    if (!checkIsSupabaseConfigured() || !supabase || !currentUser.email) {
      return { success: false, error: 'Configuration Supabase manquante.' };
    }
    if (newPass.trim().length < 8) {
      return { success: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' };
    }
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: oldPass.trim(),
    });
    if (reAuthError) return { success: false, error: 'Ancien mot de passe incorrect.' };
    const { error: updError } = await supabase.auth.updateUser({ password: newPass.trim() });
    if (updError) return { success: false, error: `Erreur : ${updError.message}` };
    return { success: true };
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
    if (res.success && res.profile && checkIsSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        // L'e-mail de connexion et le rôle ne sont jamais modifiés depuis le navigateur.
        const { error: pErr } = await supabase
          .from('profiles')
          .update({
            nom: data.nom,
            prenom: data.prenom,
            adresse: data.adresse ?? null,
            telephone: data.telephone ?? null,
            matiere: data.matiere ?? null,
          })
          .eq('id', currentUser.id);
        if (pErr) return { success: false, error: `Enregistrement impossible : ${pErr.message}` };
      }
    }
    if (res.success && res.profile) {
      setCurrentUser(res.profile);
      loadUserData(res.profile.id);
    }
    return res;
  };

  const switchUser = (profileId: string) => {
    // Désactivé en production : on ne change jamais d'identité sans nouvelle authentification.
    if (checkIsSupabaseConfigured()) return;
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
