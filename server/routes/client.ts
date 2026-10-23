import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { getClientIp } from '../middleware/security';

const router = Router();

async function dispatchWebhook(appId: string, event: string, data: any) {
  try {
    const webhooks = db.getWebhooksByApp(appId);
    for (const wh of webhooks) {
      if (wh.events.includes(event)) {
        const payload = {
          embeds: [
            {
              title: `BasxAuth Event: ${event.toUpperCase().replace(/_/g, ' ')}`,
              description: `A **${event}** event occurred on application.`,
              color: event.includes('fail') || event.includes('ban') ? 0xef4444 : 0x10b981,
              fields: Object.entries(data).map(([name, value]) => ({
                name,
                value: String(value),
                inline: true,
              })),
              timestamp: new Date().toISOString(),
            },
          ],
        };

        fetch(wh.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
    }
  } catch {}
}

const handleClientRequest = async (req: Request, res: Response) => {
  // Merge body and query params to support all KeyAuth SDK client transport styles
  const params = { ...req.query, ...req.body };
  const {
    type,
    name,
    ownerid,
    secret,
    sessionid,
    username,
    pass,
    key,
    hwid,
    email,
    ver,
    version,
    varid,
    vardata,
    message,
  } = params;

  const appVersion = ver || version || '1.0';
  const clientIp = getClientIp(req);

  try {
    // 1. INIT: KeyAuth Handshake
    if (type === 'init') {
      if (!name || !ownerid) {
        return res.json({ success: false, message: 'Application name and owner ID are required' });
      }

      const app = db.findAppByNameAndOwner(name, ownerid);
      if (!app) {
        return res.json({ success: false, message: 'Application not found with provided credentials' });
      }

      // Check application secret if provided
      if (secret && app.secret && secret !== app.secret) {
        return res.json({ success: false, message: 'Application secret is invalid' });
      }

      if (app.paused) {
        return res.json({ success: false, message: 'Application is currently paused by developer' });
      }

      const session = db.createSession({
        appId: app.id,
        hwid: hwid || null,
        ip: clientIp,
        durationMinutes: 60, // 1 hour session
      });

      const userCount = db.getUsersByApp(app.id).length;
      const keyCount = db.getKeysByApp(app.id).length;
      const onlineSessions = db.getActiveSessionsByApp(app.id);

      db.addLog(app.id, 'client_init', `Client handshake initiated from IP: ${clientIp}`, clientIp);

      return res.json({
        success: true,
        message: 'Initialized',
        sessionid: session.id,
        appinfo: {
          numUsers: userCount,
          numOnlineUsers: onlineSessions.length,
          numKeys: keyCount,
          version: app.version,
          customerPanel: '',
        },
      });
    }

    // For all subsequent actions, validate active session
    if (!sessionid) {
      return res.json({ success: false, message: 'Session ID is required. Please call init first.' });
    }

    const session = db.findSessionById(sessionid);
    if (!session || new Date(session.expiresAt) <= new Date()) {
      return res.json({ success: false, message: 'Session has expired or is invalid. Please reinitialize.' });
    }

    const app = db.findAppById(session.appId);
    if (!app) {
      return res.json({ success: false, message: 'Application not found' });
    }

    if (app.paused) {
      return res.json({ success: false, message: 'Application is currently paused' });
    }

    // Blacklist check
    if (db.isBlacklisted(app.id, clientIp, hwid)) {
      db.addLog(app.id, 'blacklist_blocked', `Blacklisted access attempt blocked (IP: ${clientIp}, HWID: ${hwid || 'N/A'})`, clientIp);
      return res.json({ success: false, message: 'Your IP or Hardware ID has been blacklisted.' });
    }

    // 2. LICENSE: Direct License-Only Authentication
    if (type === 'license') {
      if (!key) {
        return res.json({ success: false, message: 'License key is required' });
      }

      const license = db.findKeyByValue(key);
      if (!license || license.appId !== app.id) {
        return res.json({ success: false, message: 'Key Not Found' });
      }

      if (license.paused) {
        return res.json({ success: false, message: 'License key is paused' });
      }

      // Expiry Check
      if (db.isKeyExpired(license)) {
        return res.json({ success: false, message: 'Key has expired / คีย์หมดอายุ' });
      }

      // HWID LOCKING LOGIC
      // If hwidAffected is true (or undefined): enforces 1:1 hardware ID lock
      if (license.hwidAffected !== false) {
        if (license.hwid && hwid && license.hwid !== hwid) {
          db.addLog(app.id, 'hwid_mismatch', `HWID mismatch for key "${license.value}" (locked: ${license.hwid}, incoming: ${hwid})`, clientIp);
          return res.json({ success: false, message: "HWID Doesn't match. Ask owner to reset HWID." });
        }

        // First use or unassigned HWID: lock to this device
        if (!license.hwid && hwid) {
          license.hwid = hwid;
          license.used = true;
          license.usedBy = `device_${hwid.substring(0, 8)}`;
          license.usedOn = license.usedOn || new Date().toISOString();

          // Activate expiry timer upon first use
          if (!license.expiresAt) {
            if (license.durationSeconds && license.durationSeconds > 0) {
              license.expiresAt = new Date(Date.now() + license.durationSeconds * 1000).toISOString();
            } else if (license.expiryDays && license.expiryDays > 0) {
              license.expiresAt = new Date(Date.now() + license.expiryDays * 86400000).toISOString();
            }
          }
          db.updateKey(license.id, license);
          db.addLog(app.id, 'hwid_bound', `Key "${license.value}" bound to HWID: ${hwid}`, clientIp);
        }
      } else {
        // Multi-device key: does NOT lock HWID! Multiple devices can use this key simultaneously.
        if (!license.used) {
          license.used = true;
          license.usedBy = 'Multi-Device License';
          license.usedOn = new Date().toISOString();

          if (!license.expiresAt) {
            if (license.durationSeconds && license.durationSeconds > 0) {
              license.expiresAt = new Date(Date.now() + license.durationSeconds * 1000).toISOString();
            } else if (license.expiryDays && license.expiryDays > 0) {
              license.expiresAt = new Date(Date.now() + license.expiryDays * 86400000).toISOString();
            }
          }
          db.updateKey(license.id, license);
        }
      }

      // Re-verify expiry if just set
      if (db.isKeyExpired(license)) {
        return res.json({ success: false, message: 'Key has expired / คีย์หมดอายุ' });
      }

      const globalVars = db.getVariablesByApp(app.id);
      db.addLog(app.id, 'license_auth', `License verified for key "${license.value}" (HWID-Lock: ${license.hwidAffected !== false ? 'YES' : 'NO'})`, clientIp);

      const timeLeftSeconds = license.expiresAt
        ? Math.max(0, Math.floor((new Date(license.expiresAt).getTime() - Date.now()) / 1000))
        : 999999999;

      return res.json({
        success: true,
        message: 'Logged in!',
        info: {
          username: license.usedBy || 'LicenseUser',
          subscriptions: [
            {
              subscription: license.level,
              key: license.value,
              expiry: license.expiresAt ? Math.floor(new Date(license.expiresAt).getTime() / 1000).toString() : 'Lifetime',
              timeleft: timeLeftSeconds,
            },
          ],
          ip: clientIp,
          hwid: license.hwid || hwid || 'N/A',
          createdate: Math.floor(new Date(license.createdAt).getTime() / 1000).toString(),
          lastlogin: Math.floor(Date.now() / 1000).toString(),
        },
        globalVariables: globalVars.reduce((acc: any, v) => { acc[v.key] = v.value; return acc; }, {}),
      });
    }

    // 3. LOGIN: Username + Password authentication
    if (type === 'login') {
      if (!username || !pass) {
        return res.json({ success: false, message: 'Username and password are required' });
      }

      const user = db.findUserByUsernameAndApp(username, app.id);
      if (!user) {
        await dispatchWebhook(app.id, 'login_failed', { username, ip: clientIp, reason: 'User not found' });
        db.addLog(app.id, 'login_failed', `Failed login attempt for non-existent user "${username}"`, clientIp);
        return res.json({ success: false, message: 'Username does not exist' });
      }

      if (user.banned) {
        db.addLog(app.id, 'login_banned', `Banned user "${username}" attempted to login`, clientIp);
        return res.json({ success: false, message: 'Your account has been banned from this application.' });
      }

      const isPasswordMatch = bcrypt.compareSync(pass, user.password);
      if (!isPasswordMatch) {
        await dispatchWebhook(app.id, 'login_failed', { username, ip: clientIp, reason: 'Incorrect password' });
        db.addLog(app.id, 'login_failed', `Failed login attempt for user "${username}" (wrong password)`, clientIp);
        return res.json({ success: false, message: 'Password does not match' });
      }

      // HWID LOCK verification
      if (user.hwid && hwid && user.hwid !== hwid) {
        db.addLog(app.id, 'hwid_mismatch', `HWID mismatch for user "${username}" (expected: ${user.hwid}, got: ${hwid})`, clientIp);
        return res.json({ success: false, message: "HWID Doesn't match. Ask owner to reset HWID." });
      }

      // Bind HWID if empty
      if (!user.hwid && hwid) {
        db.updateUser(user.id, { hwid, ip: clientIp, lastLogin: new Date().toISOString() });
        db.addLog(app.id, 'hwid_bound', `HWID bound for user "${username}" to: ${hwid}`, clientIp);
      } else {
        db.updateUser(user.id, { ip: clientIp, lastLogin: new Date().toISOString() });
      }

      // Check subscriptions
      const subs = db.getSubscriptionsByUser(user.id);
      const now = new Date();
      const activeSubs = subs.filter(s => !s.expiresAt || new Date(s.expiresAt) > now);

      if (activeSubs.length === 0) {
        return res.json({ success: false, message: 'Your subscription has expired or does not exist.' });
      }

      session.userId = user.id;

      const userVars = db.getUserVariables(user.id);
      const globalVars = db.getVariablesByApp(app.id);

      await dispatchWebhook(app.id, 'login_success', { username, ip: clientIp, hwid: hwid || 'N/A' });
      db.addLog(app.id, 'login_success', `User "${username}" logged in successfully`, clientIp);

      return res.json({
        success: true,
        message: 'Logged in!',
        info: {
          username: user.username,
          subscriptions: activeSubs.map(s => ({
            subscription: s.tier,
            key: null,
            expiry: s.expiresAt ? Math.floor(new Date(s.expiresAt).getTime() / 1000).toString() : 'Lifetime',
            timeleft: s.expiresAt ? Math.max(0, Math.floor((new Date(s.expiresAt).getTime() - Date.now()) / 1000)) : 999999999,
          })),
          ip: clientIp,
          hwid: user.hwid || hwid,
          createdate: Math.floor(new Date(user.createdAt).getTime() / 1000).toString(),
          lastlogin: Math.floor(new Date().getTime() / 1000).toString(),
        },
        userVariables: userVars.reduce((acc: any, v) => { acc[v.key] = v.value; return acc; }, {}),
        globalVariables: globalVars.reduce((acc: any, v) => { acc[v.key] = v.value; return acc; }, {}),
      });
    }

    // 4. REGISTER: Create account using a license key
    if (type === 'register') {
      if (!username || !pass || !key) {
        return res.json({ success: false, message: 'Username, password, and license key are required' });
      }

      const license = db.findKeyByValue(key);
      if (!license || license.appId !== app.id) {
        return res.json({ success: false, message: 'Key Not Found' });
      }

      if (license.used) {
        return res.json({ success: false, message: 'Key Already Used' });
      }

      if (license.paused) {
        return res.json({ success: false, message: 'License key is paused' });
      }

      if (db.isKeyExpired(license)) {
        return res.json({ success: false, message: 'Key has expired / คีย์หมดอายุ' });
      }

      const existingUser = db.findUserByUsernameAndApp(username, app.id);
      if (existingUser) {
        return res.json({ success: false, message: 'Username already taken' });
      }

      const hashedPassword = bcrypt.hashSync(pass, 10);
      const user = db.createUser({
        username: username.trim(),
        password: hashedPassword,
        email: email ? email.trim() : undefined,
        hwid: hwid ? hwid.trim() : undefined,
        ip: clientIp,
        appId: app.id,
        tier: license.level,
        expiryDays: license.expiryDays,
      });

      // Mark license key as used
      db.updateKey(license.id, {
        used: true,
        usedBy: user.username,
        usedOn: new Date().toISOString(),
      });

      session.userId = user.id;

      await dispatchWebhook(app.id, 'user_registered', { username: user.username, ip: clientIp, tier: license.level });
      await dispatchWebhook(app.id, 'key_redeemed', { username: user.username, key: license.value, tier: license.level });
      db.addLog(app.id, 'user_registered', `User "${user.username}" registered using license key "${license.value}"`, clientIp);

      return res.json({
        success: true,
        message: 'Logged in!',
        info: {
          username: user.username,
          subscriptions: [
            {
              subscription: license.level,
              key: license.value,
              expiry: license.expiryDays === -1 ? 'Lifetime' : Math.floor((Date.now() + license.expiryDays * 86400000) / 1000).toString(),
              timeleft: license.expiryDays === -1 ? 999999999 : license.expiryDays * 86400,
            },
          ],
          ip: clientIp,
          hwid: user.hwid || hwid,
          createdate: Math.floor(Date.now() / 1000).toString(),
          lastlogin: Math.floor(Date.now() / 1000).toString(),
        },
      });
    }

    // 5. BAN: Self-report / ban user from client
    if (type === 'ban') {
      if (session.userId) {
        const user = db.findUserById(session.userId);
        if (user) {
          db.updateUser(user.id, { banned: true });
          if (user.hwid) {
            db.addBlacklist(app.id, 'hwid', user.hwid, 'Client detected tamper/ban directive');
          }
          await dispatchWebhook(app.id, 'user_banned', { username: user.username, reason: 'Client self-ban' });
          db.addLog(app.id, 'user_banned', `User "${user.username}" banned via client ban trigger`, clientIp);
        }
      }
      return res.json({ success: true, message: 'Banned successfully' });
    }

    // 6. CHECK: Check session heartbeat
    if (type === 'check') {
      return res.json({ success: true, message: 'Session active and healthy' });
    }

    // 7. GETVAR: Get variable
    if (type === 'var' || type === 'getvar') {
      if (!varid) return res.json({ success: false, message: 'Variable ID (name) required' });

      if (session.userId) {
        const uv = db.getUserVariables(session.userId).find(v => v.key === varid);
        if (uv) return res.json({ success: true, response: uv.value });
      }

      const gv = db.getVariablesByApp(app.id).find(v => v.key === varid);
      if (gv) return res.json({ success: true, response: gv.value });

      return res.json({ success: false, message: 'Variable not found' });
    }

    // 8. SETVAR: Set user variable
    if (type === 'setvar') {
      if (!session.userId) {
        return res.json({ success: false, message: 'Must be logged in to set user variables' });
      }
      if (!varid) return res.json({ success: false, message: 'Variable key required' });

      db.setUserVariable(session.userId, app.id, varid, String(vardata || ''));
      return res.json({ success: true, message: 'Variable saved' });
    }

    // 9. LOG: Log message
    if (type === 'log') {
      db.addLog(app.id, 'client_log', `Client Log: ${message || 'No message'}`, clientIp);
      return res.json({ success: true, message: 'Logged successfully' });
    }

    return res.json({ success: false, message: `Unknown request type: ${type}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

router.post('/', handleClientRequest);
router.get('/', handleClientRequest);

export default router;
