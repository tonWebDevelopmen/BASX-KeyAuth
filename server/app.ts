import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import ownerRoutes from './routes/owner';
import appsRoutes from './routes/apps';
import keysRoutes from './routes/keys';
import usersRoutes from './routes/users';
import tiersRoutes from './routes/tiers';
import variablesRoutes from './routes/variables';
import blacklistRoutes from './routes/blacklist';
import webhooksRoutes from './routes/webhooks';
import sessionsRoutes from './routes/sessions';
import chatsRoutes from './routes/chats';
import logsRoutes from './routes/logs';
import clientRoutes from './routes/client';
import sellerRoutes from './routes/seller';
import securityRoutes from './routes/security';
import { securityHeadersMiddleware, ddosAndHackProtectionMiddleware } from './middleware/security';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer() {
  const app = express();

  // 1. Anti-DDoS and security headers
  app.use(securityHeadersMiddleware);
  app.use(ddosAndHackProtectionMiddleware);

  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Mount API endpoints
  app.use('/api/owner', ownerRoutes);
  app.use('/api/apps', appsRoutes);
  app.use('/api/apps', keysRoutes);
  app.use('/api/apps', usersRoutes);
  app.use('/api/apps', tiersRoutes);
  app.use('/api/apps', variablesRoutes);
  app.use('/api/apps', blacklistRoutes);
  app.use('/api/apps', webhooksRoutes);
  app.use('/api/apps', sessionsRoutes);
  app.use('/api/apps', chatsRoutes);
  app.use('/api/apps', logsRoutes);
  app.use('/api/security', securityRoutes);

  // KeyAuth SDK compatibility endpoints
  app.use('/api/1.2', clientRoutes);
  app.use('/api/1.0', clientRoutes);
  app.use('/api/1.3', clientRoutes);
  app.use('/api/client', clientRoutes);
  app.use('/api/v1/client', clientRoutes);
  app.use('/api/v1/seller', sellerRoutes);

  // Direct Project ZIP Download endpoint
  app.get(['/download/project-zip', '/BASX-KeyAuth-Full.zip'], (req, res) => {
    const zipPath = path.resolve(process.cwd(), 'public/BASX-KeyAuth-Full.zip');
    res.download(zipPath, 'BASX-KeyAuth-Full.zip', (err) => {
      if (err && !res.headersSent) {
        res.status(404).send('Archive not found');
      }
    });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'BasxAuth Service PRO Core API',
      shield: 'ARMED_AND_ACTIVE',
      timestamp: new Date().toISOString(),
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  return new Promise((resolve) => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🛡️ BasxAuth Service PRO Anti-DDoS & KeyAuth Core running at http://0.0.0.0:${PORT}`);
      resolve(server);
    });
  });
}
