import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

function formatKeyFromMask(mask: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return mask.replace(/X/g, () => chars[Math.floor(Math.random() * chars.length)]);
}

router.post('/', async (req: Request, res: Response) => {
  const sellerKey = req.headers['x-seller-key'] as string;
  if (!sellerKey) {
    return res.status(401).json({ success: false, message: 'Seller key is missing in header "x-seller-key"' });
  }

  const owner = db.findOwnerBySellerKey(sellerKey);
  if (!owner) {
    return res.status(401).json({ success: false, message: 'Invalid seller key' });
  }

  const { action, appId, ...params } = req.body;
  if (!appId) {
    return res.status(400).json({ success: false, message: 'appId parameter is required' });
  }

  const app = db.findAppById(appId);
  if (!app || app.ownerId !== owner.id) {
    return res.status(404).json({ success: false, message: 'Application not found or unauthorized' });
  }

  try {
    switch (action) {
      case 'generate_key': {
        const { mask = 'XXXX-XXXX-XXXX-XXXX', amount = 1, level = 'default', expiryDays = 30, note } = params;
        const count = Math.min(Math.max(1, parseInt(amount) || 1), 1000);
        const exp = parseInt(expiryDays) !== undefined ? parseInt(expiryDays) : 30;

        const newKeysData = [];
        for (let i = 0; i < count; i++) {
          let keyVal = '';
          let attempts = 0;
          do {
            keyVal = formatKeyFromMask(mask);
            attempts++;
          } while (attempts < 20 && db.findKeyByValue(keyVal));

          newKeysData.push({
            value: keyVal,
            appId: app.id,
            level: level || 'default',
            expiryDays: exp,
            hwidAffected: true,
            note,
            generatedBy: 'Seller API',
          });
        }

        const created = db.createKeys(newKeysData);
        db.addLog(app.id, 'seller_gen_keys', `Seller API generated ${created.length} keys`);
        return res.json({
          success: true,
          message: `Generated ${created.length} keys`,
          keys: created.map(k => k.value),
        });
      }

      case 'ban_user': {
        if (!params.username) return res.json({ success: false, message: 'Username is required' });
        const user = db.findUserByUsernameAndApp(params.username, app.id);
        if (!user) return res.json({ success: false, message: 'User not found' });
        db.updateUser(user.id, { banned: true });
        db.addLog(app.id, 'seller_ban_user', `User "${params.username}" banned via Seller API`);
        return res.json({ success: true, message: 'User banned' });
      }

      case 'unban_user': {
        if (!params.username) return res.json({ success: false, message: 'Username is required' });
        const user = db.findUserByUsernameAndApp(params.username, app.id);
        if (!user) return res.json({ success: false, message: 'User not found' });
        db.updateUser(user.id, { banned: false });
        db.addLog(app.id, 'seller_unban_user', `User "${params.username}" unbanned via Seller API`);
        return res.json({ success: true, message: 'User unbanned' });
      }

      case 'delete_user': {
        if (!params.username) return res.json({ success: false, message: 'Username is required' });
        const user = db.findUserByUsernameAndApp(params.username, app.id);
        if (!user) return res.json({ success: false, message: 'User not found' });
        db.deleteUser(user.id);
        db.addLog(app.id, 'seller_del_user', `User "${params.username}" deleted via Seller API`);
        return res.json({ success: true, message: 'User deleted' });
      }

      case 'reset_hwid': {
        if (!params.username) return res.json({ success: false, message: 'Username is required' });
        const user = db.findUserByUsernameAndApp(params.username, app.id);
        if (!user) return res.json({ success: false, message: 'User not found' });
        db.updateUser(user.id, { hwid: null });
        db.addLog(app.id, 'seller_reset_hwid', `HWID reset for user "${params.username}" via Seller API`);
        return res.json({ success: true, message: 'HWID reset' });
      }

      case 'get_user_info': {
        if (!params.username) return res.json({ success: false, message: 'Username is required' });
        const user = db.findUserByUsernameAndApp(params.username, app.id);
        if (!user) return res.json({ success: false, message: 'User not found' });
        const subs = db.getSubscriptionsByUser(user.id);
        const vars = db.getUserVariables(user.id);
        return res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            hwid: user.hwid,
            ip: user.ip,
            banned: user.banned,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            subscriptions: subs,
            variables: vars,
          },
        });
      }

      case 'pause_app': {
        db.updateApp(app.id, { paused: true });
        db.addLog(app.id, 'seller_pause_app', 'Application paused via Seller API');
        return res.json({ success: true, message: 'App paused' });
      }

      case 'unpause_app': {
        db.updateApp(app.id, { paused: false });
        db.addLog(app.id, 'seller_unpause_app', 'Application unpaused via Seller API');
        return res.json({ success: true, message: 'App unpaused' });
      }

      case 'get_app_stats': {
        const userCount = db.getUsersByApp(app.id).length;
        const keyCount = db.getKeysByApp(app.id).length;
        const onlineCount = db.getActiveSessionsByApp(app.id).length;
        return res.json({
          success: true,
          stats: {
            totalUsers: userCount,
            totalKeys: keyCount,
            onlineUsers: onlineCount,
            version: app.version,
            paused: app.paused,
          },
        });
      }

      default:
        return res.json({ success: false, message: `Unknown action: "${action}"` });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

export default router;
