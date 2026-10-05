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

const app = express();
const PORT = process.env.PORT || 4000;

// Global Middleware
const allowedOrigins = process.env.APP_URL
  ? process.env.APP_URL.split(',').map(url => url.trim().replace(/\/$/, ''))
  : ['http://localhost:3000', 'https://church-ruby-beta.vercel.app'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.replace(/\/$/, '');
    
    // Check if origin matches allowedOrigins, ends with vercel.app, or is localhost
    const isAllowed = 
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.includes('localhost');

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Test connection
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date(), version: '1.0.0' });
});

// Routing
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/members', memberRouter);
app.use('/api/sermons', sermonRouter);
app.use('/api/events', eventRouter);
app.use('/api/live', liveRouter);
app.use('/api/priests', priestRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/news', newsRouter);
app.use('/api/admin-users', adminUsersRouter);
app.use('/api/contact', contactRouter);

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Church Platform backend listening at http://localhost:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

export default app;

