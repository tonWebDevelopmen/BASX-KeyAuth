import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

function formatKeyFromMask(mask: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  // Replace X or * with random characters
  return mask.replace(/[X*]/g, () => chars[Math.floor(Math.random() * chars.length)]);
}

function calculateDurationInSeconds(unit: string, duration: number): number {
  if (unit === 'Lifetime' || duration === -1) {
    return -1;
  }
  const d = Math.max(1, duration || 1);
  switch (unit) {
    case 'Seconds':
      return d;
    case 'Minutes':
      return d * 60;
    case 'Hours':
      return d * 3600;
    case 'Days':
      return d * 86400;
    case 'Weeks':
      return d * 604800;
    case 'Months':
      return d * 2592000; // 30 days
    case 'Years':
      return d * 31536000; // 365 days
    default:
      return d * 86400;
  }
}

// List all keys for an app
router.get('/:appId/keys', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const keys = db.getKeysByApp(app.id);
  res.json(keys);
});

// Generate keys in bulk with HWID Affected and flexible time units
router.post('/:appId/keys/generate', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const app = db.findAppById(req.params.appId);
    if (!app || app.ownerId !== req.owner!.id) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const {
      mask = 'BasX-******',
      amount = 1,
      level = '1 (default)',
      expiryUnit = 'Days',
      expiryDuration = 3,
      expiryDays,
      hwidAffected = true,
      note = '',
    } = req.body;

    const count = Math.max(1, parseInt(amount) || 1);
    const unit = expiryUnit || 'Days';
    const durationNum = unit === 'Lifetime' ? -1 : (parseInt(expiryDuration) || 1);
    const durationSeconds = calculateDurationInSeconds(unit, durationNum);

    // Legacy fallback for expiryDays
    const expDays = durationSeconds === -1 ? -1 : (durationSeconds / 86400);

    const newKeysData = [];
    for (let i = 0; i < count; i++) {
      let keyVal = '';
      let attempts = 0;
      do {
        keyVal = formatKeyFromMask(mask);
        attempts++;
      } while (attempts < 25 && db.findKeyByValue(keyVal));

      newKeysData.push({
        value: keyVal,
        appId: app.id,
        level: level || 'default',
        expiryDays: expDays,
        durationSeconds,
        expiryUnit: unit as any,
        expiryDuration: durationNum,
        hwidAffected: Boolean(hwidAffected),
        note: note ? note.trim() : undefined,
        generatedBy: req.owner!.username,
      });
    }

    const createdKeys = db.createKeys(newKeysData);
    db.addLog(
      app.id,
      'keys_generated',
      `Generated ${createdKeys.length} license keys (Level: ${level}, Unit: ${unit}, Duration: ${durationNum}, HWID-Lock: ${hwidAffected ? 'ENABLED' : 'DISABLED'})`
    );

    res.json(createdKeys);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate keys' });
  }
});

// Reset single key HWID
router.patch('/:appId/keys/:keyId/reset-hwid', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const key = db.findKeyById(req.params.keyId);
  if (!key || key.appId !== app.id) {
    return res.status(404).json({ error: 'Key not found' });
  }

  const updated = db.resetKeyHwid(key.id);
  db.addLog(app.id, 'key_hwid_reset', `HWID reset for key "${key.value}"`);
  res.json({ success: true, key: updated, message: 'Key HWID reset successfully' });
});

// Reset all keys HWID in an app
router.post('/:appId/keys/reset-all-hwid', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const count = db.resetAllKeysHwid(app.id);
  db.addLog(app.id, 'all_keys_hwid_reset', `Reset HWID for all ${count} keys in application`);
  res.json({ success: true, count, message: `Reset HWID for ${count} keys` });
});

// Pause / unpause a key
router.patch('/:appId/keys/:keyId/pause', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const key = db.findKeyById(req.params.keyId);
  if (!key || key.appId !== app.id) {
    return res.status(404).json({ error: 'Key not found' });
  }

  const updated = db.updateKey(key.id, { paused: !key.paused });
  res.json(updated);
});

// Delete single key
router.delete('/:appId/keys/:keyId', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const key = db.findKeyById(req.params.keyId);
  if (!key || key.appId !== app.id) {
    return res.status(404).json({ error: 'Key not found' });
  }

  db.deleteKey(key.id);
  res.json({ success: true, message: 'Key deleted' });
});

// Bulk delete keys
router.post('/:appId/keys/bulk-delete', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array of key IDs required' });
  }

  const count = db.deleteKeys(ids);
  res.json({ success: true, count, message: `Deleted ${count} keys` });
});

export default router;
