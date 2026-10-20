'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import { 
  QrCode, Camera, CheckCircle2, AlertTriangle, XCircle, Users, PlusCircle, 
  RefreshCw, MapPin, Crown, Search, ShieldAlert, ArrowLeft, ArrowRight, Eye, EyeOff, Trash2, Undo2,
  Calendar, Clock, Check, Lock, Unlock, PlayCircle, Sparkles, Repeat, Edit3, Key, Copy, Phone, Mail, User, FileText
} from 'lucide-react';
import { API_URL } from '../config';
import VipInvitationCard from './VipInvitationCard';

interface EventsInvitationsManagerProps {
  token: string | null;
}

export default function EventsInvitationsManager({ token }: EventsInvitationsManagerProps) {
  const { language } = useTheme();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [activeTab, setActiveTab] = useState<'ALL_EVENTS' | 'SCANNER' | 'EVENTS' | 'INVITATIONS' | 'CHECKINS'>('ALL_EVENTS');
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [locations, setLocations] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [isGlobalEventsPublic, setIsGlobalEventsPublic] = useState<boolean>(true);

  // Scanner States
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<any | null>(null);
  const isProcessingScanRef = useRef<boolean>(false);

  // Invitation creation states
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [recipientSearch, setRecipientSearch] = useState<string>('');
  const [recipientResults, setRecipientResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedUsersList, setSelectedUsersList] = useState<any[]>([]);
  const [deductVipCapacity, setDeductVipCapacity] = useState<boolean>(false);
  const [externalEmail, setExternalEmail] = useState<string>('');
  const [externalName, setExternalName] = useState<string>('');
  const [isVip, setIsVip] = useState<boolean>(false);
  const [issuing, setIssuing] = useState<boolean>(false);

  // Issued invitations list
  const [invitations, setInvitations] = useState<any[]>([]);
  const [previewInvitation, setPreviewInvitation] = useState<any | null>(null);
  const [invSearchQuery, setInvSearchQuery] = useState<string>('');
  const [invFilterType, setInvFilterType] = useState<'ALL' | 'VIP' | 'STANDARD' | 'ACTIVE' | 'REDEEMED'>('ALL');

  // Check-in logs
  const [checkIns, setCheckIns] = useState<any[]>([]);

  // Reopen capacity modal states
  const [reopenLocation, setReopenLocation] = useState<any | null>(null);
  const [newCapacity, setNewCapacity] = useState<number>(0);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [reopening, setReopening] = useState<boolean>(false);

  // Create Event Modal states
  const [showCreateEventModal, setShowCreateEventModal] = useState<boolean>(false);
  const [newTitleAr, setNewTitleAr] = useState<string>('');
  const [newTitleEn, setNewTitleEn] = useState<string>('');
  const [newDescAr, setNewDescAr] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('18:00');
  const [newEndTime, setNewEndTime] = useState<string>('21:00');
  const [newLocationsList, setNewLocationsList] = useState<Array<{ nameAr: string; maxCapacity: number }>>([
    { nameAr: 'الكنيسة الكبرى', maxCapacity: 150 },
    { nameAr: 'القاعة الملحقة', maxCapacity: 80 }
  ]);
  const [newRequireMember, setNewRequireMember] = useState<boolean>(false);
  const [newMinAge, setNewMinAge] = useState<number | ''>('');
  const [newIsPublicVisible, setNewIsPublicVisible] = useState<boolean>(true);
  const [newIsApplicationActive, setNewIsApplicationActive] = useState<boolean>(true);
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);

  // All Events Tab States (Draft / Posted Live / Expired)
  const [allEventsFilter, setAllEventsFilter] = useState<'ALL' | 'DRAFT' | 'ACTIVE' | 'EXPIRED'>('ALL');
  const [renewingEvent, setRenewingEvent] = useState<any | null>(null);
  const [renewDate, setRenewDate] = useState<string>('');
  const [renewStartTime, setRenewStartTime] = useState<string>('18:00');
  const [renewEndTime, setRenewEndTime] = useState<string>('21:00');
  const [renewLocationCaps, setRenewLocationCaps] = useState<Array<{ id: string; nameAr: string; maxCapacity: number }>>([]);
  const [isRenewing, setIsRenewing] = useState<boolean>(false);

  // Edit Event Modal states
  const [showEditEventModal, setShowEditEventModal] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editTitleAr, setEditTitleAr] = useState<string>('');
  const [editTitleEn, setEditTitleEn] = useState<string>('');
  const [editDescAr, setEditDescAr] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('18:00');
  const [editEndTime, setEditEndTime] = useState<string>('21:00');
  const [editLocations, setEditLocations] = useState<Array<{ id?: string; nameAr: string; maxCapacity: number }>>([]);
  const [deletedLocationIds, setDeletedLocationIds] = useState<string[]>([]);
  const [editRequireMember, setEditRequireMember] = useState<boolean>(false);
  const [editMinAge, setEditMinAge] = useState<number | ''>('');
  const [editIsPublicVisible, setEditIsPublicVisible] = useState<boolean>(true);
  const [editIsApplicationActive, setEditIsApplicationActive] = useState<boolean>(true);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const handleOpenEditModal = (ev: any) => {
    setEditingEvent(ev);
    setEditTitleAr(ev.titleAr || '');
    setEditTitleEn(ev.titleEn || '');
    setEditDescAr(ev.descriptionAr || '');
    const dStr = ev.date ? new Date(ev.date).toISOString().split('T')[0] : '';
    setEditDate(dStr);
    setEditStartTime(ev.startTime || '18:00');
    setEditEndTime(ev.endTime || '21:00');
    setEditIsPublicVisible(Boolean(ev.isPublicVisible));
    setEditIsApplicationActive(Boolean(ev.isApplicationActive));

    let rules: any = {};
    try { rules = JSON.parse(ev.eligibilityRulesJson || '{}'); } catch {}
    setEditRequireMember(Boolean(rules.requireVerifiedMember));
    setEditMinAge(rules.minAge !== undefined ? rules.minAge : '');

    setEditLocations(
      (ev.locations || []).map((l: any) => ({
        id: l.id,
        nameAr: l.nameAr,
        maxCapacity: l.maxCapacity
      }))
    );
    setDeletedLocationIds([]);
    setShowEditEventModal(true);
  };

  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingEvent || !editTitleAr.trim()) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch(`${API_URL}/invitations/admin/events/${editingEvent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          titleAr: editTitleAr.trim(),
          titleEn: editTitleEn.trim() || undefined,
          descriptionAr: editDescAr.trim(),
          date: editDate ? editDate : undefined,
          startTime: editStartTime,
          endTime: editEndTime,
          isPublicVisible: editIsPublicVisible,
          isApplicationActive: editIsApplicationActive,
          rules: {
            requireVerifiedMember: editRequireMember,
            minAge: editMinAge !== '' ? editMinAge : undefined
          },
          locations: editLocations,
          deletedLocationIds: deletedLocationIds
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? '✓ تم حفظ جميع تعديلات الفعالية والأماكن والقواعد بنجاح!' : '✓ Event updated successfully!');
        setShowEditEventModal(false);
        refreshAdminEvents(true);
      } else {
        alert(data.error || 'Failed to update event.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Current logged in user info (for SuperAdmin/Dev check)
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const uStr = localStorage.getItem('church-user');
      if (uStr) {
        try { setCurrentUser(JSON.parse(uStr)); } catch {}
      }
    }
  }, []);
  const isSuperAdminOrDev = currentUser && ['SUPER_ADMIN', 'DEVELOPER'].includes(currentUser.role);

  // Attendees List per Event/Location states
  const [eventAttendees, setEventAttendees] = useState<any[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState<boolean>(false);
  const [attendeeLocationFilter, setAttendeeLocationFilter] = useState<string>('ALL');
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState<string>('');
  
  // Attendee Full Profile Modal state
  const [selectedAttendeeProfile, setSelectedAttendeeProfile] = useState<any | null>(null);

  // Cancel Attendee Invitation Modal states (Multi-Step Verification)
  const [cancellingAttendee, setCancellingAttendee] = useState<any | null>(null);
  const [cancelAttendeeReason, setCancelAttendeeReason] = useState<string>('');
  const [cancelAttendeeVerification, setCancelAttendeeVerification] = useState<string>('');
  const [isCancellingAttendee, setIsCancellingAttendee] = useState<boolean>(false);
  const [cancelAttendeeFeedback, setCancelAttendeeFeedback] = useState<string | null>(null);

  // Cancel Entire Event Modal states (Multi-Step Verification with Passcode)
  const [cancellingEventTarget, setCancellingEventTarget] = useState<any | null>(null);
  const [cancelEventPasscode, setCancelEventPasscode] = useState<string>('');
  const [cancelEventReason, setCancelEventReason] = useState<string>('');
  const [cancelEventVerification, setCancelEventVerification] = useState<string>('');
  const [isCancellingEvent, setIsCancellingEvent] = useState<boolean>(false);
  const [cancelEventFeedback, setCancelEventFeedback] = useState<string | null>(null);
  const [revealedPasscode, setRevealedPasscode] = useState<string | null>(null);

  const fetchEventAttendees = (eventId: string, locId: string = 'ALL') => {
    if (!token || !eventId || eventId === 'ALL') return;
    setIsLoadingAttendees(true);
    const url = `${API_URL}/invitations/admin/events/${eventId}/attendees${locId !== 'ALL' ? `?locationId=${locId}` : ''}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEventAttendees(data);
      })
      .catch(err => console.error('Error fetching attendees:', err))
      .finally(() => setIsLoadingAttendees(false));
  };

  useEffect(() => {
    if (activeTab === 'EVENTS' && selectedEventId && selectedEventId !== 'ALL') {
      fetchEventAttendees(selectedEventId, attendeeLocationFilter);
    }
  }, [activeTab, selectedEventId, attendeeLocationFilter, token]);

  const handleOpenCancelAttendee = (att: any) => {
    setCancellingAttendee(att);
    setCancelAttendeeReason('');
    setCancelAttendeeVerification('');
    setCancelAttendeeFeedback(null);
  };

  const handleConfirmCancelAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !cancellingAttendee) return;

    if (!cancelAttendeeReason.trim()) {
      setCancelAttendeeFeedback(isAr ? 'يرجى كتابة سبب الإلغاء ليتم إرساله للمستخدم.' : 'Please provide cancellation reason.');
      return;
    }

    const typed = cancelAttendeeVerification.trim().toLowerCase();
    if (typed !== 'cancel' && typed !== 'إلغاء') {
      setCancelAttendeeFeedback(isAr ? 'يرجى كتابة كلمة "Cancel" أو "إلغاء" في المربع للتأكيد.' : 'Please type "Cancel" to confirm.');
      return;
    }

    setIsCancellingAttendee(true);
    setCancelAttendeeFeedback(null);

    try {
      const res = await fetch(`${API_URL}/invitations/admin/invitations/${cancellingAttendee.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: cancelAttendeeReason.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? '✓ تم إلغاء دعوة المستخدم بنجاح وإرسال إيميل بالسبب وتحديث السعات!' : '✓ Invitation cancelled successfully!');
        setCancellingAttendee(null);
        if (selectedAttendeeProfile?.id === cancellingAttendee.id) {
          setSelectedAttendeeProfile(null);
        }
        if (selectedEventId) {
          fetchEventAttendees(selectedEventId, attendeeLocationFilter);
        }
        refreshAdminEvents(true);
      } else {
        setCancelAttendeeFeedback(data.errorAr || data.error || 'Failed to cancel invitation.');
      }
    } catch (err) {
      setCancelAttendeeFeedback(isAr ? 'خطأ في الاتصال بالخادم.' : 'Connection error.');
    } finally {
      setIsCancellingAttendee(false);
    }
  };

  const handleRevealPasscode = async (eventId: string) => {
    if (!token || !eventId) return;
    try {
      const res = await fetch(`${API_URL}/invitations/admin/events/${eventId}/cancellation-passcode`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.passcode) {
        setRevealedPasscode(data.passcode);
      } else {
        alert(data.error || 'Unauthorized to view passcode.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmCancelEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !cancellingEventTarget) return;

    if (!cancelEventPasscode.trim() || !cancelEventReason.trim()) {
      setCancelEventFeedback(isAr ? 'يرجى إدخال كود الإلغاء وسبب الإلغاء.' : 'Passcode and reason required.');
      return;
    }

    const typed = cancelEventVerification.trim().toUpperCase();
    if (typed !== 'CANCEL' && typed !== 'إلغاء') {
      setCancelEventFeedback(isAr ? 'يرجى كتابة كلمة "CANCEL" للتأكيد النهائي.' : 'Type CANCEL to confirm.');
      return;
    }

    setIsCancellingEvent(true);
    setCancelEventFeedback(null);

    try {
      const res = await fetch(`${API_URL}/invitations/admin/events/${cancellingEventTarget.id}/cancel-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          passcode: cancelEventPasscode.trim(),
          reason: cancelEventReason.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? '✓ تم إلغاء الفعالية رسمياً وإبطال جميع البطاقات وإرسال إيميلات الاعتذار للمشاركين!' : '✓ Event cancelled officially!');
        setCancellingEventTarget(null);
        refreshAdminEvents(true);
      } else {
        setCancelEventFeedback(data.errorAr || data.error || 'Failed to cancel event.');
      }
    } catch (err) {
      setCancelEventFeedback(isAr ? 'خطأ في الاتصال بالخادم.' : 'Connection error.');
    } finally {
      setIsCancellingEvent(false);
    }
  };

  const isEventExpired = (ev: any) => {
    if (!ev || !ev.date) return false;
    const evDate = new Date(ev.date).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    return evDate < today;
  };

  const handleTogglePublish = async (ev: any) => {
    if (!token) return;
    const newVal = !ev.isPublicVisible;
    try {
      const res = await fetch(`${API_URL}/invitations/admin/events/${ev.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isPublicVisible: newVal })
      });
      if (res.ok) {
        setActionMsg(newVal 
          ? (isAr ? '✓ أصبحت صفحة الفعالية ظاهرة للجمهور الآن!' : '✓ Event page is now visible to the public!')
          : (isAr ? '✓ تم إخفاء صفحة الفعالية عن الجمهور.' : '✓ Event is now hidden from public.'));
        refreshAdminEvents(true);
        window.dispatchEvent(new Event('event-visibility-change'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleApply = async (ev: any) => {
    if (!token) return;
    const newVal = !ev.isApplicationActive;
    try {
      const res = await fetch(`${API_URL}/invitations/admin/events/${ev.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isApplicationActive: newVal })
      });
      if (res.ok) {
        setActionMsg(newVal 
          ? (isAr ? '✓ تم فتح وتفعيل زر التقديم للجمهور بنجاح!' : '✓ Application button activated for the public!')
          : (isAr ? '✓ تم قفل زر التقديم (سيظهر كغير متاح).' : '✓ Application button is now locked.'));
        refreshAdminEvents(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenRenewModal = (ev: any) => {
    setRenewingEvent(ev);
    const today = new Date();
    today.setDate(today.getDate() + 7);
    setRenewDate(today.toISOString().split('T')[0]);
    setRenewStartTime(ev.startTime || '18:00');
    setRenewEndTime(ev.endTime || '21:00');
    setRenewLocationCaps(
      (ev.locations || []).map((l: any) => ({
        id: l.id,
        nameAr: l.nameAr,
        maxCapacity: Math.max(l.maxCapacity, l.confirmedCount + 50)
      }))
    );
  };

  const handleSaveRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !renewingEvent || !renewDate) return;
    setIsRenewing(true);

    try {
      const res = await fetch(`${API_URL}/invitations/admin/events/${renewingEvent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: renewDate,
          startTime: renewStartTime,
          endTime: renewEndTime,
          isPublicVisible: true,
          isApplicationActive: true,
          locationCapacities: renewLocationCaps
        })
      });

      if (res.ok) {
        setActionMsg(isAr ? '✓ تم تجديد الفعالية وتحديث السعات بنجاح وتمت إعادتها للفعاليات النشطة!' : '✓ Event renewed with updated capacities successfully!');
        setRenewingEvent(null);
        refreshAdminEvents();
        window.dispatchEvent(new Event('event-visibility-change'));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to renew event.');
      }
    } catch (err) {
      console.error('Error renewing event:', err);
    } finally {
      setIsRenewing(false);
    }
  };

  const refreshAdminEvents = (silent: boolean = false) => {
    if (!token) return;
    fetch(`${API_URL}/invitations/admin/events`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEvents(data);
          setSelectedEventId(prev => {
            if (prev === 'ALL') return 'ALL';
            if (prev && data.some((d: any) => d.id === prev)) return prev;
            return data.length > 0 ? data[0].id : '';
          });
        }
      })
      .catch(err => console.error('Error fetching admin events:', err));
  };

  const checkGlobalPublicStatus = () => {
    fetch(`${API_URL}/invitations/public-status`)
      .then(r => r.json())
      .then(d => { if (typeof d.isPublic === 'boolean') setIsGlobalEventsPublic(d.isPublic); })
      .catch(() => {});
  };

  // Fetch all events on mount + silent live auto-refresh every 3.5s
  useEffect(() => {
    refreshAdminEvents(false);
    checkGlobalPublicStatus();
    const interval = setInterval(() => {
      refreshAdminEvents(true);
      checkGlobalPublicStatus();
    }, 3500); // 3.5s silent background auto-refresh with no delays

    return () => clearInterval(interval);
  }, [token]);

  const handleToggleGlobalEventsPublicStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/invitations/admin/toggle-public-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isPublic: !isGlobalEventsPublic })
      });
      const data = await res.json();
      if (res.ok) {
        setIsGlobalEventsPublic(data.isPublic);
        setActionMsg(data.messageAr || (isAr ? 'تم تحديث حالة الظهور بنجاح.' : 'Visibility updated.'));
        window.dispatchEvent(new Event('event-visibility-change'));
      } else {
        alert(data.error || 'Failed to toggle status.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!newTitleAr.trim() || !newDate) {
      alert(isAr ? 'يرجى إدخال اسم الفعالية وتاريخها.' : 'Title and date required.');
      return;
    }

    setIsCreatingEvent(true);
    try {
      const res = await fetch(`${API_URL}/invitations/admin/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          titleAr: newTitleAr.trim(),
          titleEn: newTitleEn.trim() || newTitleAr.trim(),
          descriptionAr: newDescAr.trim(),
          date: newDate,
          startTime: newStartTime.trim() || undefined,
          endTime: newEndTime.trim() || undefined,
          isPublicVisible: newIsPublicVisible,
          isApplicationActive: newIsApplicationActive,
          locations: newLocationsList.filter(l => l.nameAr.trim().length > 0),
          rules: {
            requireVerifiedMember: newRequireMember,
            minAge: newMinAge ? Number(newMinAge) : undefined
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? '✓ تم إنشاء الفعالية وضبط الأماكن والقواعد بنجاح!' : '✓ Event created successfully!');
        setShowCreateEventModal(false);
        setNewTitleAr('');
        setNewTitleEn('');
        setNewDescAr('');
        setNewDate('');
        refreshAdminEvents();
      } else {
        alert(data.error || 'Failed to create event');
      }
    } catch (err) {
      alert('Error creating event');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleToggleEventVisibility = async (evId: string, current: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/invitations/admin/events/${evId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isPublicVisible: !current })
      });
      if (res.ok) {
        refreshAdminEvents();
        setActionMsg(isAr ? (!current ? '✓ تم إظهار صفحة الفعالية للجمهور.' : '✓ تم إخفاء صفحة الفعالية عن الجمهور.') : 'Visibility updated.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleApplicationActive = async (evId: string, current: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/invitations/admin/events/${evId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isApplicationActive: !current })
      });
      if (res.ok) {
        refreshAdminEvents();
        setActionMsg(isAr ? (!current ? '✓ تم فتح وتفعيل زر التقديم للجمهور.' : '✓ تم قفل زر التقديم (رمادي).') : 'Application button status updated.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEvent = async (evId: string, title: string) => {
    if (!token) return;
    if (!confirm(isAr ? `هل أنت متأكد من حذف هذه الفعالية بكافة أماكنها ودعواتها؟\n"${title}"` : `Delete event "${title}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/invitations/admin/events/${evId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        refreshAdminEvents();
        setActionMsg(isAr ? '✓ تم حذف الفعالية بنجاح.' : '✓ Event deleted.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLocationPrompt = async (evId: string) => {
    if (!token) return;
    const name = prompt(isAr ? 'أدخل اسم المقر / القاعة الجديدة (نص):' : 'Enter location/hall name:');
    if (!name || !name.trim()) return;
    const capStr = prompt(isAr ? 'أدخل السعة الاستيعابية القصوى لهذا المكان:' : 'Enter max capacity number:', '100');
    const cap = parseInt(capStr || '100', 10);
    if (isNaN(cap) || cap <= 0) return;

    try {
      const res = await fetch(`${API_URL}/invitations/admin/events/${evId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          newLocation: { nameAr: name.trim(), maxCapacity: cap }
        })
      });
      if (res.ok) {
        refreshAdminEvents();
        setActionMsg(isAr ? '✓ تمت إضافة المكان بنجاح!' : '✓ Location added successfully!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load locations when selected event changes
  useEffect(() => {
    if (!selectedEventId) {
      setLocations([]);
      return;
    }
    const currentEvent = events.find(e => e.id === selectedEventId);
    if (currentEvent && Array.isArray(currentEvent.locations)) {
      setLocations(currentEvent.locations);
      if (currentEvent.locations.length > 0) {
        setSelectedLocationId(currentEvent.locations[0].id);
      }
    }
  }, [selectedEventId, events]);

  // Load invitations or check-ins when tab switches
  useEffect(() => {
    if (!token) return;

    if (activeTab === 'INVITATIONS' && selectedEventId) {
      fetch(`${API_URL}/invitations/admin/events/${selectedEventId}/invitations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setInvitations(data);
        })
        .catch(err => console.error(err));
    }

    if (activeTab === 'CHECKINS' && selectedEventId) {
      fetch(`${API_URL}/invitations/admin/events/${selectedEventId}/checkins`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setCheckIns(data);
        })
        .catch(err => console.error(err));
    }

    if (activeTab === 'EVENTS' && selectedEventId && selectedEventId !== 'ALL') {
      fetchEventAttendees(selectedEventId, attendeeLocationFilter);
    }
  }, [token, activeTab, selectedEventId, attendeeLocationFilter]);

  // Recipient search autocomplete
  useEffect(() => {
    if (!token || !recipientSearch || recipientSearch.length < 2) {
      setRecipientResults([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`${API_URL}/email-center/recipients?search=${encodeURIComponent(recipientSearch)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setRecipientResults(data);
        })
        .catch(err => console.error(err));
    }, 250);

    return () => clearTimeout(timer);
  }, [token, recipientSearch]);

  // Start continuous QR scanner
  const startScanner = async () => {
    setCameraError(null);
    setScanResult(null);
    isProcessingScanRef.current = false;

    try {
      const html5QrMod = await import('html5-qrcode');
      const Html5QrcodeClass = html5QrMod.Html5Qrcode || (html5QrMod as any).default?.Html5Qrcode;
      if (!Html5QrcodeClass) throw new Error('Scanner module unavailable');
      const qrScanner = new Html5QrcodeClass('qr-reader-container');
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.78);
            return { width: Math.max(220, size), height: Math.max(220, size) };
          },
          videoConstraints: {
            facingMode: { ideal: 'environment' },
            width: { min: 640, ideal: 1920, max: 2560 },
            height: { min: 480, ideal: 1080, max: 1440 }
          }
        },
        async (decodedText: string) => {
          if (isProcessingScanRef.current) return;
          isProcessingScanRef.current = true;

          // Call verify endpoint
          try {
            const res = await fetch(`${API_URL}/invitations/admin/verify-qr`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                qrToken: decodedText,
                eventId: selectedEventId === 'ALL' ? undefined : (selectedEventId || undefined),
                locationId: selectedLocationId || undefined
              })
            });

            const data = await res.json();
            setScanResult({
              success: data.status === 'VERIFIED',
              status: data.status,
              invitation: data.invitation,
              error: data.messageAr || data.error,
              messageAr: data.messageAr,
              messageEn: data.messageEn,
              redeemedAt: data.redeemedAt,
              qrToken: decodedText
            });
          } catch (err) {
            setScanResult({
              success: false,
              status: 'NETWORK_ERROR',
              error: isAr ? 'خطأ في الاتصال بالخادم.' : 'Network connection error.'
            });
          }
        },
        (errorMessage) => {
          // Ignore transient frame parse errors
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError(isAr ? 'تعذر تشغيل الكاميرا. يرجى التأكد من منح الإذن وتأمين اتصال HTTPS.' : 'Failed to access camera.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
    setIsScanning(false);
  };

  // Resume continuous scanning without closing camera
  const resumeScan = () => {
    setScanResult(null);
    isProcessingScanRef.current = false;
  };

  const handleIssueInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedEventId || !selectedLocationId) return;

    const recipientsList: any[] = [];
    selectedUsersList.forEach(u => {
      recipientsList.push({
        userId: u.id,
        email: u.email,
        name: u.fullName
      });
    });

    if (selectedUser && !selectedUsersList.some(u => u.id === selectedUser.id)) {
      recipientsList.push({
        userId: selectedUser.id,
        email: selectedUser.email,
        name: selectedUser.fullName
      });
    }

    if (externalName.trim()) {
      recipientsList.push({
        name: externalName.trim(),
        email: externalEmail.trim() || undefined
      });
    }

    if (recipientsList.length === 0) {
      setActionMsg(isAr ? 'يرجى اختيار مستلم واحد على الأقل أو كتابة بيانات الضيف.' : 'Please select at least one recipient.');
      return;
    }

    setIssuing(true);
    setActionMsg(null);

    try {
      const res = await fetch(`${API_URL}/invitations/admin/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          locationId: selectedLocationId,
          isVip,
          deductCapacity: isVip ? deductVipCapacity : true,
          recipients: recipientsList
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr 
          ? `✓ تم إصدار ${data.count || recipientsList.length} دعوة ${isVip ? 'VIP مميزة' : 'رسمية'} بنجاح!` 
          : `✓ Successfully issued ${data.count || recipientsList.length} ${isVip ? 'VIP' : 'standard'} passes!`);
        setShowIssueModal(false);
        setSelectedUser(null);
        setSelectedUsersList([]);
        setExternalEmail('');
        setExternalName('');
        setIsVip(false);
        setDeductVipCapacity(false);
        // Refresh invitations
        fetch(`${API_URL}/invitations/admin/events/${selectedEventId}/invitations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(d => { if (Array.isArray(d)) setInvitations(d); });
      } else {
        setActionMsg(data.errorAr || data.error || (isAr ? 'فشل إصدار الدعوات.' : 'Failed to issue invitations.'));
      }
    } catch (err) {
      setActionMsg(isAr ? 'خطأ في الاتصال بالخادم.' : 'Connection error.');
    } finally {
      setIssuing(false);
    }
  };

  const handleReopenLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !reopenLocation) return;

    setReopening(true);
    try {
      const res = await fetch(`${API_URL}/invitations/admin/locations/${reopenLocation.id}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          newCapacity,
          reason: reopenReason.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? '✓ تم فتح المكان بنجاح وتحديث السعة وتسجيل العملية!' : '✓ Location successfully reopened and capacity audited!');
        setReopenLocation(null);
        // Refresh events
        fetch(`${API_URL}/invitations/admin/events`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(d => { if (Array.isArray(d)) setEvents(d); });
      } else {
        setActionMsg(data.error || (isAr ? 'فشل فتح المكان.' : 'Failed to reopen location.'));
      }
    } catch (err) {
      setActionMsg(isAr ? 'خطأ في الاتصال.' : 'Connection error.');
    } finally {
      setReopening(false);
    }
  };

  const handleRevertCheckIn = async (checkInId: string) => {
    const reason = prompt(isAr ? 'أدخل سبب إلغاء الحضور المسجل (مطلوب للتدقيق الرقابي):' : 'Enter reason for check-in reversal:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`${API_URL}/invitations/admin/checkins/${checkInId}/revert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reason.trim() })
      });

      if (res.ok) {
        setActionMsg(isAr ? '✓ تم إلغاء الحضور وإعادة الدعوة كنشطة بنجاح!' : '✓ Check-in successfully reverted!');
        // Refresh checkins
        fetch(`${API_URL}/invitations/admin/events/${selectedEventId}/checkins`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(d => { if (Array.isArray(d)) setCheckIns(d); });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to revert check-in.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleForceCheckInDifferentEvent = async (qrToken?: string) => {
    if (!qrToken || !token) return;
    try {
      const res = await fetch(`${API_URL}/invitations/admin/verify-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          qrToken,
          autoAcceptDifferentEvent: true
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'VERIFIED') {
        setScanResult({
          success: true,
          status: 'VERIFIED',
          invitation: data.invitation,
          redeemedAt: data.invitation?.redeemedAt
        });
        if (data.invitation?.eventId) {
          setSelectedEventId(data.invitation.eventId);
        }
      } else {
        alert(data.messageAr || data.error || 'Failed to check in.');
      }
    } catch (e) {
      console.error(e);
      alert(isAr ? 'خطأ في الاتصال بالخادم.' : 'Connection error.');
    }
  };

  const currentEvent = events.find(e => e.id === selectedEventId) || events[0];

  return (
    <div style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Top Controls & Event Selection */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '1.25rem',
        marginBottom: '1.8rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(226, 183, 20, 0.15)',
            color: 'var(--accent-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <QrCode size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              {isAr ? 'نظام الفعاليات والدعوات والتحقق المستمر (QR)' : 'Events, VIP Invitations & Continuous QR Check-in'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {isAr ? 'الفعالية الحالية:' : 'Active Event:'}
              </span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(226, 183, 20, 0.3)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">
                  {isAr ? '🌐 فحص لجميع الفعاليات (Universal Check-in)' : '🌐 All Events (Universal Check-in)'}
                </option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {isAr ? ev.titleAr : ev.titleEn} ({ev.isPublicVisible ? (isAr ? 'ظاهرة للجمهور' : 'Public') : (isAr ? 'مخفية' : 'Hidden')})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Master Navbar Visibility Button: Independent of individual events */}
          <button
            onClick={handleToggleGlobalEventsPublicStatus}
            title={isAr ? 'التحكم في ظهور أو إخفاء صفحة الفعاليات وتبويبها في شريط الموقع' : 'Toggle public visibility of events in navbar'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              border: `1px solid ${isGlobalEventsPublic ? 'rgba(46, 204, 113, 0.5)' : 'rgba(230, 126, 34, 0.5)'}`,
              background: isGlobalEventsPublic ? 'rgba(46, 204, 113, 0.15)' : 'rgba(230, 126, 34, 0.15)',
              color: isGlobalEventsPublic ? '#2ecc71' : '#f39c12',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            {isGlobalEventsPublic ? <Eye size={16} /> : <Lock size={16} />}
            <span>
              {isGlobalEventsPublic
                ? (isAr ? 'صفحة الفعاليات: عامة للجميع ✓ (انقر للتحويل لقناة خاصة)' : 'Events: Public to All ✓ (Click to make Private)')
                : (isAr ? 'صفحة الفعاليات: قناة خاصة للمشرفين فقط 🔒 (انقر لإتاحتها للعامة)' : 'Events: Private Channel (Admins Only) 🔒 (Click to make Public)')
              }
            </span>
          </button>

          <button
            onClick={() => setShowIssueModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              background: 'var(--accent-gold)',
              border: 'none',
              color: '#000000',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.88rem'
            }}
          >
            <PlusCircle size={16} />
            <span>{isAr ? 'إصدار دعوة جديدة (VIP / عادي)' : 'Issue Invitation'}</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(226, 183, 20, 0.12)',
          border: '1px solid var(--accent-gold)',
          color: 'var(--accent-gold)',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '1.5rem'
        }}>
          {actionMsg}
        </div>
      )}

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setActiveTab('ALL_EVENTS'); stopScanner(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'ALL_EVENTS' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'ALL_EVENTS' ? '#000000' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <Calendar size={16} />
          <span>{isAr ? 'متابعة وإدارة الفعاليات (All Events)' : 'Events Overview'}</span>
        </button>

        <button
          onClick={() => { setActiveTab('SCANNER'); stopScanner(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'SCANNER' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'SCANNER' ? '#000000' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <Camera size={16} />
          <span>{isAr ? 'المسح المستمر (Continuous QR Scanner)' : 'Continuous Scanner'}</span>
        </button>

        <button
          onClick={() => { setActiveTab('EVENTS'); stopScanner(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'EVENTS' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'EVENTS' ? '#000000' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <MapPin size={16} />
          <span>{isAr ? 'الأماكن والسعات المستقلة' : 'Locations & Capacity'}</span>
        </button>

        <button
          onClick={() => { setActiveTab('INVITATIONS'); stopScanner(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'INVITATIONS' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'INVITATIONS' ? '#000000' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <Users size={16} />
          <span>{isAr ? 'الدعوات الصادرة' : 'Issued Invitations'}</span>
        </button>

        <button
          onClick={() => { setActiveTab('CHECKINS'); stopScanner(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'CHECKINS' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'CHECKINS' ? '#000000' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{isAr ? 'سجل الحضور والتحقق' : 'Check-in Logs'}</span>
        </button>
      </div>

      {/* TAB 0: ALL EVENTS (Draft / Live Posted / Expired) */}
      {activeTab === 'ALL_EVENTS' && (() => {
        const draftEvents = events.filter(e => !e.isPublicVisible);
        const activeEvents = events.filter(e => e.isPublicVisible && !isEventExpired(e));
        const expiredEvents = events.filter(e => isEventExpired(e));
        const displayedEvents = allEventsFilter === 'DRAFT'
          ? draftEvents
          : allEventsFilter === 'ACTIVE'
          ? activeEvents
          : allEventsFilter === 'EXPIRED'
          ? expiredEvents
          : events;

        return (
          <div>
            {/* Filter Pills and New Event CTA */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setAllEventsFilter('ALL')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: allEventsFilter === 'ALL' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
                    color: allEventsFilter === 'ALL' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {isAr ? `الكل (${events.length})` : `All (${events.length})`}
                </button>
                <button
                  onClick={() => setAllEventsFilter('ACTIVE')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: allEventsFilter === 'ACTIVE' ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255,255,255,0.05)',
                    color: allEventsFilter === 'ACTIVE' ? '#2ecc71' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {isAr ? `منشورة ومتاحة (${activeEvents.length})` : `Live & Posted (${activeEvents.length})`}
                </button>
                <button
                  onClick={() => setAllEventsFilter('DRAFT')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: allEventsFilter === 'DRAFT' ? 'rgba(52, 152, 219, 0.25)' : 'rgba(255,255,255,0.05)',
                    color: allEventsFilter === 'DRAFT' ? '#3498db' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {isAr ? `جديدة لم تُنشر (${draftEvents.length})` : `Draft / Not Public (${draftEvents.length})`}
                </button>
                <button
                  onClick={() => setAllEventsFilter('EXPIRED')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: allEventsFilter === 'EXPIRED' ? 'rgba(231, 76, 60, 0.25)' : 'rgba(255,255,255,0.05)',
                    color: allEventsFilter === 'EXPIRED' ? '#e74c3c' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {isAr ? `منتهية الصلاحية (${expiredEvents.length})` : `Expired (${expiredEvents.length})`}
                </button>
              </div>

              <button
                onClick={() => setShowCreateEventModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'var(--accent-gold)',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                <PlusCircle size={16} />
                <span>{isAr ? 'إنشاء فعالية مخصصة جديدة' : 'Create Custom Event'}</span>
              </button>
            </div>

            {/* Event Cards Grid */}
            {displayedEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <p>{isAr ? 'لا توجد فعاليات في هذا القسم حاليًا.' : 'No events in this section.'}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {displayedEvents.map(ev => {
                  const expired = isEventExpired(ev);
                  const totalCapacity = (ev.locations || []).reduce((acc: number, l: any) => acc + (l.maxCapacity || 0), 0);
                  const totalConfirmed = (ev.locations || []).reduce((acc: number, l: any) => acc + (l.confirmedCount || 0), 0);
                  const registeredPercent = totalCapacity > 0 ? Math.min(100, Math.round((totalConfirmed / totalCapacity) * 100)) : 0;

                  return (
                    <div
                      key={ev.id}
                      style={{
                        background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        position: 'relative'
                      }}
                    >
                      <div>
                        {/* Header Badges */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(226, 183, 20, 0.12)',
                            color: 'var(--accent-gold)'
                          }}>
                            <Calendar size={13} />
                            <span>{new Date(ev.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                            {ev.startTime && <span>• {ev.startTime}</span>}
                          </span>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            {expired ? (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(231, 76, 60, 0.2)',
                                color: '#e74c3c'
                              }}>
                                {isAr ? 'منتهية الصلاحية' : 'Expired'}
                              </span>
                            ) : ev.isPublicVisible ? (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(46, 204, 113, 0.2)',
                                color: '#2ecc71'
                              }}>
                                {isAr ? 'ظاهرة للجمهور ✓' : 'Public'}
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'var(--text-secondary)'
                              }}>
                                {isAr ? 'مسودة مخفية' : 'Draft'}
                              </span>
                            )}

                            {ev.isApplicationActive ? (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(226, 183, 20, 0.2)',
                                color: 'var(--accent-gold)'
                              }}>
                                {isAr ? 'التقديم متاح' : 'Apply Open'}
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: 'var(--text-secondary)'
                              }}>
                                {isAr ? 'التقديم مقفل 🔒' : 'Apply Locked'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
                          {isAr ? ev.titleAr : ev.titleEn}
                        </h4>
                        {ev.descriptionAr && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                            {ev.descriptionAr}
                          </p>
                        )}

                        {/* Live Registration Progress Counter */}
                        <div style={{
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          marginBottom: '1rem',
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {isAr ? 'المشاركون المسجلون (تحديث فوري):' : 'Submitted Attendees (Live):'}
                            </span>
                            <span style={{ fontWeight: 800, color: 'var(--accent-gold)' }}>
                              {totalConfirmed} / {totalCapacity} ({registeredPercent}%)
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${registeredPercent}%`,
                              height: '100%',
                              background: registeredPercent >= 100 ? '#e74c3c' : 'var(--accent-gold)',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>

                        {/* Locations breakdown */}
                        <div style={{ marginBottom: '1.2rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                            {isAr ? 'الأماكن والقاعات المخصصة للفعالية:' : 'Venues & Locations:'}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(ev.locations || []).map((loc: any) => {
                              const isFull = loc.isFull || loc.confirmedCount >= loc.maxCapacity;
                              return (
                                <div
                                  key={loc.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.82rem',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    background: isFull ? 'rgba(231, 76, 60, 0.08)' : 'rgba(255,255,255,0.02)'
                                  }}
                                >
                                  <span style={{ color: '#ffffff', fontWeight: 600 }}>
                                    {isAr ? loc.nameAr : loc.nameEn}
                                  </span>
                                  <span style={{ color: isFull ? '#e74c3c' : '#2ecc71', fontWeight: 700 }}>
                                    {loc.confirmedCount} / {loc.maxCapacity} {isFull ? (isAr ? '(مكتمل)' : '(Full)') : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedEventId(ev.id)}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              background: selectedEventId === ev.id ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)',
                              color: selectedEventId === ev.id ? '#000000' : '#ffffff',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            {selectedEventId === ev.id 
                              ? (isAr ? 'الفعالية المحددة حالياً ✓' : 'Selected Event ✓') 
                              : (isAr ? 'تحديد كفعالية حالية' : 'Select Event')}
                          </button>

                          <button
                            onClick={() => handleToggleApply(ev)}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              background: ev.isApplicationActive ? 'rgba(226, 183, 20, 0.25)' : 'rgba(255,255,255,0.08)',
                              color: ev.isApplicationActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            {ev.isApplicationActive 
                              ? (isAr ? 'زر التقديم مفعل ومتاح ✓' : 'Apply Active ✓') 
                              : (isAr ? 'قفل / تعطيل زر التقديم' : 'Lock Apply')}
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(ev)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(226, 183, 20, 0.4)',
                              background: 'rgba(226, 183, 20, 0.12)',
                              color: 'var(--accent-gold)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={isAr ? 'تعديل بيانات الفعالية والقواعد والسعات' : 'Edit Event'}
                          >
                            <Edit3 size={13} />
                            <span>{isAr ? 'تعديل' : 'Edit'}</span>
                          </button>

                          <button
                            onClick={() => {
                              setCancellingEventTarget(ev);
                              setCancelEventPasscode('');
                              setCancelEventReason('');
                              setCancelEventVerification('');
                              setCancelEventFeedback(null);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(231, 76, 60, 0.35)',
                              background: 'rgba(231, 76, 60, 0.1)',
                              color: '#ff7675',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={isAr ? 'إلغاء الفعالية بالكامل رسمياً وإرسال اعتذار للمشاركين' : 'Cancel entire event'}
                          >
                            <span>{isAr ? 'إلغاء الفعالية' : 'Cancel'}</span>
                          </button>

                          {isSuperAdminOrDev && (
                            <button
                              onClick={() => handleRevealPasscode(ev.id)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(226, 183, 20, 0.3)',
                                background: 'rgba(0,0,0,0.3)',
                                color: 'var(--accent-gold)',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title={isAr ? 'عرض كود الإلغاء السري (SuperAdmin فقط)' : 'View Secret Passcode'}
                            >
                              <Key size={12} />
                              <span>{isAr ? 'الكود السري' : 'Passcode'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteEvent(ev.id, isAr ? ev.titleAr : ev.titleEn)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(231, 76, 60, 0.4)',
                              background: 'rgba(231, 76, 60, 0.12)',
                              color: '#e74c3c',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={isAr ? 'حذف هذه الفعالية نهائياً' : 'Delete event permanently'}
                          >
                            <Trash2 size={13} />
                            <span>{isAr ? 'حذف' : 'Delete'}</span>
                          </button>
                        </div>

                        {/* Expired Event Renewal CTA */}
                        {expired && (
                          <button
                            onClick={() => handleOpenRenewModal(ev)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '9px',
                              borderRadius: '6px',
                              background: 'var(--accent-gold)',
                              border: 'none',
                              color: '#000000',
                              fontWeight: 800,
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            <Repeat size={15} />
                            <span>{isAr ? 'تجديد الفعالية وتحديد سعات ومواعيد جديدة ↻' : 'Renew Event with New Capacities ↻'}</span>
                          </button>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <button
                            onClick={() => { setSelectedEventId(ev.id); setActiveTab('EVENTS'); }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-gold)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            {isAr ? '← إدارة أماكن وسعات هذه الفعالية' : 'Manage venues & caps →'}
                          </button>
                          
                          <button
                            onClick={() => { setSelectedEventId(ev.id); setActiveTab('SCANNER'); }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ffffff',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            {isAr ? 'مسح تذاكر الفعالية' : 'Scan passes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 1: CONTINUOUS QR SCANNER */}
      {activeTab === 'SCANNER' && (
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
          <div style={{
            background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
              {isAr ? 'كاميرا التحقق الفوري المستمر' : 'Continuous Live Gate Scanner'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.2rem 0' }}>
              {isAr
                ? 'تبقى الكاميرا مفتوحة باستمرار بين الزوار. عند مسح أي رمز يتم تجميد الإطار وإجراء التحقق الأحادي ثم المتابعة.'
                : 'Camera remains active continuously between guests. Frames pause upon scan for atomic one-use redemption.'}
            </p>

            {/* Camera Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1.2rem' }}>
              {!isScanning ? (
                <button
                  onClick={startScanner}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  <Camera size={18} />
                  <span>{isAr ? 'تشغيل الكاميرا والبدء' : 'Open Camera & Start'}</span>
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: '#e74c3c',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  <XCircle size={18} />
                  <span>{isAr ? 'إيقاف الكاميرا' : 'Stop Camera'}</span>
                </button>
              )}
            </div>

            {cameraError && (
              <div style={{ padding: '10px', background: 'rgba(231, 76, 60, 0.15)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '1rem' }}>
                {cameraError}
              </div>
            )}

            {/* Camera Viewport Canvas */}
            <div 
              id="qr-reader-container" 
              style={{ 
                width: '100%', 
                maxWidth: '400px', 
                minHeight: '260px', 
                margin: '0 auto 1.2rem auto', 
                borderRadius: '12px', 
                overflow: 'hidden',
                background: '#000000',
                border: '2px solid rgba(226, 183, 20, 0.4)'
              }}
            />

            {/* Result Feedback Banner */}
            {scanResult && (() => {
              const isVipScan = scanResult.invitation?.isVip || scanResult.invitation?.type === 'VIP';
              return (
                <div style={{
                  borderRadius: '16px',
                  padding: '1.5rem',
                  margin: '1.25rem 0',
                  background: isVipScan 
                    ? 'linear-gradient(145deg, rgba(30, 25, 12, 0.95) 0%, rgba(18, 16, 10, 0.95) 100%)'
                    : (scanResult.status === 'VERIFIED'
                    ? 'rgba(46, 204, 113, 0.15)'
                    : scanResult.status === 'ALREADY_USED'
                    ? 'rgba(230, 126, 34, 0.2)'
                    : scanResult.status === 'WRONG_EVENT'
                    ? 'rgba(243, 156, 18, 0.2)'
                    : 'rgba(231, 76, 60, 0.2)'),
                  border: isVipScan 
                    ? '2.5px solid var(--accent-gold)' 
                    : `2px solid ${
                    scanResult.status === 'VERIFIED'
                      ? '#2ecc71'
                      : scanResult.status === 'ALREADY_USED'
                      ? '#e67e22'
                      : scanResult.status === 'WRONG_EVENT'
                      ? '#f39c12'
                      : '#e74c3c'
                  }`,
                  boxShadow: isVipScan 
                    ? '0 0 30px rgba(226, 183, 20, 0.4), inset 0 0 20px rgba(226, 183, 20, 0.12)' 
                    : 'none',
                  position: 'relative'
                }}>
                  {/* VIP USER Radiant Gold Banner */}
                  {isVipScan && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '8px 24px',
                      borderRadius: '24px',
                      background: 'linear-gradient(135deg, rgba(226, 183, 20, 0.28) 0%, rgba(226, 183, 20, 0.08) 100%)',
                      border: '2px solid var(--accent-gold)',
                      boxShadow: '0 0 16px rgba(226, 183, 20, 0.4)',
                      margin: '0 auto 14px auto',
                      width: 'fit-content'
                    }}>
                      <Crown size={22} style={{ color: 'var(--accent-gold)' }} />
                      <span style={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: 'var(--accent-gold)',
                        letterSpacing: '2px',
                        textShadow: '0 0 12px rgba(226, 183, 20, 0.7)'
                      }}>
                        VIP USER
                      </span>
                      <Crown size={22} style={{ color: 'var(--accent-gold)' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                    {scanResult.status === 'VERIFIED' && (
                      <>
                        <CheckCircle2 size={24} style={{ color: '#2ecc71' }} />
                        <strong style={{ fontSize: '1.2rem', color: '#2ecc71' }}>{isAr ? 'تم التحقق بنجاح ✓ (VERIFIED)' : 'VERIFIED ✓'}</strong>
                      </>
                    )}
                    {scanResult.status === 'ALREADY_USED' && (
                      <>
                        <AlertTriangle size={24} style={{ color: '#e67e22' }} />
                        <strong style={{ fontSize: '1.2rem', color: '#e67e22' }}>{isAr ? 'مستخدمة سابقاً ! (ALREADY USED)' : 'ALREADY USED !'}</strong>
                      </>
                    )}
                    {scanResult.status === 'WRONG_EVENT' && (
                      <>
                        <AlertTriangle size={24} style={{ color: '#f39c12' }} />
                        <strong style={{ fontSize: '1.2rem', color: '#f39c12' }}>
                          {isAr ? 'تنبيه: دعوة لفعالية أخرى ⚠️' : 'Notice: Different Event ⚠️'}
                        </strong>
                      </>
                    )}
                    {scanResult.status !== 'VERIFIED' && scanResult.status !== 'ALREADY_USED' && scanResult.status !== 'WRONG_EVENT' && (
                      <>
                        <XCircle size={24} style={{ color: '#e74c3c' }} />
                        <strong style={{ fontSize: '1.2rem', color: '#e74c3c' }}>{isAr ? 'رمز غير صالح ✗ (INVALID)' : 'INVALID ✗'}</strong>
                      </>
                    )}
                  </div>

                  {scanResult.invitation && (
                    <div style={{ fontSize: '0.95rem', color: '#ffffff', margin: '8px 0' }}>
                      <div>
                        {isAr ? 'حامل الدعوة:' : 'Guest:'} <strong style={{ color: isVipScan ? 'var(--accent-gold)' : '#ffffff' }}>{scanResult.invitation.recipientName || scanResult.invitation.recipientEmail}</strong>
                      </div>
                      {isVipScan && (
                        <span style={{
                          display: 'inline-block',
                          marginTop: '6px',
                          padding: '3px 12px',
                          borderRadius: '8px',
                          background: 'var(--accent-gold)',
                          color: '#000000',
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          boxShadow: '0 2px 8px rgba(226, 183, 20, 0.4)'
                        }}>
                          ⭐ VIP OFFICIAL INVITATION
                        </span>
                      )}
                      {scanResult.status === 'WRONG_EVENT' && (
                        <div style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(243, 156, 18, 0.2)',
                          border: '1px solid rgba(243, 156, 18, 0.4)',
                          color: '#ffffff',
                          fontSize: '0.88rem'
                        }}>
                          {isAr ? 'الفعالية المسجل لها:' : 'Registered Event:'}{' '}
                          <strong style={{ color: '#f39c12' }}>
                            {scanResult.invitation.eventTitleAr || scanResult.invitation.event?.titleAr || (isAr ? 'فعالية أخرى' : 'Other Event')}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}

                  {scanResult.error && (
                    <p style={{
                      margin: '8px 0',
                      fontSize: '0.88rem',
                      color: scanResult.status === 'WRONG_EVENT' ? '#f39c12' : '#e74c3c',
                      fontWeight: 600
                    }}>
                      {scanResult.error}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                    {scanResult.status === 'WRONG_EVENT' && (
                      <button
                        onClick={() => handleForceCheckInDifferentEvent(scanResult.qrToken)}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          background: 'var(--accent-gold)',
                          color: '#000000',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.88rem'
                        }}
                      >
                        {isAr ? '✓ اعتماد الحضور وتأكيد الدخول الآن' : '✓ Check-in for this event'}
                      </button>
                    )}
                    <button
                      onClick={resumeScan}
                      style={{
                        padding: '8px 22px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      {isAr ? 'متابعة المسح التالي (Next)' : 'Scan Next Code'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 2: EVENTS & CAPACITY MANAGEMENT */}
      {activeTab === 'EVENTS' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                {isAr ? 'إدارة الفعاليات والأماكن والسعات وقواعد التقديم' : 'Events, Locations & Eligibility Rules'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                {isAr 
                  ? 'أنشئ فعاليات مستقلة، حدد أماكن وسعات كل كنيسة أو قاعة، وتحكم بإظهار صفحة الفعالية وتفعيل زر التقديم.'
                  : 'Create custom events, configure capacity per venue, and toggle public visibility and application windows.'}
              </p>
            </div>

            <button
              onClick={() => setShowCreateEventModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'var(--accent-gold)',
                border: 'none',
                color: '#000000',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(226, 183, 20, 0.3)'
              }}
            >
              <PlusCircle size={17} />
              <span>{isAr ? 'إنشاء فعالية جديدة' : 'Create New Event'}</span>
            </button>
          </div>

          {/* Active Event Controls Card */}
          {(() => {
            const currentEvent = events.find(e => e.id === selectedEventId) || events[0];
            if (!currentEvent) {
              return (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <p>{isAr ? 'لا توجد فعاليات مسجلة. اضغط على زر "إنشاء فعالية جديدة" لإضافة فعالية.' : 'No events found. Click "Create New Event" to get started.'}</p>
                </div>
              );
            }

            let rules: any = {};
            try { rules = JSON.parse(currentEvent.eligibilityRulesJson || '{}'); } catch {}

            return (
              <div style={{
                background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.2rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--accent-gold)' }}>
                      {currentEvent.titleAr}
                    </h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      📅 {new Date(currentEvent.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')} {currentEvent.startTime ? `• ${currentEvent.startTime}` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Toggle Apply Button Active */}
                    <button
                      onClick={() => handleToggleApplicationActive(currentEvent.id, currentEvent.isApplicationActive)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: currentEvent.isApplicationActive ? 'rgba(226, 183, 20, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                        color: currentEvent.isApplicationActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      {currentEvent.isApplicationActive 
                        ? (isAr ? 'زر التقديم مفعل ومتاح ✓' : 'Apply Button Active ✓') 
                        : (isAr ? 'زر التقديم مقفل برمادي (لم يفتح بعد) 🔒' : 'Apply Button Locked 🔒')}
                    </button>

                    {/* Edit Event Button */}
                    <button
                      onClick={() => handleOpenEditModal(currentEvent)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(226, 183, 20, 0.4)',
                        background: 'rgba(226, 183, 20, 0.15)',
                        color: 'var(--accent-gold)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title={isAr ? 'تعديل بيانات الفعالية والقواعد والسعات' : 'Edit Event'}
                    >
                      <Edit3 size={15} />
                      <span>{isAr ? 'تعديل الفعالية' : 'Edit Event'}</span>
                    </button>

                    {/* Add Location */}
                    <button
                      onClick={() => handleAddLocationPrompt(currentEvent.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'transparent',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      + {isAr ? 'إضافة قاعة/مقر' : 'Add Venue'}
                    </button>

                    {/* Cancel Event Button */}
                    <button
                      onClick={() => {
                        setCancellingEventTarget(currentEvent);
                        setCancelEventPasscode('');
                        setCancelEventReason('');
                        setCancelEventVerification('');
                        setCancelEventFeedback(null);
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(231, 76, 60, 0.4)',
                        background: 'rgba(231, 76, 60, 0.12)',
                        color: '#ff7675',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title={isAr ? 'إلغاء الفعالية بالكامل رسمياً وإرسال اعتذار لجميع المسجلين' : 'Cancel entire event'}
                    >
                      <AlertTriangle size={15} />
                      <span>{isAr ? 'إلغاء الفعالية' : 'Cancel Event'}</span>
                    </button>

                    {/* Passcode for SuperAdmin/Dev */}
                    {isSuperAdminOrDev && (
                      <button
                        onClick={() => handleRevealPasscode(currentEvent.id)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(226, 183, 20, 0.4)',
                          background: 'rgba(0,0,0,0.4)',
                          color: 'var(--accent-gold)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title={isAr ? 'عرض كود الإلغاء السري (SuperAdmin فقط)' : 'View Passcode'}
                      >
                        <Key size={14} />
                        <span>{isAr ? 'كود الإلغاء السري' : 'Passcode'}</span>
                      </button>
                    )}

                    {/* Delete Event Button */}
                    <button
                      onClick={() => handleDeleteEvent(currentEvent.id, isAr ? currentEvent.titleAr : currentEvent.titleEn)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(231, 76, 60, 0.3)',
                        background: 'transparent',
                        color: '#e74c3c',
                        cursor: 'pointer',
                        fontSize: '0.82rem'
                      }}
                      title={isAr ? 'حذف الفعالية نهائياً' : 'Delete permanently'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Locations Grid for Current Event */}
                <h5 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 1rem 0' }}>
                  {isAr ? 'الأماكن والقاعات المخصصة لهذه الفعالية والسعات:' : 'Event Venues & Capacities:'}
                </h5>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {currentEvent.locations?.map((loc: any) => {
                    const isFull = loc.isFull || loc.confirmedCount >= loc.maxCapacity;
                    return (
                      <div
                        key={loc.id}
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: `1px solid ${isFull ? '#e74c3c' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '12px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                              {loc.nameAr}
                            </h4>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: isFull ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)',
                              color: isFull ? '#e74c3c' : '#2ecc71'
                            }}>
                              {isFull ? (isAr ? 'مكتمل العدد (FULL)' : 'FULL') : (isAr ? 'متاح للتسجيل' : 'OPEN')}
                            </span>
                          </div>

                          {/* Capacity Progress Bar */}
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'المقاعد المؤكدة:' : 'Confirmed Allocation:'}</span>
                              <strong style={{ color: 'var(--accent-gold)' }}>{loc.confirmedCount} / {loc.maxCapacity}</strong>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min(100, (loc.confirmedCount / (loc.maxCapacity || 1)) * 100)}%`,
                                background: isFull ? '#e74c3c' : 'var(--accent-gold)',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        </div>

                        {/* Reopen / Expand Capacity Action */}
                        <button
                          onClick={() => {
                            setReopenLocation({ ...loc, confirmedCount: loc.confirmedCount });
                            setNewCapacity(loc.maxCapacity + 20);
                            setReopenReason('');
                          }}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            background: isFull ? 'rgba(226, 183, 20, 0.25)' : 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--accent-gold)',
                            color: 'var(--accent-gold)',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          {isFull 
                            ? (isAr ? 'إعادة فتح المكان وتوسيع السعة' : 'Reopen Full Venue') 
                            : (isAr ? 'تعديل السعة المقررة' : 'Adjust Capacity')}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Attendees and Registered Users Section */}
                <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1.2rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} />
                        <span>{isAr ? 'قائمة الحضور والمسجلين بالقاعات (VIP في المقدمة)' : 'Event Attendees & Registrations (VIP on Top)'}</span>
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {isAr 
                          ? 'ترتيب تلقائي: كبار الزوار (VIP) أولاً في القمة بإطار ذهبي ثم الحضور العادي. اضغط على أي شخص لعرض بياناته بالكامل أو إلغاء دعوته.' 
                          : 'Sorted VIP on top, then standard attendees. Click any user to view full profile & membership data or cancel their pass.'}
                      </p>
                    </div>

                    {/* Search and Refresh */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ position: 'relative', width: '240px' }}>
                        <input
                          type="text"
                          placeholder={isAr ? 'بحث بالاسم، الإيميل، الهاتف...' : 'Search attendees...'}
                          value={attendeeSearchQuery}
                          onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            paddingRight: isAr ? '32px' : '12px',
                            paddingLeft: !isAr ? '32px' : '12px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#ffffff',
                            fontSize: '0.82rem',
                            boxSizing: 'border-box'
                          }}
                        />
                        <Search size={14} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isAr ? 'right' : 'left']: '10px', color: 'var(--text-secondary)' }} />
                      </div>
                      <button
                        onClick={() => fetchEventAttendees(currentEvent.id, attendeeLocationFilter)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8rem'
                        }}
                        title={isAr ? 'تحديث القائمة' : 'Refresh'}
                      >
                        <RefreshCw size={14} className={isLoadingAttendees ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Location Filter Tabs for Attendees */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                    <button
                      onClick={() => { setAttendeeLocationFilter('ALL'); fetchEventAttendees(currentEvent.id, 'ALL'); }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: attendeeLocationFilter === 'ALL' ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)',
                        background: attendeeLocationFilter === 'ALL' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.04)',
                        color: attendeeLocationFilter === 'ALL' ? '#000000' : 'var(--text-secondary)'
                      }}
                    >
                      {isAr ? 'جميع الأماكن والقاعات' : 'All Venues'} ({eventAttendees.length})
                    </button>
                    {currentEvent.locations?.map((loc: any) => {
                      const count = eventAttendees.filter(a => a.locationId === loc.id).length;
                      const isSelected = attendeeLocationFilter === loc.id;
                      return (
                        <button
                          key={loc.id}
                          onClick={() => { setAttendeeLocationFilter(loc.id); fetchEventAttendees(currentEvent.id, loc.id); }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)',
                            background: isSelected ? 'var(--accent-gold)' : 'rgba(255,255,255,0.04)',
                            color: isSelected ? '#000000' : 'var(--text-secondary)'
                          }}
                        >
                          {loc.nameAr} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Attendees Grid / List */}
                  {isLoadingAttendees ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block', color: 'var(--accent-gold)' }} />
                      <span>{isAr ? 'جاري تحميل قائمة المسجلين والحضور...' : 'Loading attendees...'}</span>
                    </div>
                  ) : (() => {
                    const filteredAttendees = [...eventAttendees]
                      .filter((att: any) => {
                        if (attendeeLocationFilter !== 'ALL' && att.locationId !== attendeeLocationFilter) {
                          return false;
                        }
                        if (!attendeeSearchQuery.trim()) return true;
                        const q = attendeeSearchQuery.toLowerCase().trim();
                        const name = (att.recipientName || att.user?.name || '').toLowerCase();
                        const email = (att.recipientEmail || att.user?.email || '').toLowerCase();
                        const phone = (att.recipientPhone || att.user?.phone || '').toLowerCase();
                        const locAr = (att.location?.nameAr || '').toLowerCase();
                        return name.includes(q) || email.includes(q) || phone.includes(q) || locAr.includes(q);
                      })
                      .sort((a: any, b: any) => {
                        const aVip = a.isVip || a.type === 'VIP' ? 1 : 0;
                        const bVip = b.isVip || b.type === 'VIP' ? 1 : 0;
                        if (aVip !== bVip) return bVip - aVip;
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      });

                    if (filteredAttendees.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '2.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            {isAr ? 'لا يوجد حضور أو مسجلين مطابقين في هذا المكان حالياً.' : 'No attendees found for this selection.'}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                        {filteredAttendees.map((att: any) => {
                          const isAttVip = att.isVip || att.type === 'VIP';
                          const isCancelled = att.status === 'CANCELLED';
                          const name = att.recipientName || att.user?.name || (isAr ? 'مشارك غير محدد' : 'Unnamed Attendee');
                          const email = att.recipientEmail || att.user?.email || '—';
                          const phone = att.recipientPhone || att.user?.phone || '—';
                          const locName = att.location?.nameAr || '—';
                          const hasMembership = att.user?.isVerified || att.user?.familyProfile?.status === 'APPROVED';

                          return (
                            <div
                              key={att.id}
                              style={{
                                background: isCancelled
                                  ? 'linear-gradient(135deg, rgba(231, 76, 60, 0.12) 0%, rgba(20, 10, 10, 0.85) 100%)'
                                  : isAttVip 
                                    ? 'linear-gradient(135deg, rgba(226, 183, 20, 0.12) 0%, rgba(25, 20, 8, 0.9) 100%)' 
                                    : 'rgba(0,0,0,0.35)',
                                border: isCancelled 
                                  ? '1.5px solid rgba(231, 76, 60, 0.5)' 
                                  : isAttVip 
                                    ? '1.5px solid var(--accent-gold)' 
                                    : '1px solid rgba(255,255,255,0.09)',
                                borderRadius: '12px',
                                padding: '14px',
                                boxShadow: isAttVip && !isCancelled ? '0 4px 18px rgba(226, 183, 20, 0.15)' : 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '12px',
                                position: 'relative'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isAttVip ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        background: 'rgba(226, 183, 20, 0.25)',
                                        border: '1px solid var(--accent-gold)',
                                        color: 'var(--accent-gold)',
                                        fontSize: '0.72rem',
                                        fontWeight: 800
                                      }}>
                                        <Crown size={12} />
                                        <span>VIP</span>
                                      </span>
                                    ) : (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.72rem',
                                        fontWeight: 700
                                      }}>
                                        {isAr ? 'عادي' : 'Standard'}
                                      </span>
                                    )}

                                    {hasMembership && (
                                      <span style={{
                                        padding: '3px 7px',
                                        borderRadius: '6px',
                                        background: 'rgba(46, 204, 113, 0.15)',
                                        color: '#2ecc71',
                                        fontSize: '0.7rem',
                                        fontWeight: 700
                                      }}>
                                        {isAr ? 'عضوية معتمدة ✓' : 'Member ✓'}
                                      </span>
                                    )}
                                  </div>

                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: isCancelled 
                                      ? 'rgba(231, 76, 60, 0.2)' 
                                      : att.status === 'REDEEMED' 
                                        ? 'rgba(46, 204, 113, 0.2)' 
                                        : 'rgba(52, 152, 219, 0.2)',
                                    color: isCancelled 
                                      ? '#ff7675' 
                                      : att.status === 'REDEEMED' 
                                        ? '#2ecc71' 
                                        : '#74b9ff'
                                  }}>
                                    {isCancelled ? (isAr ? 'ملغاة' : 'Cancelled') : att.status === 'REDEEMED' ? (isAr ? 'حضر بالفعل ✓' : 'Redeemed') : (isAr ? 'نشطة وصالحة' : 'Active')}
                                  </span>
                                </div>

                                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 4px', color: '#ffffff' }}>
                                  {name}
                                </h4>

                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Phone size={12} style={{ color: 'var(--accent-gold)' }} />
                                    <span>{phone}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Mail size={12} style={{ color: 'var(--accent-gold)' }} />
                                    <span style={{ wordBreak: 'break-all' }}>{email}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MapPin size={12} style={{ color: 'var(--accent-gold)' }} />
                                    <span style={{ color: '#ffffff' }}>{locName}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedAttendeeProfile(att)}
                                  style={{
                                    flex: 1,
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    color: '#ffffff',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Eye size={13} />
                                  <span>{isAr ? 'عرض البيانات والعضوية' : 'Full Data & Membership'}</span>
                                </button>

                                {!isCancelled && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCancelAttendee(att)}
                                    style={{
                                      padding: '7px 10px',
                                      borderRadius: '6px',
                                      background: 'rgba(231, 76, 60, 0.12)',
                                      border: '1px solid rgba(231, 76, 60, 0.35)',
                                      color: '#ff7675',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title={isAr ? 'إلغاء دعوة هذا الحاضر واسترجاع المقعد' : 'Cancel invite'}
                                  >
                                    <Trash2 size={13} />
                                    <span>{isAr ? 'إلغاء الدعوة' : 'Cancel'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: ISSUED INVITATIONS */}
      {activeTab === 'INVITATIONS' && (
        <div>
          {/* Header & Smart Search Bar */}
          <div style={{
            background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '1rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  {isAr ? 'قائمة الدعوات الرسمية الصادرة للفعالية' : 'Issued Invitations for this Event'}
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {isAr 
                    ? `إجمالي الدعوات: ${invitations.length} دعوة ${invSearchQuery || invFilterType !== 'ALL' ? `(المطابق للبحث: ${
                        invitations.filter((inv: any) => {
                          if (invFilterType === 'VIP' && !inv.isVip && inv.type !== 'VIP') return false;
                          if (invFilterType === 'STANDARD' && (inv.isVip || inv.type === 'VIP')) return false;
                          if (invFilterType === 'ACTIVE' && inv.status !== 'ACTIVE') return false;
                          if (invFilterType === 'REDEEMED' && inv.status !== 'REDEEMED') return false;
                          if (!invSearchQuery.trim()) return true;
                          const q = invSearchQuery.toLowerCase().trim();
                          const name = (inv.recipientName || '').toLowerCase();
                          const email = (inv.recipientEmail || '').toLowerCase();
                          const phone = (inv.recipientPhone || inv.user?.phone || '').toLowerCase();
                          const qr = (inv.qrToken || '').toLowerCase();
                          const locAr = (inv.location?.nameAr || '').toLowerCase();
                          const locEn = (inv.location?.nameEn || '').toLowerCase();
                          const status = (inv.status || '').toLowerCase();
                          return name.includes(q) || email.includes(q) || phone.includes(q) || qr.includes(q) || locAr.includes(q) || locEn.includes(q) || status.includes(q);
                        }).length
                      })` : ''}`
                    : `Total: ${invitations.length} invitations`}
                </span>
              </div>

              {/* Quick Filter Badges */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', labelAr: 'الكل', labelEn: 'All' },
                  { id: 'VIP', labelAr: '⭐ VIP', labelEn: '⭐ VIP' },
                  { id: 'STANDARD', labelAr: 'عادية', labelEn: 'Standard' },
                  { id: 'ACTIVE', labelAr: 'صالحة للدخول', labelEn: 'Active' },
                  { id: 'REDEEMED', labelAr: 'تم الحضور ✓', labelEn: 'Checked In' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setInvFilterType(f.id as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: invFilterType === f.id ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)',
                      background: invFilterType === f.id ? 'rgba(226, 183, 20, 0.15)' : 'rgba(255,255,255,0.04)',
                      color: invFilterType === f.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isAr ? f.labelAr : f.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Search Input Field */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                [isAr ? 'right' : 'left']: '14px',
                transform: 'translateY(-50%)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none'
              }}>
                <Search size={18} />
              </div>
              <input
                type="text"
                value={invSearchQuery}
                onChange={e => setInvSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث فوري بالاسم، البريد الإلكتروني، رقم الهاتف، المكان، أو كود الدعوة QR...' : 'Search by name, email, phone, location, or QR token...'}
                style={{
                  width: '100%',
                  padding: isAr ? '12px 44px 12px 42px' : '12px 42px 12px 44px',
                  borderRadius: '10px',
                  border: '1px solid rgba(226, 183, 20, 0.35)',
                  background: 'rgba(0, 0, 0, 0.35)',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                  transition: 'border-color 0.2s'
                }}
              />
              {invSearchQuery && (
                <button
                  onClick={() => setInvSearchQuery('')}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    [isAr ? 'left' : 'right']: '12px',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                  title={isAr ? 'مسح البحث' : 'Clear Search'}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filtered Invitations List */}
          {(() => {
            const filtered = invitations.filter((inv: any) => {
              if (invFilterType === 'VIP' && !inv.isVip && inv.type !== 'VIP') return false;
              if (invFilterType === 'STANDARD' && (inv.isVip || inv.type === 'VIP')) return false;
              if (invFilterType === 'ACTIVE' && inv.status !== 'ACTIVE') return false;
              if (invFilterType === 'REDEEMED' && inv.status !== 'REDEEMED') return false;
              if (!invSearchQuery.trim()) return true;
              const q = invSearchQuery.toLowerCase().trim();
              const name = (inv.recipientName || '').toLowerCase();
              const email = (inv.recipientEmail || '').toLowerCase();
              const phone = (inv.recipientPhone || inv.user?.phone || '').toLowerCase();
              const qr = (inv.qrToken || '').toLowerCase();
              const locAr = (inv.location?.nameAr || '').toLowerCase();
              const locEn = (inv.location?.nameEn || '').toLowerCase();
              const status = (inv.status || '').toLowerCase();
              return name.includes(q) || email.includes(q) || phone.includes(q) || qr.includes(q) || locAr.includes(q) || locEn.includes(q) || status.includes(q);
            });

            if (filtered.length === 0) {
              return (
                <div style={{
                  textAlign: 'center',
                  padding: '3.5rem 1.5rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '16px',
                  border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                  <Search size={36} style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem', opacity: 0.5 }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '1rem' }}>
                    {invSearchQuery 
                      ? (isAr ? `لا توجد نتائج مطابقة لبحثك عن "${invSearchQuery}".` : `No results matching "${invSearchQuery}".`)
                      : (isAr ? 'لا توجد دعوات في هذا التصنيف.' : 'No invitations found in this category.')}
                  </p>
                  {(invSearchQuery || invFilterType !== 'ALL') && (
                    <button
                      onClick={() => { setInvSearchQuery(''); setInvFilterType('ALL'); }}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        background: 'rgba(226, 183, 20, 0.15)',
                        border: '1px solid var(--accent-gold)',
                        color: 'var(--accent-gold)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {isAr ? 'إعادة ضبط البحث وعرض الكل' : 'Reset Search & View All'}
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {filtered.map(inv => (
                  <div
                    key={inv.id}
                    style={{
                      background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                      border: `1px solid ${inv.isVip || inv.type === 'VIP' ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                      borderRadius: '12px',
                      padding: '1.2rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>
                          {inv.recipientName || inv.recipientEmail}
                        </strong>
                        {(inv.isVip || inv.type === 'VIP') && (
                          <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--accent-gold)', color: '#000000', fontWeight: 900 }}>
                            VIP
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: inv.status === 'REDEEMED' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255,255,255,0.06)',
                          color: inv.status === 'REDEEMED' ? '#2ecc71' : 'var(--text-secondary)',
                          border: inv.status === 'REDEEMED' ? '1px solid #2ecc71' : 'none',
                          fontWeight: 700
                        }}>
                          {inv.status === 'REDEEMED' ? (isAr ? 'تم الحضور ✓' : 'Checked In') : (isAr ? 'صالحة' : 'Active')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>📍 {inv.location?.nameAr || inv.location?.nameEn || (isAr ? 'المقر' : 'Venue')}</span>
                        {inv.qrToken && (
                          <span style={{ margin: '0 6px', opacity: 0.6 }}>• QR: {inv.qrToken.slice(0, 8)}...</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setPreviewInvitation(inv)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Eye size={14} />
                      <span>{isAr ? 'عرض البطاقة' : 'View Pass'}</span>
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 4: CHECK-IN LOGS & REVERSAL */}
      {activeTab === 'CHECKINS' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: '#ffffff' }}>
            {isAr ? 'سجل الحضور والتحقق عبر البوابات' : 'Gate Check-in Logs & Reversals'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {checkIns.map(chk => (
              <div
                key={chk.id}
                style={{
                  background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.92rem', color: '#ffffff' }}>
                      {chk.invitation?.recipientName || chk.invitation?.recipientEmail}
                    </strong>
                    {chk.invitation?.isVip && (
                      <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: 'var(--accent-gold)', color: '#000000', fontWeight: 900 }}>
                        VIP
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {new Date(chk.checkedInAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')} • <span>بوابة: {chk.scannedBy?.fullName || 'Gate Admin'}</span>
                  </div>
                </div>

                {chk.isReverted ? (
                  <span style={{ fontSize: '0.8rem', color: '#e74c3c', fontWeight: 700 }}>
                    {isAr ? 'تم الإلغاء رقابيًا' : 'Reverted'}
                  </span>
                ) : (
                  <button
                    onClick={() => handleRevertCheckIn(chk.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'rgba(231, 76, 60, 0.15)',
                      border: '1px solid #e74c3c',
                      color: '#e74c3c',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Undo2 size={13} />
                    <span>{isAr ? 'إلغاء الحضور المسجل خطأً' : 'Revert Accidental Check-in'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reopen Location Modal */}
      {reopenLocation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#16161d',
            border: '1px solid var(--accent-gold)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
            direction: isAr ? 'rtl' : 'ltr'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#ffffff' }}>
              {isAr ? 'إعادة فتح المكان وزيادة السعة المقررة' : 'Reopen Location with Increased Capacity'}
            </h3>

            <form onSubmit={handleReopenLocation}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? `السعة الجديدة (يجب أن لا تقل عن ${reopenLocation.confirmedCount}) *` : `New Capacity (minimum ${reopenLocation.confirmedCount}) *`}
                </label>
                <input
                  type="number"
                  min={reopenLocation.confirmedCount}
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'سبب زيادة السعة (إلزامي للتدقيق الرقابي) *' : 'Reason for Capacity Increase *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={isAr ? 'مثال: فتح قاعة إضافية، ترتيب مقاعد جديدة...' : 'e.g. Additional chairs placed...'}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setReopenLocation(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={reopening}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 700,
                    cursor: reopening ? 'not-allowed' : 'pointer'
                  }}
                >
                  {reopening ? (isAr ? 'جاري الفتح...' : 'Saving...') : (isAr ? 'تأكيد وإعادة الفتح' : 'Confirm Reopen')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue VIP / Standard Invitation Modal */}
      {showIssueModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#16161d',
            border: '1px solid var(--accent-gold)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '520px',
            width: '100%',
            direction: isAr ? 'rtl' : 'ltr'
          }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 1.2rem 0', color: '#ffffff' }}>
              {isAr ? 'إصدار دعوة رسمية (VIP / عادية)' : 'Issue Official Church Invitation'}
            </h3>

            <form onSubmit={handleIssueInvitation}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'المكان والقاعة المخصصة *' : 'Assigned Location *'}
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    boxSizing: 'border-box'
                  }}
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {isAr ? loc.nameAr : loc.nameEn} ({loc.confirmedCount} / {loc.capacity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Search or External Entry */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'المستلمون للدعوة (يمكنك اختيار أكثر من شخص) *' : 'Recipients (Select multiple members or guests) *'}
                </label>

                {/* Selected Users Chips */}
                {selectedUsersList.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    {selectedUsersList.map(u => (
                      <span
                        key={u.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          background: 'rgba(226, 183, 20, 0.15)',
                          border: '1px solid var(--accent-gold)',
                          color: '#ffffff',
                          fontSize: '0.82rem'
                        }}
                      >
                        <strong>{u.fullName}</strong>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({u.email})</span>
                        <button
                          type="button"
                          onClick={() => setSelectedUsersList(prev => prev.filter(item => item.id !== u.id))}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#e74c3c',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            padding: '0 2px',
                            lineHeight: 1
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    placeholder={isAr ? '🔍 ابحث بالاسم لإضافة أعضاء إلى القائمة...' : '🔍 Search member name to add...'}
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      boxSizing: 'border-box',
                      marginBottom: '8px'
                    }}
                  />

                  {/* Autocomplete */}
                  {recipientResults.length > 0 && (
                    <div style={{
                      background: '#1a1a24',
                      border: '1px solid var(--accent-gold)',
                      borderRadius: '8px',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      marginBottom: '8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
                    }}>
                      {recipientResults.map(r => (
                        <div
                          key={r.id}
                          onClick={() => {
                            if (!selectedUsersList.some(item => item.id === r.id)) {
                              setSelectedUsersList(prev => [...prev, r]);
                            }
                            setRecipientSearch('');
                            setRecipientResults([]);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem' }}>{r.fullName}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.email}</div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>+ {isAr ? 'إضافة' : 'Add'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {isAr ? 'أو إضافة ضيف خارجي (غير مسجل):' : 'Or add external guest:'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder={isAr ? 'اسم الضيف الخارجي' : 'External Guest Name'}
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      style={{
                        padding: '9px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        fontSize: '0.85rem'
                      }}
                    />
                    <input
                      type="email"
                      placeholder={isAr ? 'البريد الإلكتروني' : 'External Email'}
                      value={externalEmail}
                      onChange={(e) => setExternalEmail(e.target.value)}
                      style={{
                        padding: '9px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* VIP Toggle Switch & Options */}
              <div style={{
                background: isVip ? 'rgba(226, 183, 20, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${isVip ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Crown size={22} style={{ color: isVip ? 'var(--accent-gold)' : 'var(--text-secondary)' }} />
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '0.92rem', display: 'block' }}>
                        {isAr ? 'إصدار دعوة كبار الزوار (VIP Invitation)' : 'Issue as VIP Invitation'}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {isAr ? 'تمنح بطاقة ذهبية وتظهر بصفتها VIP عند المسح وفي الحساب الشخصي' : 'Gold-framed VIP pass card and scanned as VIP USER'}
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isVip}
                    onChange={(e) => setIsVip(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                  />
                </div>

                {/* Unlimited VIP & Capacity deduction choice */}
                {isVip && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderRadius: '8px',
                    border: '1px dashed rgba(226, 183, 20, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}>
                        {isAr ? 'خصم المقاعد من السعة الاستيعابية للمكان' : 'Deduct from Venue Capacity'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
                        {deductVipCapacity
                          ? (isAr ? 'سيتم احتساب هذه الدعوات وخصمها من السعة المتبقية للقاعة' : 'Will be counted against venue capacity')
                          : (isAr ? 'دعوات VIP غير محدودة (لا تؤثر على السعة الاستيعابية العامة المتاحة للحجز)' : 'Unlimited VIP passes (does not deduct from public capacity)')}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={deductVipCapacity}
                      onChange={(e) => setDeductVipCapacity(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={issuing}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 700,
                    cursor: issuing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {issuing ? (isAr ? 'جاري الإصدار...' : 'Issuing...') : (isAr ? 'إصدار وإرسال الدعوة' : 'Issue Pass')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card Preview Modal */}
      {previewInvitation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{ maxWidth: '460px', width: '100%', position: 'relative' }}>
            <button
              onClick={() => setPreviewInvitation(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                [isAr ? 'left' : 'right']: '0',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            <VipInvitationCard invitation={previewInvitation} isAr={isAr} />
          </div>
        </div>
      )}

      {/* Create New Event Modal */}
      {showCreateEventModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#16161d',
            border: '1px solid var(--accent-gold)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            direction: isAr ? 'rtl' : 'ltr'
          }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 1.2rem 0', color: '#ffffff' }}>
              {isAr ? 'إنشاء فعالية كنسية جديدة ومستقلة' : 'Create Custom Church Event'}
            </h3>

            <form onSubmit={handleCreateEventSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'اسم الفعالية (بالعربية) *' : 'Event Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: نهضة الشهيد أبي سيفين السنوية' : 'Event Title'}
                  value={newTitleAr}
                  onChange={(e) => setNewTitleAr(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '0.92rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {isAr ? 'تاريخ الفعالية *' : 'Event Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontSize: '0.92rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {isAr ? 'التوقيت' : 'Time'}
                  </label>
                  <input
                    type="text"
                    placeholder="18:00 - 21:00"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontSize: '0.92rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'الوصف والتفاصيل' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={newDescAr}
                  onChange={(e) => setNewDescAr(e.target.value)}
                  placeholder={isAr ? 'اكتب شروط وتعليمات الحضور...' : 'Event description...'}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '0.92rem'
                  }}
                />
              </div>

              {/* Multi-Locations & Capacities */}
              <div style={{ marginBottom: '1.2rem', background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                    {isAr ? 'الأماكن والقاعات والسعات المخصصة:' : 'Venues & Capacities:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewLocationsList([...newLocationsList, { nameAr: 'قاعة إضافية', maxCapacity: 100 }])}
                    style={{ background: 'transparent', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    + {isAr ? 'إضافة مكان آخر' : 'Add Venue'}
                  </button>
                </div>

                {newLocationsList.map((loc, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      placeholder={isAr ? 'اسم القاعة / الكنيسة' : 'Venue Name'}
                      value={loc.nameAr}
                      onChange={(e) => {
                        const updated = [...newLocationsList];
                        updated[idx].nameAr = e.target.value;
                        setNewLocationsList(updated);
                      }}
                      style={{ padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.85rem' }}
                    />
                    <input
                      type="number"
                      placeholder={isAr ? 'السعة' : 'Capacity'}
                      value={loc.maxCapacity}
                      onChange={(e) => {
                        const updated = [...newLocationsList];
                        updated[idx].maxCapacity = parseInt(e.target.value) || 0;
                        setNewLocationsList(updated);
                      }}
                      style={{ padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.85rem' }}
                    />
                    {newLocationsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewLocationsList(newLocationsList.filter((_, i) => i !== idx))}
                        style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0 6px' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#ffffff' }}>
                  <input
                    type="checkbox"
                    checked={newIsPublicVisible}
                    onChange={(e) => setNewIsPublicVisible(e.target.checked)}
                    style={{ accentColor: 'var(--accent-gold)' }}
                  />
                  <span>{isAr ? 'إظهار الفعالية للجمهور' : 'Public Visible'}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#ffffff' }}>
                  <input
                    type="checkbox"
                    checked={newIsApplicationActive}
                    onChange={(e) => setNewIsApplicationActive(e.target.checked)}
                    style={{ accentColor: 'var(--accent-gold)' }}
                  />
                  <span>{isAr ? 'تفعيل زر التقديم فوراً' : 'Activate Apply Button'}</span>
                </label>
              </div>

              {/* Eligibility Rules */}
              <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#ffffff', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={newRequireMember}
                    onChange={(e) => setNewRequireMember(e.target.checked)}
                    style={{ accentColor: 'var(--accent-gold)' }}
                  />
                  <span>{isAr ? 'قصر التقديم على أعضاء الكنيسة المسجلين فقط' : 'Require Verified Church Member'}</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{isAr ? 'الحد الأدنى للسن (اختياري):' : 'Min Age:'}</span>
                  <input
                    type="number"
                    placeholder="18"
                    value={newMinAge}
                    onChange={(e) => setNewMinAge(e.target.value ? parseInt(e.target.value) : '')}
                    style={{ width: '80px', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 800,
                    cursor: isCreatingEvent ? 'wait' : 'pointer'
                  }}
                >
                  {isCreatingEvent ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'إنشاء الفعالية واعتمادها' : 'Create Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Expired Event Modal */}
      {renewingEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#16161d',
            border: '1px solid var(--accent-gold)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            direction: isAr ? 'rtl' : 'ltr'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Repeat size={20} style={{ color: 'var(--accent-gold)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  {isAr ? 'تجديد الفعالية وإعادة فتح التقديم والسعات' : 'Renew Event & Reset Capacities'}
                </h3>
              </div>
              <button
                onClick={() => setRenewingEvent(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {isAr
                ? `تجديد الفعالية "${renewingEvent.titleAr}" بمواعيد جديدة وسعات مخصصة للأماكن، وسيتم تفعيل زر التقديم وإظهارها للجمهور فورًا.`
                : `Renew "${renewingEvent.titleEn || renewingEvent.titleAr}" with updated dates and venues capacity.`}
            </p>

            <form onSubmit={handleSaveRenewal}>
              {/* New Date */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {isAr ? 'التاريخ الجديد للفعالية *' : 'New Event Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={renewDate}
                  onChange={(e) => setRenewDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'وقت البدء' : 'Start Time'}
                  </label>
                  <input
                    type="time"
                    value={renewStartTime}
                    onChange={(e) => setRenewStartTime(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'وقت الانتهاء' : 'End Time'}
                  </label>
                  <input
                    type="time"
                    value={renewEndTime}
                    onChange={(e) => setRenewEndTime(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Venues Capacities Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 700 }}>
                  {isAr ? 'تحديد السعة الجديدة لكل مكان / قاعة:' : 'New Max Capacity per Venue:'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {renewLocationCaps.map((loc, idx) => (
                    <div
                      key={loc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '10px 12px'
                      }}
                    >
                      <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.88rem' }}>
                        {loc.nameAr}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {isAr ? 'السعة القصوى:' : 'Max:'}
                        </span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={loc.maxCapacity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setRenewLocationCaps(prev => prev.map((item, i) => i === idx ? { ...item, maxCapacity: val } : item));
                          }}
                          style={{
                            width: '90px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(226, 183, 20, 0.4)',
                            color: 'var(--accent-gold)',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRenewingEvent(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isRenewing}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 800,
                    cursor: isRenewing ? 'wait' : 'pointer'
                  }}
                >
                  {isRenewing 
                    ? (isAr ? 'جاري التجديد...' : 'Renewing...') 
                    : (isAr ? 'تجديد الفعالية وإطلاقها' : 'Renew Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. EDIT EVENT MODAL */}
      {showEditEventModal && editingEvent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--card-bg, #1a1a1a)',
            border: '1px solid var(--accent-gold)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} />
                <span>{isAr ? 'تعديل بيانات وقواعد وسعات الفعالية' : 'Edit Event & Venues'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditEventModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditEvent}>
              {/* Titles */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 700 }}>
                  {isAr ? 'اسم الفعالية (عربي) *' : 'Event Title (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  value={editTitleAr}
                  onChange={(e) => setEditTitleAr(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {isAr ? 'اسم الفعالية (إنجليزي - اختياري)' : 'Event Title (English)'}
                </label>
                <input
                  type="text"
                  value={editTitleEn}
                  onChange={(e) => setEditTitleEn(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {isAr ? 'وصف الفعالية' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={editDescAr}
                  onChange={(e) => setEditDescAr(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {/* Date & Times */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'تاريخ الفعالية' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'وقت البدء' : 'Start Time'}
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'وقت الانتهاء' : 'End Time'}
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Toggles & Rules */}
              <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px', marginBottom: '1.5rem' }}>
                <h5 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--accent-gold)' }}>
                  {isAr ? 'قواعد الأهلية والتسجيل:' : 'Eligibility Rules & Controls:'}
                </h5>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#ffffff', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editIsPublicVisible}
                      onChange={(e) => setEditIsPublicVisible(e.target.checked)}
                      style={{ accentColor: 'var(--accent-gold)', width: '16px', height: '16px' }}
                    />
                    <span>{isAr ? 'ظاهرة بالصفحة العامة للفعاليات' : 'Publicly Visible'}</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#ffffff', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editIsApplicationActive}
                      onChange={(e) => setEditIsApplicationActive(e.target.checked)}
                      style={{ accentColor: 'var(--accent-gold)', width: '16px', height: '16px' }}
                    />
                    <span>{isAr ? 'زر التقديم مفعل ومتاح للمستخدمين' : 'Application Active'}</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#ffffff', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editRequireMember}
                      onChange={(e) => setEditRequireMember(e.target.checked)}
                      style={{ accentColor: 'var(--accent-gold)', width: '16px', height: '16px' }}
                    />
                    <span>{isAr ? 'يشترط وجود عضوية كنسية معتمدة للتقديم' : 'Require Verified Church Membership'}</span>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {isAr ? 'الحد الأدنى للسن (اختياري):' : 'Min Age (Optional):'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={editMinAge}
                      onChange={(e) => setEditMinAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder={isAr ? 'لا يوجد' : 'None'}
                      style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Locations & Capacities Manager */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 700 }}>
                    {isAr ? 'الأماكن والقاعات المخصصة والسعات:' : 'Venues & Max Capacities:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditLocations(prev => [
                        ...prev,
                        { nameAr: isAr ? `قاعة جديدة ${prev.length + 1}` : `Venue ${prev.length + 1}`, maxCapacity: 100 }
                      ]);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(226, 183, 20, 0.2)',
                      border: '1px solid var(--accent-gold)',
                      color: 'var(--accent-gold)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + {isAr ? 'إضافة قاعة' : 'Add Venue'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {editLocations.map((loc, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '8px 10px'
                      }}
                    >
                      <input
                        type="text"
                        required
                        value={loc.nameAr}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditLocations(prev => prev.map((item, i) => i === idx ? { ...item, nameAr: val } : item));
                        }}
                        placeholder={isAr ? 'اسم القاعة / المكان' : 'Venue name'}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.85rem' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'السعة:' : 'Cap:'}</span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={loc.maxCapacity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditLocations(prev => prev.map((item, i) => i === idx ? { ...item, maxCapacity: val } : item));
                          }}
                          style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(226, 183, 20, 0.3)', color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = loc.id;
                          if (targetId) {
                            setDeletedLocationIds(prev => [...prev, targetId]);
                          }
                          setEditLocations(prev => prev.filter((_, i) => i !== idx));
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: 'rgba(231, 76, 60, 0.15)',
                          border: 'none',
                          color: '#e74c3c',
                          cursor: 'pointer'
                        }}
                        title={isAr ? 'حذف هذا المكان' : 'Remove venue'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditEventModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 800,
                    cursor: isSavingEdit ? 'wait' : 'pointer'
                  }}
                >
                  {isSavingEdit 
                    ? (isAr ? 'جاري الحفظ...' : 'Saving...') 
                    : (isAr ? 'حفظ جميع التعديلات' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ATTENDEE FULL PROFILE & MEMBERSHIP MODAL */}
      {selectedAttendeeProfile && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--card-bg, #1a1a1a)',
            border: selectedAttendeeProfile.isVip || selectedAttendeeProfile.type === 'VIP' ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={22} style={{ color: 'var(--accent-gold)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  {isAr ? 'تفاصيل الحاضر والعضوية الكنسية' : 'Attendee Profile & Membership'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttendeeProfile(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Basic Info */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                  {selectedAttendeeProfile.recipientName || selectedAttendeeProfile.user?.name || (isAr ? 'غير محدد' : 'Unknown')}
                </span>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: (selectedAttendeeProfile.isVip || selectedAttendeeProfile.type === 'VIP') ? 'rgba(226, 183, 20, 0.25)' : 'rgba(255,255,255,0.08)',
                  border: (selectedAttendeeProfile.isVip || selectedAttendeeProfile.type === 'VIP') ? '1px solid var(--accent-gold)' : 'none',
                  color: (selectedAttendeeProfile.isVip || selectedAttendeeProfile.type === 'VIP') ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '0.75rem'
                }}>
                  {(selectedAttendeeProfile.isVip || selectedAttendeeProfile.type === 'VIP') ? '👑 VIP - كبار الزوار' : '🎟️ تذكرة حضور عادية'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>{isAr ? 'البريد الإلكتروني:' : 'Email:'}</span>
                  <strong style={{ color: '#ffffff', wordBreak: 'break-all' }}>{selectedAttendeeProfile.recipientEmail || selectedAttendeeProfile.user?.email || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>{isAr ? 'رقم الهاتف:' : 'Phone:'}</span>
                  <strong style={{ color: '#ffffff' }}>{selectedAttendeeProfile.recipientPhone || selectedAttendeeProfile.user?.phone || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>{isAr ? 'القاعة / المكان المخصص:' : 'Allocated Venue:'}</span>
                  <strong style={{ color: 'var(--accent-gold)' }}>{selectedAttendeeProfile.location?.nameAr || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>{isAr ? 'حالة التذكرة:' : 'Ticket Status:'}</span>
                  <strong style={{ color: selectedAttendeeProfile.status === 'CANCELLED' ? '#ff7675' : selectedAttendeeProfile.status === 'REDEEMED' ? '#2ecc71' : '#74b9ff' }}>
                    {selectedAttendeeProfile.status}
                  </strong>
                </div>
              </div>
            </div>

            {/* Family Membership Section */}
            <div style={{ background: 'rgba(226, 183, 20, 0.05)', border: '1px solid rgba(226, 183, 20, 0.25)', borderRadius: '12px', padding: '14px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} />
                  <span>{isAr ? 'ملف العضوية الكنسية للأسرة' : 'Church Family Membership'}</span>
                </h4>
                {selectedAttendeeProfile.user?.familyProfile ? (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: selectedAttendeeProfile.user.familyProfile.status === 'APPROVED' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(243, 156, 18, 0.2)',
                    color: selectedAttendeeProfile.user.familyProfile.status === 'APPROVED' ? '#2ecc71' : '#f39c12',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {selectedAttendeeProfile.user.familyProfile.status}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'غير مسجل' : 'No Profile'}</span>
                )}
              </div>

              {selectedAttendeeProfile.user?.familyProfile ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>{isAr ? 'رب الأسرة:' : 'Head of Family:'}</span>
                    <strong style={{ color: '#ffffff' }}>{selectedAttendeeProfile.user.familyProfile.fullName || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>{isAr ? 'الرقم القومي:' : 'National ID:'}</span>
                    <strong style={{ color: '#ffffff' }}>{selectedAttendeeProfile.user.familyProfile.nationalId || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>{isAr ? 'المهنة:' : 'Job:'}</span>
                    <strong style={{ color: '#ffffff' }}>{selectedAttendeeProfile.user.familyProfile.job || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>{isAr ? 'أب الاعتراف:' : 'Confession Priest:'}</span>
                    <strong style={{ color: '#ffffff' }}>{selectedAttendeeProfile.user.familyProfile.confessionFather || '—'}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>{isAr ? 'العنوان بالتفصيل:' : 'Address:'}</span>
                    <strong style={{ color: '#ffffff' }}>{selectedAttendeeProfile.user.familyProfile.address || '—'}</strong>
                  </div>
                  {selectedAttendeeProfile.user.familyProfile.wifeName && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>{isAr ? 'اسم الزوجة:' : 'Wife Name:'}</span>
                      <strong style={{ color: '#ffffff' }}>{selectedAttendeeProfile.user.familyProfile.wifeName} {selectedAttendeeProfile.user.familyProfile.wifeJob ? `(${selectedAttendeeProfile.user.familyProfile.wifeJob})` : ''}</strong>
                    </div>
                  )}
                  {selectedAttendeeProfile.user.familyProfile.childrenCount > 0 && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>{isAr ? 'عدد الأبناء:' : 'Children Count:'}</span>
                      <strong style={{ color: '#ffffff' }}>{selectedAttendeeProfile.user.familyProfile.childrenCount}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {isAr ? 'لم يقم هذا المستخدم بربط أو تسجيل استمارة عضوية كنسية عائلية بعد.' : 'User has not registered family church membership profile yet.'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedAttendeeProfile(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>

              {selectedAttendeeProfile.status !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCancelAttendee(selectedAttendeeProfile);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'rgba(231, 76, 60, 0.15)',
                    border: '1px solid rgba(231, 76, 60, 0.4)',
                    color: '#ff7675',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={15} />
                  <span>{isAr ? 'إلغاء دعوة هذا المستخدم' : 'Cancel Invitation'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MULTI-STEP VERIFICATION MODAL TO CANCEL ATTENDEE INVITATION */}
      {cancellingAttendee && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--card-bg, #1a1a1a)',
            border: '2px solid rgba(231, 76, 60, 0.6)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '540px',
            boxShadow: '0 10px 40px rgba(231, 76, 60, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem', color: '#ff7675' }}>
              <ShieldAlert size={28} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {isAr ? 'تأكيد إلغاء دعوة الحاضر (تحقق متعدد الخطوات)' : 'Multi-Step Verification: Cancel Pass'}
              </h3>
            </div>

            {/* Apology Notice Box */}
            <div style={{
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.85rem',
              color: '#ffffff',
              lineHeight: 1.6,
              marginBottom: '1.5rem'
            }}>
              <strong>{isAr ? '⚠️ تنبيه إداري وإجرائي:' : 'Administrative Notice:'}</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                {isAr 
                  ? 'سيتم إبطال تذكرة الحاضر فوراً، وسيصله إيميل رسمي بالاعتذار، كما سيظهر له إشعار في حسابه على الموقع لمدة 24 ساعة. وسيتم استرجاع مقعده إلى سعة الفعالية.' 
                  : 'Pass will be invalidated, an apology email will be sent with your reason, and an alert will be displayed in their account for 24h. The seat will be returned to the venue.'}
              </p>
            </div>

            {/* Recipient Card */}
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '1.2rem', fontSize: '0.85rem' }}>
              <div><strong>{isAr ? 'الحاضر:' : 'Attendee:'}</strong> {cancellingAttendee.recipientName || cancellingAttendee.user?.name}</div>
              <div><strong>{isAr ? 'الإيميل:' : 'Email:'}</strong> {cancellingAttendee.recipientEmail || cancellingAttendee.user?.email}</div>
              <div><strong>{isAr ? 'القاعة:' : 'Venue:'}</strong> {cancellingAttendee.location?.nameAr}</div>
            </div>

            <form onSubmit={handleConfirmCancelAttendee}>
              {/* Step 1: Reason */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700, marginBottom: '6px' }}>
                  {isAr ? '1. سبب إلغاء الدعوة (سيصل للمستخدم في الإيميل) *' : '1. Cancellation Reason (sent to user) *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelAttendeeReason}
                  onChange={(e) => setCancelAttendeeReason(e.target.value)}
                  placeholder={isAr ? 'مثال: نعتذر، تم إلغاء الحجز لظروف تنظيمية خاصة بالمقاعد...' : 'e.g., Apologies, pass cancelled due to seating rearrangements...'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Step 2: Verification Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700, marginBottom: '6px' }}>
                  {isAr ? '2. لتأكيد العملية، يرجى كتابة كلمة "Cancel" أو "إلغاء":' : '2. Type "Cancel" to confirm:'}
                </label>
                <input
                  type="text"
                  required
                  value={cancelAttendeeVerification}
                  onChange={(e) => setCancelAttendeeVerification(e.target.value)}
                  placeholder="Cancel"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(231, 76, 60, 0.4)', color: '#ff7675', fontWeight: 800, fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>

              {cancelAttendeeFeedback && (
                <div style={{ color: '#ff7675', fontSize: '0.82rem', marginBottom: '1rem', fontWeight: 700 }}>
                  ✕ {cancelAttendeeFeedback}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCancellingAttendee(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'تراجع' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={isCancellingAttendee}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: '#e74c3c',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: isCancellingAttendee ? 'wait' : 'pointer'
                  }}
                >
                  {isCancellingAttendee 
                    ? (isAr ? 'جاري الإلغاء والإرسال...' : 'Cancelling...') 
                    : (isAr ? 'تأكيد إلغاء الدعوة' : 'Confirm Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MULTI-STEP VERIFICATION WITH PASSCODE TO CANCEL ENTIRE EVENT */}
      {cancellingEventTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.92)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--card-bg, #1a1a1a)',
            border: '2px solid #e74c3c',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 12px 50px rgba(231, 76, 60, 0.35)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem', color: '#ff7675' }}>
              <AlertTriangle size={32} />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {isAr ? '🚨 إلغاء الفعالية بالكامل رسمياً' : '🚨 Cancel Entire Event'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {cancellingEventTarget.titleAr}
                </span>
              </div>
            </div>

            <div style={{
              background: 'rgba(231, 76, 60, 0.12)',
              border: '1px solid rgba(231, 76, 60, 0.4)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.85rem',
              color: '#ffffff',
              lineHeight: 1.6,
              marginBottom: '1.5rem'
            }}>
              <strong>{isAr ? '⚠️ تحذير فائق الخطورة:' : 'Critical Warning:'}</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                {isAr 
                  ? 'أنت على وشك إلغاء الفعالية بالكامل! سيتم إبطال جميع بطاقات الدخول (QR) لجميع المشاركين وستظهر في حساباتهم بالثيم الملغي والمنتهي، وسيتم إرسال إيميل اعتذار لجميع المسجلين.' 
                  : 'All issued passes will become INVALID and render in expired/cancelled theme. An apology email will be dispatched to all registered attendees.'}
              </p>
            </div>

            <form onSubmit={handleConfirmCancelEvent}>
              {/* Step 1: Secret Passcode */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 800, marginBottom: '6px' }}>
                  {isAr ? '1. كود الإلغاء السري للفعالية (متاح للـ SuperAdmin والمطور فقط) *' : '1. SuperAdmin Event Cancellation Passcode *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={cancelEventPasscode}
                    onChange={(e) => setCancelEventPasscode(e.target.value)}
                    placeholder="EVT-CANCEL-XXXXXX"
                    style={{ width: '100%', padding: '10px 12px', paddingLeft: '36px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', fontWeight: 800, letterSpacing: '1px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                  <Key size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: 'var(--accent-gold)' }} />
                </div>
              </div>

              {/* Step 2: Reason */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700, marginBottom: '6px' }}>
                  {isAr ? '2. سبب إلغاء الفعالية (سيصل في إيميل الاعتذار لجميع المشاركين) *' : '2. Cancellation Reason (emailed to everyone) *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelEventReason}
                  onChange={(e) => setCancelEventReason(e.target.value)}
                  placeholder={isAr ? 'نعتذر بشدة عن إلغاء الفعالية نظراً لظروف طارئة...' : 'We sincerely apologize, the event is cancelled due to unforeseen circumstances...'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Step 3: Type CANCEL */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700, marginBottom: '6px' }}>
                  {isAr ? '3. لتأكيد الإلغاء النهائي، اكتب كلمة "CANCEL" بالإنجليزية:' : '3. Type "CANCEL" to confirm:'}
                </label>
                <input
                  type="text"
                  required
                  value={cancelEventVerification}
                  onChange={(e) => setCancelEventVerification(e.target.value)}
                  placeholder="CANCEL"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(231, 76, 60, 0.4)', color: '#ff7675', fontWeight: 800, fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>

              {cancelEventFeedback && (
                <div style={{ color: '#ff7675', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 700 }}>
                  ✕ {cancelEventFeedback}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCancellingEventTarget(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'تراجع' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={isCancellingEvent}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: '#e74c3c',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: isCancellingEvent ? 'wait' : 'pointer'
                  }}
                >
                  {isCancellingEvent 
                    ? (isAr ? 'جاري إلغاء الفعالية وإرسال الاعتذار...' : 'Cancelling...') 
                    : (isAr ? 'تأكيد إلغاء الفعالية نهائياً' : 'Cancel Event Officially')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. REVEALED PASSCODE MODAL FOR SUPERADMIN/DEV */}
      {revealedPasscode && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--card-bg, #1a1a1a)',
            border: '2px solid var(--accent-gold)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 10px 40px rgba(226, 183, 20, 0.25)',
            textAlign: 'center'
          }}>
            <Key size={36} style={{ color: 'var(--accent-gold)', margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px', color: '#ffffff' }}>
              {isAr ? 'كود الإلغاء السري للفعالية' : 'Event Cancellation Passcode'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {isAr 
                ? 'هذا الكود سري للغاية وخاص بهذه الفعالية فقط ولا يمكن إلغاء الفعالية بدونه:' 
                : 'This passcode is strictly confidential and required to cancel this event:'}
            </p>

            <div style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px dashed var(--accent-gold)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '2px', fontFamily: 'monospace' }}>
                {revealedPasscode}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(revealedPasscode);
                  setActionMsg(isAr ? '✓ تم نسخ كود الإلغاء السري!' : '✓ Passcode copied!');
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(226, 183, 20, 0.2)',
                  border: '1px solid var(--accent-gold)',
                  color: 'var(--accent-gold)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Copy size={13} />
                <span>{isAr ? 'نسخ' : 'Copy'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRevealedPasscode(null)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
