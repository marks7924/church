'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from '../../../components/ThemeContext';
import { 
  BookOpen, ChevronLeft, ChevronRight, CheckCircle2, Bookmark, 
  ArrowLeft, ArrowRight, Share2, Sparkles, SlidersHorizontal, BookMarked,
  Search, Scale, Compass, Calendar, Check, X, RotateCcw, ListFilter,
  Type, AlignJustify, Eye, Info, Volume2, VolumeX, Moon, Sun, Coffee,
  Settings, ChevronDown, CheckCircle, Copy, Layers, Filter
} from 'lucide-react';
import { API_URL } from '../../../config';
import BibleImageGeneratorModal from '../../../components/BibleImageGeneratorModal';
import BibleVerseToolbar from '../../../components/BibleVerseToolbar';
import BibleStudyDrawer from '../../../components/BibleStudyDrawer';
import BibleTranslationComparison from '../../../components/BibleTranslationComparison';
import BibleJournalView from '../../../components/BibleJournalView';
import BibleReadingPlansView from '../../../components/BibleReadingPlansView';
import BibleTopicDiscoveryView from '../../../components/BibleTopicDiscoveryView';
import BibleExplorerView from '../../../components/BibleExplorerView';
import BibleVerseOfDayView from '../../../components/BibleVerseOfDayView';
import { removeArabicTashkeel, formatVerseRange, copyToClipboard } from '../../../utils/bibleTashkeel';

function BibleReaderContent() {
  const { language } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAr = language === 'ar';

  // Navigation Sub-Views
  const [activeView, setActiveView] = useState<'reader' | 'votd' | 'explorer' | 'journal' | 'plans' | 'topics'>('reader');

  // Reader Core State
  const [translationCode, setTranslationCode] = useState<string>('van-dyck');
  const [books, setBooks] = useState<any[]>([]);
  const [selectedTestament, setSelectedTestament] = useState<'NEW' | 'OLD'>('NEW');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapterData, setChapterData] = useState<any>(null);
  const [loadingChapter, setLoadingChapter] = useState(false);

  // Selector Modal / Drawer
  const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);
  const [bookPickerSearch, setBookPickerSearch] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Eye-friendly Reading Customization
  const [readingTheme, setReadingTheme] = useState<'dark' | 'sepia' | 'oled'>('dark');
  const [fontSize, setFontSize] = useState<number>(20); // 16 to 28
  const [fontFamily, setFontFamily] = useState<'amiri' | 'cairo' | 'system'>('amiri');
  const [lineSpacing, setLineSpacing] = useState<'normal' | 'relaxed' | 'loose'>('loose');
  const [includeTashkeel, setIncludeTashkeel] = useState<boolean>(true);
  const [readerWidth, setReaderWidth] = useState<'normal' | 'wide'>('normal');

  // Multi-verse selection state
  const [selectedVerses, setSelectedVerses] = useState<{ verseNumber: number; text: string }[]>([]);

  // Modals & Drawers State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalVerseData, setImageModalVerseData] = useState<{
    verseNumber: number;
    text: string;
    bookName?: string;
    chapterNumber?: number;
    reference?: string;
    translationName?: string;
  } | null>(null);

  const [isStudyDrawerOpen, setIsStudyDrawerOpen] = useState(false);
  const [studyVerseNumber, setStudyVerseNumber] = useState<number>(1);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [journalPassageData, setJournalPassageData] = useState<{ reference: string; text: string; bookSlug: string; chapter: number } | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // User reading progress state
  const [isChapterCompleted, setIsChapterCompleted] = useState(false);
  const [progressSummary, setProgressSummary] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [recentPassages, setRecentPassages] = useState<{ bookSlug: string; bookName: string; chapter: number }[]>([]);

  // Audio recitation state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Load token & books on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('church-token');
      setToken(storedToken);

      try {
        const storedRecents = localStorage.getItem('church-recent-passages');
        if (storedRecents) setRecentPassages(JSON.parse(storedRecents));

        const savedTheme = localStorage.getItem('church-bible-theme');
        if (savedTheme && ['dark', 'sepia', 'oled'].includes(savedTheme)) {
          setReadingTheme(savedTheme as any);
        }

        const savedFontSize = localStorage.getItem('church-bible-fontsize');
        if (savedFontSize) setFontSize(Number(savedFontSize));

        const savedTashkeel = localStorage.getItem('church-bible-tashkeel');
        if (savedTashkeel !== null) setIncludeTashkeel(savedTashkeel === 'true');
      } catch {}
    }

    // Fetch available books
    fetch(`${API_URL}/fy/bible/books`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const normalized = data.map((b: any) => {
            const chapters = b.totalChapters || b.chapterCount || 1;
            return {
              ...b,
              totalChapters: chapters,
              chapterCount: chapters
            };
          });
          setBooks(normalized);

          // Check URL query parameters
          const bookParam = searchParams.get('book');
          const chapParam = searchParams.get('chapter');
          const viewParam = searchParams.get('view');
          if (viewParam && ['reader', 'votd', 'explorer', 'journal', 'plans', 'topics'].includes(viewParam)) {
            setActiveView(viewParam as any);
          }

          let initialBook = null;
          if (bookParam) {
            initialBook = normalized.find((b: any) => 
              b.slug?.toLowerCase() === bookParam.toLowerCase() || 
              b.id?.toLowerCase() === bookParam.toLowerCase()
            );
          }
          if (!initialBook) {
            initialBook = normalized.find((b: any) => 
              b.slug?.toUpperCase() === 'MAT' || 
              b.id?.toUpperCase() === 'MAT'
            ) || normalized[0];
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
  }, []);

  // Fetch chapter data when book, chapter, or translation changes
  useEffect(() => {
    if (!selectedBook) return;

    // Stop speaking if moving chapters
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setSelectedVerses([]); // Reset selection when moving chapters
    setLoadingChapter(true);
    fetch(`${API_URL}/fy/bible/chapter?bookSlug=${selectedBook.slug}&chapterNumber=${selectedChapter}&translationCode=${translationCode}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.chapter) {
          setChapterData(data.chapter);

          // Save to local recent passages
          if (typeof window !== 'undefined') {
            const newRecent = {
              bookSlug: selectedBook.slug,
              bookName: isAr ? selectedBook.nameAr : selectedBook.nameEn,
              chapter: selectedChapter
            };
            setRecentPassages(prev => {
              const filtered = prev.filter(r => !(r.bookSlug === newRecent.bookSlug && r.chapter === newRecent.chapter));
              const updated = [newRecent, ...filtered].slice(0, 6);
              try { localStorage.setItem('church-recent-passages', JSON.stringify(updated)); } catch {}
              return updated;
            });
          }
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
              (p: any) => p.bookSlug?.toLowerCase() === selectedBook.slug?.toLowerCase() && p.chapterNumber === selectedChapter && p.completed
            );
            setIsChapterCompleted(isCompleted);
          }
        })
        .catch(err => console.error('Error reading progress:', err));
    }
  }, [selectedBook, selectedChapter, translationCode, token, isAr]);

  // Handle Search Submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const res = await fetch(`${API_URL}/fy/bible/search?q=${encodeURIComponent(searchQuery.trim())}&translationCode=${translationCode}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Group books by canonical biblical sections
  const booksBySection = useMemo(() => {
    const currentTestamentBooks = books.filter(b => b.testament === selectedTestament);
    const filtered = bookPickerSearch.trim()
      ? currentTestamentBooks.filter(b => 
          (b.nameAr && b.nameAr.includes(bookPickerSearch.trim())) ||
          (b.nameEn && b.nameEn.toLowerCase().includes(bookPickerSearch.trim().toLowerCase()))
        )
      : currentTestamentBooks;

    const groups = new Map<string, any[]>();
    for (const b of filtered) {
      const sectionKey = isAr ? (b.sectionAr || 'الأسفار الكنسية') : (b.sectionEn || 'Biblical Books');
      if (!groups.has(sectionKey)) groups.set(sectionKey, []);
      groups.get(sectionKey)!.push(b);
    }
    return Array.from(groups.entries()).map(([sectionTitle, bList]) => ({
      sectionTitle,
      books: bList
    }));
  }, [books, selectedTestament, bookPickerSearch, isAr]);

  // Toggle single verse selection
  const handleVerseClick = (verse: { verseNumber: number; text: string }) => {
    setSelectedVerses(prev => {
      const exists = prev.some(v => v.verseNumber === verse.verseNumber);
      if (exists) {
        return prev.filter(v => v.verseNumber !== verse.verseNumber);
      } else {
        const updated = [...prev, verse];
        return updated.sort((a, b) => a.verseNumber - b.verseNumber);
      }
    });
  };

  const handleSelectAllChapter = () => {
    if (!chapterData?.verses) return;
    if (selectedVerses.length === chapterData.verses.length) {
      setSelectedVerses([]);
    } else {
      setSelectedVerses(chapterData.verses.map((v: any) => ({
        verseNumber: v.verseNumber,
        text: v.text
      })));
    }
  };

  // Navigate to passage helper
  const handleNavigateToPassage = (bookSlug: string, chapter: number) => {
    const targetBook = books.find(b => 
      b.slug?.toLowerCase() === bookSlug?.toLowerCase() || 
      b.code?.toLowerCase() === bookSlug?.toLowerCase() || 
      b.id?.toLowerCase() === bookSlug?.toLowerCase()
    );
    if (targetBook) {
      setSelectedBook(targetBook);
      setSelectedTestament(targetBook.testament);
      setSelectedChapter(chapter);
      setActiveView('reader');
      setShowSearchResults(false);
      setIsBookPickerOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Audio Speech Recitation
  const toggleSpeechRecitation = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('المتصفح لا يدعم القراءة الصوتية المباشرة.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!chapterData?.verses || chapterData.verses.length === 0) return;

    const fullChapterText = chapterData.verses.map((v: any) => `الآية ${v.verseNumber}: ${v.text}`).join('. ');
    const cleanText = removeArabicTashkeel(fullChapterText);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = translationCode === 'kjv' ? 'en-US' : 'ar-SA';
    utterance.rate = 0.9;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

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
        setProgressSummary((prev: any) => ({
          ...prev,
          completedChaptersCount: newStatus 
            ? (prev?.completedChaptersCount || 0) + 1 
            : Math.max(0, (prev?.completedChaptersCount || 1) - 1)
        }));
      }
    } catch (err) {
      console.error('Error toggling progress:', err);
      setIsChapterCompleted(!newStatus);
    }
  };

  const currentBookName = selectedBook ? (isAr ? selectedBook.nameAr : selectedBook.nameEn) : '';
  const currentTranslationName = translationCode === 'van-dyck' ? (isAr ? 'ترجمة فاندايك (1865)' : 'Smith & Van Dyck (1865)') : 'King James Version (KJV)';

  // Eye-friendly styles based on reading theme
  const themeStyles = useMemo(() => {
    if (readingTheme === 'sepia') {
      return {
        bg: '#181511',
        cardBg: 'rgba(32, 28, 22, 0.85)',
        text: '#f7edd8',
        subtext: '#c9bca4',
        border: 'rgba(202, 160, 90, 0.25)',
        verseBadgeBg: 'rgba(217, 155, 38, 0.15)',
        verseBadgeText: '#e8b04a',
        selectedBg: 'rgba(217, 155, 38, 0.18)',
        selectedBorder: 'rgba(217, 155, 38, 0.5)'
      };
    }
    if (readingTheme === 'oled') {
      return {
        bg: '#000000',
        cardBg: 'rgba(15, 15, 15, 0.95)',
        text: '#ffffff',
        subtext: '#a1a1aa',
        border: 'rgba(255, 255, 255, 0.15)',
        verseBadgeBg: 'rgba(255, 255, 255, 0.1)',
        verseBadgeText: '#E2B714',
        selectedBg: 'rgba(226, 183, 20, 0.18)',
        selectedBorder: '#E2B714'
      };
    }
    // Default: Luxury Dark Church Theme
    return {
      bg: 'var(--bg-primary, #0b0c13)',
      cardBg: 'rgba(20, 22, 32, 0.75)',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: 'rgba(226, 183, 20, 0.22)',
      verseBadgeBg: 'rgba(226, 183, 20, 0.12)',
      verseBadgeText: '#E2B714',
      selectedBg: 'rgba(226, 183, 20, 0.15)',
      selectedBorder: 'rgba(226, 183, 20, 0.45)'
    };
  }, [readingTheme]);

  return (
    <div 
      className="min-h-screen py-6 px-3 sm:px-6 w-full transition-colors duration-300" 
      style={{ 
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        backgroundColor: themeStyles.bg,
        color: themeStyles.text,
        boxSizing: 'border-box'
      }}
    >
      {/* 1. TOP HEADER & BREADCRUMB BAR */}
      <div 
        className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3.5 rounded-2xl backdrop-blur-md border transition-all"
        style={{
          backgroundColor: themeStyles.cardBg,
          borderColor: themeStyles.border
        }}
      >
        <div className="flex items-center gap-2 text-xs">
          <Link href="/fy" className="text-slate-400 hover:text-amber-400 transition font-medium">
            {isAr ? 'الرئيسية' : 'Home'}
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-amber-400 font-bold flex items-center gap-1.5">
            <BookOpen size={14} />
            {isAr ? 'الكتاب المقدس' : 'Holy Bible'}
          </span>
          {activeView !== 'reader' && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-slate-300 font-medium">
                {activeView === 'votd' && (isAr ? 'آية اليوم والتأمل' : 'Verse of the Day')}
                {activeView === 'explorer' && (isAr ? 'المستكشف الكتابي' : 'Bible Explorer')}
                {activeView === 'journal' && (isAr ? 'دفتري الروحي' : 'Spiritual Journal')}
                {activeView === 'plans' && (isAr ? 'خطط القراءة' : 'Reading Plans')}
                {activeView === 'topics' && (isAr ? 'موضوعات الآيات' : 'Scripture Topics')}
              </span>
            </>
          )}
        </div>

        {/* Translation Switcher & Quick Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Translation Dropdown */}
          <div className="relative">
            <select
              value={translationCode}
              onChange={(e) => setTranslationCode(e.target.value)}
              className="py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer appearance-none pr-7 pl-3 focus:outline-none focus:border-amber-500 shadow-sm"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                borderColor: themeStyles.border,
                color: '#E2B714'
              }}
            >
              <option value="van-dyck">📖 {isAr ? 'ترجمة فاندايك (1865)' : 'Smith & Van Dyck (1865)'}</option>
              <option value="kjv">📜 {isAr ? 'نسخة الملك جيمس (KJV)' : 'King James Version (KJV)'}</option>
            </select>
            <ChevronDown size={13} className="absolute left-2.5 top-2.5 text-amber-400 pointer-events-none" />
          </div>

          {/* Quick Search Toggle Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(prev => !prev)}
            className={`p-2 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
              isSearchOpen ? 'bg-amber-500 text-slate-950 border-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            style={{ borderColor: isSearchOpen ? undefined : themeStyles.border }}
            title={isAr ? 'البحث السريع في الآيات' : 'Search Scripture'}
          >
            <Search size={14} />
            <span className="hidden sm:inline">{isAr ? 'بحث' : 'Search'}</span>
          </button>

          {/* Reading Display Settings Popover Toggle */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(prev => !prev)}
            className={`p-2 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
              isSettingsOpen ? 'bg-amber-500 text-slate-950 border-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            style={{ borderColor: isSettingsOpen ? undefined : themeStyles.border }}
            title={isAr ? 'تخصيص مظهر القراءة والخط' : 'Display Preferences'}
          >
            <Settings size={14} />
            <span className="hidden sm:inline">{isAr ? 'المظهر' : 'Settings'}</span>
          </button>
        </div>
      </div>

      {/* 2. READING PREFERENCES DRAWER (When Settings is open) */}
      {isSettingsOpen && (
        <div 
          className="mb-6 p-4 rounded-2xl border shadow-xl backdrop-blur-xl animate-in fade-in duration-200"
          style={{
            backgroundColor: themeStyles.cardBg,
            borderColor: themeStyles.border
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b mb-3.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <SlidersHorizontal size={14} />
              {isAr ? 'تخصيص تجربة القراءة والراحة البصرية' : 'Reading Display Preferences'}
            </span>
            <button 
              type="button" 
              onClick={() => setIsSettingsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Theme: Dark / Sepia / OLED */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                {isAr ? 'الوضع المريح للعين:' : 'Reading Theme:'}
              </label>
              <div className="flex rounded-xl p-1 bg-slate-900/80 border border-slate-700/60 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setReadingTheme('dark');
                    try { localStorage.setItem('church-bible-theme', 'dark'); } catch {}
                  }}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                    readingTheme === 'dark' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon size={12} /> {isAr ? 'ليلي' : 'Dark'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReadingTheme('sepia');
                    try { localStorage.setItem('church-bible-theme', 'sepia'); } catch {}
                  }}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                    readingTheme === 'sepia' ? 'bg-[#d99b26] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Coffee size={12} /> {isAr ? 'دافئ' : 'Sepia'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReadingTheme('oled');
                    try { localStorage.setItem('church-bible-theme', 'oled'); } catch {}
                  }}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                    readingTheme === 'oled' ? 'bg-zinc-100 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⬛ {isAr ? 'أوليد' : 'OLED'}
                </button>
              </div>
            </div>

            {/* Font Size Steppers */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-400">
                  {isAr ? 'حجم الخط:' : 'Font Size:'}
                </label>
                <span className="text-xs text-amber-400 font-bold">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(16, fontSize - 2);
                    setFontSize(next);
                    try { localStorage.setItem('church-bible-fontsize', String(next)); } catch {}
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 flex-1 flex items-center justify-center"
                >
                  A-
                </button>
                <input 
                  type="range"
                  min={16}
                  max={30}
                  step={2}
                  value={fontSize}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setFontSize(next);
                    try { localStorage.setItem('church-bible-fontsize', String(next)); } catch {}
                  }}
                  className="flex-2 accent-amber-500 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(30, fontSize + 2);
                    setFontSize(next);
                    try { localStorage.setItem('church-bible-fontsize', String(next)); } catch {}
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 flex-1 flex items-center justify-center"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Tashkeel Toggle */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                {isAr ? 'التشكيل والحركات:' : 'Diacritics (Tashkeel):'}
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = !includeTashkeel;
                  setIncludeTashkeel(next);
                  try { localStorage.setItem('church-bible-tashkeel', String(next)); } catch {}
                }}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-between ${
                  includeTashkeel
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700'
                }`}
              >
                <span>{includeTashkeel ? (isAr ? 'مُشَكَّل كامل' : 'With Tashkeel') : (isAr ? 'نص مبسط بدون تشكيل' : 'Plain Text')}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono">
                  {includeTashkeel ? 'بَـ' : 'بـ'}
                </span>
              </button>
            </div>

            {/* Reading Width */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                {isAr ? 'عرض صفحة القراءة:' : 'Reading Width:'}
              </label>
              <div className="flex rounded-xl p-1 bg-slate-900/80 border border-slate-700/60 gap-1">
                <button
                  type="button"
                  onClick={() => setReaderWidth('normal')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                    readerWidth === 'normal' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isAr ? 'مُريح مركز' : 'Standard'}
                </button>
                <button
                  type="button"
                  onClick={() => setReaderWidth('wide')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                    readerWidth === 'wide' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isAr ? 'عرض كامل' : 'Wide'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SPOTLIGHT SEARCH OVERLAY (When Search is open) */}
      {isSearchOpen && (
        <div 
          className="mb-6 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: themeStyles.cardBg,
            borderColor: themeStyles.border
          }}
        >
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute right-3.5 top-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder={isAr ? 'ابحث عن آية، كلمة، أو شاهد مباشر (مثال: يوحنا 3: 16 أو مزمور 23)...' : 'Search verse, keyword or passage (e.g. John 3:16)...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-3 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {isSearching ? 'جاري البحث...' : (isAr ? 'بحث' : 'Search')}
            </button>
          </form>

          {/* Live Search Results Container */}
          {showSearchResults && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 mb-2 text-xs">
                <span className="font-bold text-amber-400">
                  {isAr ? `نتائج البحث (${searchResults.length} آية مطابقة)` : `Search Results (${searchResults.length} verses)`}
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowSearchResults(false)}
                  className="text-slate-400 hover:text-white"
                >
                  إخفاء النتائج
                </button>
              </div>

              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">لا توجد نتائج مطابقة لبحثك.</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        handleNavigateToPassage(res.bookSlug, res.chapterNumber);
                        setIsSearchOpen(false);
                      }}
                      className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
                        <span>{res.referenceAr}</span>
                        <span className="text-[11px] text-slate-400">{res.referenceEn}</span>
                      </div>
                      <p className="text-xs text-slate-200 font-serif leading-relaxed line-clamp-2">
                        «{res.text}»
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. MAIN 6-SYSTEMS SEGMENTED PILL BAR */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {[
          { key: 'reader', label: isAr ? 'القارئ والإصحاحات' : 'Bible Reader', icon: BookOpen },
          { key: 'votd', label: isAr ? 'آية اليوم والتأمل' : 'Verse of the Day', icon: Sparkles },
          { key: 'explorer', label: isAr ? 'المستكشف الكتابي' : 'Bible Explorer', icon: Compass },
          { key: 'journal', label: isAr ? 'دفتري الروحي' : 'Spiritual Journal', icon: BookMarked },
          { key: 'plans', label: isAr ? 'خطط القراءة' : 'Reading Plans', icon: Calendar },
          { key: 'topics', label: isAr ? 'موضوعات الآيات' : 'Scripture Topics', icon: ListFilter }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveView(tab.key as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-lg scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              style={{
                backgroundColor: isActive ? undefined : themeStyles.cardBg,
                borderColor: isActive ? undefined : themeStyles.border
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. SUB-VIEWS RENDERING */}
      {activeView === 'votd' && (
        <BibleVerseOfDayView
          onNavigateToPassage={handleNavigateToPassage}
          onOpenImageForVerse={(verse) => {
            setImageModalVerseData(verse);
            setIsImageModalOpen(true);
          }}
          onToggleFavorite={async ({ verseNumber, text }) => {
            if (!token) return alert(isAr ? 'يرجى تسجيل الدخول لحفظ المفضلة.' : 'Please log in.');
            await fetch(`${API_URL}/fy/bible/favorites`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ bookSlug: 'php', chapterNumber: 4, verseNumber, text, toggle: true })
            });
          }}
        />
      )}

      {activeView === 'explorer' && (
        <BibleExplorerView onNavigateToPassage={handleNavigateToPassage} />
      )}

      {activeView === 'journal' && (
        <BibleJournalView 
          token={token} 
          initialPassage={journalPassageData}
          onClearInitialPassage={() => setJournalPassageData(null)}
          onNavigateToPassage={handleNavigateToPassage}
        />
      )}

      {activeView === 'plans' && (
        <BibleReadingPlansView 
          token={token}
          onNavigateToPassage={handleNavigateToPassage}
        />
      )}

      {activeView === 'topics' && (
        <BibleTopicDiscoveryView
          onNavigateToPassage={handleNavigateToPassage}
          onOpenImageForVerse={(verse) => {
            setImageModalVerseData(verse);
            setIsImageModalOpen(true);
          }}
        />
      )}

      {/* 6. MAIN SCRIPTURE READER VIEW */}
      {activeView === 'reader' && (
        <div className="space-y-6">
          {/* Quick Continue Reading Pill Bar */}
          {recentPassages.length > 0 && (
            <div className="flex items-center gap-2 text-xs overflow-x-auto scrollbar-none py-1 px-1">
              <span className="text-slate-400 font-semibold whitespace-nowrap flex items-center gap-1 shrink-0">
                <RotateCcw size={12} className="text-amber-400" /> {isAr ? 'متابعة سريعة:' : 'Recent:'}
              </span>
              {recentPassages.map((rec, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleNavigateToPassage(rec.bookSlug, rec.chapter)}
                  className="px-3 py-1 rounded-xl text-xs font-bold border whitespace-nowrap transition hover:scale-105"
                  style={{
                    backgroundColor: themeStyles.cardBg,
                    borderColor: themeStyles.border,
                    color: '#E2B714'
                  }}
                >
                  {rec.bookName} {rec.chapter}
                </button>
              ))}
            </div>
          )}

          {/* SCRIPTURE HERO NAVIGATION CAPSULE */}
          <div 
            className="p-4 md:p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-xl transition-all"
            style={{
              backgroundColor: themeStyles.cardBg,
              borderColor: themeStyles.border
            }}
          >
            {/* Prev Chapter Button */}
            <button
              type="button"
              disabled={selectedChapter <= 1}
              onClick={() => setSelectedChapter(c => Math.max(1, c - 1))}
              className="w-full md:w-auto py-2.5 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 border disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                borderColor: themeStyles.border,
                color: themeStyles.text
              }}
            >
              <ChevronRight size={18} className="text-amber-400" />
              <span>{isAr ? 'الإصحاح السابق' : 'Prev Chapter'}</span>
            </button>

            {/* Central Book & Chapter Capsule Trigger */}
            <div className="flex flex-col items-center justify-center text-center">
              <button
                type="button"
                onClick={() => setIsBookPickerOpen(prev => !prev)}
                className="group py-2 px-5 rounded-2xl border transition-all flex items-center gap-2 hover:scale-[1.02] shadow-md"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  borderColor: 'rgba(226, 183, 20, 0.4)'
                }}
              >
                <span className="font-serif font-black text-lg md:text-2xl text-amber-400 group-hover:text-amber-300">
                  {currentBookName}
                </span>
                <span className="text-sm md:text-base font-bold text-slate-300">
                  {isAr ? `الإصحاح ${selectedChapter}` : `Chapter ${selectedChapter}`}
                </span>
                <ChevronDown size={18} className="text-amber-400 transition group-hover:translate-y-0.5" />
              </button>

              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <span>{currentTranslationName}</span>
                <span>•</span>
                <span>{chapterData?.totalVerses || chapterData?.verses?.length || 0} {isAr ? 'آية' : 'verses'}</span>
                {isChapterCompleted && (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5 mr-1">
                    <CheckCircle2 size={13} /> {isAr ? 'مقروء' : 'Read'}
                  </span>
                )}
              </div>
            </div>

            {/* Next Chapter Button */}
            <button
              type="button"
              disabled={selectedBook && selectedChapter >= selectedBook.totalChapters}
              onClick={() => setSelectedChapter(c => c + 1)}
              className="w-full md:w-auto py-2.5 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 border disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                borderColor: themeStyles.border,
                color: themeStyles.text
              }}
            >
              <span>{isAr ? 'الإصحاح التالي' : 'Next Chapter'}</span>
              <ChevronLeft size={18} className="text-amber-400" />
            </button>
          </div>

          {/* 7. COLLAPSIBLE SMART BOOK & CHAPTER PICKER DRAWER */}
          {isBookPickerOpen && (
            <div 
              className="p-5 md:p-6 rounded-3xl border shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200"
              style={{
                backgroundColor: themeStyles.cardBg,
                borderColor: themeStyles.border
              }}
            >
              {/* Drawer Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                    <BookOpen size={16} />
                    {isAr ? 'اختر السفر والإصحاح' : 'Select Book & Chapter'}
                  </span>
                </div>

                {/* Testament Switcher */}
                <div className="flex rounded-xl p-1 bg-slate-900 border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSelectedTestament('NEW')}
                    className={`px-4 py-1.5 rounded-lg transition ${
                      selectedTestament === 'NEW' 
                        ? 'bg-amber-500 text-slate-950 shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isAr ? 'العهد الجديد (٢٧)' : 'New Testament (27)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTestament('OLD')}
                    className={`px-4 py-1.5 rounded-lg transition ${
                      selectedTestament === 'OLD' 
                        ? 'bg-amber-500 text-slate-950 shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isAr ? 'العهد القديم (٣٩)' : 'Old Testament (39)'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBookPickerOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Book Filter Search */}
              <div className="my-4">
                <input 
                  type="text"
                  placeholder={isAr ? 'ابحث عن سفر: متى، يوحنا، مزمور...' : 'Filter books...'}
                  value={bookPickerSearch}
                  onChange={(e) => setBookPickerSearch(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Categorized Books Matrix */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {booksBySection.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-2">
                    <div className="text-[11px] font-bold text-amber-400/90 border-r-2 border-amber-500 pr-2">
                      {section.sectionTitle}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {section.books.map((b) => {
                        const isSelected = selectedBook?.slug === b.slug;
                        return (
                          <button
                            key={b.slug}
                            type="button"
                            onClick={() => {
                              setSelectedBook(b);
                              setSelectedChapter(1);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                              isSelected 
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105' 
                                : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            {isAr ? b.nameAr : b.nameEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chapter Grid for the chosen book */}
              {selectedBook && (
                <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-amber-400">
                      {isAr ? `إصحاحات ${selectedBook.nameAr} (${selectedBook.totalChapters} إصحاح):` : `Chapters (${selectedBook.totalChapters}):`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {Array.from({ length: selectedBook.totalChapters || 1 }).map((_, i) => {
                      const cNum = i + 1;
                      const isSelected = selectedChapter === cNum;
                      return (
                        <button
                          key={cNum}
                          type="button"
                          onClick={() => {
                            setSelectedChapter(cNum);
                            setIsBookPickerOpen(false);
                          }}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center border ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105'
                              : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {cNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 8. SCRIPTURE VERSES READING CONTAINER */}
          <div 
            className={`mx-auto space-y-5 transition-all ${
              readerWidth === 'wide' ? 'w-full' : 'max-w-4xl'
            }`}
          >
            {/* Action Bar (Mark completed, Audio, Compare, Select All) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Select All */}
                <button
                  type="button"
                  onClick={handleSelectAllChapter}
                  className="px-3 py-1.5 rounded-xl border font-semibold transition hover:bg-slate-800"
                  style={{
                    backgroundColor: themeStyles.cardBg,
                    borderColor: themeStyles.border,
                    color: themeStyles.text
                  }}
                >
                  {selectedVerses.length === (chapterData?.verses?.length || 0)
                    ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All')
                    : (isAr ? 'تحديد كل آيات الإصحاح' : 'Select all verses')}
                </button>

                {/* Compare Translations */}
                <button
                  type="button"
                  onClick={() => setIsComparisonOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold transition flex items-center gap-1.5"
                >
                  <Scale size={13} />
                  <span>{isAr ? 'مقارنة الترجمات' : 'Compare'}</span>
                </button>

                {/* Audio Recitation */}
                <button
                  type="button"
                  onClick={toggleSpeechRecitation}
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition flex items-center gap-1.5 ${
                    isSpeaking 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' 
                      : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700'
                  }`}
                  title={isAr ? 'استماع لنص الإصحاح' : 'Audio Reading'}
                >
                  {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span>{isSpeaking ? (isAr ? 'إيقاف الاستماع' : 'Stop') : (isAr ? 'استماع صوتي' : 'Listen')}</span>
                </button>
              </div>

              {/* Mark Chapter Completed */}
              <button
                type="button"
                onClick={handleToggleComplete}
                className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition border ${
                  isChapterCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 size={15} />
                <span>{isChapterCompleted ? (isAr ? 'تمت قراءة الإصحاح' : 'Completed') : (isAr ? 'تعليم كمقروء' : 'Mark as Read')}</span>
              </button>
            </div>

            {/* Scripture Verses Card */}
            <div 
              className={`p-6 md:p-10 rounded-3xl border shadow-2xl relative transition-all ${
                translationCode === 'kjv' ? 'text-left font-sans' : 'text-right'
              }`}
              style={{
                backgroundColor: themeStyles.cardBg,
                borderColor: themeStyles.border,
                fontFamily: fontFamily === 'amiri' ? '"Amiri", serif' : (fontFamily === 'cairo' ? '"Cairo", sans-serif' : 'system-ui')
              }}
              dir={translationCode === 'kjv' ? 'ltr' : 'rtl'}
            >
              {loadingChapter ? (
                <div className="py-24 text-center text-slate-400 text-sm">
                  {isAr ? 'جاري تحميل نص الإصحاح بدقة عالية...' : 'Loading chapter verses...'}
                </div>
              ) : !chapterData?.verses || chapterData.verses.length === 0 ? (
                <div className="py-24 text-center text-slate-400 text-sm">
                  {isAr ? 'لم يتم العثور على آيات لهذا الإصحاح.' : 'No verses found for this chapter.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {chapterData.verses.map((v: any) => {
                    const isSelected = selectedVerses.some(sv => sv.verseNumber === v.verseNumber);
                    const displayText = includeTashkeel ? v.text : removeArabicTashkeel(v.text);

                    return (
                      <div
                        key={v.verseNumber}
                        id={`v-${v.verseNumber}`}
                        onClick={() => handleVerseClick(v)}
                        className={`group p-3.5 rounded-2xl cursor-pointer transition-all duration-150 select-text flex items-start gap-3.5 border ${
                          isSelected
                            ? 'shadow-md scale-[1.008]'
                            : 'hover:bg-slate-800/25 border-transparent'
                        }`}
                        style={{
                          backgroundColor: isSelected ? themeStyles.selectedBg : undefined,
                          borderColor: isSelected ? themeStyles.selectedBorder : 'transparent'
                        }}
                      >
                        {/* Golden Verse Number Badge */}
                        <span 
                          className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 mt-1 select-none transition ${
                            isSelected 
                              ? 'bg-amber-500 text-slate-950 font-black shadow-sm' 
                              : 'border'
                          }`}
                          style={{
                            backgroundColor: isSelected ? undefined : themeStyles.verseBadgeBg,
                            borderColor: isSelected ? undefined : themeStyles.border,
                            color: isSelected ? undefined : themeStyles.verseBadgeText
                          }}
                        >
                          {v.verseNumber}
                        </span>

                        {/* Verse Text */}
                        <p 
                          className="flex-1 tracking-wide leading-relaxed"
                          style={{
                            fontSize: `${fontSize}px`,
                            lineHeight: lineSpacing === 'loose' ? 2.2 : (lineSpacing === 'relaxed' ? 1.85 : 1.6),
                            color: themeStyles.text
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
          </div>
        </div>
      )}

      {/* 9. FLOATING MULTI-VERSE SELECTION LUXURY TOOLBAR */}
      {selectedVerses.length > 0 && activeView === 'reader' && (
        <BibleVerseToolbar
          selectedVerses={selectedVerses}
          bookName={currentBookName}
          bookSlug={selectedBook?.slug || 'mat'}
          chapterNumber={selectedChapter}
          translationName={currentTranslationName}
          translationCode={translationCode}
          onClearSelection={() => setSelectedVerses([])}
          onOpenImageGenerator={() => setIsImageModalOpen(true)}
          onOpenStudyMode={(vNum) => {
            setStudyVerseNumber(vNum);
            setIsStudyDrawerOpen(true);
          }}
          onOpenComparison={() => setIsComparisonOpen(true)}
          onOpenJournalWithPassage={(passage) => {
            setJournalPassageData(passage);
            setActiveView('journal');
          }}
          onToggleFavorite={async ({ verseNumber, text }) => {
            if (!token) {
              alert(isAr ? 'يرجى تسجيل الدخول لحفظ الآيات في المفضلة.' : 'Please log in to save favorites.');
              return;
            }
            try {
              await fetch(`${API_URL}/fy/bible/favorites`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  bookSlug: selectedBook?.slug,
                  chapterNumber: selectedChapter,
                  verseNumber,
                  text,
                  toggle: true
                })
              });
              alert(isAr ? 'تم تحديث المفضلة بنجاح!' : 'Favorites updated!');
            } catch (err) {
              console.error('Error toggling favorite:', err);
            }
          }}
        />
      )}

      {/* 10. IMAGE GENERATOR MODAL */}
      {isImageModalOpen && (
        <BibleImageGeneratorModal
          isOpen={isImageModalOpen}
          onClose={() => {
            setIsImageModalOpen(false);
            setImageModalVerseData(null);
          }}
          selectedVerses={imageModalVerseData ? [{ verseNumber: imageModalVerseData.verseNumber, text: imageModalVerseData.text }] : selectedVerses}
          bookName={imageModalVerseData?.bookName || currentBookName}
          chapterNumber={imageModalVerseData?.chapterNumber || selectedChapter}
          referenceString={imageModalVerseData?.reference}
          translationName={imageModalVerseData?.translationName || currentTranslationName}
          isRtl={translationCode !== 'kjv'}
        />
      )}

      {/* 11. 5-SECTION CONTEXTUAL BIBLE STUDY DRAWER */}
      {isStudyDrawerOpen && selectedBook && (
        <BibleStudyDrawer
          isOpen={isStudyDrawerOpen}
          onClose={() => setIsStudyDrawerOpen(false)}
          bookSlug={selectedBook.slug}
          bookName={currentBookName}
          chapterNumber={selectedChapter}
          verseNumber={studyVerseNumber}
          onNavigateToPassage={handleNavigateToPassage}
          onOpenComparison={() => {
            setIsStudyDrawerOpen(false);
            setIsComparisonOpen(true);
          }}
          onOpenJournalWithPassage={(passage) => {
            setIsStudyDrawerOpen(false);
            setJournalPassageData(passage);
            setActiveView('journal');
          }}
        />
      )}

      {/* 12. SIDE-BY-SIDE TRANSLATION COMPARISON MODAL */}
      {isComparisonOpen && selectedBook && (
        <BibleTranslationComparison
          isOpen={isComparisonOpen}
          onClose={() => setIsComparisonOpen(false)}
          bookSlug={selectedBook.slug}
          bookNameAr={selectedBook.nameAr}
          bookNameEn={selectedBook.nameEn}
          chapterNumber={selectedChapter}
          highlightVerse={selectedVerses[0]?.verseNumber}
          onOpenImageForVerse={(verse) => {
            setImageModalVerseData(verse);
            setIsImageModalOpen(true);
          }}
        />
      )}
    </div>
  );
}

export default function BiblePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        جاري تحميل الكتاب المقدس...
      </div>
    }>
      <BibleReaderContent />
    </Suspense>
  );
}
