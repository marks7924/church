'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Scissors } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface ImageCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  aspectRatioPreset?: '1:1' | '16:9' | '4:3' | 'free';
}

export default function ImageCropModal({
  isOpen,
  imageUrl,
  onClose,
  onCropComplete,
  aspectRatioPreset = 'free'
}: ImageCropModalProps) {
  const { language } = useTheme();

  const [aspect, setAspect] = useState<'1:1' | '16:9' | '4:3' | 'free'>(aspectRatioPreset);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // in degrees
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load image when imageUrl changes or modal opens
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setImgLoaded(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.onerror = () => {
      // If crossOrigin failed on external URL, retry without it
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        imgRef.current = fallbackImg;
        setImgLoaded(true);
      };
      fallbackImg.src = imageUrl;
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  // Redraw preview canvas
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = 460;
    const containerHeight = aspect === '1:1' ? 460 : aspect === '16:9' ? 260 : aspect === '4:3' ? 345 : 360;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Center pivot
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const img = imgRef.current;
    // Calculate initial fit
    const scale = Math.max(containerWidth / img.naturalWidth, containerHeight / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [imgLoaded, zoom, rotation, pan, aspect]);

  // Handle Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Handle Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  // Perform Final Crop
  const handleApplyCrop = () => {
    if (!canvasRef.current) return;
    try {
      const croppedDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.92);
      onCropComplete(croppedDataUrl);
      onClose();
    } catch (err) {
      // In case canvas is tainted by external host
      alert(language === 'ar' ? 'تعذر قص الصورة الخارجية بسبب حماية المصدر. يرجى رفع ملف صورة محلي أو اختيار صورة أخرى.' : 'Could not crop cross-origin image. Please upload a local image.');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '520px',
          padding: '1.5rem',
          position: 'relative',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          maxHeight: '92vh',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h3 style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', margin: 0 }}>
            <Scissors size={20} />
            <span>{language === 'ar' ? 'قص وضبط أبعاد الصورة' : 'Crop & Adjust Image'}</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Aspect Ratio Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['1:1', '16:9', '4:3', 'free'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setAspect(p)}
              style={{
                backgroundColor: aspect === p ? 'var(--accent-gold)' : 'var(--bg-card)',
                color: aspect === p ? '#000000' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '5px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}
            >
              {p === '1:1' ? '1:1 (مربع)' : p === '16:9' ? '16:9 (عريض)' : p === '4:3' ? '4:3 (قياسي)' : 'حر (Free)'}
            </button>
          ))}
        </div>

        {/* Canvas viewport */}
        <div 
          style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#050507',
            border: '2px dashed var(--accent-gold)',
            borderRadius: '6px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            minHeight: '260px',
            userSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />

          {!imgLoaded && (
            <div style={{ position: 'absolute', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              ⏳ {language === 'ar' ? 'جارٍ تحميل ومعالجة الصورة...' : 'Loading image...'}
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
          💡 {language === 'ar' ? 'يمكنك سحب الصورة لتحريكها وضبط موضعها داخل إطار القص' : 'You can drag the image to reposition it within the frame'}
        </p>

        {/* Controls: Zoom & Rotate */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', backgroundColor: 'var(--bg-card)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <ZoomOut size={16} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="range" 
              min="0.5" 
              max="3" 
              step="0.05" 
              value={zoom} 
              onChange={e => setZoom(parseFloat(e.target.value))} 
              style={{ flex: 1, accentColor: 'var(--accent-gold)', cursor: 'pointer' }} 
            />
            <ZoomIn size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>

          <button
            type="button"
            onClick={() => setRotation(r => (r + 90) % 360)}
            title={language === 'ar' ? 'تدوير 90 درجة' : 'Rotate 90deg'}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem'
            }}
          >
            <RotateCw size={14} />
            <span>90°</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            style={{
              flex: 2,
              backgroundColor: 'var(--accent-gold)',
              color: '#000000',
              border: 'none',
              padding: '10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Check size={18} />
            <span>{language === 'ar' ? 'قص وتطبيق الصورة' : 'Crop & Apply'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
