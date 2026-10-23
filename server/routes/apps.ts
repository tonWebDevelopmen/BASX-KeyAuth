import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// List all applications for current owner
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const apps = db.getAppsByOwner(req.owner!.id);
  const formatted = apps.map(app => {
    const keys = db.getKeysByApp(app.id);
    const users = db.getUsersByApp(app.id);
    const onlineSessions = db.getActiveSessionsByApp(app.id);
    return {
      ...app,
      _count: {
        keys: keys.length,
        users: users.length,
      },
      onlineUsers: onlineSessions.length,
    };
  });
  res.json(formatted);
});

// Create new application
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { name, version, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    const existing = db.findAppByNameAndOwner(name.trim(), req.owner!.id);
    if (existing) {
      return res.status(400).json({ error: 'You already have an application with this name' });
    }

    const app = db.createApp({
      name: name.trim(),
      version: version && version.trim() ? version.trim() : '1.0',
      description: description && description.trim() ? description.trim() : 'Application licensed via BasxAuth Service PRO',
      ownerId: req.owner!.id,
    });

    db.addLog(app.id, 'app_created', `Application "${app.name}" was created`);

    const keys = db.getKeysByApp(app.id);
    const users = db.getUsersByApp(app.id);
    res.json({
      ...app,
      _count: { keys: keys.length, users: users.length },
      onlineUsers: 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create application' });
  }
});

// Get single application
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.id);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const keys = db.getKeysByApp(app.id);
  const users = db.getUsersByApp(app.id);
  const onlineSessions = db.getActiveSessionsByApp(app.id);

  res.json({
    ...app,
    _count: {
      keys: keys.length,
      users: users.length,
    },
    onlineUsers: onlineSessions.length,
  });
});

// Toggle pause application
router.patch('/:id/pause', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.id);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const updated = db.updateApp(app.id, { paused: !app.paused });
  db.addLog(app.id, 'app_paused_toggle', `Application was ${updated!.paused ? 'paused' : 'unpaused'}`);
  res.json(updated);
});

// Regenerate application secret
router.patch('/:id/secret', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.id);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const newSecret = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
  const updated = db.updateApp(app.id, { secret: newSecret });
  db.addLog(app.id, 'secret_regenerated', 'Application secret was regenerated');
  res.json(updated);
});

// Rename application
router.patch('/:id/rename', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.id);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'New name is required' });
  }

  const existing = db.findAppByNameAndOwner(name.trim(), req.owner!.id);
  if (existing && existing.id !== app.id) {
    return res.status(400).json({ error: 'An application with this name already exists' });
  }

  const updated = db.updateApp(app.id, { name: name.trim() });
  db.addLog(app.id, 'app_renamed', `Application renamed from "${app.name}" to "${name.trim()}"`);
  res.json(updated);
});

// Update description and version
router.patch('/:id/description', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.id);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { description, version } = req.body;
  const updates: any = {};
  if (description !== undefined) updates.description = description;
  if (version !== undefined && version.trim()) updates.version = version.trim();

  const updated = db.updateApp(app.id, updates);
  db.addLog(app.id, 'app_updated', 'Application settings updated');
  res.json(updated);
});

// Delete application
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.id);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  db.deleteApp(app.id);
  res.json({ success: true, message: 'Application deleted successfully' });
});

export default router;
