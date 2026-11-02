import React, { useState } from 'react';
import { X, Lock, Check, AlertCircle } from 'lucide-react';
import { StorageManager } from '../services/storage';

interface PasswordPromptModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  requiresMotherOnly?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({
  isOpen,
  title,
  description,
  requiresMotherOnly = false,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let isValid = false;
    if (requiresMotherOnly) {
      isValid = StorageManager.verifyMotherPassword(password);
    } else {
      isValid = StorageManager.verifyAdminOrMotherPassword(password);
    }

    if (isValid) {
      setPassword('');
      onSuccess();
      onClose();
    } else {
      setError(
        requiresMotherOnly
          ? 'Onjuist Moederwachtwoord.'
          : 'Onjuist beheer- of moederwachtwoord. Probeer opnieuw.'
      );
    }
  };

  const settings = StorageManager.getSettings();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">{description}</p>

        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              {requiresMotherOnly ? 'Moederwachtwoord (Master Password)' : 'Beheerder- of Moederwachtwoord'}
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Vul wachtwoord in..."
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {settings.motherPasswordHint && (
            <p className="text-[10px] text-slate-500 italic">
              Hint: {settings.motherPasswordHint}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Verifiëren</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
