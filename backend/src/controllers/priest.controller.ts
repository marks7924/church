import { Router, Response } from 'express';
import * as bcrypt from 'bcrypt';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';

const router = Router();

// 0. Get All Priests with Full Details (SUPER_ADMIN only)
router.get('/', requireAuth, requireRoles([Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  try {
    const priests = await prisma.priestProfile.findMany({
      include: {
        user: true
      }
    });

    const formatted = priests.map(p => ({
      id: p.id,
      userId: p.userId,
      email: p.user.email,
      fullName: p.user.fullName,
      phone: p.user.phone,
      nationalId: p.user.nationalId,
      role: p.user.role,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      avatarUrl: p.avatarUrl,
      maxBookingsPerDay: p.maxBookingsPerDay,
      bufferMinutes: p.bufferMinutes,
      availabilityJson: p.availabilityJson
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching all priests:', error);
    return res.status(500).json({ error: 'Server error fetching all priests.' });
  }
});

// 1. Add Priest (SUPER_ADMIN only)
router.post('/', requireAuth, requireRoles([Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const {
    email,
    password,
    fullName,
    phone,
    nationalId,
    nameAr,
    nameEn,
    titleAr,
    titleEn,
    avatarUrl,
    maxBookingsPerDay,
    bufferMinutes,
    availabilityJson
  } = req.body;

  if (!email || !password || !fullName || !nameAr || !nameEn || !titleAr || !titleEn) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { nationalId: nationalId || undefined }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or national ID already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    // Create User and PriestProfile inside transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          nationalId,
          role: Role.PRIEST,
          isVerified: true
        }
      });

      const profile = await tx.priestProfile.create({
        data: {
          userId: user.id,
          nameAr,
          nameEn,
          titleAr,
          titleEn,
          avatarUrl,
          maxBookingsPerDay: maxBookingsPerDay ? parseInt(maxBookingsPerDay) : 5,
          bufferMinutes: bufferMinutes ? parseInt(bufferMinutes) : 15,
          availabilityJson: availabilityJson || '{}'
        }
      });

      return { user, profile };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating priest:', error);
    return res.status(500).json({ error: 'Server error creating priest.' });
  }
});

// 2. Edit Priest (SUPER_ADMIN only)
router.patch('/:id', requireAuth, requireRoles([Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const profileId = req.params.id;
  const {
    email,
    password,
    fullName,
    phone,
    nationalId,
    nameAr,
    nameEn,
    titleAr,
    titleEn,
    avatarUrl,
    maxBookingsPerDay,
    bufferMinutes,
    availabilityJson
  } = req.body;

  try {
    const profile = await prisma.priestProfile.findUnique({
      where: { id: profileId },
      include: { user: true }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Priest profile not found.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update User
      const updatedUser = await tx.user.update({
        where: { id: profile.userId },
        data: {
          email,
          passwordHash: password ? bcrypt.hashSync(password, 10) : undefined,
          fullName,
          phone,
          nationalId
        }
      });

      // Update Profile
      const updatedProfile = await tx.priestProfile.update({
        where: { id: profileId },
        data: {
          nameAr,
          nameEn,
          titleAr,
          titleEn,
          avatarUrl,
          maxBookingsPerDay: maxBookingsPerDay ? parseInt(maxBookingsPerDay) : undefined,
          bufferMinutes: bufferMinutes ? parseInt(bufferMinutes) : undefined,
          availabilityJson
        }
      });

      return { user: updatedUser, profile: updatedProfile };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error updating priest:', error);
    return res.status(500).json({ error: 'Server error updating priest.' });
  }
});

// 3. Delete Priest (SUPER_ADMIN only)
router.delete('/:id', requireAuth, requireRoles([Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const profileId = req.params.id;

  try {
    const profile = await prisma.priestProfile.findUnique({
      where: { id: profileId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Priest profile not found.' });
    }

    // Delete User (cascades to delete PriestProfile)
    await prisma.user.delete({
      where: { id: profile.userId }
    });

    return res.status(200).json({ message: 'Priest deleted successfully.' });
  } catch (error) {
    console.error('Error deleting priest:', error);
    return res.status(500).json({ error: 'Server error deleting priest.' });
  }
});

export default router;
