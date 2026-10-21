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
  Shield, Download, ExternalLink, X, RefreshCw, Camera, ArrowUp, ArrowDown,
  Scissors, GripVertical, ChevronDown, ChevronUp
} from 'lucide-react';
import ImageCropModal from '../../components/ImageCropModal';

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
  isDeceased?: boolean;
  isServingAbroad?: boolean;
  servingAbroadLocation?: string | null;
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

interface HistoryPopeRecord {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  titleAr: string;
  titleEn?: string | null;
  papalNumber?: number | null;
  papacyPeriod: string;
  isDeceased: boolean;
  isLocumTenens?: boolean;
  locumContextAr?: string | null;
  avatarUrl?: string | null;
  bioAr?: string | null;
  bioEn?: string | null;
  orderIndex: number;
  status: string;
}

interface HistoryBishopRecord {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  titleAr: string;
  titleEn?: string | null;
  episcopalPeriod: string;
  isDeceased?: boolean;
  bishopStatus?: string; // 'CURRENT' | 'OTHER_DIOCESE' | 'DECEASED'
  currentDioceseOrService?: string | null;
  avatarUrl?: string | null;
  bioAr?: string | null;
  bioEn?: string | null;
  orderIndex: number;
  status: string;
}

interface HistoryServantCategory {
  id: string;
  key: string;
  nameAr: string;
  nameEn?: string | null;
  orderIndex: number;
}

interface HistoryServantFruit {
  id: string;
  fullNameAr: string;
  fullNameEn?: string | null;
  currentRole: string;
  categoryKey?: string | null;
  ordinationYear?: string | null;
  currentChurchOrLocation?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  orderIndex: number;
  status: string;
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
  galleryJson?: string | null;
  status: string;
}

// Reusable Image Upload Field (Matching the Normal Priests system)
function ImageUploadField({
  label,
  value,
  onChange,
  isCircular = true,
  fallbackIcon = '✝️'
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  isCircular?: boolean;
  fallbackIcon?: string;
}) {
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempCropUrl, setTempCropUrl] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 8 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setTempCropUrl(result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const openCropper = () => {
    if (!value) {
      alert('يرجى اختيار صورة أولاً أو وضع رابط صالح لقصها');
      return;
    }
    setTempCropUrl(value);
    setCropModalOpen(true);
  };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontWeight: 700, fontSize: '0.86rem', color: 'var(--accent-gold)', marginBottom: '8px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        <div style={{
          width: '74px',
          height: '74px',
          borderRadius: isCircular ? '50%' : '10px',
          border: '2px solid var(--accent-gold)',
          backgroundColor: '#16171b',
          backgroundImage: value ? `url(${value})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          fontSize: '1.8rem',
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
        }}>
          {!value && fallbackIcon}
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="رابط الصورة المباشر أو ارفع من جهازك"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: '0.84rem',
              boxSizing: 'border-box',
              marginBottom: '6px'
            }}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}>
              <Camera size={14} />
              <span>اختيار صورة من جهازك</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
            </label>

            {value && (
              <button
                type="button"
                onClick={openCropper}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(226, 183, 20, 0.15)',
                  border: '1px solid var(--accent-gold)',
                  color: 'var(--accent-gold)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
                title="قص وضبط أبعاد الصورة والموضع الدائري"
              >
                <Scissors size={13} />
                <span>قص وضبط</span>
              </button>
            )}

            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                style={{
                  background: 'rgba(231, 76, 60, 0.15)',
                  border: '1px solid rgba(231, 76, 60, 0.4)',
                  color: '#e74c3c',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                مسح الصورة
              </button>
            )}
          </div>
        </div>
      </div>

      {cropModalOpen && (
        <ImageCropModal
          isOpen={cropModalOpen}
          imageUrl={tempCropUrl}
          aspectRatioPreset={isCircular ? 'circle' : 'free'}
          onClose={() => setCropModalOpen(false)}
          onCropComplete={(croppedDataUrl) => {
            onChange(croppedDataUrl);
            setCropModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Multi-Image Gallery / Album Component
function MultiImageGalleryField({
  label,
  images,
  onChange
}: {
  label: string;
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [newUrl, setNewUrl] = useState('');

  const handleMultipleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onChange([...images, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  const addUrl = () => {
    if (newUrl.trim()) {
      onChange([...images, newUrl.trim()]);
      setNewUrl('');
    }
  };

  const removeImg = (index: number) => {
    onChange(images.filter((_, idx) => idx !== index));
  };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontWeight: 700, fontSize: '0.86rem', color: 'var(--accent-gold)', marginBottom: '8px' }}>
        {label} ({images.length} صور)
      </label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="رابط صورة مباشر..."
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          style={{
            flex: 1,
            minWidth: '180px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            fontSize: '0.84rem'
          }}
        />
        <button
          type="button"
          onClick={addUrl}
          style={{
            background: 'var(--accent-gold)',
            color: '#000',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.82rem'
          }}
        >
          + إضافة رابط
        </button>
        <label style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          fontSize: '0.82rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}>
          <Camera size={14} />
          <span>اختيار صور من الجهاز</span>
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleMultipleFiles}
          />
        </label>
      </div>

      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: '8px',
          background: 'rgba(0,0,0,0.25)',
          padding: '10px',
          borderRadius: '8px',
          maxHeight: '180px',
          overflowY: 'auto'
        }}>
          {images.map((img, idx) => (
            <div key={idx} style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => removeImg(idx)}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: 'rgba(0,0,0,0.75)',
                  color: '#e74c3c',
                  border: 'none',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px'
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { language, t } = useTheme();

  // State
  const [settings, setSettings] = useState<HistorySettings | null>(null);
  const [chapters, setChapters] = useState<HistoryChapter[]>([]);
  const [activeChapterSlug, setActiveChapterSlug] = useState<string>('foundation');
  const [clergyList, setClergyList] = useState<HistoryClergyRecord[]>([]);
  const [popes, setPopes] = useState<HistoryPopeRecord[]>([]);
  const [bishops, setBishops] = useState<HistoryBishopRecord[]>([]);
  const [servantCategories, setServantCategories] = useState<HistoryServantCategory[]>([]);
  const [servantsFruits, setServantsFruits] = useState<HistoryServantFruit[]>([]);
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
  const [servantRoleFilter, setServantRoleFilter] = useState<string>('ALL');
  const [selectedPriestModal, setSelectedPriestModal] = useState<HistoryClergyRecord | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; caption?: string } | null>(null);
  const [albumModal, setAlbumModal] = useState<{ title: string; images: string[] } | null>(null);

  // Interactive Chapter Reader Controls
  const [chapterTab, setChapterTab] = useState<'narrative' | 'gallery' | 'figures'>('narrative');
  const [fontScale, setFontScale] = useState<number>(1);
  const [isPlayingNarration, setIsPlayingNarration] = useState<boolean>(false);
  const [fullscreenReading, setFullscreenReading] = useState<boolean>(false);

  // Inline Modals
  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<HistoryChapter | null>(null);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [editingClergy, setEditingClergy] = useState<HistoryClergyRecord | null>(null);
  const [isCreatingClergy, setIsCreatingClergy] = useState(false);
  const [editingPope, setEditingPope] = useState<HistoryPopeRecord | null>(null);
  const [isCreatingPope, setIsCreatingPope] = useState(false);
  const [editingBishop, setEditingBishop] = useState<HistoryBishopRecord | null>(null);
  const [isCreatingBishop, setIsCreatingBishop] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HistoryServantCategory | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingServantFruit, setEditingServantFruit] = useState<HistoryServantFruit | null>(null);
  const [isCreatingServantFruit, setIsCreatingServantFruit] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HistoryEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingVisit, setEditingVisit] = useState<HistoryVisit | null>(null);
  const [isCreatingVisit, setIsCreatingVisit] = useState(false);
  const [editingMedia, setEditingMedia] = useState<HistoryMediaItem | null>(null);
  const [isCreatingMedia, setIsCreatingMedia] = useState(false);

  // Check auth and ensure cache is clear so real updated data is always loaded
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

      // Clear any past cached history data so real updated data is always fetched directly
      try {
        localStorage.removeItem('cached_history_data');
      } catch (e) {}
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
        setPopes(data.popes || []);
        setBishops(data.bishops || []);
        
        const defaultCats: HistoryServantCategory[] = [
          { id: 'cat-1', key: 'DEACON', nameAr: 'الشمامسة المباركون', orderIndex: 1 },
          { id: 'cat-2', key: 'PRIEST_MONK', nameAr: 'آباء كهنة ورهبان', orderIndex: 2 },
          { id: 'cat-3', key: 'CONSECRATED', nameAr: 'خدام مكرسون وأمناء خدمة', orderIndex: 3 }
        ];
        setServantCategories((data.servantCategories && data.servantCategories.length > 0) ? data.servantCategories : defaultCats);
        setServantsFruits(data.servantsFruits || []);
        setEvents(data.events || []);
        setVisits(data.visits || []);
        setMediaItems(data.media || []);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Servants & Deacons Fruit
  const filteredServants = servantsFruits.filter(s => {
    if (servantRoleFilter === 'ALL') return true;
    if (s.categoryKey) {
      return s.categoryKey === servantRoleFilter;
    }
    const role = (s.currentRole || '').toLowerCase();
    if (servantRoleFilter === 'DEACON') return role.includes('شماس') || role.includes('دياكون') || role.includes('deacon');
    if (servantRoleFilter === 'PRIEST_MONK') return role.includes('كاهن') || role.includes('قس') || role.includes('قمص') || role.includes('راهب') || role.includes('priest') || role.includes('monk');
    if (servantRoleFilter === 'CONSECRATED') return role.includes('مكرس') || role.includes('أمين') || role.includes('خادم') || role.includes('servant');
    return false;
  });

  // Collapsible Sections State (Every section can be collapsed / expanded)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Drag and Drop State & Handlers for Popes / Locum Tenens
  const [draggedPopeId, setDraggedPopeId] = useState<string | null>(null);
  const [dragOverPopeId, setDragOverPopeId] = useState<string | null>(null);

  const handlePopeDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPopeId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handlePopeDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPopeId !== id) {
      setDragOverPopeId(id);
    }
  };

  const handlePopeDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverPopeId(null);
    const sourceId = draggedPopeId || e.dataTransfer.getData('text/plain');
    setDraggedPopeId(null);
    if (!sourceId || sourceId === targetId) return;

    const sourceIdx = popes.findIndex(p => p.id === sourceId);
    const targetIdx = popes.findIndex(p => p.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newPopes = [...popes];
    const [removed] = newPopes.splice(sourceIdx, 1);
    newPopes.splice(targetIdx, 0, removed);

    const items = newPopes.map((p, idx) => ({ id: p.id, orderIndex: idx + 1 }));
    setPopes(newPopes.map((p, idx) => ({ ...p, orderIndex: idx + 1 })));

    try {
      const token = localStorage.getItem('church-token');
      await fetch(`${API_URL}/history/popes/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items })
      });
      showToast(language === 'ar' ? 'تم حفظ الترتيب الجديد بالسحب والإفلات ✨' : 'Order saved via drag & drop ✨');
    } catch (e) {
      console.error(e);
    }
  };

  // Reorder Popes (fallback button method)
  const handleMovePope = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= popes.length) return;
    const newPopes = [...popes];
    const temp = newPopes[index];
    newPopes[index] = newPopes[targetIndex];
    newPopes[targetIndex] = temp;
    
    const items = newPopes.map((p, idx) => ({ id: p.id, orderIndex: idx + 1 }));
    setPopes(newPopes.map((p, idx) => ({ ...p, orderIndex: idx + 1 })));

    try {
      const token = localStorage.getItem('church-token');
      await fetch(`${API_URL}/history/popes/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items })
      });
      showToast(language === 'ar' ? 'تم تحديث ترتيب الآباء البطاركة بنجاح' : 'Popes order updated');
    } catch (e) {
      console.error(e);
    }
  };

  // Drag and Drop State & Handlers for Supervising Bishops
  const [draggedBishopId, setDraggedBishopId] = useState<string | null>(null);
  const [dragOverBishopId, setDragOverBishopId] = useState<string | null>(null);

  const handleBishopDragStart = (e: React.DragEvent, id: string) => {
    setDraggedBishopId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleBishopDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverBishopId !== id) {
      setDragOverBishopId(id);
    }
  };

  const handleBishopDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverBishopId(null);
    const sourceId = draggedBishopId || e.dataTransfer.getData('text/plain');
    setDraggedBishopId(null);
    if (!sourceId || sourceId === targetId) return;

    const sourceIdx = bishops.findIndex(b => b.id === sourceId);
    const targetIdx = bishops.findIndex(b => b.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newBishops = [...bishops];
    const [removed] = newBishops.splice(sourceIdx, 1);
    newBishops.splice(targetIdx, 0, removed);

    const items = newBishops.map((b, idx) => ({ id: b.id, orderIndex: idx + 1 }));
    setBishops(newBishops.map((b, idx) => ({ ...b, orderIndex: idx + 1 })));

    try {
      const token = localStorage.getItem('church-token');
      await fetch(`${API_URL}/history/bishops/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items })
      });
      showToast(language === 'ar' ? 'تم حفظ ترتيب الآباء الأساقفة بالسحب والإفلات ✨' : 'Bishops order saved via drag & drop ✨');
    } catch (e) {
      console.error(e);
    }
  };

  // Reorder Bishops (fallback button method)
  const handleMoveBishop = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= bishops.length) return;
    const newBishops = [...bishops];
    const temp = newBishops[index];
    newBishops[index] = newBishops[targetIndex];
    newBishops[targetIndex] = temp;

    const items = newBishops.map((b, idx) => ({ id: b.id, orderIndex: idx + 1 }));
    setBishops(newBishops.map((b, idx) => ({ ...b, orderIndex: idx + 1 })));

    try {
      const token = localStorage.getItem('church-token');
      await fetch(`${API_URL}/history/bishops/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items })
      });
      showToast(language === 'ar' ? 'تم تحديث ترتيب الآباء الأساقفة بنجاح' : 'Bishops order updated');
    } catch (e) {
      console.error(e);
    }
  };

  const handleChapterChange = (slug: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingNarration(false);
    }
    setActiveChapterSlug(slug);
  };

  const toggleNarration = () => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) {
      alert(language === 'ar' ? 'المتصفح لا يدعم القراءة الصوتية.' : 'Speech synthesis not supported in this browser.');
      return;
    }
    if (isPlayingNarration) {
      window.speechSynthesis.cancel();
      setIsPlayingNarration(false);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = language === 'ar'
        ? `${currentChapter?.titleAr}. ${currentChapter?.narrativeAr}`
        : `${currentChapter?.titleEn}. ${currentChapter?.narrativeEn || currentChapter?.narrativeAr}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = language === 'ar' ? 'ar-EG' : 'en-US';
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingNarration(false);
      utterance.onerror = () => setIsPlayingNarration(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingNarration(true);
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

  if (loading) {
    return (
      <div className={styles.historyPage} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className={styles.historyLoadingState}>
          <div className={styles.historyLoadingIcon}>☦️</div>
          <div className={styles.historyLoadingTitle}>
            {language === 'ar' ? 'جاري استحضار سجلات التاريخ الكنسي والتراث المقدس...' : 'Loading Sacred Church History & Heritage...'}
          </div>
          <div className={styles.historyLoadingBarWrap}>
            <div className={styles.historyLoadingBarFill} />
          </div>
        </div>
      </div>
    );
  }

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
                  onClick={() => setIsCreatingPope(true)}
                >
                  <Plus size={14} />
                  <span>{language === 'ar' ? 'إضافة قداسة بابا' : 'Add Pope'}</span>
                </button>
                <button 
                  className={styles.adminToggleBtn}
                  onClick={() => setIsCreatingBishop(true)}
                >
                  <Plus size={14} />
                  <span>{language === 'ar' ? 'إضافة حبر جليل' : 'Add Bishop'}</span>
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
          {/* Confirmed Founding Year: 1955 (Authentic Ecclesiastical Emblem) */}
          <div className={styles.foundingBadge}>
            <span className={styles.foundingBadgeGlyph}>✝</span>
            <span>
              {language === 'ar' 
                ? (settings?.subheadlineAr || `منذ عام ${settings?.foundingYear || 1955}`) 
                : (settings?.subheadlineEn || `Since ${settings?.foundingYear || 1955}`)}
            </span>
            {inlineEditMode && (
              <button 
                onClick={() => setEditSettingsOpen(true)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                title="تعديل مقدمة الصفحة"
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
            <a href="#popes-section" className={styles.btnSecondary}>
              <Shield size={18} />
              <span>{language === 'ar' ? 'الآباء البطاركة والأساقفة' : 'Popes & Bishops'}</span>
            </a>
            <a href="#clergy-section" className={styles.btnSecondary}>
              <Users size={18} />
              <span>{t('history_clergy')}</span>
            </a>
            <a href="#timeline-section" className={styles.btnSecondary}>
              <Calendar size={18} />
              <span>{t('history_timeline')}</span>
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
          </div>
        </div>
      </section>

      {/* Persistent Section Navigation Bar */}
      <nav className={styles.stickyNavBar}>
        <a href="#chapters-section" className={styles.stickyNavLink}>
          <BookOpen size={15} />
          <span>{language === 'ar' ? 'فصول الرواية' : 'Chapters'}</span>
        </a>
        <a href="#popes-section" className={styles.stickyNavLink}>
          <Shield size={15} />
          <span>{language === 'ar' ? 'الآباء البطاركة' : 'Popes'}</span>
        </a>
        <a href="#bishops-section" className={styles.stickyNavLink}>
          <Shield size={15} />
          <span>{language === 'ar' ? 'الآباء الأساقفة' : 'Bishops'}</span>
        </a>
        <a href="#clergy-section" className={styles.stickyNavLink}>
          <Users size={15} />
          <span>{t('history_clergy')}</span>
        </a>
        <a href="#servants-section" className={styles.stickyNavLink}>
          <Sparkles size={15} />
          <span>{language === 'ar' ? 'ثمار الخدمة' : 'Deacons & Servants'}</span>
        </a>
        <a href="#timeline-section" className={styles.stickyNavLink}>
          <Calendar size={15} />
          <span>{t('history_timeline')}</span>
        </a>
        <a href="#visits-section" className={styles.stickyNavLink}>
          <CheckCircle size={15} />
          <span>{t('history_visits')}</span>
        </a>
        <a href="#archive-section" className={styles.stickyNavLink}>
          <ImageIcon size={15} />
          <span>{t('history_archive')}</span>
        </a>
      </nav>

      {/* SECTION B & C — THE ULTRA-INTERACTIVE HISTORICAL JOURNEY (CHAPTERS) */}
      <section id="chapters-section" className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <BookOpen size={24} color="var(--accent-gold)" />
              <span>{language === 'ar' ? 'رحلة الأجيال — فصول التاريخ' : 'The Historical Journey — Chapters'}</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              {language === 'ar'
                ? 'استكشف حكاية كنيستنا عبر 8 محطات رئيسية توثق النعمة والبركة منذ عام 1955 وحتى اليوم مع إمكانية القراءة التفاعلية والاستماع الصوتي.'
                : 'Explore our church history through 8 core chapters with interactive audio narration and archival media.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {inlineEditMode && (
              <button 
                className={styles.btnSecondary}
                onClick={() => setIsCreatingChapter(true)}
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'إضافة فصل تاريخي جديد' : 'Add Chapter'}</span>
              </button>
            )}
            <button
              type="button"
              className={styles.collapseToggleBtn}
              onClick={() => toggleSection('chapters')}
              title={collapsedSections['chapters'] ? (language === 'ar' ? 'توسيع القسم' : 'Expand') : (language === 'ar' ? 'طي القسم' : 'Collapse')}
            >
              {collapsedSections['chapters'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span>{collapsedSections['chapters'] ? (language === 'ar' ? 'توسيع' : 'Expand') : (language === 'ar' ? 'طي' : 'Collapse')}</span>
            </button>
          </div>
        </div>

        {!collapsedSections['chapters'] && (
          <div className={styles.sectionCollapsibleBody}>
            {/* Chapter Scrubber Bar */}
        <div className={styles.chapterScrubberBar}>
          {chapters.map((ch, idx) => {
            const isActive = ch.slug === activeChapterSlug;
            return (
              <button
                key={ch.id}
                className={`${styles.scrubberChip} ${isActive ? styles.scrubberActive : ''}`}
                onClick={() => handleChapterChange(ch.slug)}
                title={language === 'ar' ? ch.titleAr : ch.titleEn}
              >
                <span>{idx + 1}.</span>
                <span>{language === 'ar' ? ch.titleAr : ch.titleEn}</span>
                {ch.status === 'DRAFT' && <span style={{ fontSize: '0.7rem', color: '#e67e22' }}>[مسودة]</span>}
              </button>
            );
          })}
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
                  {language === 'ar' ? `الفصل ${currentChapterIndex + 1} من ${chapters.length}` : `Chapter ${currentChapterIndex + 1} of ${chapters.length}`}
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

            {/* Interactive Reader Toolbar */}
            <div className={styles.chapterInteractiveHeader}>
              <div className={styles.readerToolbar}>
                <span className={styles.readingTimeBadge}>
                  ⏱️ {language === 'ar' 
                    ? `${Math.max(1, Math.ceil((currentChapter.narrativeAr?.length || 300) / 380))} دقائق للقراءة` 
                    : `${Math.max(1, Math.ceil((currentChapter.narrativeAr?.length || 300) / 380))} min read`}
                </span>

                {/* Audio Narration Feature */}
                <button 
                  className={`${styles.audioNarrationBtn} ${isPlayingNarration ? styles.playing : ''}`}
                  onClick={toggleNarration}
                  title={language === 'ar' ? 'استمع للسرد الصوتي للفصل' : 'Listen to chapter narration'}
                >
                  {isPlayingNarration ? '⏹️ إيقاف القراءة الصوتية' : '🎧 استمع للسرد الصوتي'}
                </button>

                {/* Font Scaling */}
                <div className={styles.fontScaleGroup}>
                  <button 
                    className={styles.fontScaleBtn}
                    onClick={() => setFontScale(prev => Math.max(0.85, prev - 0.1))}
                    title="تصغير الخط"
                  >
                    A-
                  </button>
                  <button 
                    className={styles.fontScaleBtn}
                    onClick={() => setFontScale(prev => Math.min(1.35, prev + 0.1))}
                    title="تكبير الخط"
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* Fullscreen Reading Button */}
              <button 
                className={styles.fullscreenReaderBtn}
                onClick={() => setFullscreenReading(true)}
              >
                📖 {language === 'ar' ? 'وضع القراءة الهادئ' : 'Fullscreen Reader'}
              </button>
            </div>

            <div className={styles.chapterBody}>
              {/* Tab Navigation */}
              <div className={styles.chapterTabsNav}>
                <button 
                  className={`${styles.chapterTabButton} ${chapterTab === 'narrative' ? styles.activeTab : ''}`}
                  onClick={() => setChapterTab('narrative')}
                >
                  📜 {language === 'ar' ? 'الرواية الكاملة' : 'Full Narrative'}
                </button>
                <button 
                  className={`${styles.chapterTabButton} ${chapterTab === 'gallery' ? styles.activeTab : ''}`}
                  onClick={() => setChapterTab('gallery')}
                >
                  🖼️ {language === 'ar' ? 'معرض صور هذا الفصل' : 'Photo Gallery'}
                </button>
                <button 
                  className={`${styles.chapterTabButton} ${chapterTab === 'figures' ? styles.activeTab : ''}`}
                  onClick={() => setChapterTab('figures')}
                >
                  👥 {language === 'ar' ? 'رعاة وشخصيات العصر' : 'Clergy & Figures'}
                </button>
              </div>

              {/* Tab 1: Narrative */}
              {chapterTab === 'narrative' && (
                <div>
                  {currentChapter.quoteText && (
                    <blockquote className={styles.chapterQuote}>
                      <p>«{currentChapter.quoteText}»</p>
                      {currentChapter.quoteSource && (
                        <cite style={{ display: 'block', marginTop: '6px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          — {currentChapter.quoteSource}
                        </cite>
                      )}
                    </blockquote>
                  )}

                  <div 
                    className={styles.chapterNarrative} 
                    style={{ fontSize: `${fontScale * 1.05}rem`, lineHeight: 2.1 }}
                  >
                    {language === 'ar' ? currentChapter.narrativeAr : (currentChapter.narrativeEn || currentChapter.narrativeAr)}
                  </div>
                </div>
              )}

              {/* Tab 2: Gallery & Media */}
              {chapterTab === 'gallery' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '2rem' }}>
                    {mediaItems.slice(0, 6).map((m) => (
                      <div 
                        key={m.id}
                        onClick={() => setLightboxImage({ url: m.url, title: m.titleAr, caption: m.captionAr || '' })}
                        style={{
                          borderRadius: '10px',
                          overflow: 'hidden',
                          background: '#1b1d22',
                          cursor: 'pointer',
                          border: '1px solid var(--border-color)',
                          transition: 'transform 0.2s ease'
                        }}
                      >
                        <div style={{ height: '160px', backgroundImage: `url(${m.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{m.titleAr}</div>
                          {m.archivalCredit && <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: '4px' }}>📷 {m.archivalCredit}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Figures & Clergy of this era */}
              {chapterTab === 'figures' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginBottom: '2rem' }}>
                    {clergyList.slice(0, 4).map((p) => {
                      const isDeceased = Boolean(p.isDeceased || p.serviceEndDate);
                      return (
                        <div 
                          key={p.id}
                          onClick={() => setSelectedPriestModal(p)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            borderRadius: '10px',
                            background: isDeceased ? '#18191c' : 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer'
                          }}
                        >
                          <div 
                            style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: '50%',
                              backgroundImage: p.avatarUrl ? `url(${p.avatarUrl})` : undefined,
                              backgroundColor: '#222',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              filter: isDeceased ? 'grayscale(100%)' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.2rem',
                              border: isDeceased ? '1px solid #666' : '1px solid var(--accent-gold)'
                            }}
                          >
                            {!p.avatarUrl && '☦️'}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>{p.ecclesiasticalNameAr}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--accent-gold)' }}>{p.serviceStartDate} — {p.isOngoing ? 'مستمر' : (p.serviceEndDate || 'متنيح')}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    onClick={() => handleChapterChange(chapters[currentChapterIndex - 1].slug)}
                  >
                    {language === 'ar' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    <span>{language === 'ar' ? `السابق: ${chapters[currentChapterIndex - 1].titleAr}` : 'Previous Chapter'}</span>
                  </button>
                ) : <div></div>}

                {currentChapterIndex < chapters.length - 1 ? (
                  <button 
                    className={styles.btnPrimary}
                    onClick={() => handleChapterChange(chapters[currentChapterIndex + 1].slug)}
                  >
                    <span>{language === 'ar' ? `التالي: ${chapters[currentChapterIndex + 1].titleAr}` : 'Next Chapter'}</span>
                    {language === 'ar' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                  </button>
                ) : (
                  <a href="#popes-section" className={styles.btnPrimary}>
                    <span>{language === 'ar' ? 'متابعة إلى الآباء البطاركة والأساقفة' : 'Proceed to Popes & Bishops'}</span>
                  </a>
                )}
              </div>
            </div>
          </article>
        )}
          </div>
        )}
      </section>

      {/* SECTION — POPES OF ALEXANDRIA & LOCUM TENENS (الآباء البطاركة وقائم مقام) */}
      <section id="popes-section" className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Shield size={24} color="var(--accent-gold)" />
              <span>{language === 'ar' ? 'الآباء البطاركة — باباوات الكنيسة القبطية الأرثوذكسية المعاصرون وقائم مقام' : 'Popes of Alexandria & Locum Tenens'}</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              {language === 'ar'
                ? 'توثيق لمسيرة الرعاية الرسولية المباركة لقداسة باباوات الإسكندرية الذين قادوا الكنيسة، مع توثيق الآباء المطارنة القائم مقام البطريركي بعد نياحة البابا.'
                : 'Honoring the Holy Patriarchs of the See of St. Mark and the Locum Tenens who shepherded during transitions.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {inlineEditMode && (
              <button 
                className={styles.btnPrimary}
                onClick={() => setIsCreatingPope(true)}
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'إضافة بطريرك / قائم مقام' : 'Add Pope / Locum'}</span>
              </button>
            )}
            <button
              type="button"
              className={styles.collapseToggleBtn}
              onClick={() => toggleSection('popes')}
              title={collapsedSections['popes'] ? (language === 'ar' ? 'توسيع القسم' : 'Expand') : (language === 'ar' ? 'طي القسم' : 'Collapse')}
            >
              {collapsedSections['popes'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span>{collapsedSections['popes'] ? (language === 'ar' ? 'توسيع' : 'Expand') : (language === 'ar' ? 'طي' : 'Collapse')}</span>
            </button>
          </div>
        </div>

        {!collapsedSections['popes'] && (
          <div className={styles.sectionCollapsibleBody}>
            {/* 1. Canonical Popes Grid */}
            <div className={styles.popesGrid}>
              {popes.filter(p => !p.isLocumTenens).map((p, idx) => {
                const isDeceased = Boolean(p.isDeceased);
                return (
                  <div 
                    key={p.id} 
                    className={`${styles.popeCard} ${isDeceased ? styles.deceasedCard : styles.popeGoldenFrame} ${draggedPopeId === p.id ? styles.isDragging : ''} ${dragOverPopeId === p.id ? styles.draggedOver : ''}`}
                    draggable={inlineEditMode}
                    onDragStart={(e) => handlePopeDragStart(e, p.id)}
                    onDragOver={(e) => handlePopeDragOver(e, p.id)}
                    onDrop={(e) => handlePopeDrop(e, p.id)}
                  >
                    {/* Admin Controls (Drag Handle, Reordering & Edit / Delete) */}
                    {inlineEditMode && (
                      <>
                        <div className={styles.dragHandle} title="اسحب بالماوس لتغيير الترتيب (Drag & Drop)">
                          <GripVertical size={16} />
                          <span>سحب للترتيب</span>
                        </div>
                        <div className={styles.orderControls}>
                          <button
                            className={styles.orderBtn}
                            onClick={() => handleMovePope(idx, 'up')}
                            disabled={idx === 0}
                            title="تحريك لأعلى"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            className={styles.orderBtn}
                            onClick={() => handleMovePope(idx, 'down')}
                            disabled={idx === popes.length - 1}
                            title="تحريك لأسفل"
                          >
                            <ArrowDown size={13} />
                          </button>
                        </div>
                        <div style={{ position: 'absolute', top: '12px', [language === 'ar' ? 'left' : 'right']: '12px', display: 'flex', gap: '6px', zIndex: 10 }}>
                          <button
                            onClick={() => setEditingPope(p)}
                            style={{ background: 'rgba(226, 183, 20, 0.2)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                            title="تعديل بيانات أو صورة البابا"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePope(p.id)}
                            style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                            title="حذف"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}

                    {/* Avatar with Monochrome Filter if Deceased */}
                    <div 
                      className={`${styles.popeAvatar} ${isDeceased ? styles.deceasedAvatar : ''}`}
                      style={{
                        backgroundImage: p.avatarUrl ? `url(${p.avatarUrl})` : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {!p.avatarUrl && <span style={{ fontSize: '3rem', color: isDeceased ? '#888' : 'var(--accent-gold)' }}>👑</span>}
                    </div>

                    {/* Deceased / Living Badge */}
                    {isDeceased ? (
                      <div className={styles.deceasedMourningBadge}>
                        <span>🖤 🎗️</span>
                        <span>{language === 'ar' ? 'مثلث الرحمات — في فردوس النعيم 🕊️' : 'Departed to Paradise 🕊️'}</span>
                      </div>
                    ) : (
                      <div className={styles.activeLivingBadge}>
                        <span>🕊️</span>
                        <span>{language === 'ar' ? 'أطال الله لنا حياته ورعايته' : 'May the Lord preserve his life'}</span>
                      </div>
                    )}

                    {/* Papal Number Badge */}
                    {p.papalNumber && (
                      <span className={styles.popeNumberBadge}>
                        {language === 'ar' ? `البابا رقم ${p.papalNumber}` : `Pope #${p.papalNumber}`}
                      </span>
                    )}

                    {/* Title */}
                    <span className={styles.bishopTitleBadge} style={{ borderColor: isDeceased ? '#666' : undefined, color: isDeceased ? '#ccc' : undefined }}>
                      {language === 'ar' ? p.titleAr : (p.titleEn || p.titleAr)}
                    </span>

                    {/* Pope Name */}
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '4px 0 8px' }}>
                      {language === 'ar' ? p.nameAr : (p.nameEn || p.nameAr)}
                    </h3>

                    {/* Papacy Period */}
                    <div className={styles.bishopPeriodBadge}>
                      <span>📅 {language === 'ar' ? 'سنوات الحبرية:' : 'Papacy:'}</span>
                      <b>{p.papacyPeriod}</b>
                    </div>

                    {/* Bio / Impact */}
                    {p.bioAr && (
                      <p className={styles.bishopBioText}>
                        {language === 'ar' ? p.bioAr : (p.bioEn || p.bioAr)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 2. Locum Tenens (قائم مقام) Dedicated Subsection Under Popes */}
            {popes.filter(p => p.isLocumTenens).length > 0 && (
              <div className={styles.locumTenensSection}>
                <div className={styles.locumTenensHeader}>
                  <div className={styles.locumTenensTitleWrap}>
                    <h3 className={styles.locumTenensTitle}>
                      <span>⚖️</span>
                      <span>{language === 'ar' ? 'الآباء الأساقفة والمطارنة — قائم مقام بطريركي' : 'Locum Tenens of the Papal See'}</span>
                    </h3>
                    <p className={styles.locumTenensSubtitle}>
                      {language === 'ar'
                        ? 'الآباء المطارنة الأجلاء الذين أداروا الكنيسة القبطية الأرثوذكسية كقائم مقام بعد نياحة قداسة البابا وحتى إقامة القرعة الهيكلية وتجليس البابا الجديد.'
                        : 'Reverend Metropolitans and Bishops who served as Locum Tenens following the departure of the Holy Pope until the enthronement of the successor.'}
                    </p>
                  </div>
                </div>

                <div className={styles.locumTenensGrid}>
                  {popes.filter(p => p.isLocumTenens).map((locum) => {
                    const isDeceased = Boolean(locum.isDeceased);
                    return (
                      <div
                        key={locum.id}
                        className={`${styles.locumCard} ${draggedPopeId === locum.id ? styles.isDragging : ''} ${dragOverPopeId === locum.id ? styles.draggedOver : ''}`}
                        draggable={inlineEditMode}
                        onDragStart={(e) => handlePopeDragStart(e, locum.id)}
                        onDragOver={(e) => handlePopeDragOver(e, locum.id)}
                        onDrop={(e) => handlePopeDrop(e, locum.id)}
                      >
                        {inlineEditMode && (
                          <>
                            <div className={styles.dragHandle} title="اسحب لإعادة الترتيب">
                              <GripVertical size={14} />
                              <span>سحب للترتيب</span>
                            </div>
                            <div style={{ position: 'absolute', top: '10px', [language === 'ar' ? 'left' : 'right']: '10px', display: 'flex', gap: '6px', zIndex: 10 }}>
                              <button
                                onClick={() => setEditingPope(locum)}
                                style={{ background: 'rgba(226, 183, 20, 0.2)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                                title="تعديل بيانات القائم مقام"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeletePope(locum.id)}
                                style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                                title="حذف"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}

                        <div
                          className={`${styles.popeAvatar} ${isDeceased ? styles.deceasedAvatar : ''}`}
                          style={{
                            backgroundImage: locum.avatarUrl ? `url(${locum.avatarUrl})` : undefined,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '92px',
                            height: '92px',
                            margin: '0 auto 12px'
                          }}
                        >
                          {!locum.avatarUrl && <span style={{ fontSize: '2rem' }}>⚖️</span>}
                        </div>

                        <div className={styles.locumBadge}>
                          <span>⚖️</span>
                          <span>{locum.locumContextAr || (language === 'ar' ? 'قائم مقام بطريركي' : 'Locum Tenens')}</span>
                        </div>

                        {isDeceased && (
                          <div className={styles.deceasedMourningBadge} style={{ padding: '2px 8px', fontSize: '0.72rem', margin: '4px auto 8px' }}>
                            <span>🖤 🎗️</span>
                            <span>{language === 'ar' ? 'متنيح في الرب 🕊️' : 'Departed in Christ 🕊️'}</span>
                          </div>
                        )}

                        <span className={styles.bishopTitleBadge} style={{ borderColor: 'rgba(243, 156, 18, 0.4)', color: '#f39c12', fontSize: '0.74rem' }}>
                          {language === 'ar' ? locum.titleAr : (locum.titleEn || locum.titleAr)}
                        </span>

                        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: '6px 0 4px' }}>
                          {language === 'ar' ? locum.nameAr : (locum.nameEn || locum.nameAr)}
                        </h4>

                        <div className={styles.bishopPeriodBadge} style={{ fontSize: '0.78rem' }}>
                          <span>📅 {language === 'ar' ? 'فترة القائم مقام:' : 'Period:'}</span>
                          <b>{locum.papacyPeriod}</b>
                        </div>

                        {locum.bioAr && (
                          <p className={styles.bishopBioText} style={{ fontSize: '0.82rem', marginTop: '8px' }}>
                            {language === 'ar' ? locum.bioAr : (locum.bioEn || locum.bioAr)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION — SUPERVISING BISHOPS (الآباء الأساقفة المسؤولون عن الكنيسة) */}
      <section id="bishops-section" className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Shield size={24} color="var(--accent-gold)" />
              <span>{language === 'ar' ? 'الآباء الأساقفة المسؤولون عن رعاية الكنيسة عبر الأجيال' : 'Supervising Bishops'}</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              {language === 'ar'
                ? 'توثيق مبارك لآبائنا الأحبار الأجلاء الذين شملوا كنيسة الشهيد العظيم أبي سيفين برعايتهم الرسولية وصلواتهم المباركة منذ التأسيس وحتى اليوم.'
                : 'Honoring the reverend general and diocesan bishops who shepherded this church with pastoral devotion.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {inlineEditMode && (
              <button 
                className={styles.btnPrimary}
                onClick={() => setIsCreatingBishop(true)}
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'إضافة حبر جليل' : 'Add Bishop'}</span>
              </button>
            )}
            <button
              type="button"
              className={styles.collapseToggleBtn}
              onClick={() => toggleSection('bishops')}
              title={collapsedSections['bishops'] ? (language === 'ar' ? 'توسيع القسم' : 'Expand') : (language === 'ar' ? 'طي القسم' : 'Collapse')}
            >
              {collapsedSections['bishops'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span>{collapsedSections['bishops'] ? (language === 'ar' ? 'توسيع' : 'Expand') : (language === 'ar' ? 'طي' : 'Collapse')}</span>
            </button>
          </div>
        </div>

        {!collapsedSections['bishops'] && (
          <div className={styles.sectionCollapsibleBody}>
            {bishops.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                {language === 'ar' ? 'جاري استحضار سجلات الآباء الأساقفة...' : 'Loading Bishops records...'}
              </div>
            ) : (
              <div className={styles.bishopsGrid}>
                {bishops.map((b, idx) => {
                  const isDeceased = b.bishopStatus === 'DECEASED' || Boolean(b.isDeceased);
                  const isCurrent = b.bishopStatus === 'CURRENT';
                  const isOtherDiocese = b.bishopStatus === 'OTHER_DIOCESE' && !isDeceased;

                  return (
                    <div 
                      key={b.id} 
                      className={`${styles.bishopCard} ${
                        isDeceased ? styles.deceasedCard : isCurrent ? styles.currentBishopCard : styles.servingElsewhereBishopCard
                      } ${draggedBishopId === b.id ? styles.isDragging : ''} ${dragOverBishopId === b.id ? styles.draggedOver : ''}`}
                      draggable={inlineEditMode}
                      onDragStart={(e) => handleBishopDragStart(e, b.id)}
                      onDragOver={(e) => handleBishopDragOver(e, b.id)}
                      onDrop={(e) => handleBishopDrop(e, b.id)}
                    >
                      {/* Admin Controls (Drag Handle, Reordering & Edit / Delete) */}
                      {inlineEditMode && (
                        <>
                          <div className={styles.dragHandle} title="اسحب لتغيير ترتيب الأساقفة">
                            <GripVertical size={16} />
                            <span>سحب للترتيب</span>
                          </div>
                          <div className={styles.orderControls}>
                            <button
                              className={styles.orderBtn}
                              onClick={() => handleMoveBishop(idx, 'up')}
                              disabled={idx === 0}
                              title="تحريك لأعلى"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              className={styles.orderBtn}
                              onClick={() => handleMoveBishop(idx, 'down')}
                              disabled={idx === bishops.length - 1}
                              title="تحريك لأسفل"
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                          <div style={{ position: 'absolute', top: '12px', [language === 'ar' ? 'left' : 'right']: '12px', display: 'flex', gap: '6px', zIndex: 10 }}>
                            <button
                              onClick={() => setEditingBishop(b)}
                              style={{ background: 'rgba(226, 183, 20, 0.2)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                              title="تعديل بيانات الحبر الجليل"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteBishop(b.id)}
                              style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                              title="حذف"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}

                      {/* Avatar with Golden Episcopal Frame & Monochrome if Deceased (Regular colors if Current or Other Diocese, NO NEON) */}
                      <div 
                        className={`${styles.bishopAvatar} ${isDeceased ? styles.deceasedAvatar : ''}`}
                        style={{
                          backgroundImage: b.avatarUrl ? `url(${b.avatarUrl})` : undefined,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {!b.avatarUrl && <span style={{ fontSize: '2.5rem', color: isDeceased ? '#888' : 'var(--accent-gold)' }}>👑</span>}
                      </div>

                      {/* 3-Way Status Badges */}
                      {isCurrent && (
                        <div className={styles.currentBishopBadge}>
                          <span>👑</span>
                          <span>{language === 'ar' ? 'راعي وأسقف الكنيسة الحالي' : 'Current Bishop & Shepherd'}</span>
                        </div>
                      )}

                      {isOtherDiocese && (
                        <div className={styles.servingElsewhereBadge}>
                          <span>⛪</span>
                          <span>{language === 'ar' ? 'يخدم حاليا في إيبارشية / كنيسة أخرى' : 'Serving in Another Diocese'}</span>
                        </div>
                      )}

                      {isDeceased && (
                        <div className={styles.deceasedMourningBadge}>
                          <span>🖤 🎗️</span>
                          <span>{language === 'ar' ? 'متنيح في الرب 🕊️' : 'Departed in Christ 🕊️'}</span>
                        </div>
                      )}

                      {/* Title Badge */}
                      <span className={styles.bishopTitleBadge} style={{ borderColor: isDeceased ? '#666' : isCurrent ? 'var(--accent-gold)' : '#3b82f6', color: isDeceased ? '#ccc' : isCurrent ? 'var(--accent-gold)' : '#93c5fd' }}>
                        {language === 'ar' ? b.titleAr : (b.titleEn || b.titleAr)}
                      </span>

                      {/* Bishop Name */}
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                        {language === 'ar' ? b.nameAr : (b.nameEn || b.nameAr)}
                      </h3>

                      {/* Episcopal Pastoral Period Badge */}
                      <div className={styles.bishopPeriodBadge}>
                        <span>🕊️ {language === 'ar' ? 'فترة الرعاية الكنسية:' : 'Period:'}</span>
                        <b>{b.episcopalPeriod}</b>
                      </div>

                      {/* Current Diocese / Location if Serving Elsewhere */}
                      {isOtherDiocese && b.currentDioceseOrService && (
                        <div style={{ fontSize: '0.8rem', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '6px', margin: '4px 0 8px', fontWeight: 600 }}>
                          📍 {language === 'ar' ? 'الخدمة الحالية:' : 'Current Service:'} {b.currentDioceseOrService}
                        </div>
                      )}

                      {/* Biography */}
                      {b.bioAr && (
                        <p className={styles.bishopBioText}>
                          {language === 'ar' ? b.bioAr : (b.bioEn || b.bioAr)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {inlineEditMode && (
              <button 
                className={styles.btnPrimary}
                onClick={() => setIsCreatingClergy(true)}
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'إضافة سجل أب كاهن' : 'Add Clergy Record'}</span>
              </button>
            )}
            <button
              type="button"
              className={styles.collapseToggleBtn}
              onClick={() => toggleSection('clergy')}
              title={collapsedSections['clergy'] ? (language === 'ar' ? 'توسيع القسم' : 'Expand') : (language === 'ar' ? 'طي القسم' : 'Collapse')}
            >
              {collapsedSections['clergy'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span>{collapsedSections['clergy'] ? (language === 'ar' ? 'توسيع' : 'Expand') : (language === 'ar' ? 'طي' : 'Collapse')}</span>
            </button>
          </div>
        </div>

        {!collapsedSections['clergy'] && (
          <div className={styles.sectionCollapsibleBody}>

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
            const isDeceasedPriest = Boolean(p.isDeceased || p.serviceEndDate);

            return (
              <div 
                key={p.id} 
                className={`${styles.clergyCard} ${isDeceasedPriest ? styles.clergyCardDeceased : ''}`}
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

                {/* Deceased Mourning Badge (علامة حداد بالابيض والاسود) */}
                {isDeceasedPriest && (
                  <div className={styles.mourningRibbon}>
                    <span>🖤 🎗️</span>
                    <span>{language === 'ar' ? 'متنيح في الرب 🕊️' : 'Departed in Christ 🕊️'}</span>
                  </div>
                )}

                {/* Serving Abroad Badge (بيخدم برا حالياً) */}
                {p.isServingAbroad && (
                  <div className={styles.abroadBadge}>
                    <span>✈️</span>
                    <span>
                      {language === 'ar' ? 'يخدم بالخارج حالياً' : 'Serving Abroad'}
                      {p.servingAbroadLocation ? ` (${p.servingAbroadLocation})` : ''}
                    </span>
                  </div>
                )}

                {/* Avatar with Monochrome Filter if Deceased */}
                <div 
                  className={`${styles.clergyAvatar} ${isDeceasedPriest ? styles.deceasedAvatar : ''}`}
                  style={{
                    backgroundImage: p.avatarUrl ? `url(${p.avatarUrl})` : undefined,
                    backgroundColor: '#1b1d22',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {!p.avatarUrl && (
                    <div style={{ textAlign: 'center', color: isDeceasedPriest ? '#aaa' : 'var(--accent-gold)' }}>
                      <span style={{ fontSize: '2.2rem', display: 'block', lineHeight: 1 }}>☦️</span>
                      <span style={{ fontSize: '0.65rem', color: isDeceasedPriest ? '#888' : 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                        {language === 'ar' ? 'صورة أرشيفية' : 'Archival'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Role Badge */}
                <span className={styles.clergyRoleBadge} style={{ borderColor: isDeceasedPriest ? '#666' : undefined, color: isDeceasedPriest ? '#ccc' : undefined }}>
                  {language === 'ar' ? (p.titleAr || 'القمص') : (p.titleEn || 'Hegumen')}
                </span>

                {/* Ecclesiastical Name */}
                <h3 className={styles.clergyEcclesiasticalName} style={{ color: isDeceasedPriest ? '#f0f0f0' : '#ffffff' }}>
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
                      <span>{p.serviceEndDate} 🕊️</span>
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
                <div style={{ marginTop: 'auto', paddingTop: '10px', fontSize: '0.78rem', color: isDeceasedPriest ? '#aaa' : 'var(--accent-gold)' }}>
                  {language === 'ar' ? 'عرض السيرة والوثائق ℹ️' : 'View Bio & Archive ℹ️'}
                </div>
              </div>
            );
          })}
        </div>
          </div>
        )}
      </section>

      {/* SECTION — CHURCH DEACONS & SERVANTS HONOR ROLL (ثمار الخدمة المباركة) */}
      <section id="servants-section" className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Sparkles size={24} color="var(--accent-gold)" />
              <span>{language === 'ar' ? 'ثمار الخدمة — الشمامسة والخدام والآباء الذين خرجوا من الكنيسة' : 'Blessed Fruit: Deacons & Consecrated Servants'}</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              {language === 'ar'
                ? 'توثيق واعتزاز بكل شماس مبارك، وكاهن، وراهب، وخادم مكرس نما وترعرع في حضن هذه الكنيسة وأثمرت خدمته في كرم الرب.'
                : 'Honoring deacons, priests, monks, and servants who were nurtured in this church and called into sacred service.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {inlineEditMode && (
              <button 
                className={styles.btnPrimary}
                onClick={() => setIsCreatingServantFruit(true)}
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'إضافة خادم / شماس مبارك' : 'Add Servant / Deacon'}</span>
              </button>
            )}
            <button
              type="button"
              className={styles.collapseToggleBtn}
              onClick={() => toggleSection('servants')}
              title={collapsedSections['servants'] ? (language === 'ar' ? 'توسيع القسم' : 'Expand') : (language === 'ar' ? 'طي القسم' : 'Collapse')}
            >
              {collapsedSections['servants'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span>{collapsedSections['servants'] ? (language === 'ar' ? 'توسيع' : 'Expand') : (language === 'ar' ? 'طي' : 'Collapse')}</span>
            </button>
          </div>
        </div>

        {!collapsedSections['servants'] && (
          <div className={styles.sectionCollapsibleBody}>

        {/* Servants Dynamic Role Filter Track */}
        <div className={styles.servantsFilterRow}>
          <button 
            className={`${styles.servantFilterChip} ${servantRoleFilter === 'ALL' ? styles.activeServantFilter : ''}`}
            onClick={() => setServantRoleFilter('ALL')}
          >
            {language === 'ar' ? 'الكل' : 'All'}
          </button>

          {servantCategories.map((cat) => (
            <div key={cat.id} style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
              <button 
                className={`${styles.servantFilterChip} ${servantRoleFilter === cat.key ? styles.activeServantFilter : ''}`}
                onClick={() => setServantRoleFilter(cat.key)}
              >
                {language === 'ar' ? cat.nameAr : (cat.nameEn || cat.nameAr)}
              </button>
              {inlineEditMode && (
                <div style={{ display: 'flex', gap: '2px', marginRight: '4px', marginLeft: '4px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); }}
                    style={{ background: 'rgba(226, 183, 20, 0.25)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer', fontSize: '10px' }}
                    title="تعديل اسم التصنيف"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                    style={{ background: 'rgba(231, 76, 60, 0.25)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer', fontSize: '10px' }}
                    title="حذف التصنيف"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}

          {inlineEditMode && (
            <button
              className={styles.servantFilterChip}
              onClick={() => setIsCreatingCategory(true)}
              style={{ borderStyle: 'dashed', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
            >
              + {language === 'ar' ? 'إضافة تصنيف جديد' : 'Add Category'}
            </button>
          )}
        </div>

        {/* Servants Grid */}
        <div className={styles.servantsGrid}>
          {filteredServants.map((s) => (
            <div key={s.id} className={styles.servantFruitCard}>
              {/* Admin Actions */}
              {inlineEditMode && (
                <div style={{ position: 'absolute', top: '10px', [language === 'ar' ? 'left' : 'right']: '10px', display: 'flex', gap: '6px', zIndex: 10 }}>
                  <button
                    onClick={() => setEditingServantFruit(s)}
                    style={{ background: 'rgba(226, 183, 20, 0.2)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteServantFruit(s.id)}
                    style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}

              <div className={styles.servantCardHeader}>
                <div 
                  className={styles.servantAvatar}
                  style={{
                    backgroundImage: s.avatarUrl ? `url(${s.avatarUrl})` : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem'
                  }}
                >
                  {!s.avatarUrl && '✝️'}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {language === 'ar' ? s.fullNameAr : (s.fullNameEn || s.fullNameAr)}
                  </h4>
                  <span className={styles.servantFruitRole}>
                    {s.currentRole}
                  </span>
                </div>
              </div>

              {s.ordinationYear && (
                <div className={styles.servantMetaItem}>
                  <span>📅 {language === 'ar' ? 'سنة الرسامة / الخدمة:' : 'Ordination Year:'}</span>
                  <b style={{ color: '#fff' }}>{s.ordinationYear}</b>
                </div>
              )}

              {s.currentChurchOrLocation && (
                <div className={styles.servantMetaItem}>
                  <span>⛪ {language === 'ar' ? 'الخدمة / الدير الحالي:' : 'Current Location:'}</span>
                  <b style={{ color: '#fff' }}>{s.currentChurchOrLocation}</b>
                </div>
              )}

              {s.notes && (
                <div className={styles.servantNotes}>
                  {s.notes}
                </div>
              )}
            </div>
          ))}
        </div>
          </div>
        )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {inlineEditMode && (
              <button 
                className={styles.btnPrimary}
                onClick={() => setIsCreatingEvent(true)}
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'إضافة حدث بالخط الزمني' : 'Add Event'}</span>
              </button>
            )}
            <button
              type="button"
              className={styles.collapseToggleBtn}
              onClick={() => toggleSection('timeline')}
              title={collapsedSections['timeline'] ? (language === 'ar' ? 'توسيع القسم' : 'Expand') : (language === 'ar' ? 'طي القسم' : 'Collapse')}
            >
              {collapsedSections['timeline'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span>{collapsedSections['timeline'] ? (language === 'ar' ? 'توسيع' : 'Expand') : (language === 'ar' ? 'طي' : 'Collapse')}</span>
            </button>
          </div>
        </div>

        {!collapsedSections['timeline'] && (
          <div className={styles.sectionCollapsibleBody}>
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
          </div>
        )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {inlineEditMode && (
              <button 
                className={styles.btnPrimary}
                onClick={() => setIsCreatingVisit(true)}
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'إضافة زيارة تاريخية' : 'Add Historic Visit'}</span>
              </button>
            )}
            <button
              type="button"
              className={styles.collapseToggleBtn}
              onClick={() => toggleSection('visits')}
              title={collapsedSections['visits'] ? (language === 'ar' ? 'توسيع القسم' : 'Expand') : (language === 'ar' ? 'طي القسم' : 'Collapse')}
            >
              {collapsedSections['visits'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span>{collapsedSections['visits'] ? (language === 'ar' ? 'توسيع' : 'Expand') : (language === 'ar' ? 'طي' : 'Collapse')}</span>
            </button>
          </div>
        </div>

        {!collapsedSections['visits'] && (
          <div className={styles.sectionCollapsibleBody}>
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
                {visits.map(v => {
                  let visitGallery: string[] = [];
                  try {
                    if (v.galleryJson) visitGallery = JSON.parse(v.galleryJson);
                  } catch (e) {}

                  return (
                    <div key={v.id} className={styles.clergyCard} style={{ textAlign: 'start', alignItems: 'stretch' }}>
                      {v.mainImageUrl && (
                        <div 
                          onClick={() => setLightboxImage({ url: v.mainImageUrl!, title: v.visitTitleAr, caption: v.narrativeAr })}
                          style={{
                            height: '180px',
                            backgroundImage: `url(${v.mainImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: '10px',
                            marginBottom: '12px',
                            cursor: 'pointer'
                          }}
                        />
                      )}

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

                      {/* Multi-Photo Gallery for Visit */}
                      {visitGallery.length > 0 && (
                        <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '6px' }}>
                            📸 {language === 'ar' ? `صور توثيقية للزيارة (${visitGallery.length} صور):` : `Visit Photos (${visitGallery.length}):`}
                          </div>
                          <div className={styles.photoGalleryGrid}>
                            {visitGallery.map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt=""
                                className={styles.photoThumb}
                                onClick={() => setLightboxImage({ url: img, title: `${v.visitTitleAr} - صورة ${i + 1}` })}
                              />
                            ))}
                          </div>
                        </div>
                      )}

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
                  );
                })}
              </div>
            )}
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
                ? 'معرض الصور الأرشيفية النادرة، الألبومات التاريخية، وثائق التأسيس، والاحتفالات الكنسية عبر العقود.'
                : 'Archival gallery of historic photographs, albums, foundational documents, and ceremonies.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {inlineEditMode && (
              <button 
                className={styles.btnPrimary}
                onClick={() => setIsCreatingMedia(true)}
              >
                <Plus size={16} />
                <span>{language === 'ar' ? 'رفع وثيقة أو ألبوم صور للأرشيف' : 'Add Photo / Album'}</span>
              </button>
            )}
            <button
              type="button"
              className={styles.collapseToggleBtn}
              onClick={() => toggleSection('archive')}
              title={collapsedSections['archive'] ? (language === 'ar' ? 'توسيع القسم' : 'Expand') : (language === 'ar' ? 'طي القسم' : 'Collapse')}
            >
              {collapsedSections['archive'] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span>{collapsedSections['archive'] ? (language === 'ar' ? 'توسيع' : 'Expand') : (language === 'ar' ? 'طي' : 'Collapse')}</span>
            </button>
          </div>
        </div>

        {!collapsedSections['archive'] && (
          <div className={styles.sectionCollapsibleBody}>

        {mediaItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <p style={{ fontSize: '1rem' }}>
              🖼️ {language === 'ar' ? 'الأرشيف البصري جاهز لاستقبال الصور والوثائق والألبومات التاريخية القديمة.' : 'Visual archive ready for historical photographs.'}
            </p>
            {inlineEditMode && (
              <button className={styles.btnPrimary} onClick={() => setIsCreatingMedia(true)} style={{ marginTop: '12px' }}>
                + {language === 'ar' ? 'رفع أول صورة أو ألبوم' : 'Upload First Image / Album'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {mediaItems.map(item => {
              let albumPhotos: string[] = [];
              try {
                if (item.galleryJson) albumPhotos = JSON.parse(item.galleryJson);
              } catch (e) {}
              const isAlbum = albumPhotos.length > 1;

              return (
                <div 
                  key={item.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    position: 'relative'
                  }}
                  onClick={() => {
                    if (isAlbum) {
                      setAlbumModal({ title: item.titleAr, images: albumPhotos });
                    } else {
                      setLightboxImage({ url: item.url, title: item.titleAr, caption: item.captionAr || undefined });
                    }
                  }}
                >
                  <div style={{ height: '180px', backgroundImage: `url(${item.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#111', position: 'relative' }}>
                    {isAlbum && (
                      <div className={styles.albumBadge}>
                        <span>📷</span>
                        <span>{language === 'ar' ? `ألبوم (${albumPhotos.length} صور)` : `Album (${albumPhotos.length})`}</span>
                      </div>
                    )}
                  </div>
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
              );
            })}
          </div>
        )}
          </div>
        )}
      </section>

      {/* ALBUM VIEWER MODAL (Group Images under one title) */}
      {albumModal && (
        <div className={styles.modalOverlay} onClick={() => setAlbumModal(null)}>
          <div className={styles.modalContent} style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                📷 {albumModal.title} ({albumModal.images.length} صور)
              </h3>
              <button className={styles.closeBtn} onClick={() => setAlbumModal(null)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px', maxHeight: '65vh', overflowY: 'auto', padding: '10px 0' }}>
              {albumModal.images.map((img, i) => (
                <div 
                  key={i} 
                  style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: '#000' }}
                  onClick={() => setLightboxImage({ url: img, title: `${albumModal.title} - صورة ${i + 1}` })}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
      {selectedPriestModal && (() => {
        const isDeceasedPriest = Boolean(selectedPriestModal.isDeceased || selectedPriestModal.serviceEndDate);
        return (
          <div className={styles.modalOverlay} onClick={() => setSelectedPriestModal(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  <span>{language === 'ar' ? `${selectedPriestModal.titleAr || 'القمص'} ${selectedPriestModal.ecclesiasticalNameAr}` : selectedPriestModal.ecclesiasticalNameEn}</span>
                </h3>
                <button className={styles.closeBtn} onClick={() => setSelectedPriestModal(null)}>✕</button>
              </div>

              {/* Status Badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {isDeceasedPriest && (
                  <div className={styles.mourningRibbon}>
                    <span>🖤 🎗️</span>
                    <span>{language === 'ar' ? 'متنيح في الرب 🕊️' : 'Departed in Christ 🕊️'}</span>
                  </div>
                )}
                {selectedPriestModal.isServingAbroad && (
                  <div className={styles.abroadBadge}>
                    <span>✈️</span>
                    <span>
                      {language === 'ar' ? 'يخدم بالخارج حالياً' : 'Serving Abroad'}
                      {selectedPriestModal.servingAbroadLocation ? ` (${selectedPriestModal.servingAbroadLocation})` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div 
                  className={`${styles.clergyAvatar} ${isDeceasedPriest ? styles.deceasedAvatar : ''}`}
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
        );
      })()}

      {/* FULLSCREEN IMMERSIVE READING MODAL */}
      {fullscreenReading && currentChapter && (
        <div className={styles.fullscreenReadingModal}>
          <div className={styles.fullscreenReadingContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: '0.88rem' }}>
                  {language === 'ar' ? `الفصل ${currentChapterIndex + 1}` : `Chapter ${currentChapterIndex + 1}`}
                </span>
                <h2 style={{ fontSize: '1.8rem', color: '#fff', margin: '4px 0 0' }}>
                  {language === 'ar' ? currentChapter.titleAr : currentChapter.titleEn}
                </h2>
              </div>
              <button 
                onClick={() => setFullscreenReading(false)}
                style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '20px', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕ {language === 'ar' ? 'إغلاق وضع القراءة' : 'Exit Reader'}
              </button>
            </div>

            {currentChapter.quoteText && (
              <blockquote className={styles.chapterQuote} style={{ fontSize: '1.3rem', margin: '2rem 0' }}>
                <p>«{currentChapter.quoteText}»</p>
                {currentChapter.quoteSource && <cite style={{ display: 'block', marginTop: '8px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>— {currentChapter.quoteSource}</cite>}
              </blockquote>
            )}

            <div style={{ fontSize: '1.25rem', lineHeight: 2.3, color: '#e0e0e0', whiteSpace: 'pre-line' }}>
              {language === 'ar' ? currentChapter.narrativeAr : (currentChapter.narrativeEn || currentChapter.narrativeAr)}
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

      {/* 3. CREATE / EDIT CLERGY RECORD MODAL */}
      {(editingClergy || isCreatingClergy) && (
        <ClergyFormModal 
          clergy={editingClergy}
          onClose={() => { setEditingClergy(null); setIsCreatingClergy(false); }}
          onSaved={() => {
            setEditingClergy(null);
            setIsCreatingClergy(false);
            loadHistoryData();
            showToast(language === 'ar' ? 'تم حفظ بيانات الأب الكاهن بنجاح' : 'Clergy record saved');
          }}
        />
      )}

      {/* CREATE / EDIT POPE MODAL */}
      {(editingPope || isCreatingPope) && (
        <PopeFormModal 
          pope={editingPope}
          onClose={() => { setEditingPope(null); setIsCreatingPope(false); }}
          onSaved={() => {
            setEditingPope(null);
            setIsCreatingPope(false);
            loadHistoryData();
            showToast(language === 'ar' ? 'تم حفظ بيانات قداسة البابا بنجاح' : 'Pope record saved');
          }}
        />
      )}

      {/* CREATE / EDIT SERVANT CATEGORY MODAL */}
      {(editingCategory || isCreatingCategory) && (
        <ServantCategoryModal 
          category={editingCategory}
          onClose={() => { setEditingCategory(null); setIsCreatingCategory(false); }}
          onSaved={() => {
            setEditingCategory(null);
            setIsCreatingCategory(false);
            loadHistoryData();
            showToast(language === 'ar' ? 'تم حفظ تصنيف الخدمة بنجاح' : 'Servant category saved');
          }}
        />
      )}

      {/* 4. CREATE / EDIT BISHOP MODAL */}
      {(editingBishop || isCreatingBishop) && (
        <BishopFormModal 
          bishop={editingBishop}
          onClose={() => { setEditingBishop(null); setIsCreatingBishop(false); }}
          onSaved={() => {
            setEditingBishop(null);
            setIsCreatingBishop(false);
            loadHistoryData();
            showToast(language === 'ar' ? 'تم حفظ بيانات الحبر الجليل بنجاح' : 'Bishop record saved');
          }}
        />
      )}

      {/* 5. CREATE / EDIT SERVANT FRUIT MODAL */}
      {(editingServantFruit || isCreatingServantFruit) && (
        <ServantFruitFormModal 
          servantFruit={editingServantFruit}
          categories={servantCategories}
          onClose={() => { setEditingServantFruit(null); setIsCreatingServantFruit(false); }}
          onSaved={() => {
            setEditingServantFruit(null);
            setIsCreatingServantFruit(false);
            loadHistoryData();
            showToast(language === 'ar' ? 'تم حفظ بيانات الخادم المبارك بنجاح' : 'Servant record saved');
          }}
        />
      )}

      {/* 6. CREATE / EDIT TIMELINE EVENT MODAL */}
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

      {/* 7. CREATE / EDIT VISIT MODAL */}
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

      {/* 8. CREATE / EDIT MEDIA MODAL */}
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

  async function handleDeleteBishop(id: string) {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف سجل هذا الحبر الجليل؟' : 'Delete bishop record?')) return;
    try {
      const token = localStorage.getItem('church-token');
      const res = await fetch(`${API_URL}/history/bishops/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(language === 'ar' ? 'تم حذف سجل الحبر الجليل بنجاح' : 'Bishop deleted');
        loadHistoryData();
      }
    } catch (e) {
      alert('Error deleting');
    }
  }

  async function handleDeleteServantFruit(id: string) {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف سجل هذا الخادم المبارك؟' : 'Delete servant record?')) return;
    try {
      const token = localStorage.getItem('church-token');
      const res = await fetch(`${API_URL}/history/servants-fruits/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(language === 'ar' ? 'تم حذف سجل الخادم بنجاح' : 'Servant record deleted');
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

  async function handleDeletePope(id: string) {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف سجل قداسة البابا؟' : 'Delete pope record?')) return;
    try {
      const token = localStorage.getItem('church-token');
      const res = await fetch(`${API_URL}/history/popes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(language === 'ar' ? 'تم حذف سجل قداسة البابا بنجاح' : 'Pope deleted');
        loadHistoryData();
      }
    } catch (e) {
      alert('Error deleting');
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا التصنيف؟' : 'Delete category?')) return;
    try {
      const token = localStorage.getItem('church-token');
      const res = await fetch(`${API_URL}/history/servant-categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(language === 'ar' ? 'تم حذف التصنيف بنجاح' : 'Category deleted');
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
  const [isDeceased, setIsDeceased] = useState(clergy ? Boolean(clergy.isDeceased || clergy.serviceEndDate) : false);
  const [isServingAbroad, setIsServingAbroad] = useState(clergy ? Boolean(clergy.isServingAbroad) : false);
  const [servingAbroadLocation, setServingAbroadLocation] = useState(clergy?.servingAbroadLocation || '');
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

      const finalEndDate = isOngoing ? null : (serviceEndDate.trim() || null);
      const calculatedDeceased = Boolean(isDeceased || finalEndDate);

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
          serviceEndDate: finalEndDate,
          isOngoing,
          isDeceased: calculatedDeceased,
          isServingAbroad,
          servingAbroadLocation: isServingAbroad ? (servingAbroadLocation.trim() || null) : null,
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
                  onChange={(e) => {
                    setServiceEndDate(e.target.value);
                    if (e.target.value) setIsDeceased(true);
                  }} 
                />
              </div>
            )}
          </div>

          {/* SERVICE STATUS & DECEASED / ABROAD CONTROLS */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label className={styles.formCheckboxLabel}>
              <input 
                type="checkbox" 
                checked={isOngoing} 
                onChange={(e) => {
                  setIsOngoing(e.target.checked);
                  if (e.target.checked) setIsDeceased(false);
                }} 
              />
              <span>خدمة مستمرة حالياً بالصحة والبركة 🕊️</span>
            </label>

            <label className={styles.formCheckboxLabel}>
              <input 
                type="checkbox" 
                checked={isDeceased} 
                onChange={(e) => setIsDeceased(e.target.checked)} 
              />
              <span style={{ color: '#bbb' }}>كاهن متنيح في الرب 🕊️ (يعرض الكارت بالأبيض والأسود مع شارة حداد)</span>
            </label>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
              <label className={styles.formCheckboxLabel}>
                <input 
                  type="checkbox" 
                  checked={isServingAbroad} 
                  onChange={(e) => setIsServingAbroad(e.target.checked)} 
                />
                <span style={{ color: '#5dade2' }}>الكاهن يخدم بالخارج حالياً ✈️</span>
              </label>

              {isServingAbroad && (
                <div className={styles.formGroup} style={{ marginTop: '8px', paddingRight: '22px' }}>
                  <label className={styles.formLabel}>مكان الخدمة بالخارج (مثال: الولايات المتحدة الأمريكية / كندا / أستراليا):</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    placeholder="مكان الخدمة بالخارج..."
                    value={servingAbroadLocation} 
                    onChange={(e) => setServingAbroadLocation(e.target.value)} 
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
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
          <ImageUploadField 
            label="صورة الأب الكاهن (رفع صورة من جهازك أو وضع رابط):"
            value={avatarUrl}
            onChange={setAvatarUrl}
            fallbackIcon="☦️"
          />

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
  const [mainImageUrl, setMainImageUrl] = useState(visit?.mainImageUrl || '');
  const [gallery, setGallery] = useState<string[]>(() => {
    try {
      return visit?.galleryJson ? JSON.parse(visit.galleryJson) : [];
    } catch (e) {
      return [];
    }
  });
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
          narrativeAr,
          mainImageUrl: mainImageUrl.trim() || null,
          galleryJson: gallery.length > 0 ? JSON.stringify(gallery) : null
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

          {/* Main Cover Image (ImageUploadField matching priests) */}
          <ImageUploadField
            label="الصورة الرئيسية للزيارة (صورة الغلاف):"
            value={mainImageUrl}
            onChange={setMainImageUrl}
            isCircular={false}
            fallbackIcon="🏛️"
          />

          {/* Multi-Image Gallery for Visit */}
          <MultiImageGalleryField
            label="معرض صور الزيارة التاريخية (يمكن اختيار عدة صور معاً من جهازك):"
            images={gallery}
            onChange={setGallery}
          />

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
  const [isAlbum, setIsAlbum] = useState<boolean>(() => {
    try {
      if (media?.galleryJson) {
        const parsed = JSON.parse(media.galleryJson);
        return Array.isArray(parsed) && parsed.length > 0;
      }
    } catch (e) {}
    return false;
  });
  const [albumImages, setAlbumImages] = useState<string[]>(() => {
    try {
      if (media?.galleryJson) {
        return JSON.parse(media.galleryJson);
      }
    } catch (e) {}
    return [];
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() && (!albumImages || albumImages.length === 0)) {
      alert('يرجى اختيار صورة رئيسية أو إضافة صور للألبوم');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const apiEndpoint = isEdit ? `${API_URL}/history/media/${media!.id}` : `${API_URL}/history/media`;
      const method = isEdit ? 'PUT' : 'POST';

      const finalCoverUrl = url.trim() || (albumImages.length > 0 ? albumImages[0] : '');
      const finalGalleryJson = isAlbum && albumImages.length > 0 ? JSON.stringify(albumImages) : null;

      const res = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          url: finalCoverUrl,
          titleAr,
          captionAr,
          archivalCredit,
          category,
          galleryJson: finalGalleryJson
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
          <h3 className={styles.modalTitle}>{isEdit ? '✏️ تعديل الوثيقة / الألبوم الأرشيفي' : '➕ إضافة صورة أو ألبوم صور للأرشيف'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>عنوان الوثيقة / الألبوم (عربي):</label>
            <input type="text" className={styles.formInput} placeholder="مثال: ألبوم تدشين مذابح الكنيسة..." value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required />
          </div>

          {/* Single Photo vs Photo Album Toggle */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '1.25rem' }}>
            <label className={styles.formCheckboxLabel}>
              <input 
                type="checkbox" 
                checked={isAlbum} 
                onChange={(e) => setIsAlbum(e.target.checked)} 
              />
              <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                📷 جعل هذا السجل ألبوم صور مجمعة تحت عنوان واحد
              </span>
            </label>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', paddingRight: '24px' }}>
              يتيح لك تجميع عدة صور في ألبوم واحد يتصفحه الزوار بسهولة مع بطاقة غلاف وعداد للصور.
            </div>
          </div>

          {/* Main Cover Image */}
          <ImageUploadField
            label={isAlbum ? 'صورة غلاف الألبوم (أو اتركها فارغة لاستخدام أول صورة):' : 'الصورة / الوثيقة الأرشيفية:'}
            value={url}
            onChange={setUrl}
            isCircular={false}
            fallbackIcon="🖼️"
          />

          {/* Multi-Photo Gallery if Album */}
          {isAlbum && (
            <MultiImageGalleryField
              label="صور الألبوم الأرشيفي (يمكن اختيار عدة صور معاً من جهازك):"
              images={albumImages}
              onChange={setAlbumImages}
            />
          )}

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

function PopeFormModal({ pope, onClose, onSaved }: { pope: HistoryPopeRecord | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(pope);
  const [nameAr, setNameAr] = useState(pope?.nameAr || '');
  const [nameEn, setNameEn] = useState(pope?.nameEn || '');
  const [titleAr, setTitleAr] = useState(pope?.titleAr || 'بابا الإسكندرية وبطريرك الكرازة المرقسية');
  const [titleEn, setTitleEn] = useState(pope?.titleEn || 'Pope of Alexandria and Patriarch of All Africa');
  const [papacyPeriod, setPapacyPeriod] = useState(pope?.papacyPeriod || '');
  const [papalNumber, setPapalNumber] = useState<number | ''>(pope?.papalNumber || '');
  const [isDeceased, setIsDeceased] = useState<boolean>(pope ? Boolean(pope.isDeceased) : true);
  const [isLocumTenens, setIsLocumTenens] = useState<boolean>(pope ? Boolean(pope.isLocumTenens) : false);
  const [locumContextAr, setLocumContextAr] = useState<string>(pope?.locumContextAr || '');
  const [avatarUrl, setAvatarUrl] = useState(pope?.avatarUrl || '');
  const [bioAr, setBioAr] = useState(pope?.bioAr || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const url = isEdit ? `${API_URL}/history/popes/${pope!.id}` : `${API_URL}/history/popes`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nameAr,
          nameEn: nameEn.trim() || null,
          titleAr,
          titleEn: titleEn.trim() || null,
          papacyPeriod,
          papalNumber: papalNumber ? Number(papalNumber) : null,
          isDeceased,
          isLocumTenens,
          locumContextAr: isLocumTenens ? (locumContextAr.trim() || null) : null,
          avatarUrl: avatarUrl.trim() || null,
          bioAr: bioAr.trim() || null
        })
      });

      if (res.ok) onSaved();
      else alert('Failed to save pope record');
    } catch (err) {
      alert('Error updating pope record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEdit 
              ? (isLocumTenens ? '⚖️ تعديل بيانات القائم مقام' : '👑 تعديل بيانات قداسة البابا') 
              : '👑 إضافة بطريرك أو قائم مقام بطريركي'}
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          {/* Locum Tenens Toggle */}
          <div style={{ background: isLocumTenens ? 'rgba(243, 156, 18, 0.12)' : 'rgba(255, 255, 255, 0.03)', border: isLocumTenens ? '1.5px solid #f39c12' : '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '1.25rem' }}>
            <label className={styles.formCheckboxLabel}>
              <input 
                type="checkbox" 
                checked={isLocumTenens} 
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsLocumTenens(checked);
                  if (checked && !locumContextAr) {
                    setLocumContextAr('قائم مقام بطريركي');
                  }
                  if (checked && titleAr.includes('بابا')) {
                    setTitleAr('قائم مقام بطريركي ومطران');
                  }
                }} 
              />
              <span style={{ fontWeight: 700, color: isLocumTenens ? '#f39c12' : 'var(--accent-gold)' }}>
                ⚖️ هل هذا السجل لحبر جليل شغل منصب "قائم مقام بطريركي" بعد نياحة البابا؟
              </span>
            </label>
            {isLocumTenens && (
              <div style={{ marginTop: '10px' }}>
                <label className={styles.formLabel}>مناسبة وظرف فترة القائم مقام (عربي):</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="مثال: قائم مقام بعد نياحة البابا كيرلس السادس (من 1971/3/9 - 1971/11/14)"
                  value={locumContextAr} 
                  onChange={(e) => setLocumContextAr(e.target.value)} 
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>اللقب الكنسي (عربي):</label>
              <input type="text" className={styles.formInput} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{isLocumTenens ? 'اسم الحبر الجليل القائم مقام (عربي):' : 'اسم قداسة البابا (عربي):'}</label>
              <input type="text" className={styles.formInput} placeholder="مثال: الأنبا أنطونيوس / البابا شنوده الثالث" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{isLocumTenens ? 'فترة القائم مقام التوثيقية:' : 'سنوات الحبرية (Papacy Period):'}</label>
              <input type="text" className={styles.formInput} placeholder="مثال: 1971/3/9 - 1971/11/14 أو 1971 - 2012" value={papacyPeriod} onChange={(e) => setPapacyPeriod(e.target.value)} required />
            </div>
            {!isLocumTenens && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>رقم البابا في تاريخ الكرازة (اختياري):</label>
                <input type="number" className={styles.formInput} placeholder="مثال: 116، 117، 118" value={papalNumber} onChange={(e) => setPapalNumber(e.target.value ? Number(e.target.value) : '')} />
              </div>
            )}
          </div>

          {/* Living vs Deceased Selection */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '1.25rem' }}>
            <label className={styles.formCheckboxLabel}>
              <input 
                type="checkbox" 
                checked={isDeceased} 
                onChange={(e) => setIsDeceased(e.target.checked)} 
              />
              <span style={{ fontWeight: 700, color: isDeceased ? '#ccc' : 'var(--accent-gold)' }}>
                {isDeceased ? '🖤 مثلث الرحمات — متنيح في الرب 🕊️ (يعرض بالأبيض والأسود مع شارة حداد)' : '🕊️ أطال الله لنا حياته ورعايته بالصحة والبركة (حي)'}
              </span>
            </label>
          </div>

          {/* Image Upload Field (Normal Priests pattern) */}
          <ImageUploadField
            label={isLocumTenens ? 'صورة الحبر الجليل القائم مقام (رفع من جهازك أو رابط مع إمكانية القص):' : 'صورة قداسة البابا (رفع من جهازك أو رابط مع إمكانية القص):'}
            value={avatarUrl}
            onChange={setAvatarUrl}
            fallbackIcon={isLocumTenens ? '⚖️' : '👑'}
          />

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>نبذة الرعاية والأثر الروحي والكنسي:</label>
            <textarea rows={3} className={styles.formTextarea} value={bioAr} onChange={(e) => setBioAr(e.target.value)} />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>إلغاء</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ السجل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BishopFormModal({ bishop, onClose, onSaved }: { bishop: HistoryBishopRecord | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(bishop);
  const [nameAr, setNameAr] = useState(bishop?.nameAr || '');
  const [nameEn, setNameEn] = useState(bishop?.nameEn || '');
  const [titleAr, setTitleAr] = useState(bishop?.titleAr || 'الأسقف العام');
  const [titleEn, setTitleEn] = useState(bishop?.titleEn || 'General Bishop');
  const [episcopalPeriod, setEpiscopalPeriod] = useState(bishop?.episcopalPeriod || '');
  const [bishopStatus, setBishopStatus] = useState<string>(
    bishop?.bishopStatus || (bishop?.isDeceased ? 'DECEASED' : 'OTHER_DIOCESE')
  );
  const [currentDioceseOrService, setCurrentDioceseOrService] = useState<string>(bishop?.currentDioceseOrService || '');
  const [avatarUrl, setAvatarUrl] = useState(bishop?.avatarUrl || '');
  const [bioAr, setBioAr] = useState(bishop?.bioAr || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const url = isEdit ? `${API_URL}/history/bishops/${bishop!.id}` : `${API_URL}/history/bishops`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nameAr,
          nameEn: nameEn.trim() || null,
          titleAr,
          titleEn: titleEn.trim() || null,
          episcopalPeriod,
          isDeceased: bishopStatus === 'DECEASED',
          bishopStatus,
          currentDioceseOrService: bishopStatus === 'OTHER_DIOCESE' ? (currentDioceseOrService.trim() || null) : null,
          avatarUrl: avatarUrl.trim() || null,
          bioAr: bioAr.trim() || null
        })
      });

      if (res.ok) onSaved();
      else alert('Failed to save bishop record');
    } catch (err) {
      alert('Error updating bishop record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEdit ? '👑 تعديل بيانات الحبر الجليل' : '👑 إضافة حبر جليل (أسقف)'}
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>اللقب الكنسي:</label>
              <input type="text" className={styles.formInput} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>اسم الحبر الجليل (عربي):</label>
              <input type="text" className={styles.formInput} placeholder="مثال: نيافة الأنبا أثناسيوس" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>فترة الرعاية الكنسية (Episcopal Period):</label>
            <input type="text" className={styles.formInput} placeholder="مثال: 2021 - حتى الآن أو 2001 - 2021" value={episcopalPeriod} onChange={(e) => setEpiscopalPeriod(e.target.value)} required />
          </div>

          {/* 3-Way Status Selection (CURRENT vs OTHER_DIOCESE vs DECEASED) */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', marginBottom: '1.25rem' }}>
            <label className={styles.formLabel} style={{ marginBottom: '10px' }}>
              الحالة الكنسية والخدمية الحالية للحبر الجليل (تحديد دقيق):
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: bishopStatus === 'CURRENT' ? 'var(--accent-gold)' : '#fff', fontWeight: bishopStatus === 'CURRENT' ? 700 : 400 }}>
                <input 
                  type="radio" 
                  name="bishopStatus" 
                  value="CURRENT" 
                  checked={bishopStatus === 'CURRENT'} 
                  onChange={() => setBishopStatus('CURRENT')} 
                />
                <span>👑 راعي وأسقف الكنيسة الحالي (الأسقف المشرف والراعي لكنيستنا حالياً)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: bishopStatus === 'OTHER_DIOCESE' ? '#60a5fa' : '#fff', fontWeight: bishopStatus === 'OTHER_DIOCESE' ? 700 : 400 }}>
                <input 
                  type="radio" 
                  name="bishopStatus" 
                  value="OTHER_DIOCESE" 
                  checked={bishopStatus === 'OTHER_DIOCESE'} 
                  onChange={() => setBishopStatus('OTHER_DIOCESE')} 
                />
                <span>⛪ يخدم حاليا في إيبارشية / كنيسة أخرى (ليس أسقف كنيستنا حالياً ويعرض بألوانه الطبيعية)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: bishopStatus === 'DECEASED' ? '#bbb' : '#fff', fontWeight: bishopStatus === 'DECEASED' ? 700 : 400 }}>
                <input 
                  type="radio" 
                  name="bishopStatus" 
                  value="DECEASED" 
                  checked={bishopStatus === 'DECEASED'} 
                  onChange={() => setBishopStatus('DECEASED')} 
                />
                <span>🖤 🎗️ متنيح في الرب 🕊️ (يعرض بالأبيض والأسود مع شارة حداد)</span>
              </label>
            </div>

            {bishopStatus === 'OTHER_DIOCESE' && (
              <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                <label className={styles.formLabel}>مكان ومسؤولية الخدمة الحالية (إيبارشية / قطاع):</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="مثال: أسقف عام لكنائس شرق السكة الحديد بالقاهرة / أسقف إيبارشية حلوان والمعصرة"
                  value={currentDioceseOrService} 
                  onChange={(e) => setCurrentDioceseOrService(e.target.value)} 
                />
              </div>
            )}
          </div>

          {/* Image Upload Field (Normal Priests pattern) */}
          <ImageUploadField
            label="صورة الحبر الجليل (رفع صورة من جهازك أو وضع رابط مع إمكانية القص الدائري):"
            value={avatarUrl}
            onChange={setAvatarUrl}
            fallbackIcon="👑"
          />

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>نبذة الرعاية والأثر الروحي والكنسي:</label>
            <textarea rows={3} className={styles.formTextarea} value={bioAr} onChange={(e) => setBioAr(e.target.value)} />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>إلغاء</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ سجل الحبر الجليل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ServantCategoryModal({ category, onClose, onSaved }: { category: HistoryServantCategory | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(category);
  const [nameAr, setNameAr] = useState(category?.nameAr || '');
  const [key, setKey] = useState(category?.key || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const url = isEdit ? `${API_URL}/history/servant-categories/${category!.id}` : `${API_URL}/history/servant-categories`;
      const method = isEdit ? 'PUT' : 'POST';

      const finalKey = key.trim() || `CAT_${Date.now()}`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nameAr,
          key: finalKey
        })
      });

      if (res.ok) onSaved();
      else alert('Failed to save servant category');
    } catch (err) {
      alert('Error updating servant category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEdit ? '✏️ تعديل تصنيف الخدمة' : '➕ إضافة تصنيف جديد للخدام والشمامسة'}
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>اسم التصنيف (يظهر في شريط الفلترة):</label>
            <input 
              type="text" 
              className={styles.formInput} 
              placeholder="مثال: الشمامسة المباركون، أمناء الخدمة، خادمات مباركات..." 
              value={nameAr} 
              onChange={(e) => {
                setNameAr(e.target.value);
                if (!isEdit && !key) {
                  setKey(e.target.value.trim().toUpperCase().replace(/\s+/g, '_'));
                }
              }} 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>رمز التصنيف الداخلي (Category Key):</label>
            <input 
              type="text" 
              className={styles.formInput} 
              placeholder="مثال: DEACONS أو LEADERS" 
              value={key} 
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))} 
              required 
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>إلغاء</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ التصنيف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ServantFruitFormModal({ servantFruit, categories, onClose, onSaved }: { servantFruit: HistoryServantFruit | null; categories: HistoryServantCategory[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(servantFruit);
  const [fullNameAr, setFullNameAr] = useState(servantFruit?.fullNameAr || '');
  const [currentRole, setCurrentRole] = useState(servantFruit?.currentRole || 'شماس دياكون');
  const [categoryKey, setCategoryKey] = useState(servantFruit?.categoryKey || (categories[0]?.key || 'DEACON'));
  const [ordinationYear, setOrdinationYear] = useState(servantFruit?.ordinationYear || '');
  const [currentChurchOrLocation, setCurrentChurchOrLocation] = useState(servantFruit?.currentChurchOrLocation || '');
  const [avatarUrl, setAvatarUrl] = useState(servantFruit?.avatarUrl || '');
  const [notes, setNotes] = useState(servantFruit?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('church-token');
      const url = isEdit ? `${API_URL}/history/servants-fruits/${servantFruit!.id}` : `${API_URL}/history/servants-fruits`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fullNameAr,
          currentRole,
          categoryKey,
          ordinationYear: ordinationYear.trim() || null,
          currentChurchOrLocation: currentChurchOrLocation.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          notes: notes.trim() || null
        })
      });

      if (res.ok) onSaved();
      else alert('Failed to save servant record');
    } catch (err) {
      alert('Error updating servant record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEdit ? '✨ تعديل بيانات الخادم / الشماس' : '✨ إضافة شماس أو خادم من أبناء الكنيسة'}
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>الاسم بالكامل (عربي):</label>
              <input type="text" className={styles.formInput} placeholder="مثال: الشماس د. عادل فهيم" value={fullNameAr} onChange={(e) => setFullNameAr(e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>الرتبة أو الصفة الحالية:</label>
              <input type="text" className={styles.formInput} placeholder="مثال: شماس كامل (دياكون) / راهب قس / خادم مبارك" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>تصنيف الخدمة في شريط الفلاتر:</label>
              <select className={styles.formSelect} value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)}>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.key}>{cat.nameAr}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>سنة الرسامة / الخدمة (اختياري):</label>
              <input type="text" className={styles.formInput} placeholder="مثال: 1985 أو 2010" value={ordinationYear} onChange={(e) => setOrdinationYear(e.target.value)} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>مكان الخدمة أو الدير الحالي (اختياري):</label>
            <input type="text" className={styles.formInput} placeholder="مثال: دير الأنبا بولا بالبحر الأحمر / كنيسة العذراء" value={currentChurchOrLocation} onChange={(e) => setCurrentChurchOrLocation(e.target.value)} />
          </div>

          {/* Image Upload Field (Normal Priests pattern) */}
          <ImageUploadField
            label="صورة الخادم المبارك (رفع صورة من جهازك أو وضع رابط):"
            value={avatarUrl}
            onChange={setAvatarUrl}
            fallbackIcon="✝️"
          />

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ملاحظات ومسيرة الخدمة والبركة:</label>
            <textarea rows={3} className={styles.formTextarea} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>إلغاء</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ في ثمار الخدمة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
