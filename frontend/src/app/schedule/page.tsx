'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../components/ThemeContext';
import { Calendar, Trash2, Plus, Filter, ShieldAlert } from 'lucide-react';
import { API_URL } from '../../config';

interface ScheduleItem {
  id: string;
  dayAr: string;
  dayEn: string;
  timeAr: string;
  timeEn: string;
  eventTypeAr: string;
  eventTypeEn: string;
}

export default function SchedulePage() {
  const { language, t } = useTheme();
  
  // Data State
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Filters
  const [dayFilter, setDayFilter] = useState('');
  
  // Form State for new Mass
  const [dayAr, setDayAr] = useState('الأحد');
  const [dayEn, setDayEn] = useState('Sunday');
  const [timeAr, setTimeAr] = useState('');
  const [timeEn, setTimeEn] = useState('');
  const [eventTypeAr, setEventTypeAr] = useState('');
  const [eventTypeEn, setEventTypeEn] = useState('');
  
  const [message, setMessage] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_URL}/events/schedule`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (err) {
      console.log('Error fetching schedule:', err);
    }
  };

  useEffect(() => {
    fetchSchedules();

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

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/events/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dayAr, dayEn, timeAr, timeEn, eventTypeAr, eventTypeEn })
      });

      if (res.ok) {
        setMessage(language === 'ar' ? 'تم إضافة موعد القداس بنجاح!' : 'Mass schedule added successfully!');
        fetchSchedules();
        // Clear fields
        setTimeAr('');
        setTimeEn('');
        setEventTypeAr('');
        setEventTypeEn('');
      } else {
        const data = await res.json();
        setMessage(data.error || 'Error saving schedule.');
      }
    } catch (err) {
      setMessage('Failed to connect to server.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!token || !window.confirm(language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this schedule?')) return;

    try {
      const res = await fetch(`${API_URL}/events/schedule/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchSchedules();
      }
    } catch (err) {
      console.log('Error deleting:', err);
    }
  };

  // Filter schedules list
  const filteredSchedules = schedules.filter(s => {
    if (!dayFilter) return true;
    return s.dayEn === dayFilter || s.dayAr === dayFilter;
  });

  const availableDays = [
    { ar: 'الأحد', en: 'Sunday' },
    { ar: 'الأربعاء', en: 'Wednesday' },
    { ar: 'الجمعة', en: 'Friday' },
    { ar: 'السبت', en: 'Saturday' }
  ];

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '900px' }}>
      <h1 style={{ 
        textAlign: 'center', 
        fontSize: '2.2rem', 
        fontWeight: '800', 
        color: 'var(--accent-gold)',
        marginBottom: '2rem'
      }}>
        {t('nav_schedule')}
      </h1>

      {/* Filter and Content layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Filter Widget */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          padding: '1rem',
          borderRadius: '6px'
        }}>
          <Filter size={18} style={{ color: 'var(--accent-gold)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
            {language === 'ar' ? 'تصفية حسب اليوم:' : 'Filter by Day:'}
          </span>
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">{language === 'ar' ? 'جميع الأيام' : 'All Days'}</option>
            {availableDays.map(d => (
              <option key={d.en} value={language === 'ar' ? d.ar : d.en}>
                {language === 'ar' ? d.ar : d.en}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule Table */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'start',
            fontSize: '0.95rem'
          }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-card)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '15px', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{language === 'ar' ? 'اليوم' : 'Day'}</th>
                <th style={{ padding: '15px', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{language === 'ar' ? 'الميعاد' : 'Time'}</th>
                <th style={{ padding: '15px', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{language === 'ar' ? 'المناسبة / الخدمة' : 'Service Type'}</th>
                {isAdmin && <th style={{ padding: '15px', color: 'var(--accent-gold)', fontWeight: 'bold', width: '80px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.length > 0 ? (
                filteredSchedules.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }}>
                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{language === 'ar' ? item.dayAr : item.dayEn}</td>
                    <td style={{ padding: '15px' }}>{language === 'ar' ? item.timeAr : item.timeEn}</td>
                    <td style={{ padding: '15px' }}>{language === 'ar' ? item.eventTypeAr : item.eventTypeEn}</td>
                    {isAdmin && (
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteSchedule(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ff4d4d',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {language === 'ar' ? 'لا يوجد قداسات مسجلة حالياً.' : 'No liturgies scheduled.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Admin Form: Add new schedule */}
        {isAdmin && (
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px dashed var(--accent-gold)',
            borderRadius: '8px',
            padding: '2rem'
          }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              color: 'var(--accent-gold)', 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Plus size={18} />
              <span>{language === 'ar' ? 'إضافة موعد قداس جديد (لوحة سكرتارية)' : 'Add New Mass Schedule (Admin Panel)'}</span>
            </h3>

            {message && (
              <div style={{
                backgroundColor: 'rgba(226, 183, 20, 0.05)',
                border: '1px solid var(--accent-gold)',
                color: 'var(--accent-gold)',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                {message}
              </div>
            )}

            <form onSubmit={handleAddSchedule} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.2rem'
            }}>
              {/* Day Ar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>اليوم (عربي)</label>
                <select
                  value={dayAr}
                  onChange={(e) => {
                    setDayAr(e.target.value);
                    const matching = availableDays.find(d => d.ar === e.target.value);
                    if (matching) setDayEn(matching.en);
                  }}
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                >
                  {availableDays.map(d => <option key={d.ar} value={d.ar}>{d.ar}</option>)}
                </select>
              </div>

              {/* Day En */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Day (English)</label>
                <select
                  value={dayEn}
                  onChange={(e) => {
                    setDayEn(e.target.value);
                    const matching = availableDays.find(d => d.en === e.target.value);
                    if (matching) setDayAr(matching.ar);
                  }}
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                >
                  {availableDays.map(d => <option key={d.en} value={d.en}>{d.en}</option>)}
                </select>
              </div>

              {/* Time Ar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>الوقت (عربي) - مثال: 6:00 ص - 8:00 ص</label>
                <input
                  type="text"
                  required
                  placeholder="6:00 ص - 8:00 ص"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                  value={timeAr}
                  onChange={(e) => setTimeAr(e.target.value)}
                />
              </div>

              {/* Time En */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Time (English) - Ex: 6:00 AM - 8:00 AM</label>
                <input
                  type="text"
                  required
                  placeholder="6:00 AM - 8:00 AM"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                  value={timeEn}
                  onChange={(e) => setTimeEn(e.target.value)}
                />
              </div>

              {/* Event Type Ar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 1' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>اسم القداس (عربي)</label>
                <input
                  type="text"
                  required
                  placeholder="القداس الأول (شعب)"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                  value={eventTypeAr}
                  onChange={(e) => setEventTypeAr(e.target.value)}
                />
              </div>

              {/* Event Type En */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 1' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Liturgy Type (English)</label>
                <input
                  type="text"
                  required
                  placeholder="First Liturgy (General)"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                  value={eventTypeEn}
                  onChange={(e) => setEventTypeEn(e.target.value)}
                />
              </div>

              <button type="submit" style={{
                gridColumn: 'span 1',
                alignSelf: 'end',
                backgroundColor: 'var(--accent-gold)',
                color: '#000000',
                fontWeight: 'bold',
                border: 'none',
                padding: '12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}>
                {t('submit')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
