export type Role = 'eigenaar' | 'beheerder' | 'moderator' | 'vip' | 'speler';

export interface User {
  id: string;
  username: string; // Minecraft in-game username
  role?: Role;
  createdAt: string;
  avatarUrl?: string;
  organizationIds: string[];
  allowedPages?: PageId[]; // Per-player page permissions
  moderatorPages?: PageId[]; // Per-player moderator access per page
  passwordHash?: string; // Hashed password for secure authentication
}

export type PageId =
  | 'home'
  | 'events'
  | 'organizations'
  | 'plans'
  | 'rules'
  | 'punishments'
  | 'bounties'
  | 'settings'
  | 'register'
  | 'login';

export interface PageAccessConfig {
  enabled: boolean;
  maintenanceMessage?: string;
}

export interface CustomPasswordItem {
  id: string;
  label: string;
  code: string;
  createdAt: string;
}

export interface ServerSettings {
  serverName: string;
  serverHost: string;
  serverPort: number;
  bedrockPort: number;
  serverPlatform?: 'both' | 'java' | 'bedrock'; // Server edition: Java only, Bedrock only, or Both
  discordUrl: string;
  serverVersion: string;
  serverAccessCode: string; // Primary code (backwards compat)
  serverAccessCodes?: string[]; // Multiple server access codes
  adminPassword: string; // Primary admin password (backwards compat)
  adminPasswords?: string[]; // Multiple admin passwords
  motherPassword: string; // Strictly 1 Moederwachtwoord
  motherPasswordHint?: string;
  motherPasswordLocked?: boolean;
  customPasswords?: CustomPasswordItem[]; // Multiple extra passwords
  pageAccess: Record<PageId, PageAccessConfig>;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  authorType: 'player' | 'organization';
  authorId: string;
  authorName: string;
  organizationName?: string;
  approved: boolean;
  approvedBy?: string;
  createdAt: string;
  attendees: string[]; // usernames
}

export interface OrgMember {
  userId: string;
  username: string;
  role: 'leider' | 'officier' | 'lid';
  joinedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  tag: string; // e.g. [NEXUS]
  description: string;
  bannerColor: string;
  leaderId: string;
  leaderName: string;
  members: OrgMember[];
  hqCoordinates?: string;
  approved: boolean;
  createdAt: string;
}

export interface PrivateNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  coordinates?: string;
  tags?: string[];
  updatedAt: string;
}

export interface PlanComment {
  id: string;
  planId: string;
  userId: string;
  username: string;
  userRole: Role;
  content: string;
  createdAt: string;
}

export interface PublicPlan {
  id: string;
  title: string;
  category: 'Bouwproject' | 'Redstone & Tech' | 'PvP & Raid' | 'Economie & Farm' | 'Overig';
  description: string;
  authorType: 'player' | 'organization';
  authorId: string;
  authorName: string;
  organizationName?: string;
  coordinates?: string;
  materialsNeeded?: string;
  likes: string[]; // list of userIds who liked
  commentsCount: number;
  createdAt: string;
  status: 'In Voorbereiding' | 'Bezig' | 'Voltooid';
}

export interface ServerRule {
  id: string;
  number: number;
  category: 'Algemeen' | 'Bouwen & Griefing' | 'PvP & Gevechten' | 'Economie & Handel' | 'Chat & Communicatie';
  title: string;
  description: string;
  punishment: string; // Associated sanction, e.g. "1e keer: Waarschuwing, 2e keer: 24u Jail"
  lastUpdated: string;
}

export type PunishmentType = 'Waarschuwing' | 'Mute' | 'Gevangenis' | 'Ban' | 'Boete';

export interface PunishmentRecord {
  id: string;
  playerName: string;
  type: PunishmentType;
  reason: string;
  duration: string; // e.g. "24 uur", "Permanent", "30 Diamanten"
  adminName: string;
  date: string;
  status: 'Actief' | 'Verlopen' | 'Kwijtgescholden';
  notes?: string;
}

export interface BountyContribution {
  id: string;
  sponsorName: string;
  amount: number;
  itemType: string; // e.g. 'Diamanten', 'Netherite Ingot', 'Emeralds'
  placedAt: string;
  note?: string;
}

export interface BountyRecord {
  id: string;
  targetPlayer: string;
  level: 1 | 2 | 3 | 4 | 5; // 1 to 5 stars
  payoutPrice: string; // What the killer receives / target pays
  totalValue: number; // diamond equivalent
  reason: string;
  contributions: BountyContribution[];
  status: 'Actief' | 'Geclaimd' | 'Ingetrokken';
  claimedBy?: string;
  claimedAt?: string;
  lastUpdated: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'event' | 'plan' | 'bounty' | 'punishment' | 'org' | 'system';
  targetTab?: PageId;
  targetId?: string;
  createdAt: string;
  read: boolean;
  forUserId?: string; // empty means global
}

export interface MinecraftPingData {
  online: boolean;
  host: string;
  port: number;
  version?: string;
  players: {
    online: number;
    max: number;
    list?: string[];
  };
  motd?: {
    raw?: string[];
    clean?: string[];
    html?: string[];
  };
  latencyMs?: number;
  icon?: string;
  error?: string;
}
