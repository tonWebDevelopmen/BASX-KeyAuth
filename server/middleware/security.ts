import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
  failedLoginAttempts: number;
  lastFailedLogin?: number;
  bannedUntil?: number;
}

// In-memory security tracker
const ipTracker = new Map<string, RateLimitRecord>();

// Security metrics
export const securityStats = {
  totalRequestsChecked: 0,
  blockedAttacks: 0,
  ddosFloodsBlocked: 0,
  bruteForceBlocked: 0,
  maliciousBotsBlocked: 0,
  currentlyBannedIps: 0,
  shieldStatus: 'ARMED_AND_ACTIVE',
  startedAt: new Date().toISOString(),
  recentIncidents: [] as Array<{
    ip: string;
    reason: string;
    type: 'ddos' | 'bruteforce' | 'exploit_scanner' | 'rate_limit';
    timestamp: string;
  }>,
};

// Known malicious user-agent patterns (scanners, exploiters, automated scrapers)
const MALICIOUS_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /dirbuster/i,
  /wpscan/i,
  /acunetix/i,
  /havij/i,
  /gobuster/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /censys/i,
  /shodan/i,
  /hydra/i,
  /medusa/i,
];

// Helper to get client IP
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function recordIncident(ip: string, reason: string, type: 'ddos' | 'bruteforce' | 'exploit_scanner' | 'rate_limit') {
  securityStats.blockedAttacks++;
  if (type === 'ddos') securityStats.ddosFloodsBlocked++;
  if (type === 'bruteforce') securityStats.bruteForceBlocked++;
  if (type === 'exploit_scanner') securityStats.maliciousBotsBlocked++;

  securityStats.recentIncidents.unshift({
    ip,
    reason,
    type,
    timestamp: new Date().toISOString(),
  });
  if (securityStats.recentIncidents.length > 50) {
    securityStats.recentIncidents.pop();
  }
}

/**
 * HTTP Security Headers Middleware
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Shield-Provider', 'BasxAuth Service PRO Anti-DDoS');
  res.setHeader('X-Firewall-Status', 'Enforcing');
  next();
}

/**
 * DDoS Flood & Vulnerability Scanner Protection Middleware
 */
export function ddosAndHackProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  securityStats.totalRequestsChecked++;

  // 1. Check Malicious User Agents (Security Scanner Defense)
  const ua = req.headers['user-agent'] || '';
  for (const pattern of MALICIOUS_UA_PATTERNS) {
    if (pattern.test(ua)) {
      recordIncident(ip, `Malicious scanner detected: ${ua.substring(0, 50)}`, 'exploit_scanner');
      return res.status(403).json({
        error: 'Security Gateway: Access denied. Automated vulnerability scanners are blocked.',
        incidentId: `SEC-${now}`,
      });
    }
  }

  // 2. Track IP activity
  let record = ipTracker.get(ip);
  if (!record) {
    record = { timestamps: [], failedLoginAttempts: 0 };
    ipTracker.set(ip, record);
  }

  // Check if IP is currently banned
  if (record.bannedUntil && record.bannedUntil > now) {
    const remainingSeconds = Math.ceil((record.bannedUntil - now) / 1000);
    return res.status(429).json({
      error: 'Anti-DDoS Shield: Your IP is temporarily restricted due to excessive requests or attack attempts.',
      retryAfterSeconds: remainingSeconds,
      status: 'BLOCKED',
    });
  }

  // Filter timestamps within the last 60 seconds
  record.timestamps = record.timestamps.filter(t => now - t < 60000);
  record.timestamps.push(now);

  // 3. DDoS Burst Protection: More than 40 requests within 2 seconds
  const last2Secs = record.timestamps.filter(t => now - t < 2000);
  if (last2Secs.length > 40) {
    record.bannedUntil = now + 10 * 60 * 1000; // Ban for 10 minutes
    securityStats.currentlyBannedIps++;
    recordIncident(ip, `DDoS burst flood detected (${last2Secs.length} reqs in 2s)`, 'ddos');
    return res.status(429).json({
      error: 'DDoS Shield Alert: Rapid request burst detected. IP quarantined for 10 minutes.',
      status: 'BLOCKED',
    });
  }

  // 4. General Rate Limit: Max 180 requests per minute
  if (record.timestamps.length > 180) {
    record.bannedUntil = now + 5 * 60 * 1000; // Ban for 5 minutes
    securityStats.currentlyBannedIps++;
    recordIncident(ip, `Rate limit exceeded (>180 reqs/min)`, 'rate_limit');
    return res.status(429).json({
      error: 'Rate limit exceeded: Please slow down your requests.',
      status: 'THROTTLED',
    });
  }

  next();
}

/**
 * Brute-Force Login Shield
 */
export function trackFailedLogin(ip: string) {
  const now = Date.now();
  let record = ipTracker.get(ip);
  if (!record) {
    record = { timestamps: [], failedLoginAttempts: 0 };
    ipTracker.set(ip, record);
  }
  record.failedLoginAttempts++;
  record.lastFailedLogin = now;

  if (record.failedLoginAttempts >= 5) {
    record.bannedUntil = now + 15 * 60 * 1000; // Ban for 15 minutes after 5 consecutive failures
    securityStats.currentlyBannedIps++;
    recordIncident(ip, `Brute-force password guessing detected (5 failed attempts)`, 'bruteforce');
  }
}

export function resetFailedLogin(ip: string) {
  const record = ipTracker.get(ip);
  if (record) {
    record.failedLoginAttempts = 0;
  }
}

export function unbanIp(ip: string): boolean {
  const record = ipTracker.get(ip);
  if (record && record.bannedUntil) {
    record.bannedUntil = undefined;
    record.failedLoginAttempts = 0;
    securityStats.currentlyBannedIps = Math.max(0, securityStats.currentlyBannedIps - 1);
    return true;
  }
  return false;
}

export function getActiveBannedIps(): Array<{ ip: string; bannedUntil: number; remainingSeconds: number }> {
  const now = Date.now();
  const banned: Array<{ ip: string; bannedUntil: number; remainingSeconds: number }> = [];
  for (const [ip, rec] of ipTracker.entries()) {
    if (rec.bannedUntil && rec.bannedUntil > now) {
      banned.push({
        ip,
        bannedUntil: rec.bannedUntil,
        remainingSeconds: Math.ceil((rec.bannedUntil - now) / 1000),
      });
    }
  }
  securityStats.currentlyBannedIps = banned.length;
  return banned;
}
