import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Get active sessions
router.get('/:appId/sessions', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const sessions = db.getActiveSessionsByApp(app.id);
  const enriched = sessions.map(s => {
    let username = 'Guest / Key auth';
    if (s.userId) {
      const u = db.findUserById(s.userId);
      if (u) username = u.username;
    }
    return {
      ...s,
      username,
    };
  });
  res.json(enriched);
});

// Terminate a session
router.delete('/:appId/sessions/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  db.deleteSession(req.params.id);
  res.json({ success: true, message: 'Session killed' });
});

export default router;
