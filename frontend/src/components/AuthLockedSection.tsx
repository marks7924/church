'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface AuthLockedSectionProps {
  isLocked: boolean;
  titleAr?: string;
  titleEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  badgeTextAr?: string;
  badgeTextEn?: string;
  redirectUrl?: string;
  blurAmount?: string;
  minHeight?: string;
  children: React.ReactNode;
}

export default function AuthLockedSection({
  isLocked,
  titleAr = 'هذه الخدمة متاحة حصرياً للأعضاء المسجلين',
  titleEn = 'Exclusive Service for Registered Members',
  descriptionAr = 'يرجى تسجيل الدخول إلى حسابك الكنسي أو إنشاء حساب جديد للوصول الكامل إلى هذه الخدمة وكافة مميزات المنصة.',
  descriptionEn = 'Please log in with your church account or create a new one to access this service and all church platform features.',
  badgeTextAr = 'تسجيل الدخول مطلوب',
  badgeTextEn = 'Login Required',
  redirectUrl,
  blurAmount = '7px',
  minHeight = '280px',
  children
}: AuthLockedSectionProps) {
  const { language } = useTheme();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  if (!isLocked) {
    return <>{children}</>;
  }

  const loginTarget = redirectUrl 
    ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
    : '/login';

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        minHeight,
        borderRadius: 'inherit',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. Underlying Real Content - Blurred & Non-Interactive */}
      <div 
        style={{
          filter: `blur(${blurAmount})`,
          opacity: 0.38,
          pointerEvents: 'none',
          userSelect: 'none',
          transition: 'filter 0.3s ease, opacity 0.3s ease',
          width: '100%'
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* 2. Cathedral Luxury Gold Lock Overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 35,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(1.5rem, 3vw, 2.5rem)',
          background: 'radial-gradient(circle at center, rgba(18, 19, 26, 0.94) 0%, rgba(11, 12, 16, 0.98) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}
      >
        {/* Gold Glowing Lock Badge */}
        <div 
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '12px',
            backgroundColor: 'rgba(226, 183, 20, 0.12)',
            border: '1px solid var(--accent-gold, #e2b714)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            boxShadow: '0 0 30px rgba(226, 183, 20, 0.25)'
          }}
        >
          <Lock size={32} style={{ color: 'var(--accent-gold, #e2b714)' }} />
        </div>

        {/* Small Tag */}
        <span 
          style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '4px 12px',
            borderRadius: '4px',
            backgroundColor: 'rgba(226, 183, 20, 0.15)',
            border: '1px solid rgba(226, 183, 20, 0.35)',
            color: 'var(--accent-gold, #e2b714)',
            marginBottom: '0.75rem',
            display: 'inline-block'
          }}
        >
          {isAr ? badgeTextAr : badgeTextEn}
        </span>

        {/* Title */}
        <h3 
          style={{
            fontSize: 'clamp(1.15rem, 2.2vw, 1.45rem)',
            fontWeight: 900,
            margin: '0 0 0.5rem 0',
            color: '#ffffff',
            lineHeight: 1.3
          }}
        >
          {isAr ? titleAr : titleEn}
        </h3>

        {/* Description */}
        <p 
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-secondary, #a0aec0)',
            maxWidth: '460px',
            margin: '0 0 1.5rem 0',
            lineHeight: 1.6
          }}
        >
          {isAr ? descriptionAr : descriptionEn}
        </p>

        {/* Action Button */}
        <Link
          href={loginTarget}
          style={{
            padding: '12px 28px',
            fontSize: '0.92rem',
            fontWeight: 800,
            backgroundColor: 'var(--accent-gold, #e2b714)',
            color: '#000000',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 6px 20px rgba(226, 183, 20, 0.35)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          <span>{isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Log In / Register'}</span>
          <ArrowIcon size={16} />
        </Link>
      </div>
    </div>
  );
}
