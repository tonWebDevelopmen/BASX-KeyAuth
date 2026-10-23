import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/:appId/logs', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const logs = db.getLogsByApp(app.id);
  res.json(logs);
});

export default router;
