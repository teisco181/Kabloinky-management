import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Shield,
  Star,
  Coins,
  Check,
  X,
  Skull,
  Award,
  Sparkles,
} from 'lucide-react';
import { BountyRecord, User } from '../types';
import { StorageManager } from '../services/storage';
import { PasswordPromptModal } from './PasswordPromptModal';

interface BountiesTabProps {
  currentUser: User | null;
  onOpenAuth: () => void;
}

export const BountiesTab: React.FC<BountiesTabProps> = ({ currentUser, onOpenAuth }) => {
  const [bounties, setBounties] = useState<BountyRecord[]>(() => StorageManager.getBounties());

  // Real-time Cloud Synchronization
  useEffect(() => {
    const unsub = StorageManager.subscribe(() => {
      setBounties(StorageManager.getBounties());
    });
    return () => unsub();
  }, []);

  const [statusFilter, setStatusFilter] = useState<'all' | 'Actief' | 'Geclaimd'>('all');

  // Place Bounty Modal
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [targetPlayer, setTargetPlayer] = useState('');
  const [amount, setAmount] = useState<number>(16);
  const [itemType, setItemType] = useState('Diamanten');
  const [reason, setReason] = useState('');
  const [placeError, setPlaceError] = useState('');

  // Level Edit Modal (Admin Protected)
  const [editingBounty, setEditingBounty] = useState<BountyRecord | null>(null);
  const [newLevel, setNewLevel] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Claim Bounty Modal
  const [claimingBounty, setClaimingBounty] = useState<BountyRecord | null>(null);
  const [hunterName, setHunterName] = useState('');

  const refreshBounties = () => {
    setBounties(StorageManager.getBounties());
  };

  const filteredBounties = bounties.filter((b) => {
    if (statusFilter === 'all') return true;
    return b.status === statusFilter;
  });

  const requireAdminAuth = (action: () => void) => {
    if (currentUser && (currentUser.role === 'eigenaar' || currentUser.role === 'beheerder')) {
      action();
    } else {
      setPendingAction(() => action);
      setIsPasswordModalOpen(true);
    }
  };

  const handlePlaceBounty = (e: React.FormEvent) => {
    e.preventDefault();
    setPlaceError('');

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!targetPlayer.trim()) {
      setPlaceError('Vul een geldige doelwit spelersnaam in.');
      return;
    }

    if (amount <= 0) {
      setPlaceError('Het aantal moet minimaal 1 zijn.');
      return;
    }

    StorageManager.addBounty(
      targetPlayer.trim(),
      currentUser.username,
      Number(amount),
      itemType,
      reason.trim()
    );

    refreshBounties();
    setIsPlaceModalOpen(false);
    setTargetPlayer('');
    setAmount(16);
    setReason('');
  };

  const handleOpenLevelModal = (bounty: BountyRecord) => {
    requireAdminAuth(() => {
      setEditingBounty(bounty);
      setNewLevel(bounty.level);
      setIsLevelModalOpen(true);
    });
  };

  const handleSaveLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBounty) return;

    StorageManager.updateBountyLevel(editingBounty.id, newLevel);
    refreshBounties();
    setIsLevelModalOpen(false);
    setEditingBounty(null);
  };

  const handleClaimConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingBounty || !hunterName.trim()) return;

    StorageManager.claimBounty(claimingBounty.id, hunterName.trim());
    refreshBounties();
    setClaimingBounty(null);
    setHunterName('');
  };

  const getLevelLabel = (lvl: number) => {
    switch (lvl) {
      case 1:
        return 'Niveau 1: Verdacht (Geen hoge prioriteit)';
      case 2:
        return 'Niveau 2: Gezocht (Actieve jacht)';
      case 3:
        return 'Niveau 3: Gevaarlijk (Hoge premie)';
      case 4:
        return 'Niveau 4: Berucht (Gilde-bedreiging)';
      case 5:
        return 'Niveau 5: Staatsvijand (Maximale premie!)';
      default:
        return `Niveau ${lvl}`;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Target className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Bountys &amp; Premiejagers</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zet een premie op overtreders of rivalen. Bountylevels zijn strikt beveiligd en alleen
            door beheerders met wachtwoord aanpasbaar.
          </p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else setIsPlaceModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Bounty Zetten</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === 'all'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Alle Bounties ({bounties.length})
        </button>
        <button
          onClick={() => setStatusFilter('Actief')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === 'Actief'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Actief Gezocht ({bounties.filter((b) => b.status === 'Actief').length})
        </button>
        <button
          onClick={() => setStatusFilter('Geclaimd')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === 'Geclaimd'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Geclaimd / Voltooid ({bounties.filter((b) => b.status === 'Geclaimd').length})
        </button>
      </div>

      {/* Bounty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBounties.map((bounty) => (
          <div
            key={bounty.id}
            className={`bg-[#131923] border rounded-xl p-5 shadow-xl flex flex-col justify-between transition-all ${
              bounty.status === 'Actief'
                ? 'border-amber-500/40 hover:border-amber-400'
                : 'border-slate-800 opacity-70'
            }`}
          >
            <div className="space-y-4">
              {/* Card Header with Level Stars & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400" title={`Level ${bounty.level}`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < bounty.level ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                      }`}
                    />
                  ))}
                  <span className="text-[11px] font-mono font-bold text-amber-300 ml-1">
                    Lvl {bounty.level}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    bounty.status === 'Actief'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {bounty.status.toUpperCase()}
                </span>
              </div>

              {/* Target Player Presentation */}
              <div className="flex items-center gap-3">
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(bounty.targetPlayer)}/48`}
                  alt={bounty.targetPlayer}
                  className="w-12 h-12 rounded border-2 border-slate-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Gezocht Doelwit
                  </div>
                  <h3 className="text-lg font-bold text-white font-mono truncate">
                    {bounty.targetPlayer}
                  </h3>
                  <div className="text-[10px] text-amber-400/90 font-mono">
                    {getLevelLabel(bounty.level).split(':')[1]}
                  </div>
                </div>
              </div>

              {/* Payout Prize Banner */}
              <div className="p-3 bg-black/50 border border-amber-500/20 rounded-lg space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                  Uitkering / Prijs bij Kill:
                </span>
                <div className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>{bounty.payoutPrice}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Gefinancierd door {bounty.contributions.length} serverleden
                </div>
              </div>

              {/* Motive / Reason */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                  Reden van Premie:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  {bounty.reason}
                </p>
              </div>

              {/* Claimed Info */}
              {bounty.status === 'Geclaimd' && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded text-xs text-emerald-300 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Geclaimd door <strong>{bounty.claimedBy}</strong> op {bounty.claimedAt}
                  </span>
                </div>
              )}
            </div>

            {/* Actions: Admin Level Adjustment & Hunter Claim */}
            <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-2">
              <div className="flex items-center gap-2">
                {bounty.status === 'Actief' && (
                  <button
                    onClick={() => {
                      setClaimingBounty(bounty);
                      setHunterName(currentUser ? currentUser.username : '');
                    }}
                    className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Skull className="w-3.5 h-3.5" />
                    <span>Claim Kill</span>
                  </button>
                )}

                {/* Level adjustment: Strictly admin protected */}
                <button
                  onClick={() => handleOpenLevelModal(bounty)}
                  className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 border border-slate-700"
                  title="Pas Bounty Level aan (Alleen Beheerders met wachtwoord)"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Level (Admin)</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Place Bounty */}
      {isPlaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsPlaceModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white">Bounty Plaatsen op Speler</h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Loof een beloning uit voor de uitschakeling van een speler. Jouw bijdrage wordt
              toegevoegd aan de bounty pot.
            </p>

            {placeError && (
              <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs">
                {placeError}
              </div>
            )}

            <form onSubmit={handlePlaceBounty} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Doelwit Spelersnaam (Minecraft)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={targetPlayer}
                    onChange={(e) => setTargetPlayer(e.target.value)}
                    placeholder="bijv. GrieferRick_09"
                    required
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  {targetPlayer.trim() && (
                    <img
                      src={`https://mc-heads.net/avatar/${encodeURIComponent(targetPlayer.trim())}/32`}
                      alt="Avatar"
                      className="w-8 h-8 rounded border border-slate-700 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Aantal</label>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Item Type</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Diamanten">Diamanten</option>
                    <option value="Netherite Ingots">Netherite Ingots</option>
                    <option value="Emeralds">Emeralds</option>
                    <option value="Goudstaven">Goudstaven</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Motive / Reden van de Premie
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Waarom wordt deze speler gezocht?"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPlaceModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-md"
                >
                  Bounty Uitloven
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Bounty Level (Admin Protected) */}
      {isLevelModalOpen && editingBounty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsLevelModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Bounty Level Aanpassen</h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Pas het officiële gevaarsniveau aan voor <strong>{editingBounty.targetPlayer}</strong>.
            </p>

            <form onSubmit={handleSaveLevel} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Selecteer Nieuw Niveau
                </label>
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value={1}>Level 1: Verdacht (1 ster)</option>
                  <option value={2}>Level 2: Gezocht (2 sterren)</option>
                  <option value={3}>Level 3: Gevaarlijk (3 sterren)</option>
                  <option value={4}>Level 4: Berucht (4 sterren)</option>
                  <option value={5}>Level 5: Staatsvijand (5 sterren)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLevelModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded shadow-md"
                >
                  Level Bijwerken
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Claim Bounty */}
      {claimingBounty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setClaimingBounty(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Skull className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-white">Bounty Claimen</h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Bevestig dat <strong>{claimingBounty.targetPlayer}</strong> is uitgeschakeld om de
              premie te claimen ({claimingBounty.payoutPrice}).
            </p>

            <form onSubmit={handleClaimConfirm} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Naam van de Jager / Killer
                </label>
                <input
                  type="text"
                  value={hunterName}
                  onChange={(e) => setHunterName(e.target.value)}
                  placeholder="Jouw Minecraft spelersnaam..."
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimingBounty(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Claim Bevestigen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Password Prompt for Level Adjustments */}
      <PasswordPromptModal
        isOpen={isPasswordModalOpen}
        title="Beheerders Autorisatie voor Bounty Level"
        description="Voer het beheerder- of moederwachtwoord in om de gevaarsniveaus van premies aan te passen."
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
