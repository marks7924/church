'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../components/ThemeContext';
import styles from '../page.module.css'; // Reuse core landing page styles
import { Search, Plus, X, Video, ShieldAlert } from 'lucide-react';
import { API_URL } from '../../config';

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

export default function SermonsPage() {
  const { language, t } = useTheme();

  // Data States
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Filters
  const [priestFilter, setPriestFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');

  // Form State for upload/edit popup
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [priestNameAr, setPriestNameAr] = useState('القمص يوحنا كمال');
  const [priestNameEn, setPriestNameEn] = useState('Fr. John Kamal');
  const [topicAr, setTopicAr] = useState('روحيات');
  const [topicEn, setTopicEn] = useState('Spiritual');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [sermonDate, setSermonDate] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const fetchSermons = async () => {
    try {
      const res = await fetch(`${API_URL}/sermons`);
      if (res.ok) {
        const data = await res.json();
        setSermons(data);
      }
    } catch (err) {
      console.log('Error fetching sermons:', err);
    }
  };

  useEffect(() => {
    fetchSermons();

    // Check permissions
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('church-token');
      const userStr = localStorage.getItem('church-user');
      setToken(savedToken);
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (['SECRETARY', 'CHURCH_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            setIsAdmin(true);
          }
        } catch (e) {
          setIsAdmin(false);
        }
      }
    }
  }, []);

  const handleSaveSermon = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!token) return;

    const method = editingSermon ? 'PATCH' : 'POST';
    const url = editingSermon ? `${API_URL}/sermons/${editingSermon.id}` : `${API_URL}/sermons`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          titleAr,
          titleEn,
          priestNameAr,
          priestNameEn,
          topicAr,
          topicEn,
          date: sermonDate || new Date().toISOString(),
          youtubeUrl
        })
      });

      if (res.ok) {
        setMessage(editingSermon 
          ? (language === 'ar' ? 'تم تعديل العظة بنجاح!' : 'Sermon updated successfully!')
          : (language === 'ar' ? 'تم إضافة العظة ونشر الإشعارات بنجاح!' : 'Sermon created and push notifications sent!')
        );
        fetchSermons();
        setTimeout(() => {
          handleCloseModal();
        }, 1500);
      } else {
        const data = await res.json();
        setMessage(data.error || 'Error saving sermon.');
      }
    } catch (err) {
      setMessage('Failed to connect to server.');
    }
  };

  const handleEditClick = (sermon: Sermon) => {
    setEditingSermon(sermon);
    setTitleAr(sermon.titleAr);
    setTitleEn(sermon.titleEn);
    setPriestNameAr(sermon.priestNameAr);
    setPriestNameEn(sermon.priestNameEn);
    setTopicAr(sermon.topicAr);
    setTopicEn(sermon.topicEn);
    setYoutubeUrl(sermon.youtubeUrl);
    setSermonDate(sermon.date ? new Date(sermon.date).toISOString().split('T')[0] : '');
    setIsUploadOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه العظة نهائياً؟' : 'Are you sure you want to delete this sermon permanently?')) return;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/sermons/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchSermons();
      } else {
        alert(language === 'ar' ? 'فشل حذف العظة.' : 'Failed to delete sermon.');
      }
    } catch (err) {
      console.log('Error deleting sermon:', err);
    }
  };

  const handleCloseModal = () => {
    setIsUploadOpen(false);
    setEditingSermon(null);
    setTitleAr('');
    setTitleEn('');
    setPriestNameAr('القمص يوحنا كمال');
    setPriestNameEn('Fr. John Kamal');
    setTopicAr('روحيات');
    setTopicEn('Spiritual');
    setYoutubeUrl('');
    setSermonDate('');
    setMessage(null);
  };

  // Filter logic
  const filteredSermons = sermons.filter(s => {
    const matchesPriest = !priestFilter || 
      s.priestNameAr.includes(priestFilter) || 
      s.priestNameEn.toLowerCase().includes(priestFilter.toLowerCase());
    
    const matchesTopic = !topicFilter || 
      s.topicAr.includes(topicFilter) || 
      s.topicEn.toLowerCase().includes(topicFilter.toLowerCase());

    return matchesPriest && matchesTopic;
  });

  return (
    <div className="container" style={{ padding: '3rem 1rem' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2.1rem', color: 'var(--accent-gold)' }}>
          {t('nav_sermons')}
        </h1>

        {isAdmin && (
          <button 
            onClick={() => setIsUploadOpen(true)}
            style={{
              backgroundColor: 'var(--accent-gold)',
              color: '#000000',
              fontWeight: 'bold',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={18} />
            <span>{language === 'ar' ? 'رفع عظة جديدة' : 'Upload New Sermon'}</span>
          </button>
        )}
      </div>

      {/* Filters Area */}
      <div style={{
        display: 'flex',
        gap: '1.2rem',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        padding: '1.2rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {/* Priest select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
            {language === 'ar' ? 'بحث باسم الكاهن:' : 'Filter by Priest:'}
          </label>
          <select 
            value={priestFilter} 
            onChange={(e) => setPriestFilter(e.target.value)}
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', outline: 'none' }}
          >
            <option value="">{language === 'ar' ? 'جميع الآباء' : 'All Priests'}</option>
            <option value="يوحنا كمال">{language === 'ar' ? 'القمص يوحنا كمال' : 'Fr. John Kamal'}</option>
            <option value="اثناسيوس">{language === 'ar' ? 'الأنبا اثناسيوس' : 'Bishop Athanasius'}</option>
          </select>
        </div>

        {/* Topic select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
            {language === 'ar' ? 'بحث بالموضوع:' : 'Filter by Topic:'}
          </label>
          <select 
            value={topicFilter} 
            onChange={(e) => setTopicFilter(e.target.value)}
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', outline: 'none' }}
          >
            <option value="">{language === 'ar' ? 'جميع الموضوعات' : 'All Topics'}</option>
            <option value="الصلاة">{language === 'ar' ? 'حياة الصلاة' : 'Prayer Life'}</option>
            <option value="الأسرة">{language === 'ar' ? 'الأسرة المسيحية' : 'Family'}</option>
            <option value="الأسرار">{language === 'ar' ? 'الأسرار الكنسية' : 'Sacraments'}</option>
          </select>
        </div>
      </div>

      {/* Sermons Grid */}
      <div className={styles.netflixGrid}>
        {filteredSermons.length > 0 ? (
          filteredSermons.map(s => (
            <div key={s.id} className={styles.sermonCard} onClick={() => setActiveVideo(s.youtubeUrl)}>
              <div 
                className={styles.sermonThumbnail} 
                style={{ backgroundImage: `url(${s.thumbnailUrl || 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'})`, cursor: 'pointer' }}
              >
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                    ▶
                  </div>
                </div>
              </div>
              <div className={styles.sermonInfo}>
                <h3 className={styles.sermonTitle}>{language === 'ar' ? s.titleAr : s.titleEn}</h3>
                <div className={styles.sermonMeta}>
                  <span style={{ fontWeight: 'bold' }}>{language === 'ar' ? s.priestNameAr : s.priestNameEn}</span>
                  <span style={{ color: 'var(--accent-gold)' }}>{language === 'ar' ? s.topicAr : s.topicEn}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  📅 {new Date(s.date).toLocaleDateString()}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleEditClick(s)}
                      style={{ flex: 1, backgroundColor: 'var(--accent-gold)', color: '#000000', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(s.id)}
                      style={{ flex: 1, backgroundColor: '#ff4d4d', color: '#ffffff', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                      {language === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', gridColumn: 'span 4', color: 'var(--text-secondary)', padding: '3rem 0' }}>
            {language === 'ar' ? 'لا يوجد عظات تطابق فلاتر البحث.' : 'No sermons matches your filters.'}
          </p>
        )}
      </div>

      {/* Video Modal Player Popup */}
      {activeVideo && (
        <div className={styles.modalOverlay} onClick={() => setActiveVideo(null)}>
          <div className={styles.modalContent} style={{ maxWidth: '800px', padding: '1rem', backgroundColor: '#000000' }} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setActiveVideo(null)} style={{ color: '#ffffff', zIndex: 10 }}>
              <X size={20} />
            </button>
            <div className={styles.videoWrapper} style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`${activeVideo}?autoplay=1`}
                title="Sermon Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Upload Sermon Modal (Admins) */}
      {isUploadOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeBtn} onClick={handleCloseModal}>
              <X size={20} />
            </button>
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} />
              <span>
                {editingSermon 
                  ? (language === 'ar' ? 'تعديل العظة التعليمية' : 'Edit Sermon') 
                  : (language === 'ar' ? 'نشر عظة تعليمية جديدة' : 'Publish New Sermon')}
              </span>
            </h3>

            {message && <div style={{ padding: '8px', border: '1px solid var(--accent-gold)', fontSize: '0.8rem', color: 'var(--accent-gold)', marginBottom: '1rem', borderRadius: '4px' }}>{message}</div>}

            <form onSubmit={handleSaveSermon}>
              <div className={styles.formGroup}>
                <label>العنوان (عربي) *</label>
                <input type="text" required value={titleAr} onChange={e => setTitleAr(e.target.value)} className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <label>Title (English) *</label>
                <input type="text" required value={titleEn} onChange={e => setTitleEn(e.target.value)} className={styles.formInput} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className={styles.formGroup}>
                  <label>اسم الكاهن (عربي) *</label>
                  <input type="text" required value={priestNameAr} onChange={e => setPriestNameAr(e.target.value)} className={styles.formInput} />
                </div>
                <div className={styles.formGroup}>
                  <label>Priest Name (En) *</label>
                  <input type="text" required value={priestNameEn} onChange={e => setPriestNameEn(e.target.value)} className={styles.formInput} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className={styles.formGroup}>
                  <label>التصنيف/الموضوع (عربي) *</label>
                  <input type="text" required value={topicAr} onChange={e => setTopicAr(e.target.value)} className={styles.formInput} />
                </div>
                <div className={styles.formGroup}>
                  <label>Topic (En) *</label>
                  <input type="text" required value={topicEn} onChange={e => setTopicEn(e.target.value)} className={styles.formInput} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>رابط اليوتيوب (URL) *</label>
                <input type="url" required placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} className={styles.formInput} />
              </div>

              <div className={styles.formGroup}>
                <label>تاريخ إلقاء العظة (اختياري)</label>
                <input type="date" value={sermonDate} onChange={e => setSermonDate(e.target.value)} className={styles.formInput} />
              </div>

              <button type="submit" className={styles.bookBtn}>
                {t('submit')}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
