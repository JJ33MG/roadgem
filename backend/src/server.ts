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

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://routify.ink',
  'https://www.routify.ink',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
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

// Error handling middleware (must be registered after routes)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
