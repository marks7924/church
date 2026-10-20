'use client';

import React, { useState, useEffect } from 'react';
import { 
  Compass, Heart, Shield, Sparkles, BookOpen, Copy, Check, 
  Image as ImageIcon, ArrowRight, Search 
} from 'lucide-react';
import { API_URL } from '../config';
import { copyToClipboard } from '../utils/bibleTashkeel';

interface BibleTopicItem {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  passages?: any[];
  relatedSlugs?: string[];
}

interface BibleTopicDiscoveryViewProps {
  onNavigateToPassage: (bookSlug: string, chapter: number) => void;
  onOpenImageForVerse: (verse: { verseNumber: number; text: string; translationName: string }) => void;
}

export default function BibleTopicDiscoveryView({
  onNavigateToPassage,
  onOpenImageForVerse
}: BibleTopicDiscoveryViewProps) {
  const [topics, setTopics] = useState<BibleTopicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<BibleTopicItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/fy/bible/topics`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTopics(data);
          if (data.length > 0) setSelectedTopic(data[0]);
        }
      })
      .catch(err => console.error('Error fetching topics:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyPassage = async (id: string, text: string, ref: string) => {
    const ok = await copyToClipboard(`«${text}»\n— ${ref} [ترجمة فاندايك]`);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredTopics = topics.filter(t => 
    !searchQuery || 
    t.nameAr.includes(searchQuery) || 
    t.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg md:text-xl text-amber-400 flex items-center gap-2">
            <Compass size={22} /> دليل موضوعات ومشاعر الحياة
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            استكشف آيات الكتاب المقدس المصنفة حسب المشاعر والاحتياجات الروحية ومواقف الحياة اليومية
          </p>
        </div>
      </div>

      {/* Main Grid: Left Topics Menu (4 cols) & Right Passages (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Topics List */}
        <div className="lg:col-span-4 space-y-3">
          <input 
            type="text"
            placeholder="ابحث عن موضوع (رجاء، إيمان، سلام...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs focus:outline-none focus:border-amber-500"
          />

          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {filteredTopics.map((topic) => {
              const isSelected = selectedTopic?.id === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  className={`w-full p-3.5 rounded-xl text-right transition flex items-center justify-between border ${
                    isSelected 
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold shadow-sm' 
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">✨</span>
                    <div>
                      <div className="text-sm">{topic.nameAr}</div>
                      <div className="text-[10px] text-slate-500">{topic.nameEn}</div>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {topic.passages?.length || 0} آيات
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Topic Details & Passages */}
        <div className="lg:col-span-8 space-y-4">
          {selectedTopic ? (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                  <span>موضوع مختار</span> • <span>{selectedTopic.nameEn}</span>
                </div>
                <h3 className="font-bold text-2xl text-slate-100">{selectedTopic.nameAr}</h3>
                <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
                  {selectedTopic.descriptionAr}
                </p>
              </div>

              {/* Passages Cards */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-300">الآيات والشواهد الكتابية المعتمدة:</h4>
                {selectedTopic.passages?.map((pass: any, idx: number) => {
                  const passId = `${selectedTopic.id}-${idx}`;
                  return (
                    <div 
                      key={idx}
                      className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-sm text-amber-400">
                          {pass.referenceAr}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyPassage(passId, pass.textAr, pass.referenceAr)}
                            className="p-1.5 rounded-lg bg-slate-700/60 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs"
                            title="نسخ الآية"
                          >
                            {copiedId === passId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenImageForVerse({
                              verseNumber: pass.verse || 1,
                              text: pass.textAr,
                              translationName: 'فاندايك (1865)'
                            })}
                            className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition flex items-center gap-1 text-xs font-bold"
                            title="تصميم صورة خلفية"
                          >
                            <ImageIcon size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateToPassage(pass.bookSlug, pass.chapter)}
                            className="py-1 px-2.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition text-xs font-semibold flex items-center gap-1"
                          >
                            <BookOpen size={12} /> قراءة بالسياق
                          </button>
                        </div>
                      </div>

                      <p className="text-sm md:text-base font-serif text-slate-100 leading-relaxed">
                        «{pass.textAr}»
                      </p>

                      {pass.reasonAr && (
                        <p className="text-xs text-slate-400 pt-2 border-t border-slate-700/40">
                          💡 <span className="font-medium">{pass.reasonAr}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-sm">
              اختر موضوعاً من القائمة الجانبية لعرض آياته وتأملاته.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
