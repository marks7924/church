'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, BookOpen, GitFork, Users, MapPin, HelpCircle, 
  Scale, ExternalLink, Bookmark, Edit3, ArrowRight, Sparkles 
} from 'lucide-react';
import { API_URL } from '../config';

interface BibleStudyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookSlug: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  onNavigateToPassage: (bookSlug: string, chapter: number) => void;
  onOpenComparison: () => void;
  onOpenJournalWithPassage: (passageData: { reference: string; text: string; bookSlug: string; chapter: number }) => void;
}

export default function BibleStudyDrawer({
  isOpen,
  onClose,
  bookSlug,
  bookName,
  chapterNumber,
  verseNumber,
  onNavigateToPassage,
  onOpenComparison,
  onOpenJournalWithPassage
}: BibleStudyDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [studyData, setStudyData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'context' | 'related' | 'people' | 'reflection'>('context');

  useEffect(() => {
    if (!isOpen || !bookSlug) return;

    setLoading(true);
    fetch(`${API_URL}/fy/bible/study/${bookSlug}/${chapterNumber}/${verseNumber}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.studyData) {
          setStudyData(data.studyData);
        } else {
          setStudyData(null);
        }
      })
      .catch(err => {
        console.error('Error fetching study data:', err);
        setStudyData(null);
      })
      .finally(() => setLoading(false));
  }, [isOpen, bookSlug, chapterNumber, verseNumber]);

  if (!isOpen) return null;

  const currentRef = `${bookName} ${chapterNumber}: ${verseNumber}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div 
        className="w-full max-w-xl h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out"
        style={{
          backgroundColor: 'var(--bg-primary, #0f172a)',
          borderLeft: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          color: 'var(--text-primary, #f8fafc)'
        }}
      >
        {/* Header */}
        <div 
          className="p-4 px-6 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-color, rgba(255,255,255,0.1))' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg">دراسة الآية وقرائن النص</h3>
              <p className="text-xs text-amber-400 font-semibold">{currentRef}</p>
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

        {/* Selected Verse Banner */}
        {studyData?.reference && (
          <div 
            className="p-4 mx-6 mt-4 rounded-xl border"
            style={{ 
              backgroundColor: 'rgba(226, 183, 20, 0.06)', 
              borderColor: 'rgba(226, 183, 20, 0.25)' 
            }}
          >
            <p className="text-sm md:text-base font-serif leading-relaxed text-amber-200 font-semibold mb-2">
              «{studyData.reference.textAr}»
            </p>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{studyData.reference.bookNameAr} {chapterNumber}: {verseNumber}</span>
              <button 
                type="button"
                onClick={() => onOpenJournalWithPassage({
                  reference: currentRef,
                  text: studyData.reference.textAr,
                  bookSlug,
                  chapter: chapterNumber
                })}
                className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
              >
                <Edit3 size={12} /> تدوين تأمل في الدفتر
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b px-6 mt-4 gap-2 text-xs font-semibold overflow-x-auto scrollbar-none" style={{ borderColor: 'var(--border-color, rgba(255,255,255,0.1))' }}>
          <button
            type="button"
            onClick={() => setActiveTab('context')}
            className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'context' 
                ? 'border-amber-400 text-amber-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={14} /> السياق والقرينة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('related')}
            className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'related' 
                ? 'border-amber-400 text-amber-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork size={14} /> شواهد متصلة ({studyData?.relatedScriptures?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('people')}
            className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'people' 
                ? 'border-amber-400 text-amber-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={14} /> الشخصيات والأماكن
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reflection')}
            className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'reflection' 
                ? 'border-amber-400 text-amber-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle size={14} /> أسئلة التأمل
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              جاري تحميل دراسة الآية والقرائن...
            </div>
          ) : !studyData ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              لم يتم العثور على قرائن دراسية لهذه الآية حالياً.
            </div>
          ) : (
            <>
              {/* TAB 1: Passage Context */}
              {activeTab === 'context' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
                      <span>القسم الكتابي: {studyData.literaryContext.sectionAr}</span>
                      <span>{studyData.literaryContext.testament}</span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                      {studyData.literaryContext.overviewAr}
                    </p>
                  </div>

                  {/* Translation Comparison Callout */}
                  <div 
                    onClick={onOpenComparison}
                    className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/30 cursor-pointer transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Scale className="text-purple-400" size={20} />
                      <div>
                        <h5 className="font-bold text-xs text-purple-300">مقارنة الترجمات</h5>
                        <p className="text-[11px] text-slate-400">قارن هذه الآية بين فاندايك العربية والملك جيمس الإنجليزية</p>
                      </div>
                    </div>
                    <ArrowRight className="text-purple-400" size={16} />
                  </div>
                </div>
              )}

              {/* TAB 2: Related Scriptures */}
              {activeTab === 'related' && (
                <div className="space-y-3">
                  {studyData.relatedScriptures?.map((rel: any, idx: number) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-400 font-serif">
                          {rel.referenceAr}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToPassage(rel.bookSlug, rel.chapter);
                            onClose();
                          }}
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          قراءة في السفر <ExternalLink size={12} />
                        </button>
                      </div>
                      <p className="text-xs md:text-sm font-serif text-slate-200 leading-relaxed">
                        «{rel.snippetAr}»
                      </p>
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/40">
                        💡 {rel.reasonAr}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: People and Places */}
              {activeTab === 'people' && (
                <div className="space-y-4">
                  {/* People */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                      <Users size={14} className="text-amber-400" /> الشخصيات المرتبطة
                    </h5>
                    {studyData.people && studyData.people.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        {studyData.people.map((person: any) => (
                          <div key={person.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                            <div className="flex justify-between items-center mb-1">
                              <h6 className="font-bold text-xs text-amber-300">{person.nameAr}</h6>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">{person.roleAr}</span>
                            </div>
                            <p className="text-xs text-slate-300 line-clamp-2">{person.bioAr}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">لا توجد شخصيات محددة مفهرسة مباشرة لهذا الإصحاح.</p>
                    )}
                  </div>

                  {/* Places */}
                  <div className="pt-3 border-t border-slate-700/60">
                    <h5 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-400" /> المواقع الجغرافية
                    </h5>
                    {studyData.places && studyData.places.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        {studyData.places.map((place: any) => (
                          <div key={place.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                            <h6 className="font-bold text-xs text-emerald-300 mb-1">{place.nameAr}</h6>
                            <p className="text-xs text-slate-300">{place.descriptionAr}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">لا توجد مواقع جغرافية مفهرسة مباشرة لهذا النص.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Reflection Questions */}
              {activeTab === 'reflection' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 mb-2">
                    تأملات روحية وأسئلة لمساعدتك في تطبيق كلمة الله في حياتك اليومية:
                  </p>
                  {studyData.reflectionQuestions?.map((q: any, idx: number) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2"
                    >
                      <p className="text-xs md:text-sm font-semibold text-slate-200">
                        {idx + 1}. {q.questionAr}
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenJournalWithPassage({
                          reference: currentRef,
                          text: q.questionAr,
                          bookSlug,
                          chapter: chapterNumber
                        })}
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                      >
                        <Edit3 size={12} /> اكتب إجابتك وتأملك في الدفتر الروحي
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
