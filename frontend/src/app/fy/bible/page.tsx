'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from '../../../components/ThemeContext';
import { 
  BookOpen, ChevronLeft, ChevronRight, CheckCircle2, Bookmark, 
  ArrowLeft, ArrowRight, Share2, Sparkles, SlidersHorizontal, BookMarked 
} from 'lucide-react';
import { API_URL } from '../../../config';

function BibleReaderContent() {
  const { language } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAr = language === 'ar';

  const [translationCode, setTranslationCode] = useState<string>('van-dyck');
  const [books, setBooks] = useState<any[]>([]);
  const [selectedTestament, setSelectedTestament] = useState<'NEW' | 'OLD'>('NEW');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapterData, setChapterData] = useState<any>(null);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [verseOfDay, setVerseOfDay] = useState<any>(null);

  // User reading progress state
  const [isChapterCompleted, setIsChapterCompleted] = useState(false);
  const [progressSummary, setProgressSummary] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load token & books on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('church-token');
      setToken(storedToken);
    }

    // Fetch available books
    fetch(`${API_URL}/fy/bible/books`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBooks(data);
          // Check URL query parameters
          const bookParam = searchParams.get('book');
          const chapParam = searchParams.get('chapter');
          
          let initialBook = null;
          if (bookParam) {
            initialBook = data.find(b => b.slug === bookParam || b.code === bookParam);
          }
          if (!initialBook) {
            // Default to John (New Testament)
            initialBook = data.find(b => b.slug === 'john') || data[0];
          }
          
          if (initialBook) {
            setSelectedBook(initialBook);
            setSelectedTestament(initialBook.testament);
            if (chapParam) {
              setSelectedChapter(parseInt(chapParam) || 1);
            }
          }
        }
      })
      .catch(err => console.error('Error fetching books:', err));

    // Fetch Verse of the Day
    fetch(`${API_URL}/fy/verse-of-day?translationCode=${translationCode}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.verse) setVerseOfDay(data.verse);
      })
      .catch(err => console.error('Error fetching verse of day:', err));
  }, [translationCode]);

  // Fetch chapter data when book, chapter, or translation changes
  useEffect(() => {
    if (!selectedBook) return;

    setLoadingChapter(true);
    fetch(`${API_URL}/fy/bible/chapter?bookSlug=${selectedBook.slug}&chapterNumber=${selectedChapter}&translationCode=${translationCode}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.chapter) {
          setChapterData(data.chapter);
        } else {
          setChapterData(null);
        }
      })
      .catch(err => {
        console.error('Error fetching chapter:', err);
        setChapterData(null);
      })
      .finally(() => setLoadingChapter(false));

    // Check reading progress if authenticated
    if (token) {
      fetch(`${API_URL}/fy/reading-progress?translationCode=${translationCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.progress) {
            setProgressSummary(data);
            const isCompleted = data.progress.some(
              (p: any) => p.bookSlug === selectedBook.slug && p.chapterNumber === selectedChapter && p.completed
            );
            setIsChapterCompleted(isCompleted);
          }
        })
        .catch(err => console.error('Error reading progress:', err));
    }
  }, [selectedBook, selectedChapter, translationCode, token]);

  const handleToggleComplete = async () => {
    if (!token) {
      alert(isAr ? 'يرجى تسجيل الدخول لحفظ تقدم القراءة في حسابك الشخصي.' : 'Please log in to track reading progress.');
      return;
    }
    if (!selectedBook) return;

    const newStatus = !isChapterCompleted;
    setIsChapterCompleted(newStatus);

    try {
      const res = await fetch(`${API_URL}/fy/reading-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bookSlug: selectedBook.slug,
          chapterNumber: selectedChapter,
          translationCode,
          completed: newStatus
        })
      });
      if (res.ok) {
        // Refresh summary
        const data = await res.json();
        // Update local count
        setProgressSummary((prev: any) => ({
          ...prev,
          completedChaptersCount: newStatus 
            ? (prev?.completedChaptersCount || 0) + 1 
            : Math.max(0, (prev?.completedChaptersCount || 1) - 1)
        }));
      }
    } catch (err) {
      console.error('Failed to update reading progress:', err);
    }
  };

  const handleBookChange = (bookSlug: string) => {
    const book = books.find(b => b.slug === bookSlug);
    if (book) {
      setSelectedBook(book);
      setSelectedChapter(1);
    }
  };

  const filteredBooks = books.filter(b => b.testament === selectedTestament);

  return (
    <div style={{
      minHeight: '85vh',
      padding: 'clamp(1rem, 3vw, 2.5rem) clamp(0.75rem, 2vw, 1.5rem)',
      maxWidth: '1100px',
      margin: '0 auto',
      direction: isAr ? 'rtl' : 'ltr'
    }}>
      {/* Top Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
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

        {/* Translation Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {isAr ? 'الترجمة:' : 'Translation:'}
          </span>
          <select
            value={translationCode}
            onChange={(e) => setTranslationCode(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--card-bg, #1a1a20)',
              border: '1px solid rgba(226, 183, 20, 0.4)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="van-dyck">الكتاب المقدس (فان دايك — العربية)</option>
            <option value="kjv">King James Version (KJV — English)</option>
          </select>
        </div>
      </div>

      {/* Reader Controls Panel */}
      <div style={{
        background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        {/* Testament Switcher Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
          <button
            onClick={() => {
              setSelectedTestament('NEW');
              const firstNew = books.find(b => b.testament === 'NEW');
              if (firstNew) {
                setSelectedBook(firstNew);
                setSelectedChapter(1);
              }
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: selectedTestament === 'NEW' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
              color: selectedTestament === 'NEW' ? '#000000' : 'var(--text-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {isAr ? 'العهد الجديد' : 'New Testament'}
          </button>
          <button
            onClick={() => {
              setSelectedTestament('OLD');
              const firstOld = books.find(b => b.testament === 'OLD');
              if (firstOld) {
                setSelectedBook(firstOld);
                setSelectedChapter(1);
              }
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: selectedTestament === 'OLD' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
              color: selectedTestament === 'OLD' ? '#000000' : 'var(--text-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {isAr ? 'العهد القديم' : 'Old Testament'}
          </button>

          {/* Reading progress badge if authenticated */}
          {token && progressSummary && (
            <div style={{
              marginInlineStart: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              color: 'var(--accent-gold)',
              background: 'rgba(226, 183, 20, 0.1)',
              padding: '4px 12px',
              borderRadius: '16px'
            }}>
              <CheckCircle2 size={14} />
              <span>
                {isAr 
                  ? `أكملت قراءة ${progressSummary.completedChaptersCount || 0} إصحاح`
                  : `${progressSummary.completedChaptersCount || 0} chapters completed`}
              </span>
            </div>
          )}
        </div>

        {/* Book Selector and Chapter Selector Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          alignItems: 'center'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {isAr ? 'اختر السفر:' : 'Select Book:'}
            </label>
            <select
              value={selectedBook?.slug || ''}
              onChange={(e) => handleBookChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(226, 183, 20, 0.3)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {filteredBooks.map(b => (
                <option key={b.slug} value={b.slug}>
                  {isAr ? b.nameAr : b.nameEn} ({b.totalChapters} {isAr ? 'إصحاح' : 'ch.'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {isAr ? 'الإصحاح:' : 'Chapter:'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                disabled={selectedChapter <= 1}
                onClick={() => setSelectedChapter(prev => Math.max(1, prev - 1))}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: selectedChapter <= 1 ? 'rgba(255,255,255,0.3)' : '#ffffff',
                  cursor: selectedChapter <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
              
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(226, 183, 20, 0.3)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {Array.from({ length: selectedBook?.totalChapters || 1 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    {isAr ? `الإصحاح ${num}` : `Chapter ${num}`}
                  </option>
                ))}
              </select>

              <button
                disabled={selectedChapter >= (selectedBook?.totalChapters || 1)}
                onClick={() => setSelectedChapter(prev => prev + 1)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: selectedChapter >= (selectedBook?.totalChapters || 1) ? 'rgba(255,255,255,0.3)' : '#ffffff',
                  cursor: selectedChapter >= (selectedBook?.totalChapters || 1) ? 'not-allowed' : 'pointer'
                }}
              >
                {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Text Reading Canvas */}
      <div style={{
        background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        borderRadius: '16px',
        padding: 'clamp(1.5rem, 4vw, 3rem)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        position: 'relative'
      }}>
        {/* Chapter Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '1.2rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              {isAr ? selectedBook?.nameAr : selectedBook?.nameEn} — {isAr ? `الإصحاح ${selectedChapter}` : `Chapter ${selectedChapter}`}
            </h1>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {translationCode === 'van-dyck' ? 'ترجمة فان دايك الأصلية المعربة' : 'King James Version'}
            </span>
          </div>

          {/* Mark Complete Checkbox */}
          <button
            onClick={handleToggleComplete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: isChapterCompleted ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${isChapterCompleted ? '#2ecc71' : 'rgba(255, 255, 255, 0.15)'}`,
              color: isChapterCompleted ? '#2ecc71' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.88rem',
              transition: 'all 0.2s ease'
            }}
          >
            <CheckCircle2 size={18} />
            <span>
              {isChapterCompleted 
                ? (isAr ? 'تمت قراءة الإصحاح ✓' : 'Chapter Completed ✓')
                : (isAr ? 'تحديد كمقروء' : 'Mark as Read')}
            </span>
          </button>
        </div>

        {/* Verses Flow */}
        {loadingChapter ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
            <p>{isAr ? 'جاري تحميل آيات الإصحاح المبارك...' : 'Loading Scripture verses...'}</p>
          </div>
        ) : chapterData && chapterData.verses && chapterData.verses.length > 0 ? (
          <div style={{
            fontSize: 'clamp(1.15rem, 2.2vw, 1.35rem)',
            lineHeight: 2.2,
            color: '#e4e4e7',
            textAlign: 'justify'
          }}>
            {chapterData.verses.map((v: any) => (
              <span key={v.id} style={{ marginInlineEnd: '8px' }}>
                <sup style={{
                  color: 'var(--accent-gold)',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  padding: '0 4px',
                  userSelect: 'none'
                }}>
                  {v.verseNumber}
                </sup>
                <span>{v.text} </span>
              </span>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              {isAr 
                ? 'جاري مزامنة باقي أسفار وإصحاحات الترجمة مع قاعدة البيانات الرسمية.' 
                : 'Scripture verses for this chapter are syncing from the official text database.'}
            </p>
            <button
              onClick={() => {
                const john = books.find(b => b.slug === 'john');
                if (john) {
                  setSelectedBook(john);
                  setSelectedChapter(1);
                }
              }}
              style={{
                background: 'var(--accent-gold)',
                color: '#000000',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'قراءة إنجيل يوحنا الإصحاح الأول المعتمد' : 'Read Verified John 1'}
            </button>
          </div>
        )}

        {/* Bottom Pagination Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '3rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <button
            disabled={selectedChapter <= 1}
            onClick={() => {
              setSelectedChapter(prev => Math.max(1, prev - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: selectedChapter <= 1 ? 'rgba(255,255,255,0.3)' : '#ffffff',
              cursor: selectedChapter <= 1 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span>{isAr ? 'الإصحاح السابق' : 'Previous Chapter'}</span>
          </button>

          <button
            disabled={selectedChapter >= (selectedBook?.totalChapters || 1)}
            onClick={() => {
              setSelectedChapter(prev => prev + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: selectedChapter >= (selectedBook?.totalChapters || 1) ? 'rgba(255,255,255,0.3)' : '#ffffff',
              cursor: selectedChapter >= (selectedBook?.totalChapters || 1) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            <span>{isAr ? 'الإصحاح التالي' : 'Next Chapter'}</span>
            {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BibleReaderPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}>Loading Bible Reader...</div>}>
      <BibleReaderContent />
    </Suspense>
  );
}
