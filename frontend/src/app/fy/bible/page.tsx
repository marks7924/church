'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Sparkles, Compass, BookMarked, Calendar, 
  ListFilter, Search, ChevronRight, ChevronLeft, ChevronDown, 
  Settings, RotateCcw, Volume2, VolumeX, CheckCircle, 
  Type, X, Check, Scale, BookmarkCheck
} from 'lucide-react';
import { API_URL } from '../../../config';
import BibleVerseToolbar from '../../../components/BibleVerseToolbar';
import BibleImageGeneratorModal from '../../../components/BibleImageGeneratorModal';
import { removeArabicTashkeel } from '../../../utils/bibleTashkeel';
import { BIBLE_BOOKS, getBookBySlug, BibleBookInfo } from '../../../utils/bibleConstants';

interface VerseItem {
  id?: string;
  verseNumber: number;
  text: string;
}

interface ChapterData {
  id?: string;
  chapterNumber: number;
  book?: {
    slug: string;
    nameAr: string;
    nameEn: string;
  };
  verses: VerseItem[];
}

export default function BiblePage() {
  // Sub-views
  const [activeTab, setActiveTab] = useState<'reader' | 'votd' | 'explorer' | 'journal' | 'plans' | 'topics'>('reader');
  
  // Translation & Current Chapter
  const [translationCode, setTranslationCode] = useState<'van-dyck' | 'kjv'>('van-dyck');
  const [bookSlug, setBookSlug] = useState<string>('mat');
  const [chapterNumber, setChapterNumber] = useState<number>(3);
  
  // Data States
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Selection & Multiverse Toolbar
  const [selectedVerses, setSelectedVerses] = useState<{ verseNumber: number; text: string }[]>([]);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [comparisonActive, setComparisonActive] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Cathedral Reading Display Settings
  const [fontSize, setFontSize] = useState<number>(24);
  const [fontFamily, setFontFamily] = useState<'Amiri' | 'Cairo'>('Amiri');
  const [includeTashkeel, setIncludeTashkeel] = useState<boolean>(true);
  const [readingTheme, setReadingTheme] = useState<'dark' | 'sepia' | 'oled'>('dark');
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState<boolean>(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [testamentFilter, setTestamentFilter] = useState<'NEW' | 'OLD'>('NEW');
  const [bookSearchQuery, setBookSearchQuery] = useState<string>('');

  // Audio Speech Synthesis
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // History & Bookmarks
  const [readingHistory, setReadingHistory] = useState<{ bookSlug: string; bookName: string; chapter: number }[]>([]);
  const [readChapters, setReadChapters] = useState<Record<string, boolean>>({});

  // Journal, Plans, Topics state
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [newJournalNote, setNewJournalNote] = useState({ reference: '', text: '', thoughts: '' });
  const [explorerQuery, setExplorerQuery] = useState('');
  const [explorerResults, setExplorerResults] = useState<any[]>([]);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [votdData, setVotdData] = useState<any>(null);
  const [votdLoading, setVotdLoading] = useState(false);

  // Load Saved Preferences on Mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedHistory = localStorage.getItem('church-bible-history');
        if (savedHistory) setReadingHistory(JSON.parse(savedHistory));

        const savedRead = localStorage.getItem('church-bible-read-chapters');
        if (savedRead) setReadChapters(JSON.parse(savedRead));

        const savedJournal = localStorage.getItem('church-bible-journal');
        if (savedJournal) setJournalEntries(JSON.parse(savedJournal));

        const savedTheme = localStorage.getItem('church-bible-theme') as any;
        if (savedTheme) setReadingTheme(savedTheme);

        const savedFontSize = localStorage.getItem('church-bible-fontsize');
        if (savedFontSize) setFontSize(parseInt(savedFontSize, 10));

        const savedFontFamily = localStorage.getItem('church-bible-fontfamily') as any;
        if (savedFontFamily) setFontFamily(savedFontFamily);

        const savedTashkeel = localStorage.getItem('church-bible-tashkeel');
        if (savedTashkeel !== null) setIncludeTashkeel(savedTashkeel === 'true');
      } catch (err) {
        console.error('Error loading preferences:', err);
      }
    }
  }, []);

  const updateFontSize = (size: number) => {
    const clamped = Math.max(18, Math.min(36, size));
    setFontSize(clamped);
    if (typeof window !== 'undefined') localStorage.setItem('church-bible-fontsize', clamped.toString());
  };

  const updateReadingTheme = (theme: 'dark' | 'sepia' | 'oled') => {
    setReadingTheme(theme);
    if (typeof window !== 'undefined') localStorage.setItem('church-bible-theme', theme);
  };

  const updateFontFamily = (family: 'Amiri' | 'Cairo') => {
    setFontFamily(family);
    if (typeof window !== 'undefined') localStorage.setItem('church-bible-fontfamily', family);
  };

  const toggleTashkeel = () => {
    const nextVal = !includeTashkeel;
    setIncludeTashkeel(nextVal);
    if (typeof window !== 'undefined') localStorage.setItem('church-bible-tashkeel', nextVal.toString());
  };

  // Resolved Book Info from static database
  const currentBookInfo: BibleBookInfo = useMemo(() => {
    return getBookBySlug(bookSlug) || {
      id: 'MAT',
      slug: 'mat',
      nameAr: 'إنجيل متى',
      nameEn: 'Matthew',
      testament: 'NEW',
      totalChapters: 28,
      categoryAr: 'الأناجيل الأربعة'
    };
  }, [bookSlug]);

  // Fetch Chapter
  const fetchChapter = (slug: string, chapter: number, translation: string) => {
    setLoading(true);
    setSelectedVerses([]);
    fetch(`${API_URL}/fy/bible/chapter?bookSlug=${slug}&chapterNumber=${chapter}&translationCode=${translation}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.verses) {
          setChapterData(data);
          const bookName = currentBookInfo.nameAr;
          const entry = {
            bookSlug: slug,
            bookName: bookName,
            chapter: chapter
          };
          setReadingHistory(prev => {
            const filtered = prev.filter(p => !(p.bookSlug === slug && p.chapter === chapter));
            const updated = [entry, ...filtered].slice(0, 10);
            if (typeof window !== 'undefined') {
              localStorage.setItem('church-bible-history', JSON.stringify(updated));
            }
            return updated;
          });
        }
      })
      .catch(err => console.error('Error fetching chapter:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (bookSlug && chapterNumber) {
      fetchChapter(bookSlug, chapterNumber, translationCode);
    }
  }, [bookSlug, chapterNumber, translationCode, currentBookInfo.nameAr]);

  // Load VOTD when tab is opened
  useEffect(() => {
    if (activeTab === 'votd' && !votdData) {
      setVotdLoading(true);
      fetch(`${API_URL}/fy/verse-of-day?translationCode=${translationCode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.verse) setVotdData(data);
        })
        .catch(err => console.error('Error fetching VOTD:', err))
        .finally(() => setVotdLoading(false));
    }
  }, [activeTab, translationCode, votdData]);

  const totalChaptersInCurrentBook = currentBookInfo.totalChapters || 28;

  // Next / Previous Chapter Navigation
  const handlePrevChapter = () => {
    if (chapterNumber > 1) {
      setChapterNumber(chapterNumber - 1);
    } else {
      const currentIndex = BIBLE_BOOKS.findIndex(b => b.slug.toLowerCase() === bookSlug.toLowerCase());
      if (currentIndex > 0) {
        const prevBook = BIBLE_BOOKS[currentIndex - 1];
        setBookSlug(prevBook.slug);
        setChapterNumber(prevBook.totalChapters || 1);
      }
    }
  };

  const handleNextChapter = () => {
    if (chapterNumber < totalChaptersInCurrentBook) {
      setChapterNumber(chapterNumber + 1);
    } else {
      const currentIndex = BIBLE_BOOKS.findIndex(b => b.slug.toLowerCase() === bookSlug.toLowerCase());
      if (currentIndex >= 0 && currentIndex < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[currentIndex + 1];
        setBookSlug(nextBook.slug);
        setChapterNumber(1);
      }
    }
  };

  // Mark Chapter as read
  const chapterKey = `${bookSlug}_${chapterNumber}`;
  const isChapterRead = !!readChapters[chapterKey];
  const toggleChapterRead = () => {
    const updated = { ...readChapters, [chapterKey]: !isChapterRead };
    setReadChapters(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('church-bible-read-chapters', JSON.stringify(updated));
    }
  };

  // Verse Selection
  const handleVerseClick = (v: VerseItem) => {
    setSelectedVerses(prev => {
      const exists = prev.some(item => item.verseNumber === v.verseNumber);
      if (exists) {
        return prev.filter(item => item.verseNumber !== v.verseNumber);
      } else {
        return [...prev, { verseNumber: v.verseNumber, text: v.text }].sort((a, b) => a.verseNumber - b.verseNumber);
      }
    });
  };

  const handleSelectAll = () => {
    if (!chapterData?.verses) return;
    if (selectedVerses.length === chapterData.verses.length) {
      setSelectedVerses([]);
    } else {
      setSelectedVerses(chapterData.verses.map(v => ({ verseNumber: v.verseNumber, text: v.text })));
    }
  };

  // Audio Recitation
  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('المتصفح لا يدعم القراءة الصوتية المباشرة.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!chapterData?.verses) return;

    const fullChapterText = chapterData.verses
      .map(v => `${v.verseNumber}: ${includeTashkeel ? v.text : removeArabicTashkeel(v.text)}`)
      .join('. ');

    const utterance = new SpeechSynthesisUtterance(fullChapterText);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.88;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Comparison Fetch
  const handleOpenComparison = async () => {
    if (comparisonActive) {
      setComparisonActive(false);
      return;
    }
    setComparisonLoading(true);
    setComparisonActive(true);
    const otherCode = translationCode === 'van-dyck' ? 'kjv' : 'van-dyck';
    try {
      const res = await fetch(`${API_URL}/fy/bible/chapter?bookSlug=${bookSlug}&chapterNumber=${chapterNumber}&translationCode=${otherCode}`);
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      }
    } catch (err) {
      console.error('Error fetching comparison:', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  // Search Action
  const handleExplorerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explorerQuery.trim()) return;
    setExplorerLoading(true);
    try {
      const res = await fetch(`${API_URL}/fy/bible/search?query=${encodeURIComponent(explorerQuery)}&translationCode=${translationCode}`);
      if (res.ok) {
        const data = await res.json();
        setExplorerResults(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setExplorerLoading(false);
    }
  };

  // Journal Save Action
  const handleSaveJournalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJournalNote.thoughts.trim()) return;

    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('ar-EG', { dateStyle: 'full' }),
      reference: newJournalNote.reference || `${currentBookInfo.nameAr} ${chapterNumber}`,
      passageText: newJournalNote.text,
      thoughts: newJournalNote.thoughts
    };

    const updated = [newEntry, ...journalEntries];
    setJournalEntries(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('church-bible-journal', JSON.stringify(updated));
    }
    setNewJournalNote({ reference: '', text: '', thoughts: '' });
    alert('تم حفظ التأمل الروحي في دفترك الخاص!');
  };

  // Filtered Books for Modal
  const filteredBooks = useMemo(() => {
    return BIBLE_BOOKS.filter(b => {
      const matchesTestament = b.testament === testamentFilter;
      const matchesSearch = !bookSearchQuery || 
        b.nameAr.toLowerCase().includes(bookSearchQuery.toLowerCase()) || 
        b.nameEn.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
        b.slug.toLowerCase().includes(bookSearchQuery.toLowerCase());
      return matchesTestament && matchesSearch;
    });
  }, [testamentFilter, bookSearchQuery]);

  // Color theme tokens
  const themeTokens = useMemo(() => {
    if (readingTheme === 'oled') {
      return {
        bg: '#000000',
        card: '#0a0a0a',
        cardBorder: '#222222',
        text: '#ffffff',
        muted: '#999999',
        gold: '#e2b714',
        verseSelected: 'rgba(226, 183, 20, 0.16)',
        badgeBg: 'rgba(226, 183, 20, 0.15)'
      };
    }
    if (readingTheme === 'sepia') {
      return {
        bg: '#181511',
        card: '#241f18',
        cardBorder: '#3b3226',
        text: '#f4efe6',
        muted: '#a89c8a',
        gold: '#e0a912',
        verseSelected: 'rgba(224, 169, 18, 0.2)',
        badgeBg: 'rgba(224, 169, 18, 0.15)'
      };
    }
    // Default Church Dark
    return {
      bg: '#0b0c10',
      card: '#1c1d26',
      cardBorder: '#2a2c3a',
      text: '#f8f9fa',
      muted: '#a0aec0',
      gold: '#e2b714',
      verseSelected: 'rgba(226, 183, 20, 0.15)',
      badgeBg: 'rgba(226, 183, 20, 0.12)'
    };
  }, [readingTheme]);

  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: themeTokens.bg,
        color: themeTokens.text,
        boxSizing: 'border-box',
        width: '100%'
      }}
      dir="rtl"
    >
      {/* Pinned Top Verse Action Toolbar */}
      {selectedVerses.length > 0 && (
        <BibleVerseToolbar
          selectedVerses={selectedVerses}
          bookName={currentBookInfo.nameAr}
          bookSlug={bookSlug}
          chapterNumber={chapterNumber}
          translationName={translationCode === 'van-dyck' ? 'فاندايك (1865)' : 'King James Version'}
          translationCode={translationCode}
          onClearSelection={() => setSelectedVerses([])}
          onOpenImageGenerator={() => setIsImageModalOpen(true)}
          onOpenStudyMode={(vNum) => {
            setActiveTab('explorer');
            setExplorerQuery(`${currentBookInfo.nameAr} ${chapterNumber}:${vNum}`);
          }}
          onOpenComparison={handleOpenComparison}
          onOpenJournalWithPassage={(passage) => {
            setNewJournalNote({
              reference: passage.reference,
              text: passage.text,
              thoughts: ''
            });
            setActiveTab('journal');
          }}
          onToggleFavorite={(passage) => {
            alert(`تم حفظ الشاهد «${currentBookInfo.nameAr} ${chapterNumber}: ${passage.verseNumber}» في قائمة مفضلاتك!`);
          }}
        />
      )}

      {/* Main Expansive Container */}
      <div 
        style={{
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: 'clamp(2rem, 4vw, 4rem) clamp(1.25rem, 3vw, 2.5rem)',
          boxSizing: 'border-box'
        }}
      >
        {/* 1. Header Section - Wide, Majestic, Cathedral Inspired */}
        <div 
          style={{
            backgroundColor: 'rgba(28, 29, 38, 0.85)',
            border: '1px solid var(--border-color, #2a2c3a)',
            borderRadius: '8px',
            padding: 'clamp(1.5rem, 3vw, 2.75rem)',
            marginBottom: '3rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.75rem',
            boxShadow: '0 12px 36px rgba(0,0,0,0.45)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '0.75rem', color: themeTokens.muted }}>
              <Link href="/fy" style={{ color: themeTokens.muted, textDecoration: 'none' }} className="hover:text-amber-400">الرئيسية</Link>
              <span>/</span>
              <span style={{ color: themeTokens.gold, fontWeight: 700 }}>الكتاب المقدس</span>
            </div>
            <h1 
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                fontWeight: 900,
                lineHeight: 1.25,
                margin: '0 0 0.5rem 0',
                background: 'linear-gradient(135deg, #ffffff 40%, var(--accent-gold, #e2b714) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.5px'
              }}
            >
              الكتاب المقدس العهد القديم والجديد
            </h1>
            <p 
              style={{ 
                fontSize: 'clamp(1rem, 1.8vw, 1.2rem)', 
                color: themeTokens.muted, 
                margin: 0,
                lineHeight: 1.8,
                wordSpacing: '2px',
                fontFamily: 'Amiri, Georgia, serif'
              }}
            >
              «كَلَامُكَ سِرَاجٌ لِرِجْلِي وَنُورٌ لِسَبِيلِي» (مزمور 119: 105)
            </p>
          </div>

          {/* Right Translation & Display Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, color: themeTokens.muted }}>الترجمة:</label>
              <select
                value={translationCode}
                onChange={e => setTranslationCode(e.target.value as any)}
                style={{
                  padding: '10px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(18, 19, 26, 0.95)',
                  border: '1px solid var(--border-color, #2a2c3a)',
                  borderRadius: '8px',
                  color: themeTokens.gold,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="van-dyck">📖 ترجمة فاندايك العربية (1865)</option>
                <option value="kjv">📜 نسخة الملك جيمس (King James Version)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)}
              style={{
                padding: '10px 20px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isDisplaySettingsOpen ? 'var(--accent-gold, #e2b714)' : 'rgba(18, 19, 26, 0.95)',
                color: isDisplaySettingsOpen ? '#000000' : '#ffffff',
                border: `1px solid ${isDisplaySettingsOpen ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Settings size={16} />
              <span>خيارات القراءة والخط</span>
            </button>
          </div>
        </div>

        {/* 2. Reading Options Drawer (When Opened) */}
        {isDisplaySettingsOpen && (
          <div 
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.96)',
              border: '1px solid var(--accent-gold, #e2b714)',
              borderRadius: '8px',
              padding: 'clamp(1.5rem, 3vw, 2.5rem)',
              marginBottom: '3rem',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #2a2c3a)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '1.1rem', color: themeTokens.gold }}>
                <Type size={20} />
                <span>لوحة التحكم في القراءة والطبوغرافيا</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsDisplaySettingsOpen(false)}
                style={{ padding: '6px 10px', background: 'transparent', color: '#a0aec0', border: '1px solid var(--border-color, #2a2c3a)', borderRadius: '6px', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
              {/* Reading Theme */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: themeTokens.muted, display: 'block', marginBottom: '12px' }}>
                  1. وضع الألوان والتباين:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {(['dark', 'sepia', 'oled'] as const).map(th => {
                    const active = readingTheme === th;
                    const labels = { dark: 'داكن كنسي', sepia: 'مخطوطات', oled: 'OLED صافي' };
                    return (
                      <button
                        key={th}
                        type="button"
                        onClick={() => updateReadingTheme(th)}
                        style={{
                          padding: '10px 8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: `1px solid ${active ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                          backgroundColor: active ? 'var(--accent-gold, #e2b714)' : '#12131a',
                          color: active ? '#000000' : '#f8f9fa',
                          cursor: 'pointer'
                        }}
                      >
                        {labels[th]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: themeTokens.muted, display: 'block', marginBottom: '12px' }}>
                  2. مقاس خط الآيات: ({fontSize}px)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => updateFontSize(fontSize - 2)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontWeight: 800,
                      fontSize: '1rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(18, 19, 26, 0.95)',
                      border: '1px solid var(--border-color, #2a2c3a)',
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    − A
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: themeTokens.gold, minWidth: '40px', textAlign: 'center' }}>
                    {fontSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateFontSize(fontSize + 2)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontWeight: 800,
                      fontSize: '1rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(18, 19, 26, 0.95)',
                      border: '1px solid var(--border-color, #2a2c3a)',
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    + A
                  </button>
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: themeTokens.muted, display: 'block', marginBottom: '12px' }}>
                  3. نوع الخط:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['Amiri', 'Cairo'] as const).map(fam => {
                    const active = fontFamily === fam;
                    return (
                      <button
                        key={fam}
                        type="button"
                        onClick={() => updateFontFamily(fam)}
                        style={{
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          border: `1px solid ${active ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                          backgroundColor: active ? 'var(--accent-gold, #e2b714)' : 'rgba(18, 19, 26, 0.95)',
                          color: active ? '#000000' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        {fam === 'Amiri' ? 'كنسي (Amiri)' : 'حديث (Cairo)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tashkeel */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: themeTokens.muted, display: 'block', marginBottom: '12px' }}>
                  4. حركات التشكيل:
                </label>
                <button
                  type="button"
                  onClick={toggleTashkeel}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    backgroundColor: includeTashkeel ? 'rgba(226, 183, 20, 0.15)' : 'rgba(18, 19, 26, 0.95)',
                    border: `1px solid ${includeTashkeel ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                    color: includeTashkeel ? 'var(--accent-gold, #e2b714)' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{includeTashkeel ? 'التشكيل مُفَعّل (كامل)' : 'بدون تشكيل (مريح)'}</span>
                  <Check size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. The 6 Features Navigation Grid - Spacious, Majestic Cathedral Cards */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '1.25rem',
            marginBottom: '3.5rem'
          }}
        >
          {[
            { id: 'reader', label: 'القارئ والإصحاحات', icon: BookOpen },
            { id: 'votd', label: 'آية اليوم والتأمل', icon: Sparkles },
            { id: 'explorer', label: 'المستكشف والبحث', icon: Compass },
            { id: 'journal', label: 'دفتري الروحي', icon: BookMarked },
            { id: 'plans', label: 'خطط القراءة', icon: Calendar },
            { id: 'topics', label: 'موضوعات الآيات', icon: ListFilter }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  minHeight: '100px',
                  padding: '1.5rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  border: `1px solid ${isActive ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                  borderRadius: '8px',
                  backgroundColor: isActive ? 'var(--accent-gold, #e2b714)' : 'rgba(28, 29, 38, 0.85)',
                  color: isActive ? '#000000' : '#f8f9fa',
                  boxShadow: isActive ? '0 10px 28px rgba(226, 183, 20, 0.3)' : '0 4px 16px rgba(0,0,0,0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  wordSpacing: '1px'
                }}
              >
                <Icon size={24} />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.3px' }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* -------------------- TAB 1: SCRIPTURE READER -------------------- */}
        {activeTab === 'reader' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {/* Quick Resume Strip */}
            {readingHistory.length > 0 && (
              <div 
                style={{
                  backgroundColor: 'rgba(28, 29, 38, 0.6)',
                  border: '1px solid var(--border-color, #2a2c3a)',
                  borderRadius: '8px',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  overflowX: 'auto'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: themeTokens.muted, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCcw size={14} style={{ color: themeTokens.gold }} />
                  متابعة القراءة:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {readingHistory.slice(0, 4).map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setBookSlug(h.bookSlug);
                        setChapterNumber(h.chapter);
                      }}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        backgroundColor: (bookSlug === h.bookSlug && chapterNumber === h.chapter) 
                          ? 'rgba(226, 183, 20, 0.2)' 
                          : 'rgba(18, 19, 26, 0.9)',
                        border: `1px solid ${(bookSlug === h.bookSlug && chapterNumber === h.chapter) ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                        color: themeTokens.gold,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {h.bookName} {h.chapter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grand Cathedral Scripture Navigation Hero Deck */}
            <div 
              style={{
                backgroundColor: 'rgba(28, 29, 38, 0.85)',
                border: '1px solid var(--border-color, #2a2c3a)',
                borderRadius: '8px',
                padding: 'clamp(1.75rem, 3.5vw, 3rem)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)'
              }}
            >
              {/* Previous Chapter */}
              <button
                type="button"
                onClick={handlePrevChapter}
                style={{
                  padding: '14px 26px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  backgroundColor: 'rgba(18, 19, 26, 0.95)',
                  border: '1px solid var(--border-color, #2a2c3a)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ChevronRight size={20} style={{ color: themeTokens.gold }} />
                <span>الإصحاح السابق</span>
              </button>

              {/* Grand Book & Chapter Center Command Button */}
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(true)}
                  style={{
                    padding: '14px 32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(18, 19, 26, 0.98)',
                    border: '1px solid var(--accent-gold, #e2b714)',
                    boxShadow: '0 8px 30px rgba(226, 183, 20, 0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  title="انقر لتصفح واختيار أي سفر أو إصحاح"
                >
                  <span 
                    style={{
                      fontFamily: 'Amiri, Georgia, serif',
                      fontWeight: 900,
                      fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                      color: themeTokens.gold
                    }}
                  >
                    {currentBookInfo.nameAr}
                  </span>
                  <span style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', fontWeight: 800, color: '#ffffff' }}>
                    الإصحاح {chapterNumber}
                  </span>
                  <ChevronDown size={22} style={{ color: themeTokens.gold }} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px', fontSize: '0.85rem', color: themeTokens.muted }}>
                  <span>{currentBookInfo.testament === 'NEW' ? 'العهد الجديد' : 'العهد القديم'}</span>
                  <span>•</span>
                  <span>{translationCode === 'van-dyck' ? 'ترجمة فاندايك' : 'King James Version'}</span>
                  <span>•</span>
                  <span>{chapterData?.verses?.length || 0} آية</span>
                </div>
              </div>

              {/* Next Chapter */}
              <button
                type="button"
                onClick={handleNextChapter}
                style={{
                  padding: '14px 26px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  backgroundColor: 'rgba(18, 19, 26, 0.95)',
                  border: '1px solid var(--border-color, #2a2c3a)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>الإصحاح التالي</span>
                <ChevronLeft size={20} style={{ color: themeTokens.gold }} />
              </button>
            </div>

            {/* Quick Action Tools Bar */}
            <div 
              style={{
                backgroundColor: 'rgba(28, 29, 38, 0.65)',
                border: '1px solid var(--border-color, #2a2c3a)',
                borderRadius: '8px',
                padding: '1rem 1.75rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    backgroundColor: 'rgba(18, 19, 26, 0.9)',
                    border: '1px solid var(--border-color, #2a2c3a)',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {selectedVerses.length === chapterData?.verses?.length ? 'إلغاء تحديد الكل' : 'تحديد كل آيات الإصحاح'}
                </button>

                <button
                  type="button"
                  onClick={handleOpenComparison}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    backgroundColor: comparisonActive ? 'rgba(147, 51, 234, 0.3)' : 'rgba(147, 51, 234, 0.15)',
                    border: '1px solid rgba(147, 51, 234, 0.4)',
                    color: '#c084fc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Scale size={15} />
                  <span>{comparisonActive ? 'إغلاق المقارنة' : 'مقارنة الترجمتين'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleSpeech}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    backgroundColor: isSpeaking ? 'var(--accent-gold, #e2b714)' : 'rgba(18, 19, 26, 0.9)',
                    border: `1px solid ${isSpeaking ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                    color: isSpeaking ? '#000000' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  <span>{isSpeaking ? 'إيقاف الاستماع' : 'استماع صوتي للإصحاح'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={toggleChapterRead}
                style={{
                  padding: '8px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  backgroundColor: isChapterRead ? 'rgba(46, 204, 113, 0.15)' : 'rgba(18, 19, 26, 0.9)',
                  border: `1px solid ${isChapterRead ? '#2ecc71' : 'var(--border-color, #2a2c3a)'}`,
                  color: isChapterRead ? '#2ecc71' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle size={15} />
                <span>{isChapterRead ? 'تمت قراءة الإصحاح' : 'تعليم كمقروء'}</span>
              </button>
            </div>

            {/* Verses Canvas - Comfortable, Balanced Manuscript Reading with Perfect Breathing Room */}
            <div 
              style={{
                backgroundColor: 'rgba(28, 29, 38, 0.85)',
                border: '1px solid var(--border-color, #2a2c3a)',
                borderRadius: '8px',
                padding: 'clamp(1.5rem, 3.5vw, 2.75rem) clamp(1.25rem, 3.5vw, 2.5rem)',
                boxShadow: '0 16px 50px rgba(0,0,0,0.55)',
                fontFamily: fontFamily === 'Amiri' ? 'Amiri, Georgia, serif' : 'var(--font-arabic, Cairo, sans-serif)',
                minHeight: '400px'
              }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                  <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: themeTokens.muted }}>جاري تحميل نصوص الإصحاح المقدس...</p>
                </div>
              ) : chapterData?.verses?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', fontSize: '0.95rem', color: themeTokens.muted }}>
                  لا توجد آيات متوفرة لهذا الإصحاح حالياً.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {chapterData?.verses?.map(v => {
                    const isSelected = selectedVerses.some(item => item.verseNumber === v.verseNumber);
                    const displayText = includeTashkeel ? v.text : removeArabicTashkeel(v.text);

                    return (
                      <div
                        key={v.id || v.verseNumber}
                        id={`v-${v.verseNumber}`}
                        onClick={() => handleVerseClick(v)}
                        style={{
                          borderRadius: '8px',
                          backgroundColor: isSelected ? themeTokens.verseSelected : 'transparent',
                          border: `1px solid ${isSelected ? themeTokens.gold : 'transparent'}`,
                          borderRight: isSelected ? `5px solid ${themeTokens.gold}` : '1px solid transparent',
                          padding: '0.9rem 1.25rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1.15rem',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 4px 18px rgba(226, 183, 20, 0.2)' : 'none'
                        }}
                      >
                        {/* Golden Square Badge */}
                        <span
                          style={{
                            width: '34px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '0.92rem',
                            flexShrink: 0,
                            marginTop: '4px',
                            borderRadius: '6px',
                            backgroundColor: isSelected ? themeTokens.gold : themeTokens.badgeBg,
                            color: isSelected ? '#000000' : themeTokens.gold,
                            border: `1px solid ${isSelected ? themeTokens.gold : 'rgba(226, 183, 20, 0.35)'}`,
                            userSelect: 'none'
                          }}
                        >
                          {v.verseNumber}
                        </span>

                        {/* Verse Text: Balanced Word Spacing & Line Height */}
                        <p
                          style={{
                            flex: 1,
                            margin: 0,
                            fontSize: `${fontSize}px`,
                            lineHeight: 2.35,
                            wordSpacing: '2.5px',
                            letterSpacing: '0.2px',
                            color: themeTokens.text
                          }}
                        >
                          {displayText}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Chapter Bar */}
            <div 
              style={{
                backgroundColor: 'rgba(28, 29, 38, 0.85)',
                border: '1px solid var(--border-color, #2a2c3a)',
                borderRadius: '8px',
                padding: '1.25rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <button
                type="button"
                onClick={handlePrevChapter}
                style={{
                  padding: '10px 22px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  backgroundColor: 'rgba(18, 19, 26, 0.95)',
                  border: '1px solid var(--border-color, #2a2c3a)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ChevronRight size={16} style={{ color: themeTokens.gold }} />
                <span>الإصحاح السابق</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: themeTokens.gold,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ↑ الرجوع لأعلى الإصحاح
              </button>

              <button
                type="button"
                onClick={handleNextChapter}
                style={{
                  padding: '10px 22px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  backgroundColor: 'rgba(18, 19, 26, 0.95)',
                  border: '1px solid var(--border-color, #2a2c3a)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>الإصحاح التالي</span>
                <ChevronLeft size={16} style={{ color: themeTokens.gold }} />
              </button>
            </div>
          </div>
        )}

        {/* -------------------- TAB 2: VERSE OF THE DAY -------------------- */}
        {activeTab === 'votd' && (
          <div 
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.85)',
              border: '1px solid var(--border-color, #2a2c3a)',
              borderRadius: '8px',
              padding: 'clamp(2rem, 4vw, 3.5rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #2a2c3a)', paddingBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: themeTokens.gold }}>
                  آية اليوم المباركة والتأمل الروحي
                </h3>
                <p style={{ fontSize: '0.9rem', color: themeTokens.muted, margin: '6px 0 0 0' }}>
                  غذاء روحي يومي من كلمة الله الحية لدعم مسيرتك
                </p>
              </div>
              <BookmarkCheck size={32} style={{ color: themeTokens.gold }} />
            </div>

            {votdLoading ? (
              <p style={{ textAlign: 'center', padding: '3rem 0', color: themeTokens.muted }}>جاري تحميل آية اليوم...</p>
            ) : votdData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div 
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    border: '1px solid var(--accent-gold, #e2b714)',
                    borderRadius: '8px',
                    padding: '2.5rem',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
                  }}
                >
                  <blockquote 
                    style={{ 
                      fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', 
                      fontWeight: 700, 
                      lineHeight: 2.2, 
                      wordSpacing: '4px',
                      color: '#ffffff',
                      fontFamily: 'Amiri, Georgia, serif',
                      margin: '0 0 1rem 0'
                    }}
                  >
                    «{votdData.verse?.text}»
                  </blockquote>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: themeTokens.gold }}>
                    — {votdData.verse?.chapter?.book?.nameAr} {votdData.verse?.chapterNumber}: {votdData.verse?.verseNumber}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ padding: '1.5rem', backgroundColor: 'rgba(18, 19, 26, 0.8)', border: '1px solid var(--border-color, #2a2c3a)', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: themeTokens.gold }}>التأمل الروحي</h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 2, wordSpacing: '2px', color: themeTokens.text }}>
                      {votdData.devotionalTextAr || 'الله معنا في كل خطوة، وقوته تتجلى في ضعفنا لنعيش منتصرين بنعمته كل يوم.'}
                    </p>
                  </div>

                  <div style={{ padding: '1.5rem', backgroundColor: 'rgba(18, 19, 26, 0.8)', border: '1px solid var(--border-color, #2a2c3a)', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: themeTokens.gold }}>سؤال التطبيق العملي</h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 2, wordSpacing: '2px', color: themeTokens.text }}>
                      {votdData.reflectionQuestionAr || 'كيف يمكنك تطبيق هذه الوصية في تعاملاتك وتحدياتك اليومية؟'}
                    </p>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setBookSlug(votdData.verse?.chapter?.book?.slug || 'php');
                      setChapterNumber(votdData.verse?.chapterNumber || 4);
                      setActiveTab('reader');
                    }}
                    style={{
                      padding: '12px 28px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      borderRadius: '8px',
                      backgroundColor: 'var(--accent-gold, #e2b714)',
                      color: '#000000',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    قراءة الإصحاح كاملاً في القارئ
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* -------------------- TAB 3: EXPLORER -------------------- */}
        {activeTab === 'explorer' && (
          <div 
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.85)',
              border: '1px solid var(--border-color, #2a2c3a)',
              borderRadius: '8px',
              padding: 'clamp(2rem, 4vw, 3.5rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem'
            }}
          >
            <div style={{ borderBottom: '1px solid var(--border-color, #2a2c3a)', paddingBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: themeTokens.gold }}>
                المستكشف والبحث المتقدم في الأسفار
              </h3>
              <p style={{ fontSize: '0.9rem', color: themeTokens.muted, margin: '6px 0 0 0' }}>
                ابحث عن أي آية، كلمة، أو شاهد مباشر في العهدين
              </p>
            </div>

            <form onSubmit={handleExplorerSearch} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={explorerQuery}
                onChange={e => setExplorerQuery(e.target.value)}
                placeholder="اكتب كلمة البحث أو الشاهد الكتابي هنا..."
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  fontSize: '0.95rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(18, 19, 26, 0.95)',
                  border: '1px solid var(--border-color, #2a2c3a)',
                  color: '#ffffff',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={explorerLoading}
                style={{
                  padding: '14px 32px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-gold, #e2b714)',
                  color: '#000000',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Search size={18} />
                <span>{explorerLoading ? 'جاري البحث...' : 'بحث'}</span>
              </button>
            </form>

            {explorerResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: themeTokens.gold }}>
                  نتائج البحث ({explorerResults.length} آية مطابقة):
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {explorerResults.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        if (item.bookSlug) setBookSlug(item.bookSlug);
                        if (item.chapterNumber) setChapterNumber(item.chapterNumber);
                        setActiveTab('reader');
                      }}
                      style={{
                        padding: '1.25rem 1.5rem',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(18, 19, 26, 0.8)',
                        border: '1px solid var(--border-color, #2a2c3a)',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: themeTokens.gold, display: 'block', marginBottom: '6px' }}>
                        {item.bookName} {item.chapterNumber}:{item.verseNumber}
                      </span>
                      <p style={{ margin: 0, fontSize: '1.1rem', lineHeight: 2, wordSpacing: '3px', fontFamily: 'Amiri, Georgia, serif', color: '#ffffff' }}>
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------- TAB 4: JOURNAL -------------------- */}
        {activeTab === 'journal' && (
          <div 
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.85)',
              border: '1px solid var(--border-color, #2a2c3a)',
              borderRadius: '8px',
              padding: 'clamp(2rem, 4vw, 3.5rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem'
            }}
          >
            <div style={{ borderBottom: '1px solid var(--border-color, #2a2c3a)', paddingBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: themeTokens.gold }}>
                دفتري الروحي وتأملاتي الشخصية
              </h3>
              <p style={{ fontSize: '0.9rem', color: themeTokens.muted, margin: '6px 0 0 0' }}>
                مساحتك الروحية الخاصة لتدوين ثمار قراءتك وخواطرك
              </p>
            </div>

            <form onSubmit={handleSaveJournalNote} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: themeTokens.muted, display: 'block', marginBottom: '8px' }}>
                  الشاهد الكتابي أو الموضوع:
                </label>
                <input
                  type="text"
                  value={newJournalNote.reference}
                  onChange={e => setNewJournalNote({ ...newJournalNote, reference: e.target.value })}
                  placeholder="مثال: إنجيل متى 5: 14"
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    border: '1px solid var(--border-color, #2a2c3a)',
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: themeTokens.muted, display: 'block', marginBottom: '8px' }}>
                  خواطري وتأملاتي الروحية:
                </label>
                <textarea
                  rows={4}
                  value={newJournalNote.thoughts}
                  onChange={e => setNewJournalNote({ ...newJournalNote, thoughts: e.target.value })}
                  placeholder="اكتب ما لمس قلبك اليوم خلال قراءتك للكتاب المقدس..."
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    fontSize: '0.95rem',
                    lineHeight: 2,
                    wordSpacing: '2px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    border: '1px solid var(--border-color, #2a2c3a)',
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  style={{
                    padding: '12px 28px',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-gold, #e2b714)',
                    color: '#000000',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  حفظ التأمل في دفتري
                </button>
              </div>
            </form>
          </div>
        )}

        {/* -------------------- TAB 5: PLANS -------------------- */}
        {activeTab === 'plans' && (
          <div 
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.85)',
              border: '1px solid var(--border-color, #2a2c3a)',
              borderRadius: '8px',
              padding: 'clamp(2rem, 4vw, 3.5rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem'
            }}
          >
            <div style={{ borderBottom: '1px solid var(--border-color, #2a2c3a)', paddingBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: themeTokens.gold }}>
                خطط القراءة المنهجية للكتاب المقدس
              </h3>
              <p style={{ fontSize: '0.9rem', color: themeTokens.muted, margin: '6px 0 0 0' }}>
                اختر الخطة المناسبة لك لمتابعة قراءة كلمة الله بانتظام
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {[
                { title: 'خطة قراءة العهد الجديد في ٩٠ يوماً', count: '٢٧ سفراً', desc: 'قراءة ٣ إصحاحات يومياً لإنهاء العهد الجديد بالكامل في ٣ أشهر.' },
                { title: 'خطة قراءة الكتاب المقدس كاملاً في عام', count: '٦٦ سفراً', desc: 'قراءة متوازنة تجمع فصولاً من العهدين القديم والجديد يومياً.' },
                { title: 'خطة المزامير والأناجيل في الصوم', count: 'المزامير + الأناجيل', desc: 'خطة مخصصة لمواسم الأصوام والصلوات لتعميق الحياة التأملية.' }
              ].map((plan, i) => (
                <div 
                  key={i}
                  style={{
                    padding: '1.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(18, 19, 26, 0.9)',
                    border: '1px solid var(--border-color, #2a2c3a)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '4px 10px', borderRadius: '4px', backgroundColor: 'rgba(226, 183, 20, 0.12)', color: themeTokens.gold }}>
                      {plan.count}
                    </span>
                    <h4 style={{ margin: '14px 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>{plan.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.8, color: themeTokens.muted }}>{plan.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBookSlug('mat');
                      setChapterNumber(1);
                      setActiveTab('reader');
                    }}
                    style={{
                      padding: '10px 18px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      backgroundColor: 'var(--accent-gold, #e2b714)',
                      color: '#000000',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    بدء الخطة الآن
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- TAB 6: TOPICS -------------------- */}
        {activeTab === 'topics' && (
          <div 
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.85)',
              border: '1px solid var(--border-color, #2a2c3a)',
              borderRadius: '8px',
              padding: 'clamp(2rem, 4vw, 3.5rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem'
            }}
          >
            <div style={{ borderBottom: '1px solid var(--border-color, #2a2c3a)', paddingBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: themeTokens.gold }}>
                موضوعات الآيات والقرائن الكتابية
              </h3>
              <p style={{ fontSize: '0.9rem', color: themeTokens.muted, margin: '6px 0 0 0' }}>
                آيات مختارة مبوبة بحسب الاحتياج الروحي وظروف الحياة
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {[
                { title: 'السلام الداخلي والاطمئنان', ref: 'يوحنا 14: 27' },
                { title: 'الرجاء وقت الضيق والتجارب', ref: 'رومية 8: 28' },
                { title: 'المحبة المسيحية الأصيلة', ref: '1 كورنثوس 13: 4' },
                { title: 'الإيمان وقوة الصلاة', ref: 'مرقس 11: 24' },
                { title: 'الغفران والتسامح', ref: 'أفسس 4: 32' },
                { title: 'التوبة ونقاوة القلب', ref: 'مزمور 51: 10' },
                { title: 'القوة والتعزية الإلهية', ref: 'إشعياء 40: 31' },
                { title: 'الشكر وحمد الرب دائماً', ref: '1 تسالونيكي 5: 18' }
              ].map((topic, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setExplorerQuery(topic.title);
                    setActiveTab('explorer');
                  }}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(18, 19, 26, 0.9)',
                    border: '1px solid var(--border-color, #2a2c3a)',
                    cursor: 'pointer'
                  }}
                >
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 800, color: themeTokens.gold }}>
                    {topic.title}
                  </h4>
                  <span style={{ fontSize: '0.85rem', fontFamily: 'Amiri, Georgia, serif', color: '#cbd5e1' }}>
                    شاهد مقترح: {topic.ref}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* -------------------- BOOK & CHAPTER MODAL -------------------- */}
      {isBookModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)'
          }}
          dir="rtl"
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '960px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(18, 19, 26, 0.98)',
              border: '1px solid var(--accent-gold, #e2b714)',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.9)'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color, #2a2c3a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: themeTokens.gold }}>
                  فهرس أسفار وإصحاحات الكتاب المقدس
                </h3>
                <p style={{ fontSize: '0.85rem', color: themeTokens.muted, margin: '4px 0 0 0' }}>
                  اختر السفر المطلوب ثم حدد رقم الإصحاح للقراءة الفورية
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsBookModalOpen(false)}
                style={{ padding: '6px 10px', background: 'transparent', color: '#a0aec0', border: '1px solid var(--border-color, #2a2c3a)', borderRadius: '6px', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Controls */}
            <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-color, #2a2c3a)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTestamentFilter('NEW')}
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    borderRadius: '6px',
                    border: `1px solid ${testamentFilter === 'NEW' ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                    backgroundColor: testamentFilter === 'NEW' ? 'var(--accent-gold, #e2b714)' : 'transparent',
                    color: testamentFilter === 'NEW' ? '#000000' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  العهد الجديد (٢٧ سفراً)
                </button>
                <button
                  type="button"
                  onClick={() => setTestamentFilter('OLD')}
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    borderRadius: '6px',
                    border: `1px solid ${testamentFilter === 'OLD' ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                    backgroundColor: testamentFilter === 'OLD' ? 'var(--accent-gold, #e2b714)' : 'transparent',
                    color: testamentFilter === 'OLD' ? '#000000' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  العهد القديم (٣٩ سفراً)
                </button>
              </div>

              <input
                type="text"
                value={bookSearchQuery}
                onChange={e => setBookSearchQuery(e.target.value)}
                placeholder="ابحث باسم السفر..."
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(28, 29, 38, 0.9)',
                  border: '1px solid var(--border-color, #2a2c3a)',
                  color: '#ffffff',
                  outline: 'none',
                  minWidth: '220px'
                }}
              />
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: themeTokens.gold, display: 'block', marginBottom: '12px' }}>
                  قائمة الأسفار:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                  {filteredBooks.map(b => {
                    const isSelected = b.slug.toLowerCase() === bookSlug.toLowerCase();
                    return (
                      <button
                        key={b.slug}
                        type="button"
                        onClick={() => {
                          setBookSlug(b.slug);
                          setChapterNumber(1);
                        }}
                        style={{
                          padding: '12px 14px',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          borderRadius: '6px',
                          border: `1px solid ${isSelected ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                          backgroundColor: isSelected ? 'var(--accent-gold, #e2b714)' : 'rgba(28, 29, 38, 0.8)',
                          color: isSelected ? '#000000' : '#f8f9fa',
                          cursor: 'pointer',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}
                      >
                        {b.nameAr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color, #2a2c3a)', paddingTop: '1.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: themeTokens.gold, display: 'block', marginBottom: '12px' }}>
                  إصحاحات {currentBookInfo.nameAr} ({totalChaptersInCurrentBook} إصحاح):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: '8px' }}>
                  {Array.from({ length: totalChaptersInCurrentBook }, (_, i) => i + 1).map(ch => {
                    const isCurrent = ch === chapterNumber;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => {
                          setChapterNumber(ch);
                          setIsBookModalOpen(false);
                          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{
                          height: '46px',
                          fontWeight: 800,
                          fontSize: '1rem',
                          borderRadius: '6px',
                          border: `1px solid ${isCurrent ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)'}`,
                          backgroundColor: isCurrent ? 'var(--accent-gold, #e2b714)' : 'rgba(28, 29, 38, 0.9)',
                          color: isCurrent ? '#000000' : '#f8f9fa',
                          cursor: 'pointer'
                        }}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verse Image Generator Modal */}
      {isImageModalOpen && selectedVerses.length > 0 && (
        <BibleImageGeneratorModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          selectedVerses={selectedVerses}
          bookName={currentBookInfo.nameAr}
          chapterNumber={chapterNumber}
        />
      )}
    </div>
  );
}
