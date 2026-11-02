import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Shield,
  Check,
  X,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { EventItem, User, Organization } from '../types';
import { StorageManager } from '../services/storage';
import { PasswordPromptModal } from './PasswordPromptModal';

interface EventsTabProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  organizations: Organization[];
}

export const EventsTab: React.FC<EventsTabProps> = ({ currentUser, onOpenAuth, organizations }) => {
  const [events, setEvents] = useState<EventItem[]>(() => StorageManager.getEvents());
  const [viewMode, setViewMode] = useState<'agenda' | 'kalender'>('agenda');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'past'>('all');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isPast = (eventDate: string) => !!eventDate && eventDate < todayStr;

  // Real-time Cloud Synchronization
  useEffect(() => {
    const unsub = StorageManager.subscribe(() => {
      setEvents(StorageManager.getEvents());
    });
    return () => unsub();
  }, []);

  // Request Event Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('20:00');
  const [authorChoice, setAuthorChoice] = useState<'player' | string>('player'); // 'player' or orgId
  const [formError, setFormError] = useState('');

  // Password modal for approving
  const [eventToApprove, setEventToApprove] = useState<EventItem | null>(null);

  // Deletion modal state (creator / logged-in admin)
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);

  // Deletion modal with password (any beheerder)
  const [eventToDeleteWithPassword, setEventToDeleteWithPassword] = useState<EventItem | null>(null);

  // Selected event for calendar detail popover/modal
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<EventItem | null>(null);

  // Calendar month selection
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const refreshEvents = () => {
    setEvents(StorageManager.getEvents());
  };

  const canDeleteEvent = (item: EventItem) => {
    if (!currentUser) return false;
    // 1. Creator can always delete (matched by authorId or case-insensitive username)
    if (
      (item.authorId && currentUser.id && item.authorId === currentUser.id) ||
      (item.authorName &&
        currentUser.username &&
        item.authorName.trim().toLowerCase() === currentUser.username.trim().toLowerCase())
    ) {
      return true;
    }
    // 2. Administrator, owner, or events moderator can delete
    if (
      currentUser.role === 'eigenaar' ||
      currentUser.role === 'beheerder' ||
      currentUser.role === 'moderator' ||
      StorageManager.isUserModeratorForPage(currentUser, 'events')
    ) {
      return true;
    }
    // 3. If event belongs to an organization where user is leader/officer
    if (item.authorType === 'organization') {
      const org = organizations.find(
        (o) =>
          o.id === item.authorId ||
          o.name.toLowerCase() === (item.organizationName || item.authorName).toLowerCase()
      );
      if (
        org &&
        org.members.some(
          (m) =>
            m.username.toLowerCase() === currentUser.username.toLowerCase() &&
            (m.role === 'leider' || m.role === 'officier')
        )
      ) {
        return true;
      }
    }
    return false;
  };

  // User's approved organizations
  const userOrganizations = useMemo(() => {
    if (!currentUser) return [];
    return organizations.filter(
      (org) =>
        org.approved &&
        org.members.some((m) => m.username.toLowerCase() === currentUser.username.toLowerCase())
    );
  }, [currentUser, organizations]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter === 'approved') return e.approved;
      if (statusFilter === 'pending') return !e.approved;
      if (statusFilter === 'past') return isPast(e.date);
      return true;
    });
  }, [events, statusFilter, todayStr]);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!currentUser) {
      setFormError('Je moet ingelogd zijn om een evenement aan te vragen.');
      return;
    }

    if (!title.trim() || !location.trim() || !date || !time) {
      setFormError('Vul alle verplichte velden in.');
      return;
    }

    let authorType: 'player' | 'organization' = 'player';
    let authorId = currentUser.id;
    let authorName = currentUser.username;
    let organizationName: string | undefined = undefined;

    if (authorChoice !== 'player') {
      const selectedOrg = userOrganizations.find((o) => o.id === authorChoice);
      if (!selectedOrg) {
        setFormError('Je kunt alleen evenementen aanvragen voor een organisatie waar je lid van bent.');
        return;
      }
      authorType = 'organization';
      authorId = selectedOrg.id;
      authorName = selectedOrg.name;
      organizationName = selectedOrg.name;
    }

    // Direct approval if user is beheerder, eigenaar, or moderator for events
    const isAdmin =
      currentUser &&
      (currentUser.role === 'eigenaar' ||
        currentUser.role === 'beheerder' ||
        StorageManager.isUserModeratorForPage(currentUser, 'events'));

    StorageManager.addEvent({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      date,
      time,
      authorType,
      authorId,
      authorName,
      organizationName,
      approved: isAdmin,
      approvedBy: isAdmin ? currentUser.username : undefined,
    });

    refreshEvents();
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setLocation('');
  };

  const handleApproveConfirm = () => {
    if (!eventToApprove) return;
    const adminName = currentUser ? currentUser.username : 'Beheerder';
    StorageManager.approveEvent(eventToApprove.id, adminName);
    refreshEvents();
    setEventToApprove(null);
  };

  const handleReject = (eventId: string) => {
    StorageManager.rejectEvent(eventId);
    refreshEvents();
  };

  const handleToggleAttendance = (eventId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    StorageManager.toggleEventAttendance(eventId, currentUser.username);
    refreshEvents();
  };

  // Calendar Helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 = Monday
  };

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const totalDays = daysInMonth(currentYear, currentMonth);
  const startDay = firstDayOfMonth(currentYear, currentMonth);

  const monthNames = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Server Evenementen &amp; Agenda</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Officiële community activiteiten, raids, bouwwedstrijden en speler-initiatieven.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Segmented View Mode */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'agenda' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => setViewMode('kalender')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'kalender' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Kalender
            </button>
          </div>

          <button
            onClick={() => {
              if (!currentUser) onOpenAuth();
              else setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Evenement Aanvragen</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === 'all'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Alle ({events.length})
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === 'approved'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Goedgekeurd ({events.filter((e) => e.approved).length})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === 'pending'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          In Afwachting ({events.filter((e) => !e.approved).length})
        </button>
        <button
          onClick={() => setStatusFilter('past')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            statusFilter === 'past'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Oude Evenementen ({events.filter((e) => isPast(e.date)).length})</span>
        </button>
      </div>

      {/* View: Kalender Weergave */}
      {viewMode === 'kalender' && (
        <div className="bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarDate(new Date(currentYear, currentMonth - 1, 1))}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded transition-colors"
              >
                ← Vorige
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded transition-colors"
              >
                Vandaag
              </button>
              <button
                onClick={() => setCalendarDate(new Date(currentYear, currentMonth + 1, 1))}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded transition-colors"
              >
                Volgende →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs text-slate-400 pb-2">
            <span>Ma</span>
            <span>Di</span>
            <span>Wo</span>
            <span>Do</span>
            <span>Vr</span>
            <span>Za</span>
            <span>Zo</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 sm:h-24 bg-slate-900/30 rounded-lg p-1 opacity-20" />
            ))}

            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
                dayNum
              ).padStart(2, '0')}`;
              const dayEvents = filteredEvents.filter((e) => e.date === dateString);

              return (
                <div
                  key={dayNum}
                  className="h-20 sm:h-24 bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5 flex flex-col justify-between overflow-hidden hover:border-slate-700 transition-colors"
                >
                  <span className="font-mono text-xs text-slate-400 font-semibold">{dayNum}</span>
                  <div className="space-y-1 overflow-y-auto max-h-14">
                    {dayEvents.map((ev) => (
                      <button
                        type="button"
                        key={ev.id}
                        onClick={() => setSelectedCalendarEvent(ev)}
                        title={`${ev.time} - ${ev.title} (${ev.location}) · Klik voor details`}
                        className={`text-[10px] p-1 rounded font-medium truncate w-full text-left transition-transform hover:scale-[1.02] cursor-pointer ${
                          ev.approved
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                        }`}
                      >
                        {ev.time} {ev.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View: Agenda Weergave */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-[#131923] border border-slate-800 rounded-xl p-8 text-center space-y-3">
            <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">Geen evenementen gevonden</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Er zijn geen evenementen die voldoen aan het huidige filter. Vraag als eerste speler of organisatie een activiteit aan!
            </p>
          </div>
        ) : (
          filteredEvents.map((item) => {
            const hasJoined = currentUser && item.attendees.includes(currentUser.username);
            const past = isPast(item.date);

            return (
              <div
                key={item.id}
                className={`bg-[#131923] border rounded-xl p-5 shadow-lg transition-all ${
                  past
                    ? 'border-red-950/80 bg-[#151218]'
                    : item.approved
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-amber-500/40 bg-[#161c28]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {past && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-red-300 bg-red-950/90 px-2.5 py-0.5 rounded border border-red-800">
                          <Clock className="w-3.5 h-3.5" /> Oud / Verlopen
                        </span>
                      )}

                      {item.approved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Goedgekeurd
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" /> Wacht op Beheerder Goedkeuring
                        </span>
                      )}

                      <span className="text-xs text-slate-400 font-mono">
                        Aangevraagd door: <strong className="text-slate-200">{item.authorName}</strong>
                        {item.authorType === 'organization' && ' (Organisatie)'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{item.title}</h3>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                      <span className="flex items-center gap-1 text-emerald-300">
                        <CalendarIcon className="w-3.5 h-3.5" /> {item.date} om {item.time}
                      </span>
                      <span className="flex items-center gap-1 text-cyan-300">
                        <MapPin className="w-3.5 h-3.5" /> {item.location}
                      </span>
                    </div>
                  </div>

                  {/* Right side: Attendance & Admin actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Admin Approval Action */}
                      {!item.approved && (
                        <button
                          onClick={() => setEventToApprove(item)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Goedkeuren (Admin)</span>
                        </button>
                      )}

                      {/* Join / RSVP Button */}
                      {item.approved && (
                        <button
                          onClick={() => handleToggleAttendance(item.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
                            hasJoined
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {hasJoined ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-300" />
                              <span>Aangemeld! ({item.attendees.length})</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 text-emerald-400" />
                              <span>Ik doe mee ({item.attendees.length})</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Delete Event Button for Creator / Admin / Moderator OR with Beheer Password */}
                      {canDeleteEvent(item) ? (
                        <button
                          onClick={() => setEventToDelete(item)}
                          className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-700"
                          title="Evenement Verwijderen (Aanmaker / Beheerder)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setEventToDeleteWithPassword(item)}
                          className="p-2 bg-slate-800/60 hover:bg-amber-500/20 text-slate-500 hover:text-amber-400 rounded-lg transition-colors border border-slate-800"
                          title="Evenement Verwijderen (Beheerderswachtwoord vereist)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Attendees Avatar Heads */}
                    {item.attendees.length > 0 && (
                      <div className="flex items-center -space-x-1.5 pt-1">
                        {item.attendees.slice(0, 6).map((att, i) => (
                          <img
                            key={i}
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(att)}/24`}
                            alt={att}
                            title={att}
                            className="w-6 h-6 rounded-full border border-slate-900"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                        {item.attendees.length > 6 && (
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-[9px] font-mono font-bold text-slate-300 flex items-center justify-center border border-slate-900">
                            +{item.attendees.length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Evenement Aanvragen */}
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
              <h2 className="text-lg font-bold text-white">Nieuw Evenement Aanvragen</h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Dien een evenement in onder je eigen spelersnaam of namens een goedgekeurde organisatie.
            </p>

            {formError && (
              <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Aanvragen als (Auteur)
                </label>
                <select
                  value={authorChoice}
                  onChange={(e) => setAuthorChoice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="player">
                    Persoonlijk ({currentUser?.username || 'Jouw account'})
                  </option>
                  {userOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      Organisatie: {org.name} {org.tag}
                    </option>
                  ))}
                </select>
                {userOrganizations.length === 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tip: Richt eerst een organisatie op in het tabblad &quot;Organisatie&quot; om namens een groep evenementen te plaatsen.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Titel van het Evenement
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="bijv. Ender Dragon Raid of PvP Toernooi"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Datum</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Tijd (24u)</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  In-Game Locatie of Coördinaten
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="bijv. Spawn Plein X: 150, Z: -200 of The End Portal"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Beschrijving &amp; Benodigdheden
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Wat gaan we doen? Welke armor of items moeten spelers meenemen?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                  Evenement Indienen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131923] border border-red-500/40 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setEventToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Evenement Verwijderen</h3>
                <p className="text-xs text-red-300">Deze actie kan niet ongedaan worden gemaakt.</p>
              </div>
            </div>

            <div className="my-4 p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-xs font-mono font-bold text-emerald-400 block mb-1">
                {eventToDelete.date} om {eventToDelete.time} · {eventToDelete.location}
              </span>
              <p className="text-sm font-bold text-white mb-1">{eventToDelete.title}</p>
              <p className="text-xs text-slate-400 line-clamp-2">{eventToDelete.description}</p>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Weet je zeker dat je dit evenement definitief wilt verwijderen uit de serveragenda en de cloud database?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => {
                  StorageManager.deleteEvent(eventToDelete.id);
                  refreshEvents();
                  setEventToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Definitief Verwijderen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt for Admin Event Approval */}
      <PasswordPromptModal
        isOpen={Boolean(eventToApprove)}
        title="Evenement Goedkeuren"
        description={`Voer het beheerder- of moederwachtwoord in om "${eventToApprove?.title}" officieel goed te keuren en live te publiceren.`}
        onClose={() => setEventToApprove(null)}
        onSuccess={handleApproveConfirm}
      />

      {/* Password Prompt for Event Deletion by Admin */}
      <PasswordPromptModal
        isOpen={Boolean(eventToDeleteWithPassword)}
        title="Evenement Verwijderen (Beheer)"
        description={`Voer het beheerder- of moederwachtwoord in om het evenement "${eventToDeleteWithPassword?.title}" definitief te verwijderen.`}
        onClose={() => setEventToDeleteWithPassword(null)}
        onSuccess={() => {
          if (eventToDeleteWithPassword) {
            StorageManager.deleteEvent(eventToDeleteWithPassword.id);
            refreshEvents();
            setEventToDeleteWithPassword(null);
          }
        }}
      />

      {/* Calendar Event Detail & Action Modal */}
      {selectedCalendarEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedCalendarEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              {isPast(selectedCalendarEvent.date) ? (
                <span className="text-[10px] font-mono font-bold text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                  Oud / Verlopen
                </span>
              ) : selectedCalendarEvent.approved ? (
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  Goedgekeurd
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                  In Afwachting
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono">
                Aanmaker: <strong className="text-slate-200">{selectedCalendarEvent.authorName}</strong>
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">{selectedCalendarEvent.title}</h3>
            {selectedCalendarEvent.description && (
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {selectedCalendarEvent.description}
              </p>
            )}

            <div className="space-y-1.5 text-xs font-mono text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-800 mb-5">
              <div className="text-emerald-300">
                Datum &amp; Tijd: {selectedCalendarEvent.date} om {selectedCalendarEvent.time}
              </div>
              <div className="text-cyan-300">Locatie: {selectedCalendarEvent.location}</div>
              <div>Deelnemers: {selectedCalendarEvent.attendees?.length || 0} spelers</div>
            </div>

            <div className="flex items-center justify-between gap-2">
              {canDeleteEvent(selectedCalendarEvent) ? (
                <button
                  type="button"
                  onClick={() => {
                    const ev = selectedCalendarEvent;
                    setSelectedCalendarEvent(null);
                    setEventToDelete(ev);
                  }}
                  className="px-3.5 py-2 bg-red-950 hover:bg-red-900 text-red-300 font-bold text-xs rounded-lg border border-red-800 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Verwijderen</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const ev = selectedCalendarEvent;
                    setSelectedCalendarEvent(null);
                    setEventToDeleteWithPassword(ev);
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 font-bold text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Verwijder (met Wachtwoord)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedCalendarEvent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
