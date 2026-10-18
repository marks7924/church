import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { logAction } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_church_jwt_secret_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_church_jwt_refresh_secret_key';

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

// 4. Impersonate User (Super Admin / Developer can enter any priest or admin account)
router.post('/impersonate', requireAuth, requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  const { targetUserId, targetEmail } = req.body;
  const caller = req.user!;

  if (!targetUserId && !targetEmail) {
    return res.status(400).json({ error: 'targetUserId or targetEmail is required.' });
  }

  try {
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(targetUserId ? [{ id: targetUserId }] : []),
          ...(targetEmail ? [{ email: targetEmail }] : [])
        ]
      },
      include: { familyProfile: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    const payload = {
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      fullName: targetUser.fullName,
      isVerified: targetUser.isVerified
    };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: targetUser.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await logAction(
      caller.userId,
      caller.email,
      caller.fullName,
      'IMPERSONATE_USER',
      `Super Admin logged in as user ${targetUser.email} (${targetUser.fullName}, ${targetUser.role})`
    );

    return res.status(200).json({
      message: `Successfully logged in as ${targetUser.fullName}`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role,
        isVerified: targetUser.isVerified,
        hasFamilyProfile: !!targetUser.familyProfile,
        familyProfileStatus: targetUser.familyProfile?.status || null
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Error during impersonation:', error);
    return res.status(500).json({ error: 'Server error during impersonation.' });
  }
});

export default router;
