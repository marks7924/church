import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { sendPushNotification } from '../services/notification.service';
import { AuthRequest } from '../types';

const router = Router();

// ==========================================
// EVENTS SECTION (CALENDAR)
// ==========================================

// 1. Get all events
router.get('/', async (req: Request, res: Response) => {
  const { type } = req.query;
  try {
    const events = await prisma.event.findMany({
      where: type ? { type: type as string } : {},
      orderBy: { date: 'asc' }
    });
    return res.status(200).json(events);
  } catch (error) {
    return res.status(500).json({ error: 'Server error retrieving events.' });
  }
});

// 2. Add New Event (Trip Manager can ONLY create TRIP type)
router.post('/', requireAuth, requireRoles([Role.TRIP_MANAGER, Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const { titleAr, titleEn, descriptionAr, descriptionEn, type, date, locationAr, locationEn, price } = req.body;

  if (!titleAr || !titleEn || !type || !date) {
    return res.status(400).json({ error: 'Required fields: titleAr, titleEn, type, date.' });
  }

  // RBAC validation: Trip Manager can only handle TRIP type
  if (req.user!.role === Role.TRIP_MANAGER && type !== 'TRIP') {
    return res.status(403).json({ error: 'Trip managers can only create and manage events of type "TRIP".' });
  }

  try {
    const event = await prisma.event.create({
      data: {
        titleAr,
        titleEn,
        descriptionAr: descriptionAr || '',
        descriptionEn: descriptionEn || '',
        type,
        date: new Date(date),
        locationAr,
        locationEn,
        price: price ? parseFloat(price) : 0
      }
    });

    // Notify
    await sendPushNotification(
      'حدث جديد مضاف / New Event Added',
      `تمت إضافة: "${titleAr}" بتاريخ ${new Date(date).toLocaleDateString('ar-EG')}`,
      'events'
    );

    return res.status(201).json({ message: 'Event added successfully.', event });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Server error adding event.' });
  }
});

// 3. Delete Event (Trip Manager can ONLY delete TRIP type)
router.delete('/:id', requireAuth, requireRoles([Role.TRIP_MANAGER, Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const eventId = req.params.id;

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user!.role === Role.TRIP_MANAGER && event.type !== 'TRIP') {
      return res.status(403).json({ error: 'Trip managers can only delete events of type "TRIP".' });
    }

    await prisma.event.delete({ where: { id: eventId } });
    return res.status(200).json({ message: 'Event deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error deleting event.' });
  }
});

// ==========================================
// MASS SCHEDULE SECTION (RECURRING MASSES)
// ==========================================

// 4. Get Mass Schedule
router.get('/schedule', async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.massSchedule.findMany({
      orderBy: [
        { dayEn: 'asc' }, // Order weekday or custom order if needed.
        { timeEn: 'asc' }
      ]
    });
    return res.status(200).json(schedules);
  } catch (error) {
    return res.status(500).json({ error: 'Server error retrieving Mass Schedule.' });
  }
});

// 5. Add Mass Schedule (Admins & Secretaries only)
router.post('/schedule', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: Request, res: Response) => {
  const { dayAr, dayEn, timeAr, timeEn, eventTypeAr, eventTypeEn } = req.body;

  if (!dayAr || !dayEn || !timeAr || !timeEn || !eventTypeAr || !eventTypeEn) {
    return res.status(400).json({ error: 'Required fields: dayAr, dayEn, timeAr, timeEn, eventTypeAr, eventTypeEn' });
  }

  try {
    const schedule = await prisma.massSchedule.create({
      data: {
        dayAr,
        dayEn,
        timeAr,
        timeEn,
        eventTypeAr,
        eventTypeEn
      }
    });

    // Notify updates
    await sendPushNotification(
      'تحديث في مواعيد القداسات / Mass Schedule Updated',
      `تمت إضافة موعد قداس جديد: ${eventTypeAr} - يوم ${dayAr}`,
      'schedule'
    );

    return res.status(201).json({ message: 'Mass schedule created successfully.', schedule });
  } catch (error) {
    console.error('Error creating mass schedule:', error);
    return res.status(500).json({ error: 'Server error creating schedule.' });
  }
});

// 6. Delete Mass Schedule (Admins & Secretaries only)
router.delete('/schedule/:id', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: Request, res: Response) => {
  const scheduleId = req.params.id;

  try {
    await prisma.massSchedule.delete({ where: { id: scheduleId } });
    return res.status(200).json({ message: 'Mass schedule deleted.' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error deleting schedule.' });
  }
});

export default router;
