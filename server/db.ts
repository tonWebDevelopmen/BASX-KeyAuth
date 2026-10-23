import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export interface Owner {
  id: string;
  email: string;
  username: string;
  password: string;
  sellerKey: string;
  accountOwnerId?: string;
  createdAt: string;
}

export interface App {
  id: string;
  name: string;
  description?: string;
  secret: string;
  version: string;
  paused: boolean;
  ownerId: string;
  standing?: string; // 'Good' | 'Warning'
  createdAt: string;
}

export interface Key {
  id: string;
  value: string;
  appId: string;
  level: string; // tier name e.g. 'default' | 'Lifetime'
  expiryDays: number; // -1 for lifetime
  durationSeconds?: number;
  expiryUnit?: 'Seconds' | 'Minutes' | 'Hours' | 'Days' | 'Weeks' | 'Months' | 'Years' | 'Lifetime';
  expiryDuration?: number;
  expiresAt?: string | null;
  hwidAffected: boolean; // whether key binds to device HWID
  hwid?: string | null;
  note?: string;
  used: boolean;
  paused: boolean;
  usedBy?: string;
  usedOn?: string;
  generatedBy?: string;
  createdAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  email?: string;
  hwid?: string | null;
  ip?: string;
  banned: boolean;
  appId: string;
  twoFactor?: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Tier {
  id: string;
  name: string;
  appId: string;
  paused: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  appId: string;
  userId?: string | null;
  hwid?: string | null;
  ip?: string;
  expiresAt: string;
  createdAt: string;
}

export interface Variable {
  id: string;
  appId: string;
  key: string;
  value: string;
}

export interface UserVariable {
  id: string;
  userId: string;
  appId: string;
  key: string;
  value: string;
}

export interface Blacklist {
  id: string;
  appId: string;
  type: 'hwid' | 'ip';
  value: string;
  reason?: string;
  createdAt: string;
}

export interface Webhook {
  id: string;
  appId: string;
  url: string;
  name?: string;
  events: string[]; // ['user_registered', 'key_redeemed', 'user_banned', 'login_success', 'login_failed']
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  appId: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface EventLog {
  id: string;
  appId: string;
  event: string;
  description: string;
  ip?: string;
  timestamp: string;
}

export interface DatabaseSchema {
  owners: Owner[];
  apps: App[];
  keys: Key[];
  users: User[];
  subscriptions: UserSubscription[];
  tiers: Tier[];
  sessions: Session[];
  variables: Variable[];
  userVariables: UserVariable[];
  blacklist: Blacklist[];
  webhooks: Webhook[];
  chatMessages: ChatMessage[];
  eventLogs: EventLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'keyauth-db.json');

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadData();
    this.seedDefaultDataIfEmpty();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading database file, initializing clean database:', err);
    }
    return {
      owners: [],
      apps: [],
      keys: [],
      users: [],
      subscriptions: [],
      tiers: [],
      sessions: [],
      variables: [],
      userVariables: [],
      blacklist: [],
      webhooks: [],
      chatMessages: [],
      eventLogs: [],
    };
  }

  private save() {
    try {
      this.ensureDataDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save database:', err);
    }
  }

  private seedDefaultDataIfEmpty() {
    // If no owner exists or owner is not BASX, ensure BASX exists
    let basxOwner = this.data.owners.find(o => o.username.toUpperCase() === 'BASX' || o.email.toUpperCase() === 'BASX');
    
    if (!basxOwner) {
      const defaultOwnerId = uuidv4();
      const defaultSellerKey = 'seller_basx_' + uuidv4().replace(/-/g, '').substring(0, 20);
      const hashedPassword = bcrypt.hashSync('Saree2508', 10);

      basxOwner = {
        id: defaultOwnerId,
        email: 'BASX',
        username: 'BASX',
        password: hashedPassword,
        sellerKey: defaultSellerKey,
        createdAt: new Date().toISOString(),
      };
      this.data.owners = [basxOwner];

      const defaultAppId = uuidv4();
      const defaultApp: App = {
        id: defaultAppId,
        name: 'BASXApp1',
        description: 'Primary Desktop Application build for BasxAuth Service PRO deployment',
        secret: uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, ''),
        version: '1.0',
        paused: false,
        ownerId: defaultOwnerId,
        standing: 'Good',
        createdAt: new Date().toISOString(),
      };
      this.data.apps = [defaultApp];

      // Equal tier for all users (No VIP restrictions)
      this.data.tiers = [
        {
          id: uuidv4(),
          name: 'default',
          appId: defaultAppId,
          paused: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          name: 'Lifetime',
          appId: defaultAppId,
          paused: false,
          createdAt: new Date().toISOString(),
        }
      ];

      // Default Global Variable sample
      this.data.variables = [
        {
          id: uuidv4(),
          appId: defaultAppId,
          key: 'MOTD',
          value: 'Welcome to BasxAuth Service PRO Secured System!',
        }
      ];

      this.save();
    } else {
      // Ensure password for BASX is always updated to Saree2508
      basxOwner.password = bcrypt.hashSync('Saree2508', 10);
      basxOwner.username = 'BASX';
      basxOwner.email = 'BASX';
      this.save();
    }
  }

  // --- OWNERS ---
  getOwners() { return this.data.owners; }
  findOwnerById(id: string) { return this.data.owners.find(o => o.id === id); }
  findOwnerByEmail(email: string) { return this.data.owners.find(o => o.email.toLowerCase() === email.toLowerCase()); }
  findOwnerBySellerKey(sellerKey: string) { return this.data.owners.find(o => o.sellerKey === sellerKey); }
  createOwner(owner: Omit<Owner, 'id' | 'sellerKey' | 'createdAt'>): Owner {
    const newOwner: Owner = {
      ...owner,
      id: uuidv4(),
      sellerKey: 'seller_' + uuidv4().replace(/-/g, '').substring(0, 24),
      createdAt: new Date().toISOString(),
    };
    this.data.owners.push(newOwner);
    this.save();
    return newOwner;
  }
  updateOwnerSellerKey(ownerId: string): string | null {
    const owner = this.findOwnerById(ownerId);
    if (!owner) return null;
    owner.sellerKey = 'seller_' + uuidv4().replace(/-/g, '').substring(0, 24);
    this.save();
    return owner.sellerKey;
  }

  // --- APPS ---
  getAppsByOwner(ownerId: string) {
    return this.data.apps.filter(a => a.ownerId === ownerId);
  }
  findAppById(id: string) {
    return this.data.apps.find(a => a.id === id);
  }
  findAppByNameAndOwner(name: string, ownerId: string) {
    const owner = this.data.owners.find(o => 
      o.id === ownerId || 
      o.sellerKey === ownerId || 
      (o.accountOwnerId && o.accountOwnerId.toLowerCase() === ownerId.toLowerCase()) ||
      o.username.toLowerCase() === ownerId.toLowerCase()
    );
    const validOwnerIds = owner ? [owner.id, owner.sellerKey, owner.accountOwnerId, owner.username].filter(Boolean) as string[] : [ownerId];

    return this.data.apps.find(a => 
      a.name.toLowerCase() === name.toLowerCase() && 
      (validOwnerIds.includes(a.ownerId) || a.ownerId === ownerId || this.data.apps.length === 1)
    );
  }
  createApp(appData: { name: string; version?: string; description?: string; ownerId: string }): App {
    const newApp: App = {
      id: uuidv4(),
      name: appData.name,
      description: appData.description || 'Application licensed via BasxAuth Service PRO',
      secret: uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, ''),
      version: appData.version || '1.0',
      paused: false,
      ownerId: appData.ownerId,
      standing: 'Good',
      createdAt: new Date().toISOString(),
    };
    this.data.apps.push(newApp);

    // Create default tier for new app
    this.data.tiers.push({
      id: uuidv4(),
      name: 'default',
      appId: newApp.id,
      paused: false,
      createdAt: new Date().toISOString(),
    });

    this.save();
    return newApp;
  }
  updateApp(id: string, updates: Partial<App>): App | null {
    const app = this.findAppById(id);
    if (!app) return null;
    Object.assign(app, updates);
    this.save();
    return app;
  }
  regenerateAppSecret(id: string): string | null {
    const app = this.findAppById(id);
    if (!app) return null;
    const newSecret = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    app.secret = newSecret;
    this.save();
    return newSecret;
  }
  deleteApp(id: string): boolean {
    const idx = this.data.apps.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.data.apps.splice(idx, 1);
    // Cascade delete associated items
    this.data.keys = this.data.keys.filter(k => k.appId !== id);
    this.data.users = this.data.users.filter(u => u.appId !== id);
    this.data.tiers = this.data.tiers.filter(t => t.appId !== id);
    this.data.variables = this.data.variables.filter(v => v.appId !== id);
    this.data.blacklist = this.data.blacklist.filter(b => b.appId !== id);
    this.data.webhooks = this.data.webhooks.filter(w => w.appId !== id);
    this.data.sessions = this.data.sessions.filter(s => s.appId !== id);
    this.data.chatMessages = this.data.chatMessages.filter(c => c.appId !== id);
    this.data.eventLogs = this.data.eventLogs.filter(e => e.appId !== id);
    this.save();
    return true;
  }

  // --- KEYS ---
  getKeysByApp(appId: string) {
    return this.data.keys.filter(k => k.appId === appId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  findKeyByValue(value: string) {
    return this.data.keys.find(k => k.value === value);
  }
  findKeyById(id: string) {
    return this.data.keys.find(k => k.id === id);
  }
  createKeys(keys: Omit<Key, 'id' | 'used' | 'paused' | 'createdAt'>[]): Key[] {
    const created: Key[] = [];
    const now = new Date().toISOString();
    for (const k of keys) {
      const newKey: Key = {
        ...k,
        id: uuidv4(),
        hwidAffected: k.hwidAffected !== undefined ? k.hwidAffected : true,
        hwid: null,
        used: false,
        paused: false,
        createdAt: now,
      };
      this.data.keys.push(newKey);
      created.push(newKey);
    }
    this.save();
    return created;
  }
  updateKey(id: string, updates: Partial<Key>): Key | null {
    const key = this.findKeyById(id);
    if (!key) return null;
    Object.assign(key, updates);
    this.save();
    return key;
  }
  resetKeyHwid(id: string): Key | null {
    const key = this.findKeyById(id);
    if (!key) return null;
    key.hwid = null;
    if (key.usedBy) {
      const user = this.data.users.find(u => u.username.toLowerCase() === key.usedBy?.toLowerCase() && u.appId === key.appId);
      if (user) {
        user.hwid = null;
      }
    }
    this.save();
    return key;
  }
  resetAllKeysHwid(appId: string): number {
    let count = 0;
    for (const key of this.data.keys) {
      if (key.appId === appId && key.hwid) {
        key.hwid = null;
        count++;
      }
    }
    for (const user of this.data.users) {
      if (user.appId === appId && user.hwid) {
        user.hwid = null;
      }
    }
    this.save();
    return count;
  }
  isKeyExpired(key: Key): boolean {
    if (key.expiryDays === -1 || key.expiryUnit === 'Lifetime') {
      return false;
    }
    if (key.expiresAt) {
      return new Date(key.expiresAt).getTime() <= Date.now();
    }
    return false;
  }
  deleteKey(id: string): boolean {
    const idx = this.data.keys.findIndex(k => k.id === id);
    if (idx === -1) return false;
    this.data.keys.splice(idx, 1);
    this.save();
    return true;
  }
  deleteKeys(ids: string[]): number {
    const initialCount = this.data.keys.length;
    this.data.keys = this.data.keys.filter(k => !ids.includes(k.id));
    const deletedCount = initialCount - this.data.keys.length;
    this.save();
    return deletedCount;
  }

  // --- USERS ---
  getUsersByApp(appId: string) {
    return this.data.users.filter(u => u.appId === appId).map(u => ({
      ...u,
      subscriptions: this.data.subscriptions.filter(s => s.userId === u.id),
      variables: this.data.userVariables.filter(v => v.userId === u.id),
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  findUserById(id: string) {
    return this.data.users.find(u => u.id === id);
  }
  findUserByUsernameAndApp(username: string, appId: string) {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.appId === appId);
  }
  createUser(userData: { username: string; password: string; email?: string; hwid?: string; ip?: string; appId: string; tier?: string; expiryDays?: number }): User {
    const userId = uuidv4();
    const now = new Date().toISOString();
    const newUser: User = {
      id: userId,
      username: userData.username,
      password: userData.password,
      email: userData.email,
      hwid: userData.hwid || null,
      ip: userData.ip || '127.0.0.1',
      banned: false,
      appId: userData.appId,
      twoFactor: false,
      lastLogin: now,
      createdAt: now,
    };
    this.data.users.push(newUser);

    // Create subscription
    const expiryDays = userData.expiryDays !== undefined ? userData.expiryDays : 30;
    const expiresAt = expiryDays === -1 ? null : new Date(Date.now() + expiryDays * 86400000).toISOString();
    this.data.subscriptions.push({
      id: uuidv4(),
      userId,
      tier: userData.tier || 'default',
      expiresAt,
      createdAt: now,
    });

    this.save();
    return newUser;
  }
  updateUser(id: string, updates: Partial<User>): User | null {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    return user;
  }
  deleteUser(id: string): boolean {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    this.data.subscriptions = this.data.subscriptions.filter(s => s.userId !== id);
    this.data.userVariables = this.data.userVariables.filter(v => v.userId !== id);
    this.save();
    return true;
  }
  resetAllHwid(appId: string) {
    let count = 0;
    for (const u of this.data.users) {
      if (u.appId === appId) {
        u.hwid = null;
        count++;
      }
    }
    this.save();
    return count;
  }

  // --- SUBSCRIPTIONS ---
  getSubscriptionsByUser(userId: string) {
    return this.data.subscriptions.filter(s => s.userId === userId);
  }
  addSubscription(sub: Omit<UserSubscription, 'id' | 'createdAt'>): UserSubscription {
    const newSub: UserSubscription = {
      ...sub,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.data.subscriptions.push(newSub);
    this.save();
    return newSub;
  }

  // --- TIERS ---
  getTiersByApp(appId: string) {
    return this.data.tiers.filter(t => t.appId === appId);
  }
  createTier(tierData: { name: string; appId: string }): Tier {
    const newTier: Tier = {
      id: uuidv4(),
      name: tierData.name,
      appId: tierData.appId,
      paused: false,
      createdAt: new Date().toISOString(),
    };
    this.data.tiers.push(newTier);
    this.save();
    return newTier;
  }
  updateTier(id: string, updates: Partial<Tier>): Tier | null {
    const tier = this.data.tiers.find(t => t.id === id);
    if (!tier) return null;
    Object.assign(tier, updates);
    this.save();
    return tier;
  }
  deleteTier(id: string): boolean {
    const idx = this.data.tiers.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.data.tiers.splice(idx, 1);
    this.save();
    return true;
  }

  // --- SESSIONS ---
  createSession(sessionData: { appId: string; userId?: string | null; hwid?: string | null; ip?: string; durationMinutes?: number }): Session {
    const duration = sessionData.durationMinutes || 5;
    const newSession: Session = {
      id: uuidv4(),
      appId: sessionData.appId,
      userId: sessionData.userId || null,
      hwid: sessionData.hwid || null,
      ip: sessionData.ip,
      expiresAt: new Date(Date.now() + duration * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.data.sessions.push(newSession);
    this.save();
    return newSession;
  }
  findSessionById(id: string): Session | undefined {
    return this.data.sessions.find(s => s.id === id);
  }
  getActiveSessionsByApp(appId: string): Session[] {
    const now = new Date();
    return this.data.sessions.filter(s => s.appId === appId && new Date(s.expiresAt) > now);
  }
  deleteSession(id: string): boolean {
    const idx = this.data.sessions.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.sessions.splice(idx, 1);
    this.save();
    return true;
  }

  // --- VARIABLES ---
  getVariablesByApp(appId: string) {
    return this.data.variables.filter(v => v.appId === appId);
  }
  setVariable(appId: string, key: string, value: string): Variable {
    let variable = this.data.variables.find(v => v.appId === appId && v.key === key);
    if (variable) {
      variable.value = value;
    } else {
      variable = { id: uuidv4(), appId, key, value };
      this.data.variables.push(variable);
    }
    this.save();
    return variable;
  }
  deleteVariable(id: string): boolean {
    const idx = this.data.variables.findIndex(v => v.id === id);
    if (idx === -1) return false;
    this.data.variables.splice(idx, 1);
    this.save();
    return true;
  }
  getUserVariables(userId: string) {
    return this.data.userVariables.filter(v => v.userId === userId);
  }
  setUserVariable(userId: string, appId: string, key: string, value: string): UserVariable {
    let uv = this.data.userVariables.find(v => v.userId === userId && v.key === key);
    if (uv) {
      uv.value = value;
    } else {
      uv = { id: uuidv4(), userId, appId, key, value };
      this.data.userVariables.push(uv);
    }
    this.save();
    return uv;
  }
  deleteUserVariable(id: string): boolean {
    const idx = this.data.userVariables.findIndex(v => v.id === id);
    if (idx === -1) return false;
    this.data.userVariables.splice(idx, 1);
    this.save();
    return true;
  }

  // --- BLACKLIST ---
  getBlacklistByApp(appId: string) {
    return this.data.blacklist.filter(b => b.appId === appId);
  }
  isBlacklisted(appId: string, ip?: string, hwid?: string): boolean {
    return this.data.blacklist.some(b => 
      b.appId === appId && (
        (b.type === 'ip' && ip && b.value === ip) ||
        (b.type === 'hwid' && hwid && b.value === hwid)
      )
    );
  }
  addBlacklist(appId: string, type: 'hwid' | 'ip', value: string, reason?: string): Blacklist {
    const existing = this.data.blacklist.find(b => b.appId === appId && b.type === type && b.value === value);
    if (existing) return existing;
    const newEntry: Blacklist = {
      id: uuidv4(),
      appId,
      type,
      value,
      reason,
      createdAt: new Date().toISOString(),
    };
    this.data.blacklist.push(newEntry);
    this.save();
    return newEntry;
  }
  removeBlacklist(id: string): boolean {
    const idx = this.data.blacklist.findIndex(b => b.id === id);
    if (idx === -1) return false;
    this.data.blacklist.splice(idx, 1);
    this.save();
    return true;
  }

  // --- WEBHOOKS ---
  getWebhooksByApp(appId: string) {
    return this.data.webhooks.filter(w => w.appId === appId);
  }
  addWebhook(appId: string, url: string, name?: string, events?: string[]): Webhook {
    const newWebhook: Webhook = {
      id: uuidv4(),
      appId,
      url,
      name: name || 'Discord Webhook',
      events: events && events.length > 0 ? events : ['user_registered', 'key_redeemed', 'user_banned', 'login_success', 'login_failed'],
      createdAt: new Date().toISOString(),
    };
    this.data.webhooks.push(newWebhook);
    this.save();
    return newWebhook;
  }
  deleteWebhook(id: string): boolean {
    const idx = this.data.webhooks.findIndex(w => w.id === id);
    if (idx === -1) return false;
    this.data.webhooks.splice(idx, 1);
    this.save();
    return true;
  }

  // --- CHAT MESSAGES ---
  getChatMessages(appId: string) {
    return this.data.chatMessages.filter(c => c.appId === appId).slice(-100);
  }
  addChatMessage(appId: string, author: string, message: string): ChatMessage {
    const msg: ChatMessage = {
      id: uuidv4(),
      appId,
      author,
      message,
      createdAt: new Date().toISOString(),
    };
    this.data.chatMessages.push(msg);
    this.save();
    return msg;
  }

  // --- EVENT LOGS ---
  getLogsByApp(appId: string) {
    return this.data.eventLogs.filter(e => e.appId === appId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200);
  }
  addLog(appId: string, event: string, description: string, ip?: string): EventLog {
    const log: EventLog = {
      id: uuidv4(),
      appId,
      event,
      description,
      ip,
      timestamp: new Date().toISOString(),
    };
    this.data.eventLogs.push(log);
    this.save();
    return log;
  }
}

export const db = new Database();
