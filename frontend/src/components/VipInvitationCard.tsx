'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, MapPin, Calendar, Clock, CheckCircle2, UserCheck, ShieldAlert } from 'lucide-react';

interface VipInvitationCardProps {
  invitation: {
    id?: string;
    token?: string;
    qrToken?: string;
    isVip?: boolean;
    type?: string;
    status?: string;
    recipientName?: string;
    recipientEmail?: string;
    event?: {
      titleAr?: string;
      titleEn?: string;
      date?: string;
    };
    location?: {
      nameAr?: string;
      nameEn?: string;
      address?: string;
    };
    claimedAt?: string;
    [key: string]: any;
  };
  language?: 'ar' | 'en';
  isAr?: boolean;
}

export default function VipInvitationCard({ invitation, language = 'ar', isAr: isArProp }: VipInvitationCardProps) {
  const isAr = isArProp !== undefined ? isArProp : language === 'ar';
  const qrToken = invitation.qrToken || invitation.token || '';
  const isVip = invitation.type === 'VIP' || invitation.isVip || false;
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!qrToken) return;

    let isMounted = true;
    import('qrcode')
      .then((mod) => {
        const qrFn = (mod as any).toDataURL || (mod as any).default?.toDataURL || (typeof mod === 'function' ? mod : null);
        if (typeof qrFn === 'function') {
          return qrFn(qrToken, {
            width: 180,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
          });
        }
        return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrToken)}`;
      })
      .then((url) => {
        if (isMounted && url) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
        if (isMounted) {
          setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrToken)}`);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [qrToken]);

  return (
    <div style={{
      maxWidth: '420px',
      width: '100%',
      margin: '0 auto',
      borderRadius: '20px',
      background: isVip 
        ? 'linear-gradient(145deg, #1f1a0e 0%, #0d0c08 50%, #231d0e 100%)' 
        : 'linear-gradient(145deg, #181822 0%, #101016 100%)',
      border: isVip 
        ? '3.5px double #e2b714' 
        : '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: isVip 
        ? '0 0 20px rgba(226, 183, 20, 0.4), 0 12px 40px rgba(0, 0, 0, 0.6), inset 0 0 25px rgba(226, 183, 20, 0.18)' 
        : '0 8px 30px rgba(0,0,0,0.3)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      direction: isAr ? 'rtl' : 'ltr',
      color: '#ffffff'
    }}>
      {/* Decorative Gold Accent Borders and Glowing Header for VIP */}
      {isVip ? (
        <>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            background: 'linear-gradient(90deg, transparent, #e2b714, #fff2a8, #e2b714, transparent)'
          }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, rgba(226, 183, 20, 0.25) 0%, rgba(226, 183, 20, 0.08) 100%)',
            border: '1px solid rgba(226, 183, 20, 0.5)',
            color: 'var(--accent-gold)',
            fontWeight: 800,
            fontSize: '0.82rem',
            padding: '6px 14px',
            borderRadius: '20px',
            margin: '0 auto 1rem auto',
            width: 'fit-content',
            boxShadow: '0 2px 10px rgba(226, 183, 20, 0.2)',
            letterSpacing: '1px'
          }}>
            <Crown size={16} />
            <span>{isAr ? 'دعوة كبار الزوار الرسمية • VIP PASS' : 'OFFICIAL VIP PASS'}</span>
            <Crown size={16} />
          </div>
        </>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: 'var(--text-secondary)',
          fontWeight: 600,
          fontSize: '0.78rem',
          padding: '4px 12px',
          borderRadius: '16px',
          margin: '0 auto 1rem auto',
          width: 'fit-content'
        }}>
          <span>🎟️ {isAr ? 'بطاقة حضور عامة (Standard Pass)' : 'Standard Entry Pass'}</span>
        </div>
      )}

      {/* Card Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
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
