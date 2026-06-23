'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../components/ThemeContext';
import styles from '../page.module.css';
import { API_URL } from '../../config';

interface Ministry {
  id?: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  goalAr: string;
  goalEn: string;
  scheduleAr: string;
  scheduleEn: string;
  image: string;
}

export default function MinistriesPage() {
  const { language, t } = useTheme();

  const defaultMinistries: Ministry[] = [
    {
      slug: 'youth',
      nameAr: 'اجتماع الشباب والشابات',
      nameEn: 'Youth & Graduates Ministry',
      goalAr: 'تقديم رعاية روحية وثقافية لشباب الجامعة والخريجين وتوجيههم لمواجهة تحديات الحياة المعاصرة بروح الإنجيل.',
      goalEn: 'Providing spiritual and cultural guidance to university youth and graduates, preparing them to meet modern life challenges with the spirit of the Gospel.',
      scheduleAr: 'كل خميس الساعة 7:00 مساءً بالمسرح الكبير',
      scheduleEn: 'Every Thursday at 7:00 PM in the Main Auditorium',
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=400'
    },
    {
      slug: 'sunday-school',
      nameAr: 'خدمة مدارس الأحد',
      nameEn: 'Sunday School',
      goalAr: 'تربية الأطفال وتنشئتهم على محبة الله والكنيسة ودراسة الكتاب المقدس والعقيدة والطقوس الأرثوذكسية.',
      goalEn: 'Raising children in the love of God and the church, studying the Holy Bible, Orthodox dogmas, and rites.',
      scheduleAr: 'كل جمعة عقب القداس الثاني الساعة 10:30 صباحاً',
      scheduleEn: 'Every Friday following the Second Liturgy at 10:30 AM',
      image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=400'
    },
    {
      slug: 'choir',
      nameAr: 'كورال وألحان الكنيسة',
      nameEn: 'Church Choir & Hymns',
      goalAr: 'تعليم الألحان القبطية الأصيلة والتسبحة وتدريب الأصوات للمشاركة في صلوات القداسات والمناسبات الكنسية المختلفة.',
      goalEn: 'Teaching authentic Coptic hymns and praise, and training voices to participate in liturgies and church events.',
      scheduleAr: 'كل سبت الساعة 5:00 مساءً في قاعة الألحان',
      scheduleEn: 'Every Saturday at 5:00 PM in the Hymns Hall',
      image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=400'
    },
    {
      slug: 'social-service',
      nameAr: 'خدمة الرعاية الاجتماعية والرحمة',
      nameEn: 'Social Service & Mercy Ministry',
      goalAr: 'تقديم الدعم المادي والمعنوي والتعليمي والطبي للأسر الأولى بالرعاية وأخوة الرب كجزء أساسي من محبة الكنيسة العملية.',
      goalEn: 'Providing financial, moral, educational, and medical support to underprivileged families and the community as a practical expression of Coptic love.',
      scheduleAr: 'يومياً بمكتب خدمة أخوة الرب بالدور الأرضي',
      scheduleEn: 'Daily at the Social Service Office on the Ground Floor',
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=400'
    }
  ];

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [titleAr, setTitleAr] = useState('الخدمات الكنسية');
  const [titleEn, setTitleEn] = useState('Church Services');
  const [introAr, setIntroAr] = useState('تضم كنيستنا العديد من الخدمات والأنشطة المباركة التي تخدم كل أفراد الأسرة من الأطفال إلى كبار السن.');
  const [introEn, setIntroEn] = useState('Our church offers various blessed ministries and activities designed to serve all family members from young children to seniors.');

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.services_title_ar) setTitleAr(data.services_title_ar);
        if (data.services_title_en) setTitleEn(data.services_title_en);
        if (data.services_intro_ar) setIntroAr(data.services_intro_ar);
        if (data.services_intro_en) setIntroEn(data.services_intro_en);

        if (data.hasOwnProperty('church_services') && data.church_services !== undefined && data.church_services !== null) {
          try {
            const parsed = JSON.parse(data.church_services);
            if (Array.isArray(parsed)) {
              setMinistries(parsed);
              return;
            }
          } catch (e) {
            console.log(e);
          }
        }
        setMinistries(defaultMinistries);
      })
      .catch(err => {
        console.log(err);
        setMinistries(defaultMinistries);
      });
  }, []);

  return (
    <div className="container" style={{ padding: '3rem 1rem' }}>
      <h1 style={{ 
        textAlign: 'center', 
        fontSize: '2.2rem', 
        fontWeight: '800', 
        color: 'var(--accent-gold)',
        marginBottom: '1rem'
      }}>
        {language === 'ar' ? titleAr : titleEn}
      </h1>
      <p style={{ 
        textAlign: 'center', 
        color: 'var(--text-secondary)', 
        maxWidth: '600px', 
        margin: '0 auto 3rem auto',
        fontSize: '1rem',
        lineHeight: '1.6'
      }}>
        {language === 'ar' ? introAr : introEn}
      </p>

      {/* Grid */}
      <div className={styles.netflixGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {ministries.map(m => (
          <div key={m.slug} className={styles.ministryCard}>
            <div 
              className={styles.ministryBanner} 
              style={{ backgroundImage: `url(${m.image})` }}
            ></div>
            <div className={styles.ministryInfo}>
              <h3 className={styles.ministryName}>{language === 'ar' ? m.nameAr : m.nameEn}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '10px' }}>
                🕒 {language === 'ar' ? m.scheduleAr : m.scheduleEn}
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {language === 'ar' ? m.goalAr : m.goalEn}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
