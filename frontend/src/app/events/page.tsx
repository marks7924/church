'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '../../components/ThemeContext';
import { 
  Calendar, MapPin, Users, Lock, CheckCircle, AlertTriangle, ArrowLeft, ArrowRight,
  ShieldCheck, Sparkles, Mail, Phone, User, QrCode
} from 'lucide-react';
import { API_URL } from '../../config';
import VipInvitationCard from '../../components/VipInvitationCard';

export default function EventsPublicPage() {
  const { language } = useTheme();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublicChannel, setIsPublicChannel] = useState(true);

  // Application modal state
  const [applyingEvent, setApplyingEvent] = useState<any | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [issuedInvitation, setIssuedInvitation] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('church-token');
      const storedUser = localStorage.getItem('church-user');
      setToken(storedToken);
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setFullName(parsed.fullName || '');
          setEmail(parsed.email || '');
          setPhone(parsed.phone || '');
        } catch {}
      }
    }
  }, []);

  const checkPublicStatus = () => {
    fetch(`${API_URL}/invitations/public-status`)
      .then(res => res.json())
      .then(data => {
        if (typeof data.isPublic === 'boolean') {
          setIsPublicChannel(data.isPublic);
        }
      })
      .catch(() => {});
  };

  const fetchEvents = (silent: boolean = false) => {
    if (!silent) setLoading(true);
    checkPublicStatus();
    fetch(`${API_URL}/invitations/events`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEvents(data);
        }
      })
      .catch(err => console.error('Error fetching public events:', err))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    fetchEvents(false);
    const interval = setInterval(() => {
      fetchEvents(true);
    }, 3500); // Live update every 3.5 seconds with no delays

    const handleEventVisibilityChange = () => fetchEvents(true);
    window.addEventListener('event-visibility-change', handleEventVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('event-visibility-change', handleEventVisibilityChange);
    };
  }, [token]);

  const handleOpenApply = (event: any, locationId?: string) => {
    // 1. Check if application is active
    if (!event.isApplicationActive) {
      alert(isAr ? '🔒 باب التقديم لم يُفتح بعد لهذه الفعالية.' : '🔒 Applications are not opened yet for this event.');
      return;
    }

    // 2. Select initial location
    const chosenLocId = locationId || (event.locations && event.locations.length > 0 ? event.locations[0].id : '');
    const chosenLoc = event.locations?.find((l: any) => l.id === chosenLocId);

    // 3. Check if location capacity reached
    if (chosenLoc && (chosenLoc.isFull || chosenLoc.confirmedCount >= chosenLoc.maxCapacity)) {
      alert(isAr ? '⚠️ اكتمل العدد الأقصى المسموح به لهذا المكان.' : '⚠️ Maximum capacity reached for this location.');
      return;
    }

    setApplyingEvent(event);
    setSelectedLocationId(chosenLocId);
    setApplyError(null);
    setIssuedInvitation(null);
  };

  const handleConfirmApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingEvent || !selectedLocationId) return;

    if (!fullName.trim() || !phone.trim()) {
      setApplyError(isAr ? 'يرجى إدخال الاسم ورقم الهاتف.' : 'Please enter your name and phone number.');
      return;
    }

    setIsApplying(true);
    setApplyError(null);

    try {
      const res = await fetch(`${API_URL}/invitations/events/${applyingEvent.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          locationId: selectedLocationId,
          fullName: fullName.trim(),
          phone: phone.trim(),
          externalEmail: email.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIssuedInvitation({
          id: data.invitationId,
          qrToken: data.qrToken,
          type: 'STANDARD',
          recipientName: fullName.trim(),
          recipientEmail: email.trim(),
          event: applyingEvent,
          location: applyingEvent.locations?.find((l: any) => l.id === selectedLocationId)
        });
        fetchEvents();
      } else {
        setApplyError(isAr ? (data.errorAr || data.error) : (data.error || 'Failed to submit application.'));
      }
    } catch (err) {
      setApplyError(isAr ? 'خطأ في الاتصال بالخادم.' : 'Connection error.');
    } finally {
      setIsApplying(false);
    }
  };

  const isAdmin = user && ['SUPER_ADMIN', 'CHURCH_ADMIN', 'DEVELOPER', 'SECRETARY', 'PRIEST', 'BISHOP'].includes(user.role);

  if (!isPublicChannel && !isAdmin && !loading) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '5rem auto',
        textAlign: 'center',
        padding: '2.5rem',
        background: 'var(--card-bg, rgba(255,255,255,0.03))',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        direction: isAr ? 'rtl' : 'ltr'
      }}>
        <Lock size={48} style={{ color: 'var(--accent-gold)', margin: '0 auto 1.2rem auto' }} />
        <h2 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.4rem', fontWeight: 800 }}>
          {isAr ? 'صفحة الفعاليات غير متاحة حالياً' : 'Events Page is Currently Private'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '2rem', fontSize: '0.95rem' }}>
          {isAr 
            ? 'هذه الصفحة في وضع قناة خاصة حالياً ومتاحة فقط لمسؤولي ومشرفي الكنيسة.' 
            : 'This page is currently set to private mode and only accessible to church administrators.'}
        </p>
        <Link
          href="/"
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            background: 'var(--accent-gold)',
            color: '#000000',
            fontWeight: 800,
            textDecoration: 'none',
            fontSize: '0.9rem'
          }}
        >
          {isAr ? 'العودة للرئيسية' : 'Return Home'}
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '85vh',
      padding: 'clamp(1rem, 3vw, 2.5rem) clamp(0.75rem, 2vw, 1.5rem)',
      maxWidth: '1200px',
      margin: '0 auto',
      direction: isAr ? 'rtl' : 'ltr'
    }}>
      {/* Private Channel Banner for Admins */}
      {!isPublicChannel && (
        <div style={{
          background: 'rgba(230, 126, 34, 0.15)',
          border: '1px solid #e67e22',
          borderRadius: '12px',
          padding: '12px 20px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          color: '#f39c12',
          fontWeight: 800,
          fontSize: '0.95rem'
        }}>
          <Lock size={18} />
          <span>
            {isAr ? '🔒 قناة خاصة مرئية لك فقط كمشرف (Private channel only visible to you)' : '🔒 Private channel only visible to you'}
          </span>
        </div>
      )}

      {/* Top Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--accent-gold)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
        </Link>

        {user && (
          <Link
            href="/dashboard?tab=my-invitations"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600
            }}
          >
            <QrCode size={16} style={{ color: 'var(--accent-gold)' }} />
            <span>{isAr ? 'عرض بطاقات دعواتي في الملف الشخصي' : 'My Profile Passes'}</span>
          </Link>
        )}
      </div>

      {/* Hero Header */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 900, color: '#ffffff', margin: '0 0 10px 0' }}>
          {isAr ? 'فعاليات الكنيسة وبطاقات الدعوة الرسمية' : 'Church Events & Official Invitation Passes'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '680px', margin: '0 auto' }}>
          {isAr
            ? 'احجز مقعدك في الفعاليات والنهضات الكنسية واحصل فورًا على بطاقة دعوة إلكترونية برمز QR معتمد تُحفظ في ملفك الشخصي.'
            : 'Reserve your pass for official church events and receive a verified QR invitation stored on your profile.'}
        </p>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <p>{isAr ? 'جاري تحميل الفعاليات المعلنة...' : 'Loading published events...'}</p>
        </div>
      ) : events.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {events.map(ev => {
            let rules: any = {};
            try { rules = JSON.parse(ev.eligibilityRulesJson || '{}'); } catch {}

            return (
              <div
                key={ev.id}
                style={{
                  background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '8px',
                      background: 'rgba(226, 183, 20, 0.12)',
                      color: 'var(--accent-gold)'
                    }}>
                      <Calendar size={13} />
                      <span>{new Date(ev.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                      {ev.startTime && <span>• {ev.startTime}</span>}
                    </span>

                    {/* Status Badge */}
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '8px',
                      background: ev.isApplicationActive ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255,255,255,0.08)',
                      color: ev.isApplicationActive ? '#2ecc71' : 'var(--text-secondary)'
                    }}>
                      {ev.isApplicationActive 
                        ? (isAr ? 'متاح للتقديم' : 'Open') 
                        : (isAr ? 'مغلق حاليًا' : 'Closed')}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 10px 0', color: '#ffffff', lineHeight: 1.4 }}>
                    {isAr ? ev.titleAr : (ev.titleEn || ev.titleAr)}
                  </h3>

                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                    margin: '0 0 1.25rem 0'
                  }}>
                    {isAr ? ev.descriptionAr : (ev.descriptionEn || ev.descriptionAr)}
                  </p>

                  {/* Rules Badges */}
                  {(rules.requireVerifiedMember || rules.minAge) && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      {rules.requireVerifiedMember && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(52, 152, 219, 0.15)',
                          color: '#3498db',
                          fontWeight: 600
                        }}>
                          <ShieldCheck size={12} />
                          <span>{isAr ? 'أعضاء الكنيسة المسجلين فقط' : 'Members Only'}</span>
                        </span>
                      )}
                      {rules.minAge && (
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#e4e4e7',
                          fontWeight: 600
                        }}>
                          {isAr ? `الحد الأدنى للسن: ${rules.minAge} سنة` : `Min Age: ${rules.minAge}+`}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Locations & Capacity Breakdown */}
                  <div style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} style={{ color: 'var(--accent-gold)' }} />
                      <span>{isAr ? 'الأماكن المتاحة والسعة الاستيعابية:' : 'Available Locations & Capacity:'}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {ev.locations && ev.locations.map((loc: any) => {
                        const isFull = loc.isFull || loc.confirmedCount >= loc.maxCapacity;
                        const remaining = Math.max(0, loc.maxCapacity - loc.confirmedCount);

                        return (
                          <div
                            key={loc.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.85rem',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: isFull ? 'rgba(231, 76, 60, 0.1)' : 'rgba(255,255,255,0.03)'
                            }}
                          >
                            <span style={{ color: '#ffffff', fontWeight: 600 }}>
                              {isAr ? loc.nameAr : (loc.nameEn || loc.nameAr)}
                            </span>
                            <span style={{
                              fontWeight: 700,
                              color: isFull ? '#e74c3c' : '#2ecc71',
                              fontSize: '0.78rem'
                            }}>
                              {isFull 
                                ? (isAr ? 'اكتمل العدد الأقصى' : 'Max Reached') 
                                : (isAr ? `متبقي ${remaining} مقعد` : `${remaining} slots left`)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                <div>
                  {!ev.isApplicationActive ? (
                    <button
                      onClick={() => handleOpenApply(ev)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'not-allowed',
                        fontSize: '0.95rem'
                      }}
                    >
                      <Lock size={16} />
                      <span>{isAr ? 'باب التقديم لم يُفتح بعد' : 'Not opened yet'}</span>
                    </button>
                  ) : ev.locations?.every((l: any) => l.isFull || l.confirmedCount >= l.maxCapacity) ? (
                    <button
                      disabled
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'rgba(231, 76, 60, 0.15)',
                        border: '1px solid rgba(231, 76, 60, 0.3)',
                        color: '#e74c3c',
                        fontWeight: 700,
                        cursor: 'not-allowed',
                        fontSize: '0.95rem'
                      }}
                    >
                      <AlertTriangle size={16} />
                      <span>{isAr ? 'اكتمل العدد الأقصى للفعالية' : 'Max capacity reached'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenApply(ev)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'var(--accent-gold)',
                        border: 'none',
                        color: '#000000',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        boxShadow: '0 4px 14px rgba(226, 183, 20, 0.3)'
                      }}
                    >
                      <Sparkles size={16} />
                      <span>{isAr ? 'تقديم للحصول على بطاقة الدعوة' : 'Apply for Invitation Pass'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '5rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1rem' }}>
            {isAr ? 'لا توجد فعاليات معلنة حاليًا. سيتم نشر الفعاليات القادمة فور اعتمادها.' : 'No public events available at this moment. Stay tuned for upcoming gatherings.'}
          </p>
        </div>
      )}

      {/* Application / Invitation Modal */}
      {applyingEvent && (
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
            {!issuedInvitation ? (
              <>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
                  {isAr ? 'تأكيد التسجيل وإصدار بطاقة الدعوة' : 'Event Pass Application'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 1.25rem 0' }}>
                  {isAr ? applyingEvent.titleAr : applyingEvent.titleEn}
                </p>

                {applyError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(231, 76, 60, 0.15)',
                    border: '1px solid #e74c3c',
                    color: '#e74c3c',
                    fontSize: '0.88rem',
                    marginBottom: '1rem'
                  }}>
                    {applyError}
                  </div>
                )}

                <form onSubmit={handleConfirmApplication}>
                  {/* Select Location */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {isAr ? 'اختر مقر الحضور / القاعة *' : 'Select Location *'}
                    </label>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        fontSize: '0.92rem'
                      }}
                    >
                      {applyingEvent.locations?.map((loc: any) => {
                        const isFull = loc.isFull || loc.confirmedCount >= loc.maxCapacity;
                        return (
                          <option key={loc.id} value={loc.id} disabled={isFull} style={{ background: '#1a1a24' }}>
                            {isAr ? loc.nameAr : loc.nameEn} {isFull ? (isAr ? '(مكتمل)' : '(Full)') : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {isAr ? 'الاسم بالكامل *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isAr ? 'مثال: مينا سمير فؤاد' : 'e.g. John Doe'}
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

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {isAr ? 'رقم الهاتف (للتواصل وتأكيد الحجز) *' : 'Phone Number *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
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

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {isAr ? 'البريد الإلكتروني (لاستلام بطاقة الدعوة مع رمز QR)' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setApplyingEvent(null)}
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
                      disabled={isApplying}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '8px',
                        background: 'var(--accent-gold)',
                        border: 'none',
                        color: '#000000',
                        fontWeight: 800,
                        cursor: isApplying ? 'wait' : 'pointer'
                      }}
                    >
                      {isApplying 
                        ? (isAr ? 'جاري التأكيد...' : 'Issuing Pass...') 
                        : (isAr ? 'تأكيد الحجز وإصدار الدعوة' : 'Confirm & Issue Pass')}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <CheckCircle size={44} style={{ color: '#2ecc71', margin: '0 auto 8px auto' }} />
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    {isAr ? 'تم تأكيد حجزك وإصدار بطاقة الدعوة بنجاح!' : 'Your Invitation Pass is Ready!'}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '6px 0 0 0' }}>
                    {isAr 
                      ? 'تم حفظ بطاقة الدعوة برمز QR في ملفك الشخصي وإرسال نسخة عبر البريد الإلكتروني.' 
                      : 'Saved to your profile with single-use entry QR code and emailed to you.'}
                  </p>
                </div>

                {/* Live Card Preview */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <VipInvitationCard invitation={issuedInvitation} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <Link
                    href="/dashboard?tab=my-invitations"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      background: 'var(--accent-gold)',
                      color: '#000000',
                      fontWeight: 800,
                      textDecoration: 'none',
                      fontSize: '0.9rem'
                    }}
                  >
                    {isAr ? 'الانتقال لتذاكري ودعواتي (QR)' : 'Go to My Invitations'}
                  </Link>
                  <button
                    onClick={() => { setApplyingEvent(null); setIssuedInvitation(null); }}
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
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
