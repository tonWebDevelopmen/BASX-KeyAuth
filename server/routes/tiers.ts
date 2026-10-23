import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/:appId/tiers', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const tiers = db.getTiersByApp(app.id);
  res.json(tiers);
});

router.post('/:appId/tiers', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tier name is required' });
  }

  const tier = db.createTier({ name: name.trim(), appId: app.id });
  db.addLog(app.id, 'tier_created', `Subscription tier "${tier.name}" created`);
  res.json(tier);
});

router.patch('/:appId/tiers/:tierId/pause', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const tiers = db.getTiersByApp(app.id);
  const tier = tiers.find(t => t.id === req.params.tierId);
  if (!tier) {
    return res.status(404).json({ error: 'Tier not found' });
  }

  const updated = db.updateTier(tier.id, { paused: !tier.paused });
  res.json(updated);
});

router.delete('/:appId/tiers/:tierId', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  db.deleteTier(req.params.tierId);
  res.json({ success: true });
});

export default router;
