import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { sendPushNotification } from '../services/notification.service';
import { AuthRequest } from '../types';
import { logAction } from '../utils/logger';

const router = Router();

let lastCheckTime = 0;
const CHANNEL_ID = 'UCpwl_JM3g4wjeNXRgUbmYgw'; // Channel ID for @philopateerchurch
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyCbIF707V9Vn4E2xKfp4VW4-J-4CJZwdC8';

async function checkYoutubeLiveStatus() {
  const now = Date.now();
  if (now - lastCheckTime < 60000) {
    return; // Rate limit check to once a minute
  }
  lastCheckTime = now;

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&type=video&eventType=live&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json() as any;

    const isLiveOnYoutube = data.items && data.items.length > 0;

    const activeConfig = await prisma.systemConfig.findUnique({ where: { key: 'live_active' } });
    const currentActive = activeConfig ? activeConfig.value === 'true' : false;

    if (isLiveOnYoutube) {
      const liveVideo = data.items[0];
      const videoId = liveVideo.id.videoId;
      const title = liveVideo.snippet.title;

      const currentVideoConfig = await prisma.systemConfig.findUnique({ where: { key: 'live_youtube_id' } });
      const currentVideoId = currentVideoConfig ? currentVideoConfig.value : '';

      // If it wasn't active or has a new video ID, update database and notify
      if (!currentActive || currentVideoId !== videoId) {
        await prisma.systemConfig.upsert({
          where: { key: 'live_active' },
          update: { value: 'true' },
          create: { key: 'live_active', value: 'true' }
        });
        await prisma.systemConfig.upsert({
          where: { key: 'live_youtube_id' },
          update: { value: videoId },
          create: { key: 'live_youtube_id', value: videoId }
        });
        await prisma.systemConfig.upsert({
          where: { key: 'live_youtube_title' },
          update: { value: title },
          create: { key: 'live_youtube_title', value: title }
        });

        // Log system action
        await logAction(
          'SYSTEM',
          'system@church.org',
          'System Auto-Detector',
          'AUTO_START_LIVE',
          `Detected active YouTube stream: "${title}" (${videoId})`
        );

        // Send push notification
        await sendPushNotification(
          `🔴 البث المباشر بدأ الآن: ${title} / Live Broadcast: ${title}`,
          'انضم إلينا الآن لمتابعة الصلاة والبث المباشر من الكنيسة / Join us now in live prayers!',
          'live'
        );
      }
    } else {
      // If website currently shows live but YouTube doesn't, auto-disable
      if (currentActive) {
        await prisma.systemConfig.upsert({
          where: { key: 'live_active' },
          update: { value: 'false' },
          create: { key: 'live_active', value: 'false' }
        });

        await logAction(
          'SYSTEM',
          'system@church.org',
          'System Auto-Detector',
          'AUTO_STOP_LIVE',
          'YouTube stream ended; automatically disabled broadcast.'
        );
      }
    }
  } catch (err) {
    console.error('Error auto-checking YouTube live status:', err);
  }
}

// 1. Get Live state
router.get('/', async (req: Request, res: Response) => {
  // Trigger background check
  await checkYoutubeLiveStatus();

  try {
    const liveActiveConfig = await prisma.systemConfig.findUnique({ where: { key: 'live_active' } });
    const liveYoutubeConfig = await prisma.systemConfig.findUnique({ where: { key: 'live_youtube_id' } });
    const liveTitleConfig = await prisma.systemConfig.findUnique({ where: { key: 'live_youtube_title' } });

    return res.status(200).json({
      isActive: liveActiveConfig ? liveActiveConfig.value === 'true' : false,
      youtubeLiveId: liveYoutubeConfig ? liveYoutubeConfig.value : '',
      title: liveTitleConfig ? liveTitleConfig.value : ''
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error retrieving live state.' });
  }
});

// 2. Set Live state (Secretaries / Admins)
router.post('/', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const { isActive, youtubeLiveId, title } = req.body;
  const user = req.user!;

  if (isActive === undefined && !youtubeLiveId) {
    return res.status(400).json({ error: 'Provide isActive (boolean) or youtubeLiveId (string).' });
  }

  try {
    let updatedActive = false;
    let updatedYoutubeId = '';
    let updatedTitle = '';

    if (isActive !== undefined) {
      const activeStr = isActive ? 'true' : 'false';
      const config = await prisma.systemConfig.upsert({
        where: { key: 'live_active' },
        update: { value: activeStr },
        create: { key: 'live_active', value: activeStr }
      });
      updatedActive = config.value === 'true';

      // Send push notification if live started manually
      if (isActive) {
        const notifyTitle = title || 'البث المباشر بدأ الآن / Live Broadcast Started';
        await sendPushNotification(
          `🔴 ${notifyTitle}`,
          'انضم إلينا الآن لمتابعة الصلاة والبث المباشر من الكنيسة / Join us now in live prayers!',
          'live'
        );
      }
    } else {
      const config = await prisma.systemConfig.findUnique({ where: { key: 'live_active' } });
      updatedActive = config ? config.value === 'true' : false;
    }

    if (youtubeLiveId !== undefined) {
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

    if (title !== undefined) {
      const config = await prisma.systemConfig.upsert({
        where: { key: 'live_youtube_title' },
        update: { value: title },
        create: { key: 'live_youtube_title', value: title }
      });
      updatedTitle = config.value;
    } else {
      const config = await prisma.systemConfig.findUnique({ where: { key: 'live_youtube_title' } });
      updatedTitle = config ? config.value : '';
    }

    // Log manual operation
    await logAction(
      user.userId,
      user.email,
      user.fullName,
      'UPDATE_LIVE_STREAM',
      `Updated settings manually: Active=${updatedActive}, VideoID=${updatedYoutubeId}, Title="${updatedTitle}"`
    );

    return res.status(200).json({
      message: 'Live stream configuration updated successfully.',
      isActive: updatedActive,
      youtubeLiveId: updatedYoutubeId,
      title: updatedTitle
    });
  } catch (error) {
    console.error('Error updating live configuration:', error);
    return res.status(500).json({ error: 'Server error updating live configuration.' });
  }
});

export default router;
