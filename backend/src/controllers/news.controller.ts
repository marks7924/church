import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// Get all news (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const news = await prisma.news.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            fullName: true,
            role: true
          }
        }
      }
    });
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Create a news post (protected: non-MEMBER)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { content, imageUrl } = req.body;
    const authorId = req.user?.userId;
    const role = req.user?.role;

    if (!authorId || !role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (role === 'MEMBER') {
      return res.status(403).json({ error: 'Members cannot post news' });
    }

    if (!content && !imageUrl) {
      return res.status(400).json({ error: 'Must provide either content or image' });
    }

    const news = await prisma.news.create({
      data: {
        content: content || null,
        imageUrl: imageUrl || null,
        authorId
      },
      include: {
        author: {
          select: {
            fullName: true,
            role: true
          }
        }
      }
    });

    res.status(201).json(news);
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ error: 'Failed to create news post' });
  }
});

// Update a news post (protected: non-MEMBER)
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, imageUrl } = req.body;
    const role = req.user?.role;

    if (role === 'MEMBER') {
      return res.status(403).json({ error: 'Members cannot update news' });
    }

    const updated = await prisma.news.update({
      where: { id },
      data: {
        content: content !== undefined ? content : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({ error: 'Failed to update news' });
  }
});

// Delete a news post (protected: non-MEMBER)
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const role = req.user?.role;

    if (role === 'MEMBER') {
      return res.status(403).json({ error: 'Members cannot delete news' });
    }

    await prisma.news.delete({
      where: { id }
    });
    res.json({ message: 'News deleted successfully' });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

export default router;
