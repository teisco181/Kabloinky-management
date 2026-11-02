import React, { useState, useEffect } from 'react';
import { X, Shield, Sparkles, Check, AlertCircle, Key } from 'lucide-react';
import { User, Role } from '../types';
import { StorageManager } from '../services/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('speler');
  const [error, setError] = useState('');

  const [existingUsers, setExistingUsers] = useState<User[]>(() => StorageManager.getUsers());

  useEffect(() => {
    const unsub = StorageManager.subscribe(() => {
      setExistingUsers(StorageManager.getUsers());
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const isFirstAccount = existingUsers.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = username.trim();
    if (!cleanName) {
      setError('Vul een geldige Minecraft gebruikersnaam in.');
      return;
    }

    if (isRegister) {
      if (!password || password.length < 3) {
        setError('Kies een accountwachtwoord van minimaal 3 tekens.');
        return;
      }

      // Check duplicate
      const exists = existingUsers.some((u) => u.username.toLowerCase() === cleanName.toLowerCase());
      if (exists) {
        setError('Er bestaat al een account met deze Minecraft gebruikersnaam.');
        return;
      }

      const result = StorageManager.registerUser(
        cleanName,
        isFirstAccount ? 'eigenaar' : role,
        isFirstAccount,
        password
      );

      onSuccess(result.user);
      onClose();
    } else {
      // Login: REQUIRE AND VERIFY PASSWORD!
      if (!password || !password.trim()) {
        setError('Vul het wachtwoord in van dit account om in te loggen.');
        return;
      }

      const result = StorageManager.loginUser(cleanName, password);
      if (!result.success || !result.user) {
        setError(result.error || 'Onjuist wachtwoord voor dit account.');
        return;
      }

      onSuccess(result.user);
      onClose();
    }
  };

  const handleSelectExistingUser = (u: User) => {
    setUsername(u.username);
    setPassword(''); // Strictly clear password - NEVER prefill someone's password!
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#131923] border border-slate-700/80 rounded-xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* First Account Ever Banner */}
        {isFirstAccount && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-200 text-xs leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Eerste Account op de Server!</span>
              Omdat dit het allereerste account ooit is, word je automatisch <strong>Eigenaar</strong>.
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-white">
            {isFirstAccount
              ? 'Eerste Account Aanmaken'
              : isRegister
              ? 'Nieuw Account Registreren'
              : 'Inloggen op Kabloinky SMP'}
          </h2>
        </div>

        <p className="text-xs text-slate-400 mb-5">
          {isFirstAccount
            ? 'Stel je Minecraft in-game naam en een geheim accountwachtwoord in.'
            : isRegister
            ? 'Maak een nieuw account aan gekoppeld aan je Minecraft spelersnaam en een geheim wachtwoord.'
            : 'Selecteer je account of vul je Minecraft naam en wachtwoord in.'}
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Users Fast Selector (ONLY sets username, never bypasses password!) */}
        {!isFirstAccount && !isRegister && existingUsers.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Bestaande Accounts ({existingUsers.length})
              </label>
              <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                <Key className="w-3 h-3" /> Wachtwoord vereist
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {existingUsers.map((u) => {
                const isSelected = username.trim().toLowerCase() === u.username.toLowerCase();
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectExistingUser(u)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                        : 'bg-slate-800/60 hover:bg-slate-700/80 border-slate-700/60'
                    }`}
                  >
                    <img
                      src={u.avatarUrl || `https://mc-heads.net/avatar/${u.username}/24`}
                      alt={u.username}
                      className="w-6 h-6 rounded"
                      referrerPolicy="no-referrer"
                    />
                    <div className="truncate flex-1">
                      <span className="text-xs font-semibold text-white block truncate">{u.username}</span>
                      <span className="text-[10px] text-emerald-400 capitalize block">{u.role}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-[#131923] text-slate-500">of vul handmatig in</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Minecraft Gebruikersnaam
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="bijv. Steve_NL"
                required
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
              {username.trim() && (
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(username.trim())}/36`}
                  alt="Avatar"
                  className="w-9 h-9 rounded border border-slate-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {isRegister ? 'Geheim Account Wachtwoord' : 'Account Wachtwoord'}
              </label>
              <span className="text-[10px] font-mono text-emerald-400">
                {isRegister ? 'Min. 3 tekens' : 'Verplicht'}
              </span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'Kies een wachtwoord...' : 'Voer je wachtwoord in...'}
              required
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Registration role pick */}
          {isRegister && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                {isFirstAccount ? 'Account Rol (Automatisch Eigenaar)' : 'Gewenste Rol'}
              </label>
              {isFirstAccount ? (
                <div className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-emerald-400 font-bold font-mono">
                  Eigenaar (Oprichter)
                </div>
              ) : (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="speler">Speler (Standaard serverlid)</option>
                  <option value="vip">VIP (Donateur / Trouw lid)</option>
                  <option value="moderator">Moderator (Handhaving & Strafblad)</option>
                  <option value="beheerder">Beheerder (Admin & Evenementengoedkeuring)</option>
                </select>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>
              {isRegister
                ? isFirstAccount
                  ? 'Account Registreren als Eigenaar'
                  : 'Account Registreren'
                : 'Inloggen met Wachtwoord'}
            </span>
          </button>
        </form>

        {!isFirstAccount && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setPassword('');
              }}
              className="text-xs text-emerald-400 hover:underline"
            >
              {isRegister
                ? 'Heb je al een account? Log hier in'
                : 'Nog geen account? Maak een nieuw account aan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
