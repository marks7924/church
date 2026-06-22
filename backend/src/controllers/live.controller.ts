import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { sendPushNotification } from '../services/notification.service';

const router = Router();

// 1. Get Live state
router.get('/', async (req: Request, res: Response) => {
  try {
    const liveActiveConfig = await prisma.systemConfig.findUnique({ where: { key: 'live_active' } });
    const liveYoutubeConfig = await prisma.systemConfig.findUnique({ where: { key: 'live_youtube_id' } });

    return res.status(200).json({
      isActive: liveActiveConfig ? liveActiveConfig.value === 'true' : false,
      youtubeLiveId: liveYoutubeConfig ? liveYoutubeConfig.value : ''
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error retrieving live state.' });
  }
});

// 2. Set Live state (Secretaries / Admins)
router.post('/', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: Request, res: Response) => {
  const { isActive, youtubeLiveId } = req.body;

  if (isActive === undefined && !youtubeLiveId) {
    return res.status(400).json({ error: 'Provide isActive (boolean) or youtubeLiveId (string).' });
  }

  try {
    let updatedActive = false;
    let updatedYoutubeId = '';

    if (isActive !== undefined) {
      const activeStr = isActive ? 'true' : 'false';
      const config = await prisma.systemConfig.upsert({
        where: { key: 'live_active' },
        update: { value: activeStr },
        create: { key: 'live_active', value: activeStr }
      });
      updatedActive = config.value === 'true';

      // Send push notification if live started
      if (isActive) {
        await sendPushNotification(
          '🔴 البث المباشر بدأ الآن / Live Broadcast Started',
          'انضم إلينا الآن لمتابعة الصلاة والبث المباشر من الكنيسة / Join us now in live prayers!',
          'live'
        );
      }
    } else {
      const config = await prisma.systemConfig.findUnique({ where: { key: 'live_active' } });
      updatedActive = config ? config.value === 'true' : false;
    }

    if (youtubeLiveId) {
      const config = await prisma.systemConfig.upsert({
        where: { key: 'live_youtube_id' },
        update: { value: youtubeLiveId },
        create: { key: 'live_youtube_id', value: youtubeLiveId }
      });
      updatedYoutubeId = config.value;
    } else {
      const config = await prisma.systemConfig.findUnique({ where: { key: 'live_youtube_id' } });
      updatedYoutubeId = config ? config.value : '';
    }

    return res.status(200).json({
      message: 'Live stream configuration updated successfully.',
      isActive: updatedActive,
      youtubeLiveId: updatedYoutubeId
    });
  } catch (error) {
    console.error('Error updating live configuration:', error);
    return res.status(500).json({ error: 'Server error updating live configuration.' });
  }
});

export default router;
