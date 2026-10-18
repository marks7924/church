'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../components/ThemeContext';
import styles from '../page.module.css';
import { API_URL } from '../../config';
import { X, Calendar, MapPin, Users, BookOpen, Music, Compass, Mic, HeartHandshake, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ServiceStage {
  stageNameAr: string;
  stageNameEn: string;
  scheduleAr: string;
  scheduleEn: string;
  locationAr?: string;
  locationEn?: string;
}

export interface ChurchService {
  id: string;
  category: 'تربية كنسية' | 'ألحان' | 'كشافة' | 'كورال' | 'أخرى' | string;
  nameAr: string;
  nameEn: string;
  summaryAr: string;
  summaryEn: string;
  image: string;
  stages: ServiceStage[];
}

export const defaultChurchServices: ChurchService[] = [
  {
    id: 'sunday-school',
    category: 'تربية كنسية',
    nameAr: 'خدمة التربية الكنسية (مدارس الأحد)',
    nameEn: 'Sunday School (Christian Education)',
    summaryAr: 'تنشئة وتربية أولادنا وبناتنا على تعاليم الإنجيل وروح المحبة الكنسية والأرثوذكسية وتنمية شخصيتهم الروحية والإنسانية.',
    summaryEn: 'Nurturing our children on Gospel teachings, Orthodox faith, and Christian love, building their spiritual and personal growth.',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=600',
    stages: [
      {
        stageNameAr: 'مرحلة حضانة (بيبي كلاس وبستان)',
        stageNameEn: 'Nursery (Baby Class & Kindergarten)',
        scheduleAr: 'كل جمعة عقب القداس الثاني الساعة 10:30 صباحاً',
        scheduleEn: 'Every Friday after 2nd Liturgy at 10:30 AM',
        locationAr: 'مبنى الخدمات - الدور الأول',
        locationEn: 'Services Building - 1st Floor'
      },
      {
        stageNameAr: 'مرحلة ابتدائي (من أولى حتى سادسة)',
        stageNameEn: 'Primary School (Grades 1-6)',
        scheduleAr: 'كل جمعة الساعة 10:30 صباحاً',
        scheduleEn: 'Every Friday at 10:30 AM',
        locationAr: 'قاعات مبنى مارمينا',
        locationEn: 'St. Mina Building Halls'
      },
      {
        stageNameAr: 'مرحلة إعدادي (بنين وبنات)',
        stageNameEn: 'Preparatory School (Grades 7-9)',
        scheduleAr: 'كل جمعة الساعة 10:30 صباحاً',
        scheduleEn: 'Every Friday at 10:30 AM',
        locationAr: 'المدرج الكبير بالدور الثالث',
        locationEn: 'Main Lecture Hall - 3rd Floor'
      },
      {
        stageNameAr: 'مرحلة ثانوي',
        stageNameEn: 'Secondary School (Grades 10-12)',
        scheduleAr: 'كل جمعة الساعة 10:30 صباحاً',
        scheduleEn: 'Every Friday at 10:30 AM',
        locationAr: 'قاعة الشهداء بالدور الأرضي',
        locationEn: 'Martyrs Hall - Ground Floor'
      },
      {
        stageNameAr: 'اجتماع شباب جامعة وخريجين',
        stageNameEn: 'Youth & University Graduates',
        scheduleAr: 'كل خميس الساعة 7:00 مساءً',
        scheduleEn: 'Every Thursday at 7:00 PM',
        locationAr: 'الكنيسة الكبرى',
        locationEn: 'Main Cathedral'
      }
    ]
  },
  {
    id: 'hymns',
    category: 'ألحان',
    nameAr: 'مدرسة الشمامسة وتعليم الألحان والتسبحة',
    nameEn: 'Coptic Hymns & Deacons School',
    summaryAr: 'تعليم طقس الكنيسة والألحان القبطية الأصيلة والتسبحة وتأهيل الشمامسة للمشاركة الواعية في صلوات القداسات الإلهية.',
    summaryEn: 'Teaching Coptic rites, authentic hymns, and praise, preparing deacons for conscious participation in Divine Liturgies.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600',
    stages: [
      {
        stageNameAr: 'مستوى تمهيدي وبراعم (أبصالتوس)',
        stageNameEn: 'Beginners & Children (Psaltos)',
        scheduleAr: 'كل سبت الساعة 4:00 مساءً',
        scheduleEn: 'Every Saturday at 4:00 PM',
        locationAr: 'قاعة الألحان الملحقة',
        locationEn: 'Hymns Annex Hall'
      },
      {
        stageNameAr: 'مستوى إعدادي وابتدائي متقدم (أناغنوستيس)',
        stageNameEn: 'Intermediate Level (Anagnostis)',
        scheduleAr: 'كل سبت الساعة 5:30 مساءً',
        scheduleEn: 'Every Saturday at 5:30 PM',
        locationAr: 'قاعة الألحان الكبرى',
        locationEn: 'Main Hymns Auditorium'
      },
      {
        stageNameAr: 'مستوى متقدم وكبار (إيبودياكون وشماسة كاملة)',
        stageNameEn: 'Advanced & Adults (Subdeacon)',
        scheduleAr: 'كل أربعاء الساعة 6:30 مساءً',
        scheduleEn: 'Every Wednesday at 6:30 PM',
        locationAr: 'هيكل الكنيسة الكبرى',
        locationEn: 'Main Sanctuary'
      }
    ]
  },
  {
    id: 'scouts',
    category: 'كشافة',
    nameAr: 'مجموعة الكشافة والمرشدات الكنسية',
    nameEn: 'Church Scouts & Girl Guides',
    summaryAr: 'بناء الشخصية وتعلم المهارات الكشفية والانضباط والخدمة العامة والعمل الجماعي وتنظيم المعسكرات الخلوية والتخييم.',
    summaryEn: 'Character building, outdoor scouting skills, discipline, public community service, team collaboration, and campcraft.',
    image: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=600',
    stages: [
      {
        stageNameAr: 'مرحلة البراعم والأشبال (أطفال)',
        stageNameEn: 'Cubs & Young Scouts',
        scheduleAr: 'كل جمعة الساعة 2:00 ظهراً',
        scheduleEn: 'Every Friday at 2:00 PM',
        locationAr: 'فناء الكنيسة ومقر الكشافة',
        locationEn: 'Church Courtyard & Scout Den'
      },
      {
        stageNameAr: 'فوج الكشافة والمرشدات (إعدادي وثانوي)',
        stageNameEn: 'Scouts & Girl Guides (Teens)',
        scheduleAr: 'كل جمعة الساعة 4:00 عصراً',
        scheduleEn: 'Every Friday at 4:00 PM',
        locationAr: 'الملعب الرياضي ومقر الأنشطة',
        locationEn: 'Sports Court & Activities Center'
      },
      {
        stageNameAr: 'عشيرة الجوالة والرواد والقادة',
        stageNameEn: 'Rovers & Scout Leaders',
        scheduleAr: 'كل سبت الساعة 6:00 مساءً',
        scheduleEn: 'Every Saturday at 6:00 PM',
        locationAr: 'قاعة الاجتماعات الكشفية',
        locationEn: 'Scout Conference Room'
      }
    ]
  },
  {
    id: 'choir',
    category: 'كورال',
    nameAr: 'كورال الكنيسة والترانيم الروحية',
    nameEn: 'Church Choir & Spiritual Melodies',
    summaryAr: 'تدريب وتطوير الأصوات والأداء الكورالي الجماعي وتقديم الترانيم الروحية والمشاركة في احتفالات الأعياد والمناسبات.',
    summaryEn: 'Vocal training, ensemble singing, performing spiritual hymns, and ministering during feast celebrations and church events.',
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600',
    stages: [
      {
        stageNameAr: 'كورال الأطفال (براعم الملائكة)',
        stageNameEn: 'Children Choir',
        scheduleAr: 'كل أحد الساعة 5:00 مساءً',
        scheduleEn: 'Every Sunday at 5:00 PM',
        locationAr: 'مسرح الكنيسة بالدور الأرضي',
        locationEn: 'Auditorium - Ground Floor'
      },
      {
        stageNameAr: 'كورال الشباب (إعدادي وثانوي)',
        stageNameEn: 'Youth Choir (Teens)',
        scheduleAr: 'كل أحد الساعة 6:30 مساءً',
        scheduleEn: 'Every Sunday at 6:30 PM',
        locationAr: 'قاعة الصوتيات والموسيقى',
        locationEn: 'Acoustics & Music Room'
      },
      {
        stageNameAr: 'كورال الكبار والجامعيين',
        stageNameEn: 'Adults & University Choir',
        scheduleAr: 'كل ثلاثاء الساعة 7:00 مساءً',
        scheduleEn: 'Every Tuesday at 7:00 PM',
        locationAr: 'المسرح الكبير',
        locationEn: 'Main Auditorium'
      }
    ]
  },
  {
    id: 'other',
    category: 'أخرى',
    nameAr: 'خدمات التنمية والرعاية وأخوة الرب',
    nameEn: 'Community Care & Mercy Ministry',
    summaryAr: 'تقديم الدعم الاجتماعي والطبي والتعليمي والمساندة المادية والمعنوية للأسر الأولى بالرعاية كشهادة حية لمحبة المسيح.',
    summaryEn: 'Providing social, medical, educational, and financial assistance to underprivileged families as living witness of Christian love.',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=600',
    stages: [
      {
        stageNameAr: 'مكتب الرعاية الاجتماعية والمساعدات',
        stageNameEn: 'Social Aid & Assistance Office',
        scheduleAr: 'يومياً عدا الأحد من الساعة 5:00 م حتى 8:00 م',
        scheduleEn: 'Daily except Sunday from 5:00 PM to 8:00 PM',
        locationAr: 'مكتب خدمة أخوة الرب بالدور الأرضي',
        locationEn: 'Social Service Office - Ground Floor'
      },
      {
        stageNameAr: 'العيادات التخصصية وخدمة المرضى',
        stageNameEn: 'Specialized Clinics & Patient Care',
        scheduleAr: 'أيام السبت، الإثنين، والأربعاء من 6:00 م حتى 9:00 م',
        scheduleEn: 'Saturday, Monday, Wednesday 6:00 PM - 9:00 PM',
        locationAr: 'المركز الطبي الملحق بالكنيسة',
        locationEn: 'Church Medical Center'
      }
    ]
  }
];

export default function MinistriesPage() {
  const { language, t } = useTheme();

  const [services, setServices] = useState<ChurchService[]>(defaultChurchServices);
  const [selectedService, setSelectedService] = useState<ChurchService | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
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

        if (data.hasOwnProperty('church_services') && data.church_services) {
          try {
            const parsed = typeof data.church_services === 'string' ? JSON.parse(data.church_services) : data.church_services;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setServices(parsed);
              return;
            }
          } catch (e) {
            console.error('Error parsing church services:', e);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching services settings:', err);
      });
  }, []);

  const categories = [
    { key: 'all', nameAr: 'جميع الخدمات', nameEn: 'All Services', icon: Users },
    { key: 'تربية كنسية', nameAr: 'تربية كنسية', nameEn: 'Christian Education', icon: BookOpen },
    { key: 'ألحان', nameAr: 'ألحان', nameEn: 'Hymns', icon: Music },
    { key: 'كشافة', nameAr: 'كشافة', nameEn: 'Scouts', icon: Compass },
    { key: 'كورال', nameAr: 'كورال', nameEn: 'Choir', icon: Mic },
    { key: 'أخرى', nameAr: 'أخرى', nameEn: 'Other', icon: HeartHandshake }
  ];

  const filteredServices = activeCategory === 'all'
    ? services
    : services.filter(s => s.category === activeCategory || s.nameAr.includes(activeCategory));

  const getCategoryIcon = (cat: string) => {
    if (cat.includes('تربية')) return <BookOpen size={16} />;
    if (cat.includes('ألحان')) return <Music size={16} />;
    if (cat.includes('كشافة')) return <Compass size={16} />;
    if (cat.includes('كورال')) return <Mic size={16} />;
    return <HeartHandshake size={16} />;
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem' }}>
      <h1 style={{ 
        textAlign: 'center', 
        fontSize: '2.4rem', 
        fontWeight: '800', 
        color: 'var(--accent-gold)',
        marginBottom: '1rem'
      }}>
        {language === 'ar' ? titleAr : titleEn}
      </h1>
      <p style={{ 
        textAlign: 'center', 
        color: 'var(--text-secondary)', 
        maxWidth: '650px', 
        margin: '0 auto 2.5rem auto',
        fontSize: '1.05rem',
        lineHeight: '1.7'
      }}>
        {language === 'ar' ? introAr : introEn}
      </p>

      {/* Categories Filter Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '2.5rem'
      }}>
        {categories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isActive ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: isActive ? '#000000' : 'var(--text-primary)',
                border: `1px solid ${isActive ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                padding: '8px 16px',
                borderRadius: '30px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? '0 4px 12px rgba(226, 183, 20, 0.3)' : 'none'
              }}
            >
              <Icon size={16} />
              <span>{language === 'ar' ? cat.nameAr : cat.nameEn}</span>
            </button>
          );
        })}
      </div>

      {/* Services Grid (Cards) */}
      <div className={styles.netflixGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.8rem' }}>
        {filteredServices.map(s => (
          <div 
            key={s.id} 
            className={styles.sermonCard}
            style={{ 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '10px',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setSelectedService(s)}
          >
            {/* Service Banner Image */}
            <div 
              style={{ 
                height: '190px', 
                backgroundImage: `url(${s.image || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=600'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '12px',
                right: language === 'ar' ? '12px' : 'auto',
                left: language === 'en' ? '12px' : 'auto',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)',
                color: 'var(--accent-gold)',
                border: '1px solid var(--accent-gold)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {getCategoryIcon(s.category)}
                <span>{s.category}</span>
              </div>
            </div>

            {/* Service Card Info */}
            <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                {language === 'ar' ? s.nameAr : s.nameEn}
              </h3>

              {/* Summary */}
              <p style={{ 
                fontSize: '0.9rem', 
                color: 'var(--text-secondary)', 
                lineHeight: '1.6', 
                marginBottom: '1.2rem',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {language === 'ar' ? s.summaryAr : s.summaryEn}
              </p>

              {/* Stages count teaser */}
              <div style={{ 
                marginTop: 'auto',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                  {s.stages && s.stages.length > 0 
                    ? (language === 'ar' ? `📋 ${s.stages.length} مراحل / مواعيد` : `📋 ${s.stages.length} Stages`)
                    : (language === 'ar' ? 'تفاصيل المواعيد' : 'Schedule')}
                </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{language === 'ar' ? 'عرض التفاصيل' : 'View Details'}</span>
                  {language === 'ar' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal: Summary + Stage Details */}
      {selectedService && (
        <div 
          className={styles.modalOverlay} 
          onClick={() => setSelectedService(null)}
          style={{ zIndex: 100000 }}
        >
          <div 
            className={styles.modalContent} 
            style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '12px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Image Header */}
            <div style={{ 
              position: 'relative', 
              height: '220px', 
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(18,19,26,0.95) 100%), url(${selectedService.image || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=600'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '1.5rem'
            }}>
              <button 
                type="button" 
                onClick={() => setSelectedService(null)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid var(--border-color)',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  backgroundColor: 'var(--accent-gold)',
                  color: '#000000',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  {selectedService.category}
                </span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                {language === 'ar' ? selectedService.nameAr : selectedService.nameEn}
              </h2>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              
              {/* Section 1: Summary of Ministry */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                padding: '1.2rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <h4 style={{ color: 'var(--accent-gold)', marginBottom: '8px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📖</span>
                  <span>{language === 'ar' ? 'ملخص ورؤية الخدمة' : 'About this Ministry'}</span>
                </h4>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.7', whiteSpace: 'pre-line', margin: 0 }}>
                  {language === 'ar' ? selectedService.summaryAr : selectedService.summaryEn}
                </p>
              </div>

              {/* Section 2: Detailed Stages & Schedules */}
              <div>
                <h4 style={{ 
                  color: 'var(--accent-gold)', 
                  marginBottom: '1rem', 
                  fontSize: '1.1rem',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Calendar size={18} />
                  <span>{language === 'ar' ? 'تفاصيل المواعيد على حسب المراحل' : 'Stage Schedules & Timings'}</span>
                </h4>

                {selectedService.stages && selectedService.stages.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedService.stages.map((stg, idx) => (
                      <div 
                        key={idx}
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                          borderInlineStart: '4px solid var(--accent-gold)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {language === 'ar' ? stg.stageNameAr : stg.stageNameEn}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} />
                            <span>{language === 'ar' ? stg.scheduleAr : stg.scheduleEn}</span>
                          </div>
                        </div>

                        {(stg.locationAr || stg.locationEn) && (
                          <div style={{
                            backgroundColor: 'rgba(226, 183, 20, 0.08)',
                            border: '1px solid rgba(226, 183, 20, 0.2)',
                            color: 'var(--text-secondary)',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <MapPin size={13} style={{ color: 'var(--accent-gold)' }} />
                            <span>{language === 'ar' ? stg.locationAr : stg.locationEn}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                    {language === 'ar' ? 'المواعيد بالتنسيق مع خدام ومسؤولي الخدمة.' : 'Schedules by coordination with ministry leaders.'}
                  </p>
                )}
              </div>

              {/* Close Action */}
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className={styles.bookBtn}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
