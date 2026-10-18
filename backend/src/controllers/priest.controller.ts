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
      confessionDuration: p.confessionDuration,
      bufferMinutes: p.bufferMinutes,
      availabilityJson: p.availabilityJson,
      confessionStatus: p.confessionStatus,
      confessionStatusNote: p.confessionStatusNote,
      noFixedSchedule: p.noFixedSchedule
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching all priests:', error);
    return res.status(500).json({ error: 'Server error fetching all priests.' });
  }
});

// Priest Self Profile: GET /me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.priestProfile.findUnique({
      where: { userId },
      include: { user: true }
    });
    if (!profile) {
      return res.status(404).json({ error: 'Priest profile not found for current user.' });
    }
    return res.status(200).json({
      id: profile.id,
      userId: profile.userId,
      email: profile.user.email,
      fullName: profile.user.fullName,
      phone: profile.user.phone,
      nameAr: profile.nameAr,
      nameEn: profile.nameEn,
      titleAr: profile.titleAr,
      titleEn: profile.titleEn,
      avatarUrl: profile.avatarUrl,
      maxBookingsPerDay: profile.maxBookingsPerDay,
      confessionDuration: profile.confessionDuration,
      bufferMinutes: profile.bufferMinutes,
      availabilityJson: profile.availabilityJson,
      confessionStatus: profile.confessionStatus,
      confessionStatusNote: profile.confessionStatusNote,
      noFixedSchedule: profile.noFixedSchedule,
      role: profile.user.role
    });
  } catch (error) {
    console.error('Error fetching priest me:', error);
    return res.status(500).json({ error: 'Server error fetching priest profile.' });
  }
});

// Priest Self Profile: PATCH /me (priest updates their own schedule, confession status, etc.)
router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.priestProfile.findUnique({
      where: { userId }
    });
    if (!profile) {
      return res.status(404).json({ error: 'Priest profile not found.' });
    }
    const {
      avatarUrl,
      availabilityJson,
      confessionStatus,
      confessionStatusNote,
      noFixedSchedule,
      maxBookingsPerDay,
      confessionDuration,
      bufferMinutes
    } = req.body;

    const updated = await prisma.priestProfile.update({
      where: { id: profile.id },
      data: {
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        availabilityJson: availabilityJson !== undefined ? availabilityJson : undefined,
        confessionStatus: confessionStatus !== undefined ? confessionStatus : undefined,
        confessionStatusNote: confessionStatusNote !== undefined ? confessionStatusNote : undefined,
        noFixedSchedule: noFixedSchedule !== undefined ? Boolean(noFixedSchedule) : undefined,
        maxBookingsPerDay: maxBookingsPerDay !== undefined ? parseInt(maxBookingsPerDay) : undefined,
        confessionDuration: confessionDuration !== undefined ? parseInt(confessionDuration) : undefined,
        bufferMinutes: bufferMinutes !== undefined ? parseInt(bufferMinutes) : undefined
      }
    });

    return res.status(200).json({ message: 'Profile updated successfully.', profile: updated });
  } catch (error) {
    console.error('Error updating priest me:', error);
    return res.status(500).json({ error: 'Server error updating profile.' });
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
    confessionDuration,
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

    // Create User and PriestProfile inside transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          nationalId: nationalId || null,
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
          confessionDuration: confessionDuration ? parseInt(confessionDuration) : 15,
          bufferMinutes: bufferMinutes ? parseInt(bufferMinutes) : 5,
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
      confessionDuration,
      bufferMinutes,
      availabilityJson,
      confessionStatus,
      confessionStatusNote,
      noFixedSchedule
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
            nationalId: nationalId || null
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
            confessionDuration: confessionDuration ? parseInt(confessionDuration) : undefined,
            bufferMinutes: bufferMinutes ? parseInt(bufferMinutes) : undefined,
            availabilityJson,
            confessionStatus: confessionStatus !== undefined ? confessionStatus : undefined,
            confessionStatusNote: confessionStatusNote !== undefined ? confessionStatusNote : undefined,
            noFixedSchedule: noFixedSchedule !== undefined ? Boolean(noFixedSchedule) : undefined
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
