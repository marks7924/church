'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '../../../components/ThemeContext';
import { 
  HelpCircle, Lock, Search, PlusCircle, UserCheck, ShieldCheck, 
  ArrowLeft, ArrowRight, Video, Link2, Sparkles, AlertCircle, CheckCircle, Tag, EyeOff, ShieldAlert
} from 'lucide-react';
import { API_URL } from '../../../config';

export default function QuestionsLibraryPage() {
  const { language } = useTheme();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isVerifiedMember, setIsVerifiedMember] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Questions library states
  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(true);

  // Ask Question Modal states
  const [showAskModal, setShowAskModal] = useState<boolean>(false);
  const [questionTitle, setQuestionTitle] = useState<string>('');
  const [questionContent, setQuestionContent] = useState<string>('');
  const [submissionCategory, setSubmissionCategory] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check auth and member status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('church-token');
      const storedUser = localStorage.getItem('church-user');
      setToken(storedToken);

      if (storedToken && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          const allowedRoles = ['MEMBER', 'PRIEST', 'BISHOP', 'SUPER_ADMIN', 'CHURCH_ADMIN', 'SECRETARY', 'DEVELOPER'];
          setIsVerifiedMember(allowedRoles.includes(parsed.role));
        } catch (e) {
          setIsVerifiedMember(false);
        }
      } else {
        setIsVerifiedMember(false);
      }
      setCheckingAuth(false);
    }
  }, []);

  // Fetch categories and questions if verified member
  useEffect(() => {
    if (!token || !isVerifiedMember) return;

    // Fetch categories
    fetch(`${API_URL}/fy/questions/categories`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => console.error('Error fetching categories:', err));

    // Fetch questions
    setLoadingQuestions(true);
    let url = `${API_URL}/fy/questions?search=${encodeURIComponent(searchQuery)}`;
    if (selectedCategory && selectedCategory !== 'ALL') {
      url += `&categorySlug=${selectedCategory}`;
    }

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 403 || res.status === 401) {
          setIsVerifiedMember(false);
          return [];
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setQuestions(data);
      })
      .catch(err => console.error('Error fetching questions:', err))
      .finally(() => setLoadingQuestions(false));
  }, [token, isVerifiedMember, selectedCategory, searchQuery]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!questionTitle.trim() || !questionContent.trim()) {
      setSubmitError(isAr ? 'يرجى كتابة عنوان وتفاصيل السؤال.' : 'Please enter question title and details.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/fy/questions/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: questionTitle.trim(),
          content: questionContent.trim(),
          categorySlug: submissionCategory || undefined,
          isAnonymous
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitSuccess(true);
        setQuestionTitle('');
        setQuestionContent('');
        setIsAnonymous(false);
        setTimeout(() => {
          setSubmitSuccess(false);
          setShowAskModal(false);
        }, 3000);
      } else {
        setSubmitError(data.error || (isAr ? 'فشل إرسال السؤال.' : 'Failed to submit question.'));
      }
    } catch (err) {
      setSubmitError(isAr ? 'خطأ في الاتصال بالخادم.' : 'Connection error.');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Loading State
  if (checkingAuth) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-secondary)' }}>
        <p>{isAr ? 'جاري التحقق من صلاحيات العضوية الكنسية...' : 'Checking church membership authorization...'}</p>
      </div>
    );
  }

  // 2. Locked State for Non-Members
  if (!isVerifiedMember) {
    return (
      <div style={{
        maxWidth: '750px',
        margin: '3rem auto',
        padding: 'clamp(1.5rem, 4vw, 3rem) 1.5rem',
        textAlign: 'center',
        direction: isAr ? 'rtl' : 'ltr'
      }}>
        <div style={{
          background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
          border: '1px solid rgba(226, 183, 20, 0.35)',
          borderRadius: '20px',
          padding: 'clamp(2rem, 5vw, 3.5rem) 1.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(230, 126, 34, 0.15)',
            color: '#e67e22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <Lock size={36} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '16px',
            background: 'rgba(230, 126, 34, 0.15)',
            color: '#e67e22',
            fontSize: '0.82rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}>
            <ShieldAlert size={14} />
            <span>{isAr ? 'قسم مقيد للأعضاء فقط' : 'Protected Members Section'}</span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 800, margin: '0 0 1rem 0', color: '#ffffff' }}>
            {isAr ? 'مكتبة أسئلة الإيمان والعقيدة' : 'Questions About God Library'}
          </h1>

          <p style={{
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: '550px',
            margin: '0 auto 2rem auto'
          }}>
            {isAr
              ? 'حرصًا على تقديم تعليم روحي كنسي سليم وموجه، يتاح بنك الأسئلة وطرح الاستفسارات العقائدية والروحية فقط لأعضاء الكنيسة المسجلين والمعتمدين.'
              : 'To provide tailored pastoral guidance, the question library and submission features are restricted exclusively to registered and verified church members.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {user ? (
              <Link
                href="/register-member"
                style={{
                  background: 'var(--accent-gold)',
                  color: '#000000',
                  fontWeight: 700,
                  padding: '12px 24px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.95rem'
                }}
              >
                {isAr ? 'استكمال استمارة العضوية الكنسية' : 'Complete Membership Registration'}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  style={{
                    background: 'var(--accent-gold)',
                    color: '#000000',
                    fontWeight: 700,
                    padding: '12px 24px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontSize: '0.95rem'
                  }}
                >
                  {isAr ? 'تسجيل الدخول' : 'Log In'}
                </Link>
                <Link
                  href="/register-member"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontWeight: 600,
                    padding: '12px 24px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontSize: '0.95rem'
                  }}
                >
                  {isAr ? 'طلب عضوية جديدة' : 'Register for Membership'}
                </Link>
              </>
            )}
            
            <Link
              href="/fy"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 20px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.95rem'
              }}
            >
              <span>{isAr ? 'العودة لصفحة FY' : 'Back to FY'}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated Member-Only Library View
  return (
    <div style={{
      minHeight: '85vh',
      padding: 'clamp(1rem, 3vw, 2.5rem) clamp(0.75rem, 2vw, 1.5rem)',
      maxWidth: '1200px',
      margin: '0 auto',
      direction: isAr ? 'rtl' : 'ltr'
    }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          href="/fy"
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
          <span>{isAr ? 'العودة لصفحة الإيمان FY' : 'Back to FY Hub'}</span>
        </Link>

        {/* Ask Question Button */}
        <button
          onClick={() => setShowAskModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--accent-gold)',
            color: '#000000',
            fontWeight: 800,
            border: 'none',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            boxShadow: '0 4px 14px rgba(226, 183, 20, 0.3)'
          }}
        >
          <PlusCircle size={18} />
          <span>{isAr ? 'طرح سؤال جديد' : 'Ask a Question'}</span>
        </button>
      </div>

      {/* Main Title Area */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3498db', fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px' }}>
          <ShieldCheck size={18} />
          <span>{isAr ? 'مكتبة الأسئلة المعتمدة للأعضاء' : 'Verified Member Question Library'}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
          {isAr ? 'أسئلة حول الله والإيمان والعقيدة' : 'Questions About God & Orthodox Faith'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '700px', margin: 0 }}>
          {isAr
            ? 'تصفح الإجابات الرعوية الرسمية، أو اطرح استفسارك الروحي بسرية وخصوصية كاملة ليجيب عنه آباء الكنيسة.'
            : 'Browse pastoral answers or submit your questions named or anonymously to receive guidance from church clergy.'}
        </p>
      </div>

      {/* Search and Category Filters */}
      <div style={{
        background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '1.2rem' }}>
          <Search size={18} style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            [isAr ? 'right' : 'left']: '14px',
            color: 'var(--text-secondary)'
          }} />
          <input
            type="text"
            placeholder={isAr ? 'ابحث في الأسئلة والإجابات والعقائد...' : 'Search questions, answers, and theological topics...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              [isAr ? 'paddingRight' : 'paddingLeft']: '42px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#ffffff',
              fontSize: '0.95rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Categories Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '7px 16px',
              borderRadius: '20px',
              border: 'none',
              background: selectedCategory === 'ALL' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.06)',
              color: selectedCategory === 'ALL' ? '#000000' : 'var(--text-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap'
            }}
          >
            {isAr ? 'الكل' : 'All Topics'}
          </button>
          {categories.map((c: any) => (
            <button
              key={c.slug}
              onClick={() => setSelectedCategory(c.slug)}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                border: 'none',
                background: selectedCategory === c.slug ? 'var(--accent-gold)' : 'rgba(255,255,255,0.06)',
                color: selectedCategory === c.slug ? '#000000' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap'
              }}
            >
              {isAr ? c.nameAr : c.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Questions Grid */}
      {loadingQuestions ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <p>{isAr ? 'جاري تحميل الأسئلة المعتمدة...' : 'Loading verified questions...'}</p>
        </div>
      ) : questions.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {questions.map((q: any) => (
            <div
              key={q.id}
              style={{
                background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                borderRadius: '14px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: 'rgba(52, 152, 219, 0.15)',
                    color: '#3498db'
                  }}>
                    {q.category ? (isAr ? q.category.nameAr : q.category.nameEn) : (isAr ? 'عقيدة وإيمان' : 'Faith')}
                  </span>
                  
                  {q.isAnonymous ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <EyeOff size={13} />
                      <span>{isAr ? 'سؤال بدون اسم' : 'Anonymous'}</span>
                    </span>
                  ) : q.authorDisplayName ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {q.authorDisplayName}
                    </span>
                  ) : null}
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.8rem 0', color: '#ffffff', lineHeight: 1.4 }}>
                  {isAr ? q.titleAr : (q.titleEn || q.titleAr)}
                </h3>

                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  margin: '0 0 1.2rem 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {isAr ? (q.answerAr || q.contentAr) : (q.answerEn || q.contentEn || q.answerAr)}
                </p>

                {/* Tags and media badges */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                  {q.mediaUrls && q.mediaUrls.length > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                      <Video size={13} />
                      <span>{isAr ? 'مرفق فيديو توضيحي' : 'Video Included'}</span>
                    </span>
                  )}
                  {q.referenceLinks && q.referenceLinks.length > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#2ecc71' }}>
                      <Link2 size={13} />
                      <span>{isAr ? 'شواهد كتابية' : 'Scripture References'}</span>
                    </span>
                  )}
                </div>
              </div>

              <Link
                href={`/fy/questions/${q.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}
              >
                <span>{isAr ? 'قراءة الإجابة الكاملة والشواهد' : 'Read Full Pastoral Answer'}</span>
                <ArrowIcon size={16} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '1rem' }}>
            {isAr ? 'لم يتم العثور على أسئلة مطابقة لبحثك.' : 'No questions found matching your search.'}
          </p>
          <button
            onClick={() => setShowAskModal(true)}
            style={{
              background: 'var(--accent-gold)',
              color: '#000000',
              fontWeight: 700,
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isAr ? 'كن أول من يطرح هذا السؤال' : 'Ask this Question Now'}
          </button>
        </div>
      )}

      {/* Modal: Ask Your Question */}
      {showAskModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#18181f',
            border: '1px solid rgba(226, 183, 20, 0.4)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            direction: isAr ? 'rtl' : 'ltr',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                {isAr ? 'طرح سؤالك الروحي والعقائدي' : 'Submit Your Question'}
              </h2>
              <button
                onClick={() => setShowAskModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CheckCircle size={48} style={{ color: '#2ecc71', margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                  {isAr ? 'تم إرسال سؤالك للمراجعة الكنسية بنجاح!' : 'Question submitted successfully!'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {isAr
                    ? 'سيقوم الآباء الكهنة بمراجعة السؤال وإعداد إجابة وافية مع الحفاظ التام على خصوصيتك وسريتك.'
                    : 'The clergy will review your question and prepare a comprehensive answer while strictly safeguarding your privacy.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitQuestion}>
                {submitError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(231, 76, 60, 0.15)',
                    border: '1px solid #e74c3c',
                    color: '#e74c3c',
                    fontSize: '0.88rem',
                    marginBottom: '1rem'
                  }}>
                    {submitError}
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'عنوان السؤال الرئيسي *' : 'Question Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'مثال: كيف نوفق بين عدل الله ورحمته؟' : 'e.g. How do we understand God’s justice and mercy?'}
                    value={questionTitle}
                    onChange={(e) => setQuestionTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'التصنيف الروحي / الموضوع' : 'Topic / Category'}
                  </label>
                  <select
                    value={submissionCategory}
                    onChange={(e) => setSubmissionCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">{isAr ? 'اختر تصنيف (اختياري)' : 'Select category (optional)'}</option>
                    {categories.map((c: any) => (
                      <option key={c.slug} value={c.slug}>
                        {isAr ? c.nameAr : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'تفاصيل السؤال أو الاستفسار *' : 'Question Details & Context *'}
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={isAr ? 'اشرح سؤالك أو الموقف بالتفصيل لمساعدة الآباء في توجيه الإجابة...' : 'Provide details or context to help the clergy provide a tailored answer...'}
                    value={questionContent}
                    onChange={(e) => setQuestionContent(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Anonymous Checkbox with Privacy Disclosure */}
                <div style={{
                  background: 'rgba(226, 183, 20, 0.08)',
                  border: '1px solid rgba(226, 183, 20, 0.25)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '1.5rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                      {isAr ? 'إرسال السؤال بدون اسم (مجهول الهوية)' : 'Submit Anonymously'}
                    </span>
                  </label>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {isAr
                      ? 'لن يظهر اسمك نهائيًا للجمهور أو لأي عضو آخر في حال نشر السؤال في مكتبة الأسئلة. يبقى السؤال باسم مجهول بالكامل.'
                      : 'Your name will never be displayed publicly or to other members if the question is approved and published.'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAskModal(false)}
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
                    disabled={submitting}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '8px',
                      background: 'var(--accent-gold)',
                      border: 'none',
                      color: '#000000',
                      fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submitting 
                      ? (isAr ? 'جاري الإرسال...' : 'Submitting...') 
                      : (isAr ? 'إرسال السؤال للمراجعة' : 'Submit Question')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
