import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  ShieldAlert,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Scale,
  Sparkles,
} from 'lucide-react';
import { ServerRule, User } from '../types';
import { StorageManager } from '../services/storage';
import { PasswordPromptModal } from './PasswordPromptModal';

interface RulesTabProps {
  currentUser: User | null;
  onOpenAuth: () => void;
}

export const RulesTab: React.FC<RulesTabProps> = ({ currentUser, onOpenAuth }) => {
  const [rules, setRules] = useState<ServerRule[]>(() => StorageManager.getRules());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleNumber, setRuleNumber] = useState<number>(rules.length + 1);
  const [ruleCategory, setRuleCategory] = useState<ServerRule['category']>('Algemeen');
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [rulePunishment, setRulePunishment] = useState('');

  // Password confirmation for admin changes
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const categories: ServerRule['category'][] = [
    'Algemeen',
    'Bouwen & Griefing',
    'PvP & Gevechten',
    'Economie & Handel',
    'Chat & Communicatie',
  ];

  const refreshRules = () => {
    setRules(StorageManager.getRules());
  };

  // Real-time synchronization subscription
  React.useEffect(() => {
    const unsub = StorageManager.subscribe(() => {
      refreshRules();
    });
    return () => unsub();
  }, []);

  const [ruleToDelete, setRuleToDelete] = useState<ServerRule | null>(null);

  const filteredRules = rules.filter(
    (r) => selectedCategory === 'all' || r.category === selectedCategory
  );

  const isAuthorized =
    currentUser &&
    (currentUser.role === 'eigenaar' ||
      currentUser.role === 'beheerder' ||
      currentUser.role === 'moderator' ||
      StorageManager.isUserModeratorForPage(currentUser, 'rules'));

  const requireAdminAuth = (action: () => void) => {
    // If logged in as owner, beheerder, or page moderator, proceed directly
    if (isAuthorized) {
      action();
    } else {
      setPendingAction(() => action);
      setIsPasswordModalOpen(true);
    }
  };

  const handleOpenAdd = () => {
    requireAdminAuth(() => {
      setEditingRuleId(null);
      setRuleNumber(rules.length + 1);
      setRuleCategory('Algemeen');
      setRuleTitle('');
      setRuleDescription('');
      setRulePunishment('');
      setIsModalOpen(true);
    });
  };

  const handleOpenEdit = (rule: ServerRule) => {
    requireAdminAuth(() => {
      setEditingRuleId(rule.id);
      setRuleNumber(rule.number);
      setRuleCategory(rule.category);
      setRuleTitle(rule.title);
      setRuleDescription(rule.description);
      setRulePunishment(rule.punishment);
      setIsModalOpen(true);
    });
  };

  const handleRequestDeleteRule = (rule: ServerRule) => {
    requireAdminAuth(() => {
      setRuleToDelete(rule);
    });
  };

  const handleExecuteDelete = () => {
    if (!ruleToDelete) return;
    StorageManager.deleteRule(ruleToDelete.id);
    refreshRules();
    setRuleToDelete(null);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = ruleTitle.trim();
    const cleanDesc = ruleDescription.trim();
    const cleanPunish = rulePunishment.trim() || 'Strafmaat nader te bepalen door beheerder';

    if (!cleanTitle) {
      alert('Vul een titel in voor de regel.');
      return;
    }

    if (!cleanDesc) {
      alert('Vul een toelichting in voor de regel.');
      return;
    }

    StorageManager.saveRule(
      {
        number: Number(ruleNumber) || rules.length + 1,
        category: ruleCategory,
        title: cleanTitle,
        description: cleanDesc,
        punishment: cleanPunish,
      },
      editingRuleId || undefined
    );

    refreshRules();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Server Regels &amp; Sancties</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Officiële wetten en voorschriften van de Minecraft server. Elk vergrijp heeft een vastgelegde sanctie.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Regel Toevoegen (Admin)</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Alle Regels ({rules.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {cat} ({rules.filter((r) => r.category === cat).length})
          </button>
        ))}
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {filteredRules.map((rule) => (
          <div
            key={rule.id}
            className="bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-xl hover:border-slate-700 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    §{rule.number}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{rule.category}</span>
                </div>

                <h3 className="text-base font-bold text-white">{rule.title}</h3>

                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  {rule.description}
                </p>

                {/* Punishment Callout */}
                <div className="mt-3 p-3 bg-red-950/20 border border-red-500/30 rounded-lg flex items-start gap-2.5">
                  <Scale className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-red-300 block mb-0.5">Vastgelegde Strafmaat:</span>
                    <span className="text-slate-300 leading-relaxed">{rule.punishment}</span>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                <button
                  onClick={() => handleOpenEdit(rule)}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
                  title="Regel bewerken"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRequestDeleteRule(rule)}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                  title="Regel verwijderen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Rule Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white">
                {editingRuleId ? 'Server Regel Bewerken' : 'Nieuwe Server Regel Toevoegen'}
              </h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Geef een duidelijke omschrijving en specificeer welke straf er aan vast hangt bij overtreding.
            </p>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nummer</label>
                  <input
                    type="number"
                    value={ruleNumber}
                    onChange={(e) => setRuleNumber(Number(e.target.value))}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Categorie</label>
                  <select
                    value={ruleCategory}
                    onChange={(e) => setRuleCategory(e.target.value as ServerRule['category'])}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Titel van de Regel</label>
                <input
                  type="text"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  placeholder="bijv. Geen Griefing &amp; Diefstal"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Uitleg &amp; Toelichting
                </label>
                <textarea
                  rows={3}
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="Wat mag wel en wat mag niet?"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Vastgekoppelde Strafmaat</span>
                </label>
                <input
                  type="text"
                  value={rulePunishment}
                  onChange={(e) => setRulePunishment(e.target.value)}
                  placeholder="bijv. 1e keer: Waarschuwing · 2e keer: 24u Jail · 3e keer: Permanente Ban"
                  required
                  className="w-full bg-slate-900 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-md"
                >
                  Regel Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation Modal */}
      {ruleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131923] border border-red-500/40 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setRuleToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Regel Verwijderen</h3>
                <p className="text-xs text-red-300">Deze actie kan niet ongedaan worden gemaakt.</p>
              </div>
            </div>

            <div className="my-4 p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-xs font-mono font-bold text-emerald-400 block mb-1">
                §{ruleToDelete.number} · {ruleToDelete.category}
              </span>
              <p className="text-sm font-bold text-white mb-1">{ruleToDelete.title}</p>
              <p className="text-xs text-slate-400 line-clamp-2">{ruleToDelete.description}</p>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Weet je zeker dat je deze officiële serverregel definitief wilt verwijderen uit het systeem en de cloud database?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRuleToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Definitief Verwijderen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt */}
      <PasswordPromptModal
        isOpen={isPasswordModalOpen}
        title="Beheerders Autorisatie"
        description="Voer het beheerder- of moederwachtwoord in om regels te wijzigen."
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
