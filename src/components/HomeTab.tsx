import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Unlock,
  ExternalLink,
  Calendar,
  Target,
  ShieldCheck,
  AlertCircle,
  Wifi,
  WifiOff,
  UserPlus,
} from 'lucide-react';
import { ServerSettings, MinecraftPingData, EventItem, BountyRecord, PageId, User } from '../types';
import { pingMinecraftServer } from '../services/minecraftPing';
import { StorageManager } from '../services/storage';

interface HomeTabProps {
  settings: ServerSettings;
  onNavigate: (tab: PageId) => void;
  currentUser: User | null;
}

export const HomeTab: React.FC<HomeTabProps> = ({ settings, onNavigate, currentUser }) => {
  // Pinging state
  const [pingData, setPingData] = useState<MinecraftPingData | null>(null);
  const [loadingPing, setLoadingPing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Protected code state
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Quick data
  const [nextEvent, setNextEvent] = useState<EventItem | null>(null);
  const [topBounty, setTopBounty] = useState<BountyRecord | null>(null);

  const fetchPing = useCallback(async (hostToPing?: string) => {
    setLoadingPing(true);
    const target = hostToPing || settings.serverHost || 'play.hypixel.net';
    try {
      const data = await pingMinecraftServer(target, settings.serverPort || 25565);
      setPingData(data);
    } catch {
      setPingData({
        online: false,
        host: target,
        port: settings.serverPort || 25565,
        players: { online: 0, max: 0, list: [] },
        error: 'Kon server status niet ophalen',
      });
    } finally {
      setLoadingPing(false);
    }
  }, [settings.serverHost, settings.serverPort]);

  useEffect(() => {
    fetchPing();
    // Auto-refresh server status & pinging every 5 seconds
    const interval = setInterval(() => {
      fetchPing();
    }, 5000);

    // Load next event & top bounty
    const events = StorageManager.getEvents().filter((e) => e.approved);
    setNextEvent(events.length > 0 ? events[0] : null);

    const bounties = StorageManager.getBounties().filter((b) => b.status === 'Actief');
    if (bounties.length > 0) {
      bounties.sort((a, b) => b.totalValue - a.totalValue);
      setTopBounty(bounties[0]);
    } else {
      setTopBounty(null);
    }

    return () => clearInterval(interval);
  }, [fetchPing]);

  const handleUnlockCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    if (StorageManager.verifyServerAccessCode(accessCodeInput)) {
      setIsUnlocked(true);
      setAccessCodeInput('');
    } else {
      setCodeError('Onjuiste server toegangscode. Vraag de beheerder om de geldige code.');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner Section */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0e131b] shadow-2xl">
        <div className="h-64 sm:h-80 md:h-96 relative">
          <img
            src="/src/assets/images/minecraft_server_hero_1792090467376.jpg"
            alt="Minecraft Server Landschap"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f14] via-[#0c0f14]/60 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono font-semibold border border-emerald-500/30">
                  {settings.serverVersion || 'Minecraft 1.21.x'}
                </span>
                {settings.serverPlatform === 'java' && (
                  <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-mono font-semibold border border-amber-500/30">
                    Alleen Java Editie ☕
                  </span>
                )}
                {settings.serverPlatform === 'bedrock' && (
                  <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono font-semibold border border-cyan-500/30">
                    Alleen Bedrock Editie 📱
                  </span>
                )}
                {(!settings.serverPlatform || settings.serverPlatform === 'both') && (
                  <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-mono font-semibold border border-blue-500/30">
                    Java &amp; Bedrock Crossplay ⚡
                  </span>
                )}
                <span className="text-xs text-slate-300 font-medium">Vrienden &amp; Community SMP</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                {settings.serverName || 'Kabloinky SMP'}
              </h1>
              <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                Het centrale controleportaal voor onze Minecraft wereld. Bekijk live serverstatus,
                evenementen, organisaties, openbare plannen en handhaving.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {!currentUser && (
                <button
                  onClick={() => onNavigate('register')}
                  className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-emerald-300 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 border border-emerald-500/30 shadow-lg"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Account Registreren</span>
                </button>
              )}
              <button
                onClick={() => {
                  const el = document.getElementById('protected-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-lg"
              >
                <Lock className="w-4 h-4" />
                <span>Server IP &amp; Discord Ontgrendelen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Server Live Ping & Quick Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Server Pinging Program */}
        <div className="lg:col-span-2 bg-[#131923] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Server Status &amp; Pinging</span>
                  {pingData?.online ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <Wifi className="w-3 h-3 text-emerald-400" /> ONLINE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-red-500/20 text-red-300 border border-red-500/40">
                      <WifiOff className="w-3 h-3 text-red-400" /> OFFLINE
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                  <span>
                    {settings.serverPlatform === 'java'
                      ? 'Live status van de Java wereld'
                      : settings.serverPlatform === 'bedrock'
                      ? 'Live status van de Bedrock wereld'
                      : 'Live status van de multiplayer wereld (Crossplay)'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Auto (elke 5s)
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchPing()}
              disabled={loadingPing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700 self-start sm:self-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{loadingPing ? 'Pingen...' : 'Vernieuwen'}</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Online Spelers
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {pingData?.online ? pingData.players.online : 0}{' '}
                <span className="text-xs text-slate-500 font-normal">
                  / {pingData?.online ? pingData.players.max : 0}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Reactietijd (Ping)
              </span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                {pingData?.latencyMs ? `${pingData.latencyMs}ms` : '—'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Server Versie
              </span>
              <div className="text-sm font-bold font-mono text-amber-300 mt-2 truncate">
                {pingData?.version || settings.serverVersion || '1.21.x'}
              </div>
            </div>
          </div>

          {/* MOTD View */}
          {pingData?.motd?.clean && pingData.motd.clean.length > 0 && (
            <div className="bg-black/40 border border-slate-800/80 rounded-lg p-3 font-mono text-xs text-slate-300 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Server Bericht (MOTD)
              </span>
              {pingData.motd.clean.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  {line || ' '}
                </div>
              ))}
            </div>
          )}

          {/* Online Players List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Huidige Spelers Online</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {pingData?.players?.list?.length || 0} gedetecteerd
                </span>
              </span>
            </div>

            {pingData?.players?.list && pingData.players.list.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {pingData.players.list.map((playerName, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <img
                      src={`https://mc-heads.net/avatar/${encodeURIComponent(playerName)}/28`}
                      alt={playerName}
                      className="w-7 h-7 rounded shrink-0 border border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-xs font-medium text-slate-200 truncate font-mono">
                      {playerName}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                {pingData?.online
                  ? 'Er zijn momenteel geen spelers online of spelerlijst is anoniem ingesteld.'
                  : 'Server is offline. Geen spelers verbonden.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Server Quick Highlights */}
        <div className="space-y-6">
          {/* Next Upcoming Event */}
          <div className="bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Volgend Evenement
              </span>
              <button
                onClick={() => onNavigate('events')}
                className="text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                Agenda →
              </button>
            </div>

            {nextEvent ? (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white leading-snug">{nextEvent.title}</h3>
                <div className="text-xs font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-900/60 rounded px-2.5 py-1.5 flex items-center justify-between">
                  <span>📅 {nextEvent.date}</span>
                  <span>⏰ {nextEvent.time}</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {nextEvent.description}
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  📍 {nextEvent.location}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">Geen aankomende evenementen gepland.</p>
            )}
          </div>

          {/* Highest Bounty */}
          <div className="bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Hoogste Bounty
              </span>
              <button
                onClick={() => onNavigate('bounties')}
                className="text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                Bounty Board →
              </button>
            </div>

            {topBounty ? (
              <div className="flex items-center gap-3">
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(topBounty.targetPlayer)}/44`}
                  alt={topBounty.targetPlayer}
                  className="w-11 h-11 rounded border border-red-500/40 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white font-mono truncate">
                    {topBounty.targetPlayer}
                  </div>
                  <div className="text-xs font-bold text-amber-400 font-mono">
                    💰 {topBounty.payoutPrice}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {topBounty.reason}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">Geen actieve premies.</p>
            )}
          </div>

          {/* Server Rules quick card */}
          <div className="bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Server Regels
              </span>
              <button
                onClick={() => onNavigate('rules')}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Alles bekijken
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Houd je aan de serverregels om straffen te voorkomen. Griefen en X-Ray leiden direct tot
              gevangenis of ban.
            </p>
          </div>
        </div>
      </div>

      {/* Code-Protected Section (Een code beschermt gedeelte) */}
      <div
        id="protected-section"
        className="bg-gradient-to-br from-[#131923] to-[#0f141d] border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isUnlocked ? (
                <Unlock className="w-5 h-5 text-emerald-400" />
              ) : (
                <Lock className="w-5 h-5 text-amber-400" />
              )}
              <h2 className="text-xl font-bold text-white">
                Beveiligd Gedeelte: Server IP &amp; Discord
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Voer de server toegangscode in om het geheime server-adres, de Bedrock poort en de
              Discord uitnodiging te ontgrendelen.
            </p>
          </div>

          {isUnlocked && (
            <button
              onClick={() => setIsUnlocked(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-slate-700 self-start sm:self-auto"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Vergrendelen</span>
            </button>
          )}
        </div>

        {!isUnlocked ? (
          <div className="max-w-md mx-auto py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Toegangscode Vereist</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vraag je vrienden of beheerder naar de servercode om toegang te krijgen tot de IP en
              community kanalen.
            </p>

            {codeError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{codeError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockCode} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                  placeholder="Voer server toegangscode in..."
                  required
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono tracking-wider text-center"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-md"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Ontgrendel</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Java Edition Details - Visible if Java or Both */}
            {(settings.serverPlatform === 'java' || settings.serverPlatform === 'both' || !settings.serverPlatform) && (
              <div
                className={`bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5 space-y-3 ${
                  settings.serverPlatform === 'java' ? 'md:col-span-2' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      ☕
                    </div>
                    <span className="text-sm font-bold text-white">Java Edition Server</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    PC / Mac / Linux
                  </span>
                </div>

                <div className="p-3 bg-black/50 border border-slate-800 rounded-lg flex items-center justify-between gap-3">
                  <div className="font-mono text-sm text-emerald-300 truncate font-semibold">
                    {settings.serverHost || 'play.hypixel.net'}:{settings.serverPort || 25565}
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${settings.serverHost || 'play.hypixel.net'}:${settings.serverPort || 25565}`,
                        'java'
                      )
                    }
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {copiedField === 'java' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Gekopieerd!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopiëren</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-slate-400 leading-relaxed">
                  Start Minecraft Java {settings.serverVersion || '1.21.x'}, klik op Multiplayer → Add Server, en
                  plak het bovenstaande IP adres.
                </div>
              </div>
            )}

            {/* Bedrock Edition Details - Visible if Bedrock or Both */}
            {(settings.serverPlatform === 'bedrock' || settings.serverPlatform === 'both' || !settings.serverPlatform) && (
              <div
                className={`bg-slate-900/90 border border-cyan-500/30 rounded-xl p-5 space-y-3 ${
                  settings.serverPlatform === 'bedrock' ? 'md:col-span-2' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                      📱
                    </div>
                    <span className="text-sm font-bold text-white">Bedrock Edition (GeyserMC)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Console / Mobiel / Win10
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 p-3 bg-black/50 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block">Server Adres</span>
                    <div className="font-mono text-xs text-white truncate font-semibold mt-0.5">
                      {settings.serverHost || 'play.hypixel.net'}
                    </div>
                  </div>
                  <div className="p-3 bg-black/50 border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block">Poort</span>
                    <div className="font-mono text-xs text-cyan-400 font-semibold mt-0.5">
                      {settings.bedrockPort || 19132}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 leading-relaxed">
                  Voor PlayStation, Xbox, Switch en mobiele spelers via Geyser &amp; Floodgate.
                </div>
              </div>
            )}

            {/* Discord Server Link */}
            <div className="md:col-span-2 bg-[#5865F2]/10 border border-[#5865F2]/40 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0 shadow-md">
                  💬
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Officiële Discord Server</h3>
                  <p className="text-xs text-slate-300">
                    Voice chat, evenementoproepen, bouwinspiratie en updates van het beheerdersteam.
                  </p>
                </div>
              </div>

              <a
                href={settings.discordUrl || 'https://discord.gg/minecraft'}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0 shadow-lg"
              >
                <span>Word Lid van Discord</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
