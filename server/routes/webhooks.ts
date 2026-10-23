import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/:appId/webhooks', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const webhooks = db.getWebhooksByApp(app.id);
  res.json(webhooks);
});

router.post('/:appId/webhooks', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { url, name, events } = req.body;
  if (!url) return res.status(400).json({ error: 'Webhook URL is required' });

  const webhook = db.addWebhook(app.id, url.trim(), name, events);
  db.addLog(app.id, 'webhook_created', `Webhook "${webhook.name}" registered`);
  res.json(webhook);
});

router.post('/:appId/webhooks/:id/test', authMiddleware, async (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const webhooks = db.getWebhooksByApp(app.id);
  const wh = webhooks.find(w => w.id === req.params.id);
  if (!wh) return res.status(404).json({ error: 'Webhook not found' });

  try {
    // Attempt webhook POST dispatch
    const payload = {
      content: `🔔 **BasxAuth Service PRO Webhook Test**\nApplication: **${app.name}**\nStatus: Online & Ready\nTimestamp: ${new Date().toISOString()}`,
      username: 'BasxAuth System',
    };
    await fetch(wh.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
    res.json({ success: true, message: 'Test ping dispatched to webhook endpoint' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to dispatch webhook' });
  }
});

router.delete('/:appId/webhooks/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const app = db.findAppById(req.params.appId);
  if (!app || app.ownerId !== req.owner!.id) {
    return res.status(404).json({ error: 'Application not found' });
  }

  db.deleteWebhook(req.params.id);
  res.json({ success: true });
});

export default router;
