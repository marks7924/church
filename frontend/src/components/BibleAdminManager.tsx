'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Calendar, Check, RefreshCw, Save, 
  Image as ImageIcon, ExternalLink, SlidersHorizontal, BookOpen, Layers
} from 'lucide-react';
import { API_URL } from '../config';

interface BibleAdminManagerProps {
  token: string | null;
}

export default function BibleAdminManager({ token }: BibleAdminManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'votd' | 'backgrounds'>('votd');

  // VOTD Form State
  const [votdDate, setVotdDate] = useState(new Date().toISOString().split('T')[0]);
  const [votdBookId, setVotdBookId] = useState('PHP');
  const [votdChapter, setVotdChapter] = useState('4');
  const [votdVerseNum, setVotdVerseNum] = useState('13');
  const [votdRefAr, setVotdRefAr] = useState('رسالة فيلبي 4: 13');
  const [votdRefEn, setVotdRefEn] = useState('Philippians 4:13');
  const [votdTextAr, setVotdTextAr] = useState('أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي.');
  const [votdTextEn, setVotdTextEn] = useState('I can do all things through Christ who strengthens me.');
  const [votdDevotionalAr, setVotdDevotionalAr] = useState('الله معنا في كل خطوة، وقوته تتجلى في ضعفنا لنعيش منتصرين بنعمته كل يوم.');
  const [votdDevotionalEn, setVotdDevotionalEn] = useState('God is with us at every step, and His strength is made perfect in our weakness.');
  const [votdQuestionAr, setVotdQuestionAr] = useState('كيف يمكنك الاعتماد على قوة المسيح في تحدي اليوم بدلاً من قدرتك الذاتية؟');
  const [votdQuestionEn, setVotdQuestionEn] = useState('How can you rely on Christ\'s strength today instead of your own efforts?');
  const [votdSaving, setVotdSaving] = useState(false);
  const [votdSuccessMsg, setVotdSuccessMsg] = useState<string | null>(null);

  // Background Config State
  const [bgConfig, setBgConfig] = useState<any>(null);
  const [bgDarkColor, setBgDarkColor] = useState('#ffffff');
  const [bgLightColor, setBgLightColor] = useState('#18191c');
  const [bgHorizMargin, setBgHorizMargin] = useState(9.0);
  const [bgVertMargin, setBgVertMargin] = useState(11.0);
  const [bgDarkOverlay, setBgDarkOverlay] = useState(0.15);
  const [bgLightOverlay, setBgLightOverlay] = useState(0.05);
  const [bgSaving, setBgSaving] = useState(false);
  const [bgSuccessMsg, setBgSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load background config
    fetch(`${API_URL}/fy/bible/backgrounds/config`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setBgConfig(data);
          if (data.darkTextColor) setBgDarkColor(data.darkTextColor);
          if (data.lightTextColor) setBgLightColor(data.lightTextColor);
          if (data.horizontalMarginPercent) setBgHorizMargin(data.horizontalMarginPercent);
          if (data.verticalMarginPercent) setBgVertMargin(data.verticalMarginPercent);
          if (data.darkOverlayOpacity) setBgDarkOverlay(data.darkOverlayOpacity);
          if (data.lightOverlayOpacity) setBgLightOverlay(data.lightOverlayOpacity);
        }
      })
      .catch(err => console.error('Error fetching bg config:', err));
  }, []);

  const handleSaveVotd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setVotdSaving(true);
    setVotdSuccessMsg(null);

    try {
      const res = await fetch(`${API_URL}/fy/verse-of-day/admin/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: votdDate,
          bookId: votdBookId,
          chapterNumber: votdChapter,
          verseNumber: votdVerseNum,
          referenceAr: votdRefAr,
          referenceEn: votdRefEn,
          verseTextAr: votdTextAr,
          verseTextEn: votdTextEn,
          devotionalTextAr: votdDevotionalAr,
          devotionalTextEn: votdDevotionalEn,
          reflectionQuestionAr: votdQuestionAr,
          reflectionQuestionEn: votdQuestionEn
        })
      });

      if (res.ok) {
        setVotdSuccessMsg('تمت جدولة ونشر آية اليوم والتأمل الروحي بنجاح في قاعدة البيانات!');
        setTimeout(() => setVotdSuccessMsg(null), 4000);
      } else {
        alert('حدث خطأ أثناء حفظ آية اليوم.');
      }
    } catch (err) {
      console.error('Error saving VOTD:', err);
    } finally {
      setVotdSaving(false);
    }
  };

  const handleSaveBgConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBgSaving(true);
    setBgSuccessMsg(null);

    try {
      const res = await fetch(`${API_URL}/fy/bible/backgrounds/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          darkTextColor: bgDarkColor,
          lightTextColor: bgLightColor,
          horizontalMarginPercent: bgHorizMargin,
          verticalMarginPercent: bgVertMargin,
          darkOverlayOpacity: bgDarkOverlay,
          lightOverlayOpacity: bgLightOverlay
        })
      });

      if (res.ok) {
        setBgSuccessMsg('تم تحديث إعدادات وهوامش خلفيات الآيات بنجاح!');
        setTimeout(() => setBgSuccessMsg(null), 4000);
      } else {
        alert('حدث خطأ أثناء تحديث إعدادات الخلفيات.');
      }
    } catch (err) {
      console.error('Error saving bg config:', err);
    } finally {
      setBgSaving(false);
    }
  };

  return (
    <div className="w-full space-y-8" style={{ width: '100%', boxSizing: 'border-box' }} dir="rtl">
      {/* Top Navigation Tabs - Cathedral architectural tabs with 8px radius */}
      <div 
        className="flex items-center gap-3 p-1.5 border"
        style={{
          backgroundColor: 'rgba(28, 29, 38, 0.85)',
          borderColor: 'var(--border-color, #2a2c3a)',
          borderRadius: '8px',
          width: 'fit-content'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('votd')}
          className="px-5 py-2.5 text-sm font-bold transition-all flex items-center gap-2.5"
          style={{
            borderRadius: '6px',
            backgroundColor: activeSubTab === 'votd' ? 'var(--accent-gold, #e2b714)' : 'transparent',
            color: activeSubTab === 'votd' ? '#000000' : 'var(--text-secondary, #a0aec0)',
            boxShadow: activeSubTab === 'votd' ? '0 4px 15px rgba(226, 183, 20, 0.25)' : 'none'
          }}
        >
          <Sparkles size={16} />
          <span>جدولة آية اليوم والتأمل</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('backgrounds')}
          className="px-5 py-2.5 text-sm font-bold transition-all flex items-center gap-2.5"
          style={{
            borderRadius: '6px',
            backgroundColor: activeSubTab === 'backgrounds' ? 'var(--accent-gold, #e2b714)' : 'transparent',
            color: activeSubTab === 'backgrounds' ? '#000000' : 'var(--text-secondary, #a0aec0)',
            boxShadow: activeSubTab === 'backgrounds' ? '0 4px 15px rgba(226, 183, 20, 0.25)' : 'none'
          }}
        >
          <ImageIcon size={16} />
          <span>إعدادات وتخصيص الخلفيات الرسمية</span>
        </button>
      </div>

      {/* VOTD Scheduler Form - Grand spacious cathedral card */}
      {activeSubTab === 'votd' && (
        <form 
          onSubmit={handleSaveVotd} 
          className="w-full p-6 sm:p-8 md:p-10 border shadow-2xl space-y-8" 
          style={{ 
            width: '100%', 
            boxSizing: 'border-box',
            backgroundColor: 'rgba(28, 29, 38, 0.85)',
            borderColor: 'var(--border-color, #2a2c3a)',
            borderRadius: '8px'
          }}
        >
          {/* Header */}
          <div 
            className="pb-5 border-b flex flex-wrap items-center justify-between gap-4"
            style={{ borderColor: 'var(--border-color, #2a2c3a)' }}
          >
            <div>
              <h3 
                className="font-extrabold text-xl md:text-2xl"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 40%, var(--accent-gold, #e2b714) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                إدارة وجدولة آية اليوم والتأمل اليومي
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                حدد الآية والشاهد والتأمل الروحي وسؤال التطبيق العملي لأي تاريخ في روزنامة الكنيسة
              </p>
            </div>
            <a 
              href="/fy/bible?view=votd" 
              target="_blank"
              className="px-4 py-2 text-xs font-bold flex items-center gap-2 transition hover:scale-105"
              style={{
                backgroundColor: 'rgba(226, 183, 20, 0.1)',
                border: '1px solid rgba(226, 183, 20, 0.35)',
                borderRadius: '6px',
                color: 'var(--accent-gold, #e2b714)'
              }}
            >
              <span>معاينة في الموقع</span>
              <ExternalLink size={14} />
            </a>
          </div>

          {votdSuccessMsg && (
            <div 
              className="p-4 border text-sm font-semibold flex items-center gap-3 animate-in fade-in"
              style={{
                backgroundColor: 'rgba(46, 204, 113, 0.15)',
                borderColor: 'rgba(46, 204, 113, 0.4)',
                borderRadius: '6px',
                color: '#2ecc71'
              }}
            >
              <Check size={18} /> {votdSuccessMsg}
            </div>
          )}

          {/* Metadata Grid */}
          <div>
            <span className="text-xs font-bold tracking-wider uppercase mb-3 block" style={{ color: 'var(--accent-gold, #e2b714)' }}>
              1. بيانات الإسناد والتاريخ
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  التاريخ المجدول *
                </label>
                <input 
                  type="date"
                  value={votdDate}
                  onChange={e => setVotdDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-sm focus:outline-none transition"
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    borderColor: 'var(--border-color, #2a2c3a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    color: '#f8f9fa'
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  كود السفر (ID)
                </label>
                <input 
                  type="text"
                  value={votdBookId}
                  onChange={e => setVotdBookId(e.target.value)}
                  placeholder="PHP, JHN, PSA..."
                  className="w-full px-4 py-3 text-sm uppercase focus:outline-none transition"
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    borderColor: 'var(--border-color, #2a2c3a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    color: '#f8f9fa'
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  رقم الإصحاح
                </label>
                <input 
                  type="number"
                  value={votdChapter}
                  onChange={e => setVotdChapter(e.target.value)}
                  className="w-full px-4 py-3 text-sm focus:outline-none transition"
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    borderColor: 'var(--border-color, #2a2c3a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    color: '#f8f9fa'
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  رقم الآية
                </label>
                <input 
                  type="number"
                  value={votdVerseNum}
                  onChange={e => setVotdVerseNum(e.target.value)}
                  className="w-full px-4 py-3 text-sm focus:outline-none transition"
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    borderColor: 'var(--border-color, #2a2c3a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    color: '#f8f9fa'
                  }}
                />
              </div>
            </div>
          </div>

          {/* References Grid */}
          <div>
            <span className="text-xs font-bold tracking-wider uppercase mb-3 block" style={{ color: 'var(--accent-gold, #e2b714)' }}>
              2. الشواهد الرسمية
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  الشاهد بالعربية *
                </label>
                <input 
                  type="text"
                  value={votdRefAr}
                  onChange={e => setVotdRefAr(e.target.value)}
                  required
                  placeholder="مثال: رسالة فيلبي 4: 13"
                  className="w-full px-4 py-3 text-sm font-serif focus:outline-none transition"
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    borderColor: 'var(--border-color, #2a2c3a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    color: '#f8f9fa'
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  الشاهد بالإنجليزية
                </label>
                <input 
                  type="text"
                  value={votdRefEn}
                  onChange={e => setVotdRefEn(e.target.value)}
                  placeholder="Example: Philippians 4:13"
                  className="w-full px-4 py-3 text-sm font-sans focus:outline-none transition"
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    borderColor: 'var(--border-color, #2a2c3a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    color: '#f8f9fa'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Verse Text Fields */}
          <div>
            <span className="text-xs font-bold tracking-wider uppercase mb-3 block" style={{ color: 'var(--accent-gold, #e2b714)' }}>
              3. نصوص الآية
            </span>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  نص الآية بالعربية (مع حركات التشكيل) *
                </label>
                <textarea 
                  rows={3}
                  value={votdTextAr}
                  onChange={e => setVotdTextAr(e.target.value)}
                  required
                  className="w-full p-4 text-base font-serif focus:outline-none transition leading-relaxed"
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    borderColor: 'var(--border-color, #2a2c3a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    color: '#f8f9fa'
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  نص الآية بالإنجليزية (King James Version)
                </label>
                <textarea 
                  rows={2}
                  value={votdTextEn}
                  onChange={e => setVotdTextEn(e.target.value)}
                  className="w-full p-4 text-sm font-sans focus:outline-none transition"
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    borderColor: 'var(--border-color, #2a2c3a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    color: '#f8f9fa'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Devotional & Practical Question */}
          <div>
            <span className="text-xs font-bold tracking-wider uppercase mb-3 block" style={{ color: 'var(--accent-gold, #e2b714)' }}>
              4. التأمل الرعوي والتطبيق العملي
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  التأمل الروحي المعتمد (بالعربية)
                </label>
                <textarea 
                  rows={4}
                  value={votdDevotionalAr}
                  onChange={e => setVotdDevotionalAr(e.target.value)}
                  className="w-full p-4 text-sm focus:outline-none transition leading-relaxed"
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    borderColor: 'var(--border-color, #2a2c3a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    color: '#f8f9fa'
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  سؤال التطبيق والنمو الشخصي (بالعربية)
                </label>
                <textarea 
                  rows={4}
                  value={votdQuestionAr}
                  onChange={e => setVotdQuestionAr(e.target.value)}
                  className="w-full p-4 text-sm focus:outline-none transition leading-relaxed"
                  style={{
                    backgroundColor: 'rgba(18, 19, 26, 0.95)',
                    borderColor: 'var(--border-color, #2a2c3a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    color: '#f8f9fa'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t flex justify-end" style={{ borderColor: 'var(--border-color, #2a2c3a)' }}>
            <button
              type="submit"
              disabled={votdSaving}
              className="py-3 px-8 text-sm font-bold flex items-center gap-2.5 transition-all shadow-lg hover:brightness-110 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-gold, #e2b714)',
                color: '#000000',
                borderRadius: '8px',
                boxShadow: '0 8px 25px rgba(226, 183, 20, 0.3)'
              }}
            >
              {votdSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              <span>حفظ وجدولة آية اليوم</span>
            </button>
          </div>
        </form>
      )}

      {/* Two-Backgrounds Configuration */}
      {activeSubTab === 'backgrounds' && (
        <form 
          onSubmit={handleSaveBgConfig} 
          className="p-6 sm:p-8 md:p-10 border shadow-2xl space-y-8"
          style={{ 
            backgroundColor: 'rgba(28, 29, 38, 0.85)',
            borderColor: 'var(--border-color, #2a2c3a)',
            borderRadius: '8px'
          }}
        >
          <div className="border-b pb-5" style={{ borderColor: 'var(--border-color, #2a2c3a)' }}>
            <h3 
              className="font-extrabold text-xl md:text-2xl"
              style={{
                background: 'linear-gradient(135deg, #ffffff 40%, var(--accent-gold, #e2b714) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              إعدادات وهوامش الصورتين الرسميتين للكنيسة
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
              التحكم الدقيق في الهوامش الآمنة لحماية الصليب والأيقونة، وضبط درجات الشفافية وألوان النصوص
            </p>
          </div>

          {bgSuccessMsg && (
            <div 
              className="p-4 border text-sm font-semibold flex items-center gap-3 animate-in fade-in"
              style={{
                backgroundColor: 'rgba(46, 204, 113, 0.15)',
                borderColor: 'rgba(46, 204, 113, 0.4)',
                borderRadius: '6px',
                color: '#2ecc71'
              }}
            >
              <Check size={18} /> {bgSuccessMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dark Theme Asset */}
            <div 
              className="p-5 border space-y-4"
              style={{
                backgroundColor: 'rgba(18, 19, 26, 0.8)',
                borderColor: 'var(--border-color, #2a2c3a)',
                borderRadius: '8px'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: 'var(--accent-gold, #e2b714)' }}>
                  🌙 الخلفية الداكنة الرسمية
                </span>
                <span className="text-xs px-2 py-1 font-mono rounded" style={{ backgroundColor: 'rgba(226, 183, 20, 0.1)', color: 'var(--accent-gold, #e2b714)' }}>
                  16:9 4K
                </span>
              </div>
              <div 
                className="overflow-hidden border"
                style={{
                  borderRadius: '6px',
                  borderColor: 'var(--border-color, #2a2c3a)'
                }}
              >
                <img src="/images/bible/bible-bg-dark.png" alt="Dark Background Asset" className="w-full aspect-video object-cover" />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  لون النص الافتراضي للخلفية الداكنة
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={bgDarkColor}
                    onChange={e => setBgDarkColor(e.target.value)}
                    className="w-10 h-10 border-none cursor-pointer"
                    style={{ borderRadius: '6px' }}
                  />
                  <span className="text-sm font-mono px-3 py-1.5 border" style={{ backgroundColor: 'rgba(28, 29, 38, 0.9)', borderColor: 'var(--border-color, #2a2c3a)', borderRadius: '6px' }}>
                    {bgDarkColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Light Theme Asset */}
            <div 
              className="p-5 border space-y-4"
              style={{
                backgroundColor: 'rgba(18, 19, 26, 0.8)',
                borderColor: 'var(--border-color, #2a2c3a)',
                borderRadius: '8px'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: 'var(--accent-gold, #e2b714)' }}>
                  ☀️ الخلفية الفاتحة الرسمية
                </span>
                <span className="text-xs px-2 py-1 font-mono rounded" style={{ backgroundColor: 'rgba(226, 183, 20, 0.1)', color: 'var(--accent-gold, #e2b714)' }}>
                  16:9 4K
                </span>
              </div>
              <div 
                className="overflow-hidden border"
                style={{
                  borderRadius: '6px',
                  borderColor: 'var(--border-color, #2a2c3a)'
                }}
              >
                <img src="/images/bible/bible-bg-light.png" alt="Light Background Asset" className="w-full aspect-video object-cover" />
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary, #a0aec0)' }}>
                  لون النص الافتراضي للخلفية الفاتحة
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={bgLightColor}
                    onChange={e => setBgLightColor(e.target.value)}
                    className="w-10 h-10 border-none cursor-pointer"
                    style={{ borderRadius: '6px' }}
                  />
                  <span className="text-sm font-mono px-3 py-1.5 border" style={{ backgroundColor: 'rgba(28, 29, 38, 0.9)', borderColor: 'var(--border-color, #2a2c3a)', borderRadius: '6px' }}>
                    {bgLightColor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Margins Sliders */}
          <div 
            className="p-6 border grid grid-cols-1 sm:grid-cols-2 gap-6"
            style={{
              backgroundColor: 'rgba(18, 19, 26, 0.6)',
              borderColor: 'var(--border-color, #2a2c3a)',
              borderRadius: '8px'
            }}
          >
            <div>
              <div className="flex justify-between text-xs mb-2 font-bold">
                <span>الهامش الأفقي الآمن (Safe Margin H)</span>
                <span style={{ color: 'var(--accent-gold, #e2b714)' }}>{bgHorizMargin}% (~{Math.round(1600 * bgHorizMargin / 100)}px)</span>
              </div>
              <input 
                type="range"
                min="5"
                max="18"
                step="0.5"
                value={bgHorizMargin}
                onChange={e => setBgHorizMargin(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2 font-bold">
                <span>الهامش الرأسي الآمن (Safe Margin V)</span>
                <span style={{ color: 'var(--accent-gold, #e2b714)' }}>{bgVertMargin}% (~{Math.round(844 * bgVertMargin / 100)}px)</span>
              </div>
              <input 
                type="range"
                min="6"
                max="22"
                step="0.5"
                value={bgVertMargin}
                onChange={e => setBgVertMargin(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={bgSaving}
              className="py-3 px-8 text-sm font-bold flex items-center gap-2.5 transition-all shadow-lg hover:brightness-110 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-gold, #e2b714)',
                color: '#000000',
                borderRadius: '8px',
                boxShadow: '0 8px 25px rgba(226, 183, 20, 0.3)'
              }}
            >
              {bgSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              <span>حفظ إعدادات وهوامش الخلفيات</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
