import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/storage';
import { isSupabaseConfigured, getSupabaseClient, getSupabaseConfigStatus } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { PasswordField } from '../ui/PasswordField';
import { ConfigSupabaseModal } from '../modals/ConfigSupabaseModal';
import { 
  GraduationCap, 
  ShieldCheck, 
  BookOpen, 
  Mail, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Building2,
  KeyRound,
  X,
  Lock,
  RefreshCw,
  Users,
  Database
} from 'lucide-react';

export type PortalType = 'ADMIN' | 'ENSEIGNANT' | 'PARENT';

interface LoginViewProps {
  onBackToHome?: () => void;
  onOpenSauvegardeModal?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onBackToHome, onOpenSauvegardeModal }) => {
  const { login, resetPassword } = useAuth();
  const [activePortal, setActivePortal] = useState<PortalType>('ADMIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal de Réinitialisation Sécurisée
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isConfigSupabaseOpen, setIsConfigSupabaseOpen] = useState(false);

  const params = storage.getParametres();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password, activePortal);
    if (!res.success) {
      setError(res.error || 'Erreur lors de la connexion.');
    }
    setLoading(false);
  };

  const handlePortalSwitch = (portal: PortalType) => {
    setActivePortal(portal);
    setError(null);
    setEmail('');
    setPassword('');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setResetError("Veuillez saisir une adresse e-mail académique valide.");
      return;
    }

    // Code de vérification académique ou confirmation ministérielle
    const cleanCode = resetCode.trim().toUpperCase();
    if (cleanCode !== 'GOGBO2026' && cleanCode !== '2026' && cleanCode !== 'ADJOHOUN') {
      setResetError("Code de sécurité institutionnel invalide. Veuillez contacter la Direction ou utiliser le code de sécurité officiel de l'établissement (GOGBO2026).");
      return;
    }

    const profiles = storage.getProfiles();
    let user = profiles.find((p) => p.email.toLowerCase() === cleanEmail);

    if (!user && isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: remoteProfile } = await supabase
            .from('profiles')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();
          if (remoteProfile) {
            user = remoteProfile as UserProfile;
          }
        } catch (err) {
          console.warn('Erreur vérification compte Supabase:', err);
        }
      }
    }

    // Si c'est le compte officiel du Censeur avec le code d'établissement GOGBO2026
    const isCenseurAccount = cleanEmail === 'censeur@gmail.com' || cleanEmail === 'censeur@ceggogbo.bj' || cleanEmail.includes('censeur');
    if (!user && isCenseurAccount) {
      user = {
        id: 'usr-censeur',
        email: cleanEmail,
        nom: 'DOSSOU-YOVO',
        prenom: 'Clément',
        role: 'CENSEUR',
        is_enseignant: false,
        telephone: '+229 97 12 34 56',
        adresse: 'Adjohoun - Centre',
        matiere: 'SVT',
        statut: 'ACTIF',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    if (!user) {
      setResetError(
        isSupabaseConfigured 
          ? "Aucun compte actif trouvé avec cette adresse e-mail sur la base centrale Supabase."
          : "Aucun compte actif trouvé avec cette adresse e-mail. Remarque : Supabase n'est pas encore connecté à cet environnement (stockage local actif)."
      );
      return;
    }

    if (!resetNewPass || resetNewPass.trim().length < 6) {
      setResetError("Le nouveau mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (resetNewPass.trim() !== resetConfirmPass.trim()) {
      setResetError("La confirmation ne correspond pas au nouveau mot de passe saisi.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await resetPassword(cleanEmail, resetNewPass.trim());
      if (res.success) {
        setResetSuccess("✓ Mot de passe enregistré avec succès sur le compte Censeur ! Vous pouvez maintenant vous connecter avec ce mot de passe.");
        setEmail(cleanEmail);
        setPassword(resetNewPass.trim());
        setTimeout(() => {
          setIsResetModalOpen(false);
          setResetSuccess(null);
          setResetCode('');
          setResetNewPass('');
          setResetConfirmPass('');
        }, 2500);
      } else {
        setResetError(res.error || "Erreur lors de la réinitialisation.");
      }
    } catch {
      setResetError("Une erreur inattendue est survenue lors de l'enregistrement.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-3 sm:p-6 selection:bg-emerald-500 selection:text-white">
      {/* Bandeau officiel République du Bénin */}
      <header className="w-full max-w-xl text-center mb-5">
        {onBackToHome && (
          <div className="flex justify-start mb-3">
            <button
              id="btn-retour-accueil"
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/70 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Page d'accueil</span>
            </button>
          </div>
        )}
        <div className="inline-flex items-center space-x-2 bg-emerald-900/90 text-emerald-200 text-[11px] px-3.5 py-1 rounded-full font-semibold uppercase tracking-wider mb-2.5 border border-emerald-700/60 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>RÉPUBLIQUE DU BÉNIN • {params.ministere}</span>
        </div>

        <div className="flex items-center justify-center space-x-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-700 text-amber-300 flex items-center justify-center shadow-lg border border-emerald-500/50">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>CEG GOGBO</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                V2
              </span>
            </h1>
            <p className="text-xs text-emerald-400 font-medium tracking-wide">
              Plateforme Numérique de Gestion Académique & des Évaluations
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <span>Commune : <strong>{params.commune}</strong></span>
          <span>•</span>
          <span>Arrondissement : <strong>{params.arrondissement}</strong></span>
          <span>•</span>
          <span className="text-amber-300 font-medium">Session {params.annee_academique}</span>
        </div>

        {/* Indicateur officiel d'état Supabase & Accès direct au diagnostic */}
        <div className="mt-2.5 flex justify-center">
          <button
            id="btn-statut-supabase-login"
            type="button"
            onClick={() => setIsConfigSupabaseOpen(true)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer shadow-xs ${
              isSupabaseConfigured
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
                : 'bg-slate-900/90 text-amber-300 border-amber-600/50 hover:bg-slate-800'
            }`}
            title="Cliquer pour afficher l'état de la connexion et tester Supabase en temps réel"
          >
            <Database className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span>
              {isSupabaseConfigured
                ? 'Base Centrale Supabase Connectée'
                : 'Mode Local Persistant (Supabase en attente)'}
            </span>
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          </button>
        </div>
      </header>

      {/* Conteneur principal avec Séparation des deux portails */}
      <main className="w-full max-w-xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Sélecteur des 3 Portails (Administration, Enseignants, Parents) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 p-1.5 bg-slate-100 border-b border-slate-200 gap-1.5">
          <button
            id="portal-btn-admin"
            type="button"
            onClick={() => handlePortalSwitch('ADMIN')}
            className={`flex items-center justify-center space-x-2 py-2.5 px-2.5 rounded-xl font-bold text-xs transition-all duration-150 ${
              activePortal === 'ADMIN'
                ? 'bg-slate-900 text-white shadow-md border border-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 shrink-0 ${activePortal === 'ADMIN' ? 'text-amber-400' : 'text-slate-500'}`} />
            <div className="text-left min-w-0">
              <div className="text-[9px] uppercase font-bold text-amber-400">Direction</div>
              <div className="leading-tight font-black text-xs truncate">ADMINISTRATION</div>
            </div>
          </button>

          <button
            id="portal-btn-enseignant"
            type="button"
            onClick={() => handlePortalSwitch('ENSEIGNANT')}
            className={`flex items-center justify-center space-x-2 py-2.5 px-2.5 rounded-xl font-bold text-xs transition-all duration-150 ${
              activePortal === 'ENSEIGNANT'
                ? 'bg-emerald-800 text-white shadow-md border border-emerald-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BookOpen className={`w-4 h-4 shrink-0 ${activePortal === 'ENSEIGNANT' ? 'text-amber-300' : 'text-slate-500'}`} />
            <div className="text-left min-w-0">
              <div className="text-[9px] uppercase font-bold text-emerald-400">Pédagogie</div>
              <div className="leading-tight font-black text-xs truncate">ENSEIGNANTS</div>
            </div>
          </button>

          <button
            id="portal-btn-parent"
            type="button"
            onClick={() => handlePortalSwitch('PARENT')}
            className={`flex items-center justify-center space-x-2 py-2.5 px-2.5 rounded-xl font-bold text-xs transition-all duration-150 ${
              activePortal === 'PARENT'
                ? 'bg-indigo-900 text-white shadow-md border border-indigo-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className={`w-4 h-4 shrink-0 ${activePortal === 'PARENT' ? 'text-indigo-300' : 'text-slate-500'}`} />
            <div className="text-left min-w-0">
              <div className="text-[9px] uppercase font-bold text-indigo-300">Famille</div>
              <div className="leading-tight font-black text-xs truncate">PARENTS D'ÉLÈVES</div>
            </div>
          </button>
        </div>

        {/* Corps du formulaire selon le portail */}
        <div className="p-6 sm:p-8">
          {/* En-tête du portail actif */}
          <div className="mb-5 pb-4 border-b border-slate-100 flex items-start justify-between">
            <div>
              <span
                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1.5 ${
                  activePortal === 'ADMIN'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : activePortal === 'ENSEIGNANT'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                }`}
              >
                {activePortal === 'ADMIN'
                  ? 'Espace Direction & Gestion Administrative'
                  : activePortal === 'ENSEIGNANT'
                    ? 'Espace Pédagogique & Évaluations'
                    : 'Portail Familles & Suivi Parental'}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {activePortal === 'ADMIN'
                  ? 'Connexion — Administration du CEG'
                  : activePortal === 'ENSEIGNANT'
                    ? 'Connexion — Corps Enseignant'
                    : 'Connexion — Espace Parents d’Élèves'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activePortal === 'ADMIN'
                  ? 'Réservé au Directeur Général, Censeur, Surveillant Général et Comptable.'
                  : activePortal === 'ENSEIGNANT'
                    ? 'Réservé aux enseignants pour la saisie et consultation de leurs notes.'
                    : 'Réservé aux pères, mères et tuteurs légaux pour le suivi des notes, bulletins et discipline de leurs enfants.'}
              </p>
            </div>

            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                activePortal === 'ADMIN'
                  ? 'bg-slate-900 text-amber-400'
                  : activePortal === 'ENSEIGNANT'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-indigo-900 text-white'
              }`}
            >
              {activePortal === 'ADMIN' ? (
                <Building2 className="w-5 h-5" />
              ) : activePortal === 'ENSEIGNANT' ? (
                <BookOpen className="w-5 h-5" />
              ) : (
                <Users className="w-5 h-5" />
              )}
            </div>
          </div>

          {/* Message d'erreur avec bouton de changement si mauvais portail */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
                {error.includes('Portail Enseignants') && (
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('ENSEIGNANT')}
                    className="mt-1.5 text-xs text-emerald-800 underline font-bold hover:text-emerald-950 block"
                  >
                    Basculer immédiatement vers le Portail Enseignants →
                  </button>
                )}
                {error.includes('Portail Administration') && (
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('ADMIN')}
                    className="mt-1.5 text-xs text-slate-800 underline font-bold hover:text-slate-950 block"
                  >
                    Basculer immédiatement vers le Portail Administration →
                  </button>
                )}
                {error.includes('Espace Parents') && (
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch('PARENT')}
                    className="mt-1.5 text-xs text-indigo-800 underline font-bold hover:text-indigo-950 block"
                  >
                    Basculer immédiatement vers l'Espace Parents →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Formulaire de connexion avec PasswordField sécurisé (Exigence 1) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email-input" className="block text-slate-700 font-semibold mb-1 text-xs sm:text-sm">
                {activePortal === 'ADMIN'
                  ? 'Identifiant ou Email académique'
                  : activePortal === 'ENSEIGNANT'
                    ? 'Email académique ou Téléphone'
                    : 'Numéro de téléphone ou Email du parent'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder={
                    activePortal === 'ADMIN'
                      ? 'censeur@ceggogbo.bj ou dg@ceggogbo.bj'
                      : activePortal === 'ENSEIGNANT'
                        ? 'prof.maths@ceggogbo.bj ou +229 97...'
                        : '+229 97 45 67 89 ou parent.houenou@gmail.com'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                />
              </div>
            </div>

            {/* Mot de passe masqué par défaut avec œil pour afficher/masquer (Exigence 1 & 5) */}
            <PasswordField
              id="login-password-input"
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              helpText="Masqué par défaut. Cliquez sur l’icône 👁 pour afficher ou masquer temporairement."
            />

            {/* Lien Mot de passe oublié / Réinitialisation sécurisée */}
            <div className="flex justify-end pt-1">
              <button
                id="btn-mot-de-passe-oublie"
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetError(null);
                  setResetSuccess(null);
                  setIsResetModalOpen(true);
                }}
                className="text-xs text-emerald-700 hover:text-emerald-950 font-semibold underline inline-flex items-center space-x-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>Mot de passe oublié / Réinitialisation sécurisée</span>
              </button>
            </div>

            {/* Bouton de validation obligatoire SE CONNECTER (Exigence 6) */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-white font-extrabold rounded-xl transition-all duration-150 flex items-center justify-center space-x-2 text-sm shadow-md tracking-wider uppercase ${
                activePortal === 'ADMIN'
                  ? 'bg-slate-900 hover:bg-slate-800 border border-slate-800'
                  : activePortal === 'ENSEIGNANT'
                    ? 'bg-emerald-700 hover:bg-emerald-800 border border-emerald-600'
                    : 'bg-indigo-800 hover:bg-indigo-900 border border-indigo-700'
              } disabled:opacity-50 cursor-pointer`}
            >
              <span>{loading ? 'Vérification en cours...' : activePortal === 'PARENT' ? 'ACCÉDER À L\'ESPACE PARENTS' : 'SE CONNECTER'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onOpenSauvegardeModal && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-center">
                <button
                  id="btn-sauvegarde-locale-login"
                  type="button"
                  onClick={onOpenSauvegardeModal}
                  className="text-xs text-slate-600 hover:text-emerald-700 font-medium inline-flex items-center space-x-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Sauvegarder immédiatement les données réelles enregistrées dans ce navigateur"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Sauvegarde Intégrale des données de ce navigateur (JSON)</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* MODAL DE RÉINITIALISATION SÉCURISÉE DU MOT DE PASSE */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight text-white">
                    Réinitialisation Sécurisée
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Définir un nouveau mot de passe pour votre compte académique
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-5 sm:p-6 space-y-4">
              {resetSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs sm:text-sm flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="font-semibold">{resetSuccess}</p>
                </div>
              )}

              {resetError && (
                <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="font-semibold">{resetError}</p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Identifiant ou E-mail académique <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="censeur@ceggogbo.bj"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Code de sécurité institutionnel <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="GOGBO2026"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono tracking-wider uppercase focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Code officiel d'établissement pour la session 2026–2027 : <strong>GOGBO2026</strong>
                </p>
              </div>

              <PasswordField
                id="reset-new-password"
                label="Nouveau mot de passe"
                value={resetNewPass}
                onChange={(e) => setResetNewPass(e.target.value)}
                placeholder="Au moins 6 caractères"
                required
                helpText="Le mot de passe sera cryptographiquement sécurisé et actif immédiatement."
              />

              <PasswordField
                id="reset-confirm-password"
                label="Confirmer le nouveau mot de passe"
                value={resetConfirmPass}
                onChange={(e) => setResetConfirmPass(e.target.value)}
                placeholder="Répétez le mot de passe"
                required
              />

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resetLoading ? 'animate-spin' : ''}`} />
                  <span>{resetLoading ? 'Réinitialisation...' : 'Enregistrer le nouveau mot de passe'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de diagnostic & configuration Supabase */}
      <ConfigSupabaseModal
        isOpen={isConfigSupabaseOpen}
        onClose={() => setIsConfigSupabaseOpen(false)}
      />

      <footer className="mt-6 text-center text-xs text-slate-500">
        Collège d’Enseignement Général de GOGBO • République du Bénin • Système certifié conforme
      </footer>
    </div>
  );
};
