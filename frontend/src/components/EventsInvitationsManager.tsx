'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import { 
  QrCode, Camera, CheckCircle2, AlertTriangle, XCircle, Users, PlusCircle, 
  RefreshCw, MapPin, Crown, Search, ShieldAlert, ArrowLeft, ArrowRight, Eye, Undo2
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

  const [activeTab, setActiveTab] = useState<'SCANNER' | 'EVENTS' | 'INVITATIONS' | 'CHECKINS'>('SCANNER');
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [locations, setLocations] = useState<any[]>([]);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

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
  const [externalEmail, setExternalEmail] = useState<string>('');
  const [externalName, setExternalName] = useState<string>('');
  const [isVip, setIsVip] = useState<boolean>(false);
  const [issuing, setIssuing] = useState<boolean>(false);

  // Issued invitations list
  const [invitations, setInvitations] = useState<any[]>([]);
  const [previewInvitation, setPreviewInvitation] = useState<any | null>(null);

  // Check-in logs
  const [checkIns, setCheckIns] = useState<any[]>([]);

  // Reopen capacity modal states
  const [reopenLocation, setReopenLocation] = useState<any | null>(null);
  const [newCapacity, setNewCapacity] = useState<number>(0);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [reopening, setReopening] = useState<boolean>(false);

  // Fetch all events on mount
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/invitations/admin/events`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEvents(data);
          if (data.length > 0 && !selectedEventId) {
            setSelectedEventId(data[0].id);
          }
        }
      })
      .catch(err => console.error('Error fetching admin events:', err));
  }, [token]);

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
  }, [token, activeTab, selectedEventId]);

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
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
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
                eventId: selectedEventId || undefined,
                locationId: selectedLocationId || undefined
              })
            });

            const data = await res.json();
            setScanResult({
              success: data.success,
              status: data.status,
              invitation: data.invitation,
              error: data.error,
              redeemedAt: data.redeemedAt
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
          userId: selectedUser?.id || undefined,
          recipientEmail: selectedUser ? selectedUser.email : externalEmail.trim(),
          recipientName: selectedUser ? selectedUser.fullName : externalName.trim(),
          isVip
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? '✓ تم إصدار الدعوة وإرسالها للبريد بنجاح!' : '✓ Invitation successfully issued and sent via email!');
        setShowIssueModal(false);
        setSelectedUser(null);
        setExternalEmail('');
        setExternalName('');
        setIsVip(false);
        // Refresh invitations
        fetch(`${API_URL}/invitations/admin/events/${selectedEventId}/invitations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(d => { if (Array.isArray(d)) setInvitations(d); });
      } else {
        setActionMsg(data.error || (isAr ? 'فشل إصدار الدعوة.' : 'Failed to issue invitation.'));
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
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
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {isAr ? ev.titleAr : ev.titleEn} ({ev.isPublished ? (isAr ? 'معلن' : 'Published') : (isAr ? 'مخفي' : 'Hidden')})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
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
            {scanResult && (
              <div style={{
                borderRadius: '12px',
                padding: '1.25rem',
                margin: '1rem 0',
                background: scanResult.status === 'VERIFIED' ? 'rgba(46, 204, 113, 0.15)' : scanResult.status === 'ALREADY_USED' ? 'rgba(230, 126, 34, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                border: `2px solid ${scanResult.status === 'VERIFIED' ? '#2ecc71' : scanResult.status === 'ALREADY_USED' ? '#e67e22' : '#e74c3c'}`
              }}>
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
                  {scanResult.status !== 'VERIFIED' && scanResult.status !== 'ALREADY_USED' && (
                    <>
                      <XCircle size={24} style={{ color: '#e74c3c' }} />
                      <strong style={{ fontSize: '1.2rem', color: '#e74c3c' }}>{isAr ? 'رمز غير صالح ✗ (INVALID)' : 'INVALID ✗'}</strong>
                    </>
                  )}
                </div>

                {scanResult.invitation && (
                  <div style={{ fontSize: '0.95rem', color: '#ffffff', margin: '8px 0' }}>
                    <div>
                      {isAr ? 'حامل الدعوة:' : 'Guest:'} <strong style={{ color: 'var(--accent-gold)' }}>{scanResult.invitation.recipientName || scanResult.invitation.recipientEmail}</strong>
                    </div>
                    {scanResult.invitation.isVip && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: '6px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'var(--accent-gold)',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.75rem'
                      }}>
                        VIP PASS
                      </span>
                    )}
                  </div>
                )}

                {scanResult.error && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#e74c3c' }}>{scanResult.error}</p>
                )}

                <button
                  onClick={resumeScan}
                  style={{
                    marginTop: '12px',
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
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LOCATIONS & CAPACITY */}
      {activeTab === 'EVENTS' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: '#ffffff' }}>
            {isAr ? 'أماكن الفعالية والسعات المستقلة والتحكم بالإتاحة' : 'Locations & Capacity Management'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {locations.map(loc => {
              const isFull = loc.confirmedCount >= loc.capacity;
              return (
                <div
                  key={loc.id}
                  style={{
                    background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
                    border: `1px solid ${isFull ? '#e74c3c' : 'var(--border-color)'}`,
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                        {isAr ? loc.nameAr : loc.nameEn}
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

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                      {loc.address || (isAr ? 'المقر الرئيسي للكنيسة' : 'Church Main Building')}
                    </p>

                    {/* Capacity Progress Bar */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'المقاعد المؤكدة:' : 'Confirmed Allocation:'}</span>
                        <strong style={{ color: 'var(--accent-gold)' }}>{loc.confirmedCount} / {loc.capacity}</strong>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, (loc.confirmedCount / (loc.capacity || 1)) * 100)}%`,
                          background: isFull ? '#e74c3c' : 'var(--accent-gold)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Reopen Action if Full */}
                  {isFull && (
                    <button
                      onClick={() => {
                        setReopenLocation(loc);
                        setNewCapacity(loc.confirmedCount + 10);
                        setReopenReason('');
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        background: 'rgba(226, 183, 20, 0.2)',
                        border: '1px solid var(--accent-gold)',
                        color: 'var(--accent-gold)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'إعادة فتح المكان بزيادة السعة' : 'Reopen with Increased Capacity'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ISSUED INVITATIONS */}
      {activeTab === 'INVITATIONS' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: '#ffffff' }}>
            {isAr ? 'قائمة الدعوات الرسمية الصادرة للفعالية' : 'Issued Invitations for this Event'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
            {invitations.map(inv => (
              <div
                key={inv.id}
                style={{
                  background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                  border: `1px solid ${inv.isVip ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  padding: '1.2rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>
                      {inv.recipientName || inv.recipientEmail}
                    </strong>
                    {inv.isVip && (
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--accent-gold)', color: '#000000', fontWeight: 900 }}>
                        VIP
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>{inv.location?.nameAr || inv.location?.nameEn}</span> • <span>{inv.status}</span>
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
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={14} />
                  <span>{isAr ? 'عرض البطاقة' : 'View Pass'}</span>
                </button>
              </div>
            ))}
          </div>
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
                  {isAr ? 'البحث عن عضو مسجل، أو دعوة خارجية *' : 'Search Member or Enter External Email *'}
                </label>

                {selectedUser ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(226, 183, 20, 0.15)',
                    border: '1px solid var(--accent-gold)'
                  }}>
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>{selectedUser.fullName}</strong>
                      <span style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', marginInlineStart: '8px' }}>
                        ({selectedUser.email})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedUser(null); setRecipientSearch(''); }}
                      style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder={isAr ? 'ابحث باسم العضو المسجل...' : 'Search registered member...'}
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
                        marginBottom: '8px'
                      }}>
                        {recipientResults.map(r => (
                          <div
                            key={r.id}
                            onClick={() => { setSelectedUser(r); setRecipientResults([]); }}
                            style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                          >
                            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem' }}>{r.fullName}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.email}</div>
                          </div>
                        ))}
                      </div>
                    )}

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
                )}
              </div>

              {/* VIP Toggle Switch */}
              <div style={{
                background: isVip ? 'rgba(226, 183, 20, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${isVip ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '1.5rem',
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
                      {isAr ? 'تمنح بطاقة ذهبية مميزة وتدرج بصفتها الرسمية' : 'Gold framed VIP pass card design'}
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
            <VipInvitationCard invitation={previewInvitation} language={language} />
          </div>
        </div>
      )}
    </div>
  );
}
