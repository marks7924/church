'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import { API_URL } from '../config';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface Announcement {
  id: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  type: string;
  createdAt: string;
}

export default function AnnouncementBanner() {
  const { language } = useTheme();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('dismissed-announcements');
      if (stored) {
        setDismissedIds(JSON.parse(stored));
      }
    } catch {}

    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`${API_URL}/developer/client/announcements`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.announcements)) {
            setAnnouncements(data.announcements);
          }
        }
      } catch {}
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 20000); // 20s live check
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('dismissed-announcements', JSON.stringify(updated));
    } catch {}
  };

  const active = announcements.filter(a => !dismissedIds.includes(a.id));
  if (active.length === 0) return null;

  return (
    <div style={{ position: 'relative', zIndex: 1200 }}>
      {active.map(item => {
        const isAr = language === 'ar';
        const title = isAr ? item.titleAr : (item.titleEn || item.titleAr);
        const content = isAr ? item.contentAr : (item.contentEn || item.contentAr);

        const isEmergency = item.type === 'EMERGENCY' || item.type === 'CRITICAL';
        const isWarning = item.type === 'WARNING';

        const bg = isEmergency
          ? 'linear-gradient(90deg, #7f1d1d 0%, #450a0a 100%)'
          : isWarning
          ? 'linear-gradient(90deg, #78350f 0%, #451a03 100%)'
          : 'linear-gradient(90deg, #1e3a8a 0%, #0f172a 100%)';

        const borderColor = isEmergency ? '#ef4444' : isWarning ? '#f59e0b' : '#3b82f6';
        const iconColor = isEmergency ? '#fca5a5' : isWarning ? '#fde047' : '#93c5fd';

        return (
          <aside
            key={item.id}
            role="status"
            aria-live="polite"
            style={{
              background: bg,
              borderBottom: `2px solid ${borderColor}`,
              color: '#fff',
              padding: '0.65rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              fontSize: '0.86rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
              direction: isAr ? 'rtl' : 'ltr'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, flexWrap: 'wrap' }}>
              <div style={{ color: iconColor, display: 'flex', alignItems: 'center' }}>
                {isEmergency ? <AlertTriangle size={18} /> : isWarning ? <AlertCircle size={18} /> : <Info size={18} />}
              </div>
              <strong style={{ fontWeight: 700, color: iconColor }}>{title}</strong>
              <span style={{ opacity: 0.9 }}>{content}</span>
            </div>
            <button
              onClick={() => handleDismiss(item.id)}
              aria-label={isAr ? 'إغلاق الإعلان' : 'Dismiss announcement'}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.15s ease'
              }}
            >
              <X size={15} />
            </button>
          </aside>
        );
      })}
    </div>
  );
}
