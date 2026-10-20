'use client';

import React, { useState } from 'react';
import { 
  Copy, Image as ImageIcon, BookOpen, Bookmark, Edit3, X, 
  Check, Scale, FileText 
} from 'lucide-react';
import { removeArabicTashkeel, formatVerseRange, copyToClipboard } from '../utils/bibleTashkeel';

interface SelectedVerseItem {
  verseNumber: number;
  text: string;
}

interface BibleVerseToolbarProps {
  selectedVerses: SelectedVerseItem[];
  bookName: string;
  bookSlug: string;
  chapterNumber: number;
  translationName: string;
  translationCode: string;
  onClearSelection: () => void;
  onOpenImageGenerator: () => void;
  onOpenStudyMode: (verseNum: number) => void;
  onOpenComparison: () => void;
  onOpenJournalWithPassage: (passageData: { reference: string; text: string; bookSlug: string; chapter: number }) => void;
  onToggleFavorite: (passageData: { verseNumber: number; text: string }) => void;
  isFavorite?: boolean;
}

export default function BibleVerseToolbar({
  selectedVerses,
  bookName,
  bookSlug,
  chapterNumber,
  translationName,
  translationCode,
  onClearSelection,
  onOpenImageGenerator,
  onOpenStudyMode,
  onOpenComparison,
  onOpenJournalWithPassage,
  onToggleFavorite,
  isFavorite = false
}: BibleVerseToolbarProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!selectedVerses || selectedVerses.length === 0) return null;

  const verseNumbers = selectedVerses.map(v => v.verseNumber);
  const rangeStr = formatVerseRange(verseNumbers);
  const fullReference = `${bookName} ${chapterNumber}: ${rangeStr}`;

  // Joined text
  const rawText = selectedVerses.map(v => `(${v.verseNumber}) ${v.text}`).join('\n');
  const cleanRawTextOnly = selectedVerses.map(v => v.text).join(' ');

  const handleCopy = async (type: 'exact' | 'no-tashkeel' | 'with-reference') => {
    let output = '';
    if (type === 'exact') {
      output = rawText;
    } else if (type === 'no-tashkeel') {
      output = removeArabicTashkeel(rawText);
    } else if (type === 'with-reference') {
      output = `«${cleanRawTextOnly}»\n— ${fullReference} [${translationName}]`;
    }

    const success = await copyToClipboard(output);
    if (success) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  return (
    /* Pinned strictly to the top as requested */
    <div 
      className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl animate-in fade-in slide-in-from-top-4 duration-200"
      dir="rtl"
    >
      <div 
        className="p-3 md:p-3.5 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-3 backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(18, 19, 26, 0.98)',
          borderColor: 'var(--accent-gold, #e2b714)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: '8px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 25px rgba(226, 183, 20, 0.2)'
        }}
      >
        {/* Left: Selected count and reference info */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start px-2 border-b lg:border-b-0 pb-2 lg:pb-0" style={{ borderColor: 'var(--border-color, #2a2c3a)' }}>
          <div className="flex items-center gap-2.5">
            <span 
              className="w-7 h-7 flex items-center justify-center font-black text-xs shrink-0"
              style={{
                backgroundColor: 'var(--accent-gold, #e2b714)',
                color: '#000000',
                borderRadius: '4px'
              }}
            >
              {selectedVerses.length}
            </span>
            <span 
              className="font-bold text-sm md:text-base font-serif"
              style={{ color: 'var(--accent-gold, #e2b714)' }}
            >
              {fullReference}
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClearSelection}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white transition"
            style={{ borderRadius: '6px', border: '1px solid var(--border-color, #2a2c3a)' }}
            title="إلغاء التحديد"
          >
            <X size={16} />
          </button>
        </div>

        {/* Center / Right: Sleek rectangular action buttons matching church web theme */}
        <div className="flex items-center gap-2 flex-wrap justify-center w-full lg:w-auto">
          {/* Copy Exact */}
          <button
            type="button"
            onClick={() => handleCopy('exact')}
            className="px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition hover:scale-[1.02]"
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.9)',
              borderColor: 'var(--border-color, #2a2c3a)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '6px',
              color: '#f8f9fa'
            }}
            title="نسخ نص الآيات المحدد"
          >
            {copiedType === 'exact' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedType === 'exact' ? 'تم النسخ!' : 'نسخ'}</span>
          </button>

          {/* Copy Without Tashkeel */}
          <button
            type="button"
            onClick={() => handleCopy('no-tashkeel')}
            className="px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition hover:scale-[1.02]"
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.9)',
              borderColor: 'var(--border-color, #2a2c3a)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '6px',
              color: '#f8f9fa'
            }}
            title="نسخ بدون حركات التشكيل العربية"
          >
            {copiedType === 'no-tashkeel' ? <Check size={14} className="text-emerald-400" /> : <span className="font-bold text-xs" style={{ color: 'var(--accent-gold, #e2b714)' }}>ب</span>}
            <span>{copiedType === 'no-tashkeel' ? 'تم النسخ!' : 'بدون تشكيل'}</span>
          </button>

          {/* Copy With Reference */}
          <button
            type="button"
            onClick={() => handleCopy('with-reference')}
            className="px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition hover:scale-[1.02]"
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.9)',
              borderColor: 'var(--border-color, #2a2c3a)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '6px',
              color: '#f8f9fa'
            }}
            title="نسخ مع الشاهد والترجمة"
          >
            {copiedType === 'with-reference' ? <Check size={14} className="text-emerald-400" /> : <FileText size={14} />}
            <span className="hidden sm:inline">{copiedType === 'with-reference' ? 'تم النسخ!' : 'مع الشاهد'}</span>
          </button>

          {/* Image Generator Modal - Highlighted Gold */}
          <button
            type="button"
            onClick={onOpenImageGenerator}
            className="px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition hover:brightness-110 shadow-lg"
            style={{
              backgroundColor: 'var(--accent-gold, #e2b714)',
              color: '#000000',
              borderRadius: '6px'
            }}
            title="تصميم خلفية آية بالصورتين الرسميتين"
          >
            <ImageIcon size={15} />
            <span>تصميم صورة</span>
          </button>

          {/* Contextual Study */}
          <button
            type="button"
            onClick={() => onOpenStudyMode(selectedVerses[0]?.verseNumber || 1)}
            className="px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition hover:scale-[1.02]"
            style={{
              backgroundColor: 'rgba(52, 152, 219, 0.15)',
              borderColor: 'rgba(52, 152, 219, 0.4)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '6px',
              color: '#60a5fa'
            }}
            title="فتح دراسة الآية والقرائن"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">دراسة</span>
          </button>

          {/* Compare Translations */}
          <button
            type="button"
            onClick={onOpenComparison}
            className="px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition hover:scale-[1.02]"
            style={{
              backgroundColor: 'rgba(147, 51, 234, 0.15)',
              borderColor: 'rgba(147, 51, 234, 0.4)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '6px',
              color: '#c084fc'
            }}
            title="مقارنة النص في الترجمات الأخرى"
          >
            <Scale size={14} />
            <span className="hidden sm:inline">مقارنة</span>
          </button>

          {/* Journal Note */}
          <button
            type="button"
            onClick={() => onOpenJournalWithPassage({
              reference: fullReference,
              text: cleanRawTextOnly,
              bookSlug,
              chapter: chapterNumber
            })}
            className="px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition hover:scale-[1.02]"
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.9)',
              borderColor: 'var(--border-color, #2a2c3a)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '6px',
              color: '#f8f9fa'
            }}
            title="كتابة تأمل في دفتري الروحي"
          >
            <Edit3 size={14} />
            <span className="hidden sm:inline">تأمل</span>
          </button>

          {/* Add to Favorites */}
          <button
            type="button"
            onClick={() => onToggleFavorite({
              verseNumber: selectedVerses[0]?.verseNumber || 1,
              text: cleanRawTextOnly
            })}
            className="p-2 transition hover:scale-[1.05]"
            style={{
              backgroundColor: isFavorite ? 'rgba(226, 183, 20, 0.2)' : 'rgba(28, 29, 38, 0.9)',
              borderColor: isFavorite ? 'var(--accent-gold, #e2b714)' : 'var(--border-color, #2a2c3a)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '6px',
              color: isFavorite ? 'var(--accent-gold, #e2b714)' : '#a0aec0'
            }}
            title="إضافة إلى الآيات المفضلة"
          >
            <Bookmark size={15} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          {/* Desktop Close */}
          <button 
            type="button" 
            onClick={onClearSelection}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            style={{
              backgroundColor: 'rgba(28, 29, 38, 0.5)',
              borderColor: 'var(--border-color, #2a2c3a)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '6px'
            }}
            title="إلغاء التحديد"
          >
            <X size={15} />
            <span>إغلاق</span>
          </button>
        </div>
      </div>
    </div>
  );
}
