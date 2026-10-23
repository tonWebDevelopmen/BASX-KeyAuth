import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// List users for an app
router.get('/:appId/users', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const users = db.getUsersByApp(app.id);
  res.json(users);
});

// Create user manually
router.post('/:appId/users/create', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const app = db.findAppById(req.params.appId);
    if (!app || app.ownerId !== req.owner!.id) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const { username, password, email, hwid, tier = 'default', expiryDays = 30 } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existing = db.findUserByUsernameAndApp(username, app.id);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists in this application' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = db.createUser({
      username: username.trim(),
      password: hashedPassword,
      email: email ? email.trim() : undefined,
      hwid: hwid ? hwid.trim() : undefined,
      ip: req.ip || '127.0.0.1',
      appId: app.id,
      tier,
      expiryDays: parseInt(expiryDays),
    });

    db.addLog(app.id, 'user_created', `User "${user.username}" was created manually by admin`);

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      hwid: user.hwid,
      ip: user.ip,
      banned: user.banned,
      appId: user.appId,
      createdAt: user.createdAt,
      subscriptions: db.getSubscriptionsByUser(user.id),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

// Toggle ban/unban user
router.patch('/:appId/users/:userId/ban', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const user = db.findUserById(req.params.userId);
  if (!user || user.appId !== app.id) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updated = db.updateUser(user.id, { banned: !user.banned });
  db.addLog(app.id, 'user_ban_toggle', `User "${user.username}" was ${updated!.banned ? 'banned' : 'unbanned'}`);
  res.json(updated);
});

// Reset single user HWID
router.patch('/:appId/users/:userId/reset-hwid', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const user = db.findUserById(req.params.userId);
  if (!user || user.appId !== app.id) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updated = db.updateUser(user.id, { hwid: null });
  db.addLog(app.id, 'user_hwid_reset', `HWID reset for user "${user.username}"`);
  res.json(updated);
});

// Reset all users HWID in an app
router.patch('/:appId/users/reset-all-hwid', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const count = db.resetAllHwid(app.id);
  db.addLog(app.id, 'all_hwid_reset', `Reset HWID for all ${count} users in application`);
  res.json({ success: true, count, message: `Reset HWID for ${count} users` });
});

// Delete user
router.delete('/:appId/users/:userId', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const user = db.findUserById(req.params.userId);
  if (!user || user.appId !== app.id) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.deleteUser(user.id);
  db.addLog(app.id, 'user_deleted', `User "${user.username}" was deleted`);
  res.json({ success: true, message: 'User deleted' });
});

export default router;
