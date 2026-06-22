'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../components/ThemeContext';
import styles from '../page.module.css';
import { API_URL } from '../../config';

export default function AboutPage() {
  const { language, t } = useTheme();

  const [historicPhotos, setHistoricPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1548625361-155deee223cb?q=80&w=400',
    'https://images.unsplash.com/photo-1438032005730-c779502df39b?q=80&w=400',
    'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=400',
  ]);

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(res => res.json())
      .then(data => {
        const photos = [];
        if (data.img_historic_1) photos.push(data.img_historic_1);
        else photos.push('https://images.unsplash.com/photo-1548625361-155deee223cb?q=80&w=400');

        if (data.img_historic_2) photos.push(data.img_historic_2);
        else photos.push('https://images.unsplash.com/photo-1438032005730-c779502df39b?q=80&w=400');

        if (data.img_historic_3) photos.push(data.img_historic_3);
        else photos.push('https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=400');

        setHistoricPhotos(photos);
      })
      .catch(err => console.log('Error fetching settings:', err));
  }, []);

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

      {/* History and details card */}
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
        <p style={{ color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
          {language === 'ar' 
            ? 'تأسست هذه الكنيسة المباركة في القرن الماضي لخدمة أبناء الكنيسة القبطية الأرثوذكسية في حي حدائق القبة التاريخي. وقد حظيت الكنيسة بزيارات وتبريكات مباركة من أصحاب القداسة والآباء البطاركة، وتطورت الخدمات عبر السنين لتشمل الكنيسة الكبرى، القاعات الملحقة، ونادي الشباب ومركزا متكاملا لخدمات التنمية والرعاية والرحمة.'
            : 'Founded in the last century to serve the Coptic Orthodox congregation in the historic Hadayek Al Koba district. The church has received visits and patriarchal blessings from Coptic Popes throughout its rich history. Over the years, the services expanded to encompass a main cathedral, multiple community halls, a youth club, and a social development center.'}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          {language === 'ar'
            ? 'نحن نؤمن بأهمية ربط التعليم الكنسي الأرثوذكسي الأصيل بالحياة المعاصرة وعمل المحبة والرحمة الاجتماعي كشهادة حية لإيماننا.'
            : 'We believe in linking authentic Orthodox church teachings with modern life application and active community care services as a living testimony to our faith.'}
        </p>
      </div>

      {/* Mission & Vision */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.8rem' }}>
          <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem' }}>👁️ {language === 'ar' ? 'رؤيتنا الروحية' : 'Our Spiritual Vision'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            {language === 'ar'
              ? 'أن نكون منارة روحية حية تشهد للمسيح بتقديم الكلمة المستقيمة والتعليم الطاهر وخدمة افتقاد ورعاية تفوق التوقعات لكل إنسان.'
              : 'To be a living spiritual lighthouse testifying to Christ by delivering sound biblical teaching, pure worship, and compassionate community outreach services.'}
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.8rem' }}>
          <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem' }}>🎯 {language === 'ar' ? 'رسالتنا الرعوية' : 'Our Pastoral Mission'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            {language === 'ar'
              ? 'تربية الأجيال وتعميق الحياة الروحية للأسر الكنسية وتوطيد أواصر التعاون والمحبة والافتقاد ومساندة المحتاج بروح كنسية أرثوذكسية.'
              : 'Raising Coptic generations, deepening the spiritual life of families, strengthening community bounds of love, and supporting underprivileged members.'}
          </p>
        </div>
      </div>

      {/* Historic Gallery */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-gold)', paddingLeft: '10px' }}>
        📸 {language === 'ar' ? 'أرشيف الصور التاريخية للكنيسة' : 'Historic Photos & Archives'}
      </h2>
      <div className={styles.netflixGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {historicPhotos.map((url, i) => (
          <div 
            key={i} 
            className={styles.sermonCard} 
            style={{ height: '170px', backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'default' }}
          ></div>
        ))}
      </div>
    </div>
  );
}
