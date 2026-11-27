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
import communityRouter from './routes/community';
import templatesRouter from './routes/templates';
import { statsRouter } from './routes/stats';
import trackRouter from './routes/track';
import feedbackRouter from './routes/feedback';
import { alertError } from './utils/brain';
import { prisma } from './utils/prisma';
import { limit } from './middleware/limits';

const HOUR = 60 * 60_000;
import path from 'path';
import { routeRouter } from './routes/route';
import playRouter from './routes/play';
import { errorHandler, logLine } from './middleware/errors';
import { writingTrips } from './routes/trips';

dotenv.config();

import { watchGoogle } from './utils/googleWatch';
watchGoogle();
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
// Community photos arrive as data URLs (shrunk in the browser): a larger limit for those routes only.
app.use(['/api/community/posts', '/api/community/suggest'], express.json({ limit: '8mb' }));
app.use(express.json());

// Routes
// Up and the database answers: checked by Railway and by the Brain.
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'database unreachable' });
  }
});


// Against throwaway accounts (invite rewards) and password guessing.
app.use('/api/auth/signup', limit('signup', 5, HOUR, 'Too many new accounts from here. Try again in an hour.'));
app.use('/api/auth/login', limit('login', 20, HOUR, 'Too many attempts. Try again in an hour.'));
app.use('/api/auth', authRouter);
app.use('/api/user', usersRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/photos', limit('photos', 400, HOUR), photosRouter);
app.use('/api/accommodations', limit('stays', 60, HOUR), accommodationsRouter);
app.use('/api/destinations', limit('places', 300, HOUR), destinationsRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/community', playRouter);
app.use('/api/community', communityRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/stats', statsRouter());
app.use('/api/track', trackRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/route', limit('route', 30, HOUR), routeRouter);

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
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);

  // Fill the gem library in the background when a seeding budget is set (GEM_SEED_BUDGET).
  import('./gems/seedRun').then((m) => m.runGemSeed()).catch((err) => console.error('[gems] seed failed:', logLine(err)));

  // Start agent scheduler (only when Redis is available)
  if (process.env.REDIS_URL) {
    // Loaded lazily: importing the queues opens Redis connections.
    import('./queue/scheduler').then((m) => m.startScheduler());
  } else {
    console.log('[scheduler] REDIS_URL not set — skipping scheduler (set in Railway to enable)');
  }
});

// An update stops this server with SIGTERM (Railway waits RAILWAY_DEPLOYMENT_DRAINING_SECONDS before killing it).
// Stop taking new requests, let running requests and day-writing finish (at most 50 s), then exit.
process.once('SIGTERM', () => {
  console.log('[shutdown] finishing running requests and trips');
  server.close();
  const deadline = new Promise((r) => setTimeout(r, 50_000));
  void Promise.race([Promise.allSettled([...writingTrips]), deadline]).then(() => process.exit(0));
});

// Anything that escapes a request still reaches Jarne (through the Brain), at most once per kind every 10 minutes.
process.on('unhandledRejection', (err) => {
  console.error('[unhandled]', logLine(err));
  alertError(`Unhandled: ${logLine(err)}`);
});
