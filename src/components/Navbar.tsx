import React, { useState } from 'react';
import {
  Shield,
  Calendar,
  Users,
  Compass,
  BookOpen,
  AlertTriangle,
  Target,
  Settings,
  Bell,
  Check,
  Trash2,
  Lock,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  UserPlus,
} from 'lucide-react';
import { PageId, User, NotificationItem, ServerSettings } from '../types';

interface NavbarProps {
  activeTab: PageId;
  onSelectTab: (tab: PageId) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  settings: ServerSettings;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onClearNotifications: () => void;
  onRequestBrowserNotification: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onOpenAuth,
  onLogout,
  settings,
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  onRequestBrowserNotification,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Shield className="w-4 h-4" /> },
    { id: 'events', label: 'Evenementen', icon: <Calendar className="w-4 h-4" /> },
    { id: 'organizations', label: 'Organisatie', icon: <Users className="w-4 h-4" /> },
    { id: 'plans', label: 'Plan', icon: <Compass className="w-4 h-4" /> },
    { id: 'rules', label: 'Regels', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'punishments', label: 'Straf', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'bounties', label: 'Bountys', icon: <Target className="w-4 h-4" /> },
    { id: 'settings', label: 'Instellingen', icon: <Settings className="w-4 h-4" /> },
    { id: 'register', label: 'Registratie', icon: <UserPlus className="w-4 h-4" /> },
  ];

  const handleTabClick = (id: PageId) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0f141d]/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2 text-left group transition-transform focus:outline-none"
            >
              <div className="w-9 h-9 rounded bg-emerald-600 flex items-center justify-center font-mono font-bold text-slate-900 border border-emerald-400/40 shadow-sm group-hover:bg-emerald-500 transition-colors">
                ⛏
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap block">
                  {settings.serverName || 'CraftBeheer'}
                </span>
                <div className="flex items-center gap-2 -mt-0.5">
                  <span className="text-[11px] text-emerald-400 font-mono block">
                    Community Portaal
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Cloud Live
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const isBlocked =
                item.id === 'settings'
                  ? false
                  : currentUser && Array.isArray(currentUser.allowedPages)
                  ? !currentUser.allowedPages.includes(item.id)
                  : settings.pageAccess[item.id] && !settings.pageAccess[item.id].enabled;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors relative ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {isBlocked && (
                    <span title="Geen toegang tot deze pagina">
                      <Lock className="w-3 h-3 text-amber-400/80 inline ml-0.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions & Notifications & Auth */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors focus:outline-none"
                aria-label="Notificaties"
                title="Notificaties"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-slate-950 font-mono text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#131923] border border-slate-700/80 rounded-lg shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">Notificaties</span>
                      {unreadCount > 0 && (
                        <span className="text-[11px] font-mono text-emerald-400">({unreadCount} nieuw)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={onRequestBrowserNotification}
                        className="text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Zet desktop push-meldingen aan"
                      >
                        Push aan
                      </button>
                      <span className="text-slate-600">·</span>
                      <button
                        onClick={onClearNotifications}
                        className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                        title="Wis alle notificaties"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        Geen nieuwe notificaties
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            onMarkNotificationRead(n.id);
                            if (n.targetTab) onSelectTab(n.targetTab);
                            setNotificationsOpen(false);
                          }}
                          className={`p-3 text-xs hover:bg-slate-800/60 cursor-pointer transition-colors ${
                            !n.read ? 'bg-slate-800/30' : 'opacity-70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-200">{n.title}</span>
                            {!n.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkNotificationRead(n.id);
                                }}
                                className="text-slate-500 hover:text-emerald-400"
                                title="Markeer als gelezen"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] font-mono text-slate-500 mt-1.5 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile or Login CTA */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-800/60 pl-2 pr-1.5 py-1 rounded-md border border-slate-700/60">
                <img
                  src={currentUser.avatarUrl || `https://mc-heads.net/avatar/${currentUser.username}/32`}
                  alt={currentUser.username}
                  className="w-6 h-6 rounded"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {currentUser.username}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 capitalize -mt-0.5">
                    {currentUser.role}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-red-400 transition-colors ml-1"
                  title="Uitloggen"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectTab('login')}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Inloggen</span>
                </button>
                <button
                  onClick={() => onSelectTab('register')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors whitespace-nowrap shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Registreren</span>
                </button>
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md focus:outline-none"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#0c1017] border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const isBlocked =
              item.id === 'settings'
                ? false
                : currentUser && Array.isArray(currentUser.allowedPages)
                ? !currentUser.allowedPages.includes(item.id)
                : settings.pageAccess[item.id] && !settings.pageAccess[item.id].enabled;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {isBlocked && (
                  <span className="text-xs text-amber-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Gesloten
                  </span>
                )}
              </button>
            );
          })}

          {!currentUser && (
            <div className="pt-2 mt-2 border-t border-slate-800 space-y-1">
              <button
                onClick={() => handleTabClick('register')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold bg-emerald-500 text-slate-950 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Account Registreren</span>
              </button>
              <button
                onClick={() => handleTabClick('login')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Bestaand Account Inloggen</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
