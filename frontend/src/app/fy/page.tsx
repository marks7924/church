'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '../../components/ThemeContext';
import { BookOpen, HelpCircle, Music, Lock, ArrowRight, ArrowLeft, Sparkles, CheckCircle2, BookmarkCheck, ShieldAlert } from 'lucide-react';
import { API_URL } from '../../config';

export default function FyLandingPage() {
  const { language, t } = useTheme();
  const [verseOfDay, setVerseOfDay] = useState<any>(null);
  const [loadingVerse, setLoadingVerse] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showHymnsModal, setShowHymnsModal] = useState(false);

  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  useEffect(() => {
    // Check user membership status
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('church-user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setIsMember(parsed.role === 'MEMBER' || ['PRIEST', 'BISHOP', 'SUPER_ADMIN', 'CHURCH_ADMIN', 'SECRETARY'].includes(parsed.role));
        } catch (e) {
          setIsMember(false);
        }
      }
    }

    // Fetch Verse of the Day
    fetch(`${API_URL}/fy/verse-of-day?translationCode=van-dyck`)
      .then(res => res.json())
      .then(data => {
        if (data && data.verse) {
          setVerseOfDay(data.verse);
        }
      })
      .catch(err => console.error('Error fetching Verse of the Day:', err))
      .finally(() => setLoadingVerse(false));
  }, []);

  return (
    <div style={{
      minHeight: '85vh',
      padding: 'clamp(1.5rem, 4vw, 3.5rem) clamp(1rem, 3vw, 2rem)',
      maxWidth: '1200px',
      margin: '0 auto',
      direction: isAr ? 'rtl' : 'ltr'
    }}>
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '24px',
          background: 'rgba(226, 183, 20, 0.12)',
          border: '1px solid rgba(226, 183, 20, 0.3)',
          color: 'var(--accent-gold)',
          fontSize: '0.88rem',
          fontWeight: 700,
          marginBottom: '1rem'
        }}>
          <Sparkles size={16} />
          <span>{isAr ? 'منصة الإيمان والتعليم الأرثوذكسي' : 'Faith & Orthodox Teachings'}</span>
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.2rem)',
          fontWeight: 900,
          margin: '0 0 1rem 0',
          background: 'linear-gradient(135deg, #ffffff 40%, var(--accent-gold) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.2
        }}>
          {isAr ? 'الإيمان وأسئلتكم — FY' : 'Faith & Your Questions — FY'}
        </h1>
        <p style={{
          fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
          color: 'var(--text-secondary)',
          maxWidth: '750px',
          margin: '0 auto',
          lineHeight: 1.7
        }}>
          {isAr 
            ? 'رحلة روحية تجمع كلمة الله الحية في الكتاب المقدس، مع إجابات رعوية موثوقة لأسئلتكم الكنسية والعقائدية، ومكتبة للتراث الكنسي الأصيل.' 
            : 'A spiritual sanctuary bringing together the living Word of God in the Holy Bible, trusted pastoral answers to your life and dogmatic questions, and our heritage.'}
        </p>
      </div>

      {/* Hero Verse of the Day Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(226, 183, 20, 0.1) 0%, rgba(20, 20, 25, 0.7) 100%)',
        border: '1px solid rgba(226, 183, 20, 0.35)',
        borderRadius: '16px',
        padding: 'clamp(1.2rem, 3vw, 2rem)',
        marginBottom: '3.5rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.92rem' }}>
            <BookmarkCheck size={20} />
            <span>{isAr ? 'آية اليوم المباركة' : 'Verse of the Day'}</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {isAr ? 'الترجمة البيروتية (فان دايك)' : 'Van Dyck Authentic Translation'}
          </span>
        </div>

        {loadingVerse ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{isAr ? 'جاري تحميل آية اليوم...' : 'Loading verse...'}</p>
        ) : verseOfDay ? (
          <div>
            <blockquote style={{
              fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)',
              fontWeight: 600,
              lineHeight: 1.8,
              margin: '0 0 1rem 0',
              fontStyle: 'normal',
              color: '#ffffff'
            }}>
              «{verseOfDay.text}»
            </blockquote>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '1rem' }}>
                {isAr ? verseOfDay.chapter?.book?.nameAr : verseOfDay.chapter?.book?.nameEn} {verseOfDay.chapterNumber}:{verseOfDay.verseNumber}
              </span>
              <Link 
                href={`/fy/bible?book=${verseOfDay.chapter?.book?.slug}&chapter=${verseOfDay.chapterNumber}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--accent-gold)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'rgba(226, 183, 20, 0.1)',
                  border: '1px solid rgba(226, 183, 20, 0.25)'
                }}
              >
                <span>{isAr ? 'قراءة الإصحاح كاملًا' : 'Read Full Chapter'}</span>
                <ArrowIcon size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <blockquote style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}>
            «فِي الْبَدْءِ كَانَ الْكَلِمَةُ، وَالْكَلِمَةُ كَانَ عِنْدَ اللهِ، وَكَانَ الْكَلِمَةُ اللهَ.»
            <span style={{ display: 'block', marginTop: '8px', color: 'var(--accent-gold)', fontSize: '0.95rem' }}>يوحنا 1:1</span>
          </blockquote>
        )}
      </div>

      {/* The 3 FY Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
        gap: '24px'
      }}>
        {/* Card 1: Bible & Verse of the Day */}
        <div style={{
          background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          position: 'relative'
        }}>
          <div>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(226, 183, 20, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)',
              marginBottom: '1.5rem'
            }}>
              <BookOpen size={28} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: 'rgba(46, 204, 113, 0.15)',
                color: '#2ecc71',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                {isAr ? 'متاح للجميع' : 'Public'}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                {isAr ? 'العهدين القديم والجديد' : 'Old & New Testaments'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.8rem 0', color: '#ffffff' }}>
              {isAr ? 'الكتاب المقدس وآية اليوم' : 'Bible & Verse of the Day'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
              {isAr 
                ? 'قارئ تفاعلي مريح لكلمات الله المقدسة بالترجمة البيروتية المعتمدة وترجمة الملك جيمس، مع متابعة تقدم القراءة وحفظ آخر موضع.' 
                : 'Interactive Bible reader with certified Van Dyck and King James translations, chapter completion tracking, and last reading position.'}
            </p>
          </div>

          <Link
            href="/fy/bible"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: 'var(--accent-gold)',
              color: '#000000',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(226, 183, 20, 0.3)',
              transition: 'transform 0.2s ease'
            }}
          >
            <span>{isAr ? 'فتح قارئ الإنجيل' : 'Open Bible Reader'}</span>
            <ArrowIcon size={18} />
          </Link>
        </div>

        {/* Card 2: Questions About God (Member Only) */}
        <div style={{
          background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          position: 'relative'
        }}>
          <div>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(52, 152, 219, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3498db',
              marginBottom: '1.5rem'
            }}>
              <HelpCircle size={28} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: 'rgba(230, 126, 34, 0.15)',
                color: '#e67e22',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Lock size={12} />
                <span>{isAr ? 'للأعضاء فقط' : 'Members Only'}</span>
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                {isAr ? 'إجابات رعوية معتمدة' : 'Verified Pastoral Answers'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.8rem 0', color: '#ffffff' }}>
              {isAr ? 'أسئلة حول الله والإيمان' : 'Questions About God'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
              {isAr 
                ? 'مكتبة شاملة للأسئلة العقائدية والروحية والكنسية مجاب عنها من آباء الكنيسة، مع إمكانية طرح سؤالك الخاص باسمك أو بسرية تامة.' 
                : 'Comprehensive library of theological, spiritual, and life questions answered by church fathers, with the ability to ask your own questions anonymously or named.'}
            </p>
          </div>

          <Link
            href="/fy/questions"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(52, 152, 219, 0.15)',
              border: '1px solid rgba(52, 152, 219, 0.4)',
              color: '#ffffff',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.95rem'
            }}
          >
            <span>{isAr ? 'تصفح بنك الأسئلة' : 'Explore Questions Library'}</span>
            <ArrowIcon size={18} />
          </Link>
        </div>

        {/* Card 3: Hymns — Coming Soon (Pure Lightweight Locked Placeholder) */}
        <div 
          onClick={() => setShowHymnsModal(true)}
          style={{
            background: 'var(--card-bg, rgba(255, 255, 255, 0.02))',
            border: '1px dashed rgba(226, 183, 20, 0.35)',
            borderRadius: '16px',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            position: 'relative',
            cursor: 'pointer',
            opacity: 0.9
          }}
        >
          <div>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(155, 89, 182, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9b59b6',
              marginBottom: '1.5rem'
            }}>
              <Music size={28} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: 'rgba(226, 183, 20, 0.2)',
                color: 'var(--accent-gold)',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '6px',
                letterSpacing: '0.5px'
              }}>
                {isAr ? 'قريبًا' : 'SOON'}
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem'
              }}>
                <Lock size={12} />
                <span>{isAr ? 'ميزة قيد الإعداد' : 'In Development'}</span>
              </span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.8rem 0', color: '#ffffff' }}>
              {isAr ? 'الألحان والتسابيح الكنسية' : 'Church Hymns & Praises'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
              {isAr 
                ? 'مكتبة التراث القبطي الأصيل للألحان الكنسية والتسبحة اليومية مع الكلمات والنصوص القبطية والمعربة قيد الإعداد والتوثيق الكنسي.' 
                : 'The authentic Coptic heritage library of liturgical hymns and praises with Coptic, Arabized, and English lyrics is currently being prepared.'}
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.92rem'
          }}>
            <Lock size={16} />
            <span>{isAr ? 'قريبًا — Coming Soon' : 'Coming Soon'}</span>
          </div>
        </div>
      </div>

      {/* Hymns Coming Soon Info Modal */}
      {showHymnsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#16161a',
            border: '1px solid var(--accent-gold)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '450px',
            width: '100%',
            textAlign: 'center',
            direction: isAr ? 'rtl' : 'ltr'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(226, 183, 20, 0.15)',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.2rem auto'
            }}>
              <Music size={32} />
            </div>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              background: 'rgba(226, 183, 20, 0.2)',
              color: 'var(--accent-gold)',
              fontSize: '0.82rem',
              fontWeight: 800,
              marginBottom: '0.8rem'
            }}>
              {isAr ? 'قريبًا' : 'SOON'}
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.8rem 0', color: '#ffffff' }}>
              {isAr ? 'قسم الألحان قيد الإعداد' : 'Hymns Section Coming Soon'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
              {isAr
                ? 'نعمل حاليًا على إعداد مكتبة صوتية مرئية متكاملة لتعليم وتسجيل ألحان الكنيسة القبطية الأرثوذكسية وتسبحة نصف الليل مع الكلمات والطقس. سيتم إطلاق هذا القسم قريبًا بمشيئة الله.'
                : 'We are currently preparing a comprehensive multimedia library for authentic Coptic Orthodox hymns and praises. This section will be launched soon.'}
            </p>
            <button
              onClick={() => setShowHymnsModal(false)}
              style={{
                background: 'var(--accent-gold)',
                color: '#000000',
                fontWeight: 700,
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              {isAr ? 'العودة لصفحة الإيمان' : 'Back to FY'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
