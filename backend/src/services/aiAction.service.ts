import prisma from '../db';
import { CHURCH_INFO } from './ai.service';
import { Role } from '@prisma/client';

export interface ActionDefinition {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  requiredRole?: Role[];
  requiresAuth: boolean;
  requiresConfirmation: boolean;
  inputSchema: Record<string, { type: string; required: boolean; description: string }>;
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  data?: any;
  messageAr: string;
  messageEn: string;
  redirectUrl?: string;
  requiresClientConfirmation?: boolean;
}

export const ACTION_REGISTRY: Record<string, ActionDefinition> = {
  open_schedule: {
    id: 'open_schedule',
    nameAr: 'عرض مواعيد القداسات والصلوات',
    nameEn: 'View Liturgy & Prayer Schedules',
    descriptionAr: 'عرض الجدول الأسبوعي المعتمد للقداسات الإلهية والعشيات والتسبحة',
    descriptionEn: 'Display approved weekly mass, vespers, and praise schedules',
    requiresAuth: false,
    requiresConfirmation: false,
    inputSchema: {
      day: { type: 'string', required: false, description: 'Optional day filter (e.g. Friday, Sunday)' }
    }
  },
  open_clergy: {
    id: 'open_clergy',
    nameAr: 'دليل الآباء الكهنة',
    nameEn: 'Clergy & Priests Directory',
    descriptionAr: 'عرض قائمة الآباء الكهنة ومواعيد الرعاية ومواقعهم',
    descriptionEn: 'Display list of church priests and pastoral contacts',
    requiresAuth: false,
    requiresConfirmation: false,
    inputSchema: {
      priestName: { type: 'string', required: false, description: 'Optional priest name' }
    }
  },
  view_events: {
    id: 'view_events',
    nameAr: 'عرض الرحلات والمؤتمرات الكنسية',
    nameEn: 'View Church Trips & Conferences',
    descriptionAr: 'عرض كافة الفعاليات والرحلات المتاحة حالياً للتسجيل مع الأسعار والأماكن',
    descriptionEn: 'Display active church trips and conferences with pricing and capacity',
    requiresAuth: false,
    requiresConfirmation: false,
    inputSchema: {
      type: { type: 'string', required: false, description: 'Event type (TRIP, CONFERENCE, etc.)' }
    }
  },
  register_trip: {
    id: 'register_trip',
    nameAr: 'بدء حجز رحلة كنسية',
    nameEn: 'Initiate Church Trip Booking',
    descriptionAr: 'بدء إجراءات تسجيل وحجز رحلة كنسية متاحة',
    descriptionEn: 'Start registration workflow for an available church trip',
    requiresAuth: true,
    requiresConfirmation: true,
    inputSchema: {
      eventId: { type: 'string', required: true, description: 'The unique ID of the event/trip' },
      fullName: { type: 'string', required: true, description: 'Applicant full name' },
      phone: { type: 'string', required: true, description: 'Contact phone number' },
      paymentMethod: { type: 'string', required: false, description: 'FULL or INSTALLMENT' }
    }
  },
  register_membership: {
    id: 'register_membership',
    nameAr: 'استمارة عضوية الأسرة الكنسية',
    nameEn: 'Family Membership Registration',
    descriptionAr: 'التوجيه المباشر لاستمارة تسجيل وتحديث بيانات عضوية الأسرة',
    descriptionEn: 'Direct guidance to family church membership registration form',
    requiresAuth: false,
    requiresConfirmation: false,
    inputSchema: {}
  },
  book_appointment: {
    id: 'book_appointment',
    nameAr: 'حجز جلسة اعتراف أو لقاء رعوي',
    nameEn: 'Book Confession or Pastoral Meeting',
    descriptionAr: 'التوجيه لحجز موعد سري ومعتمد مع أحد الآباء الكهنة',
    descriptionEn: 'Book a confidential pastoral or confession slot with a priest',
    requiresAuth: true,
    requiresConfirmation: true,
    inputSchema: {
      priestId: { type: 'string', required: true, description: 'Priest profile ID' },
      date: { type: 'string', required: true, description: 'Requested date (YYYY-MM-DD)' },
      timeSlot: { type: 'string', required: true, description: 'Selected time slot' },
      notes: { type: 'string', required: false, description: 'Optional spiritual note' }
    }
  },
  view_donations: {
    id: 'view_donations',
    nameAr: 'الحسابات البنكية والتبرعات',
    nameEn: 'Official Donation Accounts',
    descriptionAr: 'عرض أرقام الحسابات البنكية الرسمية ببنك مصر ووسائل العطاء المعتمدة',
    descriptionEn: 'Display official Banque Misr church bank accounts and instructions',
    requiresAuth: false,
    requiresConfirmation: false,
    inputSchema: {}
  },
  contact_church: {
    id: 'contact_church',
    nameAr: 'تواصل مع الكنيسة والسكرتارية',
    nameEn: 'Contact Church Office',
    descriptionAr: 'عرض أرقام الهواتف الرسمية والعنوان وساعات العمل',
    descriptionEn: 'Display official phone numbers, physical address, and hours',
    requiresAuth: false,
    requiresConfirmation: false,
    inputSchema: {}
  },
  check_my_status: {
    id: 'check_my_status',
    nameAr: 'متابعة طلباتي وحجوزاتي',
    nameEn: 'Check My Requests & Bookings',
    descriptionAr: 'عرض مواعيد الاعتراف والرحلات المحجوزة للمستخدم المسجل',
    descriptionEn: 'Display active confession appointments and trip bookings for authenticated user',
    requiresAuth: true,
    requiresConfirmation: false,
    inputSchema: {}
  }
};

export class ChurchAiActionService {
  /**
   * Execute an authorized action from the registry
   */
  static async executeAction(
    actionId: string,
    params: Record<string, any>,
    user?: { id: string; role: Role; fullName: string; phone?: string; email: string } | null
  ): Promise<ActionResult> {
    const action = ACTION_REGISTRY[actionId];
    if (!action) {
      return {
        success: false,
        actionId,
        messageAr: 'الإجراء المطلوب غير معروف أو غير معتمد.',
        messageEn: 'The requested action is not recognized or approved.'
      };
    }

    // 1. Auth Check
    if (action.requiresAuth && !user) {
      return {
        success: false,
        actionId,
        redirectUrl: '/login',
        messageAr: 'يتطلب تنفيذ هذا الإجراء تسجيل الدخول بحسابك الكنسي أولاً.',
        messageEn: 'This action requires logging into your church account first.'
      };
    }

    // 2. Role Check
    if (action.requiredRole && user && !action.requiredRole.includes(user.role)) {
      return {
        success: false,
        actionId,
        messageAr: 'عذراً، لا تمتلك الصلاحيات الكافية لتنفيذ هذا الإجراء.',
        messageEn: 'You do not have the required permissions to execute this action.'
      };
    }

    // 3. Execution Handlers
    switch (actionId) {
      case 'open_schedule': {
        const schedules = await prisma.massSchedule.findMany({
          orderBy: { createdAt: 'asc' }
        });
        return {
          success: true,
          actionId,
          data: schedules,
          redirectUrl: '/schedule',
          messageAr: `تم جلب ${schedules.length} مواعيد قداسات معتمدة. يمكنك الاطلاع عليها مباشرة في صفحة المواعيد.`,
          messageEn: `Retrieved ${schedules.length} official liturgy schedules. View them on the schedules page.`
        };
      }

      case 'open_clergy': {
        const clergy = await prisma.priestProfile.findMany({
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            titleAr: true,
            titleEn: true,
            confessionStatus: true,
            avatarUrl: true
          }
        });
        return {
          success: true,
          actionId,
          data: clergy,
          redirectUrl: '/',
          messageAr: `يخدم الكنيسة ${clergy.length} من الآباء الكهنة المباركين. يمكنك حجز موعد اعتراف معهم عبر الصفحة الرئيسية.`,
          messageEn: `The church is blessed with ${clergy.length} priests. You can book confession on the main page.`
        };
      }

      case 'view_events': {
        const now = new Date();
        const events = await prisma.event.findMany({
          where: {
            date: { gte: now }
          },
          include: {
            _count: {
              select: { tripBookings: true }
            }
          },
          orderBy: { date: 'asc' },
          take: 10
        });

        const formatted = events.map(e => ({
          id: e.id,
          titleAr: e.titleAr,
          titleEn: e.titleEn,
          descriptionAr: e.descriptionAr,
          descriptionEn: e.descriptionEn,
          type: e.type,
          date: e.date,
          locationAr: e.locationAr,
          locationEn: e.locationEn,
          price: e.price,
          registeredCount: e._count.tripBookings,
          isOpen: true
        }));

        return {
          success: true,
          actionId,
          data: formatted,
          redirectUrl: '/schedule',
          messageAr: `يوجد حالياً ${events.length} رحلات وفعاليات قادمة متاحة.`,
          messageEn: `There are currently ${events.length} upcoming trips and events available.`
        };
      }

      case 'register_trip': {
        if (!user) throw new Error('Authentication required');
        const { eventId, fullName, phone, paymentMethod } = params;

        if (!eventId) {
          return {
            success: false,
            actionId,
            messageAr: 'يرجى تحديد الرحلة أو الفعالية المراد حجزها.',
            messageEn: 'Please specify the trip or event to book.'
          };
        }

        const event = await prisma.event.findUnique({
          where: { id: eventId }
        });

        if (!event) {
          return {
            success: false,
            actionId,
            messageAr: 'الرحلة المطلوبة غير موجودة أو انتهى موعدها.',
            messageEn: 'The requested trip was not found or has expired.'
          };
        }

        // Check if user already booked this event
        const existingBooking = await prisma.tripBooking.findFirst({
          where: {
            eventId,
            phone: phone || user.phone || ''
          }
        });

        if (existingBooking) {
          return {
            success: false,
            actionId,
            messageAr: `أنت مسجل بالفعل في هذه الرحلة (${event.titleAr}) برقم هاتف ${existingBooking.phone}.`,
            messageEn: `You are already registered for this trip (${event.titleEn}) with phone ${existingBooking.phone}.`
          };
        }

        // Create booking record with real persistence
        const booking = await prisma.tripBooking.create({
          data: {
            eventId,
            fullName: fullName || user.fullName,
            phone: phone || user.phone || '01000000000',
            totalAmount: event.price || 0,
            paymentMethod: paymentMethod === 'INSTALLMENT' ? 'INSTALLMENT' : 'FULL',
            status: 'PENDING'
          }
        });

        return {
          success: true,
          actionId,
          data: { bookingId: booking.id, eventTitle: event.titleAr },
          redirectUrl: '/schedule',
          messageAr: `تم تسجيل طلب حجز الرحلة بنجاح برقم إشعار (#${booking.id.slice(0, 8)}). ستتواصل معك سكرتارية الرحلات لتأكيد الاشتراك.`,
          messageEn: `Trip registration submitted successfully (Ref: #${booking.id.slice(0, 8)}). The trip management will contact you.`
        };
      }

      case 'register_membership': {
        return {
          success: true,
          actionId,
          redirectUrl: '/register-member',
          messageAr: 'يمكنك فتح استمارة العضوية الكنسية للأسرة مباشرة واستيفاء بيانات الأسرة بشكل آمن.',
          messageEn: 'Open the official Family Membership Registration form to safely submit your details.'
        };
      }

      case 'view_donations': {
        return {
          success: true,
          actionId,
          data: CHURCH_INFO.bankAccounts,
          redirectUrl: '/donations',
          messageAr: `الحساب البنكي الرسمي ببنك مصر: ${CHURCH_INFO.bankAccounts.egpAccount} (كود السويفت: ${CHURCH_INFO.bankAccounts.swiftCode}).`,
          messageEn: `Official Banque Misr Account: ${CHURCH_INFO.bankAccounts.egpAccount} (SWIFT: ${CHURCH_INFO.bankAccounts.swiftCode}).`
        };
      }

      case 'contact_church': {
        return {
          success: true,
          actionId,
          data: {
            phones: CHURCH_INFO.phoneNumbers,
            email: CHURCH_INFO.email,
            address: CHURCH_INFO.addressAr
          },
          redirectUrl: '/contact',
          messageAr: `أرقام التواصل: ${CHURCH_INFO.phoneNumbers.join(' - ')} | العنوان: ${CHURCH_INFO.addressAr}`,
          messageEn: `Contacts: ${CHURCH_INFO.phoneNumbers.join(' - ')} | Address: ${CHURCH_INFO.addressEn}`
        };
      }

      case 'check_my_status': {
        if (!user) throw new Error('Authentication required');

        const [appointments, bookings] = await Promise.all([
          prisma.appointment.findMany({
            where: { memberId: user.id },
            include: { priest: true },
            orderBy: { date: 'desc' },
            take: 5
          }),
          prisma.tripBooking.findMany({
            where: { phone: user.phone || '' },
            include: { event: true },
            orderBy: { createdAt: 'desc' },
            take: 5
          })
        ]);

        return {
          success: true,
          actionId,
          data: {
            appointments: appointments.map(a => ({
              id: a.id,
              priest: a.priest.nameAr,
              date: a.date.toISOString().split('T')[0],
              timeSlot: a.timeSlot,
              status: a.status
            })),
            tripBookings: bookings.map(b => ({
              id: b.id,
              event: b.event.titleAr,
              status: b.status,
              amount: b.totalAmount
            }))
          },
          messageAr: `لديك ${appointments.length} جلسات اعتراف محجوزة، و ${bookings.length} حجوزات رحلات مسجلة.`,
          messageEn: `You have ${appointments.length} confession appointments and ${bookings.length} trip bookings.`
        };
      }

      default:
        return {
          success: false,
          actionId,
          messageAr: 'الإجراء المطلوب غير مدعوم في الوقت الحالي.',
          messageEn: 'The action is currently unsupported.'
        };
    }
  }
}
