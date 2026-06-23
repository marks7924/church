import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';
import * as bcrypt from 'bcrypt';
import { logAction } from '../utils/logger';

const router = Router();

// 1. Create a new administrative/priest account (Super Admin / Developer only)
router.post('/create', requireAuth, requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  const {
    email,
    password,
    fullName,
    role,
    phone,
    nationalId,
    nameAr,     // Priest/Bishop details
    nameEn,
    titleAr,
    titleEn,
    avatarUrl
  } = req.body;

  const creator = req.user!;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Missing required fields: email, password, fullName, role.' });
  }

  // Validate role is admin/priest type (not MEMBER)
  if (role === Role.MEMBER) {
    return res.status(400).json({ error: 'Cannot create MEMBER role accounts via this interface.' });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(nationalId ? [{ nationalId }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or national ID already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: role as Role,
          fullName,
          phone: phone || null,
          nationalId: nationalId || null,
          isVerified: true
        }
      });

      // If Priest or Bishop, also create PriestProfile
      if (role === Role.PRIEST || role === Role.BISHOP) {
        const pNameAr = nameAr || fullName;
        const pNameEn = nameEn || fullName;
        const pTitleAr = titleAr || (role === Role.BISHOP ? 'سيدنا' : 'أبونا');
        const pTitleEn = titleEn || (role === Role.BISHOP ? 'Bishop' : 'Father');

        await tx.priestProfile.create({
          data: {
            userId: user.id,
            nameAr: pNameAr,
            nameEn: pNameEn,
            titleAr: pTitleAr,
            titleEn: pTitleEn,
            avatarUrl: avatarUrl || null,
            maxBookingsPerDay: role === Role.BISHOP ? 3 : 5,
            bufferMinutes: role === Role.BISHOP ? 20 : 15,
            availabilityJson: '{}' // Empty default so Bishop has no automatic slots
          }
        });
      }

      return user;
    });

    // Log the creation action
    await logAction(
      creator.userId,
      creator.email,
      creator.fullName,
      'CREATE_USER',
      `Created administrative account: ${result.email} with role ${result.role} (${result.fullName})`
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id: result.id,
        email: result.email,
        fullName: result.fullName,
        role: result.role
      }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return res.status(500).json({ error: 'Server error creating account.' });
  }
});

// 2. List all administrative/priest accounts (Super Admin / Developer only)
router.get('/list', requireAuth, requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: Role.MEMBER
        }
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        nationalId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error('Error retrieving admin users:', error);
    return res.status(500).json({ error: 'Server error retrieving users list.' });
  }
});

// 3. View System Logs (Super Admin / Developer only)
router.get('/action-logs', requireAuth, requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.actionLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(logs);
  } catch (error) {
    console.error('Error retrieving action logs:', error);
    return res.status(500).json({ error: 'Server error retrieving logs.' });
  }
});

export default router;
