'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '../../components/ThemeContext';
import styles from './history.module.css';
import { API_URL } from '../../config';
import { 
  History, Calendar, Users, Eye, EyeOff, Edit3, Plus, Trash2, 
  CheckCircle, AlertTriangle, ChevronRight, ChevronLeft, Search, 
  Sparkles, BookOpen, Image as ImageIcon, FileText, ArrowUpRight,
  Shield, Download, ExternalLink, X, RefreshCw
} from 'lucide-react';

interface HistorySettings {
  id: string;
  foundingYear: number;
  headlineAr: string;
  headlineEn: string;
  subheadlineAr: string;
  subheadlineEn: string;
  introTextAr: string;
  introTextEn: string;
  heroImageUrl?: string | null;
}

interface HistoryChapter {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  shortIntroAr?: string | null;
  shortIntroEn?: string | null;
  narrativeAr: string;
  narrativeEn?: string | null;
  heroImageUrl?: string | null;
  orderIndex: number;
  status: string;
  quoteText?: string | null;
  quoteSource?: string | null;
  documentsJson?: string;
  galleryJson?: string;
}

interface HistoryClergyRecord {
  id: string;
  ecclesiasticalNameAr: string;
  ecclesiasticalNameEn?: string | null;
  secularName?: string | null;
  isSecularNameVisible: boolean;
  avatarUrl?: string | null;
  serviceStartDate: string;
  serviceEndDate?: string | null;
  datePrecision: string;
  isOngoing: boolean;
  clergyRole: string;
  titleAr?: string | null;
  titleEn?: string | null;
  bioAr?: string | null;
  bioEn?: string | null;
  orderIndex: number;
  verificationStatus: string;
  verificationWarning?: string | null;
  archivalNotes?: string | null;
  status: string;
  relatedEventsJson?: string;
  documentsJson?: string;
}

interface HistoryEvent {
  id: string;
  titleAr: string;
  titleEn?: string | null;
  descriptionAr: string;
  descriptionEn?: string | null;
  eventDate: string;
  year: number;
  datePrecision: string;
  category: string;
  mainImageUrl?: string | null;
  galleryJson?: string;
  relatedClergyIds?: string;
  relatedChapterSlug?: string | null;
  sources?: string | null;
  verificationStatus: string;
  status: string;
  orderIndex: number;
}

interface HistoryVisit {
  id: string;
  visitorNameAr: string;
  visitorNameEn?: string | null;
  ecclesiasticalTitleAr: string;
  ecclesiasticalTitleEn?: string | null;
  visitTitleAr: string;
  visitTitleEn?: string | null;
  visitDate: string;
  year: number;
  locationAr?: string | null;
  locationEn?: string | null;
  occasionAr?: string | null;
  occasionEn?: string | null;
  narrativeAr: string;
  narrativeEn?: string | null;
  mainImageUrl?: string | null;
  galleryJson?: string;
  documentsJson?: string;
  verificationStatus: string;
  status: string;
}

interface HistoryMediaItem {
  id: string;
  url: string;
  titleAr: string;
  titleEn?: string | null;
  captionAr?: string | null;
  captionEn?: string | null;
  mediaType: string;
  year?: number | null;
  approximateDate?: string | null;
  category: string;
  photographerOrSource?: string | null;
  archivalCredit?: string | null;
  altText?: string | null;
  isPublic: boolean;
  status: string;
}

export default function HistoryPage() {
  const { language, t } = useTheme();

  // State
  const [settings, setSettings] = useState<HistorySettings | null>(null);
  const [chapters, setChapters] = useState<HistoryChapter[]>([]);
  const [activeChapterSlug, setActiveChapterSlug] = useState<string>('foundation');
  const [clergyList, setClergyList] = useState<HistoryClergyRecord[]>([]);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [visits, setVisits] = useState<HistoryVisit[]>([]);
  const [mediaItems, setMediaItems] = useState<HistoryMediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // User & Admin inline state
  const [user, setUser] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filters
  const [clergySearch, setClergySearch] = useState('');
  const [selectedDecade, setSelectedDecade] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriestModal, setSelectedPriestModal] = useState<HistoryClergyRecord | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; caption?: string } | null>(null);

  // Inline Modals
  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<HistoryChapter | null>(null);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [editingClergy, setEditingClergy] = useState<HistoryClergyRecord | null>(null);
  const [isCreatingClergy, setIsCreatingClergy] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HistoryEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingVisit, setEditingVisit] = useState<HistoryVisit | null>(null);
  const [isCreatingVisit, setIsCreatingVisit] = useState(false);
  const [editingMedia, setEditingMedia] = useState<HistoryMediaItem | null>(null);
  const [isCreatingMedia, setIsCreatingMedia] = useState(false);

  // Check auth and load SWR cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const uStr = localStorage.getItem('church-user');
      if (uStr) {
        try {
          const u = JSON.parse(uStr);
          setUser(u);
          const hasAdminRole = ['SUPER_ADMIN', 'CHURCH_ADMIN', 'DEVELOPER', 'PRIEST', 'BISHOP', 'SECRETARY'].includes(u.role);
          setIsAdminUser(hasAdminRole);
        } catch (e) {}
      }

      // SWR Cache 0ms load
      const cached = localStorage.getItem('cached_history_data');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.clergy) {
            setSettings(parsed.settings || null);
            setChapters(parsed.chapters || []);
            setClergyList(parsed.clergy || []);
            setEvents(parsed.events || []);
            setVisits(parsed.visits || []);
            setMediaItems(parsed.media || []);
            setLoading(false);
          }
        } catch (e) {}
      }
    }
  }, []);

  // Fetch History Data
  const loadHistoryData = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('church-token') : null;
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || null);
        setChapters(data.chapters || []);
        if (data.chapters && data.chapters.length > 0 && !activeChapterSlug) {
          setActiveChapterSlug(data.chapters[0].slug);
        }
        setClergyList(data.clergy || []);
        setEvents(data.events || []);
        setVisits(data.visits || []);
        setMediaItems(data.media || []);
        
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('cached_history_data', JSON.stringify(data));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Active chapter
  const currentChapter = chapters.find(c => c.slug === activeChapterSlug) || chapters[0];
  const currentChapterIndex = chapters.findIndex(c => c.slug === activeChapterSlug);

  // Filtered Clergy
  const filteredClergy = clergyList.filter(p => {
    const q = clergySearch.toLowerCase().trim();
    if (!q) return true;
    const matchEccAr = p.ecclesiasticalNameAr?.toLowerCase().includes(q);
    const matchEccEn = p.ecclesiasticalNameEn?.toLowerCase().includes(q);
    const matchSec = p.secularName?.toLowerCase().includes(q);
    const matchYear = p.serviceStartDate?.includes(q);
    return matchEccAr || matchEccEn || matchSec || matchYear;
  });

  // Filtered Timeline Events
  const filteredEvents = events.filter(e => {
    if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;
    if (selectedDecade !== 'ALL') {
      const startDecade = parseInt(selectedDecade, 10);
      if (e.year < startDecade || e.year >= startDecade + 10) return false;
    }
    return true;
  });

  // Verification Warnings count (visible in admin mode)
  const pendingWarnings = clergyList.filter(c => c.verificationWarning || c.verificationStatus === 'AWAITING_VERIFICATION');

  return (
    <div className={styles.historyPage} dir={language === 'ar' ? 'rtl' : 'ltr'}>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #18191c 0%, #22242a 100%)',
          border: '1px solid var(--accent-gold)',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
          zIndex: 9999,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Inline Mode Bar (If Admin is logged in) */}
      {isAdminUser && (
        <div className={styles.adminTopBar}>
          <div className={styles.adminBadge}>
            <Shield size={18} color="var(--accent-gold)" />
            <span>
              {language === 'ar' ? 'وضع إدارة وتوثيق التاريخ الكنسي' : 'Church Heritage Management Mode'}
            </span>
            {pendingWarnings.length > 0 && (
              <span style={{
                background: 'rgba(230, 126, 34, 0.2)',
                color: '#f39c12',
                border: '1px solid #e67e22',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                marginRight: '6px'
              }}>
                ⚠️ {pendingWarnings.length} {language === 'ar' ? 'سجل يتطلب مراجعة' : 'needs review'}
              </span>
            )}
          </div>
          <div className={styles.adminActions}>
            <button 
              className={`${styles.adminToggleBtn} ${inlineEditMode ? styles.active : ''}`}
              onClick={() => setInlineEditMode(!inlineEditMode)}
            >
              <Edit3 size={15} />
              <span>
                {inlineEditMode 
                  ? (language === 'ar' ? 'إغلاق وضع التعديل السريع' : 'Close Inline Editor') 
                  : (language === 'ar' ? 'تفعيل وضع التعديل المباشر' : 'Enable Inline Editor')}
              </span>
            </button>
            {inlineEditMode && (
              <>
                <button 
                  className={styles.adminToggleBtn}
                  onClick={() => setEditSettingsOpen(true)}
                  title="تعديل مقدمة الصفحة وسنة التأسيس"
                >
                  ⚙️ {language === 'ar' ? 'إعدادات المقدمة والتأسيس' : 'Settings'}
                </button>
                <button 
                  className={styles.adminToggleBtn}
                  onClick={() => setIsCreatingClergy(true)}
                >
                  <Plus size={14} />
                  <span>{language === 'ar' ? 'إضافة كاهن للأرشيف' : 'Add Clergy'}</span>
                </button>
                <button 
                  className={styles.adminToggleBtn}
                  onClick={() => setIsCreatingEvent(true)}
                >
                  <Plus size={14} />
                  <span>{language === 'ar' ? 'إضافة محطة بالخط الزمني' : 'Add Milestone'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* SECTION A — HISTORICAL INTRODUCTION */}
      <section 
        className={styles.heroSection} 
        style={{ backgroundImage: settings?.heroImageUrl ? `url(${settings.heroImageUrl})` : 'none' }}
      >
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          {/* Confirmed Founding Year: 1955 */}
          <div className={styles.foundingBadge}>
            <Sparkles size={16} />
            <span>
              {language === 'ar' 
                ? (settings?.subheadlineAr || `منذ عام ${settings?.foundingYear || 1955}`) 
                : (settings?.subheadlineEn || `Since ${settings?.foundingYear || 1955}`)}
            </span>
            {inlineEditMode && (
              <button 
                onClick={() => setEditSettingsOpen(true)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
              >
                ✏️
              </button>
            )}
          </div>

          <h1 className={styles.heroHeadline}>
            {language === 'ar' 
              ? (settings?.headlineAr || 'لكل كنيسة حكاية... وهذه حكايتنا.')
              : (settings?.headlineEn || 'Every church has a story. This is ours.')}
          </h1>

          <p className={styles.heroIntro}>
            {language === 'ar'
              ? (settings?.introTextAr || 'تاريخ كنيسة الشهيد العظيم أبي سيفين هو رحلة مباركة من الإيمان والخدمة والرعاية الروحية تمتد عبر أجيال من الآباء الأجلاء والشمامسة والخدام وشعب الكنيسة المبارك.')
              : (settings?.introTextEn || 'The history of St. Philopater Church is a blessed journey of faith, service, and pastoral care spanning generations of revered clergy, servants, and congregation.')}
          </p>

          <div className={styles.heroButtons}>
            <a href="#chapters-section" className={styles.btnPrimary}>
              <BookOpen size={18} />
              <span>{t('history_begin')}</span>
            </a>
            <a href="#timeline-section" className={styles.btnSecondary}>
              <Calendar size={18} />
              <span>{t('history_timeline')}</span>
            </a>
            <a href="#clergy-section" className={styles.btnSecondary}>
              <Users size={18} />
              <span>{t('history_clergy')}</span>
            </a>
          </div>

          {/* Historical Fact Stats */}
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{settings?.foundingYear || 1955}</div>
              <div className={styles.statLabel}>{language === 'ar' ? 'سنة التأسيس المعتمدة' : 'Confirmed Founding Year'}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{clergyList.length}</div>
              <div className={styles.statLabel}>{language === 'ar' ? 'آباء كهنة عبر التاريخ' : 'Clergy Members in Archive'}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{chapters.length}</div>
              <div className={styles.statLabel}>{language === 'ar' ? 'فصول الحكاية الكنسية' : 'Story Chapters'}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>100%</div>
              <div className={styles.statLabel}>{language === 'ar' ? 'أرشيف موثق ومستمر' : 'Documented Heritage'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Persistent Section Navigation Bar */}
      <nav className={styles.stickyNavBar}>
        <a href="#chapters-section" className={styles.stickyNavLink}>
          <BookOpen size={15} />
          <span>{language === 'ar' ? 'فصول الرواية' : 'Chapters'}</span>
        </a>
        <a href="#clergy-section" className={styles.stickyNavLink}>
          <Users size={15} />
          <span>{t('history_clergy')}</span>
        </a>
        <a href="#timeline-section" className={styles.stickyNavLink}>
          <Calendar size={15} />
          <span>{t('history_timeline')}</span>
        </a>
        <a href="#visits-section" className={styles.stickyNavLink}>
          <Sparkles size={15} />
          <span>{t('history_visits')}</span>
        </a>
        <a href="#archive-section" className={styles.stickyNavLink}>
          <ImageIcon size={15} />
          <span>{t('history_archive')}</span>
        </a>
      </nav>

      {/* SECTION B & C — THE HISTORICAL JOURNEY (CHAPTERS) */}
      <section id="chapters-section" className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <BookOpen size={24} color="var(--accent-gold)" />
              <span>{language === 'ar' ? 'رحلة الأجيال — فصول التاريخ' : 'The Historical Journey — Chapters'}</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              {language === 'ar'
                ? 'استكشف حكاية كنيستنا عبر 8 محطات رئيسية توثق النعمة والبركة منذ عام 1955 وحتى اليوم.'
                : 'Explore our church history through 8 core chapters detailing divine grace from 1955 to the present.'}
            </p>
          </div>
          {inlineEditMode && (
            <button 
              className={styles.btnSecondary}
              onClick={() => setIsCreatingChapter(true)}
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة فصل تاريخي جديد' : 'Add Chapter'}</span>
            </button>
          )}
        </div>

        {/* Chapter Selection Track */}
        <div className={styles.chapterTrack}>
          {chapters.map((ch, idx) => (
            <button
              key={ch.id}
              className={`${styles.chapterChip} ${ch.slug === activeChapterSlug ? styles.active : ''}`}
              onClick={() => setActiveChapterSlug(ch.slug)}
            >
              <span>{idx + 1}.</span>
              <span>{language === 'ar' ? ch.titleAr : ch.titleEn}</span>
              {ch.status === 'DRAFT' && <span style={{ fontSize: '0.7rem', color: '#e67e22' }}>[مسودة]</span>}
            </button>
          ))}
        </div>

        {/* Selected Chapter Content */}
        {currentChapter && (
          <article className={styles.chapterArticle}>
            <div 
              className={styles.chapterHero}
              style={{ backgroundImage: currentChapter.heroImageUrl ? `url(${currentChapter.heroImageUrl})` : 'none' }}
            >
              <div className={styles.chapterHeroOverlay}></div>
              <div className={styles.chapterHeroContent}>
                <div className={styles.chapterNumber}>
                  {language === 'ar' ? `الفصل ${currentChapterIndex + 1}` : `Chapter ${currentChapterIndex + 1}`}
                </div>
                <h3 className={styles.chapterHeading}>
                  {language === 'ar' ? currentChapter.titleAr : currentChapter.titleEn}
                </h3>
                {(currentChapter.shortIntroAr || currentChapter.shortIntroEn) && (
                  <p className={styles.chapterIntroText}>
                    {language === 'ar' ? currentChapter.shortIntroAr : currentChapter.shortIntroEn}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.chapterBody}>
              {/* Scripture or Archival Quote */}
              {currentChapter.quoteText && (
                <blockquote className={styles.chapterQuote}>
                  <p>«{currentChapter.quoteText}»</p>
                  {currentChapter.quoteSource && <cite style={{ display: 'block', marginTop: '6px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>— {currentChapter.quoteSource}</cite>}
                </blockquote>
              )}

              {/* Long-form Narrative */}
              <div className={styles.chapterNarrative}>
                {language === 'ar' ? currentChapter.narrativeAr : (currentChapter.narrativeEn || currentChapter.narrativeAr)}
              </div>

              {/* Inline Chapter Controls */}
              {inlineEditMode && (
                <div style={{
                  background: 'rgba(226, 183, 20, 0.08)',
                  border: '1px dashed var(--accent-gold)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                    🛠️ {language === 'ar' ? 'إدارة محتوى هذا الفصل مباشرة' : 'Manage this chapter'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className={styles.btnSecondary} 
                      style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                      onClick={() => setEditingChapter(currentChapter)}
                    >
                      <Edit3 size={14} />
                      <span>{language === 'ar' ? 'تعديل النص والصور' : 'Edit Chapter'}</span>
                    </button>
                    <button 
                      className={styles.btnSecondary} 
                      style={{ padding: '6px 12px', fontSize: '0.82rem', borderColor: '#e74c3c', color: '#e74c3c' }}
                      onClick={() => handleDeleteChapter(currentChapter.id)}
                    >
                      <Trash2 size={14} />
                      <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Chapter Footer Navigation */}
              <div className={styles.chapterFooterNav}>
                {currentChapterIndex > 0 ? (
                  <button 
                    className={styles.btnSecondary}
                    onClick={() => setActiveChapterSlug(chapters[currentChapterIndex - 1].slug)}
                  >
                    {language === 'ar' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    <span>{language === 'ar' ? 'الفصل السابق' : 'Previous Chapter'}</span>
                  </button>
                ) : <div></div>}

                {currentChapterIndex < chapters.length - 1 ? (
                  <button 
                    className={styles.btnPrimary}
                    onClick={() => setActiveChapterSlug(chapters[currentChapterIndex + 1].slug)}
                  >
                    <span>{language === 'ar' ? 'الفصل التالي' : 'Next Chapter'}</span>
                    {language === 'ar' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                  </button>
                ) : (
                  <a href="#clergy-section" className={styles.btnPrimary}>
                    <span>{t('history_clergy')}</span>
                  </a>
                )}
              </div>
            </div>
          </article>
        )}
      </section>

      {/* SECTION 7 & 8 — CLERGY DIRECTORY (THE 15 HISTORICAL RECORDS) */}
      <section id="clergy-section" className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Users size={24} color="var(--accent-gold)" />
              <span>{t('history_clergy')}</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              {language === 'ar'
                ? 'سجل الآباء الكهنة والأجلاء الذين خدموا مذبح الكنيسة ورعوا شعبها عبر العقود والسنوات المباركة.'
                : 'The historical directory of the reverend fathers who served our church altar across the decades.'}
            </p>
          </div>
          {inlineEditMode && (
            <button 
              className={styles.btnPrimary}
              onClick={() => setIsCreatingClergy(true)}
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة سجل أب كاهن' : 'Add Clergy Record'}</span>
            </button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className={styles.filterRow}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              className={styles.searchInput}
              placeholder={language === 'ar' ? 'ابحث بالاسم الكنسي، سنة الرسامة، أو الاسم...' : 'Search by priest name, year...'}
              value={clergySearch}
              onChange={(e) => setClergySearch(e.target.value)}
            />
            {clergySearch && (
              <button 
                onClick={() => setClergySearch('')}
                style={{ position: 'absolute', [language === 'ar' ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                ✕
              </button>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {language === 'ar' ? `إجمالي السجلات: ${filteredClergy.length}` : `Total Records: ${filteredClergy.length}`}
          </div>
        </div>

        {/* 15 Clergy Cards Grid */}
        <div className={styles.clergyGrid}>
          {filteredClergy.map((p) => {
            const hasWarning = Boolean(p.verificationWarning);

            return (
              <div 
                key={p.id} 
                className={styles.clergyCard}
                onClick={() => setSelectedPriestModal(p)}
                style={{ cursor: 'pointer' }}
              >
                {/* Admin Quick Edit Button */}
                {inlineEditMode && (
                  <div 
                    style={{ position: 'absolute', top: '10px', [language === 'ar' ? 'left' : 'right']: '10px', display: 'flex', gap: '6px', zIndex: 10 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setEditingClergy(p)}
                      title={language === 'ar' ? 'تعديل السجل والاسم العلماني' : 'Edit'}
                      style={{ background: 'rgba(226, 183, 20, 0.2)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteClergy(p.id)}
                      title={language === 'ar' ? 'حذف' : 'Delete'}
                      style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {/* Avatar */}
                <div 
                  className={styles.clergyAvatar}
                  style={{
                    backgroundImage: p.avatarUrl ? `url(${p.avatarUrl})` : undefined,
                    backgroundColor: '#1b1d22',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {!p.avatarUrl && (
                    <div style={{ textAlign: 'center', color: 'var(--accent-gold)' }}>
                      <span style={{ fontSize: '2.2rem', display: 'block', lineHeight: 1 }}>☦️</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                        {language === 'ar' ? 'صورة أرشيفية' : 'Archival'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Role Badge */}
                <span className={styles.clergyRoleBadge}>
                  {language === 'ar' ? (p.titleAr || 'القمص') : (p.titleEn || 'Hegumen')}
                </span>

                {/* Ecclesiastical Name */}
                <h3 className={styles.clergyEcclesiasticalName}>
                  {language === 'ar' ? p.ecclesiasticalNameAr : (p.ecclesiasticalNameEn || p.ecclesiasticalNameAr)}
                </h3>

                {/* Secular Name (Critical: Only visible if isSecularNameVisible is true OR if admin) */}
                {p.secularName && (p.isSecularNameVisible || inlineEditMode) && (
                  <div className={styles.clergySecularName}>
                    <span>{language === 'ar' ? 'الاسم العلماني:' : 'Secular:'}</span>
                    <b style={{ color: '#fff' }}>{p.secularName}</b>
                    {!p.isSecularNameVisible && inlineEditMode && (
                      <span style={{ color: '#e67e22', fontSize: '0.7rem' }} title="مخفي عن الزوار">[مخفي]</span>
                    )}
                  </div>
                )}

                {/* Service Period Visualization */}
                <div className={styles.clergyServicePeriod}>
                  <div>
                    <b>{language === 'ar' ? 'فترة الخدمة بالمذبح:' : 'Service Period:'}</b>
                  </div>
                  <div>
                    {p.serviceStartDate}
                    {' — '}
                    {p.isOngoing ? (
                      <span className={styles.ongoingBadge}>
                        {language === 'ar' ? 'مستمرة حتى الآن 🕊️' : 'Ongoing Service 🕊️'}
                      </span>
                    ) : p.serviceEndDate ? (
                      <span>{p.serviceEndDate}</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {language === 'ar' ? 'تاريخ الانتهاء غير محدد بالسجلات' : 'End date unrecorded'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 7 Administrative Verification Warning Banner */}
                {hasWarning && (
                  <div className={styles.warningAlertBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                      <AlertTriangle size={14} />
                      <span>{language === 'ar' ? 'تنبيه تدقيق أرشيفي:' : 'Archive Notice:'}</span>
                    </div>
                    <div style={{ marginTop: '2px', lineHeight: 1.4 }}>
                      {p.verificationWarning}
                    </div>
                  </div>
                )}

                {/* Bio preview hint */}
                <div style={{ marginTop: 'auto', paddingTop: '10px', fontSize: '0.78rem', color: 'var(--accent-gold)' }}>
                  {language === 'ar' ? 'عرض السيرة والوثائق ℹ️' : 'View Bio & Archive ℹ️'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 9 — HISTORICAL TIMELINE */}
      <section id="timeline-section" className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Calendar size={24} color="var(--accent-gold)" />
              <span>{t('history_timeline')}</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              {language === 'ar'
                ? 'الخط الزمني التفاعلي الموثق منذ سنة التأسيس (1955) والمحطات الكبرى حتى عام 2026.'
                : 'Connected historical timeline from the 1955 foundation through 2026.'}
            </p>
          </div>
          {inlineEditMode && (
            <button 
              className={styles.btnPrimary}
              onClick={() => setIsCreatingEvent(true)}
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة حدث بالخط الزمني' : 'Add Event'}</span>
            </button>
          )}
        </div>

        {/* Decade Selector */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '1.5rem' }}>
          {['ALL', '1930', '1950', '1960', '1970', '1980', '1990', '2000', '2010', '2020'].map(dec => (
            <button
              key={dec}
              className={`${styles.chapterChip} ${selectedDecade === dec ? styles.active : ''}`}
              onClick={() => setSelectedDecade(dec)}
            >
              {dec === 'ALL' ? (language === 'ar' ? 'جميع السنوات' : 'All Decades') : `${dec}s`}
            </button>
          ))}
        </div>

        {/* Timeline Items Track */}
        <div className={styles.timelineTrack}>
          {filteredEvents.map((evt) => (
            <div key={evt.id} className={styles.timelineItem}>
              <div className={styles.timelineMarker}></div>
              <div className={styles.timelineCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={styles.timelineYear}>{evt.year}</span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--accent-gold)', background: 'rgba(226, 183, 20, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    {evt.category}
                  </span>
                </div>
                <h3 className={styles.timelineTitle}>
                  {language === 'ar' ? evt.titleAr : (evt.titleEn || evt.titleAr)}
                </h3>
                <p className={styles.timelineDesc}>
                  {language === 'ar' ? evt.descriptionAr : (evt.descriptionEn || evt.descriptionAr)}
                </p>
                {evt.sources && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '6px' }}>
                    📖 {language === 'ar' ? 'المصدر:' : 'Source:'} {evt.sources}
                  </div>
                )}
                {inlineEditMode && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button 
                      onClick={() => setEditingEvent(evt)}
                      className={styles.btnSecondary} 
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      <Edit3 size={12} /> {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(evt.id)}
                      className={styles.btnSecondary} 
                      style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#e74c3c', borderColor: '#e74c3c' }}
                    >
                      <Trash2 size={12} /> {language === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 10 — PAPAL & EPISCOPAL VISITS */}
      <section id="visits-section" className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Sparkles size={24} color="var(--accent-gold)" />
              <span>{t('history_visits')}</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              {language === 'ar'
                ? 'توثيق الزيارات التاريخية المباركة لقداسة البابا والآباء الأساقفة لكنيستنا عبر السنين.'
                : 'Documented historical visits by the Pope and revered Bishops to our church.'}
            </p>
          </div>
          {inlineEditMode && (
            <button 
              className={styles.btnPrimary}
              onClick={() => setIsCreatingVisit(true)}
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'إضافة زيارة تاريخية' : 'Add Historic Visit'}</span>
            </button>
          )}
        </div>

        {visits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <p style={{ fontSize: '1.05rem', marginBottom: '8px' }}>
              🕊️ {language === 'ar' ? 'جاري توثيق وإدراج الزيارات البابوية والأسقفية من الأرشيف التاريخي...' : 'Archival records of papal visits are being curated.'}
            </p>
            {inlineEditMode && (
              <button className={styles.btnPrimary} onClick={() => setIsCreatingVisit(true)} style={{ marginTop: '10px' }}>
                + {language === 'ar' ? 'إضافة أول زيارة تاريخية' : 'Add First Visit'}
              </button>
            )}
          </div>
        ) : (
          <div className={styles.clergyGrid}>
            {visits.map(v => (
              <div key={v.id} className={styles.clergyCard} style={{ textAlign: 'start', alignItems: 'stretch' }}>
                <span className={styles.clergyRoleBadge} style={{ alignSelf: 'flex-start' }}>
                  {language === 'ar' ? v.ecclesiasticalTitleAr : (v.ecclesiasticalTitleEn || v.ecclesiasticalTitleAr)}
                </span>
                <h3 className={styles.clergyEcclesiasticalName} style={{ fontSize: '1.25rem' }}>
                  {language === 'ar' ? v.visitorNameAr : (v.visitorNameEn || v.visitorNameAr)}
                </h3>
                <h4 style={{ fontSize: '1rem', color: 'var(--accent-gold)', marginBottom: '8px' }}>
                  {language === 'ar' ? v.visitTitleAr : (v.visitTitleEn || v.visitTitleAr)}
                </h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  📅 {v.visitDate} {v.locationAr && `📍 ${v.locationAr}`}
                </div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                  {language === 'ar' ? v.narrativeAr : (v.narrativeEn || v.narrativeAr)}
                </p>
                {inlineEditMode && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                    <button onClick={() => setEditingVisit(v)} className={styles.btnSecondary} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                      <Edit3 size={13} /> {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button onClick={() => handleDeleteVisit(v.id)} className={styles.btnSecondary} style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#e74c3c', borderColor: '#e74c3c' }}>
                      <Trash2 size={13} /> {language === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 11 — HISTORICAL PHOTO & DOCUMENT ARCHIVE */}
      <section id="archive-section" className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <ImageIcon size={24} color="var(--accent-gold)" />
              <span>{t('history_archive')}</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              {language === 'ar'
                ? 'معرض الصور الأرشيفية النادرة، وثائق التأسيس، والاحتفالات الكنسية عبر العقود.'
                : 'Archival gallery of historic photographs, foundational documents, and ceremonies.'}
            </p>
          </div>
          {inlineEditMode && (
            <button 
              className={styles.btnPrimary}
              onClick={() => setIsCreatingMedia(true)}
            >
              <Plus size={16} />
              <span>{language === 'ar' ? 'رفع وثيقة / صورة للأرشيف' : 'Add Media Item'}</span>
            </button>
          )}
        </div>

        {mediaItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <p style={{ fontSize: '1rem' }}>
              🖼️ {language === 'ar' ? 'الأرشيف البصري جاهز لاستقبال الصور والوثائق التاريخية القديمة.' : 'Visual archive ready for historical photographs.'}
            </p>
            {inlineEditMode && (
              <button className={styles.btnPrimary} onClick={() => setIsCreatingMedia(true)} style={{ marginTop: '12px' }}>
                + {language === 'ar' ? 'رفع أول صورة أرشيفية' : 'Upload First Image'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {mediaItems.map(item => (
              <div 
                key={item.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }}
                onClick={() => setLightboxImage({ url: item.url, title: item.titleAr, caption: item.captionAr || undefined })}
              >
                <div style={{ height: '180px', backgroundImage: `url(${item.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#111' }} />
                <div style={{ padding: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                    {language === 'ar' ? item.titleAr : (item.titleEn || item.titleAr)}
                  </h4>
                  {item.archivalCredit && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                      📷 {item.archivalCredit}
                    </span>
                  )}
                  {inlineEditMode && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setEditingMedia(item)} className={styles.btnSecondary} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                        <Edit3 size={12} /> {language === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                      <button onClick={() => handleDeleteMedia(item.id)} className={styles.btnSecondary} style={{ padding: '2px 8px', fontSize: '0.75rem', color: '#e74c3c' }}>
                        <Trash2 size={12} /> {language === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div className={styles.modalOverlay} onClick={() => setLightboxImage(null)}>
          <div style={{ maxWidth: '90vw', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage.url} alt={lightboxImage.title} className={styles.lightboxMedia} />
            <h3 style={{ color: '#fff', marginTop: '12px' }}>{lightboxImage.title}</h3>
            {lightboxImage.caption && <p style={{ color: 'var(--text-secondary)' }}>{lightboxImage.caption}</p>}
            <button 
              onClick={() => setLightboxImage(null)}
              style={{ marginTop: '12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '6px 18px', borderRadius: '20px', cursor: 'pointer' }}
            >
              ✕ {language === 'ar' ? 'إغلاق المعاينة' : 'Close Preview'}
            </button>
          </div>
        </div>
      )}

      {/* PRIEST BIO & ARCHIVAL MODAL */}
      {selectedPriestModal && (
        <div className={styles.modalOverlay} onClick={() => setSelectedPriestModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <span>{language === 'ar' ? `${selectedPriestModal.titleAr || 'القمص'} ${selectedPriestModal.ecclesiasticalNameAr}` : selectedPriestModal.ecclesiasticalNameEn}</span>
              </h3>
              <button className={styles.closeBtn} onClick={() => setSelectedPriestModal(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div 
                className={styles.clergyAvatar}
                style={{
                  width: '80px',
                  height: '80px',
                  margin: 0,
                  backgroundImage: selectedPriestModal.avatarUrl ? `url(${selectedPriestModal.avatarUrl})` : undefined,
                  backgroundColor: '#1b1d22',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {!selectedPriestModal.avatarUrl && (
                  <span style={{ fontSize: '2rem' }}>☦️</span>
                )}
              </div>
              <div>
                {selectedPriestModal.secularName && (selectedPriestModal.isSecularNameVisible || inlineEditMode) && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {language === 'ar' ? 'الاسم العلماني:' : 'Secular Name:'} <b style={{ color: '#fff' }}>{selectedPriestModal.secularName}</b>
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', marginTop: '4px' }}>
                  📅 {language === 'ar' ? 'تاريخ بداية الخدمة:' : 'Start:'} {selectedPriestModal.serviceStartDate}
                </div>
                {selectedPriestModal.serviceEndDate && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    🕊️ {language === 'ar' ? 'تاريخ النياحة / نهاية الخدمة:' : 'End:'} {selectedPriestModal.serviceEndDate}
                  </div>
                )}
              </div>
            </div>

            {selectedPriestModal.verificationWarning && (
              <div className={styles.warningAlertBox} style={{ marginBottom: '1.25rem' }}>
                ⚠️ {selectedPriestModal.verificationWarning}
              </div>
            )}

            <div style={{ lineHeight: 1.8, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1.5rem', whiteSpace: 'pre-line' }}>
              {language === 'ar' 
                ? (selectedPriestModal.bioAr || 'سجل مبارك في خدمة مذبح كنيسة الشهيد العظيم أبي سيفين، ومسيرة رعوية حافلة بالبذل والمحبة.') 
                : (selectedPriestModal.bioEn || 'A blessed pastoral ministry in the service of St. Philopater Church holy altar.')}
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setSelectedPriestModal(null)}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          INLINE EDIT MODALS (ADMIN ONLY)
          ======================================================== */}

      {/* 1. EDIT SETTINGS & FOUNDATION YEAR MODAL */}
      {editSettingsOpen && (
        <EditSettingsModal 
          settings={settings}
          onClose={() => setEditSettingsOpen(false)}
          onSaved={(newSettings) => {
            setSettings(newSettings);
            setEditSettingsOpen(false);
            showToast(language === 'ar' ? 'تم حفظ إعدادات وسنة التأسيس بنجاح' : 'Settings saved');
          }}
        />
      )}

      {/* 2. CREATE / EDIT CHAPTER MODAL */}
      {(editingChapter || isCreatingChapter) && (
        <ChapterFormModal 
          chapter={editingChapter}
          onClose={() => { setEditingChapter(null); setIsCreatingChapter(false); }}
          onSaved={() => {
            setEditingChapter(null);
            setIsCreatingChapter(false);
            loadHistoryData();
            showToast(language === 'ar' ? 'تم حفظ الفصل التاريخي بنجاح' : 'Chapter saved');
          }}
        />
      )}

      {/* 3. CREATE / EDIT CLERGY RECORD MODAL (WITH SECULAR NAME VISIBILITY TOGGLE) */}
      {(editingClergy || isCreatingClergy) && (
        <ClergyFormModal 
          clergy={editingClergy}
          onClose={() => { setEditingClergy(null); setIsCreatingClergy(false); }}
          onSaved={() => {
            setEditingClergy(null);
            setIsCreatingClergy(false);
            loadHistoryData();
            showToast(language === 'ar' ? 'تم حفظ بيانات الأب الكاهن والاسم العلماني' : 'Clergy record saved');
          }}
        />
      )}

      {/* 4. CREATE / EDIT TIMELINE EVENT MODAL */}
      {(editingEvent || isCreatingEvent) && (
        <EventFormModal 
          event={editingEvent}
          onClose={() => { setEditingEvent(null); setIsCreatingEvent(false); }}
          onSaved={() => {
            setEditingEvent(null);
            setIsCreatingEvent(false);
            loadHistoryData();
            showToast(language === 'ar' ? 'تم حفظ المحطة التاريخية' : 'Milestone saved');
          }}
        />
      )}

      {/* 5. CREATE / EDIT VISIT MODAL */}
      {(editingVisit || isCreatingVisit) && (
        <VisitFormModal 
          visit={editingVisit}
          onClose={() => { setEditingVisit(null); setIsCreatingVisit(false); }}
          onSaved={() => {
            setEditingVisit(null);
            setIsCreatingVisit(false);
            loadHistoryData();
            showToast(language === 'ar' ? 'تم حفظ الزيارة التاريخية' : 'Visit saved');
          }}
        />
      )}

      {/* 6. CREATE / EDIT MEDIA MODAL */}
      {(editingMedia || isCreatingMedia) && (
        <MediaFormModal 
          media={editingMedia}
          onClose={() => { setEditingMedia(null); setIsCreatingMedia(false); }}
          onSaved={() => {
            setEditingMedia(null);
            setIsCreatingMedia(false);
            loadHistoryData();
            showToast(language === 'ar' ? 'تم حفظ الوثيقة التاريخية' : 'Media saved');
          }}
        />
      )}

    </div>
  );

  // Handlers for Delete
  async function handleDeleteChapter(id: string) {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الفصل التاريخي؟' : 'Delete this chapter?')) return;
    try {
      const token = localStorage.getItem('church-token');
      const res = await fetch(`${API_URL}/history/chapters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(language === 'ar' ? 'تم حذف الفصل بنجاح' : 'Chapter deleted');
        loadHistoryData();
      }
    } catch (e) {
      alert('Error deleting');
    }
  }

  async function handleDeleteClergy(id: string) {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا السجل الكنسي؟' : 'Delete clergy record?')) return;
    try {
      const token = localStorage.getItem('church-token');
      const res = await fetch(`${API_URL}/history/clergy/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(language === 'ar' ? 'تم حذف السجل بنجاح' : 'Clergy record deleted');
        loadHistoryData();
      }
    } catch (e) {
      alert('Error deleting');
    }
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه المحطة التاريخية؟' : 'Delete timeline event?')) return;
    try {
      const token = localStorage.getItem('church-token');
      const res = await fetch(`${API_URL}/history/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(language === 'ar' ? 'تم حذف المحطة بنجاح' : 'Event deleted');
        loadHistoryData();
      }
    } catch (e) {
      alert('Error deleting');
    }
  }

  async function handleDeleteVisit(id: string) {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الزيارة التاريخية؟' : 'Delete visit?')) return;
    try {
      const token = localStorage.getItem('church-token');
      const res = await fetch(`${API_URL}/history/visits/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(language === 'ar' ? 'تم حذف الزيارة بنجاح' : 'Visit deleted');
        loadHistoryData();
      }
    } catch (e) {
      alert('Error deleting');
    }
  }

  async function handleDeleteMedia(id: string) {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الوثيقة من الأرشيف؟' : 'Delete media?')) return;
    try {
      const token = localStorage.getItem('church-token');
      const res = await fetch(`${API_URL}/history/media/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(language === 'ar' ? 'تم حذف الوثيقة بنجاح' : 'Media deleted');
        loadHistoryData();
      }
    } catch (e) {
      alert('Error deleting');
    }
  }
}

// ==========================================
// FORM MODAL COMPONENTS (INLINE EDITING)
// ==========================================

function EditSettingsModal({ settings, onClose, onSaved }: { settings: HistorySettings | null; onClose: () => void; onSaved: (s: HistorySettings) => void }) {
  const [foundingYear, setFoundingYear] = useState(settings?.foundingYear || 1955);
  const [headlineAr, setHeadlineAr] = useState(settings?.headlineAr || 'لكل كنيسة حكاية... وهذه حكايتنا.');
  const [headlineEn, setHeadlineEn] = useState(settings?.headlineEn || 'Every church has a story. This is ours.');
  const [subheadlineAr, setSubheadlineAr] = useState(settings?.subheadlineAr || 'منذ عام 1955');
  const [subheadlineEn, setSubheadlineEn] = useState(settings?.subheadlineEn || 'Since 1955');
  const [introTextAr, setIntroTextAr] = useState(settings?.introTextAr || '');
  const [introTextEn, setIntroTextEn] = useState(settings?.introTextEn || '');
  const [heroImageUrl, setHeroImageUrl] = useState(settings?.heroImageUrl || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const res = await fetch(`${API_URL}/history/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          foundingYear,
          headlineAr,
          headlineEn,
          subheadlineAr,
          subheadlineEn,
          introTextAr,
          introTextEn,
          heroImageUrl: heroImageUrl.trim() || null
        })
      });
      if (res.ok) {
        const data = await res.json();
        onSaved(data.settings);
      } else {
        alert('Failed to save settings');
      }
    } catch (err) {
      alert('Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>⚙️ إعدادات التاريخ وسنة التأسيس</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>سنة التأسيس المعتمدة (Confirmed Founding Year):</label>
            <input 
              type="number" 
              className={styles.formInput} 
              value={foundingYear} 
              onChange={(e) => setFoundingYear(parseInt(e.target.value, 10))} 
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>العنوان الرئيسي (عربي):</label>
            <input 
              type="text" 
              className={styles.formInput} 
              value={headlineAr} 
              onChange={(e) => setHeadlineAr(e.target.value)} 
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>العنوان الرئيسي (English):</label>
            <input 
              type="text" 
              className={styles.formInput} 
              value={headlineEn} 
              onChange={(e) => setHeadlineEn(e.target.value)} 
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>شارة التأسيس (عربي):</label>
            <input 
              type="text" 
              className={styles.formInput} 
              value={subheadlineAr} 
              onChange={(e) => setSubheadlineAr(e.target.value)} 
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>النص التعريفي الشامل (عربي):</label>
            <textarea 
              rows={4} 
              className={styles.formTextarea} 
              value={introTextAr} 
              onChange={(e) => setIntroTextAr(e.target.value)} 
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>رابط صورة الكنيسة التاريخية (Hero Background URL):</label>
            <input 
              type="text" 
              className={styles.formInput} 
              placeholder="https://..."
              value={heroImageUrl} 
              onChange={(e) => setHeroImageUrl(e.target.value)} 
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>إلغاء</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClergyFormModal({ clergy, onClose, onSaved }: { clergy: HistoryClergyRecord | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(clergy);
  const [ecclesiasticalNameAr, setEcclesiasticalNameAr] = useState(clergy?.ecclesiasticalNameAr || '');
  const [ecclesiasticalNameEn, setEcclesiasticalNameEn] = useState(clergy?.ecclesiasticalNameEn || '');
  const [secularName, setSecularName] = useState(clergy?.secularName || '');
  const [isSecularNameVisible, setIsSecularNameVisible] = useState(clergy ? clergy.isSecularNameVisible : true);
  const [avatarUrl, setAvatarUrl] = useState(clergy?.avatarUrl || '');
  const [serviceStartDate, setServiceStartDate] = useState(clergy?.serviceStartDate || '');
  const [serviceEndDate, setServiceEndDate] = useState(clergy?.serviceEndDate || '');
  const [isOngoing, setIsOngoing] = useState(clergy ? clergy.isOngoing : false);
  const [datePrecision, setDatePrecision] = useState(clergy?.datePrecision || 'EXACT');
  const [titleAr, setTitleAr] = useState(clergy?.titleAr || 'القمص');
  const [titleEn, setTitleEn] = useState(clergy?.titleEn || 'Hegumen');
  const [bioAr, setBioAr] = useState(clergy?.bioAr || '');
  const [verificationWarning, setVerificationWarning] = useState(clergy?.verificationWarning || '');
  const [saving, setSaving] = useState(false);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const url = isEdit ? `${API_URL}/history/clergy/${clergy!.id}` : `${API_URL}/history/clergy`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ecclesiasticalNameAr,
          ecclesiasticalNameEn,
          secularName: secularName.trim() || null,
          isSecularNameVisible,
          avatarUrl: avatarUrl.trim() || null,
          serviceStartDate,
          serviceEndDate: isOngoing ? null : (serviceEndDate.trim() || null),
          isOngoing,
          datePrecision,
          titleAr,
          titleEn,
          bioAr,
          verificationWarning: verificationWarning.trim() || null
        })
      });

      if (res.ok) {
        onSaved();
      } else {
        alert('Failed to save clergy record');
      }
    } catch (err) {
      alert('Error updating clergy record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEdit ? '✏️ تعديل بيانات الأب الكاهن والأرشيف' : '➕ إضافة أب كاهن للأرشيف التاريخي'}
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>الرتبة الكنسية (عربي):</label>
              <select className={styles.formSelect} value={titleAr} onChange={(e) => setTitleAr(e.target.value)}>
                <option value="القمص">القمص</option>
                <option value="القس">القس</option>
                <option value="الراهب القمص">الراهب القمص</option>
                <option value="الأسقف">الأسقف</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>الاسم الكنسي (عربي):</label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={ecclesiasticalNameAr} 
                onChange={(e) => setEcclesiasticalNameAr(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* SECULAR NAME & VISIBILITY CONTROLS (CRITICAL) */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', marginBottom: '1.25rem' }}>
            <div className={styles.formGroup} style={{ marginBottom: '8px' }}>
              <label className={styles.formLabel}>الاسم العلماني (Secular Name):</label>
              <input 
                type="text" 
                className={styles.formInput} 
                placeholder="مثال: سعيد فهمي نوار"
                value={secularName} 
                onChange={(e) => setSecularName(e.target.value)} 
              />
            </div>
            <label className={styles.formCheckboxLabel}>
              <input 
                type="checkbox" 
                checked={isSecularNameVisible} 
                onChange={(e) => setIsSecularNameVisible(e.target.checked)} 
              />
              <span>إظهار الاسم العلماني للعامة (إذا كان غير محدد؛ سيتم حجبه برمجياً من السيرفر تماماً)</span>
            </label>
          </div>

          {/* DATES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>تاريخ بدء الخدمة (YYYY-MM-DD أو YYYY):</label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={serviceStartDate} 
                onChange={(e) => setServiceStartDate(e.target.value)} 
                required 
              />
            </div>
            {!isOngoing && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>تاريخ نهاية الخدمة / النياحة (اختياري):</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="اتركه فارغاً إذا كان غير محدد"
                  value={serviceEndDate} 
                  onChange={(e) => setServiceEndDate(e.target.value)} 
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <label className={styles.formCheckboxLabel}>
              <input 
                type="checkbox" 
                checked={isOngoing} 
                onChange={(e) => setIsOngoing(e.target.checked)} 
              />
              <span>خدمة مستمرة حالياً بالصحة والبركة 🕊️</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem' }}>دقة التاريخ:</span>
              <select className={styles.formSelect} style={{ width: 'auto', padding: '4px 8px' }} value={datePrecision} onChange={(e) => setDatePrecision(e.target.value)}>
                <option value="EXACT">تاريخ محدد كامل (Exact)</option>
                <option value="YEAR_ONLY">سنة فقط (Year Only)</option>
                <option value="APPROXIMATE">تقريبي (Approximate)</option>
              </select>
            </div>
          </div>

          {/* VERIFICATION WARNING (E.G. 1936 PREDATING FOUNDING) */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ملاحظة / تنبيه تدقيق أرشيفي (يظهر للإدارة فقط):</label>
            <input 
              type="text" 
              className={styles.formInput} 
              placeholder="مثال: تاريخ البداية يسبق تأسيس الكنيسة، يتطلب مطابقة..."
              value={verificationWarning} 
              onChange={(e) => setVerificationWarning(e.target.value)} 
            />
          </div>

          {/* AVATAR IMAGE */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>صورة الأب الكاهن (رفع صورة من الجهاز أو رابط):</label>
            <input type="file" accept="image/*" onChange={handleImageFile} style={{ marginBottom: '8px', display: 'block', fontSize: '0.85rem' }} />
            <input 
              type="text" 
              className={styles.formInput} 
              placeholder="أو ضع رابط مباشر للصورة https://..."
              value={avatarUrl} 
              onChange={(e) => setAvatarUrl(e.target.value)} 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>نبذة السيرة والخدمة (عربي):</label>
            <textarea 
              rows={3} 
              className={styles.formTextarea} 
              value={bioAr} 
              onChange={(e) => setBioAr(e.target.value)} 
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>إلغاء</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ السجل الكنسي'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChapterFormModal({ chapter, onClose, onSaved }: { chapter: HistoryChapter | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(chapter);
  const [slug, setSlug] = useState(chapter?.slug || '');
  const [titleAr, setTitleAr] = useState(chapter?.titleAr || '');
  const [titleEn, setTitleEn] = useState(chapter?.titleEn || '');
  const [shortIntroAr, setShortIntroAr] = useState(chapter?.shortIntroAr || '');
  const [narrativeAr, setNarrativeAr] = useState(chapter?.narrativeAr || '');
  const [quoteText, setQuoteText] = useState(chapter?.quoteText || '');
  const [quoteSource, setQuoteSource] = useState(chapter?.quoteSource || '');
  const [heroImageUrl, setHeroImageUrl] = useState(chapter?.heroImageUrl || '');
  const [orderIndex, setOrderIndex] = useState(chapter?.orderIndex || 0);
  const [status, setStatus] = useState(chapter?.status || 'PUBLISHED');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const url = isEdit ? `${API_URL}/history/chapters/${chapter!.id}` : `${API_URL}/history/chapters`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          slug: slug || `chapter-${Date.now()}`,
          titleAr,
          titleEn,
          shortIntroAr,
          narrativeAr,
          quoteText,
          quoteSource,
          heroImageUrl: heroImageUrl.trim() || null,
          orderIndex,
          status
        })
      });

      if (res.ok) onSaved();
      else alert('Failed to save chapter');
    } catch (err) {
      alert('Error updating chapter');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{isEdit ? '✏️ تعديل الفصل التاريخي' : '➕ إضافة فصل تاريخي جديد'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>عنوان الفصل (عربي):</label>
            <input type="text" className={styles.formInput} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>عنوان الفصل (English):</label>
            <input type="text" className={styles.formInput} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>المعرف الثابت (Slug):</label>
            <input type="text" className={styles.formInput} value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>مقدمة موجزة للفصل:</label>
            <input type="text" className={styles.formInput} value={shortIntroAr} onChange={(e) => setShortIntroAr(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>النص التاريخي الكامل (Narrative):</label>
            <textarea rows={6} className={styles.formTextarea} value={narrativeAr} onChange={(e) => setNarrativeAr(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>آية / اقتباس بارز:</label>
              <input type="text" className={styles.formInput} value={quoteText} onChange={(e) => setQuoteText(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>الشاهد أو المصدر:</label>
              <input type="text" className={styles.formInput} value={quoteSource} onChange={(e) => setQuoteSource(e.target.value)} />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>رابط صورة غلاف الفصل:</label>
            <input type="text" className={styles.formInput} value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>إلغاء</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ الفصل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EventFormModal({ event, onClose, onSaved }: { event: HistoryEvent | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(event);
  const [titleAr, setTitleAr] = useState(event?.titleAr || '');
  const [descriptionAr, setDescriptionAr] = useState(event?.descriptionAr || '');
  const [eventDate, setEventDate] = useState(event?.eventDate || '1955');
  const [category, setCategory] = useState(event?.category || 'FOUNDATION');
  const [sources, setSources] = useState(event?.sources || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const url = isEdit ? `${API_URL}/history/events/${event!.id}` : `${API_URL}/history/events`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          titleAr,
          descriptionAr,
          eventDate,
          category,
          sources
        })
      });

      if (res.ok) onSaved();
      else alert('Failed to save milestone');
    } catch (err) {
      alert('Error updating event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{isEdit ? '✏️ تعديل محطة بالخط الزمني' : '➕ إضافة محطة جديدة بالخط الزمني'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>عنوان المحطة التاريخية (عربي):</label>
            <input type="text" className={styles.formInput} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>التاريخ (YYYY أو YYYY-MM-DD):</label>
              <input type="text" className={styles.formInput} value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>تصنيف الحدث:</label>
              <select className={styles.formSelect} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="FOUNDATION">نشأة وتأسيس (Foundation)</option>
                <option value="CONSTRUCTION">بناء وتشييد (Construction)</option>
                <option value="EXPANSION">توسعة وتجديد (Expansion)</option>
                <option value="CLERGY_APPOINTMENT">رسامة وتعيين كهنة (Clergy)</option>
                <option value="PAPAL_VISIT">زيارة بابوية (Papal Visit)</option>
                <option value="CELEBRATION">احتفال ويوبيل (Celebration)</option>
                <option value="COMMUNITY">خدمة ومجتمع (Community)</option>
              </select>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>تفاصيل المحطة التاريخية:</label>
            <textarea rows={4} className={styles.formTextarea} value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>المصدر الأرشيفي المعتمد:</label>
            <input type="text" className={styles.formInput} value={sources} onChange={(e) => setSources(e.target.value)} />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>إلغاء</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ المحطة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VisitFormModal({ visit, onClose, onSaved }: { visit: HistoryVisit | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(visit);
  const [visitorNameAr, setVisitorNameAr] = useState(visit?.visitorNameAr || '');
  const [ecclesiasticalTitleAr, setEcclesiasticalTitleAr] = useState(visit?.ecclesiasticalTitleAr || 'بابا وبطريرك الكرازة المرقسية');
  const [visitTitleAr, setVisitTitleAr] = useState(visit?.visitTitleAr || '');
  const [visitDate, setVisitDate] = useState(visit?.visitDate || '');
  const [occasionAr, setOccasionAr] = useState(visit?.occasionAr || '');
  const [narrativeAr, setNarrativeAr] = useState(visit?.narrativeAr || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const url = isEdit ? `${API_URL}/history/visits/${visit!.id}` : `${API_URL}/history/visits`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          visitorNameAr,
          ecclesiasticalTitleAr,
          visitTitleAr,
          visitDate,
          occasionAr,
          narrativeAr
        })
      });

      if (res.ok) onSaved();
      else alert('Failed to save visit');
    } catch (err) {
      alert('Error updating visit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{isEdit ? '✏️ تعديل الزيارة التاريخية' : '➕ إضافة زيارة تاريخية موثقة'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>اسم الزائر الجليل (عربي):</label>
            <input type="text" className={styles.formInput} placeholder="قداسة البابا شنودة الثالث..." value={visitorNameAr} onChange={(e) => setVisitorNameAr(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>الرتبة الكنسية:</label>
              <input type="text" className={styles.formInput} value={ecclesiasticalTitleAr} onChange={(e) => setEcclesiasticalTitleAr(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>تاريخ الزيارة (YYYY أو YYYY-MM-DD):</label>
              <input type="text" className={styles.formInput} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} required />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>عنوان وموضوع الزيارة:</label>
            <input type="text" className={styles.formInput} placeholder="تدشين المعمودية، زيارة رعوية..." value={visitTitleAr} onChange={(e) => setVisitTitleAr(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>تفاصيل ووقائع الزيارة:</label>
            <textarea rows={4} className={styles.formTextarea} value={narrativeAr} onChange={(e) => setNarrativeAr(e.target.value)} required />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>إلغاء</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ الزيارة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MediaFormModal({ media, onClose, onSaved }: { media: HistoryMediaItem | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(media);
  const [url, setUrl] = useState(media?.url || '');
  const [titleAr, setTitleAr] = useState(media?.titleAr || '');
  const [captionAr, setCaptionAr] = useState(media?.captionAr || '');
  const [archivalCredit, setArchivalCredit] = useState(media?.archivalCredit || '');
  const [category, setCategory] = useState(media?.category || 'CHURCH_BUILDING');
  const [saving, setSaving] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const apiEndpoint = isEdit ? `${API_URL}/history/media/${media!.id}` : `${API_URL}/history/media`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          url,
          titleAr,
          captionAr,
          archivalCredit,
          category
        })
      });

      if (res.ok) onSaved();
      else alert('Failed to save media');
    } catch (err) {
      alert('Error updating media');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{isEdit ? '✏️ تعديل الوثيقة الأرشيفية' : '➕ إضافة صورة أو وثيقة للأرشيف'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>عنوان الوثيقة / الصورة (عربي):</label>
            <input type="text" className={styles.formInput} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>الملف أو الصورة (رفع من جهازك أو ضع رابط):</label>
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem' }} />
            <input type="text" className={styles.formInput} placeholder="أو رابط https://..." value={url} onChange={(e) => setUrl(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>القسم الأرشيفي:</label>
            <select className={styles.formSelect} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="CHURCH_BUILDING">مبنى الكنيسة والمنشآت (Church Building)</option>
              <option value="CLERGY">صور الآباء الكهنة (Clergy Portraits)</option>
              <option value="VISIT">زيارات تاريخية (Historic Visits)</option>
              <option value="CELEBRATION">احتفالات ومناسبات (Celebrations)</option>
              <option value="DOCUMENT">وثائق ومكاتبات رسمية (Documents)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>المصدر الأرشيفي أو المصور (Archival Credit):</label>
            <input type="text" className={styles.formInput} placeholder="أرشيف الكنيسة الرسمي، تصوير..." value={archivalCredit} onChange={(e) => setArchivalCredit(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>الوصف والتعليق (Caption):</label>
            <textarea rows={2} className={styles.formTextarea} value={captionAr} onChange={(e) => setCaptionAr(e.target.value)} />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>إلغاء</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ بالأرشيف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
