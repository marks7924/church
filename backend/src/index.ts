import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import authRouter from './controllers/auth.controller';
import bookingRouter from './controllers/booking.controller';
import memberRouter from './controllers/member.controller';
import sermonRouter from './controllers/sermon.controller';
import eventRouter from './controllers/event.controller';
import liveRouter from './controllers/live.controller';
import priestRouter from './controllers/priest.controller';
import settingsRouter from './controllers/settings.controller';
import newsRouter from './controllers/news.controller';
import adminUsersRouter from './controllers/admin-users.controller';
import contactRouter from './controllers/contact.controller';
import aiRouter from './controllers/ai.controller';
import facebookNewsRouter from './controllers/facebook-news.controller';
import emailCenterRouter from './controllers/email-center.controller';
import invitationRouter from './controllers/invitation.controller';
import fyRouter from './controllers/fy.controller';
import historyRouter from './controllers/history.controller';
import developerRouter from './controllers/developer.controller';
import { enforceIpBan, enforceLockdown } from './middleware/devSecurity.middleware';

const app = express();
const PORT = process.env.PORT || 4000;

// Security: Disable X-Powered-By header to obscure technology stack
app.disable('x-powered-by');

// Global Middleware & Strict CORS Configuration
const configuredOrigins = process.env.APP_URL
  ? process.env.APP_URL.split(',').map(url => url.trim().replace(/\/$/, ''))
  : ['http://localhost:3000', 'https://church-ruby-beta.vercel.app'];

const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const vercelChurchRegex = /^https:\/\/church[a-z0-9-]*\.vercel\.app$/i;
const trustedChurchDomainRegex = /^https:\/\/church-[a-z0-9-]+-marks7924s-projects\.vercel\.app$/i;

function isOriginAllowed(origin: string): boolean {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/$/, '');
  return (
    configuredOrigins.includes(cleanOrigin) ||
    cleanOrigin === 'https://church-ruby-beta.vercel.app' ||
    localhostRegex.test(cleanOrigin) ||
    vercelChurchRegex.test(cleanOrigin) ||
    trustedChurchDomainRegex.test(cleanOrigin)
  );
}

// 1. Explicit CORS headers middleware (Guarantees headers on all requests and error responses)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }

  // Preflight OPTIONS fast exit
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// 2. Standard CORS package
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.options('*', cors());

// Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Developer Security: Global IP Ban Enforcement
app.use(enforceIpBan);

// Global API Rate Limiting: 120 requests/min per IP to prevent DoS scraping
import { enforceRateLimit } from './utils/security';
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') return next();

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
  const check = enforceRateLimit(`global-api:${clientIp}`, {
    limit: 120,
    windowMs: 60 * 1000,
    blockDurationMs: 60 * 1000
  });

  if (!check.allowed) {
    return res.status(429).json({
      error: `Too many requests from this IP. Please wait ${check.retryAfterSeconds} seconds.`,
      errorAr: 'تم تجاوز الحد المسموح به من الطلبات مؤقتاً. يرجى الانتظار والمحاولة لاحقاً.'
    });
  }
  next();
});

// Developer Security: Emergency Website Lockdown Enforcement
app.use(enforceLockdown);

// Safe payload limits (prevent memory exhaustion DoS)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

import prisma from './db';

// Hardened Health Check (Never leak raw database error details to anonymous callers)
const healthHandler = async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err: any) {
    console.error('[DATABASE_HEALTH_CHECK_FAILURE]:', err.message || err);
  }

  const statusCode = dbStatus === 'connected' ? 200 : 503;
  res.status(statusCode).json({
    status: dbStatus === 'connected' ? 'OK' : 'DEGRADED',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version: '1.1.0'
  });
};

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'Church Platform Backend API',
    status: 'online',
    healthCheck: '/api/health',
    version: '1.0.0'
  });
});

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Routing
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/booking', bookingRouter); // Alias to prevent 404 for singular route calls
app.use('/api/members', memberRouter);
app.use('/api/sermons', sermonRouter);
app.use('/api/events', eventRouter);
app.use('/api/live', liveRouter);
app.use('/api/priests', priestRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/news', newsRouter);
app.use('/api/admin-users', adminUsersRouter);
app.use('/api/contact', contactRouter);
app.use('/api/ai', aiRouter);
app.use('/api/facebook-news', facebookNewsRouter);
app.use('/api/email-center', emailCenterRouter);
app.use('/api/invitations', invitationRouter);
app.use('/api/fy', fyRouter);
app.use('/api/history', historyRouter);
app.use('/api/developer', developerRouter);

// Error Handling Middleware (Safe against stack and internals leakage)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[UNHANDLED_SERVER_ERROR]:', err);

  const isCorsError = err && typeof err.message === 'string' && err.message.includes('CORS');
  if (isCorsError) {
    return res.status(403).json({ error: 'CORS Forbidden: Origin not allowed.' });
  }

  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({ 
    error: 'Internal Server Error',
    message: isProd ? 'An unexpected internal error occurred. Please contact church technical administration.' : (err.message || String(err)),
    timestamp: new Date().toISOString()
  });
});

if (require.main === module && (process.env.NODE_ENV !== 'production' || !process.env.VERCEL)) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Church Platform backend listening at http://localhost:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

export default app;

