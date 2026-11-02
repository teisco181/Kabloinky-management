import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  LogIn,
  Shield,
  Key,
  Sparkles,
  Check,
  AlertCircle,
  Calendar,
  Compass,
  Users,
  Target,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { User, Role, PageId, Organization } from '../types';
import { StorageManager } from '../services/storage';

interface RegisterPageProps {
  onSuccess: (user: User) => void;
  onNavigate: (tab: PageId) => void;
  organizations: Organization[];
  initialMode?: 'register' | 'login';
  currentUser?: User | null;
  onLogout?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSuccess,
  onNavigate,
  organizations,
  initialMode = 'register',
  currentUser,
  onLogout,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<Role>('speler');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [agreeRules, setAgreeRules] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [existingUsers, setExistingUsers] = useState<User[]>(() => StorageManager.getUsers());

  // Real-time synchronization across devices
  useEffect(() => {
    const unsub = StorageManager.subscribe(() => {
      setExistingUsers(StorageManager.getUsers());
    });
    return () => unsub();
  }, []);

  const isFirstAccount = existingUsers.length === 0;

  const cleanName = username.trim();
  const previewAvatarUrl = cleanName
    ? `https://mc-heads.net/body/${encodeURIComponent(cleanName)}/160`
    : `https://mc-heads.net/body/Steve/160`;
  const previewHeadUrl = cleanName
    ? `https://mc-heads.net/avatar/${encodeURIComponent(cleanName)}/64`
    : `https://mc-heads.net/avatar/Steve/64`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!cleanName) {
      setError('Voer een geldige Minecraft gebruikersnaam in.');
      return;
    }

    if (mode === 'register') {
      if (!agreeRules) {
        setError('Je dient akkoord te gaan met de serverregels om te registreren.');
        return;
      }

      if (!password || password.length < 3) {
        setError('Kies een accountwachtwoord van minimaal 3 tekens.');
        return;
      }

      if (password !== passwordConfirm) {
        setError('De ingevoerde accountwachtwoorden komen niet overeen.');
        return;
      }

      // Check duplicate
      const duplicate = existingUsers.some(
        (u) => u.username.toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        setError(
          'Er bestaat al een account met deze Minecraft naam. Log direct in of kies een andere naam.'
        );
        return;
      }

      const result = StorageManager.registerUser(
        cleanName,
        isFirstAccount ? 'eigenaar' : role,
        isFirstAccount,
        password
      );

      // If user joined an organization upon register
      if (selectedOrgId) {
        StorageManager.addMemberToOrg(selectedOrgId, cleanName, 'lid');
      }

      setSuccessMessage(
        isFirstAccount
          ? `Welkom Oprichter! Account ${cleanName} is geregistreerd als Eigenaar.`
          : `Gefeliciteerd ${cleanName}, je account is geregistreerd!`
      );

      setTimeout(() => {
        onSuccess(result.user);
        onNavigate('home');
      }, 1200);
    } else {
      // Login mode: STRICTLY REQUIRE AND VERIFY PASSWORD!
      if (!password || !password.trim()) {
        setError('Vul het wachtwoord in van dit account om in te loggen.');
        return;
      }

      const result = StorageManager.loginUser(cleanName, password);
      if (!result.success || !result.user) {
        setError(result.error || 'Onjuist wachtwoord voor dit account.');
        return;
      }

      setSuccessMessage(`Welkom terug, ${result.user.username}!`);
      setTimeout(() => {
        onSuccess(result.user!);
        onNavigate('home');
      }, 700);
    }
  };

  const handleSelectAccountForLogin = (u: User) => {
    setUsername(u.username);
    setPassword(''); // Strictly clear password - NEVER prefill someone's password!
    setError('');
    setSuccessMessage(`Account "${u.username}" geselecteerd. Voer je wachtwoord in om in te loggen.`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-fade-in">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Kabloinky SMP Spelers Portaal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {mode === 'register' ? 'Maak je Spelers Account Aan' : 'Inloggen op het Server Portaal'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          {mode === 'register'
            ? 'Koppel je Minecraft in-game naam om toegang te krijgen tot evenementen, gilden, serverplannen en handhaving.'
            : 'Selecteer je geregistreerde Minecraft account om verder te gaan.'}
        </p>

        {/* Mode Toggle Bar */}
        <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl mt-3">
          <button
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Nieuw Account Registreren</span>
          </button>
          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'login'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Bestaand Account Inloggen</span>
          </button>
        </div>
      </div>

      {currentUser && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatarUrl || `https://mc-heads.net/avatar/${currentUser.username}/40`}
              alt={currentUser.username}
              className="w-10 h-10 rounded-lg border border-emerald-500/40"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-mono">{currentUser.username}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                  {currentUser.role}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Momenteel ingelogd. Je kunt hieronder een extra account registreren of wisselen.
              </span>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-slate-800 hover:bg-red-950/40 hover:text-red-300 text-slate-300 border border-slate-700 hover:border-red-800 text-xs font-semibold rounded-lg transition-colors self-start sm:self-auto"
            >
              Uitloggen
            </button>
          )}
        </div>
      )}

      {/* Main Form Split Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Registration / Login Form (7 cols) */}
        <div className="lg:col-span-7 bg-[#131923] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* First Account Banner if applicable */}
          {isFirstAccount && mode === 'register' && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl space-y-2 text-emerald-200 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Allereerste Account op Kabloinky SMP!</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                Omdat er nog geen accounts bestaan, word je automatisch aangesteld als{' '}
                <strong className="text-white">Eigenaar</strong>.
                <span className="block mt-1 text-emerald-400 font-medium">
                  💡 Let op: Het Moederwachtwoord kan uitsluitend worden gewijzigd in de Instellingen pagina.
                </span>
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Fast Player Selector if in login mode (ONLY selects username, NEVER logs in directly!) */}
          {mode === 'login' && existingUsers.length > 0 && (
            <div className="space-y-3 pb-4 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Selecteer jouw account ({existingUsers.length})
                </span>
                <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                  <Key className="w-3 h-3" /> Wachtwoord altijd vereist
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Klik op jouw Minecraft naam om deze in te vullen. Voer daarna je geheime wachtwoord in om in te loggen.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {existingUsers.map((u) => {
                  const isSelected = username.trim().toLowerCase() === u.username.toLowerCase();
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectAccountForLogin(u)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={u.avatarUrl || `https://mc-heads.net/avatar/${u.username}/32`}
                        alt={u.username}
                        className="w-8 h-8 rounded border border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white block truncate font-mono">
                            {u.username}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </div>
                        <span className="text-[10px] text-emerald-400 capitalize block font-mono">
                          Rol: {u.role}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Minecraft Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 block">
                Minecraft Gebruikersnaam (In-Game Name)
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="bijv. Steve_NL of Alex"
                  required
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                />
                <img
                  src={previewHeadUrl}
                  alt="Skin Preview"
                  className="w-10 h-10 rounded-lg border border-slate-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Je skin en avatar worden automatisch geladen vanaf Minecraft Mojang servers.
              </p>
            </div>

            {/* Account Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 block">
                    {mode === 'register' ? 'Wachtwoord Kiezen' : 'Account Wachtwoord'}
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {mode === 'login' ? 'Vereist' : 'Min. 3 tekens'}
                  </span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === 'register'
                      ? 'Kies een geheim wachtwoord...'
                      : 'Voer je geheime accountwachtwoord in...'
                  }
                  required
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    Bevestig Wachtwoord
                  </label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Herhaal wachtwoord..."
                    required={mode === 'register'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Register Options: Role & Organization */}
            {mode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    {isFirstAccount ? 'Account Rol (Automatisch Eigenaar)' : 'Gewenste Rol'}
                  </label>
                  {isFirstAccount ? (
                    <div className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold font-mono flex items-center justify-between">
                      <span>Eigenaar (Oprichter)</span>
                      <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">Vaste Rol</span>
                    </div>
                  ) : (
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="speler">Speler (Standaard lid)</option>
                      <option value="vip">VIP (Donateur)</option>
                      <option value="moderator">Moderator (Handhaving)</option>
                      <option value="beheerder">Beheerder (Admin)</option>
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    Aansluiten bij Gilde (Optioneel)
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Geen (Later kiezen)</option>
                    {organizations
                      .filter((o) => o.approved)
                      .map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} {org.tag}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* Rules agreement checkbox */}
            {mode === 'register' && (
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agree-rules"
                  checked={agreeRules}
                  onChange={(e) => setAgreeRules(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="agree-rules" className="text-xs text-slate-300 cursor-pointer">
                  Ik ga akkoord met de serverregels van <strong>Kabloinky SMP</strong> (geen griefing,
                  geen X-Ray cheats en respectvol gedrag).
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {isFirstAccount
                      ? 'Account Registreren als Eigenaar'
                      : 'Account Registreren'}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Inloggen op Portaal</span>
                </>
              )}
            </button>
          </form>

          {/* Bottom helper switcher */}
          <div className="text-center pt-2 text-xs text-slate-400 border-t border-slate-800">
            {mode === 'register' ? (
              <span>
                Heb je al een account geregistreerd?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Log hier in
                </button>
              </span>
            ) : (
              <span>
                Nog geen account op Kabloinky SMP?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Registreer je hier gratis
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Right Side: 3D Character Preview & Server Perks (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Minecraft Character Showcase Card */}
          <div className="bg-[#131923] border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
              Live Minecraft Karakter
            </span>

            <div className="h-48 flex items-center justify-center py-2">
              <img
                src={previewAvatarUrl}
                alt="Minecraft Skin Full Body"
                className="max-h-full drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)] object-contain transition-transform hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-sm font-bold text-white font-mono">
                {cleanName || 'Steve'}
              </div>
              <span className="text-xs text-slate-400">
                {cleanName ? 'Mojang Skin Gekoppeld' : 'Standaard Skin Preview'}
              </span>
            </div>
          </div>

          {/* Why Register Perks Card */}
          <div className="bg-[#131923] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Waarom registreren op Kabloinky SMP?</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Evenementen Aanvragen &amp; Meedoen</strong>
                  Meld je aan voor dragon raids, bouwwedstrijden en ontvang pushmeldingen.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Organisaties &amp; Factions</strong>
                  Richt je eigen gilde op, beheer je ledenlijst en claim een hoofdkwartier.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Plannen &amp; Privé Notities</strong>
                  Sla geheime coördinaten veilig op of deel openbare projecten met chatroom.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Bounty Board &amp; Premiejacht</strong>
                  Zet diamantenpremies op rivalen of claim beloningen voor voltooide opdrachten.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
