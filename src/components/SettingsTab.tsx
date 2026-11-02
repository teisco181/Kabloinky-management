import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Key,
  Lock,
  Unlock,
  Users,
  Eye,
  EyeOff,
  Server,
  AlertOctagon,
  Check,
  Trash2,
  RefreshCw,
  AlertCircle,
  Plus,
  CheckSquare,
  Square,
  Sliders,
  ShieldAlert,
  Globe,
  Smartphone,
  Laptop,
  Calendar,
  MapPin,
  X,
  Clock,
  Search,
  Crown,
  Tag,
  Filter,
} from 'lucide-react';
import { ServerSettings, User, PageId, CustomPasswordItem, EventItem, Organization } from '../types';
import { StorageManager } from '../services/storage';

interface SettingsTabProps {
  settings: ServerSettings;
  onUpdateSettings: (newSettings: Partial<ServerSettings>) => void;
  currentUser: User | null;
  onRefreshUsers: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  onRefreshUsers,
}) => {
  // Gate authentication
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState('');

  // Active sub-section in settings
  const [activeSection, setActiveSection] = useState<'users' | 'security' | 'server' | 'content'>('users');

  // Content management (Events & Organizations for Admins)
  const [allEvents, setAllEvents] = useState<EventItem[]>(() => StorageManager.getEvents());
  const [allOrgs, setAllOrgs] = useState<Organization[]>(() => StorageManager.getOrganizations());
  const [contentSubTab, setContentSubTab] = useState<'events' | 'organizations'>('events');
  const [contentSearch, setContentSearch] = useState('');
  const [contentFilter, setContentFilter] = useState<'all' | 'approved' | 'pending' | 'past'>('all');
  const [adminEventToDelete, setAdminEventToDelete] = useState<EventItem | null>(null);
  const [adminOrgToDelete, setAdminOrgToDelete] = useState<Organization | null>(null);

  // Subscribe to real-time events and orgs updates
  useEffect(() => {
    const unsub = StorageManager.subscribe(() => {
      setAllEvents(StorageManager.getEvents());
      setAllOrgs(StorageManager.getOrganizations());
    });
    return () => unsub();
  }, []);

  // Users state
  const [users, setUsers] = useState<User[]>(() => StorageManager.getUsers());

  // Per-player permissions state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(() => {
    const list = StorageManager.getUsers();
    return list[0]?.id || '';
  });

  const [playerPermissionsMap, setPlayerPermissionsMap] = useState<Record<string, PageId[]>>(() => {
    const map: Record<string, PageId[]> = {};
    const list = StorageManager.getUsers();
    list.forEach((u) => {
      map[u.id] = u.allowedPages || [
        'home',
        'events',
        'organizations',
        'plans',
        'rules',
        'punishments',
        'bounties',
        'settings',
        'register',
        'login',
      ];
    });
    return map;
  });

  const [playerModeratorMap, setPlayerModeratorMap] = useState<Record<string, PageId[]>>(() => {
    const map: Record<string, PageId[]> = {};
    const list = StorageManager.getUsers();
    list.forEach((u) => {
      map[u.id] = u.moderatorPages || [];
    });
    return map;
  });

  // Security passwords state
  // 1 strictly unique Mother password (no hardcoded 'admin' fallback)
  const [motherPassword, setMotherPassword] = useState(settings.motherPassword || '');
  const [newMotherPassword, setNewMotherPassword] = useState('');
  const [newMotherPasswordConfirm, setNewMotherPasswordConfirm] = useState('');
  const [motherPasswordHint, setMotherPasswordHint] = useState(settings.motherPasswordHint || '');

  // Verification states for revealing/viewing the mother password
  const [showMotherPassword, setShowMotherPassword] = useState(false);
  const [isPromptingReveal, setIsPromptingReveal] = useState(false);
  const [revealCodeInput, setRevealCodeInput] = useState('');
  const [revealError, setRevealError] = useState('');

  // Current mother password input for changing it
  const [currentMotherPasswordForChange, setCurrentMotherPasswordForChange] = useState('');

  // Multiple Admin passwords
  const [adminPasswordsList, setAdminPasswordsList] = useState<string[]>(() => {
    const list: string[] = [];
    if (settings.adminPassword && settings.adminPassword.trim()) {
      list.push(settings.adminPassword.trim());
    }
    if (Array.isArray(settings.adminPasswords)) {
      settings.adminPasswords.forEach((p) => {
        if (p && p.trim() && !list.includes(p.trim())) {
          list.push(p.trim());
        }
      });
    }
    return list;
  });
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState('');
  const [revealedAdminIndices, setRevealedAdminIndices] = useState<Record<number, boolean>>({});

  // Multiple Server access codes
  const [serverAccessCodesList, setServerAccessCodesList] = useState<string[]>(() => {
    if (Array.isArray(settings.serverAccessCodes) && settings.serverAccessCodes.length > 0) {
      return settings.serverAccessCodes;
    }
    return [settings.serverAccessCode || 'KABLOINKY2026'];
  });
  const [newServerCodeInput, setNewServerCodeInput] = useState('');

  // Multiple Custom passwords
  const [customPasswordsList, setCustomPasswordsList] = useState<CustomPasswordItem[]>(() => {
    return Array.isArray(settings.customPasswords) ? settings.customPasswords : [];
  });
  const [newCustomLabelInput, setNewCustomLabelInput] = useState('');
  const [newCustomCodeInput, setNewCustomCodeInput] = useState('');

  // UI feedback
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [securityError, setSecurityError] = useState('');

  // Server info state
  const [serverName, setServerName] = useState(settings.serverName);
  const [serverPlatform, setServerPlatform] = useState<'both' | 'java' | 'bedrock'>(
    settings.serverPlatform || 'both'
  );
  const [serverHost, setServerHost] = useState(settings.serverHost);
  const [serverPort, setServerPort] = useState(settings.serverPort);
  const [bedrockPort, setBedrockPort] = useState(settings.bedrockPort);
  const [discordUrl, setDiscordUrl] = useState(settings.discordUrl);
  const [serverVersion, setServerVersion] = useState(settings.serverVersion);

  // Sync settings when props change
  useEffect(() => {
    setMotherPassword(settings.motherPassword || '');
    setMotherPasswordHint(settings.motherPasswordHint || '');
    const list: string[] = [];
    if (settings.adminPassword && settings.adminPassword.trim()) {
      list.push(settings.adminPassword.trim());
    }
    if (Array.isArray(settings.adminPasswords)) {
      settings.adminPasswords.forEach((p) => {
        if (p && p.trim() && !list.includes(p.trim())) {
          list.push(p.trim());
        }
      });
    }
    setAdminPasswordsList(list);
    if (Array.isArray(settings.serverAccessCodes) && settings.serverAccessCodes.length > 0) {
      setServerAccessCodesList(settings.serverAccessCodes);
    }
    if (Array.isArray(settings.customPasswords)) {
      setCustomPasswordsList(settings.customPasswords);
    }
    setServerName(settings.serverName);
    setServerPlatform(settings.serverPlatform || 'both');
    setServerHost(settings.serverHost);
    setServerPort(settings.serverPort);
    setBedrockPort(settings.bedrockPort);
    setDiscordUrl(settings.discordUrl);
    setServerVersion(settings.serverVersion);
  }, [settings]);

  // Real-time listener for user registrations from other devices/friends
  useEffect(() => {
    const unsub = StorageManager.subscribe(() => {
      refreshUsersList();
    });
    return () => unsub();
  }, []);

  const refreshUsersList = () => {
    const list = StorageManager.getUsers();
    setUsers(list);
    const permMap: Record<string, PageId[]> = {};
    const modMap: Record<string, PageId[]> = {};
    list.forEach((u) => {
      permMap[u.id] = u.allowedPages || [
        'home',
        'events',
        'organizations',
        'plans',
        'rules',
        'punishments',
        'bounties',
        'settings',
        'register',
        'login',
      ];
      modMap[u.id] = u.moderatorPages || [];
    });
    setPlayerPermissionsMap(permMap);
    setPlayerModeratorMap(modMap);
    if (!selectedPlayerId && list.length > 0) {
      setSelectedPlayerId(list[0].id);
    }
    onRefreshUsers();
  };

  const triggerSuccess = (msg: string) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isPastEvent = (eventDate: string) => {
    return !!eventDate && eventDate < todayStr;
  };

  const handleAdminDeleteEvent = (eventId: string) => {
    StorageManager.deleteEvent(eventId);
    setAllEvents(StorageManager.getEvents());
    setAdminEventToDelete(null);
    triggerSuccess('Evenement succesvol definitief verwijderd uit het systeem en de cloud.');
  };

  const handleAdminDeleteOrg = (orgId: string) => {
    StorageManager.deleteOrganization(orgId);
    setAllOrgs(StorageManager.getOrganizations());
    setAdminOrgToDelete(null);
    triggerSuccess('Organisatie succesvol definitief opgeheven en verwijderd.');
  };

  const handleAdminDeleteAllPastEvents = () => {
    const past = allEvents.filter((e) => isPastEvent(e.date));
    if (past.length === 0) return;
    past.forEach((e) => StorageManager.deleteEvent(e.id));
    setAllEvents(StorageManager.getEvents());
    triggerSuccess(`Alle ${past.length} oude / verlopen evenementen zijn definitief opgeruimd.`);
  };

  const pastEventsCount = allEvents.filter((e) => isPastEvent(e.date)).length;
  const pendingEventsCount = allEvents.filter((e) => !e.approved).length;
  const approvedEventsCount = allEvents.filter((e) => e.approved).length;

  const pendingOrgsCount = allOrgs.filter((o) => !o.approved).length;
  const approvedOrgsCount = allOrgs.filter((o) => o.approved).length;

  const filteredAdminEvents = allEvents.filter((e) => {
    if (contentFilter === 'past' && !isPastEvent(e.date)) return false;
    if (contentFilter === 'approved' && !e.approved) return false;
    if (contentFilter === 'pending' && e.approved) return false;
    if (contentSearch.trim()) {
      const q = contentSearch.toLowerCase();
      const match =
        e.title.toLowerCase().includes(q) ||
        e.authorName.toLowerCase().includes(q) ||
        (e.location && e.location.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const filteredAdminOrgs = allOrgs.filter((o) => {
    if (contentFilter === 'approved' && !o.approved) return false;
    if (contentFilter === 'pending' && o.approved) return false;
    if (contentSearch.trim()) {
      const q = contentSearch.toLowerCase();
      const match =
        o.name.toLowerCase().includes(q) ||
        o.tag.toLowerCase().includes(q) ||
        o.leaderName.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // GATE UNLOCK: Accepts either the Mother Password OR an Admin Password!
  const handleUnlockGate = (e: React.FormEvent) => {
    e.preventDefault();
    setGateError('');

    const cleanInput = gatePassword.trim();
    if (!cleanInput) return;

    if (StorageManager.verifyAdminOrMotherPassword(cleanInput)) {
      setIsUnlocked(true);
      setGatePassword('');
    } else {
      setGateError('Onjuist wachtwoord. Voer het Moederwachtwoord of een Beheerderswachtwoord in.');
    }
  };

  // Per-Player Page Access Toggle
  const handleTogglePlayerPage = (userId: string, pageId: PageId) => {
    if (pageId === 'settings') {
      triggerSuccess('De Instellingen pagina kan voor geen enkele speler worden uitgeschakeld.');
      return;
    }
    const currentPages = playerPermissionsMap[userId] || [
      'home',
      'events',
      'organizations',
      'plans',
      'rules',
      'punishments',
      'bounties',
      'settings',
      'register',
      'login',
    ];
    const hasPage = currentPages.includes(pageId);
    const updated = hasPage
      ? currentPages.filter((p) => p !== pageId)
      : [...currentPages, pageId];

    // Settings is always active
    const guaranteed = Array.from(new Set([...updated, 'settings' as PageId])) as PageId[];
    const modPages = playerModeratorMap[userId] || [];

    // If page access is turned off, also remove moderator rights for that page
    const updatedMods = hasPage ? modPages.filter((p) => p !== pageId) : modPages;

    setPlayerPermissionsMap((prev) => ({ ...prev, [userId]: guaranteed }));
    setPlayerModeratorMap((prev) => ({ ...prev, [userId]: updatedMods }));
    StorageManager.updateUserPermissions(userId, guaranteed, updatedMods);
    refreshUsersList();
    triggerSuccess(`Toegang voor "${pageId}" bijgewerkt.`);
  };

  // Per-Player Moderator Rights Toggle
  const handleTogglePlayerModerator = (userId: string, pageId: PageId) => {
    const currentMods = playerModeratorMap[userId] || [];
    const hasMod = currentMods.includes(pageId);
    const updatedMods = hasMod
      ? currentMods.filter((p) => p !== pageId)
      : [...currentMods, pageId];

    const currentPages = playerPermissionsMap[userId] || [
      'home',
      'events',
      'organizations',
      'plans',
      'rules',
      'punishments',
      'bounties',
      'settings',
      'register',
      'login',
    ];

    // If giving moderator rights, ensure player has page access
    const guaranteedPages = !hasMod
      ? (Array.from(new Set([...currentPages, pageId, 'settings' as PageId])) as PageId[])
      : currentPages;

    setPlayerModeratorMap((prev) => ({ ...prev, [userId]: updatedMods }));
    setPlayerPermissionsMap((prev) => ({ ...prev, [userId]: guaranteedPages }));
    StorageManager.updateUserPermissions(userId, guaranteedPages, updatedMods);
    refreshUsersList();
    triggerSuccess(`🛡️ Moderator rechten voor "${pageId}" bijgewerkt.`);
  };

  const handleGrantAllPlayerPages = (userId: string) => {
    const all: PageId[] = [
      'home',
      'events',
      'organizations',
      'plans',
      'rules',
      'punishments',
      'bounties',
      'settings',
      'register',
      'login',
    ];
    const currentMods = playerModeratorMap[userId] || [];
    setPlayerPermissionsMap((prev) => ({ ...prev, [userId]: all }));
    StorageManager.updateUserPermissions(userId, all, currentMods);
    refreshUsersList();
    triggerSuccess('Alle pagina-toegang toegekend aan deze speler.');
  };

  const handleSetBasicPlayerPages = (userId: string) => {
    const basic: PageId[] = ['home', 'rules', 'settings', 'register', 'login'];
    const currentMods = (playerModeratorMap[userId] || []).filter((p) => basic.includes(p));
    setPlayerPermissionsMap((prev) => ({ ...prev, [userId]: basic }));
    setPlayerModeratorMap((prev) => ({ ...prev, [userId]: currentMods }));
    StorageManager.updateUserPermissions(userId, basic, currentMods);
    refreshUsersList();
    triggerSuccess('Basis pagina-toegang ingesteld voor deze speler.');
  };

  const handleGrantAllModeratorPages = (userId: string) => {
    const allMod: PageId[] = ['events', 'organizations', 'plans', 'rules', 'punishments', 'bounties'];
    const allPages: PageId[] = [
      'home',
      'events',
      'organizations',
      'plans',
      'rules',
      'punishments',
      'bounties',
      'settings',
      'register',
      'login',
    ];
    setPlayerPermissionsMap((prev) => ({ ...prev, [userId]: allPages }));
    setPlayerModeratorMap((prev) => ({ ...prev, [userId]: allMod }));
    StorageManager.updateUserPermissions(userId, allPages, allMod);
    refreshUsersList();
    triggerSuccess('🛡️ Alle moderator-rechten toegekend aan deze speler.');
  };

  const handleClearAllModeratorPages = (userId: string) => {
    const currentPages = playerPermissionsMap[userId] || [];
    setPlayerModeratorMap((prev) => ({ ...prev, [userId]: [] }));
    StorageManager.updateUserPermissions(userId, currentPages, []);
    refreshUsersList();
    triggerSuccess('Alle moderator-rechten ingetrokken voor deze speler.');
  };

  const handleDeleteUser = (userId: string, username: string) => {
    StorageManager.deleteUser(userId);
    refreshUsersList();
    triggerSuccess(`Account ${username} verwijderd.`);
  };

  // Verification handler to reveal the Mother Password
  // Strictly checks against mother password itself!
  const handleVerifyToRevealMotherPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setRevealError('');
    const clean = revealCodeInput.trim();
    if (!clean) {
      setRevealError('Vul het Moederwachtwoord in om het te kunnen inzien.');
      return;
    }

    if (StorageManager.verifyMotherPassword(clean)) {
      setShowMotherPassword(true);
      setIsPromptingReveal(false);
      setRevealCodeInput('');
      setRevealError('');
      triggerSuccess('Moederwachtwoord succesvol geverifieerd en zichtbaar!');
    } else {
      setRevealError('Onjuist Moederwachtwoord! Toegang tot inzien geweigerd.');
    }
  };

  // Change Mother Password Handler
  const handleDirectChangeMotherPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');

    if (!currentMotherPasswordForChange.trim()) {
      setSecurityError('Vul eerst het huidige Moederwachtwoord in ter controle.');
      return;
    }

    if (!StorageManager.verifyMotherPassword(currentMotherPasswordForChange.trim())) {
      setSecurityError('Huidig Moederwachtwoord is onjuist. Wijziging geweigerd.');
      return;
    }

    if (!newMotherPassword || newMotherPassword.length < 4) {
      setSecurityError('Het nieuwe Moederwachtwoord moet minimaal 4 tekens bevatten.');
      return;
    }

    if (newMotherPassword !== newMotherPasswordConfirm) {
      setSecurityError('De nieuwe wachtwoorden komen niet overeen.');
      return;
    }

    const updated = newMotherPassword.trim();
    setMotherPassword(updated);
    onUpdateSettings({
      motherPassword: updated,
      motherPasswordHint: motherPasswordHint.trim(),
    });

    setNewMotherPassword('');
    setNewMotherPasswordConfirm('');
    setCurrentMotherPasswordForChange('');
    setShowMotherPassword(false);
    triggerSuccess('Moederwachtwoord succesvol gewijzigd!');
  };

  // Admin Passwords Handlers
  const handleAddAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    const clean = newAdminPasswordInput.trim();
    if (!clean || clean.length < 3) {
      setSecurityError('Vul een geldig beheerderswachtwoord in van minimaal 3 tekens.');
      return;
    }

    if (clean.toLowerCase() === 'admin') {
      setSecurityError('Het wachtwoord "admin" mag niet als expliciet beheerderswachtwoord worden toegevoegd.');
      return;
    }

    if (adminPasswordsList.includes(clean)) {
      setSecurityError('Dit beheerderswachtwoord bestaat al.');
      return;
    }

    const updatedList = [...adminPasswordsList, clean];
    setAdminPasswordsList(updatedList);
    onUpdateSettings({ adminPasswords: updatedList });
    setNewAdminPasswordInput('');
    triggerSuccess('Nieuw beheerderswachtwoord succesvol toegevoegd.');
  };

  const handleDeleteAdminPassword = (pwdToDelete: string) => {
    const updatedList = adminPasswordsList.filter(
      (p) => p.trim().toLowerCase() !== pwdToDelete.trim().toLowerCase()
    );
    setAdminPasswordsList(updatedList);
    const updates: Partial<ServerSettings> = {
      adminPasswords: updatedList,
      adminPassword: updatedList.length > 0 ? updatedList[0] : '',
    };
    if (
      pwdToDelete.trim().toLowerCase() === 'admin' ||
      (motherPassword && motherPassword.trim().toLowerCase() === 'admin')
    ) {
      updates.adminPassword = '';
      if (motherPassword && motherPassword.trim().toLowerCase() === 'admin') {
        setMotherPassword('');
        updates.motherPassword = '';
      }
    }
    onUpdateSettings(updates);
    triggerSuccess(`Wachtwoord "${pwdToDelete}" is definitief verwijderd en werkt nu nergens meer!`);
  };

  // Server Access Codes Handlers
  const handleAddServerCode = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    const clean = newServerCodeInput.trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setSecurityError('Vul een geldige servercode in van minimaal 3 tekens.');
      return;
    }

    if (serverAccessCodesList.includes(clean)) {
      setSecurityError('Deze servercode bestaat al.');
      return;
    }

    const updated = [...serverAccessCodesList, clean];
    setServerAccessCodesList(updated);
    onUpdateSettings({
      serverAccessCodes: updated,
      serverAccessCode: updated[0] || 'KABLOINKY2026',
    });
    setNewServerCodeInput('');
    triggerSuccess('Nieuwe server toegangscode toegevoegd.');
  };

  const handleDeleteServerCode = (codeToDelete: string) => {
    if (serverAccessCodesList.length <= 1) {
      setSecurityError('Er moet minimaal 1 server toegangscode actief blijven.');
      return;
    }
    const updated = serverAccessCodesList.filter((c) => c !== codeToDelete);
    setServerAccessCodesList(updated);
    onUpdateSettings({
      serverAccessCodes: updated,
      serverAccessCode: updated[0] || 'KABLOINKY2026',
    });
    triggerSuccess('Server toegangscode verwijderd.');
  };

  // Custom Passwords Handlers
  const handleAddCustomPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    const label = newCustomLabelInput.trim();
    const code = newCustomCodeInput.trim();

    if (!label || !code) {
      setSecurityError('Vul zowel een label als een wachtwoord/code in.');
      return;
    }

    const newItem: CustomPasswordItem = {
      id: `cp-${Date.now()}`,
      label,
      code,
      createdAt: new Date().toISOString(),
    };

    const updated = [...customPasswordsList, newItem];
    setCustomPasswordsList(updated);
    onUpdateSettings({ customPasswords: updated });
    setNewCustomLabelInput('');
    setNewCustomCodeInput('');
    triggerSuccess(`Extra wachtwoord "${label}" aangemaakt.`);
  };

  const handleDeleteCustomPassword = (id: string) => {
    const updated = customPasswordsList.filter((item) => item.id !== id);
    setCustomPasswordsList(updated);
    onUpdateSettings({ customPasswords: updated });
    triggerSuccess('Extra wachtwoord verwijderd.');
  };

  // Save Server Settings
  const handleSaveServerConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      serverName: serverName.trim(),
      serverPlatform,
      serverHost: serverHost.trim(),
      serverPort,
      bedrockPort,
      discordUrl: discordUrl.trim(),
      serverVersion: serverVersion.trim(),
    });
    triggerSuccess('Server connectie & editie instellingen succesvol opgeslagen!');
  };

  // Portal Pages Definition
  const pagesList: { id: PageId; label: string; desc: string; isModSupported: boolean }[] = [
    { id: 'home', label: 'Home (Overzicht & Status)', desc: 'Dashboard, server banner, live status en statistieken.', isModSupported: false },
    { id: 'events', label: 'Evenementen (Agenda)', desc: 'Evenementen inzien en bijwonen.', isModSupported: true },
    { id: 'organizations', label: 'Organisaties (Facties/Gildes)', desc: 'Organisaties bekijken en lidmaatschappen beheren.', isModSupported: true },
    { id: 'plans', label: 'Plannen (Bouwprojecten)', desc: 'Publieke plannen, ideeën en commentaarsectie.', isModSupported: true },
    { id: 'rules', label: 'Regels (Wetboek)', desc: 'Server reglement en sanctierichtlijnen inzien.', isModSupported: true },
    { id: 'punishments', label: 'Sancties (Strafblad)', desc: 'Overzicht van waarschuwingen, kicks en bans.', isModSupported: true },
    { id: 'bounties', label: 'Bountys (Premies)', desc: 'Vogelvrij verklaarde spelers en beloningen.', isModSupported: true },
    { id: 'settings', label: 'Instellingen', desc: 'Beheerder & configuratie paneel (Blijft permanent actief).', isModSupported: false },
  ];

  const selectedPlayer = users.find((u) => u.id === selectedPlayerId);
  const selectedPlayerPages = selectedPlayerId
    ? playerPermissionsMap[selectedPlayerId] || [
        'home',
        'events',
        'organizations',
        'plans',
        'rules',
        'punishments',
        'bounties',
        'settings',
        'register',
        'login',
      ]
    : [];
  const selectedPlayerModeratorPages = selectedPlayerId
    ? playerModeratorMap[selectedPlayerId] || []
    : [];

  // GATE LOCKED SCREEN: Either Mother Password or Admin Password unlocks!
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-fade-in">
        <div className="bg-[#131923] border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 uppercase tracking-wider">
              Beveiligde Beheerzone
            </span>
            <h1 className="text-xl font-bold text-white mt-2">Instellingen Vergrendeld</h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Voer het <strong>Moederwachtwoord</strong> of een geldig <strong>Beheerderswachtwoord</strong> in om het instellingenpaneel te openen.
            </p>
          </div>

          {gateError && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs">
              {gateError}
            </div>
          )}

          <form onSubmit={handleUnlockGate} className="space-y-3 pt-2">
            <div>
              <input
                type="password"
                autoFocus
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                placeholder="Vul Moeder- of Beheerderswachtwoord in..."
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-center font-mono"
              />
            </div>

            {settings.motherPasswordHint && (
              <p className="text-[11px] text-slate-500 italic">
                Hint: {settings.motherPasswordHint}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md"
            >
              <Unlock className="w-4 h-4" />
              <span>Instellingen Ontgrendelen</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // UNLOCKED SETTINGS PANEL
  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Settings className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Systeem &amp; Beheerder Instellingen
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Beheer individuele speler-permissies, beveiligingswachtwoorden en server editie.
          </p>
        </div>

        <button
          onClick={() => {
            setIsUnlocked(false);
            setShowMotherPassword(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700 self-start sm:self-auto"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Vergrendel Paneel</span>
        </button>
      </div>

      {saveSuccessMessage && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Settings Navigation Tabs (Unified: Accounts & Permissies, Wachtwoorden, Server) */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSection('users')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
            activeSection === 'users'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Accounts &amp; Speler Permissies ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('security')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
            activeSection === 'security'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Wachtwoorden &amp; Beveiliging</span>
        </button>

        <button
          onClick={() => setActiveSection('server')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
            activeSection === 'server'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Server IP, Editie &amp; Connectie</span>
        </button>

        <button
          onClick={() => setActiveSection('content')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
            activeSection === 'content'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Evenementen &amp; Organisaties Beheer ({allEvents.length + allOrgs.length})</span>
        </button>
      </div>

      {/* SECTION 1: ACCOUNTS & PER-PLAYER PERMISSIONS (NO ROLES GATING) */}
      {activeSection === 'users' && (
        <div className="space-y-6">
          <div className="bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sliders className="w-5 h-5" />
              <h2 className="text-base font-bold text-white">
                Accounts &amp; Individuele Speler Permissies
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Er zijn geen rollen-beperkingen meer op pagina&apos;s. Je kunt hieronder <strong>per speler</strong> direct aanklikken tot welke pagina&apos;s ze <strong>toegang</strong> hebben én op welke pagina&apos;s ze <strong>🛡️ moderator-rechten</strong> hebben (zoals goedkeuren, regels/sancties toevoegen, etc.).
              <span className="block mt-1 text-amber-400 font-semibold">
                🔒 De Instellingen pagina kan nooit worden uitgeschakeld en blijft altijd actief.
              </span>
            </p>
          </div>

          {users.length === 0 ? (
            <div className="p-8 text-center bg-[#131923] border border-slate-800 rounded-xl space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                Nog geen geregistreerde spelers gevonden.
              </p>
              <p className="text-xs text-slate-500">
                Zodra spelers registreren via de Registratie pagina, verschijnen ze hier om pagina-permissies en moderator-toegang toe te wijzen.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Player Selector (4 cols) */}
              <div className="lg:col-span-4 bg-[#131923] border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Speler Selecteren ({users.length})
                  </span>
                  <button
                    onClick={refreshUsersList}
                    className="p-1 text-slate-400 hover:text-white rounded bg-slate-800"
                    title="Vernieuwen"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isSelected = selectedPlayer?.id === u.id;
                    const pagesCount = (playerPermissionsMap[u.id] || u.allowedPages || []).length;
                    const modCount = (playerModeratorMap[u.id] || u.moderatorPages || []).length;

                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedPlayerId(u.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={u.avatarUrl || `https://mc-heads.net/avatar/${u.username}/32`}
                            alt={u.username}
                            className="w-8 h-8 rounded border border-slate-700 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold font-mono block truncate">
                              {u.username}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400">
                                {pagesCount} tabs
                              </span>
                              {modCount > 0 && (
                                <span className="text-[10px] text-amber-400 font-mono font-semibold flex items-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5" /> {modCount} mod
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(u.id, u.username);
                          }}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                          title="Account verwijderen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Page Permissions & Moderator Access for Selected Player (8 cols) */}
              <div className="lg:col-span-8 bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                {selectedPlayer ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            selectedPlayer.avatarUrl ||
                            `https://mc-heads.net/avatar/${selectedPlayer.username}/48`
                          }
                          alt={selectedPlayer.username}
                          className="w-10 h-10 rounded-lg border border-slate-700 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white font-mono">
                              {selectedPlayer.username}
                            </h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              Lid sinds {selectedPlayer.createdAt.split('T')[0]}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Vink hieronder aan tot welke pagina&apos;s deze speler toegang heeft én waar hij/zij moderator is.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleGrantAllPlayerPages(selectedPlayer.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-semibold rounded transition-colors border border-slate-700"
                        >
                          Alle Toegang
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGrantAllModeratorPages(selectedPlayer.id)}
                          className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-[11px] font-semibold rounded transition-colors border border-amber-800/40"
                        >
                          🛡️ Alle Mod
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearAllModeratorPages(selectedPlayer.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded transition-colors border border-slate-700"
                        >
                          Geen Mod
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetBasicPlayerPages(selectedPlayer.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-semibold rounded transition-colors border border-slate-700"
                        >
                          Basis
                        </button>
                      </div>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
                      <div className="col-span-6 sm:col-span-6">Pagina</div>
                      <div className="col-span-3 sm:col-span-3 text-center">Toegang</div>
                      <div className="col-span-3 sm:col-span-3 text-center">🛡️ Moderator</div>
                    </div>

                    {/* Pages List with Dual Checkboxes */}
                    <div className="divide-y divide-slate-800/80">
                      {pagesList.map((page) => {
                        const isSettings = page.id === 'settings';
                        const isAllowed = isSettings ? true : selectedPlayerPages.includes(page.id);
                        const isModerator = selectedPlayerModeratorPages.includes(page.id);

                        return (
                          <div
                            key={page.id}
                            className={`py-3 grid grid-cols-12 items-center gap-2 transition-colors ${
                              isAllowed ? 'bg-transparent' : 'opacity-60'
                            }`}
                          >
                            {/* Page Info */}
                            <div className="col-span-6 sm:col-span-6">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white font-mono">
                                  {page.label}
                                </span>
                                {isSettings && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    Vast
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{page.desc}</p>
                            </div>

                            {/* Column 1: Page Access Checkbox */}
                            <div className="col-span-3 sm:col-span-3 flex justify-center">
                              <button
                                type="button"
                                disabled={isSettings}
                                onClick={() => handleTogglePlayerPage(selectedPlayer.id, page.id)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                                  isSettings
                                    ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40 cursor-not-allowed opacity-90'
                                    : isAllowed
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                                }`}
                                title={isSettings ? 'Altijd actief' : isAllowed ? 'Toegang uitzetten' : 'Toegang aanzetten'}
                              >
                                {isAllowed ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-600" />
                                )}
                                <span className="hidden sm:inline">
                                  {isSettings ? 'Actief' : isAllowed ? 'Toegang' : 'Geen'}
                                </span>
                              </button>
                            </div>

                            {/* Column 2: Moderator Access Checkbox */}
                            <div className="col-span-3 sm:col-span-3 flex justify-center">
                              {page.isModSupported ? (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlayerModerator(selectedPlayer.id, page.id)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                                    isModerator
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                                      : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                                  }`}
                                  title={isModerator ? 'Moderator-rechten intrekken' : 'Moderator-rechten toekennen'}
                                >
                                  {isModerator ? (
                                    <CheckSquare className="w-4 h-4 text-amber-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-600" />
                                  )}
                                  <span className="hidden sm:inline">
                                    {isModerator ? 'Moderator' : 'Lid'}
                                  </span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-600 italic">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Selecteer een speler aan de linkerkant om permissies te configureren.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PASSWORDS & SECURITY */}
      {activeSection === 'security' && (
        <div className="space-y-6">
          {securityError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{securityError}</span>
            </div>
          )}

          {/* 1. STRICTLY 1 MOTHER PASSWORD SECTION */}
          <div className="bg-[#131923] border border-emerald-500/40 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                <Shield className="w-4 h-4" />
                <span>1. Het Moederwachtwoord (Strikte Hoofdbeveiliging)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                1 UNIEK HOOFDWACHTWOORD
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Het Moederwachtwoord is het ultieme hoofdwachtwoord. Om het Moederwachtwoord te mogen <strong>inzien</strong>,
              moet je verplicht <strong>het Moederwachtwoord zelf invullen</strong>. Beheerderswachtwoorden hebben geen toegang tot het inzien van het Moederwachtwoord.
            </p>

            {/* Locked / Revealed Display */}
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Status Moederwachtwoord:
                </span>
                {showMotherPassword ? (
                  <button
                    type="button"
                    onClick={() => setShowMotherPassword(false)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Verbergen &amp; Vergrendelen</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPromptingReveal(true);
                      setRevealError('');
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/40 rounded-lg flex items-center gap-1.5 font-semibold transition-colors self-start sm:self-auto shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inzien (Moederwachtwoord Vereist)</span>
                  </button>
                )}
              </div>

              {/* Revealed State */}
              {showMotherPassword ? (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/50 rounded-lg flex items-center justify-between gap-3 animate-fade-in">
                  <div className="font-mono text-base font-bold text-emerald-300 tracking-wider">
                    {motherPassword}
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    GEVERIFIEERD
                  </span>
                </div>
              ) : isPromptingReveal ? (
                /* Verification Prompt to Reveal Mother Password */
                <form
                  onSubmit={handleVerifyToRevealMotherPassword}
                  className="p-3.5 bg-slate-900/90 border border-amber-500/50 rounded-lg space-y-2.5 animate-fade-in shadow-inner"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Vul het Moederwachtwoord in om het te mogen inzien:</span>
                  </div>

                  {revealError && (
                    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{revealError}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="password"
                      autoFocus
                      value={revealCodeInput}
                      onChange={(e) => {
                        setRevealCodeInput(e.target.value);
                        setRevealError('');
                      }}
                      placeholder="Vul Moederwachtwoord in..."
                      className="flex-1 bg-black/70 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-md"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Ontgrendel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPromptingReveal(false);
                        setRevealCodeInput('');
                        setRevealError('');
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </form>
              ) : (
                /* Masked Locked State */
                <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg flex items-center justify-between">
                  <span className="font-mono text-sm text-slate-500">••••••••••••••••</span>
                  <span className="text-[10px] text-slate-500 italic flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Vergrendeld (Niet zichtbaar zonder Moederwachtwoord)
                  </span>
                </div>
              )}
            </div>

            {/* Change Mother Password Form */}
            <form onSubmit={handleDirectChangeMotherPassword} className="space-y-3 max-w-xl pt-2">
              <span className="text-xs font-bold text-white block">
                Moederwachtwoord Wijzigen:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Huidig Moederwachtwoord (ter controle):
                  </label>
                  <input
                    type="password"
                    value={currentMotherPasswordForChange}
                    onChange={(e) => setCurrentMotherPasswordForChange(e.target.value)}
                    placeholder="Vul huidige Moederwachtwoord in..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Nieuw Moederwachtwoord:
                  </label>
                  <input
                    type="password"
                    value={newMotherPassword}
                    onChange={(e) => setNewMotherPassword(e.target.value)}
                    placeholder="Vul nieuw wachtwoord in..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Bevestig Moederwachtwoord:
                  </label>
                  <input
                    type="password"
                    value={newMotherPasswordConfirm}
                    onChange={(e) => setNewMotherPasswordConfirm(e.target.value)}
                    placeholder="Herhaal nieuw wachtwoord..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Wachtwoord Hint (Optioneel):
                </label>
                <input
                  type="text"
                  value={motherPasswordHint}
                  onChange={(e) => setMotherPasswordHint(e.target.value)}
                  placeholder="bijv. Naam eerste huisdier"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Moederwachtwoord Opslaan</span>
              </button>
            </form>
          </div>

          {/* 2. MULTIPLE ADMIN PASSWORDS SECTION (NO 'admin' PREPOPULATED) */}
          <div className="bg-[#131923] border border-amber-500/40 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                <Shield className="w-4 h-4" />
                <span>2. Beheerderswachtwoorden (Meerdere Toegestaan)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {adminPasswordsList.length} ACTIEVE WACHTWOORDEN
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Hier kun je <strong>extra beheerderswachtwoorden toevoegen</strong> voor mede-beheerders. Elk van deze wachtwoorden geeft ook toegang tot het instellingenpaneel, maar <strong>kan het Moederwachtwoord niet inzien</strong>.
            </p>

            {/* List of active admin passwords */}
            <div className="space-y-2 max-w-xl">
              {adminPasswordsList.length === 0 ? (
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400">
                  Er zijn momenteel geen aparte beheerderswachtwoorden ingesteld. Voeg er hieronder optioneel een toe. Met het Moederwachtwoord kun je altijd inloggen.
                </div>
              ) : (
                adminPasswordsList.map((pwd, idx) => {
                  const isRevealed = !!revealedAdminIndices[idx];

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                        <span className="font-mono text-xs text-amber-300">
                          {isRevealed ? pwd : '••••••••••••'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedAdminIndices((prev) => ({ ...prev, [idx]: !prev[idx] }))
                          }
                          className="p-1 text-slate-400 hover:text-white rounded"
                          title={isRevealed ? 'Verbergen' : 'Weergeven'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAdminPassword(pwd)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                          title="Wachtwoord verwijderen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add new admin password form */}
            <form onSubmit={handleAddAdminPassword} className="flex gap-2 max-w-xl pt-2">
              <input
                type="text"
                value={newAdminPasswordInput}
                onChange={(e) => setNewAdminPasswordInput(e.target.value)}
                placeholder="Voeg nieuw beheerderswachtwoord toe..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Toevoegen</span>
              </button>
            </form>
          </div>

          {/* 3. MULTIPLE SERVER ACCESS CODES */}
          <div className="bg-[#131923] border border-cyan-500/40 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                <Lock className="w-4 h-4" />
                <span>3. Server Toegangscodes (Voor Bezoekers op Home)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {serverAccessCodesList.length} ACTIEVE CODES
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Spelers voeren deze code in op de Home tab om het Server IP en Discord kanalen te ontgrendelen.
            </p>

            <div className="space-y-2 max-w-xl">
              {serverAccessCodesList.map((code, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                    <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider">
                      {code}
                    </span>
                  </div>

                  {serverAccessCodesList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteServerCode(code)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                      title="Code verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddServerCode} className="flex gap-2 max-w-xl pt-2">
              <input
                type="text"
                value={newServerCodeInput}
                onChange={(e) => setNewServerCodeInput(e.target.value)}
                placeholder="Nieuwe code (bijv. SMP2026)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Code Toevoegen</span>
              </button>
            </form>
          </div>

          {/* 4. CUSTOM / MULTIPLE ROLE PASSWORDS */}
          <div className="bg-[#131923] border border-purple-500/40 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
                <Key className="w-4 h-4" />
                <span>4. Extra Wachtwoorden &amp; Sleutels</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                {customPasswordsList.length} EXTRA
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Maak aangepaste wachtwoorden voor specifieke groepen zoals builders, moderators of VIP leden.
            </p>

            <div className="space-y-2 max-w-xl">
              {customPasswordsList.length === 0 ? (
                <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg text-xs text-slate-500 italic">
                  Nog geen extra wachtwoorden aangemaakt.
                </div>
              ) : (
                customPasswordsList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{item.label}</span>
                      <span className="font-mono text-xs text-purple-300">{item.code}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCustomPassword(item.id)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddCustomPassword} className="space-y-2 max-w-xl pt-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newCustomLabelInput}
                  onChange={(e) => setNewCustomLabelInput(e.target.value)}
                  placeholder="Label (bijv. Bouwteam Code)"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  value={newCustomCodeInput}
                  onChange={(e) => setNewCustomCodeInput(e.target.value)}
                  placeholder="Wachtwoord / Code"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Extra Wachtwoord Aanmaken</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 3: SERVER IP, EDITIE & CONNECTIE */}
      {activeSection === 'server' && (
        <div className="bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">Server Connectie &amp; Editie Instellingen</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configureer de naam van de server, de editie (Java, Bedrock of Beide) en de IP connectiegegevens.
            </p>
          </div>

          <form onSubmit={handleSaveServerConfig} className="space-y-5 max-w-xl">
            {/* Server Name */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Server Naam (Titel)
              </label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Supported Server Edition (Both, Java only, Bedrock only) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Ondersteunde Server Editie (Klik om direct op te slaan):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setServerPlatform('both');
                    onUpdateSettings({ serverPlatform: 'both' });
                    triggerSuccess('Server editie ingesteld op: Beide (Java & Bedrock Crossplay)');
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all relative ${
                    serverPlatform === 'both'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold block text-white">Beide (Crossplay)</span>
                      {serverPlatform === 'both' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Java &amp; Bedrock samen</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setServerPlatform('java');
                    onUpdateSettings({ serverPlatform: 'java' });
                    triggerSuccess('Server editie ingesteld op: Alleen Java Edition');
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all relative ${
                    serverPlatform === 'java'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold block text-white">Alleen Java</span>
                      {serverPlatform === 'java' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">PC / Mac / Linux</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setServerPlatform('bedrock');
                    onUpdateSettings({ serverPlatform: 'bedrock' });
                    triggerSuccess('Server editie ingesteld op: Alleen Bedrock Edition');
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all relative ${
                    serverPlatform === 'bedrock'
                      ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-lg ring-1 ring-cyan-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold block text-white">Alleen Bedrock</span>
                      {serverPlatform === 'bedrock' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Mobile, Console, Windows</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Host & Java Port */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Minecraft Server Host / IP
                </label>
                <input
                  type="text"
                  value={serverHost}
                  onChange={(e) => setServerHost(e.target.value)}
                  placeholder="bijv. mc.kabloinky.nl of play.hypixel.net"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Java Poort</label>
                <input
                  type="number"
                  value={serverPort}
                  onChange={(e) => setServerPort(Number(e.target.value))}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Bedrock Port & Version Label */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Bedrock Poort (Geyser)
                </label>
                <input
                  type="number"
                  value={bedrockPort}
                  onChange={(e) => setBedrockPort(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Server Versie Label
                </label>
                <input
                  type="text"
                  value={serverVersion}
                  onChange={(e) => setServerVersion(e.target.value)}
                  placeholder="bijv. 1.21.1 Paper"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Discord URL */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Discord Uitnodigingslink
              </label>
              <input
                type="url"
                value={discordUrl}
                onChange={(e) => setDiscordUrl(e.target.value)}
                placeholder="https://discord.gg/..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-md flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Connectie Instellingen Opslaan</span>
            </button>
          </form>

          {/* Reset / Danger Zone */}
          <div className="pt-6 border-t border-slate-800">
            <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                <AlertOctagon className="w-4 h-4" />
                <span>Gevarenzone: Fabrieksinstellingen</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Herstel alle portaal-gegevens, wis alle aangemaakte accounts en zet de standaardwaarden terug.
              </p>
              <button
                onClick={() => {
                  StorageManager.resetToDefaults();
                  window.location.reload();
                }}
                className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 font-bold text-xs rounded border border-red-700 transition-colors"
              >
                Data Volledig Resetten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: EVENEMENTEN & ORGANISATIES BEHEER (BEHEERDERSVERWIJDERPANEEL) */}
      {activeSection === 'content' && (
        <div className="space-y-6">
          {/* Section banner */}
          <div className="bg-[#131923] border border-amber-500/40 rounded-xl p-5 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
              <h2 className="text-base font-bold text-white">
                Beheerderspaneel: Evenementen &amp; Organisaties Verwijderen
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Als beheerder (beveiligd met je <strong>Moeder- of Beheerderswachtwoord</strong>) heb je hier volledige autoriteit om oude of verlopen evenementen op te schonen en ongepaste of inactieve organisaties definitief te verwijderen.
            </p>
          </div>

          {/* Sub-tabs: Evenementen vs Organisaties */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131923] border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setContentSubTab('events');
                  setContentFilter('all');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
                  contentSubTab === 'events'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Evenementen Beheer ({allEvents.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setContentSubTab('organizations');
                  setContentFilter('all');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors ${
                  contentSubTab === 'organizations'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Organisaties Beheer ({allOrgs.length})</span>
              </button>
            </div>

            {/* Bulk delete past events if on events subtab */}
            {contentSubTab === 'events' && pastEventsCount > 0 && (
              <button
                type="button"
                onClick={handleAdminDeleteAllPastEvents}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700 rounded-lg text-xs font-bold transition-colors"
                title="Verwijder in één keer alle evenementen waarvan de datum al voorbij is"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ruim Alle {pastEventsCount} Verlopen Evenementen Op</span>
              </button>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
                placeholder={
                  contentSubTab === 'events'
                    ? 'Zoek evenement op titel, aanmaker of locatie...'
                    : 'Zoek organisatie op naam, clantag of leider...'
                }
                className="w-full bg-[#131923] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              {contentSearch && (
                <button
                  type="button"
                  onClick={() => setContentSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setContentFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  contentFilter === 'all'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Alle ({contentSubTab === 'events' ? allEvents.length : allOrgs.length})
              </button>

              {contentSubTab === 'events' && (
                <button
                  type="button"
                  onClick={() => setContentFilter('past')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    contentFilter === 'past'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Oud / Verlopen ({pastEventsCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setContentFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  contentFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                In Afwachting ({contentSubTab === 'events' ? pendingEventsCount : pendingOrgsCount})
              </button>

              <button
                type="button"
                onClick={() => setContentFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  contentFilter === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Goedgekeurd ({contentSubTab === 'events' ? approvedEventsCount : approvedOrgsCount})
              </button>
            </div>
          </div>

          {/* SUBTAB 1: EVENTS LIST */}
          {contentSubTab === 'events' && (
            <div className="space-y-3">
              {filteredAdminEvents.length === 0 ? (
                <div className="bg-[#131923] border border-slate-800 rounded-xl p-8 text-center space-y-2">
                  <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Geen evenementen gevonden</p>
                  <p className="text-xs text-slate-500">
                    Er zijn geen evenementen die voldoen aan de geselecteerde zoek- of filtercriteria.
                  </p>
                </div>
              ) : (
                filteredAdminEvents.map((ev) => {
                  const past = isPastEvent(ev.date);

                  return (
                    <div
                      key={ev.id}
                      className={`bg-[#131923] border rounded-xl p-4 shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        past
                          ? 'border-red-900/40 bg-[#161218]'
                          : ev.approved
                          ? 'border-slate-800'
                          : 'border-amber-500/40'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {past && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                              <Clock className="w-3 h-3" /> Verlopen / Oud Evenement
                            </span>
                          )}

                          {ev.approved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                              <Check className="w-3 h-3" /> Goedgekeurd
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                              <Clock className="w-3 h-3" /> Wacht op Goedkeuring
                            </span>
                          )}

                          <span className="text-xs text-slate-400 font-mono">
                            Aanmaker:{' '}
                            <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded">
                              {ev.authorName}
                            </strong>
                            {ev.authorType === 'organization' && ' (Organisatie)'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white">{ev.title}</h3>

                        {ev.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">
                            {ev.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 pt-1">
                          <span className="flex items-center gap-1 text-emerald-300">
                            <Calendar className="w-3.5 h-3.5" /> {ev.date} om {ev.time}
                          </span>
                          <span className="flex items-center gap-1 text-cyan-300">
                            <MapPin className="w-3.5 h-3.5" /> {ev.location}
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Users className="w-3.5 h-3.5" /> {ev.attendees?.length || 0} deelnemers
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => setAdminEventToDelete(ev)}
                          className="px-3.5 py-2 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/80 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Verwijder Evenement</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SUBTAB 2: ORGANIZATIONS LIST */}
          {contentSubTab === 'organizations' && (
            <div className="space-y-3">
              {filteredAdminOrgs.length === 0 ? (
                <div className="bg-[#131923] border border-slate-800 rounded-xl p-8 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Geen organisaties gevonden</p>
                  <p className="text-xs text-slate-500">
                    Er zijn geen organisaties die voldoen aan de zoekopdracht.
                  </p>
                </div>
              ) : (
                filteredAdminOrgs.map((org) => (
                  <div
                    key={org.id}
                    className={`bg-[#131923] border rounded-xl p-4 shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      org.approved ? 'border-slate-800' : 'border-amber-500/40 bg-[#17141f]'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: org.bannerColor || '#10b981' }}
                        />
                        <span className="font-bold text-white text-base">{org.name}</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-800 text-emerald-400 border border-slate-700">
                          {org.tag}
                        </span>

                        {org.approved ? (
                          <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                            Actief
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                            Wacht op Goedkeuring
                          </span>
                        )}
                      </div>

                      {org.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">
                          {org.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                        <span className="flex items-center gap-1.5 text-amber-300">
                          <Crown className="w-3.5 h-3.5" /> Leider / Aanmaker:{' '}
                          <strong className="text-white">{org.leaderName}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Users className="w-3.5 h-3.5" /> {org.members?.length || 0} Leden
                        </span>
                        {org.hqCoordinates && (
                          <span className="flex items-center gap-1 text-cyan-300">
                            <MapPin className="w-3.5 h-3.5" /> {org.hqCoordinates}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => setAdminOrgToDelete(org)}
                        className="px-3.5 py-2 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/80 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Organisatie Opheffen / Verwijderen</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL: ADMIN EVENT DELETION */}
      {adminEventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131923] border border-red-500/40 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setAdminEventToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Evenement Definitief Verwijderen</h3>
                <p className="text-xs text-red-300">Beheerdersactie via Moeder-/Beheerderswachtwoord</p>
              </div>
            </div>

            <div className="my-4 p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
              <span className="text-xs font-mono font-bold text-emerald-400 block">
                {adminEventToDelete.date} om {adminEventToDelete.time} · {adminEventToDelete.location}
              </span>
              <p className="text-sm font-bold text-white">{adminEventToDelete.title}</p>
              <p className="text-xs text-slate-400">Aanmaker: {adminEventToDelete.authorName}</p>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Weet je zeker dat je dit evenement definitief wilt verwijderen uit de agenda en de cloud database?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAdminEventToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => handleAdminDeleteEvent(adminEventToDelete.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Definitief Verwijderen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: ADMIN ORG DELETION */}
      {adminOrgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131923] border border-red-500/40 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setAdminOrgToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Organisatie Definitief Opheffen</h3>
                <p className="text-xs text-red-300">Beheerdersactie via Moeder-/Beheerderswachtwoord</p>
              </div>
            </div>

            <div className="my-4 p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{adminOrgToDelete.name}</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{adminOrgToDelete.tag}</span>
              </div>
              <p className="text-xs text-slate-400">
                Oprichter / Leider: {adminOrgToDelete.leaderName} · {adminOrgToDelete.members?.length || 0} leden
              </p>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Weet je zeker dat je deze organisatie definitief wilt ontbinden en verwijderen? Alle leden worden ontkoppeld en de organisatie verdwijnt uit het portaal en de cloud database.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAdminOrgToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => handleAdminDeleteOrg(adminOrgToDelete.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Organisatie Definitief Verwijderen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
