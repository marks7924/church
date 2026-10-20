'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Calendar, BookOpen, Copy, Check, Share2, 
  Image as ImageIcon, Bookmark, ArrowRight, Clock, HelpCircle 
} from 'lucide-react';
import { API_URL } from '../config';
import { copyToClipboard } from '../utils/bibleTashkeel';

interface VerseOfDayData {
  id: string;
  date: string;
  reference: string;
  referenceAr: string;
  referenceEn: string;
  text: string;
  verseTextAr: string;
  verseTextEn: string;
  translationId: string;
  translationCode: string;
  bookId: string;
  chapterNumber: number;
  verseNumber: number;
  devotionalTextAr?: string;
  devotionalTextEn?: string;
  reflectionQuestionAr?: string;
  reflectionQuestionEn?: string;
}

interface BibleVerseOfDayViewProps {
  onNavigateToPassage: (bookSlug: string, chapter: number) => void;
  onOpenImageForVerse: (verse: { verseNumber: number; text: string; translationName: string }) => void;
  onToggleFavorite: (passageData: { verseNumber: number; text: string }) => void;
  isFavorite?: boolean;
}

export default function BibleVerseOfDayView({
  onNavigateToPassage,
  onOpenImageForVerse,
  onToggleFavorite,
  isFavorite = false
}: BibleVerseOfDayViewProps) {
  const [votd, setVotd] = useState<VerseOfDayData | null>(null);
  const [archive, setArchive] = useState<VerseOfDayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [langTab, setLangTab] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/fy/verse-of-day`).then(r => r.json()),
      fetch(`${API_URL}/fy/verse-of-day/archive`).then(r => r.json())
    ])
      .then(([currentData, archiveData]) => {
        if (currentData && currentData.verse) setVotd(currentData.verse);
        if (Array.isArray(archiveData)) setArchive(archiveData);
      })
      .catch(err => console.error('Error fetching VOTD:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!votd) return;
    const txt = langTab === 'en' ? votd.verseTextEn : votd.verseTextAr;
    const ref = langTab === 'en' ? votd.referenceEn : votd.referenceAr;
    const ok = await copyToClipboard(`«${txt}»\n— ${ref}`);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentText = langTab === 'en' ? (votd?.verseTextEn || votd?.text) : (votd?.verseTextAr || votd?.text);
  const currentRef = langTab === 'en' ? (votd?.referenceEn || votd?.reference) : (votd?.referenceAr || votd?.reference);
  const currentDevotional = langTab === 'en' ? votd?.devotionalTextEn : votd?.devotionalTextAr;
  const currentQuestion = langTab === 'en' ? votd?.reflectionQuestionEn : votd?.reflectionQuestionAr;

  return (
    <div className="space-y-6">
      {/* Featured Verse of the Day Card */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">
          جاري تحميل آية اليوم والتأمل الروحي...
        </div>
      ) : votd ? (
        <div 
          className="p-6 md:p-8 rounded-3xl border shadow-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(226, 183, 20, 0.12) 0%, rgba(15, 23, 42, 0.95) 70%)',
            borderColor: 'rgba(226, 183, 20, 0.3)'
          }}
        >
          {/* Badge & Date */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles size={18} />
              </span>
              <span className="font-bold text-sm text-amber-400">آية اليوم الكنسية والزاد الروحي</span>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLangTab('ar')}
                  className={`px-2.5 py-1 rounded-md transition ${langTab === 'ar' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  العربية
                </button>
                <button
                  type="button"
                  onClick={() => setLangTab('en')}
                  className={`px-2.5 py-1 rounded-md transition ${langTab === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  English
                </button>
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar size={13} /> {votd.date}
              </span>
            </div>
          </div>

          {/* Scripture Verse Text */}
          <div className="my-6">
            <p 
              className={`text-xl md:text-2xl lg:text-3xl font-serif font-bold text-amber-100 leading-relaxed mb-4 ${
                langTab === 'en' ? 'text-left font-sans' : 'text-right'
              }`}
            >
              «{currentText}»
            </p>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base text-amber-400">
                — {currentRef}
              </span>
              <span className="text-xs text-slate-500 font-sans">
                [{langTab === 'en' ? 'King James Version' : 'ترجمة فاندايك'}]
              </span>
            </div>
          </div>

          {/* Devotional Reflection */}
          {currentDevotional && (
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 mb-4 space-y-1.5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                📖 تأمل اليوم الروحي:
              </span>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                {currentDevotional}
              </p>
            </div>
          )}

          {/* Practical Application / Reflection Question */}
          {currentQuestion && (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/30 mb-6 space-y-1.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                💡 سؤال التطبيق الشخصي:
              </span>
              <p className="text-xs md:text-sm text-slate-200">
                {currentQuestion}
              </p>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-800/80">
            {/* Read in Context */}
            <button
              type="button"
              onClick={() => onNavigateToPassage(votd.bookId.toLowerCase(), votd.chapterNumber)}
              className="py-2 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <BookOpen size={14} />
              <span>قراءة في سياق السفر</span>
            </button>

            {/* Create Background Image */}
            <button
              type="button"
              onClick={() => onOpenImageForVerse({
                verseNumber: votd.verseNumber,
                text: currentText || '',
                translationName: langTab === 'en' ? 'King James' : 'فاندايك (1865)'
              })}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <ImageIcon size={14} />
              <span>تصميم صورة خلفية</span>
            </button>

            {/* Copy */}
            <button
              type="button"
              onClick={handleCopy}
              className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'تم النسخ!' : 'نسخ'}</span>
            </button>

            {/* Favorite */}
            <button
              type="button"
              onClick={() => onToggleFavorite({
                verseNumber: votd.verseNumber,
                text: currentText || ''
              })}
              className={`p-2 rounded-xl border transition ${
                isFavorite 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="إضافة للمفضلة"
            >
              <Bookmark size={16} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Archive of Previous Verses */}
      {archive.length > 0 && (
        <div className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-base text-slate-200 flex items-center gap-2">
              <Clock size={18} className="text-amber-400" /> أرشيف آيات الأيام السابقة
            </h4>
            <span className="text-xs text-slate-500">{archive.length} آية مسجلة</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archive.map((entry) => (
              <div 
                key={entry.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-bold text-amber-400 font-serif">{entry.referenceAr}</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> {entry.date}</span>
                  </div>
                  <p className="text-sm font-serif text-slate-200 leading-relaxed line-clamp-3">
                    «{entry.verseTextAr}»
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigateToPassage(entry.bookId.toLowerCase(), entry.chapterNumber)}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <BookOpen size={12} /> قراءة السفر
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenImageForVerse({
                      verseNumber: entry.verseNumber,
                      text: entry.verseTextAr,
                      translationName: 'فاندايك (1865)'
                    })}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <ImageIcon size={12} /> صورة
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
