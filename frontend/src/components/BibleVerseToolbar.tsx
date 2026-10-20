'use client';

import React, { useState } from 'react';
import { 
  Copy, Image as ImageIcon, BookOpen, Bookmark, Edit3, X, 
  Check, Sparkles, Scale, FileText 
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div 
        className="rounded-2xl p-2.5 md:p-3 shadow-2xl border flex flex-col md:flex-row items-center justify-between gap-3 backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          borderColor: 'rgba(226, 183, 20, 0.35)',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 25px rgba(226, 183, 20, 0.15)'
        }}
      >
        {/* Left: Selected count and reference info */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start px-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {selectedVerses.length}
            </span>
            <span className="font-bold text-sm text-amber-400">
              {fullReference}
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClearSelection}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Center / Right: Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center w-full md:w-auto">
          {/* Copy Plain */}
          <button
            type="button"
            onClick={() => handleCopy('exact')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 transition"
            title="نسخ نص الآيات المحدد"
          >
            {copiedType === 'exact' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedType === 'exact' ? 'تم النسخ!' : 'نسخ'}</span>
          </button>

          {/* Copy Without Tashkeel */}
          <button
            type="button"
            onClick={() => handleCopy('no-tashkeel')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 transition"
            title="نسخ بدون حركات التشكيل العربية"
          >
            {copiedType === 'no-tashkeel' ? <Check size={14} className="text-emerald-400" /> : <span className="font-bold text-xs text-amber-400">ب</span>}
            <span>{copiedType === 'no-tashkeel' ? 'تم النسخ!' : 'بدون تشكيل'}</span>
          </button>

          {/* Copy With Reference */}
          <button
            type="button"
            onClick={() => handleCopy('with-reference')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 transition"
            title="نسخ مع الشاهد والترجمة"
          >
            {copiedType === 'with-reference' ? <Check size={14} className="text-emerald-400" /> : <FileText size={14} />}
            <span className="hidden sm:inline">{copiedType === 'with-reference' ? 'تم النسخ!' : 'مع الشاهد'}</span>
          </button>

          {/* Image Generator Modal */}
          <button
            type="button"
            onClick={onOpenImageGenerator}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-1.5 shadow-md transition"
            title="تصميم خلفية آية بالصورتين الرسميتين"
          >
            <ImageIcon size={14} />
            <span>تصميم صورة</span>
          </button>

          {/* Contextual Study */}
          <button
            type="button"
            onClick={() => onOpenStudyMode(selectedVerses[0]?.verseNumber || 1)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition"
            title="فتح دراسة الآية والقرائن"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">دراسة</span>
          </button>

          {/* Compare Translations */}
          <button
            type="button"
            onClick={onOpenComparison}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition"
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
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
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
            className={`p-1.5 rounded-xl border transition ${
              isFavorite 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="إضافة إلى الآيات المفضلة"
          >
            <Bookmark size={15} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          {/* Desktop Close */}
          <button 
            type="button" 
            onClick={onClearSelection}
            className="hidden md:flex p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="إلغاء التحديد"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
