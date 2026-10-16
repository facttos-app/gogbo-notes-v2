import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordFieldProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoComplete?: string;
  helpText?: string;
}

/**
 * Composant de saisie de mot de passe sécurisé
 * Conforme à l'Exigence 1 de GOGBO NOTES V2 :
 * - Masqué par défaut (type="password")
 * - Icône 👁 permettant d'afficher/masquer temporairement la saisie
 * - Ne stocke ni n'expose jamais les mots de passe de tiers
 */
export const PasswordField: React.FC<PasswordFieldProps> = ({
  id = 'password-input',
  value,
  onChange,
  placeholder = '••••••••',
  label = 'Mot de passe',
  required = false,
  disabled = false,
  className = '',
  autoComplete = 'current-password',
  helpText,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-slate-800 font-bold mb-1.5 text-xs sm:text-sm">
          {label} {required && <span className="text-red-600 font-black">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
          <Lock className="w-4 h-4" />
        </div>

        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className="w-full pl-9 pr-11 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white text-slate-900 placeholder:text-slate-500 font-medium disabled:bg-slate-100 disabled:text-slate-500 transition-colors shadow-2xs"
        />

        <button
          type="button"
          id={`${id}-toggle-btn`}
          onClick={toggleVisibility}
          disabled={disabled}
          title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute inset-y-0 right-0 pr-3.5 pl-2 flex items-center text-slate-500 hover:text-emerald-700 focus:outline-none transition-colors cursor-pointer"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-emerald-700" />
          ) : (
            <Eye className="w-4 h-4 text-slate-500 hover:text-slate-700" />
          )}
        </button>
      </div>

      {helpText && <p className="text-[11px] text-slate-600 mt-1 font-medium">{helpText}</p>}
    </div>
  );
};
