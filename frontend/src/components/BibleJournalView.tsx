'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookMarked, Plus, Search, Calendar, Tag, Trash2, Edit3, 
  Check, Lock, Sparkles, BookOpen, Clock, AlertCircle, RefreshCw 
} from 'lucide-react';
import { API_URL } from '../config';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  reflectionDate: string;
  passages?: any[];
  tags?: string[];
  promptQuestion?: string | null;
  createdAt: string;
}

interface BibleJournalViewProps {
  token: string | null;
  initialPassage?: { reference: string; text: string; bookSlug: string; chapter: number } | null;
  onClearInitialPassage?: () => void;
  onNavigateToPassage: (bookSlug: string, chapter: number) => void;
}

export default function BibleJournalView({
  token,
  initialPassage,
  onClearInitialPassage,
  onNavigateToPassage
}: BibleJournalViewProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Editor modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reflectionDate, setReflectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [passages, setPassages] = useState<any[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [promptQuestion, setPromptQuestion] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load entries on mount / token change
  const fetchEntries = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/fy/bible/journal`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error('Error fetching journal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [token]);

  // Handle incoming initial passage from reader or study drawer
  useEffect(() => {
    if (initialPassage) {
      setIsEditing(true);
      setEditingId(null);
      setTitle(`تأمل في ${initialPassage.reference}`);
      setContent(`«${initialPassage.text}»\n\nتأملي الشخصي: `);
      setPassages([initialPassage]);
      setTagsInput(initialPassage.bookSlug);
      setPromptQuestion('ماذا يعلمني هذا النص اليوم وكيف أطبقه في حياتي؟');
      if (onClearInitialPassage) onClearInitialPassage();
    }
  }, [initialPassage]);

  const handleOpenNew = (prompt?: string) => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setReflectionDate(new Date().toISOString().split('T')[0]);
    setPassages([]);
    setTagsInput('');
    setPromptQuestion(prompt || null);
    setSavingStatus('idle');
    setIsEditing(true);
  };

  const handleOpenEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setReflectionDate(entry.reflectionDate.split('T')[0]);
    setPassages(entry.passages || []);
    setTagsInput((entry.tags || []).join(', '));
    setPromptQuestion(entry.promptQuestion || null);
    setSavingStatus('idle');
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('يرجى تسجيل الدخول لحفظ تأملاتك الروحية.');
      return;
    }
    if (!content.trim()) {
      alert('يرجى كتابة نص التأمل الروحي.');
      return;
    }

    setSavingStatus('saving');
    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim() || 'تأمل روحي',
      content: content.trim(),
      reflectionDate,
      passages,
      tags: parsedTags,
      promptQuestion
    };

    try {
      const url = editingId 
        ? `${API_URL}/fy/bible/journal/${editingId}`
        : `${API_URL}/fy/bible/journal`;
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSavingStatus('saved');
        await fetchEntries();
        setTimeout(() => {
          setIsEditing(false);
          setSavingStatus('idle');
        }, 600);
      } else {
        setSavingStatus('error');
      }
    } catch (err) {
      console.error('Error saving journal entry:', err);
      setSavingStatus('error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التأمل الروحي من دفترك الخاص؟')) return;
    try {
      const res = await fetch(`${API_URL}/fy/bible/journal/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setEntries(prev => prev.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error('Error deleting journal entry:', err);
    }
  };

  // Filtered entries
  const filteredEntries = entries.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      e.title.toLowerCase().includes(q) || 
      e.content.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q));
    const matchesTag = !selectedTag || e.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Unique tags
  const allTags = Array.from(new Set(entries.flatMap(e => e.tags || [])));

  const spiritualPrompts = [
    'ماذا أتعلم عن طبيعة الله ومحبته من قراءتي اليوم؟',
    'ما هو الأمر العملي الذي يدعوني الروح القدس لتطبيقه؟',
    'ما هي الصلاة أو الطلبة التي يثيرها هذا النص في قلبي؟'
  ];

  if (!token) {
    return (
      <div className="py-20 text-center max-w-md mx-auto p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} />
        </div>
        <h3 className="font-bold text-lg mb-2">الدفتر الروحي الخاص</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          دفترك الروحي مشفر ومحمي بخصوصية تامة، ومتاح حصرياً لأعضاء الكنيسة المسجلين لتدوين تأملاتهم الشخصية في كلمة الله.
        </p>
        <a 
          href="/login" 
          className="inline-block py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
        >
          تسجيل الدخول إلى حسابك
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & New Entry Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <h3 className="font-bold text-lg md:text-xl text-amber-400 flex items-center gap-2">
            <BookMarked size={22} /> دفتري الروحي الخاص
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            مساحتك الهادئة والسرية لتدوين صلواتك وتأملاتك المرتبطة بآيات الكتاب المقدس
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenNew()}
          className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition"
        >
          <Plus size={16} /> تدوين تأمل جديد
        </button>
      </div>

      {/* Suggested Spiritual Prompts */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2.5">
          <Sparkles size={14} /> مقترحات وأسئلة لبدء تأملك اليومي:
        </span>
        <div className="flex flex-wrap gap-2">
          {spiritualPrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleOpenNew(p)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition text-right"
            >
              ✍️ {p}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3.5 top-3 text-slate-400" />
          <input 
            type="text"
            placeholder="ابحث في تأملاتك أو بالوسوم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs focus:outline-none focus:border-amber-500"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedTag === null ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              الكل
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                  selectedTag === tag ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Journal Entries List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          جاري تحميل تأملاتك الروحية...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-slate-900/30 border border-dashed border-slate-800 p-8">
          <BookMarked size={36} className="mx-auto text-slate-600 mb-3" />
          <h4 className="font-bold text-sm text-slate-300 mb-1">دفترك الروحي بانتظار تأملك الأول</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            ابدأ بتدوين ما يلمس قلبك أثناء قراءة كلمة الله، أو حدد أي آية في القارئ واضغط "تدوين في دفتري الروحي".
          </p>
          <button
            type="button"
            onClick={() => handleOpenNew()}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs transition"
          >
            كتابة أول تأمل الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => (
            <div 
              key={entry.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-bold text-sm md:text-base text-amber-200 line-clamp-1">
                    {entry.title}
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(entry)}
                      className="p-1 text-slate-400 hover:text-amber-400 rounded transition"
                      title="تعديل التأمل"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="p-1 text-slate-400 hover:text-red-400 rounded transition"
                      title="حذف التأمل"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {new Date(entry.reflectionDate).toLocaleDateString('ar-EG')}
                  </span>
                  {entry.passages && entry.passages.length > 0 && entry.passages[0] && (
                    <button
                      type="button"
                      onClick={() => {
                        const p = entry.passages?.[0];
                        if (p) onNavigateToPassage(p.bookSlug, p.chapter);
                      }}
                      className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <BookOpen size={12} /> {entry.passages[0].reference}
                    </button>
                  )}
                </div>

                {entry.promptQuestion && (
                  <p className="text-xs text-amber-400/90 font-medium mb-2 bg-amber-950/20 p-2 rounded-lg border border-amber-900/30">
                    💡 {entry.promptQuestion}
                  </p>
                )}

                <p className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-line line-clamp-5">
                  {entry.content}
                </p>
              </div>

              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                  {entry.tags.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isEditing && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.78)', backdropFilter: 'blur(8px)' }}
        >
          <div 
            className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] bg-slate-900 border border-slate-700"
          >
            <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base md:text-lg text-amber-400 flex items-center gap-2">
                <Edit3 size={18} /> {editingId ? 'تعديل التأمل الروحي' : 'تدوين تأمل روحي جديد'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">عنوان التأمل</label>
                <input 
                  type="text"
                  placeholder="مثال: سلام يفوق كل عقل، أمانة الله في الضيق..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">تاريخ التأمل</label>
                  <input 
                    type="date"
                    value={reflectionDate}
                    onChange={(e) => setReflectionDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">وسوم (مفصولة بفاصلة)</label>
                  <input 
                    type="text"
                    placeholder="صلاة, سلام, رجاء, يوحنا..."
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {promptQuestion && (
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-300">
                  <span className="font-bold">سؤال التأمل الموجه: </span>
                  <span>{promptQuestion}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                  نص التأمل والصلاة الشخصية *
                </label>
                <textarea 
                  rows={8}
                  placeholder="اكتب هنا ما لمسه الرب في قلبك من خلال الآية، وكيف ترغب في تطبيقه عملياً اليوم..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-sm leading-relaxed focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  {savingStatus === 'saving' && <span className="text-amber-400 flex items-center gap-1"><RefreshCw className="animate-spin" size={14} /> جاري الحفظ...</span>}
                  {savingStatus === 'saved' && <span className="text-emerald-400 flex items-center gap-1"><Check size={14} /> تم الحفظ في دفترك!</span>}
                  {savingStatus === 'error' && <span className="text-red-400 flex items-center gap-1"><AlertCircle size={14} /> فشل الحفظ، يرجى المحاولة.</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="py-2 px-4 rounded-xl border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={savingStatus === 'saving'}
                    className="py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition disabled:opacity-50"
                  >
                    حفظ التأمل
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
