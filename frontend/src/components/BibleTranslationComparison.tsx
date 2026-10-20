'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Scale, ArrowLeftRight, Copy, Check, ExternalLink, 
  Sparkles, Image as ImageIcon 
} from 'lucide-react';
import { API_URL } from '../config';
import { copyToClipboard } from '../utils/bibleTashkeel';

interface BibleTranslationComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  bookSlug: string;
  bookNameAr: string;
  bookNameEn: string;
  chapterNumber: number;
  highlightVerse?: number;
  onOpenImageForVerse: (verse: { verseNumber: number; text: string; translationName: string }) => void;
}

export default function BibleTranslationComparison({
  isOpen,
  onClose,
  bookSlug,
  bookNameAr,
  bookNameEn,
  chapterNumber,
  highlightVerse,
  onOpenImageForVerse
}: BibleTranslationComparisonProps) {
  const [loading, setLoading] = useState(false);
  const [arVerses, setArVerses] = useState<any[]>([]);
  const [enVerses, setEnVerses] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !bookSlug) return;

    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/fy/bible/chapter?bookSlug=${bookSlug}&chapterNumber=${chapterNumber}&translationCode=van-dyck`).then(r => r.json()),
      fetch(`${API_URL}/fy/bible/chapter?bookSlug=${bookSlug}&chapterNumber=${chapterNumber}&translationCode=kjv`).then(r => r.json())
    ])
      .then(([arData, enData]) => {
        setArVerses(arData?.chapter?.verses || []);
        setEnVerses(enData?.chapter?.verses || []);
      })
      .catch(err => {
        console.error('Error fetching comparative chapters:', err);
      })
      .finally(() => setLoading(false));
  }, [isOpen, bookSlug, chapterNumber]);

  if (!isOpen) return null;

  const handleCopy = async (id: string, text: string, ref: string, translation: string) => {
    const full = `«${text}»\n— ${ref} [${translation}]`;
    const ok = await copyToClipboard(full);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const maxVerses = Math.max(arVerses.length, enVerses.length);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}
    >
      <div 
        className="w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: 'var(--bg-primary, #0f172a)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          color: 'var(--text-primary, #f8fafc)'
        }}
      >
        {/* Header */}
        <div 
          className="p-4 px-6 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-color, rgba(255,255,255,0.1))' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg md:text-xl flex items-center gap-2">
                <span>مقارنة الترجمات الكتابية</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                  {bookNameAr} {chapterNumber} • {bookNameEn} {chapterNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                مقارنة متوازية بين ترجمة فاندايك والسميث (1865) ونسخة الملك جيمس (KJV 1769)
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Translation Column Headers */}
        <div 
          className="grid grid-cols-1 md:grid-cols-2 border-b text-xs font-bold py-2.5 px-6"
          style={{ 
            backgroundColor: 'rgba(255,255,255,0.02)', 
            borderColor: 'var(--border-color, rgba(255,255,255,0.1))' 
          }}
        >
          <div className="text-right text-amber-400 font-serif flex items-center justify-between pl-4">
            <span>📖 ترجمة فاندايك العربية (Smith & Van Dyck 1865)</span>
            <span className="text-[10px] text-slate-500">RTL</span>
          </div>
          <div className="text-left text-blue-400 font-sans hidden md:flex items-center justify-between pr-4">
            <span className="text-[10px] text-slate-500">LTR</span>
            <span>📜 King James Version (KJV 1769)</span>
          </div>
        </div>

        {/* Comparison Verses List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 divide-y divide-slate-800/60">
          {loading ? (
            <div className="py-24 text-center text-slate-400 text-sm">
              جاري تحميل نصوص الترجمتين للمقارنة...
            </div>
          ) : maxVerses === 0 ? (
            <div className="py-24 text-center text-slate-400 text-sm">
              لا توجد آيات متاحة لهذا الإصحاح.
            </div>
          ) : (
            Array.from({ length: maxVerses }).map((_, idx) => {
              const vNum = idx + 1;
              const ar = arVerses.find(v => v.verseNumber === vNum);
              const en = enVerses.find(v => v.verseNumber === vNum);
              const isTargetVerse = highlightVerse === vNum;

              return (
                <div 
                  key={vNum}
                  id={`comp-verse-${vNum}`}
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 py-4 px-2 rounded-xl transition ${
                    isTargetVerse ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-slate-800/20'
                  }`}
                >
                  {/* Arabic Side (RTL) */}
                  <div className="text-right flex flex-col justify-between gap-2" dir="rtl">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-bold">
                        <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-serif">
                          {vNum}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(`ar-${vNum}`, ar?.text || '', `${bookNameAr} ${chapterNumber}: ${vNum}`, 'فاندايك')}
                            className="p-1 text-slate-400 hover:text-amber-400 rounded transition"
                            title="نسخ الآية العربية"
                          >
                            {copiedId === `ar-${vNum}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenImageForVerse({
                              verseNumber: vNum,
                              text: ar?.text || '',
                              translationName: 'فاندايك (1865)'
                            })}
                            className="p-1 text-slate-400 hover:text-amber-400 rounded transition"
                            title="تصميم صورة لهذه الآية"
                          >
                            <ImageIcon size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm md:text-base font-serif leading-relaxed text-slate-100">
                        {ar?.text || '—'}
                      </p>
                    </div>
                  </div>

                  {/* English Side (LTR) */}
                  <div className="text-left flex flex-col justify-between gap-2 border-t md:border-t-0 md:border-r border-slate-800/80 pt-2 md:pt-0 md:pr-4" dir="ltr">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-bold">
                        <span className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-sans">
                          {vNum}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(`en-${vNum}`, en?.text || '', `${bookNameEn} ${chapterNumber}:${vNum}`, 'KJV')}
                            className="p-1 text-slate-400 hover:text-blue-400 rounded transition"
                            title="Copy English Verse"
                          >
                            {copiedId === `en-${vNum}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenImageForVerse({
                              verseNumber: vNum,
                              text: en?.text || '',
                              translationName: 'King James (KJV)'
                            })}
                            className="p-1 text-slate-400 hover:text-blue-400 rounded transition"
                            title="Create image for English verse"
                          >
                            <ImageIcon size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm md:text-base font-sans leading-relaxed text-slate-300">
                        {en?.text || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
