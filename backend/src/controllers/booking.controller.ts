import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { sendEmail, sendSMS, sendPushNotification } from '../services/notification.service';
import { Role, AppointmentStatus, MembershipStatus } from '@prisma/client';

const router = Router();

// 1. Get Priests list (emails omitted for security)
router.get('/priests', async (req: AuthRequest, res: Response) => {
  try {
    const priests = await prisma.priestProfile.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            role: true
            // email and phone are NOT selected to preserve privacy
          }
        }
      }
    });

    const formatted = priests.map(p => ({
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      maxBookingsPerDay: p.maxBookingsPerDay,
      bufferMinutes: p.bufferMinutes,
      avatarUrl: p.avatarUrl,
      availability: JSON.parse(p.availabilityJson),
      role: p.user.role // PRIEST or BISHOP
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching priests:', error);
    return res.status(500).json({ error: 'Server error fetching priests.' });
  }
});

// Helper: Get weekday name in English from Date
function getWeekdayEn(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// Helper: Generate available slots for a priest on a given date
async function getAvailableSlots(priestId: string, dateStr: string): Promise<{
  slots: string[];
  isFull: boolean;
  maxLimit: number;
  bookedCount: number;
}> {
  const date = new Date(dateStr);
  const weekday = getWeekdayEn(date);

  const priest = await prisma.priestProfile.findUnique({
    where: { id: priestId }
  });

  if (!priest) {
    return { slots: [], isFull: false, maxLimit: 0, bookedCount: 0 };
  }

  const availability = JSON.parse(priest.availabilityJson);
  const dailySlots: string[] = availability[weekday] || [];

  // Get already booked appointments for this priest on this date
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      priestId,
      date: {
        gte: new Date(date.setUTCHours(0, 0, 0, 0)),
        lte: new Date(date.setUTCHours(23, 59, 59, 999))
      },
      status: {
        in: [AppointmentStatus.PENDING, AppointmentStatus.APPROVED]
      }
    }
  });

  const bookedSlots = bookedAppointments.map(a => a.timeSlot);
  const available = dailySlots.filter(s => !bookedSlots.includes(s));
  const isFull = bookedAppointments.length >= priest.maxBookingsPerDay;

  return {
    slots: isFull ? [] : available,
    isFull,
    maxLimit: priest.maxBookingsPerDay,
    bookedCount: bookedAppointments.length
  };
}

// 2. Get Available Slots for a priest on a date
router.get('/available-slots', async (req: AuthRequest, res: Response) => {
  const { priestId, date } = req.query;

  if (!priestId || !date) {
    return res.status(400).json({ error: 'priestId and date (YYYY-MM-DD) are required.' });
  }

  try {
    const { slots, isFull } = await getAvailableSlots(priestId as string, date as string);

    // Smart logic: If no slots or fully booked, suggest slots in next 7 days
    let suggestions: { date: string; slots: string[] }[] = [];
    if (slots.length === 0 || isFull) {
      const today = new Date(date as string);
      for (let i = 1; i <= 7; i++) {
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + i);
        const nextDateStr = nextDate.toISOString().split('T')[0];
        
        const nextDaySlots = await getAvailableSlots(priestId as string, nextDateStr);
        if (nextDaySlots.slots.length > 0 && !nextDaySlots.isFull) {
          suggestions.push({
            date: nextDateStr,
            slots: nextDaySlots.slots
          });
          if (suggestions.length >= 3) break; // Suggest up to 3 dates
        }
      }
    }

    return res.status(200).json({
      date,
      slots,
      isFull,
      suggestions
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return res.status(500).json({ error: 'Server error checking availability.' });
  }
});

// 3. Book an Appointment (Confession)
router.post('/book', requireAuth, async (req: AuthRequest, res: Response) => {
  const { priestId, date: dateStr, timeSlot, notes } = req.body;
  const userId = req.user!.userId;

  if (!priestId || !dateStr || !timeSlot) {
    return res.status(400).json({ error: 'priestId, date (YYYY-MM-DD), and timeSlot are required.' });
  }

  try {
    // 1. Fetch priest profile & associated user details
    const priest = await prisma.priestProfile.findUnique({
      where: { id: priestId },
      include: { user: true }
    });

    if (!priest) {
      return res.status(404).json({ error: 'Priest not found.' });
    }

    // 2. Bishop booking rule: Bishop is for members only!
    if (priest.user.role === Role.BISHOP) {
      const familyHead = await prisma.familyHead.findUnique({
        where: { userId }
      });
      if (!familyHead || familyHead.status !== MembershipStatus.APPROVED) {
        return res.status(403).json({
          error: 'Meetings with the Bishop are restricted to approved church members only. Please submit your family membership and wait for admin approval.'
        });
      }
    }

    // 3. Prevent double booking for the SAME member on the SAME day with the SAME priest
    const bookingDate = new Date(dateStr);
    const startOfDay = new Date(bookingDate.setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(bookingDate.setUTCHours(23, 59, 59, 999));

    const existingMemberBooking = await prisma.appointment.findFirst({
      where: {
        memberId: userId,
        priestId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.APPROVED]
        }
      }
    });

    if (existingMemberBooking) {
      return res.status(400).json({
        error: 'You already have an active appointment booked with this priest on this day.'
      });
    }

    // 4. Verify slot is still free and priest hasn't reached daily capacity
    const { slots, isFull } = await getAvailableSlots(priestId, dateStr);

    if (isFull) {
      return res.status(400).json({ error: 'This priest has reached the maximum appointment limit for this day.' });
    }

    if (!slots.includes(timeSlot)) {
      return res.status(400).json({ error: 'The selected timeslot is already booked or not offered by the priest.' });
    }

    // 5. Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        memberId: userId,
        priestId,
        date: startOfDay,
        timeSlot,
        notes,
        status: AppointmentStatus.PENDING
      },
      include: {
        member: true
      }
    });

    // 6. Trigger notifications (Mocked/Brevo email + SMS)
    const memberName = appointment.member.fullName;
    const memberEmail = appointment.member.email;
    const priestName = priest.nameAr;
    const readableDate = dateStr;

    await sendEmail(
      memberEmail,
      'Confession Booking Request Submitted',
      `<p>Dear <b>${memberName}</b>,</p>
       <p>Your request to book a confession appointment with <b>${priestName}</b> on <b>${readableDate}</b> at <b>${timeSlot}</b> has been received.</p>
       <p>Status is currently: <b>PENDING</b>. You will be notified once the priest or secretary reviews it.</p>`
    );

    if (appointment.member.phone) {
      await sendSMS(
        appointment.member.phone,
        `Church Platform: Your booking request with ${priest.nameEn} on ${readableDate} at ${timeSlot} is PENDING approval.`
      );
    }

    // Fire push notification alert
    await sendPushNotification(
      'New Booking Request Received',
      `Member ${memberName} requested an appointment on ${readableDate} at ${timeSlot}`,
      'admin_bookings'
    );

    return res.status(201).json({
      message: 'Booking request submitted successfully.',
      appointment
    });
  } catch (error) {
    console.error('Booking submission error:', error);
    return res.status(500).json({ error: 'Server error during booking submission.' });
  }
});

// 4. Get My Bookings (For Members)
router.get('/my-bookings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { memberId: req.user!.userId },
      include: {
        priest: {
          select: {
            nameAr: true,
            nameEn: true,
            titleAr: true,
            titleEn: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    return res.status(200).json(appointments);
  } catch (error) {
    return res.status(500).json({ error: 'Server error retrieving bookings.' });
  }
});

// 5. Get Priest/Bishop Bookings (For Priests / Bishop / Admins / Secretaries)
router.get('/priest-bookings', requireAuth, requireRoles([Role.PRIEST, Role.BISHOP, Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;
    let appointments;

    if (role === Role.PRIEST || role === Role.BISHOP) {
      // Find the associated priest profile
      const priestProfile = await prisma.priestProfile.findUnique({
        where: { userId: req.user!.userId }
      });

      if (!priestProfile) {
        return res.status(200).json([]);
      }

      appointments = await prisma.appointment.findMany({
        where: { priestId: priestProfile.id },
        include: {
          member: {
            select: {
              fullName: true,
              phone: true,
              nationalId: true
              // email is hidden as per security rules
            }
          }
        },
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }]
      });
    } else {
      // Admins and Secretaries can view ALL bookings
      appointments = await prisma.appointment.findMany({
        include: {
          member: {
            select: {
              fullName: true,
              phone: true,
              nationalId: true
            }
          },
          priest: {
            select: {
              nameAr: true,
              nameEn: true,
              titleAr: true,
              titleEn: true
            }
          }
        },
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }]
      });
    }

    return res.status(200).json(appointments);
  } catch (error) {
    console.error('Error fetching priest bookings:', error);
    return res.status(500).json({ error: 'Server error fetching bookings.' });
  }
});

// 6. Approve / Reject Booking
router.patch('/:id/status', requireAuth, requireRoles([Role.PRIEST, Role.BISHOP, Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const appointmentId = req.params.id;

  if (status !== AppointmentStatus.APPROVED && status !== AppointmentStatus.REJECTED) {
    return res.status(400).json({ error: 'Invalid status. Must be APPROVED or REJECTED.' });
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        member: true,
        priest: true
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // Role check: If priest user, verify they own this appointment
    if (req.user!.role === Role.PRIEST || req.user!.role === Role.BISHOP) {
      const priestProfile = await prisma.priestProfile.findUnique({
        where: { userId: req.user!.userId }
      });
      if (!priestProfile || appointment.priestId !== priestProfile.id) {
        return res.status(403).json({ error: 'You are not authorized to update another priest\'s appointment.' });
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status }
    });

    // Send notifications
    const memberEmail = appointment.member.email;
    const memberName = appointment.member.fullName;
    const priestName = appointment.priest.nameAr;
    const dateStr = appointment.date.toISOString().split('T')[0];
    const timeSlot = appointment.timeSlot;

    const emailBody = status === AppointmentStatus.APPROVED 
      ? `<p>Dear <b>${memberName}</b>,</p>
         <p>Your confession booking with <b>${priestName}</b> on <b>${dateStr}</b> at <b>${timeSlot}</b> has been <b style="color: green;">APPROVED</b>.</p>
         <p>We look forward to seeing you at church.</p>`
      : `<p>Dear <b>${memberName}</b>,</p>
         <p>Your confession booking request with <b>${priestName}</b> on <b>${dateStr}</b> at <b>${timeSlot}</b> was <b style="color: red;">DECLINED/REJECTED</b>.</p>
         <p>Please log in to schedule a different timeslot.</p>`;

    await sendEmail(memberEmail, `Confession Appointment Status Update: ${status}`, emailBody);

    if (appointment.member.phone) {
      await sendSMS(
        appointment.member.phone,
        `Church Platform: Your booking with ${appointment.priest.nameEn} on ${dateStr} is ${status}.`
      );
    }

    await sendPushNotification(
      'Booking Status Updated',
      `Your appointment on ${dateStr} with ${appointment.priest.nameEn} has been ${status}`,
      `user_${appointment.memberId}`
    );

    return res.status(200).json({
      message: `Booking has been ${status}.`,
      appointment: updated
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return res.status(500).json({ error: 'Server error updating booking status.' });
  }
});

export default router;
