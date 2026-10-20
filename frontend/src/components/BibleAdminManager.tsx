'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Sparkles, SlidersHorizontal, Calendar, Check, 
  RefreshCw, Save, Image as ImageIcon, Shield, ExternalLink 
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
        setVotdSuccessMsg('تمت جدولة ونشر آية اليوم والتأمل الروحي بنجاح!');
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
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700 w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('votd')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'votd' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles size={15} /> جدولة آية اليوم والتأمل
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('backgrounds')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'backgrounds' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon size={15} /> إعدادات وتخصيص الخلفيات
        </button>
      </div>

      {/* VOTD Scheduler Form */}
      {activeSubTab === 'votd' && (
        <form onSubmit={handleSaveVotd} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-base text-amber-400">إدارة وجدولة آية اليوم والتأمل اليومي</h4>
              <p className="text-xs text-slate-400">حدد الآية والشاهد والتأمل الروحي لأي تاريخ في روزنامة الكنيسة</p>
            </div>
            <a 
              href="/fy/bible?view=votd" 
              target="_blank"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
            >
              معاينة في الموقع <ExternalLink size={12} />
            </a>
          </div>

          {votdSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <Check size={16} /> {votdSuccessMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">التاريخ المجدول *</label>
              <input 
                type="date"
                value={votdDate}
                onChange={e => setVotdDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">كود السفر (ID)</label>
              <input 
                type="text"
                value={votdBookId}
                onChange={e => setVotdBookId(e.target.value)}
                placeholder="PHP, JHN, PSA..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">رقم الإصحاح</label>
              <input 
                type="number"
                value={votdChapter}
                onChange={e => setVotdChapter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">رقم الآية</label>
              <input 
                type="number"
                value={votdVerseNum}
                onChange={e => setVotdVerseNum(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">الشاهد بالعربية *</label>
              <input 
                type="text"
                value={votdRefAr}
                onChange={e => setVotdRefAr(e.target.value)}
                required
                placeholder="مثال: رسالة فيلبي 4: 13"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs focus:outline-none focus:border-amber-500 font-serif"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">الشاهد بالإنجليزية</label>
              <input 
                type="text"
                value={votdRefEn}
                onChange={e => setVotdRefEn(e.target.value)}
                placeholder="Example: Philippians 4:13"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">نص الآية بالعربية *</label>
            <textarea 
              rows={2}
              value={votdTextAr}
              onChange={e => setVotdTextAr(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-amber-500 font-serif"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">نص الآية بالإنجليزية (KJV)</label>
            <textarea 
              rows={2}
              value={votdTextEn}
              onChange={e => setVotdTextEn(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">التأمل الروحي المعتمد (بالعربية)</label>
              <textarea 
                rows={3}
                value={votdDevotionalAr}
                onChange={e => setVotdDevotionalAr(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">سؤال التطبيق العملي (بالعربية)</label>
              <textarea 
                rows={3}
                value={votdQuestionAr}
                onChange={e => setVotdQuestionAr(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={votdSaving}
            className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            {votdSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
            <span>حفظ وجدولة آية اليوم</span>
          </button>
        </form>
      )}

      {/* Two-Backgrounds Configuration */}
      {activeSubTab === 'backgrounds' && (
        <form onSubmit={handleSaveBgConfig} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="font-bold text-base text-amber-400">إعدادات وهوامش الصورتين الرسميتين للكنيسة</h4>
            <p className="text-xs text-slate-400">التحكم في الهوامش الآمنة لحماية موضوع الصورة وألوان النصوص والشفافية</p>
          </div>

          {bgSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <Check size={16} /> {bgSuccessMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
              <span className="text-xs font-bold text-amber-400 block">🌙 الخلفية الداكنة الرسمية</span>
              <img src="/images/bible/bible-bg-dark.png" alt="Dark Background Asset" className="w-full rounded-lg aspect-video object-cover" />
              <div>
                <label className="text-xs text-slate-400 mb-1 block">لون النص الافتراضي</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={bgDarkColor}
                    onChange={e => setBgDarkColor(e.target.value)}
                    className="w-8 h-8 rounded border-none cursor-pointer"
                  />
                  <span className="text-xs font-mono">{bgDarkColor}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
              <span className="text-xs font-bold text-amber-400 block">☀️ الخلفية الفاتحة الرسمية</span>
              <img src="/images/bible/bible-bg-light.png" alt="Light Background Asset" className="w-full rounded-lg aspect-video object-cover" />
              <div>
                <label className="text-xs text-slate-400 mb-1 block">لون النص الافتراضي</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={bgLightColor}
                    onChange={e => setBgLightColor(e.target.value)}
                    className="w-8 h-8 rounded border-none cursor-pointer"
                  />
                  <span className="text-xs font-mono">{bgLightColor}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1 font-bold">
                <span>الهامش الأفقي الآمن (Safe Margin H)</span>
                <span className="text-amber-400">{bgHorizMargin}% (~{Math.round(1600 * bgHorizMargin / 100)}px)</span>
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
              <div className="flex justify-between text-xs mb-1 font-bold">
                <span>الهامش الرأسي الآمن (Safe Margin V)</span>
                <span className="text-amber-400">{bgVertMargin}% (~{Math.round(844 * bgVertMargin / 100)}px)</span>
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

          <button
            type="submit"
            disabled={bgSaving}
            className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            {bgSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
            <span>حفظ إعدادات وهوامش الخلفيات</span>
          </button>
        </form>
      )}
    </div>
  );
}
