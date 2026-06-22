import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { sendPushNotification } from '../services/notification.service';

const router = Router();

// Helper to extract YouTube video ID from URL
function getYoutubeId(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : 'dQw4w9WgXcQ';
}

// 1. Get Sermons list (Filtered by Priest, Topic, or Date)
router.get('/', async (req: Request, res: Response) => {
  const { priest, topic, date } = req.query;
  
  try {
    let where: any = {};
    if (priest) {
      where.OR = [
        { priestNameAr: { contains: priest as string } },
        { priestNameEn: { contains: priest as string } }
      ];
    }
    if (topic) {
      where.OR = [
        { topicAr: { contains: topic as string } },
        { topicEn: { contains: topic as string } }
      ];
    }
    if (date) {
      const searchDate = new Date(date as string);
      const startOfDay = new Date(searchDate.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setUTCHours(23, 59, 59, 999));
      where.date = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const sermons = await prisma.sermon.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    return res.status(200).json(sermons);
  } catch (error) {
    console.error('Error fetching sermons:', error);
    return res.status(500).json({ error: 'Server error fetching sermons.' });
  }
});

// 2. Upload / Register New Sermon (Admins, Secretaries)
router.post('/', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: Request, res: Response) => {
  const { titleAr, titleEn, priestNameAr, priestNameEn, topicAr, topicEn, date, youtubeUrl } = req.body;

  if (!titleAr || !titleEn || !priestNameAr || !priestNameEn || !topicAr || !topicEn || !youtubeUrl) {
    return res.status(400).json({ error: 'Required fields missing.' });
  }

  try {
    const videoId = getYoutubeId(youtubeUrl);
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

    const sermon = await prisma.sermon.create({
      data: {
        titleAr,
        titleEn,
        priestNameAr,
        priestNameEn,
        topicAr,
        topicEn,
        date: date ? new Date(date) : new Date(),
        youtubeUrl: embedUrl,
        thumbnailUrl
      }
    });

    // Notify users
    await sendPushNotification(
      'عظة جديدة متاحة الآن / New Sermon Available',
      `شاهد عظة "${titleAr}" للـ ${priestNameAr} / Watch "${titleEn}" by ${priestNameEn}`,
      'sermons'
    );

    return res.status(201).json({ message: 'Sermon created successfully.', sermon });
  } catch (error) {
    console.error('Error creating sermon:', error);
    return res.status(500).json({ error: 'Server error creating sermon.' });
  }
});

export default router;
