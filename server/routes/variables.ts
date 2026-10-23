import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Global Variables
router.get('/:appId/variables', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const variables = db.getVariablesByApp(app.id);
  res.json(variables);
});

router.post('/:appId/variables', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Variable key is required' });

  const variable = db.setVariable(app.id, key.trim(), value !== undefined ? String(value) : '');
  db.addLog(app.id, 'variable_set', `Global variable "${key}" set`);
  res.json(variable);
});

router.delete('/:appId/variables/:varId', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  db.deleteVariable(req.params.varId);
  res.json({ success: true });
});

// User Variables
router.get('/:appId/users/:userId/variables', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const vars = db.getUserVariables(req.params.userId);
  res.json(vars);
});

router.post('/:appId/users/:userId/variables', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key is required' });

  const uv = db.setUserVariable(req.params.userId, app.id, key.trim(), String(value || ''));
  res.json(uv);
});

router.delete('/:appId/users/:userId/variables/:varId', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  db.deleteUserVariable(req.params.varId);
  res.json({ success: true });
});

export default router;
