import { Router, Response } from 'express';
import { securityStats, getActiveBannedIps, unbanIp } from '../middleware/security';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Get live security defense stats
router.get('/stats', authMiddleware, (_req: AuthRequest, res: Response) => {
  const activeBans = getActiveBannedIps();
  res.json({
    ...securityStats,
    activeBans,
    uptimeSeconds: Math.floor(process.uptime()),
    status: 'ACTIVE_PROTECTION',
  });
});

// Manual IP unban
router.post('/unban', authMiddleware, (req: AuthRequest, res: Response) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required' });
  }
  const unbanned = unbanIp(ip);
  res.json({ success: unbanned, message: unbanned ? `IP ${ip} was unbanned` : `IP ${ip} was not banned` });
});

export default router;
