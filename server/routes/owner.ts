import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { authMiddleware, AuthRequest, JWT_SECRET } from '../middleware/auth';
import { trackFailedLogin, resetFailedLogin } from '../middleware/security';

const router = Router();

// Registration is disabled per requirement
router.post('/register', (_req, res: Response) => {
  return res.status(403).json({ error: 'Registration is disabled. Only authorized administrators may log in.' });
});

// Login owner: STRICTLY User : BASX Pass : Saree2508
router.post('/login', (req, res: Response) => {
  try {
    const { email, username, password } = req.body;
    const inputIdentifier = (username || email || '').trim();

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';

    // Check strict credentials
    const isUserValid = inputIdentifier.toUpperCase() === 'BASX';
    const isPassValid = password === 'Saree2508';

    if (!isUserValid || !isPassValid) {
      trackFailedLogin(clientIp);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    resetFailedLogin(clientIp);

    let owner = db.findOwnerByEmail('BASX') || db.findOwnerById('basx-admin-owner');
    if (!owner) {
      const allOwners = db.getOwners();
      owner = allOwners[0];
    }

    if (!owner) {
      owner = db.createOwner({
        email: 'BASX',
        username: 'BASX',
        password: bcrypt.hashSync('Saree2508', 10),
      });
    }

    const token = jwt.sign(
      { id: owner.id, email: owner.email, username: owner.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      owner: {
        id: owner.id,
        email: 'BASX',
        username: 'BASX',
        sellerKey: owner.sellerKey,
        accountOwnerId: owner.accountOwnerId || 'k6IHOhxMaB',
        createdAt: owner.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Get current owner info
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const owner = db.findOwnerById(req.owner!.id);
  if (!owner) {
    return res.status(404).json({ error: 'Owner not found' });
  }
  res.json({
    id: owner.id,
    email: owner.email,
    username: owner.username,
    sellerKey: owner.sellerKey,
    accountOwnerId: owner.accountOwnerId || 'k6IHOhxMaB',
    createdAt: owner.createdAt,
  });
});

// Update owner profile (e.g. Account Owner ID)
router.patch('/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  const { accountOwnerId } = req.body;
  const owner = db.findOwnerById(req.owner!.id);
  if (!owner) {
    return res.status(404).json({ error: 'Owner not found' });
  }

  if (accountOwnerId && typeof accountOwnerId === 'string') {
    owner.accountOwnerId = accountOwnerId.trim();
    (db as any).save?.();
  }

  res.json({
    success: true,
    owner: {
      id: owner.id,
      email: owner.email,
      username: owner.username,
      sellerKey: owner.sellerKey,
      accountOwnerId: owner.accountOwnerId || 'k6IHOhxMaB',
      createdAt: owner.createdAt,
    },
  });
});

// Regenerate seller key
router.post('/regenerate-seller-key', authMiddleware, (req: AuthRequest, res: Response) => {
  const newSellerKey = db.updateOwnerSellerKey(req.owner!.id);
  if (!newSellerKey) {
    return res.status(404).json({ error: 'Owner not found' });
  }
  res.json({ sellerKey: newSellerKey });
});

export default router;
