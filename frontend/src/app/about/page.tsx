'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../components/ThemeContext';
import styles from '../page.module.css';
import { API_URL } from '../../config';

export default function AboutPage() {
  const { language, t } = useTheme();

  const [historicPhotos, setHistoricPhotos] = useState<string[]>([]);
  const [aboutHistoryAr, setAboutHistoryAr] = useState('');
  const [aboutHistoryEn, setAboutHistoryEn] = useState('');
  const [aboutMissionAr, setAboutMissionAr] = useState('');
  const [aboutMissionEn, setAboutMissionEn] = useState('');
  const [aboutVisionAr, setAboutVisionAr] = useState('');
  const [aboutVisionEn, setAboutVisionEn] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(res => res.json())
      .then(data => {
        setAboutHistoryAr(data.about_history_ar || '');
        setAboutHistoryEn(data.about_history_en || '');
        setAboutMissionAr(data.about_mission_ar || '');
        setAboutMissionEn(data.about_mission_en || '');
        setAboutVisionAr(data.about_vision_ar || '');
        setAboutVisionEn(data.about_vision_en || '');

        const photos: string[] = [];
        if (data.img_historic_1 && data.img_historic_1.trim()) photos.push(data.img_historic_1.trim());
        if (data.img_historic_2 && data.img_historic_2.trim()) photos.push(data.img_historic_2.trim());
        if (data.img_historic_3 && data.img_historic_3.trim()) photos.push(data.img_historic_3.trim());

        setHistoricPhotos(photos);
      })
      .catch(err => console.log('Error fetching settings:', err))
      .finally(() => setLoading(false));
  }, []);

  const hasHistory = (language === 'ar' ? aboutHistoryAr : aboutHistoryEn) || aboutHistoryAr || aboutHistoryEn;
  const hasVision = (language === 'ar' ? aboutVisionAr : aboutVisionEn) || aboutVisionAr || aboutVisionEn;
  const hasMission = (language === 'ar' ? aboutMissionAr : aboutMissionEn) || aboutMissionAr || aboutMissionEn;
  const hasPhotos = historicPhotos.length > 0;
  const hasAnyContent = hasHistory || hasVision || hasMission || hasPhotos;

  return (
    <div className="container" style={{ padding: '3rem 1rem' }}>
      <h1 style={{ 
        textAlign: 'center', 
        fontSize: '2.2rem', 
        fontWeight: '800', 
        color: 'var(--accent-gold)',
        marginBottom: '2rem'
      }}>
        {t('nav_about')}
      </h1>

      {/* History and details card (only if added manually) */}
      {hasHistory && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '3rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <h2 style={{ color: 'var(--accent-gold)', marginBottom: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            ⛪ {language === 'ar' ? 'تاريخ الكنيسة العريق' : 'Historical Church Foundations'}
          </h2>
          <p style={{ color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.8', whiteSpace: 'pre-line' }}>
            {language === 'ar' ? (aboutHistoryAr || aboutHistoryEn) : (aboutHistoryEn || aboutHistoryAr)}
          </p>
        </div>
      )}

      {/* Mission & Vision (only if added manually) */}
      {(hasVision || hasMission) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: (hasVision && hasMission) ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {hasVision && (
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.8rem' }}>
              <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem' }}>👁️ {language === 'ar' ? 'رؤيتنا الروحية' : 'Our Spiritual Vision'}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                {language === 'ar' ? (aboutVisionAr || aboutVisionEn) : (aboutVisionEn || aboutVisionAr)}
              </p>
            </div>
          )}

          {hasMission && (
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.8rem' }}>
              <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem' }}>🎯 {language === 'ar' ? 'رسالتنا الرعوية' : 'Our Pastoral Mission'}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                {language === 'ar' ? (aboutMissionAr || aboutMissionEn) : (aboutMissionEn || aboutMissionAr)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Historic Gallery (only if added manually) */}
      {hasPhotos && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', borderInlineStart: '4px solid var(--accent-gold)', paddingInlineStart: '10px' }}>
            📸 {language === 'ar' ? 'أرشيف الصور التاريخية للكنيسة' : 'Historic Photos & Archives'}
          </h2>
          <div className={styles.netflixGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {historicPhotos.map((url, i) => (
              <div 
                key={i} 
                className={styles.sermonCard} 
                style={{ height: '180px', backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'default' }}
              ></div>
            ))}
          </div>
        </section>
      )}

      {/* If nothing has been added yet */}
      {!loading && !hasAnyContent && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px dashed var(--border-color)',
          borderRadius: '8px',
          color: 'var(--text-secondary)'
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>⛪</p>
          <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>
            {language === 'ar'
              ? 'لم يتم إضافة تفاصيل وتاريخ الكنيسة بعد. يمكن لمدير النظام إضافتها من لوحة التحكم.'
              : 'Church details and history have not been added yet. Admins can configure them from the Dashboard.'}
          </p>
        </div>
      )}
    </div>
  );
}
