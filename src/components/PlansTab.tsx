import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  Lock,
  Plus,
  ThumbsUp,
  MessageSquare,
  MapPin,
  Calendar,
  Send,
  X,
  FileText,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { PublicPlan, PrivateNote, PlanComment, User, Organization } from '../types';
import { StorageManager } from '../services/storage';

interface PlansTabProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  organizations: Organization[];
}

export const PlansTab: React.FC<PlansTabProps> = ({ currentUser, onOpenAuth, organizations }) => {
  const [subTab, setSubTab] = useState<'public' | 'private'>('public');

  // Public Plans State
  const [plans, setPlans] = useState<PublicPlan[]>(() => StorageManager.getPublicPlans());

  useEffect(() => {
    const unsub = StorageManager.subscribe(() => {
      setPlans(StorageManager.getPublicPlans());
      if (currentUser) {
        setPrivateNotes(StorageManager.getPrivateNotes(currentUser.id));
      }
    });
    return () => unsub();
  }, [currentUser]);
  const [sortBy, setSortBy] = useState<'popularity' | 'newest' | 'oldest'>('popularity');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Create Public Plan Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planCategory, setPlanCategory] = useState<PublicPlan['category']>('Bouwproject');
  const [planDescription, setPlanDescription] = useState('');
  const [planCoordinates, setPlanCoordinates] = useState('');
  const [planMaterials, setPlanMaterials] = useState('');
  const [planAuthorChoice, setPlanAuthorChoice] = useState<'player' | string>('player');

  // Chatroom / Comments Modal
  const [activePlanChat, setActivePlanChat] = useState<PublicPlan | null>(null);
  const [comments, setComments] = useState<PlanComment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // Private Notes State
  const [privateNotes, setPrivateNotes] = useState<PrivateNote[]>(() =>
    currentUser ? StorageManager.getPrivateNotes(currentUser.id) : []
  );
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCoords, setNoteCoords] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // User's approved organizations
  const userOrganizations = useMemo(() => {
    if (!currentUser) return [];
    return organizations.filter(
      (org) =>
        org.approved &&
        org.members.some((m) => m.username.toLowerCase() === currentUser.username.toLowerCase())
    );
  }, [currentUser, organizations]);

  const refreshPlans = () => {
    setPlans(StorageManager.getPublicPlans());
  };

  const refreshNotes = () => {
    if (currentUser) {
      setPrivateNotes(StorageManager.getPrivateNotes(currentUser.id));
    }
  };

  // Sort and filter public plans
  const sortedPlans = useMemo(() => {
    let result = [...plans];

    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category === categoryFilter);
    }

    if (sortBy === 'popularity') {
      result.sort((a, b) => b.likes.length - a.likes.length);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return result;
  }, [plans, sortBy, categoryFilter]);

  const handleLike = (planId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    StorageManager.togglePlanLike(planId, currentUser.id);
    refreshPlans();
  };

  const handleCreatePublicPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    let authorType: 'player' | 'organization' = 'player';
    let authorId = currentUser.id;
    let authorName = currentUser.username;
    let organizationName: string | undefined = undefined;

    if (planAuthorChoice !== 'player') {
      const selectedOrg = userOrganizations.find((o) => o.id === planAuthorChoice);
      if (selectedOrg) {
        authorType = 'organization';
        authorId = selectedOrg.id;
        authorName = selectedOrg.name;
        organizationName = selectedOrg.name;
      }
    }

    StorageManager.addPublicPlan({
      title: planTitle.trim(),
      category: planCategory,
      description: planDescription.trim(),
      authorType,
      authorId,
      authorName,
      organizationName,
      coordinates: planCoordinates.trim() || undefined,
      materialsNeeded: planMaterials.trim() || undefined,
      status: 'In Voorbereiding',
    });

    refreshPlans();
    setIsPlanModalOpen(false);
    setPlanTitle('');
    setPlanDescription('');
    setPlanCoordinates('');
    setPlanMaterials('');
  };

  // Chatroom Open
  const openChatroom = (plan: PublicPlan) => {
    setActivePlanChat(plan);
    setComments(StorageManager.getPlanComments(plan.id));
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!activePlanChat || !commentInput.trim()) return;

    StorageManager.addPlanComment(activePlanChat.id, currentUser, commentInput.trim());
    setComments(StorageManager.getPlanComments(activePlanChat.id));
    setCommentInput('');
    refreshPlans();
  };

  // Private Note Handlers
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !noteTitle.trim()) return;

    StorageManager.savePrivateNote(
      {
        userId: currentUser.id,
        title: noteTitle.trim(),
        content: noteContent.trim(),
        coordinates: noteCoords.trim() || undefined,
      },
      editingNoteId || undefined
    );

    refreshNotes();
    setIsNoteModalOpen(false);
    setNoteTitle('');
    setNoteContent('');
    setNoteCoords('');
    setEditingNoteId(null);
  };

  const handleDeleteNote = (id: string) => {
    StorageManager.deletePrivateNote(id);
    refreshNotes();
  };

  const handleOpenEditNote = (note: PrivateNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCoords(note.coordinates || '');
    setIsNoteModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Compass className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Plannen &amp; Aantekeningen</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deel openbare bouwprojecten en redstone ontwerpen, of beheer je geheime privénotities.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setSubTab('public')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subTab === 'public'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Publieke Plannen
            </button>
            <button
              onClick={() => {
                if (!currentUser) onOpenAuth();
                else {
                  setSubTab('private');
                  refreshNotes();
                }
              }}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subTab === 'private'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Privé Notities</span>
            </button>
          </div>

          {subTab === 'public' ? (
            <button
              onClick={() => {
                if (!currentUser) onOpenAuth();
                else setIsPlanModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Plan Delen</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingNoteId(null);
                setNoteTitle('');
                setNoteContent('');
                setNoteCoords('');
                setIsNoteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Nieuwe Notitie</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB: PUBLIC PLANS */}
      {subTab === 'public' && (
        <div className="space-y-5">
          {/* Filters & Sorting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131923] p-3 rounded-xl border border-slate-800">
            {/* Category filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'Bouwproject', 'Redstone & Tech', 'PvP & Raid', 'Economie & Farm', 'Overig'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                      categoryFilter === cat
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {cat === 'all' ? 'Alle Categorieën' : cat}
                  </button>
                )
              )}
            </div>

            {/* Sort by Popularity & Date */}
            <div className="flex items-center gap-2 text-xs self-end sm:self-auto shrink-0">
              <span className="text-slate-400">Sorteren:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'popularity' | 'newest' | 'oldest')}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-md px-2.5 py-1 focus:outline-none"
              >
                <option value="popularity">🔥 Meest Populair (Likes)</option>
                <option value="newest">🕒 Nieuwste eerst</option>
                <option value="oldest">⌛ Oudste eerst</option>
              </select>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedPlans.map((plan) => {
              const hasLiked = currentUser && plan.likes.includes(currentUser.id);

              return (
                <div
                  key={plan.id}
                  className="bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                        {plan.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {plan.createdAt.split('T')[0]}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">{plan.title}</h3>

                    <div className="text-xs text-slate-400 font-mono">
                      Gedeeld door:{' '}
                      <strong className="text-slate-200">
                        {plan.authorName}
                        {plan.organizationName && ` (${plan.organizationName})`}
                      </strong>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {plan.description}
                    </p>

                    {plan.coordinates && (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{plan.coordinates}</span>
                      </div>
                    )}

                    {plan.materialsNeeded && (
                      <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 line-clamp-2">
                        <strong className="text-slate-300 block mb-0.5">Benodigde Materialen:</strong>
                        {plan.materialsNeeded}
                      </div>
                    )}
                  </div>

                  {/* Actions & Comment CTA */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-4">
                    <button
                      onClick={() => handleLike(plan.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        hasLiked
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-emerald-400' : ''}`} />
                      <span>{plan.likes.length} Likes</span>
                    </button>

                    <button
                      onClick={() => openChatroom(plan)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Chatroom ({plan.commentsCount || 0})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB: PRIVATE NOTES */}
      {subTab === 'private' && (
        <div className="space-y-5">
          {!currentUser ? (
            <div className="bg-[#131923] border border-slate-800 rounded-xl p-8 text-center space-y-3">
              <Lock className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-200">
                Log in om je privénotities te bekijken
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Privé aantekeningen zijn alleen zichtbaar voor jouw eigen account.
              </p>
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
              >
                Inloggen
              </button>
            </div>
          ) : privateNotes.length === 0 ? (
            <div className="bg-[#131923] border border-slate-800 rounded-xl p-8 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-200">Nog geen privénotities</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Sla hier je geheime basiscoördinaten, redstone timings en persoonlijke doelen op.
              </p>
              <button
                onClick={() => {
                  setEditingNoteId(null);
                  setNoteTitle('');
                  setNoteContent('');
                  setNoteCoords('');
                  setIsNoteModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
              >
                Eerste Notitie Aanmaken
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {privateNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Privé
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {note.updatedAt.split('T')[0]}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{note.title}</h3>

                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>

                    {note.coordinates && (
                      <div className="p-2 bg-black/40 border border-slate-800 rounded font-mono text-xs text-cyan-400">
                        📍 {note.coordinates}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-3 mt-4">
                    <button
                      onClick={() => handleOpenEditNote(note)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded"
                    >
                      Bewerken
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-xs text-red-300 rounded"
                    >
                      Wissen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Public Plan Create */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsPlanModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white">Nieuw Plan Delen</h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Deel je bouw- of serverproject met alle spelers. Elk plan krijgt een eigen chatroom.
            </p>

            <form onSubmit={handleCreatePublicPlan} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Publiceren als
                </label>
                <select
                  value={planAuthorChoice}
                  onChange={(e) => setPlanAuthorChoice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="player">Persoonlijk ({currentUser?.username})</option>
                  {userOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      Organisatie: {org.name} {org.tag}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Titel</label>
                  <input
                    type="text"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    placeholder="bijv. Nether Snelweg Hub"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Categorie</label>
                  <select
                    value={planCategory}
                    onChange={(e) => setPlanCategory(e.target.value as PublicPlan['category'])}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Bouwproject">Bouwproject</option>
                    <option value="Redstone & Tech">Redstone &amp; Tech</option>
                    <option value="PvP & Raid">PvP &amp; Raid</option>
                    <option value="Economie & Farm">Economie &amp; Farm</option>
                    <option value="Overig">Overig</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Coördinaten / Locatie (Optioneel)
                </label>
                <input
                  type="text"
                  value={planCoordinates}
                  onChange={(e) => setPlanCoordinates(e.target.value)}
                  placeholder="bijv. X: 120, Y: 64, Z: -300"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Beschrijving van het Project
                </label>
                <textarea
                  rows={3}
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  placeholder="Wat is het plan en hoe kunnen spelers helpen?"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Benodigde Materialen &amp; Donaties
                </label>
                <input
                  type="text"
                  value={planMaterials}
                  onChange={(e) => setPlanMaterials(e.target.value)}
                  placeholder="bijv. 5 stacks glas, 2 kisten hout, kwarts"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-md"
                >
                  Plan Publiceren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dedicated Chatroom & Opmerkingen per Plan */}
      {activePlanChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
            <button
              onClick={() => setActivePlanChat(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3 mb-4">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                Chatroom &amp; Vragen
              </span>
              <h2 className="text-base font-bold text-white leading-snug">
                {activePlanChat.title}
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Auteur: {activePlanChat.authorName}
              </span>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Nog geen reacties of vragen. Wees de eerste die reageert!
                </div>
              ) : (
                comments.map((comm) => (
                  <div key={comm.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://mc-heads.net/avatar/${encodeURIComponent(comm.username)}/24`}
                          alt={comm.username}
                          className="w-5 h-5 rounded border border-slate-700"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs font-bold text-white font-mono">{comm.username}</span>
                        <span className="text-[10px] text-emerald-400 capitalize">({comm.userRole})</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-7">{comm.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleSendComment} className="flex gap-2 border-t border-slate-800 pt-3">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={
                  currentUser
                    ? 'Plaats een vraag, tip of donatie-aanbod...'
                    : 'Log in om te reageren...'
                }
                disabled={!currentUser}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!currentUser || !commentInput.trim()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-md shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Plaatsen</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Private Note Create/Edit */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsNoteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white">
                {editingNoteId ? 'Privénotitie Bewerken' : 'Nieuwe Privénotitie'}
              </h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Alleen jij kunt deze notitie zien wanneer je bent ingelogd met jouw account.
            </p>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Titel</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="bijv. Geheime Diamantmijn of Farm Coördinaten"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Coördinaten (Optioneel)
                </label>
                <input
                  type="text"
                  value={noteCoords}
                  onChange={(e) => setNoteCoords(e.target.value)}
                  placeholder="bijv. X: -1450, Y: -58, Z: 890"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Inhoud</label>
                <textarea
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Schrijf hier je geheime aantekeningen, spullenlijst of wachtwoorden..."
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-md"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
