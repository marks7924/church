'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Sparkles, Check, RefreshCw, Type, AlignCenter, 
  AlignRight, AlignLeft, Eye, AlertTriangle 
} from 'lucide-react';
import { removeArabicTashkeel } from '../utils/bibleTashkeel';

interface SelectedVerseItem {
  verseNumber: number;
  text: string;
}

interface BibleImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVerses: SelectedVerseItem[];
  bookName?: string;
  chapterNumber?: number;
  translationName?: string;
  referenceString?: string;
  isRtl?: boolean;
}

export default function BibleImageGeneratorModal({
  isOpen,
  onClose,
  selectedVerses,
  bookName = '',
  chapterNumber = 1,
  translationName = '',
  referenceString = '',
  isRtl = true
}: BibleImageGeneratorModalProps) {
  // Two official backgrounds
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('dark');
  const [includeTashkeel, setIncludeTashkeel] = useState<boolean>(true);
  const [showReference, setShowReference] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(44);
  const [textAlign, setTextAlign] = useState<'center' | 'right' | 'left'>('center');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [textOverflowWarning, setTextOverflowWarning] = useState<boolean>(false);

  // Hidden high-res canvas (1600 x 844)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [darkThumbUrl, setDarkThumbUrl] = useState<string>('');
  const [lightThumbUrl, setLightThumbUrl] = useState<string>('');

  // Dimensions of source assets
  const CANVAS_WIDTH = 1600;
  const CANVAS_HEIGHT = 844;
  const SAFE_MARGIN_H = Math.round(CANVAS_WIDTH * 0.09); // ~144px
  const SAFE_MARGIN_V = Math.round(CANVAS_HEIGHT * 0.11); // ~93px
  const SAFE_WIDTH = CANVAS_WIDTH - SAFE_MARGIN_H * 2; // 1312px
  const SAFE_HEIGHT = CANVAS_HEIGHT - SAFE_MARGIN_V * 2; // 658px

  // Compute text
  const fullPassageText = React.useMemo(() => {
    if (!selectedVerses || selectedVerses.length === 0) return '';
    const raw = selectedVerses.map(v => v.text).join(' ');
    return includeTashkeel ? raw : removeArabicTashkeel(raw);
  }, [selectedVerses, includeTashkeel]);

  const verseNumbers = selectedVerses.map(v => v.verseNumber).sort((a, b) => a - b);
  const verseRefString = React.useMemo(() => {
    if (referenceString && referenceString.trim()) {
      return referenceString.trim();
    }
    if (verseNumbers.length === 0) return bookName || '';
    const isConsecutive = verseNumbers.every((v, i) => i === 0 || v === verseNumbers[i - 1] + 1);
    const range = isConsecutive && verseNumbers.length > 1
      ? `${verseNumbers[0]}–${verseNumbers[verseNumbers.length - 1]}`
      : verseNumbers.join(', ');
    const bName = bookName && bookName !== 'الكتاب المقدس' ? bookName : '';
    if (bName && chapterNumber) {
      return `${bName} ${chapterNumber}: ${range}`;
    }
    return range ? `${bName} ${range}`.trim() : (bName || '');
  }, [referenceString, bookName, chapterNumber, verseNumbers]);

  // Load and render canvas
  const renderCanvas = (targetTheme: 'dark' | 'light', customSize?: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('');

      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.src = targetTheme === 'dark' 
        ? '/images/bible/bible-bg-dark.png' 
        : '/images/bible/bible-bg-light.png';

      bgImg.onload = () => {
        // 1. Draw Background Image
        ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. Subtle contrast overlay to guarantee readability
        if (targetTheme === 'dark') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // 3. Styling rules per theme
        const textColor = targetTheme === 'dark' ? '#FFFFFF' : '#1A1D20';
        const shadowColor = targetTheme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)';

        // 4. Auto-Fitting Text Algorithm
        let currentSize = customSize || fontSize;
        const minSize = 26;
        let lines: string[] = [];
        let lineHeight = currentSize * 1.6;

        ctx.direction = isRtl ? 'rtl' : 'ltr';

        // Helper to wrap text into lines based on max width
        const wrapText = (text: string, maxW: number, size: number) => {
          ctx.font = `600 ${size}px "Amiri", "Noto Naskh Arabic", serif`;
          const words = text.split(' ');
          const resultLines: string[] = [];
          let currentLine = '';

          for (let i = 0; i < words.length; i++) {
            const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxW && i > 0) {
              resultLines.push(currentLine);
              currentLine = words[i];
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) resultLines.push(currentLine);
          return resultLines;
        };

        // Iteratively scale down until text block fits safe height
        const reservedFooterHeight = (showReference && verseRefString ? 55 : 0) + 30;
        const availableTextHeight = SAFE_HEIGHT - reservedFooterHeight;

        let fitted = false;
        while (currentSize >= minSize) {
          lineHeight = currentSize * 1.55;
          lines = wrapText(fullPassageText, SAFE_WIDTH, currentSize);
          const totalHeight = lines.length * lineHeight;
          if (totalHeight <= availableTextHeight) {
            fitted = true;
            break;
          }
          currentSize -= 2;
        }

        if (!fitted) {
          setTextOverflowWarning(true);
        } else {
          setTextOverflowWarning(false);
        }

        // 5. Draw Scripture Lines
        ctx.font = `600 ${currentSize}px "Amiri", "Noto Naskh Arabic", serif`;
        ctx.fillStyle = textColor;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = targetTheme === 'dark' ? 14 : 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = targetTheme === 'dark' ? 2 : 1;

        const totalBlockHeight = (lines.length * lineHeight) + reservedFooterHeight;
        // Center text block vertically within safe vertical area
        let startY = SAFE_MARGIN_V + Math.max(10, (SAFE_HEIGHT - totalBlockHeight) / 2) + currentSize;

        let posX = textAlign === 'center' 
          ? CANVAS_WIDTH / 2 
          : (textAlign === 'right' ? CANVAS_WIDTH - SAFE_MARGIN_H : SAFE_MARGIN_H);

        ctx.textAlign = textAlign;

        for (const line of lines) {
          ctx.fillText(line, posX, startY);
          startY += lineHeight;
        }

        // 6. Draw Reference Label (الشاهد الكتابي)
        if (showReference && verseRefString) {
          startY += 26;
          ctx.font = `700 ${Math.max(26, Math.round(currentSize * 0.68))}px "Cairo", "Amiri", "Noto Naskh Arabic", sans-serif`;
          ctx.fillStyle = targetTheme === 'dark' ? '#E2B714' : '#92400E'; // Gold accent
          ctx.fillText(`— ${verseRefString} —`, posX, startY);
        }

        resolve(canvas.toDataURL('image/png'));
      };

      bgImg.onerror = () => {
        console.error('Failed to load background image:', bgImg.src);
        resolve('');
      };
    });
  };

  // Update preview when settings change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    renderCanvas(activeTheme).then((url) => {
      if (isMounted) setPreviewUrl(url);
    });

    // Also generate small thumbnails for the selector cards
    renderCanvas('dark').then(url => { if (isMounted) setDarkThumbUrl(url); });
    renderCanvas('light').then(url => { if (isMounted) setLightThumbUrl(url); });

    return () => { isMounted = false; };
  }, [isOpen, activeTheme, includeTashkeel, showReference, fontSize, textAlign, fullPassageText, verseRefString]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await renderCanvas(activeTheme);
      const link = document.createElement('a');
      const safeBookName = bookName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
      link.download = `church-bible-${safeBookName}-${chapterNumber}-${activeTheme}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('حدث خطأ أثناء تنزيل الصورة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.78)', backdropFilter: 'blur(8px)' }}
    >
      <div 
        className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: 'var(--bg-primary, #0f172a)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          color: 'var(--text-primary, #f8fafc)'
        }}
      >
        {/* Header */}
        <div 
          className="p-4 px-6 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--border-color, rgba(255,255,255,0.1))' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg md:text-xl">محرر خلفيات الآيات الكنسية</h3>
              <p className="text-xs text-slate-400">
                {verseRefString} • اختر الخلفية المناسبة من الصورتين الرسميتين
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Background Previews & Live View (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* The 2-Background Selector Cards Side-by-Side */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                اختر إحدى الخلفيتين الرسميتين للكنيسة (Dark & Light):
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Dark Preview Card */}
                <div 
                  onClick={() => setActiveTheme('dark')}
                  className={`cursor-pointer rounded-xl overflow-hidden border-2 transition relative ${
                    activeTheme === 'dark' 
                      ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg' 
                      : 'border-slate-700 opacity-75 hover:opacity-100'
                  }`}
                  style={{ aspectRatio: '16/9' }}
                >
                  <img 
                    src={darkThumbUrl || '/images/bible/bible-bg-dark.png'} 
                    alt="Dark Theme Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md text-[11px] font-bold bg-black/70 text-white flex items-center gap-1.5">
                    {activeTheme === 'dark' && <Check size={12} className="text-amber-400" />}
                    الخلفية الداكنة
                  </div>
                </div>

                {/* Light Preview Card */}
                <div 
                  onClick={() => setActiveTheme('light')}
                  className={`cursor-pointer rounded-xl overflow-hidden border-2 transition relative ${
                    activeTheme === 'light' 
                      ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg' 
                      : 'border-slate-700 opacity-75 hover:opacity-100'
                  }`}
                  style={{ aspectRatio: '16/9' }}
                >
                  <img 
                    src={lightThumbUrl || '/images/bible/bible-bg-light.png'} 
                    alt="Light Theme Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/90 text-slate-900 flex items-center gap-1.5">
                    {activeTheme === 'light' && <Check size={12} className="text-amber-600" />}
                    الخلفية الفاتحة
                  </div>
                </div>
              </div>
            </div>

            {/* Main Live Preview */}
            <div className="flex-1 flex flex-col justify-center items-center">
              <div 
                className="w-full rounded-xl overflow-hidden shadow-xl border border-slate-700/60 relative"
                style={{ aspectRatio: '1600/844' }}
              >
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Scripture Background Live Preview" 
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400 text-sm gap-2">
                    <RefreshCw className="animate-spin" size={18} /> جاري تجهيز المعاينة...
                  </div>
                )}
              </div>
              {textOverflowWarning && (
                <div className="mt-2 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 p-2 rounded-lg flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>النص طويل جداً بالنسبة للمساحة الآمنة. نوصي بتقليل عدد الآيات المحددة للحصول على أفضل مظهر جمالي.</span>
                </div>
              )}
            </div>
          </div>

            {/* Right Column: Editing Controls (5 cols) */}
          <div 
            className="lg:col-span-5 flex flex-col gap-4 p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <h4 className="text-sm font-bold flex items-center gap-2 text-amber-400">
              <SlidersHorizontal size={16} /> خيارات التصميم وضبط النص
            </h4>

            {/* Font Size Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                <span>حجم خط الآية</span>
                <span className="text-amber-400 font-bold">{fontSize}px</span>
              </div>
              <input 
                type="range"
                min="26"
                max="60"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Alignment */}
            <div>
              <label className="text-xs font-medium mb-1.5 block">محاذاة النص</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTextAlign('right')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                    textAlign === 'right' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-800/40 text-slate-400 border-slate-700'
                  }`}
                >
                  <AlignRight size={14} /> يمين
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign('center')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                    textAlign === 'center' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-800/40 text-slate-400 border-slate-700'
                  }`}
                >
                  <AlignCenter size={14} /> توسيط
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign('left')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                    textAlign === 'left' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-800/40 text-slate-400 border-slate-700'
                  }`}
                >
                  <AlignLeft size={14} /> يسار
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-slate-700/60">
              <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg hover:bg-slate-800/40 transition">
                <span>إبقاء التشكيل العربي (حركات الآية)</span>
                <input 
                  type="checkbox"
                  checked={includeTashkeel}
                  onChange={(e) => setIncludeTashkeel(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg hover:bg-slate-800/40 transition">
                <span>إظهار الشاهد الكتابي (السفر والإصحاح والآية)</span>
                <input 
                  type="checkbox"
                  checked={showReference}
                  onChange={(e) => setShowReference(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>
            </div>

            {/* Quality Info */}
            <div className="text-[11px] text-slate-400 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 leading-relaxed">
              ✨ يتم التصدير بدقة عالية (1600 × 844 بكسل) مع الاحتفاظ بالهوامش الآمنة (9% أفقياً و 11% رأسياً) لضمان عدم ملامسة النص للحواف أو التفاصيل المحمية.
            </div>

            {/* Action Buttons */}
            <div className="mt-auto pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="flex-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
              >
                {isExporting ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Download size={16} />
                )}
                <span>تحميل الصورة (PNG بدقة عالية)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlidersHorizontal({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" x2="14" y1="4" y2="4"/>
      <line x1="10" x2="3" y1="4" y2="4"/>
      <line x1="21" x2="12" y1="12" y2="12"/>
      <line x1="8" x2="3" y1="12" y2="12"/>
      <line x1="21" x2="16" y1="20" y2="20"/>
      <line x1="12" x2="3" y1="20" y2="20"/>
      <line x1="14" x2="14" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="10" y2="14"/>
      <line x1="16" x2="16" y1="18" y2="22"/>
    </svg>
  );
}
