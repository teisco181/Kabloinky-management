import {
  User,
  Role,
  ServerSettings,
  EventItem,
  Organization,
  PrivateNote,
  PublicPlan,
  PlanComment,
  ServerRule,
  PunishmentRecord,
  BountyRecord,
  NotificationItem,
  PageId,
} from '../types';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

const STORAGE_KEYS = {
  USERS: 'craftbeheer_users_v2',
  CURRENT_USER: 'craftbeheer_current_user_v2',
  SETTINGS: 'craftbeheer_settings_v2',
  EVENTS: 'craftbeheer_events_v2',
  ORGS: 'craftbeheer_orgs_v2',
  NOTES: 'craftbeheer_notes_v2',
  PLANS: 'craftbeheer_plans_v2',
  COMMENTS: 'craftbeheer_comments_v2',
  RULES: 'craftbeheer_rules_v2',
  PUNISHMENTS: 'craftbeheer_punishments_v2',
  BOUNTIES: 'craftbeheer_bounties_v2',
  NOTIFICATIONS: 'craftbeheer_notifications_v2',
};

// Play subtle UI chime for notifications
export function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Ignore audio context errors silently
  }
}

// Request Browser Push Notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

// Secure password hashing for player accounts
export function hashUserPassword(password: string): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x5bd1e995;
  const str = `kabloinky_auth_salt_${password.trim()}`;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 ^= ch;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 = Math.imul(hash2 ^ ch, 0x5bd1e995);
    hash2 ^= hash2 >>> 15;
  }
  return `${(hash1 >>> 0).toString(16)}-${(hash2 >>> 0).toString(16)}`;
}

// Default initial server settings
// Strictly NO hardcoded motherPassword or admin bypass!
const DEFAULT_SETTINGS: ServerSettings = {
  serverName: 'Kabloinky SMP',
  serverHost: 'play.hypixel.net',
  serverPort: 25565,
  bedrockPort: 19132,
  serverPlatform: 'both', // 'both' | 'java' | 'bedrock'
  discordUrl: 'https://discord.gg/minecraft',
  serverVersion: '1.21.1 Paper / Purpur',
  serverAccessCode: 'KABLOINKY2026',
  serverAccessCodes: ['KABLOINKY2026'],
  adminPassword: 'kabloinky2026',
  adminPasswords: ['kabloinky2026'],
  motherPassword: 'kabloinky2026',
  motherPasswordHint: 'Standaard sleutel: kabloinky2026',
  customPasswords: [],
  pageAccess: {
    home: { enabled: true },
    events: { enabled: true },
    organizations: { enabled: true },
    plans: { enabled: true },
    rules: { enabled: true },
    punishments: { enabled: true },
    bounties: { enabled: true },
    settings: { enabled: true }, // Settings can NEVER be disabled
    register: { enabled: true },
    login: { enabled: true },
  },
};

// Pure empty datasets: Only items created by real players/admins
const DEFAULT_RULES: ServerRule[] = [];
const DEFAULT_PUNISHMENTS: PunishmentRecord[] = [];
const DEFAULT_BOUNTIES: BountyRecord[] = [];
const DEFAULT_ORGS: Organization[] = [];
const DEFAULT_EVENTS: EventItem[] = [];
const DEFAULT_PLANS: PublicPlan[] = [];
const DEFAULT_COMMENTS: PlanComment[] = [];
const DEFAULT_NOTIFICATIONS: NotificationItem[] = [];

// Helper to safely load from local storage
function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

// Set of known test usernames from previous seed data
const TEST_USERNAMES = new Set([
  'drakenleider',
  'steve_nl',
  'bouwmeester',
  'pistonpiet',
  'redstonerick',
  'grieferrick_09',
  'darkknightnl',
  'xraymaster99',
  'pixelbouwer',
  'lisacraft',
  'schaduwkrijger',
  'valko_pvp',
]);

// Determine if any record is an old mock/test entity
export function isTestItem(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  const id = String(item.id || '');
  if (
    id.startsWith('user-sample-') ||
    id.startsWith('org-sample-') ||
    id.startsWith('event-sample-') ||
    id.startsWith('plan-sample-') ||
    id.startsWith('rule-sample-') ||
    id.startsWith('punish-sample-') ||
    id.startsWith('bounty-sample-') ||
    id.startsWith('comm-sample-') ||
    id.startsWith('note-sample-')
  ) {
    return true;
  }
  if (/^(org|event|plan|rule|punish|bounty|comm|note)-[1-9]$/.test(id)) {
    return true;
  }
  return false;
}

// Listeners set for real-time reactivity
type ListenerCallback = () => void;
const subscribers = new Set<ListenerCallback>();
let cloudConnected = false;

// Global Storage Manager with Real-time Cloud Firestore Synchronization
export class StorageManager {
  static isCloudActive(): boolean {
    return cloudConnected;
  }

  // Subscribe to changes in real-time
  static subscribe(callback: ListenerCallback): () => void {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  static notifyListeners(): void {
    subscribers.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Storage listener error:', e);
      }
    });
  }

  // Purge any legacy mock/test items unconditionally from localStorage
  static cleanTestArtifacts(): void {
    try {
      const orgs = loadStorage<Organization[]>(STORAGE_KEYS.ORGS, []).filter((o) => !isTestItem(o));
      saveStorage(STORAGE_KEYS.ORGS, orgs);

      const events = loadStorage<EventItem[]>(STORAGE_KEYS.EVENTS, []).filter((e) => !isTestItem(e));
      saveStorage(STORAGE_KEYS.EVENTS, events);

      const plans = loadStorage<PublicPlan[]>(STORAGE_KEYS.PLANS, []).filter((p) => !isTestItem(p));
      saveStorage(STORAGE_KEYS.PLANS, plans);

      const comments = loadStorage<PlanComment[]>(STORAGE_KEYS.COMMENTS, []).filter((c) => !isTestItem(c));
      saveStorage(STORAGE_KEYS.COMMENTS, comments);

      const rules = loadStorage<ServerRule[]>(STORAGE_KEYS.RULES, []).filter((r) => !isTestItem(r));
      saveStorage(STORAGE_KEYS.RULES, rules);

      const punishments = loadStorage<PunishmentRecord[]>(STORAGE_KEYS.PUNISHMENTS, []).filter(
        (p) => !isTestItem(p)
      );
      saveStorage(STORAGE_KEYS.PUNISHMENTS, punishments);

      const bounties = loadStorage<BountyRecord[]>(STORAGE_KEYS.BOUNTIES, []).filter((b) => !isTestItem(b));
      saveStorage(STORAGE_KEYS.BOUNTIES, bounties);

      const users = loadStorage<User[]>(STORAGE_KEYS.USERS, []).filter((u) => !isTestItem(u));
      saveStorage(STORAGE_KEYS.USERS, users);

      const currentUser = loadStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
      if (currentUser && isTestItem(currentUser)) {
        saveStorage(STORAGE_KEYS.CURRENT_USER, null);
      }
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  }

  // Settings
  static getSettings(): ServerSettings {
    const loaded = loadStorage<ServerSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const primaryAdmin = loaded.adminPassword || '';
    const primaryCode = loaded.serverAccessCode || 'KABLOINKY2026';

    const rawAdminList = Array.isArray(loaded.adminPasswords) ? loaded.adminPasswords : [];
    const rawServerCodes = Array.isArray(loaded.serverAccessCodes) ? loaded.serverAccessCodes : [];
    const mergedServerCodes =
      rawServerCodes.length > 0 ? rawServerCodes : [primaryCode || 'KABLOINKY2026'];

    const merged: ServerSettings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      serverPlatform: loaded.serverPlatform || 'both',
      motherPassword: loaded.motherPassword || '',
      adminPassword: primaryAdmin,
      adminPasswords: rawAdminList,
      serverAccessCode: primaryCode || 'KABLOINKY2026',
      serverAccessCodes: mergedServerCodes,
      customPasswords: Array.isArray(loaded.customPasswords) ? loaded.customPasswords : [],
      pageAccess: {
        ...DEFAULT_SETTINGS.pageAccess,
        ...(loaded.pageAccess || {}),
        settings: { enabled: true },
      },
    };

    if (merged.serverName === 'VriendenCraft SMP' || !merged.serverName) {
      merged.serverName = 'Kabloinky SMP';
      saveStorage(STORAGE_KEYS.SETTINGS, merged);
    }
    return merged;
  }

  static updateSettings(newSettings: Partial<ServerSettings>): ServerSettings {
    const current = this.getSettings();
    const updated: ServerSettings = {
      ...current,
      ...newSettings,
      pageAccess: {
        ...(current.pageAccess || {}),
        ...(newSettings.pageAccess || {}),
        settings: { enabled: true },
      },
    };
    saveStorage(STORAGE_KEYS.SETTINGS, updated);

    // Sync to Firestore in Cloud immediately
    try {
      setDoc(doc(db, 'settings', 'server'), {
        ...updated,
        updatedAt: new Date().toISOString(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, 'settings/server');
      });
    } catch (e) {
      console.warn('Firestore settings update warning:', e);
    }

    this.notifyListeners();
    return updated;
  }

  // Users
  static getUsers(): User[] {
    const list = loadStorage<User[]>(STORAGE_KEYS.USERS, []).filter((u) => !isTestItem(u));
    return list.map((u) => {
      const defaultPages: PageId[] = [
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
      const userPages: PageId[] =
        Array.isArray(u.allowedPages) && u.allowedPages.length > 0 ? u.allowedPages : defaultPages;
      const modPages: PageId[] = Array.isArray(u.moderatorPages) ? u.moderatorPages : [];
      const withSettings = Array.from(new Set([...userPages, 'settings' as PageId])) as PageId[];
      return {
        ...u,
        allowedPages: withSettings,
        moderatorPages: modPages,
      };
    });
  }

  static getCurrentUser(): User | null {
    const user = loadStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (!user) return null;
    const defaultPages: PageId[] = [
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
    const pages: PageId[] =
      Array.isArray(user.allowedPages) && user.allowedPages.length > 0 ? user.allowedPages : defaultPages;
    return {
      ...user,
      allowedPages: Array.from(new Set([...pages, 'settings' as PageId])) as PageId[],
    };
  }

  static setCurrentUser(user: User | null): void {
    if (user) {
      const defaultPages: PageId[] = [
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
      const pages: PageId[] =
        Array.isArray(user.allowedPages) && user.allowedPages.length > 0 ? user.allowedPages : defaultPages;
      user = {
        ...user,
        allowedPages: Array.from(new Set([...pages, 'settings' as PageId])) as PageId[],
      };
    }
    saveStorage(STORAGE_KEYS.CURRENT_USER, user);
    this.notifyListeners();
  }

  static hasUsers(): boolean {
    const users = this.getUsers();
    return users.length > 0;
  }

  // Player registration with direct Cloud synchronization and password hashing
  static registerUser(
    username: string,
    role: Role = 'speler',
    isFirstAccount = false,
    rawPassword?: string
  ): { user: User; isFirst: boolean } {
    const users = this.getUsers();
    const isFirst = users.length === 0 || isFirstAccount;

    const assignedRole: Role = isFirst ? 'eigenaar' : role;
    const cleanUsername = username.trim();

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

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      role: assignedRole,
      createdAt: new Date().toISOString(),
      avatarUrl: `https://mc-heads.net/avatar/${encodeURIComponent(cleanUsername)}/64`,
      organizationIds: [],
      allowedPages: allPages,
      moderatorPages: isFirst ? ['events', 'organizations', 'plans', 'rules', 'punishments', 'bounties'] : [],
      passwordHash: rawPassword && rawPassword.trim() ? hashUserPassword(rawPassword.trim()) : undefined,
    };

    users.push(newUser);
    saveStorage(STORAGE_KEYS.USERS, users);
    saveStorage(STORAGE_KEYS.CURRENT_USER, newUser);

    // Save directly to Firestore Cloud Database
    try {
      setDoc(doc(db, 'users', newUser.id), newUser)
        .then(() => {
          cloudConnected = true;
          this.notifyListeners();
        })
        .catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `users/${newUser.id}`);
        });
    } catch (e) {
      console.warn('Firestore user save warning:', e);
    }

    this.notify(
      'Welkom bij Kabloinky SMP!',
      `Account ${cleanUsername} is succesvol geregistreerd.`,
      'system',
      'home'
    );

    this.notifyListeners();
    return { user: newUser, isFirst };
  }

  // Secure player authentication requiring correct password
  static loginUser(
    username: string,
    rawPassword: string
  ): { success: boolean; user?: User; error?: string } {
    const cleanUsername = username.trim();
    const cleanPassword = rawPassword.trim();

    if (!cleanUsername) {
      return { success: false, error: 'Vul je Minecraft gebruikersnaam in.' };
    }
    if (!cleanPassword) {
      return { success: false, error: 'Vul het wachtwoord van dit account in.' };
    }

    const users = this.getUsers();
    const found = users.find(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (!found) {
      return {
        success: false,
        error: `Geen account gevonden met de naam "${cleanUsername}".`,
      };
    }

    if (found.passwordHash) {
      const hashedAttempt = hashUserPassword(cleanPassword);
      if (hashedAttempt !== found.passwordHash) {
        return {
          success: false,
          error: 'Onjuist wachtwoord voor dit account. Probeer het opnieuw.',
        };
      }
    } else {
      // Legacy account that had no passwordHash: initialize it with this password!
      found.passwordHash = hashUserPassword(cleanPassword);
      const updated = users.map((u) => (u.id === found.id ? found : u));
      saveStorage(STORAGE_KEYS.USERS, updated);
      try {
        setDoc(doc(db, 'users', found.id), found).catch(() => {});
      } catch {}
    }

    this.setCurrentUser(found);
    return { success: true, user: found };
  }

  static updateUserRole(userId: string, newRole: Role): void {
    const users = this.getUsers().map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    saveStorage(STORAGE_KEYS.USERS, users);
    const current = this.getCurrentUser();
    if (current && current.id === userId) {
      this.setCurrentUser({ ...current, role: newRole });
    }

    const updatedUser = users.find((u) => u.id === userId);
    if (updatedUser) {
      try {
        setDoc(doc(db, 'users', userId), updatedUser).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
        });
      } catch (e) {
        console.warn('Firestore user update role warning:', e);
      }
    }
    this.notifyListeners();
  }

  // Update per-player permissions: page access & moderator access per page
  static updateUserPermissions(
    userId: string,
    allowedPages: PageId[],
    moderatorPages: PageId[]
  ): void {
    const guaranteedPages = Array.from(new Set([...allowedPages, 'settings' as PageId])) as PageId[];
    const users = this.getUsers().map((u) =>
      u.id === userId ? { ...u, allowedPages: guaranteedPages, moderatorPages } : u
    );
    saveStorage(STORAGE_KEYS.USERS, users);
    const current = this.getCurrentUser();
    if (current && current.id === userId) {
      this.setCurrentUser({ ...current, allowedPages: guaranteedPages, moderatorPages });
    }

    const updatedUser = users.find((u) => u.id === userId);
    if (updatedUser) {
      try {
        setDoc(doc(db, 'users', userId), updatedUser).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
        });
      } catch (e) {
        console.warn('Firestore permissions update warning:', e);
      }
    }
    this.notifyListeners();
  }

  static updateUserAllowedPages(userId: string, allowedPages: PageId[]): void {
    const user = this.getUsers().find((u) => u.id === userId);
    this.updateUserPermissions(userId, allowedPages, user?.moderatorPages || []);
  }

  // Check if a player has moderator access to a specific page
  static isUserModeratorForPage(user: User | null, pageId: PageId): boolean {
    if (!user) return false;
    if (Array.isArray(user.moderatorPages) && user.moderatorPages.includes(pageId)) {
      return true;
    }
    if (user.role === 'eigenaar' || user.role === 'beheerder') {
      return true;
    }
    return false;
  }

  static deleteUser(userId: string): void {
    const users = this.getUsers().filter((u) => u.id !== userId);
    saveStorage(STORAGE_KEYS.USERS, users);
    const current = this.getCurrentUser();
    if (current && current.id === userId) {
      this.setCurrentUser(null);
    }

    try {
      deleteDoc(doc(db, 'users', userId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
      });
    } catch (e) {
      console.warn('Firestore user delete warning:', e);
    }
    this.notifyListeners();
  }

  // Passwords verification:
  // ZERO hardcoded 'admin' bypasses! Only real passwords configured by user.
  static verifyMotherPassword(input: string): boolean {
    const clean = input.trim();
    if (!clean) return false;
    const settings = this.getSettings();
    const targetMother = (settings.motherPassword || '').trim();
    if (!targetMother) return false;
    return clean === targetMother;
  }

  static verifyAdminPassword(input: string): boolean {
    const clean = input.trim();
    if (!clean) return false;
    const settings = this.getSettings();
    if (Array.isArray(settings.adminPasswords) && settings.adminPasswords.some((p) => p && p.trim() === clean)) {
      return true;
    }
    if (settings.adminPassword && clean === settings.adminPassword.trim()) {
      return true;
    }
    return false;
  }

  static verifyAdminOrMotherPassword(input: string): boolean {
    const clean = input.trim();
    if (!clean) return false;
    if (this.verifyMotherPassword(clean)) return true;
    if (this.verifyAdminPassword(clean)) return true;
    const settings = this.getSettings();
    if (Array.isArray(settings.customPasswords) && settings.customPasswords.some((p) => p.code && p.code.trim() === clean)) {
      return true;
    }
    return false;
  }

  static verifyServerAccessCode(input: string): boolean {
    const clean = input.trim();
    if (!clean) return false;
    const settings = this.getSettings();
    if (
      Array.isArray(settings.serverAccessCodes) &&
      settings.serverAccessCodes.some((code) => code && code.trim().toLowerCase() === clean.toLowerCase())
    ) {
      return true;
    }
    if (settings.serverAccessCode && clean.toUpperCase() === settings.serverAccessCode.trim().toUpperCase()) {
      return true;
    }
    return false;
  }

  // Events
  static getEvents(): EventItem[] {
    const events = loadStorage<EventItem[]>(STORAGE_KEYS.EVENTS, DEFAULT_EVENTS).filter((e) => !isTestItem(e));
    return events.map((e) => ({
      ...e,
      attendees: Array.isArray(e.attendees) ? e.attendees : [],
    }));
  }

  static addEvent(event: Omit<EventItem, 'id' | 'createdAt' | 'attendees'>): EventItem {
    const events = this.getEvents();
    const newEvent: EventItem = {
      ...event,
      id: `event-${Date.now()}`,
      createdAt: new Date().toISOString(),
      attendees: [event.authorName],
    };
    events.unshift(newEvent);
    saveStorage(STORAGE_KEYS.EVENTS, events);

    try {
      setDoc(doc(db, 'events', newEvent.id), newEvent).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `events/${newEvent.id}`);
      });
    } catch (e) {
      console.warn('Firestore event save warning:', e);
    }

    if (newEvent.approved) {
      this.notify(
        'Nieuw Goedgekeurd Evenement!',
        `Het evenement "${newEvent.title}" staat nu in de agenda (${newEvent.date} om ${newEvent.time}).`,
        'event',
        'events',
        newEvent.id
      );
    } else {
      this.notify(
        'Evenement Aanvraag Ingediend',
        `Evenement "${newEvent.title}" wacht op goedkeuring door een beheerder.`,
        'event',
        'events',
        newEvent.id
      );
    }

    this.notifyListeners();
    return newEvent;
  }

  static approveEvent(eventId: string, adminName: string): void {
    const events = this.getEvents().map((e) => {
      if (e.id === eventId) {
        return { ...e, approved: true, approvedBy: adminName };
      }
      return e;
    });
    saveStorage(STORAGE_KEYS.EVENTS, events);

    const approvedEvent = events.find((e) => e.id === eventId);
    if (approvedEvent) {
      try {
        setDoc(doc(db, 'events', eventId), approvedEvent).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `events/${eventId}`);
        });
      } catch (e) {
        console.warn('Firestore event approve warning:', e);
      }

      this.notify(
        'Evenement Goedgekeurd!',
        `"${approvedEvent.title}" is goedgekeurd door ${adminName}! Bekijk de agenda voor details.`,
        'event',
        'events',
        approvedEvent.id
      );
    }
    this.notifyListeners();
  }

  static deleteEvent(eventId: string): void {
    const events = this.getEvents().filter((e) => e.id !== eventId);
    saveStorage(STORAGE_KEYS.EVENTS, events);

    try {
      deleteDoc(doc(db, 'events', eventId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
      });
    } catch (e) {
      console.warn('Firestore event delete warning:', e);
    }
    this.notifyListeners();
  }

  static rejectEvent(eventId: string): void {
    this.deleteEvent(eventId);
  }

  static toggleEventAttendance(eventId: string, username: string): void {
    const events = this.getEvents().map((e) => {
      if (e.id === eventId) {
        const attendees = Array.isArray(e.attendees) ? [...e.attendees] : [];
        const index = attendees.indexOf(username);
        if (index > -1) {
          attendees.splice(index, 1);
        } else {
          attendees.push(username);
        }
        return { ...e, attendees };
      }
      return e;
    });
    saveStorage(STORAGE_KEYS.EVENTS, events);

    const updated = events.find((e) => e.id === eventId);
    if (updated) {
      try {
        setDoc(doc(db, 'events', eventId), updated).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `events/${eventId}`);
        });
      } catch (e) {
        console.warn('Firestore event attendance warning:', e);
      }
    }
    this.notifyListeners();
  }

  // Organizations
  static getOrganizations(): Organization[] {
    const orgs = loadStorage<Organization[]>(STORAGE_KEYS.ORGS, DEFAULT_ORGS).filter((o) => !isTestItem(o));
    return orgs.map((o) => ({
      ...o,
      members: Array.isArray(o.members) ? o.members : [],
    }));
  }

  static saveOrganization(
    org: Omit<Organization, 'id' | 'createdAt' | 'members'>,
    existingId?: string
  ): Organization {
    const orgs = this.getOrganizations();
    if (existingId) {
      const updated = orgs.map((o) => {
        if (o.id === existingId) {
          return {
            ...o,
            ...org,
          };
        }
        return o;
      });
      saveStorage(STORAGE_KEYS.ORGS, updated);
      const saved = updated.find((o) => o.id === existingId)!;
      try {
        setDoc(doc(db, 'organizations', existingId), saved).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `organizations/${existingId}`);
        });
      } catch (e) {
        console.warn('Firestore org update warning:', e);
      }
      this.notifyListeners();
      return saved;
    } else {
      const newOrg: Organization = {
        ...org,
        id: `org-${Date.now()}`,
        createdAt: new Date().toISOString(),
        members: [
          {
            userId: org.leaderId,
            username: org.leaderName,
            role: 'leider',
            joinedAt: new Date().toISOString(),
          },
        ],
      };
      orgs.unshift(newOrg);
      saveStorage(STORAGE_KEYS.ORGS, orgs);
      try {
        setDoc(doc(db, 'organizations', newOrg.id), newOrg).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `organizations/${newOrg.id}`);
        });
      } catch (e) {
        console.warn('Firestore org create warning:', e);
      }
      this.notify(
        'Nieuwe Organisatie Opgericht!',
        `Organisatie "${newOrg.name}" [${newOrg.tag}] is opgericht door ${newOrg.leaderName}.`,
        'org',
        'organizations',
        newOrg.id
      );
      this.notifyListeners();
      return newOrg;
    }
  }

  static deleteOrganization(orgId: string): void {
    const orgs = this.getOrganizations().filter((o) => o.id !== orgId);
    saveStorage(STORAGE_KEYS.ORGS, orgs);
    try {
      deleteDoc(doc(db, 'organizations', orgId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `organizations/${orgId}`);
      });
    } catch (e) {
      console.warn('Firestore org delete warning:', e);
    }
    this.notifyListeners();
  }

  static joinOrganization(orgId: string, user: User): void {
    const orgs = this.getOrganizations().map((o) => {
      if (o.id === orgId) {
        const members = Array.isArray(o.members) ? [...o.members] : [];
        if (!members.some((m) => m.userId === user.id)) {
          members.push({
            userId: user.id,
            username: user.username,
            role: 'lid',
            joinedAt: new Date().toISOString(),
          });
        }
        return { ...o, members };
      }
      return o;
    });
    saveStorage(STORAGE_KEYS.ORGS, orgs);
    const updated = orgs.find((o) => o.id === orgId);
    if (updated) {
      try {
        setDoc(doc(db, 'organizations', orgId), updated).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}`);
        });
      } catch (e) {
        console.warn('Firestore join org warning:', e);
      }
    }
    this.notifyListeners();
  }

  static addOrganization(
    org: Omit<Organization, 'id' | 'createdAt' | 'members'>,
    creatorUser?: User
  ): Organization {
    return this.saveOrganization(org);
  }

  static approveOrganization(orgId: string): void {
    const orgs = this.getOrganizations().map((o) =>
      o.id === orgId ? { ...o, approved: true } : o
    );
    saveStorage(STORAGE_KEYS.ORGS, orgs);
    const updated = orgs.find((o) => o.id === orgId);
    if (updated) {
      try {
        setDoc(doc(db, 'organizations', orgId), updated).catch(() => {});
      } catch {}
    }
    this.notifyListeners();
  }

  static addMemberToOrg(
    orgId: string,
    username: string,
    role: 'leider' | 'officier' | 'lid' = 'lid'
  ): void {
    const orgs = this.getOrganizations().map((o) => {
      if (o.id === orgId) {
        const members = Array.isArray(o.members) ? [...o.members] : [];
        if (!members.some((m) => m.username.toLowerCase() === username.toLowerCase())) {
          members.push({
            userId: `u-${Date.now()}`,
            username,
            role,
            joinedAt: new Date().toISOString(),
          });
        }
        return { ...o, members };
      }
      return o;
    });
    saveStorage(STORAGE_KEYS.ORGS, orgs);
    const updated = orgs.find((o) => o.id === orgId);
    if (updated) {
      try {
        setDoc(doc(db, 'organizations', orgId), updated).catch(() => {});
      } catch {}
    }
    this.notifyListeners();
  }

  static removeMemberFromOrg(orgId: string, username: string): void {
    const orgs = this.getOrganizations().map((o) => {
      if (o.id === orgId) {
        const members = (o.members || []).filter(
          (m) => m.username.toLowerCase() !== username.toLowerCase()
        );
        return { ...o, members };
      }
      return o;
    });
    saveStorage(STORAGE_KEYS.ORGS, orgs);
    const updated = orgs.find((o) => o.id === orgId);
    if (updated) {
      try {
        setDoc(doc(db, 'organizations', orgId), updated).catch(() => {});
      } catch {}
    }
    this.notifyListeners();
  }

  static leaveOrganization(orgId: string, userId: string): void {
    const orgs = this.getOrganizations().map((o) => {
      if (o.id === orgId) {
        const members = (o.members || []).filter((m) => m.userId !== userId);
        return { ...o, members };
      }
      return o;
    });
    saveStorage(STORAGE_KEYS.ORGS, orgs);
    const updated = orgs.find((o) => o.id === orgId);
    if (updated) {
      try {
        setDoc(doc(db, 'organizations', orgId), updated).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}`);
        });
      } catch (e) {
        console.warn('Firestore leave org warning:', e);
      }
    }
    this.notifyListeners();
  }

  // Public Plans
  static getPublicPlans(): PublicPlan[] {
    return loadStorage<PublicPlan[]>(STORAGE_KEYS.PLANS, DEFAULT_PLANS).filter((p) => !isTestItem(p));
  }

  static createPublicPlan(plan: Omit<PublicPlan, 'id' | 'createdAt' | 'likes' | 'commentsCount'>): PublicPlan {
    const plans = this.getPublicPlans();
    const newPlan: PublicPlan = {
      ...plan,
      id: `plan-${Date.now()}`,
      createdAt: new Date().toISOString(),
      likes: [],
      commentsCount: 0,
    };
    plans.unshift(newPlan);
    saveStorage(STORAGE_KEYS.PLANS, plans);

    try {
      setDoc(doc(db, 'plans', newPlan.id), newPlan).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `plans/${newPlan.id}`);
      });
    } catch (e) {
      console.warn('Firestore plan create warning:', e);
    }

    this.notify(
      'Nieuw Publiek Plan!',
      `"${newPlan.title}" is gepubliceerd door ${newPlan.authorName} in categorie ${newPlan.category}.`,
      'plan',
      'plans',
      newPlan.id
    );

    this.notifyListeners();
    return newPlan;
  }

  static deletePublicPlan(planId: string): void {
    const plans = this.getPublicPlans().filter((p) => p.id !== planId);
    saveStorage(STORAGE_KEYS.PLANS, plans);
    try {
      deleteDoc(doc(db, 'plans', planId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `plans/${planId}`);
      });
    } catch (e) {
      console.warn('Firestore plan delete warning:', e);
    }
    this.notifyListeners();
  }

  static addPublicPlan(
    plan: Omit<PublicPlan, 'id' | 'createdAt' | 'likes' | 'commentsCount'>
  ): PublicPlan {
    return this.createPublicPlan(plan);
  }

  static togglePlanLike(planId: string, userId: string): void {
    return this.toggleLikePlan(planId, userId);
  }

  // Private Notes (Plan Tab)
  static getPrivateNotes(userId: string): PrivateNote[] {
    const all = loadStorage<PrivateNote[]>(STORAGE_KEYS.NOTES, []);
    return all.filter((n) => n.userId === userId && !isTestItem(n));
  }

  static savePrivateNote(
    note: Omit<PrivateNote, 'id' | 'updatedAt'>,
    existingId?: string
  ): PrivateNote {
    const all = loadStorage<PrivateNote[]>(STORAGE_KEYS.NOTES, []);
    let saved: PrivateNote;
    if (existingId) {
      all.forEach((n, idx) => {
        if (n.id === existingId) {
          all[idx] = { ...n, ...note, updatedAt: new Date().toISOString() };
          saved = all[idx];
        }
      });
      saved = saved! || {
        ...note,
        id: existingId,
        updatedAt: new Date().toISOString(),
      };
    } else {
      saved = {
        ...note,
        id: `note-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };
      all.unshift(saved);
    }
    saveStorage(STORAGE_KEYS.NOTES, all);
    this.notifyListeners();
    return saved;
  }

  static deletePrivateNote(id: string): void {
    const all = loadStorage<PrivateNote[]>(STORAGE_KEYS.NOTES, []).filter((n) => n.id !== id);
    saveStorage(STORAGE_KEYS.NOTES, all);
    this.notifyListeners();
  }

  static toggleLikePlan(planId: string, userId: string): void {
    const plans = this.getPublicPlans().map((p) => {
      if (p.id === planId) {
        const likes = Array.isArray(p.likes) ? [...p.likes] : [];
        const index = likes.indexOf(userId);
        if (index > -1) {
          likes.splice(index, 1);
        } else {
          likes.push(userId);
        }
        return { ...p, likes };
      }
      return p;
    });
    saveStorage(STORAGE_KEYS.PLANS, plans);

    const updated = plans.find((p) => p.id === planId);
    if (updated) {
      try {
        setDoc(doc(db, 'plans', planId), updated).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `plans/${planId}`);
        });
      } catch (e) {
        console.warn('Firestore plan like warning:', e);
      }
    }
    this.notifyListeners();
  }

  // Plan Comments
  static getPlanComments(planId: string): PlanComment[] {
    const allComments = loadStorage<PlanComment[]>(STORAGE_KEYS.COMMENTS, DEFAULT_COMMENTS);
    return allComments.filter((c) => c.planId === planId);
  }

  static addPlanComment(planId: string, user: User, content: string): PlanComment {
    const allComments = loadStorage<PlanComment[]>(STORAGE_KEYS.COMMENTS, DEFAULT_COMMENTS);
    const newComment: PlanComment = {
      id: `comm-${Date.now()}`,
      planId,
      userId: user.id,
      username: user.username,
      userRole: user.role || 'speler',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    allComments.push(newComment);
    saveStorage(STORAGE_KEYS.COMMENTS, allComments);

    const plans = this.getPublicPlans().map((p) => {
      if (p.id === planId) {
        return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
      }
      return p;
    });
    saveStorage(STORAGE_KEYS.PLANS, plans);

    try {
      setDoc(doc(db, 'comments', newComment.id), newComment).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `comments/${newComment.id}`);
      });
      const updatedPlan = plans.find((p) => p.id === planId);
      if (updatedPlan) {
        setDoc(doc(db, 'plans', planId), updatedPlan).catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore comment warning:', e);
    }

    this.notifyListeners();
    return newComment;
  }

  // Rules (Regels)
  static getRules(): ServerRule[] {
    return loadStorage<ServerRule[]>(STORAGE_KEYS.RULES, DEFAULT_RULES).filter((r) => !isTestItem(r));
  }

  static saveRule(rule: Omit<ServerRule, 'id' | 'lastUpdated'>, existingId?: string): void {
    const rules = this.getRules();
    const today = new Date().toISOString().split('T')[0];
    let targetRule: ServerRule;
    if (existingId) {
      const updated = rules.map((r) => (r.id === existingId ? { ...r, ...rule, lastUpdated: today } : r));
      saveStorage(STORAGE_KEYS.RULES, updated);
      targetRule = updated.find((r) => r.id === existingId)!;
    } else {
      targetRule = {
        ...rule,
        id: `rule-${Date.now()}`,
        lastUpdated: today,
      };
      rules.push(targetRule);
      saveStorage(STORAGE_KEYS.RULES, rules);
    }

    try {
      setDoc(doc(db, 'rules', targetRule.id), targetRule).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `rules/${targetRule.id}`);
      });
    } catch (e) {
      console.warn('Firestore rule save warning:', e);
    }
    this.notifyListeners();
  }

  static deleteRule(ruleId: string): void {
    const rules = this.getRules().filter((r) => r.id !== ruleId);
    saveStorage(STORAGE_KEYS.RULES, rules);
    try {
      deleteDoc(doc(db, 'rules', ruleId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `rules/${ruleId}`);
      });
    } catch (e) {
      console.warn('Firestore rule delete warning:', e);
    }
    this.notifyListeners();
  }

  // Punishments (Sancties)
  static getPunishments(): PunishmentRecord[] {
    return loadStorage<PunishmentRecord[]>(STORAGE_KEYS.PUNISHMENTS, DEFAULT_PUNISHMENTS).filter(
      (p) => !isTestItem(p)
    );
  }

  static savePunishment(
    punishment: Omit<PunishmentRecord, 'id' | 'date'>,
    existingId?: string
  ): PunishmentRecord {
    const list = this.getPunishments();
    const today = new Date().toISOString().split('T')[0];
    let record: PunishmentRecord;
    if (existingId) {
      const updated = list.map((p) => (p.id === existingId ? { ...p, ...punishment } : p));
      saveStorage(STORAGE_KEYS.PUNISHMENTS, updated);
      record = updated.find((p) => p.id === existingId)!;
    } else {
      record = {
        ...punishment,
        id: `punish-${Date.now()}`,
        date: today,
      };
      list.unshift(record);
      saveStorage(STORAGE_KEYS.PUNISHMENTS, list);

      this.notify(
        `Nieuwe Sanctie: ${record.type}`,
        `${record.playerName} heeft een ${record.type.toLowerCase()} gekregen wegens: ${record.reason}.`,
        'punishment',
        'punishments',
        record.id
      );
    }

    try {
      setDoc(doc(db, 'punishments', record.id), record).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `punishments/${record.id}`);
      });
    } catch (e) {
      console.warn('Firestore punishment save warning:', e);
    }
    this.notifyListeners();
    return record;
  }

  static deletePunishment(punishmentId: string): void {
    const list = this.getPunishments().filter((p) => p.id !== punishmentId);
    saveStorage(STORAGE_KEYS.PUNISHMENTS, list);
    try {
      deleteDoc(doc(db, 'punishments', punishmentId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `punishments/${punishmentId}`);
      });
    } catch (e) {
      console.warn('Firestore punishment delete warning:', e);
    }
    this.notifyListeners();
  }

  static addPunishment(
    punishment: Omit<PunishmentRecord, 'id' | 'date'>,
    existingId?: string
  ): PunishmentRecord {
    return this.savePunishment(punishment, existingId);
  }

  static updatePunishmentStatus(
    id: string,
    newStatus: 'Actief' | 'Verlopen' | 'Kwijtgescholden'
  ): void {
    const list = this.getPunishments().map((p) =>
      p.id === id ? { ...p, status: newStatus } : p
    );
    saveStorage(STORAGE_KEYS.PUNISHMENTS, list);
    const updated = list.find((p) => p.id === id);
    if (updated) {
      try {
        setDoc(doc(db, 'punishments', id), updated).catch(() => {});
      } catch {}
    }
    this.notifyListeners();
  }

  // Bounties
  static getBounties(): BountyRecord[] {
    return loadStorage<BountyRecord[]>(STORAGE_KEYS.BOUNTIES, DEFAULT_BOUNTIES).filter((b) => !isTestItem(b));
  }

  static addBounty(
    targetPlayer: string,
    sponsorName: string,
    amount: number,
    itemType: string,
    reason: string
  ): BountyRecord {
    return this.addBountyContribution(targetPlayer, sponsorName, amount, itemType, reason);
  }

  static addBountyContribution(
    targetPlayer: string,
    sponsorName: string,
    amount: number,
    itemType: string,
    reason: string
  ): BountyRecord {
    const bounties = this.getBounties();
    const today = new Date().toISOString().split('T')[0];
    const cleanTarget = targetPlayer.trim();

    const existing = bounties.find(
      (b) => b.targetPlayer.toLowerCase() === cleanTarget.toLowerCase() && b.status === 'Actief'
    );

    let result: BountyRecord;
    if (existing) {
      existing.contributions.push({
        id: `c-${Date.now()}`,
        sponsorName,
        amount,
        itemType,
        placedAt: today,
      });
      existing.totalValue += amount;
      existing.lastUpdated = today;
      existing.payoutPrice = `${existing.totalValue} ${itemType} + Eer`;
      saveStorage(STORAGE_KEYS.BOUNTIES, bounties);

      this.notify(
        'Bounty Verhoogd!',
        `${sponsorName} heeft ${amount} ${itemType} extra op ${cleanTarget} gezet! Totaal: ${existing.totalValue}.`,
        'bounty',
        'bounties',
        existing.id
      );
      result = existing;
    } else {
      result = {
        id: `bounty-${Date.now()}`,
        targetPlayer: cleanTarget,
        level: 2,
        payoutPrice: `${amount} ${itemType}`,
        totalValue: amount,
        reason: reason.trim() || 'Wangedrag & vogelvrij verklaard',
        contributions: [
          {
            id: `c-${Date.now()}`,
            sponsorName,
            amount,
            itemType,
            placedAt: today,
          },
        ],
        status: 'Actief',
        lastUpdated: today,
      };
      bounties.unshift(result);
      saveStorage(STORAGE_KEYS.BOUNTIES, bounties);

      this.notify(
        'Nieuwe Bounty Uitgeloofd!',
        `${sponsorName} heeft een bounty van ${amount} ${itemType} geplaatst op ${cleanTarget}!`,
        'bounty',
        'bounties',
        result.id
      );
    }

    try {
      setDoc(doc(db, 'bounties', result.id), result).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `bounties/${result.id}`);
      });
    } catch (e) {
      console.warn('Firestore bounty save warning:', e);
    }
    this.notifyListeners();
    return result;
  }

  static updateBountyLevel(bountyId: string, level: 1 | 2 | 3 | 4 | 5): void {
    const bounties = this.getBounties().map((b) => {
      if (b.id === bountyId) {
        return { ...b, level, lastUpdated: new Date().toISOString().split('T')[0] };
      }
      return b;
    });
    saveStorage(STORAGE_KEYS.BOUNTIES, bounties);
    const updated = bounties.find((b) => b.id === bountyId);
    if (updated) {
      try {
        setDoc(doc(db, 'bounties', bountyId), updated).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `bounties/${bountyId}`);
        });
      } catch (e) {
        console.warn('Firestore bounty level warning:', e);
      }
    }
    this.notifyListeners();
  }

  static claimBounty(bountyId: string, claimedBy: string): void {
    const bounties = this.getBounties().map((b) => {
      if (b.id === bountyId) {
        return {
          ...b,
          status: 'Geclaimd' as const,
          claimedBy: claimedBy.trim(),
          claimedAt: new Date().toISOString().split('T')[0],
        };
      }
      return b;
    });
    saveStorage(STORAGE_KEYS.BOUNTIES, bounties);

    const claimed = bounties.find((b) => b.id === bountyId);
    if (claimed) {
      try {
        setDoc(doc(db, 'bounties', bountyId), claimed).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `bounties/${bountyId}`);
        });
      } catch (e) {
        console.warn('Firestore claim bounty warning:', e);
      }

      this.notify(
        'Bounty Geclaimd!',
        `${claimedBy} heeft de bounty op ${claimed.targetPlayer} succesvol geïnd (${claimed.payoutPrice})!`,
        'bounty',
        'bounties',
        bountyId
      );
    }
    this.notifyListeners();
  }

  static deleteBounty(bountyId: string): void {
    const bounties = this.getBounties().filter((b) => b.id !== bountyId);
    saveStorage(STORAGE_KEYS.BOUNTIES, bounties);
    try {
      deleteDoc(doc(db, 'bounties', bountyId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `bounties/${bountyId}`);
      });
    } catch (e) {
      console.warn('Firestore bounty delete warning:', e);
    }
    this.notifyListeners();
  }

  // Notifications
  static getNotifications(): NotificationItem[] {
    return loadStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, DEFAULT_NOTIFICATIONS);
  }

  static markNotificationRead(id: string): void {
    const notifs = this.getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
    saveStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
    try {
      const target = notifs.find((n) => n.id === id);
      if (target) {
        setDoc(doc(db, 'notifications', id), target).catch(() => {});
      }
    } catch {}
    this.notifyListeners();
  }

  static clearAllNotifications(): void {
    saveStorage(STORAGE_KEYS.NOTIFICATIONS, []);
    this.notifyListeners();
  }

  static notify(
    title: string,
    message: string,
    type: NotificationItem['type'] = 'system',
    targetTab?: PageId,
    targetId?: string,
    forUserId?: string
  ): void {
    const notifs = this.getNotifications();
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title,
      message,
      type,
      targetTab,
      targetId,
      createdAt: new Date().toISOString(),
      read: false,
      forUserId,
    };
    notifs.unshift(newNotif);
    saveStorage(STORAGE_KEYS.NOTIFICATIONS, notifs.slice(0, 50));

    try {
      setDoc(doc(db, 'notifications', newNotif.id), newNotif).catch(() => {});
    } catch {}

    playNotificationSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: 'https://mc-heads.net/avatar/Steve/64',
        });
      } catch {}
    }

    this.notifyListeners();
  }

  // Sync any local users to cloud on startup
  static async syncLocalUsersToCloud(): Promise<void> {
    try {
      const localUsers = this.getUsers();
      for (const u of localUsers) {
        if (!isTestItem(u)) {
          await setDoc(doc(db, 'users', u.id), u);
        }
      }
    } catch (e) {
      console.warn('Initial cloud users sync warning:', e);
    }
  }

  // Reset to factory defaults
  static resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    localStorage.removeItem(STORAGE_KEYS.ORGS);
    localStorage.removeItem(STORAGE_KEYS.NOTES);
    localStorage.removeItem(STORAGE_KEYS.PLANS);
    localStorage.removeItem(STORAGE_KEYS.COMMENTS);
    localStorage.removeItem(STORAGE_KEYS.RULES);
    localStorage.removeItem(STORAGE_KEYS.PUNISHMENTS);
    localStorage.removeItem(STORAGE_KEYS.BOUNTIES);
    this.notifyListeners();
  }
}

// Global real-time Firestore synchronization initializer
function initFirestoreSync() {
  try {
    // 1. Sync Settings
    onSnapshot(
      doc(db, 'settings', 'server'),
      (snap) => {
        cloudConnected = true;
        if (snap.exists()) {
          const data = snap.data() as Partial<ServerSettings>;
          const current = StorageManager.getSettings();
          const merged: ServerSettings = {
            ...current,
            ...data,
            pageAccess: {
              ...current.pageAccess,
              ...(data.pageAccess || {}),
              settings: { enabled: true },
            },
          };
          saveStorage(STORAGE_KEYS.SETTINGS, merged);
          StorageManager.notifyListeners();
        } else {
          // Initialize server doc in Firestore
          const defaultSet = StorageManager.getSettings();
          setDoc(doc(db, 'settings', 'server'), {
            ...defaultSet,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/server');
      }
    );

    // 2. Sync Users in REAL-TIME across all devices/friends
    onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        cloudConnected = true;
        const cloudUsers: User[] = [];
        snapshot.forEach((docSnap) => {
          const u = docSnap.data() as User;
          if (u && u.id && u.username && !isTestItem(u)) {
            cloudUsers.push(u);
          }
        });

        // Always sync cloud users into local storage
        saveStorage(STORAGE_KEYS.USERS, cloudUsers);

        // Keep current user session updated with fresh cloud data
        const cur = StorageManager.getCurrentUser();
        if (cur) {
          const found = cloudUsers.find((u) => u.id === cur.id);
          if (found) {
            saveStorage(STORAGE_KEYS.CURRENT_USER, found);
          }
        }
        StorageManager.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    // 3. Sync Organizations
    onSnapshot(
      collection(db, 'organizations'),
      (snapshot) => {
        const cloudOrgs: Organization[] = [];
        snapshot.forEach((docSnap) => {
          const o = docSnap.data() as Organization;
          if (o && o.id && o.name && !isTestItem(o)) {
            cloudOrgs.push(o);
          }
        });
        saveStorage(STORAGE_KEYS.ORGS, cloudOrgs);
        StorageManager.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'organizations');
      }
    );

    // 4. Sync Events
    onSnapshot(
      collection(db, 'events'),
      (snapshot) => {
        const cloudEvents: EventItem[] = [];
        snapshot.forEach((docSnap) => {
          const e = docSnap.data() as EventItem;
          if (e && e.id && e.title && !isTestItem(e)) {
            cloudEvents.push(e);
          }
        });
        saveStorage(STORAGE_KEYS.EVENTS, cloudEvents);
        StorageManager.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'events');
      }
    );

    // 5. Sync Plans
    onSnapshot(
      collection(db, 'plans'),
      (snapshot) => {
        const cloudPlans: PublicPlan[] = [];
        snapshot.forEach((docSnap) => {
          const p = docSnap.data() as PublicPlan;
          if (p && p.id && p.title && !isTestItem(p)) {
            cloudPlans.push(p);
          }
        });
        saveStorage(STORAGE_KEYS.PLANS, cloudPlans);
        StorageManager.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'plans');
      }
    );

    // 6. Sync Rules
    onSnapshot(
      collection(db, 'rules'),
      (snapshot) => {
        const cloudRules: ServerRule[] = [];
        snapshot.forEach((docSnap) => {
          const r = docSnap.data() as ServerRule;
          if (r && r.id && r.title && !isTestItem(r)) {
            cloudRules.push(r);
          }
        });
        saveStorage(STORAGE_KEYS.RULES, cloudRules);
        StorageManager.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'rules');
      }
    );

    // 7. Sync Punishments
    onSnapshot(
      collection(db, 'punishments'),
      (snapshot) => {
        const cloudPunish: PunishmentRecord[] = [];
        snapshot.forEach((docSnap) => {
          const p = docSnap.data() as PunishmentRecord;
          if (p && p.id && p.playerName && !isTestItem(p)) {
            cloudPunish.push(p);
          }
        });
        saveStorage(STORAGE_KEYS.PUNISHMENTS, cloudPunish);
        StorageManager.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'punishments');
      }
    );

    // 8. Sync Bounties
    onSnapshot(
      collection(db, 'bounties'),
      (snapshot) => {
        const cloudBounties: BountyRecord[] = [];
        snapshot.forEach((docSnap) => {
          const b = docSnap.data() as BountyRecord;
          if (b && b.id && b.targetPlayer && !isTestItem(b)) {
            cloudBounties.push(b);
          }
        });
        saveStorage(STORAGE_KEYS.BOUNTIES, cloudBounties);
        StorageManager.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bounties');
      }
    );

    // Initial sync of any local users to cloud
    StorageManager.syncLocalUsersToCloud();
  } catch (err) {
    console.warn('Real-time Firebase sync initialization warning:', err);
  }
}

// Ensure test data cleanup runs on initial load
StorageManager.cleanTestArtifacts();

// Initialize real-time synchronization with cloud Firestore
initFirestoreSync();
