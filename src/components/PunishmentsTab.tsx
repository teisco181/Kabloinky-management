import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Shield,
  Clock,
  UserCheck,
  Check,
  X,
  History,
  Lock,
  Sparkles,
} from 'lucide-react';
import { PunishmentRecord, PunishmentType, User } from '../types';
import { StorageManager } from '../services/storage';
import { PasswordPromptModal } from './PasswordPromptModal';

interface PunishmentsTabProps {
  currentUser: User | null;
  onOpenAuth: () => void;
}

export const PunishmentsTab: React.FC<PunishmentsTabProps> = ({ currentUser }) => {
  const [punishments, setPunishments] = useState<PunishmentRecord[]>(() =>
    StorageManager.getPunishments()
  );

  // Real-time Cloud Synchronization
  useEffect(() => {
    const unsub = StorageManager.subscribe(() => {
      setPunishments(StorageManager.getPunishments());
    });
    return () => unsub();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Player history modal
  const [historyPlayer, setHistoryPlayer] = useState<string | null>(null);

  // Add Sanction Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [type, setType] = useState<PunishmentType>('Waarschuwing');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('24 uur');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Password confirmation
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const refreshPunishments = () => {
    setPunishments(StorageManager.getPunishments());
  };

  const isAuthorized = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.role === 'eigenaar' ||
      currentUser.role === 'beheerder' ||
      currentUser.role === 'moderator' ||
      StorageManager.isUserModeratorForPage(currentUser, 'punishments')
    );
  }, [currentUser]);

  const requireAuth = (action: () => void) => {
    if (isAuthorized) {
      action();
    } else {
      setPendingAction(() => action);
      setIsPasswordModalOpen(true);
    }
  };

  const filteredRecords = useMemo(() => {
    return punishments.filter((p) => {
      const matchesSearch =
        p.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.adminName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [punishments, searchQuery, typeFilter, statusFilter]);

  // Player offense history timeline
  const playerHistoryRecords = useMemo(() => {
    if (!historyPlayer) return [];
    return punishments.filter(
      (p) => p.playerName.toLowerCase() === historyPlayer.toLowerCase()
    );
  }, [punishments, historyPlayer]);

  const handleCreatePunishment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!playerName.trim() || !reason.trim()) {
      setFormError('Spelersnaam en reden zijn verplicht.');
      return;
    }

    const adminName = currentUser ? currentUser.username : 'ServerBeheer';

    StorageManager.addPunishment({
      playerName: playerName.trim(),
      type,
      reason: reason.trim(),
      duration: duration.trim() || 'Direct van toepassing',
      adminName,
      status: 'Actief',
      notes: notes.trim() || undefined,
    });

    refreshPunishments();
    setIsAddModalOpen(false);
    setPlayerName('');
    setReason('');
    setDuration('24 uur');
    setNotes('');
  };

  const handleUpdateStatus = (id: string, newStatus: 'Actief' | 'Verlopen' | 'Kwijtgescholden') => {
    requireAuth(() => {
      StorageManager.updatePunishmentStatus(id, newStatus);
      refreshPunishments();
    });
  };

  const getTypeBadgeColor = (pType: PunishmentType) => {
    switch (pType) {
      case 'Ban':
        return 'bg-red-950 text-red-300 border-red-700';
      case 'Gevangenis':
        return 'bg-orange-950 text-orange-300 border-orange-700';
      case 'Mute':
        return 'bg-purple-950 text-purple-300 border-purple-700';
      case 'Boete':
        return 'bg-yellow-950 text-yellow-300 border-yellow-700';
      default:
        return 'bg-blue-950 text-blue-300 border-blue-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Strafblad &amp; Handhaving
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Overzicht van uitgedeelde waarschuwingen, mutes, jailstraffen en bans. Alleen aanpasbaar
            door beheerders.
          </p>
        </div>

        <button
          onClick={() => requireAuth(() => setIsAddModalOpen(true))}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Sanctie Opleggen (Staff)</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#131923] p-3 rounded-xl border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op speler, reden of beheerder..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="all">Alle Sanctie Types</option>
            <option value="Waarschuwing">Waarschuwing</option>
            <option value="Mute">Mute (Spreekverbod)</option>
            <option value="Gevangenis">Gevangenis (Jail)</option>
            <option value="Ban">Ban (Verban)</option>
            <option value="Boete">Boete (Diamanten)</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="all">Alle Statussen</option>
            <option value="Actief">Alleen Actief</option>
            <option value="Verlopen">Verlopen</option>
            <option value="Kwijtgescholden">Kwijtgescholden</option>
          </select>
        </div>
      </div>

      {/* Table / Records View */}
      <div className="bg-[#131923] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Speler</th>
                <th className="py-3 px-4">Type Sanctie</th>
                <th className="py-3 px-4">Reden &amp; Toelichting</th>
                <th className="py-3 px-4">Duur / Strafmaat</th>
                <th className="py-3 px-4">Datum &amp; Door</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Geen sancties gevonden die overeenkomen met de filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://mc-heads.net/avatar/${encodeURIComponent(item.playerName)}/24`}
                          alt={item.playerName}
                          className="w-6 h-6 rounded border border-slate-700"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={() => setHistoryPlayer(item.playerName)}
                          className="hover:underline font-mono text-emerald-400 font-bold"
                          title="Bekijk volledige overtredingsgeschiedenis"
                        >
                          {item.playerName}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${getTypeBadgeColor(
                          item.type
                        )}`}
                      >
                        {item.type}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300 max-w-xs">
                      <div className="leading-relaxed">{item.reason}</div>
                      {item.notes && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5">
                          Notitie: {item.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">{item.duration}</td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      <div>{item.date}</div>
                      <div className="text-[10px] text-slate-500">door {item.adminName}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                          item.status === 'Actief'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : item.status === 'Kwijtgescholden'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setHistoryPlayer(item.playerName)}
                          className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-800"
                          title="Bekijk dossier van deze speler"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {item.status === 'Actief' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'Kwijtgescholden')}
                            className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold rounded text-[11px] border border-emerald-800/80"
                            title="Kwijtschelden (Staff)"
                          >
                            Kwijtschelden
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Player Offense History Inspector */}
      {historyPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setHistoryPlayer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
              <img
                src={`https://mc-heads.net/avatar/${encodeURIComponent(historyPlayer)}/44`}
                alt={historyPlayer}
                className="w-11 h-11 rounded border border-slate-700"
                referrerPolicy="no-referrer"
              />
              <div>
                <h2 className="text-lg font-bold text-white font-mono">{historyPlayer}</h2>
                <span className="text-xs text-slate-400">
                  Volledig Strafblad Dossier ({playerHistoryRecords.length} registraties)
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {playerHistoryRecords.map((rec, index) => (
                <div
                  key={rec.id}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      Vergrijp #{playerHistoryRecords.length - index} · {rec.type}
                    </span>
                    <span className="font-mono text-slate-500">{rec.date}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{rec.reason}</p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                    <span>Duur: {rec.duration}</span>
                    <span>Door: {rec.adminName}</span>
                    <span
                      className={
                        rec.status === 'Actief'
                          ? 'text-red-400 font-bold'
                          : rec.status === 'Kwijtgescholden'
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }
                    >
                      [{rec.status}]
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sanctie Opleggen */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
                <Shield className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white">Nieuwe Sanctie Registreren</h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Voer de gegevens in van de overtreder. Dit wordt direct toegevoegd aan het officiële
              strafblad.
            </p>

            {formError && (
              <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePunishment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Minecraft Spelersnaam
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="bijv. GrieferRick_09"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Sanctie Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PunishmentType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Waarschuwing">Waarschuwing</option>
                    <option value="Mute">Mute (Spreekverbod)</option>
                    <option value="Gevangenis">Gevangenis (Jail)</option>
                    <option value="Ban">Ban (Serverban)</option>
                    <option value="Boete">Boete</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Duur / Boetebedrag
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="bijv. 24 uur of 20 Diamanten"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Reden van de Straf
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Beschrijf duidelijk de overtreding en de context..."
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Interne Notitie (Optioneel)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="bijv. Bewijsmateriaal opgeslagen, heeft spullen deels vergoed"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md"
                >
                  Sanctie Opleggen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Prompt */}
      <PasswordPromptModal
        isOpen={isPasswordModalOpen}
        title="Beheerders Wachtwoord Vereist"
        description="Voer het beheerder- of moederwachtwoord in om wijzigingen aan te brengen in het strafblad."
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPendingAction(null);
        }}
        onSuccess={() => {
          if (pendingAction) pendingAction();
          setPendingAction(null);
        }}
      />
    </div>
  );
};
