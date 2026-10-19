'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../components/ThemeContext';
import styles from './page.module.css';
import { Play, Calendar, User, Heart, ShieldAlert, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '../config';
import { formatTimeSlot } from '../utils/format';

interface Priest {
  id: string;
  nameAr: string;
  nameEn: string;
  titleAr: string;
  titleEn: string;
  avatarUrl: string;
  role: string;
  availability: any;
  confessionStatus?: 'ACTIVE' | 'TRAVELING' | 'INACTIVE';
  confessionStatusNote?: string | null;
  noFixedSchedule?: boolean;
}

interface Sermon {
  id: string;
  titleAr: string;
  titleEn: string;
  priestNameAr: string;
  priestNameEn: string;
  topicAr: string;
  topicEn: string;
  date: string;
  youtubeUrl: string;
  thumbnailUrl: string;
}

interface ChurchEvent {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  type: string;
  date: string;
  locationAr: string;
  locationEn: string;
  price: number;
}

export default function Home() {
  const { language, t } = useTheme();
  
  // Data States
  const [priests, setPriests] = useState<Priest[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [liveStream, setLiveStream] = useState<{ isActive: boolean; youtubeLiveId: string; title?: string }>({ isActive: false, youtubeLiveId: '' });
  
  // Dynamic Image States
  const [imgHeroBg, setImgHeroBg] = useState<string>('');
  const [heroBgs, setHeroBgs] = useState<string[]>([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [historicPhotos, setHistoricPhotos] = useState<string[]>([]);

  interface NewsItem {
    id: string;
    content: string | null;
    imageUrl: string | null;
    originalPermalink?: string | null;
    createdAt: string;
    author: {
      fullName: string;
      role: string;
    };
  }
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // Booking Modal States
  const [selectedPriest, setSelectedPriest] = useState<Priest | null>(null);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [suggestions, setSuggestions] = useState<{ date: string; slots: string[] }[]>([]);
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bishop custom request states
  const [bishopPhone, setBishopPhone] = useState<string>('');
  const [bishopEmail, setBishopEmail] = useState<string>('');

  // Trip Booking Modal States
  const [selectedTrip, setSelectedTrip] = useState<ChurchEvent | null>(null);
  const [tripFullName, setTripFullName] = useState('');
  const [tripPhone, setTripPhone] = useState('');
  const [tripPaymentMethod, setTripPaymentMethod] = useState<'FULL' | 'INSTALLMENT'>('FULL');
  const [tripFirstInstallment, setTripFirstInstallment] = useState('');
  const [tripPaymentChannel, setTripPaymentChannel] = useState<'CASH' | 'INSTAPAY'>('CASH');
  const [tripReceiptImage, setTripReceiptImage] = useState<string>('');
  const [tripNotes, setTripNotes] = useState('');
  const [tripBookingMsg, setTripBookingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);

  useEffect(() => {
    // 1. Fetch live status
    fetch(`${API_URL}/live`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object' && !data.error) setLiveStream(data);
      })
      .catch(err => console.log('Error fetching live:', err));

    // 2. Fetch Priests
    fetch(`${API_URL}/bookings/priests`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const priestOrder = ['اثناسيوس', 'مينا عزت', 'فيلوباتير', 'يوحنا', 'كاراس', 'مايكل', 'موسى'];
          const sorted = [...data].sort((a, b) => {
            const getRank = (p: any) => {
              if (p.role === 'BISHOP' || p.nameAr?.includes('اثناسيوس')) return -100;
              for (let i = 0; i < priestOrder.length; i++) {
                if (p.nameAr?.includes(priestOrder[i]) || p.nameEn?.toLowerCase().includes(priestOrder[i].toLowerCase())) return i;
              }
              return 999;
            };
            return getRank(a) - getRank(b);
          });
          setPriests(sorted);
        }
      })
      .catch(err => console.log('Error fetching priests:', err));

    // 3. Fetch Sermons
    fetch(`${API_URL}/sermons`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSermons(data.slice(0, 4));
      })
      .catch(err => console.log('Error fetching sermons:', err));

    // 4. Fetch Events
    fetch(`${API_URL}/events`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEvents(data.filter((e: any) => e.type === 'TRIP' || e.type === 'CONFERENCE').slice(0, 3));
      })
      .catch(err => console.log('Error fetching events:', err));

    // 5. Fetch Global Settings
    fetch(`${API_URL}/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.img_hero_bgs) {
          try {
            const parsed = JSON.parse(data.img_hero_bgs);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setHeroBgs(parsed);
            }
          } catch (e) {
            const split = data.img_hero_bgs.split(',');
            if (split.length > 0 && split[0]) {
              setHeroBgs(split);
            }
          }
        }
        if (data.img_hero_bg) {
          setImgHeroBg(data.img_hero_bg);
          setHeroBgs(prev => prev.length === 0 ? [data.img_hero_bg] : prev);
        }
        const photos: string[] = [];
        if (data.img_historic_1 && data.img_historic_1.trim()) photos.push(data.img_historic_1);
        if (data.img_historic_2 && data.img_historic_2.trim()) photos.push(data.img_historic_2);
        if (data.img_historic_3 && data.img_historic_3.trim()) photos.push(data.img_historic_3);

        setHistoricPhotos(photos);
      })
      .catch(err => console.log('Error fetching settings:', err));

    // 6. Fetch news
    fetch(`${API_URL}/news`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNews(data);
      })
      .catch(err => console.log('Error fetching news:', err));
  }, []);

  // Cycle Hero backgrounds
  useEffect(() => {
    if (heroBgs.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBgIndex(prev => (prev + 1) % heroBgs.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroBgs]);

  // Fetch available slots when priest or date changes
  useEffect(() => {
    if (selectedPriest && bookingDate) {
      setAvailableSlots([]);
      setSuggestions([]);
      setBookingMessage(null);
      
      fetch(`${API_URL}/bookings/available-slots?priestId=${selectedPriest.id}&date=${bookingDate}`)
        .then(res => res.json())
        .then(data => {
          setAvailableSlots(data.slots || []);
          if (data.suggestions && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
          }
        })
        .catch(err => console.log('Error checking slots:', err));
    }
  }, [selectedPriest, bookingDate]);

  const openBookingModal = (priest: Priest) => {
    // If traveling or inactive, alert user
    if (priest.confessionStatus === 'TRAVELING') {
      alert(priest.confessionStatusNote || (language === 'ar' ? 'أبونا خارج مصر حالياً ولا يستقبل اعترافات.' : 'Father is currently traveling abroad and not accepting confessions.'));
      return;
    }
    if (priest.confessionStatus === 'INACTIVE') {
      alert(priest.confessionStatusNote || (language === 'ar' ? 'أبونا غير متاح لسر الاعتراف حالياً.' : 'Father is currently not available for confessions.'));
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('church-token');
    if (!token) {
      setBookingMessage({ type: 'error', text: language === 'ar' ? 'يرجى تسجيل الدخول أولاً لتتمكن من الحجز.' : 'Please login first to book an appointment.' });
      setSelectedPriest(priest);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setBookingDate(tomorrow.toISOString().split('T')[0]);
      return;
    }

    setSelectedPriest(priest);
    setBookingMessage(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);

    // Pre-populate details if booking with Bishop or noFixedSchedule
    const isCustomRequest = priest.role === 'BISHOP' || priest.noFixedSchedule;
    if (isCustomRequest) {
      const userStr = localStorage.getItem('church-user');
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          setBishopPhone(userObj.phone || '');
          setBishopEmail(userObj.email || '');
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const closeBookingModal = () => {
    setSelectedPriest(null);
    setBookingDate('');
    setAvailableSlots([]);
    setSelectedSlot('');
    setBookingNotes('');
    setSuggestions([]);
    setBookingMessage(null);
    setBishopPhone('');
    setBishopEmail('');
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCustomRequest = selectedPriest?.role === 'BISHOP' || selectedPriest?.noFixedSchedule;

    if (!isCustomRequest && !selectedSlot) {
      setBookingMessage({ type: 'error', text: language === 'ar' ? 'يرجى اختيار وقت متاح.' : 'Please select an available timeslot.' });
      return;
    }

    const token = localStorage.getItem('church-token');
    if (!token) {
      setBookingMessage({ type: 'error', text: language === 'ar' ? 'جلسة منتهية، يرجى إعادة تسجيل الدخول.' : 'Session expired, please login again.' });
      return;
    }

    // Format notes for Bishop / noFixedSchedule to include direct contact info
    let finalNotes = bookingNotes;
    let finalSlot = selectedSlot;
    if (isCustomRequest) {
      finalNotes = `Phone: ${bishopPhone}\nEmail: ${bishopEmail}\nNotes: ${bookingNotes}`;
      finalSlot = `REQUEST_${Date.now()}`;
    }

    try {
      const res = await fetch(`${API_URL}/bookings/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          priestId: selectedPriest?.id,
          date: bookingDate,
          timeSlot: finalSlot,
          notes: finalNotes
        })
      });

      const result = await res.json();
      if (res.ok) {
        setBookingMessage({
          type: 'success',
          text: isCustomRequest 
            ? (language === 'ar' ? 'تم تقديم طلب اللقاء بنجاح! سيتم التواصل معك قريباً.' : 'Meeting request submitted successfully! We will contact you soon.')
            : (language === 'ar' ? 'تم تقديم طلب الحجز بنجاح! سيتم إخطارك بالرد.' : 'Booking request submitted successfully! You will be notified of updates.')
        });
        if (!isCustomRequest) {
          setAvailableSlots(prev => prev.filter(s => s !== selectedSlot));
        }
      } else {
        setBookingMessage({ type: 'error', text: result.error || 'Failed to submit booking.' });
      }
    } catch (err) {
      setBookingMessage({ type: 'error', text: 'Error connecting to server.' });
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(language === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت' : 'Image size must not exceed 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTripReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBookTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) return;
    if (!tripFullName || !tripPhone) {
      setTripBookingMsg({
        type: 'error',
        text: language === 'ar' ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please provide full name and phone number'
      });
      return;
    }
    if (selectedTrip.price > 0 && tripPaymentMethod === 'INSTALLMENT' && !tripFirstInstallment) {
      setTripBookingMsg({
        type: 'error',
        text: language === 'ar' ? 'يرجى تحديد قيمة القسط الأول' : 'Please specify the first installment amount'
      });
      return;
    }
    if (selectedTrip.price > 0 && tripPaymentChannel === 'INSTAPAY' && !tripReceiptImage) {
      setTripBookingMsg({
        type: 'error',
        text: language === 'ar' ? 'يرجى إرفاق صورة إيصال تحويل إنستاباي' : 'Please attach the InstaPay receipt screenshot'
      });
      return;
    }

    setIsSubmittingTrip(true);
    setTripBookingMsg(null);
    try {
      const res = await fetch(`${API_URL}/events/${selectedTrip.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: tripFullName,
          phone: tripPhone,
          paymentMethod: tripPaymentMethod,
          firstInstallment: tripPaymentMethod === 'INSTALLMENT' ? tripFirstInstallment : null,
          paymentChannel: tripPaymentChannel,
          receiptImageUrl: tripPaymentChannel === 'INSTAPAY' ? tripReceiptImage : null,
          notes: tripNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTripBookingMsg({
          type: 'success',
          text: language === 'ar' ? 'تم تسجيل حجز الرحلة بنجاح! سيقوم مسؤول الرحلات بمراجعة طلبك والتواصل معك.' : 'Trip booking submitted successfully! The trip manager will review your booking and contact you.'
        });
        setTimeout(() => {
          setSelectedTrip(null);
          setTripFullName('');
          setTripPhone('');
          setTripPaymentMethod('FULL');
          setTripFirstInstallment('');
          setTripPaymentChannel('CASH');
          setTripReceiptImage('');
          setTripNotes('');
          setTripBookingMsg(null);
        }, 3000);
      } else {
        setTripBookingMsg({ type: 'error', text: data.error || 'Failed to submit trip booking.' });
      }
    } catch (err) {
      setTripBookingMsg({ type: 'error', text: 'Error connecting to server.' });
    } finally {
      setIsSubmittingTrip(false);
    }
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero Banner */}
      <header className={styles.hero}>
        {heroBgs.length > 0 ? (
          heroBgs.map((bg, idx) => (
            <div
              key={bg + idx}
              className={styles.heroBgSlide}
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(11, 12, 16, 0.4) 0%, rgba(11, 12, 16, 0.95) 100%), url(${bg})`,
                opacity: idx === currentBgIndex ? 1 : 0,
              }}
            ></div>
          ))
        ) : (
          <div
            className={styles.heroBgSlide}
            style={{
              backgroundImage: imgHeroBg ? `linear-gradient(180deg, rgba(11, 12, 16, 0.4) 0%, rgba(11, 12, 16, 0.95) 100%), url(${imgHeroBg})` : undefined,
              opacity: 1,
            }}
          ></div>
        )}
        <div className={styles.heroContent} style={{ zIndex: 2 }}>
          <h1 className={styles.heroTitle}>{t('hero_title')}</h1>
          <p className={styles.heroSubtitle}>{t('hero_subtitle')}</p>
        </div>
      </header>

      {/* Quick Navigation Cards */}
      <section className={styles.quickNavSection}>
        <div className={styles.quickNavGrid}>
          <Link href="/schedule" className={styles.quickNavCard}>
            <Calendar size={24} />
            <span>{t('nav_schedule')}</span>
          </Link>
          <a href="#live-section" className={styles.quickNavCard}>
            <Play size={24} />
            <span>{t('nav_live')}</span>
          </a>
          <Link href="/register-member" className={styles.quickNavCard}>
            <User size={24} />
            <span>{t('nav_membership')}</span>
          </Link>
          <a href="#priest-section" className={styles.quickNavCard}>
            <Heart size={24} />
            <span>{t('quick_nav')}</span>
          </a>
        </div>
      </section>

      <div className="container">
        {/* Live Stream Section (Only displays when active) */}
        {liveStream.isActive && (
          <section id="live-section" className={styles.liveContainer}>
            <div className={styles.liveHeader}>
              <h2 style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="pulse-live" style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent-red)', borderRadius: '50%' }}></span>
                <span>{t('live_now')}</span>
                {liveStream.title && (
                  <span style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 'normal', marginInlineStart: '10px', borderInlineStart: '2px solid var(--border-color)', paddingInlineStart: '10px' }}>
                    {liveStream.title}
                  </span>
                )}
              </h2>
            </div>
            <div className={styles.videoWrapper}>
              <iframe
                src={`https://www.youtube.com/embed/${liveStream.youtubeLiveId}?autoplay=1&mute=1`}
                title="Church Live Stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </section>
        )}

        {/* Church News Section */}
        {news.length > 0 && (
          <section className={styles.rowSection}>
            <h2 className={styles.rowTitle}>{language === 'ar' ? 'أخبار الكنيسة' : 'Church News'}</h2>
            <div className={styles.netflixGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {news.map(item => (
                <div key={item.id} className={`${styles.priestCard} netflix-card`} onClick={() => setSelectedNews(item)} style={{ textAlign: 'start', alignItems: 'stretch', gap: '0.8rem', cursor: 'pointer' }}>
                  {item.imageUrl && (
                    <div 
                      style={{ 
                        height: '180px', 
                        width: '100%', 
                        backgroundImage: `url(${item.imageUrl})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center',
                        borderRadius: '6px',
                        marginBottom: '10px'
                      }}
                    ></div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                      {item.content && item.content.length > 140 
                        ? `${item.content.substring(0, 140)}...` 
                        : item.content}
                    </p>
                    {item.content && item.content.length > 140 && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '10px' }}>
                        {language === 'ar' ? 'إقرأ المزيد ←' : 'Read More →'}
                      </span>
                    )}
                    <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>👤 {item.author.fullName}</span>
                      <span>📅 {new Date(item.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Priest Grid (Each has Book Confession button) */}
        <section id="priest-section" className={styles.rowSection}>
          <h2 className={styles.rowTitle}>{language === 'ar' ? 'الآباء الكهنة والأجلاء' : 'Reverend Fathers & Bishops'}</h2>
          <div className={styles.netflixGrid}>
            {priests.map(p => (
              <div key={p.id} className={styles.priestCard}>
                <div 
                  className={styles.priestAvatar} 
                  style={{ backgroundImage: `url(${p.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200'})` }}
                ></div>
                <h3 className={styles.priestTitle}>
                  {language === 'ar' ? `${p.titleAr} ${p.nameAr}` : `${p.titleEn} ${p.nameEn}`}
                </h3>
                <span className={styles.priestRole}>
                  {p.role === 'BISHOP' ? (language === 'ar' ? 'الاسقف العام لحدائق القبه' : 'General Bishop of Hadayek Al Koba') : (language === 'ar' ? 'كاهن الكنيسة' : 'Priest')}
                </span>
                <p className={styles.priestDays}>
                  <b>{language === 'ar' ? 'أيام التواجد:' : 'Available Days:'}</b><br />
                  {p.confessionStatus === 'TRAVELING' 
                    ? (p.confessionStatusNote || (language === 'ar' ? 'خارج مصر' : 'Traveling abroad'))
                    : p.confessionStatus === 'INACTIVE'
                    ? (p.confessionStatusNote || (language === 'ar' ? 'غير متاح للاعترافات حالياً' : 'Not available currently'))
                    : p.noFixedSchedule
                    ? (language === 'ar' ? 'مواعيد بالتنسيق المسبق' : 'By coordination')
                    : (p.availability && Object.keys(p.availability).length > 0 ? Object.keys(p.availability).join(', ') : (language === 'ar' ? 'مواعيد بالتنسيق' : 'By appointment'))}
                </p>
                {p.confessionStatus === 'TRAVELING' ? (
                  <button className={styles.bookBtn} style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#555' }} disabled>
                    ✈️ {language === 'ar' ? 'خارج مصر' : 'Traveling Abroad'}
                  </button>
                ) : p.confessionStatus === 'INACTIVE' ? (
                  <button className={styles.bookBtn} style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#555' }} disabled>
                    ⏸️ {language === 'ar' ? 'غير متاح للاعترافات' : 'Unavailable'}
                  </button>
                ) : (
                  <button className={styles.bookBtn} onClick={() => openBookingModal(p)}>
                    {p.role === 'BISHOP' ? t('meet_bishop') : (p.noFixedSchedule ? (language === 'ar' ? 'طلب ميعاد اعتراف' : 'Request Confession') : t('book_confession'))}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Latest Sermons (Netflix Grid) */}
        <section className={styles.rowSection}>
          <h2 className={styles.rowTitle}>{t('nav_sermons')}</h2>
          <div className={styles.netflixGrid}>
            {sermons.map(s => (
              <div key={s.id} className={styles.sermonCard} onClick={() => window.open(s.youtubeUrl, '_blank')}>
                <div 
                  className={styles.sermonThumbnail} 
                  style={{ backgroundImage: `url(${s.thumbnailUrl || 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'})` }}
                ></div>
                <div className={styles.sermonInfo}>
                  <h3 className={styles.sermonTitle}>{language === 'ar' ? s.titleAr : s.titleEn}</h3>
                  <div className={styles.sermonMeta}>
                    <span>{language === 'ar' ? s.priestNameAr : s.priestNameEn}</span>
                    <span>{s.topicAr}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Upcoming events / Activities */}
        <section className={styles.rowSection}>
          <h2 className={styles.rowTitle}>{language === 'ar' ? 'الرحلات والمؤتمرات الكنسية' : 'Trips & Church Conferences'}</h2>
          <div className={styles.netflixGrid}>
            {events.map(e => (
              <div key={e.id} className={styles.priestCard} style={{ textAlign: 'start', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '4px 8px', 
                    backgroundColor: 'rgba(226, 183, 20, 0.1)', 
                    color: 'var(--accent-gold)', 
                    borderRadius: '4px',
                    fontWeight: 'bold' 
                  }}>
                    {e.type}
                  </span>
                  {e.price > 0 && (
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
                      {e.price} {language === 'ar' ? 'ج.م' : 'EGP'}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
                  {language === 'ar' ? e.titleAr : e.titleEn}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4' }}>
                  {language === 'ar' ? e.descriptionAr : e.descriptionEn}
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 'auto', marginBottom: '12px' }}>
                  📅 {new Date(e.date).toLocaleDateString()} <br />
                  📍 {language === 'ar' ? e.locationAr : e.locationEn}
                </div>
                {(e.type === 'TRIP' || e.type === 'CONFERENCE') && (
                  <button 
                    className={styles.bookBtn} 
                    style={{ width: '100%', marginTop: 'auto' }}
                    onClick={() => {
                      setSelectedTrip(e);
                      setTripBookingMsg(null);
                      const userStr = typeof window !== 'undefined' ? localStorage.getItem('church-user') : null;
                      if (userStr) {
                        try {
                          const u = JSON.parse(userStr);
                          setTripFullName(u.fullName || '');
                          setTripPhone(u.phone || '');
                        } catch (err) {}
                      }
                    }}
                  >
                    🎫 {language === 'ar' ? 'حجز الرحلة / الاشتراك' : 'Register / Book Trip'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Historic Photos Gallery (Only if photos were uploaded in Dashboard) */}
        {historicPhotos.length > 0 && (
          <section className={styles.rowSection}>
            <h2 className={styles.rowTitle}>{t('photos')}</h2>
            <div className={styles.netflixGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
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
      </div>

      {/* Booking Modal */}
      {selectedPriest && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeBtn} onClick={closeBookingModal}>
              <X size={20} />
            </button>
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', fontSize: '1.3rem' }}>
              {t('booking_title')}
            </h3>
            
            <div style={{ marginBottom: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {selectedPriest.avatarUrl ? (
                <img src={selectedPriest.avatarUrl} alt={selectedPriest.nameAr} style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }} />
              ) : (
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'rgba(226, 183, 20, 0.1)', border: '2px dashed var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'var(--accent-gold)' }}>👤</div>
              )}
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>{language === 'ar' ? 'حجز موعد اعتراف مع:' : 'Booking Confession with:'}</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {language === 'ar' ? `${selectedPriest.titleAr} ${selectedPriest.nameAr}` : `${selectedPriest.titleEn} ${selectedPriest.nameEn}`}
                </strong>
              </div>
            </div>

            {bookingMessage && (
              <div style={{ 
                padding: '10px', 
                borderRadius: '4px', 
                marginBottom: '1rem', 
                fontSize: '0.85rem',
                backgroundColor: bookingMessage.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(229, 9, 20, 0.1)',
                border: `1px solid ${bookingMessage.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                color: bookingMessage.type === 'success' ? '#2ecc71' : '#ff4d4d',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={16} />
                <span>{bookingMessage.text}</span>
              </div>
            )}

            {/* Check if user logged in - only render form if we have token */}
            {typeof window !== 'undefined' && localStorage.getItem('church-token') ? (
              <form onSubmit={handleBookAppointment}>
                {(selectedPriest.role === 'BISHOP' || selectedPriest.noFixedSchedule) ? (
                  <>
                    {/* Bishop or Open Request Form Info */}
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.2rem', lineHeight: '1.5', padding: '10px', backgroundColor: 'rgba(226, 183, 20, 0.05)', borderRadius: '4px', border: '1px solid rgba(226, 183, 20, 0.2)' }}>
                      ℹ️ {selectedPriest.role === 'BISHOP'
                        ? (language === 'ar' 
                          ? 'نظراً لعدم وجود مواعيد محددة مسبقاً، يرجى تقديم طلبك وإدخال بيانات التواصل، وسيقوم مكتب سيدنا بالتواصل معك لتنسيق الميعاد (يتطلب عضوية كنسية معتمدة).' 
                          : 'Since there are no preset slots, please submit your request and contact details. The Bishop\'s office will contact you to coordinate (Requires approved membership).')
                        : (language === 'ar'
                          ? 'نظراً لعدم وجود مواعيد ثابتة محددة، يرجى إدخال التاريخ المفضل وبيانات التواصل، وسيقوم أبونا بالتواصل لتحديد وتأكيد الميعاد.'
                          : 'Since there are no fixed slots, please provide your preferred date and contact info, and Father will contact you to confirm the appointment.')}
                    </div>

                    {/* Select Preferred Date */}
                    <div className={styles.formGroup}>
                      <label>{language === 'ar' ? 'التاريخ المفضل للقاء' : 'Preferred Meeting Date'}</label>
                      <input
                        type="date"
                        className={styles.formInput}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        required
                      />
                    </div>

                    {/* Phone Number input */}
                    <div className={styles.formGroup}>
                      <label>{language === 'ar' ? 'رقم الهاتف للتواصل *' : 'Contact Phone Number *'}</label>
                      <input
                        type="tel"
                        className={styles.formInput}
                        value={bishopPhone}
                        onChange={(e) => setBishopPhone(e.target.value)}
                        required
                        placeholder="e.g. 01xxxxxxxxx"
                      />
                    </div>

                    {/* Email input */}
                    <div className={styles.formGroup}>
                      <label>{language === 'ar' ? 'البريد الإلكتروني *' : 'Contact Email *'}</label>
                      <input
                        type="email"
                        className={styles.formInput}
                        value={bishopEmail}
                        onChange={(e) => setBishopEmail(e.target.value)}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Select Date */}
                    <div className={styles.formGroup}>
                      <label>{t('select_date')}</label>
                      <input
                        type="date"
                        className={styles.formInput}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        required
                      />
                    </div>

                    {/* Available Slots */}
                    <div className={styles.formGroup}>
                      <label>{t('select_slot')}</label>
                      {availableSlots.length > 0 ? (
                        <div className={styles.slotsGrid}>
                          {availableSlots.map(slot => (
                            <div
                              key={slot}
                              className={`${styles.slotItem} ${selectedSlot === slot ? styles.selectedSlot : ''}`}
                              onClick={() => setSelectedSlot(slot)}
                            >
                              {formatTimeSlot(slot, language)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {bookingDate ? t('no_slots') : (language === 'ar' ? 'يرجى اختيار تاريخ أولاً' : 'Please select a date first')}
                        </p>
                      )}
                    </div>

                    {/* Suggestions logic */}
                    {suggestions.length > 0 && (
                      <div className={styles.suggestionBox}>
                        <div className={styles.suggestionTitle}>{t('suggest_slots')}</div>
                        <div className={styles.suggestionList}>
                          {suggestions.map(sugg => (
                            <div key={sugg.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span>{sugg.date}</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {sugg.slots.slice(0, 2).map(slot => (
                                  <button
                                    type="button"
                                    key={slot}
                                    onClick={() => {
                                      setBookingDate(sugg.date);
                                      setSelectedSlot(slot);
                                    }}
                                    style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '2px' }}
                                  >
                                    {formatTimeSlot(slot, language)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Notes (Shared field) */}
                <div className={styles.formGroup}>
                  <label>{(selectedPriest.role === 'BISHOP' || selectedPriest.noFixedSchedule) ? (language === 'ar' ? 'سبب اللقاء / تفاصيل إضافية' : 'Reason for Meeting / Additional Details') : t('booking_notes')}</label>
                  <textarea
                    className={styles.formInput}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    style={{ height: '80px', resize: 'vertical' }}
                    placeholder={(selectedPriest.role === 'BISHOP' || selectedPriest.noFixedSchedule) ? (language === 'ar' ? 'اكتب باختصار سبب طلب المقابلة...' : 'Briefly describe the purpose of the meeting...') : ''}
                  />
                </div>

                <button type="submit" className={styles.bookBtn} style={{ marginTop: '1rem', width: '100%' }}>
                  {(selectedPriest.role === 'BISHOP' || selectedPriest.noFixedSchedule) ? (language === 'ar' ? 'تقديم طلب اللقاء' : 'Submit Meeting Request') : t('confirm_booking')}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                  {language === 'ar' ? 'لتسجيل مواعيد سر الاعتراف والإرشاد، يجب إنشاء حساب شخصي أو تسجيل دخولك.' : 'To book confession or counseling sessions, you must create a personal account or login.'}
                </p>
                <Link href="/login" onClick={closeBookingModal} className={styles.bookBtn} style={{ display: 'inline-block', width: 'auto', padding: '10px 30px' }}>
                  {t('login')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trip Booking Modal */}
      {selectedTrip && (
        <div className={styles.modalOverlay} onClick={() => setSelectedTrip(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className={styles.closeBtn} onClick={() => setSelectedTrip(null)}>
              <X size={20} />
            </button>
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', fontSize: '1.3rem' }}>
              🎫 {language === 'ar' ? 'حجز الرحلة / الفعالية' : 'Book Trip / Event'}
            </h3>
            
            <div style={{ marginBottom: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {language === 'ar' ? selectedTrip.titleAr : selectedTrip.titleEn}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.85rem', color: 'var(--accent-gold)' }}>
                <span>📅 {new Date(selectedTrip.date).toLocaleDateString()}</span>
                <span>💰 {selectedTrip.price > 0 ? `${selectedTrip.price} ${language === 'ar' ? 'ج.م' : 'EGP'}` : (language === 'ar' ? 'مجاناً' : 'Free')}</span>
              </div>
            </div>

            {tripBookingMsg && (
              <div style={{ 
                padding: '10px 14px', 
                borderRadius: '6px', 
                marginBottom: '1rem', 
                fontSize: '0.9rem',
                backgroundColor: tripBookingMsg.type === 'success' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(229, 9, 20, 0.15)',
                border: `1px solid ${tripBookingMsg.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                color: tripBookingMsg.type === 'success' ? '#2ecc71' : '#ff4d4d',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={18} />
                <span>{tripBookingMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleBookTripSubmit}>
              {/* Full Name */}
              <div className={styles.formGroup}>
                <label>{language === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={tripFullName}
                  onChange={(e) => setTripFullName(e.target.value)}
                  required
                  placeholder={language === 'ar' ? 'الاسم رباعي' : 'Full Name'}
                />
              </div>

              {/* Phone */}
              <div className={styles.formGroup}>
                <label>{language === 'ar' ? 'رقم الهاتف (واتساب) *' : 'Phone (WhatsApp) *'}</label>
                <input
                  type="tel"
                  className={styles.formInput}
                  value={tripPhone}
                  onChange={(e) => setTripPhone(e.target.value)}
                  required
                  placeholder="01xxxxxxxxx"
                />
              </div>

              {selectedTrip.price > 0 && (
                <>
                  {/* Payment Method */}
                  <div className={styles.formGroup}>
                    <label>{language === 'ar' ? 'نظام الدفع *' : 'Payment Method *'}</label>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="tripPayMethod"
                          checked={tripPaymentMethod === 'FULL'}
                          onChange={() => setTripPaymentMethod('FULL')}
                        />
                        <span>{language === 'ar' ? 'دفع كامل المبلغ' : 'Full Payment'} ({selectedTrip.price} {language === 'ar' ? 'ج.م' : 'EGP'})</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="tripPayMethod"
                          checked={tripPaymentMethod === 'INSTALLMENT'}
                          onChange={() => setTripPaymentMethod('INSTALLMENT')}
                        />
                        <span>{language === 'ar' ? 'تقسيط' : 'Installments'}</span>
                      </label>
                    </div>
                  </div>

                  {/* If installment: specify first installment */}
                  {tripPaymentMethod === 'INSTALLMENT' && (
                    <div className={styles.formGroup} style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <label>{language === 'ar' ? 'قيمة القسط الأول (المقدم) بالجنيه *' : 'First Installment Amount (EGP) *'}</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedTrip.price}
                        className={styles.formInput}
                        value={tripFirstInstallment}
                        onChange={(e) => setTripFirstInstallment(e.target.value)}
                        required
                        placeholder={language === 'ar' ? 'مثال: 100' : 'e.g. 100'}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {language === 'ar' ? `المتبقي: ${selectedTrip.price - (Number(tripFirstInstallment) || 0)} ج.م تسدد لاحقاً` : `Remaining: ${selectedTrip.price - (Number(tripFirstInstallment) || 0)} EGP to pay later`}
                      </span>
                    </div>
                  )}

                  {/* Payment Channel */}
                  <div className={styles.formGroup}>
                    <label>{language === 'ar' ? 'طريقة وسداد الدفع *' : 'Payment Channel *'}</label>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="tripChannel"
                          checked={tripPaymentChannel === 'CASH'}
                          onChange={() => setTripPaymentChannel('CASH')}
                        />
                        <span>{language === 'ar' ? 'كاش لمسؤول الرحلات' : 'Cash to Trip Manager'}</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="tripChannel"
                          checked={tripPaymentChannel === 'INSTAPAY'}
                          onChange={() => setTripPaymentChannel('INSTAPAY')}
                        />
                        <span>InstaPay (إنستاباي)</span>
                      </label>
                    </div>
                  </div>

                  {/* If InstaPay: show details and receipt upload */}
                  {tripPaymentChannel === 'INSTAPAY' && (
                    <div style={{ backgroundColor: 'rgba(226, 183, 20, 0.08)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(226, 183, 20, 0.25)', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--accent-gold)', marginBottom: '6px', fontSize: '0.9rem' }}>
                        📲 {language === 'ar' ? 'بيانات التحويل عبر إنستاباي' : 'InstaPay Transfer Details'}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
                        {language === 'ar' 
                          ? 'يرجى تحويل المبلغ المطلوب إلى رقم مسؤول الرحلات: 01000000005 (أو العنوان: church@instapay)' 
                          : 'Please transfer the required amount to the Trip Manager phone: 01000000005 (or handle: church@instapay)'}
                      </p>
                      
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px' }}>
                        {language === 'ar' ? 'رفع صورة إيصال التحويل (سكرين شوت) *' : 'Upload Receipt Screenshot *'}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className={styles.formInput}
                        required={!tripReceiptImage}
                        style={{ padding: '6px' }}
                      />
                      {tripReceiptImage && (
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                          <img src={tripReceiptImage} alt="Receipt Preview" style={{ maxHeight: '120px', borderRadius: '4px', border: '1px solid var(--accent-gold)' }} />
                          <div style={{ fontSize: '0.75rem', color: '#2ecc71', marginTop: '2px' }}>✓ {language === 'ar' ? 'تم تجهيز صورة الإيصال' : 'Receipt attached'}</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Notes */}
              <div className={styles.formGroup}>
                <label>{language === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}</label>
                <textarea
                  className={styles.formInput}
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  style={{ height: '60px', resize: 'vertical' }}
                  placeholder={language === 'ar' ? 'أي رغبات خاصة أو تفاصيل للأفراد المرافقين...' : 'Any special requests or details of accompanying persons...'}
                />
              </div>

              <button 
                type="submit" 
                className={styles.bookBtn} 
                style={{ marginTop: '1rem', width: '100%', padding: '12px' }}
                disabled={isSubmittingTrip}
              >
                {isSubmittingTrip 
                  ? (language === 'ar' ? 'جاري إرسال الحجز...' : 'Submitting Booking...') 
                  : (language === 'ar' ? 'تأكيد إرسال طلب الحجز' : 'Confirm & Submit Booking')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* News Detail Modal */}
      {selectedNews && (
        <div className={styles.modalOverlay} onClick={() => setSelectedNews(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className={styles.closeBtn} onClick={() => setSelectedNews(null)}>
              <X size={20} />
            </button>
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', fontSize: '1.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              📰 {language === 'ar' ? 'تفاصيل الخبر' : 'News Details'}
            </h3>
            
            {selectedNews.imageUrl && (
              <div style={{ width: '100%', maxHeight: '400px', overflow: 'hidden', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <img src={selectedNews.imageUrl} alt="News Image" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
              </div>
            )}
            
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>👤 {selectedNews.author?.fullName}</span>
              <span>📅 {new Date(selectedNews.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
            </div>
            
            <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {selectedNews.content}
            </p>

            {selectedNews.originalPermalink && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <a
                  href={selectedNews.originalPermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#1877f2',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.92rem'
                  }}
                >
                  <span>{language === 'ar' ? 'عرض المنشور الأصلي المعتمد على فيسبوك ↗' : 'View original Facebook post ↗'}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
