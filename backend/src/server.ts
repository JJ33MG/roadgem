import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tripsRouter from './routes/trips';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import subscriptionRouter from './routes/subscription';
import photosRouter from './routes/photos';
import accommodationsRouter from './routes/accommodations';
import destinationsRouter from './routes/destinations';
import stripeRouter from './routes/stripe';
import agentsRouter from './routes/agents';
import communityRouter from './routes/community';
import templatesRouter from './routes/templates';
import { statsRouter } from './routes/stats';
import trackRouter from './routes/track';
import path from 'path';
import { routeRouter } from './routes/route';
import { errorHandler } from './middleware/errors';

dotenv.config();

const app: Express = express();
// Railway puts one proxy in front: req.ip is then the visitor's address.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Middleware
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://routify.ink',
  'https://www.routify.ink',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// Only the API is cross-origin; the site's own files must load from any address it is served on.
app.use('/api', cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

// Stripe webhook needs raw body — must be registered BEFORE express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});


app.use('/api/auth', authRouter);
app.use('/api/user', usersRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/photos', photosRouter);
app.use('/api/accommodations', accommodationsRouter);
app.use('/api/destinations', destinationsRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/community', communityRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/stats', statsRouter());
app.use('/api/track', trackRouter);
app.use('/api/route', routeRouter);

// Unknown API paths answer in JSON, never with the website.
app.use('/api', (_req: Request, res: Response) => res.status(404).json({ error: 'Not found' }));

// Preview and single-service deploys: the built website is served from here (Dockerfile copies it to public/).
if (process.env.SERVE_FRONTEND === 'true') {
  const site = path.resolve(__dirname, '../public');
  app.use(express.static(site, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/).*/, (_req: Request, res: Response) => res.sendFile(path.join(site, 'index.html')));
}

// Error handling middleware (must be registered after routes)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);

  // Start agent scheduler (only when Redis is available)
  if (process.env.REDIS_URL) {
    // Loaded lazily: importing the queues opens Redis connections.
    import('./queue/scheduler').then((m) => m.startScheduler());
  } else {
    console.log('[scheduler] REDIS_URL not set — skipping scheduler (set in Railway to enable)');
  }
});
