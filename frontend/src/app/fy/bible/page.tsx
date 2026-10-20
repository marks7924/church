'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from '../../../components/ThemeContext';
import { 
  BookOpen, ChevronLeft, ChevronRight, CheckCircle2, Bookmark, 
  ArrowLeft, ArrowRight, Share2, Sparkles, SlidersHorizontal, BookMarked,
  Search, Scale, Compass, Calendar, Check, X, RotateCcw, ListFilter,
  Type, AlignJustify, Eye, Info, Volume2
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
import { removeArabicTashkeel, formatVerseRange } from '../../../utils/bibleTashkeel';

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

  // Multi-verse selection state
  const [selectedVerses, setSelectedVerses] = useState<{ verseNumber: number; text: string }[]>([]);

  // Modals & Drawers State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalVerseData, setImageModalVerseData] = useState<{ verseNumber: number; text: string; translationName: string } | null>(null);

  const [isStudyDrawerOpen, setIsStudyDrawerOpen] = useState(false);
  const [studyVerseNumber, setStudyVerseNumber] = useState<number>(1);

  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const [journalPassageData, setJournalPassageData] = useState<{ reference: string; text: string; bookSlug: string; chapter: number } | null>(null);

  // Reader Display Customization
  const [fontSizeClass, setFontSizeClass] = useState<'text-base' | 'text-lg' | 'text-xl' | 'text-2xl'>('text-lg');
  const [lineSpacing, setLineSpacing] = useState<'leading-normal' | 'leading-relaxed' | 'leading-loose'>('leading-loose');
  const [containerWidth, setContainerWidth] = useState<'max-w-4xl' | 'max-w-6xl'>('max-w-4xl');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // User reading progress state
  const [isChapterCompleted, setIsChapterCompleted] = useState(false);
  const [progressSummary, setProgressSummary] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [recentPassages, setRecentPassages] = useState<{ bookSlug: string; bookName: string; chapter: number }[]>([]);

  // Load token & books on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('church-token');
      setToken(storedToken);

      try {
        const storedRecents = localStorage.getItem('church-recent-passages');
        if (storedRecents) setRecentPassages(JSON.parse(storedRecents));
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
            initialBook = normalized.find((b: any) => b.slug === bookParam || b.code === bookParam || b.id === bookParam);
          }
          if (!initialBook) {
            initialBook = normalized.find((b: any) => b.slug === 'mat' || b.slug === 'john' || b.slug === 'jhn') || normalized[0];
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
              const updated = [newRecent, ...filtered].slice(0, 5);
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
              (p: any) => p.bookSlug === selectedBook.slug && p.chapterNumber === selectedChapter && p.completed
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
    const groups = new Map<string, any[]>();
    for (const b of currentTestamentBooks) {
      const sectionKey = isAr ? (b.sectionAr || 'الأسفار') : (b.sectionEn || 'Books');
      if (!groups.has(sectionKey)) groups.set(sectionKey, []);
      groups.get(sectionKey)!.push(b);
    }
    return Array.from(groups.entries()).map(([sectionTitle, bList]) => ({
      sectionTitle,
      books: bList
    }));
  }, [books, selectedTestament, isAr]);

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
    setSelectedVerses(chapterData.verses.map((v: any) => ({
      verseNumber: v.verseNumber,
      text: v.text
    })));
  };

  // Navigate to passage helper
  const handleNavigateToPassage = (bookSlug: string, chapter: number) => {
    const targetBook = books.find(b => b.slug === bookSlug || b.code === bookSlug || b.id.toLowerCase() === bookSlug.toLowerCase());
    if (targetBook) {
      setSelectedBook(targetBook);
      setSelectedTestament(targetBook.testament);
      setSelectedChapter(chapter);
      setActiveView('reader');
      setShowSearchResults(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  return (
    <div className="min-h-screen py-8 px-3 sm:px-6 max-w-7xl mx-auto" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/fy" className="hover:text-amber-400 transition">
            {isAr ? 'الرئيسية' : 'Home'}
          </Link>
          <span>/</span>
          <span className="text-amber-400 font-bold">{isAr ? 'الكتاب المقدس' : 'Holy Bible'}</span>
          {activeView !== 'reader' && (
            <>
              <span>/</span>
              <span className="text-slate-200">
                {activeView === 'votd' && (isAr ? 'آية اليوم والتأمل' : 'Verse of the Day')}
                {activeView === 'explorer' && (isAr ? 'المستكشف الكتابي' : 'Bible Explorer')}
                {activeView === 'journal' && (isAr ? 'دفتري الروحي' : 'Spiritual Journal')}
                {activeView === 'plans' && (isAr ? 'خطط القراءة' : 'Reading Plans')}
                {activeView === 'topics' && (isAr ? 'موضوعات الآيات' : 'Scripture Topics')}
              </span>
            </>
          )}
        </div>

        {/* Translation Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 hidden sm:inline">{isAr ? 'الترجمة:' : 'Translation:'}</label>
          <select
            value={translationCode}
            onChange={(e) => setTranslationCode(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="van-dyck">📖 {isAr ? 'ترجمة فاندايك العربية (1865)' : 'Arabic Smith & Van Dyck (1865)'}</option>
            <option value="kjv">📜 {isAr ? 'نسخة الملك جيمس الإنجليزية (KJV)' : 'English King James Version (KJV)'}</option>
          </select>
        </div>
      </div>

      {/* Main 6 Systems Navigation Bar */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveView('reader')}
          className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition border ${
            activeView === 'reader'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen size={16} />
          <span>{isAr ? 'القارئ والأسفار' : 'Bible Reader'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('votd')}
          className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition border ${
            activeView === 'votd'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles size={16} />
          <span>{isAr ? 'آية اليوم والتأمل' : 'Verse of the Day'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('explorer')}
          className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition border ${
            activeView === 'explorer'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Compass size={16} />
          <span>{isAr ? 'المستكشف الكتابي' : 'Bible Explorer'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('journal')}
          className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition border ${
            activeView === 'journal'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <BookMarked size={16} />
          <span>{isAr ? 'دفتري الروحي' : 'Spiritual Journal'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('plans')}
          className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition border ${
            activeView === 'plans'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Calendar size={16} />
          <span>{isAr ? 'خطط القراءة' : 'Reading Plans'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('topics')}
          className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition border ${
            activeView === 'topics'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ListFilter size={16} />
          <span>{isAr ? 'موضوعات الآيات' : 'Scripture Topics'}</span>
        </button>
      </div>

      {/* VIEW SWITCHER ROUTING */}
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

      {/* MAIN BIBLE READER VIEW */}
      {activeView === 'reader' && (
        <div className="space-y-6">
          {/* Search & Direct Reference Navigator */}
          <div className="relative">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute right-3.5 top-3.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder={isAr ? 'ابحث عن آية، كلمة، أو شاهد مباشر (مثال: يوحنا 3: 16 أو مزمور 23:1)...' : 'Search keyword or direct reference (e.g. John 3:16 or Psalm 23)...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs md:text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="py-2.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {isSearching ? 'جاري البحث...' : (isAr ? 'بحث' : 'Search')}
              </button>
            </form>

            {/* Live Search Results Popup */}
            {showSearchResults && (
              <div className="absolute top-full mt-2 w-full z-30 p-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <span className="text-xs font-bold text-amber-400">
                    نتائج البحث ({searchResults.length} آية مطابقة)
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowSearchResults(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">لا توجد نتائج مطابقة لبحثك.</p>
                ) : (
                  <div className="space-y-2.5">
                    {searchResults.map((res, i) => (
                      <div
                        key={i}
                        onClick={() => handleNavigateToPassage(res.bookSlug, res.chapterNumber)}
                        className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition"
                      >
                        <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
                          <span>{res.referenceAr}</span>
                          <span className="text-[11px] text-slate-500">{res.referenceEn}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-serif leading-relaxed line-clamp-2">
                          «{res.text}»
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Continue Reading Bar */}
          {recentPassages.length > 0 && (
            <div className="flex items-center gap-2 text-xs overflow-x-auto scrollbar-none py-1">
              <span className="text-slate-400 font-semibold whitespace-nowrap flex items-center gap-1">
                <RotateCcw size={12} /> {isAr ? 'متابعة القراءة السابقة:' : 'Recent:'}
              </span>
              {recentPassages.map((rec, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleNavigateToPassage(rec.bookSlug, rec.chapter)}
                  className="px-3 py-1 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-amber-400 font-bold border border-slate-800 whitespace-nowrap transition"
                >
                  {rec.bookName} {rec.chapter}
                </button>
              ))}
            </div>
          )}

          {/* Books and Testament Selector Section */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            {/* Testament Switcher */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedTestament('NEW')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedTestament === 'NEW' 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isAr ? 'العهد الجديد (٢٧ سفراً)' : 'New Testament (27)'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTestament('OLD')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedTestament === 'OLD' 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isAr ? 'العهد القديم (٣٩ سفراً)' : 'Old Testament (39)'}
                </button>
              </div>

              {/* Reader Display Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 px-1 font-bold">{isAr ? 'الخط:' : 'Font:'}</span>
                  <button
                    type="button"
                    onClick={() => setFontSizeClass('text-base')}
                    className={`px-2 py-0.5 rounded text-xs font-bold ${fontSizeClass === 'text-base' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                  >
                    أ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeClass('text-lg')}
                    className={`px-2 py-0.5 rounded text-sm font-bold ${fontSizeClass === 'text-lg' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                  >
                    أ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeClass('text-xl')}
                    className={`px-2 py-0.5 rounded text-base font-bold ${fontSizeClass === 'text-xl' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                  >
                    أ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizeClass('text-2xl')}
                    className={`px-2 py-0.5 rounded text-lg font-bold ${fontSizeClass === 'text-2xl' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                  >
                    أ
                  </button>
                </div>
              </div>
            </div>

            {/* Categorized Books List */}
            <div className="space-y-3 pt-2">
              {booksBySection.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 border-r-2 border-amber-500 pr-2">
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
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' 
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'
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

            {/* Chapters Grid */}
            {selectedBook && (
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold text-amber-400">
                    {isAr ? `إصحاحات ${selectedBook.nameAr} (${selectedBook.totalChapters} إصحاح):` : `Chapters of ${selectedBook.nameEn} (${selectedBook.totalChapters}):`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {Array.from({ length: selectedBook.totalChapters || 1 }).map((_, i) => {
                    const cNum = i + 1;
                    const isSelected = selectedChapter === cNum;
                    return (
                      <button
                        key={cNum}
                        type="button"
                        onClick={() => setSelectedChapter(cNum)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center border ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'
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

          {/* SCRIPTURE CHAPTER DISPLAY CONTAINER */}
          <div className={`${containerWidth} mx-auto space-y-6`}>
            {/* Chapter Header Card */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Prev Chapter */}
              <button
                type="button"
                disabled={selectedChapter <= 1}
                onClick={() => setSelectedChapter(c => Math.max(1, c - 1))}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 transition flex items-center gap-1.5"
              >
                <ChevronRight size={16} />
                <span>{isAr ? 'الإصحاح السابق' : 'Prev Chapter'}</span>
              </button>

              {/* Title */}
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-bold font-serif text-amber-300">
                  {currentBookName} — {isAr ? `الإصحاح ${selectedChapter}` : `Chapter ${selectedChapter}`}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-1 text-xs text-slate-400">
                  <span>{currentTranslationName}</span>
                  <span>•</span>
                  <span>{chapterData?.verseCount || 0} {isAr ? 'آية' : 'verses'}</span>
                </div>
              </div>

              {/* Next Chapter */}
              <button
                type="button"
                disabled={selectedBook && selectedChapter >= selectedBook.totalChapters}
                onClick={() => setSelectedChapter(c => c + 1)}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 transition flex items-center gap-1.5"
              >
                <span>{isAr ? 'الإصحاح التالي' : 'Next Chapter'}</span>
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Quick Action Bar under Chapter Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllChapter}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold transition"
                >
                  {isAr ? 'تحديد كل آيات الإصحاح' : 'Select all verses'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsComparisonOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold transition flex items-center gap-1.5"
                >
                  <Scale size={14} />
                  <span>{isAr ? 'مقارنة الترجمتين لهذا الإصحاح' : 'Compare translations'}</span>
                </button>
              </div>

              {/* Toggle Reading Completed */}
              <button
                type="button"
                onClick={handleToggleComplete}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition border ${
                  isChapterCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 size={15} />
                <span>{isChapterCompleted ? (isAr ? 'تمت قراءة الإصحاح' : 'Chapter Read') : (isAr ? 'تعليم كمقروء' : 'Mark as Read')}</span>
              </button>
            </div>

            {/* Scripture Verses Body */}
            <div 
              className={`p-6 md:p-10 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl relative ${
                translationCode === 'kjv' ? 'text-left font-sans' : 'text-right font-serif'
              }`}
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

                    return (
                      <div
                        key={v.verseNumber}
                        id={`v-${v.verseNumber}`}
                        onClick={() => handleVerseClick(v)}
                        className={`p-3 rounded-2xl cursor-pointer transition select-text flex items-start gap-3 ${
                          isSelected
                            ? 'bg-amber-500/15 border border-amber-500/40 shadow-sm'
                            : 'hover:bg-slate-800/30 border border-transparent'
                        }`}
                      >
                        {/* Verse Number Badge */}
                        <span 
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 select-none ${
                            isSelected 
                              ? 'bg-amber-500 text-slate-950 font-black' 
                              : 'bg-slate-800/80 text-amber-400 border border-slate-700'
                          }`}
                        >
                          {v.verseNumber}
                        </span>

                        {/* Verse Text */}
                        <p 
                          className={`flex-1 text-slate-100 ${fontSizeClass} ${lineSpacing} tracking-wide`}
                        >
                          {v.text}
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

      {/* Floating Multi-Verse Selection Contextual Toolbar */}
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

      {/* Image Generator Modal */}
      {isImageModalOpen && (
        <BibleImageGeneratorModal
          isOpen={isImageModalOpen}
          onClose={() => {
            setIsImageModalOpen(false);
            setImageModalVerseData(null);
          }}
          selectedVerses={imageModalVerseData ? [imageModalVerseData] : selectedVerses}
          bookName={imageModalVerseData ? 'الكتاب المقدس' : currentBookName}
          chapterNumber={imageModalVerseData ? 1 : selectedChapter}
          translationName={imageModalVerseData ? imageModalVerseData.translationName : currentTranslationName}
          isRtl={translationCode !== 'kjv'}
        />
      )}

      {/* 5-Section Contextual Bible Study Drawer */}
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

      {/* Side-by-Side Translation Comparison Modal */}
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
