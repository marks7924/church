'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '../../../../components/ThemeContext';
import { 
  ArrowLeft, ArrowRight, Video, Link2, BookOpen, Share2, 
  ShieldCheck, EyeOff, Lock, HelpCircle 
} from 'lucide-react';
import { API_URL } from '../../../../config';

export default function QuestionDetailPage() {
  const { slug } = useParams();
  const { language } = useTheme();
  const router = useRouter();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('church-token');
    if (!token) {
      router.push('/fy/questions');
      return;
    }

    fetch(`${API_URL}/fy/questions/${slug}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 403 || res.status === 401) {
          throw new Error(isAr ? 'هذا المحتوى متاح فقط للأعضاء المؤكدين.' : 'Members-only content.');
        }
        if (!res.ok) {
          throw new Error(isAr ? 'السؤال غير موجود أو غير منشور.' : 'Question not found.');
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          const q = data.question || data;
          if (q && (q.id || q.titleAr)) {
            setQuestion(q);
          }
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, isAr, router]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-secondary)' }}>
        <p>{isAr ? 'جاري تحميل السؤال والإجابة...' : 'Loading question and answer...'}</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <HelpCircle size={48} style={{ color: '#e74c3c', margin: '0 auto 1rem auto' }} />
        <h2 style={{ color: '#ffffff', marginBottom: '1rem' }}>{error || (isAr ? 'السؤال غير متاح' : 'Question unavailable')}</h2>
        <Link
          href="/fy/questions"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent-gold)',
            textDecoration: 'none',
            fontWeight: 700
          }}
        >
          {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          <span>{isAr ? 'العودة لمكتبة الأسئلة' : 'Back to Questions'}</span>
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '85vh',
      padding: 'clamp(1rem, 3vw, 2.5rem) clamp(0.75rem, 2vw, 1.5rem)',
      maxWidth: '900px',
      margin: '0 auto',
      direction: isAr ? 'rtl' : 'ltr'
    }}>
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/fy/questions"
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
          <span>{isAr ? 'العودة لمكتبة الأسئلة' : 'Back to Questions Library'}</span>
        </Link>
      </div>

      <article style={{
        background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        borderRadius: '16px',
        padding: 'clamp(1.5rem, 4vw, 3rem)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
      }}>
        {/* Meta badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: '12px',
            background: 'rgba(52, 152, 219, 0.15)',
            color: '#3498db'
          }}>
            {question.category ? (isAr ? question.category.nameAr : question.category.nameEn) : (isAr ? 'عقيدة وإيمان' : 'Faith')}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {question.isAnonymous ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <EyeOff size={14} />
                <span>{isAr ? 'سؤال بدون اسم' : 'Anonymous Submitter'}</span>
              </span>
            ) : question.authorDisplayName ? (
              <span>{question.authorDisplayName}</span>
            ) : null}
            <span>•</span>
            <span>{new Date(question.publishedAt || question.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
          </div>
        </div>

        {/* Question Title */}
        <h1 style={{
          fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
          fontWeight: 900,
          margin: '0 0 1.5rem 0',
          color: '#ffffff',
          lineHeight: 1.3
        }}>
          {isAr ? question.titleAr : (question.titleEn || question.titleAr)}
        </h1>

        {/* Question Details / Context */}
        {(question.contentAr || question.contentEn) && (
          <div style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderInlineStart: '4px solid var(--accent-gold)',
            borderRadius: '8px',
            padding: '1.2rem',
            marginBottom: '2rem',
            color: 'var(--text-secondary)',
            fontSize: '0.98rem',
            lineHeight: 1.7
          }}>
            <strong style={{ display: 'block', color: 'var(--accent-gold)', marginBottom: '6px', fontSize: '0.88rem' }}>
              {isAr ? 'نص السؤال والاستفسار المطروح:' : 'Submitted Question Inquiry:'}
            </strong>
            <p style={{ margin: 0 }}>
              {isAr ? question.contentAr : (question.contentEn || question.contentAr)}
            </p>
          </div>
        )}

        {/* Pastoral Answer Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2ecc71', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>
            <ShieldCheck size={22} />
            <span>{isAr ? 'الإجابة الرعوية المعتمدة' : 'Official Pastoral Guidance'}</span>
          </div>

          <div style={{
            color: '#f0f0f5',
            fontSize: '1.05rem',
            lineHeight: 2,
            whiteSpace: 'pre-line',
            textAlign: 'justify'
          }}>
            {isAr ? question.answerAr : (question.answerEn || question.answerAr)}
          </div>
        </div>

        {/* Video Embeds if present */}
        {question.mediaUrls && question.mediaUrls.length > 0 && (
          <div style={{ marginBottom: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '1.1rem', margin: '0 0 1rem 0' }}>
              <Video size={20} />
              <span>{isAr ? 'تسجيلات وشروحات مرئية' : 'Video Explanations'}</span>
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {question.mediaUrls.map((url: string, idx: number) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  <Video size={18} style={{ color: 'var(--accent-gold)' }} />
                  <span style={{ flex: 1, wordBreak: 'break-all' }}>{url}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Reference Links & Scripture Citations */}
        {question.referenceLinks && question.referenceLinks.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2ecc71', fontSize: '1.1rem', margin: '0 0 1rem 0' }}>
              <Link2 size={20} />
              <span>{isAr ? 'شواهد كتابية ومراجع كنسية' : 'Biblical References & Citations'}</span>
            </h3>
            <ul style={{ margin: 0, paddingInlineStart: '20px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              {question.referenceLinks.map((link: string, idx: number) => (
                <li key={idx} style={{ marginBottom: '6px' }}>
                  {link.startsWith('http') ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)' }}>
                      {link}
                    </a>
                  ) : (
                    <span>{link}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  );
}
