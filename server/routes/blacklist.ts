import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/:appId/blacklist', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const list = db.getBlacklistByApp(app.id);
  res.json(list);
});

router.post('/:appId/blacklist', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { type, value, reason } = req.body;
  if (!type || !value) {
    return res.status(400).json({ error: 'Type (ip/hwid) and value are required' });
  }

  if (type !== 'ip' && type !== 'hwid') {
    return res.status(400).json({ error: 'Type must be "ip" or "hwid"' });
  }

  const entry = db.addBlacklist(app.id, type, value.trim(), reason ? reason.trim() : undefined);
  db.addLog(app.id, 'blacklist_added', `Added ${type.toUpperCase()}: ${value.trim()} to blacklist`);
  res.json(entry);
});

router.delete('/:appId/blacklist/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  db.removeBlacklist(req.params.id);
  res.json({ success: true });
});

export default router;
