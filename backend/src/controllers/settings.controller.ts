import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';

const router = Router();

// Sensitive key substrings that must NEVER be returned in public settings
const SENSITIVE_KEY_PATTERNS = [
  'key', 'secret', 'token', 'pass', 'password', 'ai_', 'groq', 'openai',
  'gemini', 'smtp', 'credential', 'private', 'admin_', 'webhook', 'firebase'
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some(pattern => lower.includes(pattern));
}

// 1. Get Public System Settings (Safe public keys only: images, banners, titles)
router.get('/', async (req: Request, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const configMap: { [key: string]: string } = {};
    configs.forEach(c => {
      // Strictly exclude any sensitive credentials or keys
      if (!isSensitiveKey(c.key)) {
        configMap[c.key] = c.value;
      }
    });

    return res.status(200).json(configMap);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Server error retrieving settings.' });
  }
});

// 2. Update System Settings (All admin and priest roles allowed)
router.post('/', requireAuth, requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN, Role.SECRETARY, Role.PRIEST, Role.BISHOP]), async (req: AuthRequest, res: Response) => {
  const settings = req.body; // Expecting key-value object, e.g. { "img_hero_bg": "http...", "img_about_1": "http..." }

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings payload.' });
  }

  try {
    const upserts = Object.keys(settings).map(key => {
      const value = String(settings[key]);
      return prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    });

    await Promise.all(upserts);

    return res.status(200).json({ message: 'Settings updated successfully.' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Server error updating settings.' });
  }
});

export default router;
