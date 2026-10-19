'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, MapPin, Calendar, Clock, CheckCircle2, UserCheck, ShieldAlert } from 'lucide-react';

interface VipInvitationCardProps {
  invitation: {
    id: string;
    token: string;
    isVip: boolean;
    status: string;
    recipientName?: string;
    recipientEmail?: string;
    event?: {
      titleAr: string;
      titleEn: string;
      date?: string;
    };
    location?: {
      nameAr: string;
      nameEn: string;
      address?: string;
    };
    claimedAt?: string;
  };
  language?: 'ar' | 'en';
}

export default function VipInvitationCard({ invitation, language = 'ar' }: VipInvitationCardProps) {
  const isAr = language === 'ar';
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!invitation?.token) return;

    let isMounted = true;
    import('qrcode')
      .then((mod) => {
        const qrFn = (mod as any).toDataURL || (mod as any).default?.toDataURL || (typeof mod === 'function' ? mod : null);
        if (typeof qrFn === 'function') {
          return qrFn(invitation.token, {
            width: 180,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
          });
        }
        return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(invitation.token)}`;
      })
      .then((url) => {
        if (isMounted && url) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
        if (isMounted) {
          setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(invitation.token)}`);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [invitation?.token]);

  const isVip = invitation.isVip;

  return (
    <div style={{
      maxWidth: '420px',
      width: '100%',
      margin: '0 auto',
      borderRadius: '20px',
      background: isVip 
        ? 'linear-gradient(145deg, #18150c 0%, #0d0c08 50%, #1f1b0f 100%)' 
        : 'linear-gradient(145deg, #1a1a24 0%, #121218 100%)',
      border: isVip 
        ? '2px solid rgba(226, 183, 20, 0.85)' 
        : '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: isVip 
        ? '0 12px 40px rgba(226, 183, 20, 0.25), inset 0 0 20px rgba(226, 183, 20, 0.12)' 
        : '0 8px 30px rgba(0,0,0,0.3)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      direction: isAr ? 'rtl' : 'ltr',
      color: '#ffffff'
    }}>
      {/* Decorative Gold Accent Borders for VIP */}
      {isVip && (
        <>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #e2b714, #fff8db, #e2b714, transparent)'
          }} />
          <div style={{
            position: 'absolute',
            top: '12px',
            [isAr ? 'left' : 'right']: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'linear-gradient(135deg, #e2b714 0%, #99780a 100%)',
            color: '#000000',
            fontWeight: 900,
            fontSize: '0.78rem',
            padding: '4px 10px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            letterSpacing: '1px'
          }}>
            <Crown size={14} />
            <span>VIP</span>
          </div>
        </>
      )}

      {/* Card Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.2rem', marginTop: isVip ? '0.5rem' : '0' }}>
        <div style={{
          fontSize: '0.82rem',
          color: isVip ? 'var(--accent-gold)' : 'var(--text-secondary)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '4px'
        }}>
          {isAr ? 'كنيسة الشهيد العظيم أبي سيفين' : 'Church of Saint Mercurius Abu Seifein'}
        </div>

        <h3 style={{
          fontSize: '1.35rem',
          fontWeight: 800,
          margin: '0 0 6px 0',
          color: '#ffffff',
          lineHeight: 1.3
        }}>
          {isAr ? invitation.event?.titleAr : (invitation.event?.titleEn || invitation.event?.titleAr)}
        </h3>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <MapPin size={14} style={{ color: 'var(--accent-gold)' }} />
          <span>{isAr ? invitation.location?.nameAr : (invitation.location?.nameEn || invitation.location?.nameAr)}</span>
        </div>
      </div>

      {/* Recipient Details */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '1.2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
            {isAr ? 'الضيف الكريم / حامل الدعوة:' : 'Guest Name:'}
          </span>
          <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>
            {invitation.recipientName || invitation.recipientEmail || (isAr ? 'دعوة شخصية' : 'Personal Invitation')}
          </strong>
        </div>

        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '10px',
          background: invitation.status === 'REDEEMED' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(226, 183, 20, 0.15)',
          color: invitation.status === 'REDEEMED' ? '#2ecc71' : 'var(--accent-gold)'
        }}>
          {invitation.status === 'REDEEMED' 
            ? (isAr ? 'تم الحضور ✓' : 'Checked In ✓')
            : (isAr ? 'دعوة نشطة' : 'Active Pass')}
        </span>
      </div>

      {/* QR Code Container */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '16px',
        textAlign: 'center',
        margin: '0 auto 1.2rem auto',
        maxWidth: '200px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        border: isVip ? '2px solid var(--accent-gold)' : 'none'
      }}>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Secure QR Pass"
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
          />
        ) : (
          <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
            <span>Generating QR...</span>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>
          {isAr
            ? 'يرجى إبراز هذا الرمز عند بوابة الدخول للتحقق الفوري لمرة واحدة فقط.'
            : 'Please present this single-use verified QR code at the check-in entrance.'}
        </p>
      </div>
    </div>
  );
}
