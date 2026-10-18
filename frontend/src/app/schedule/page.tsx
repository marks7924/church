'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../components/ThemeContext';
import { Calendar as CalendarIcon, Trash2, Plus, Filter, ShieldAlert, Sparkles, BookOpen, Clock, MapPin, ChevronRight, ChevronLeft, Bell } from 'lucide-react';
import { API_URL } from '../../config';
import { getCopticDate, CopticDateInfo } from '../../utils/copticDate';

interface ScheduleItem {
  id: string;
  dayAr: string;
  dayEn: string;
  timeAr: string;
  timeEn: string;
  eventTypeAr: string;
  eventTypeEn: string;
}

interface EventItem {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  type: string;
  date: string;
  locationAr?: string;
  locationEn?: string;
  price?: number;
}

export default function SchedulePage() {
  const { language, t } = useTheme();
  
  // Navigation tabs: 'weekly' | 'occasions' | 'coptic-calendar'
  const [activeTab, setActiveTab] = useState<'weekly' | 'occasions' | 'coptic-calendar'>('weekly');

  // Liturgy Schedule state
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [occasions, setOccasions] = useState<EventItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Filters
  const [dayFilter, setDayFilter] = useState('');
  
  // Form State for regular Mass
  const [dayAr, setDayAr] = useState('الأحد');
  const [dayEn, setDayEn] = useState('Sunday');
  const [timeAr, setTimeAr] = useState('');
  const [timeEn, setTimeEn] = useState('');
  const [eventTypeAr, setEventTypeAr] = useState('');
  const [eventTypeEn, setEventTypeEn] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // Form State for Special Occasions
  const [occTitleAr, setOccTitleAr] = useState('');
  const [occTitleEn, setOccTitleEn] = useState('');
  const [occDescAr, setOccDescAr] = useState('');
  const [occDescEn, setOccDescEn] = useState('');
  const [occDate, setOccDate] = useState('');
  const [occTime, setOccTime] = useState('');
  const [occLocationAr, setOccLocationAr] = useState('');
  const [occType, setOccType] = useState('OCCASION'); // OCCASION, PASCHA, MASS, PRAYERS
  const [occMsg, setOccMsg] = useState<string | null>(null);

  // Coptic Calendar picker state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [copticDateInfo, setCopticDateInfo] = useState<CopticDateInfo>(() => getCopticDate(new Date()));

  // Fetch regular liturgy schedules
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

  // Fetch special occasions & feasts
  const fetchOccasions = async () => {
    try {
      const res = await fetch(`${API_URL}/events`);
      if (res.ok) {
        const data: EventItem[] = await res.json();
        // Filter occasions/feasts/pascha/mass
        const filtered = data.filter(e => ['OCCASION', 'FEAST', 'PASCHA', 'MASS', 'PRAYERS'].includes(e.type));
        setOccasions(filtered);
      }
    } catch (err) {
      console.log('Error fetching occasions:', err);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchOccasions();

    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('church-token');
      const userStr = localStorage.getItem('church-user');
      setToken(savedToken);
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (['SECRETARY', 'CHURCH_ADMIN', 'SUPER_ADMIN', 'DEVELOPER'].includes(user.role)) {
            setIsAdmin(true);
          }
        } catch (e) {
          setIsAdmin(false);
        }
      }
    }
  }, []);

  // Update Coptic info whenever selected date changes
  useEffect(() => {
    if (selectedCalendarDate) {
      const d = new Date(selectedCalendarDate);
      if (!isNaN(d.getTime())) {
        setCopticDateInfo(getCopticDate(d));
      }
    }
  }, [selectedCalendarDate]);

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

  // Add Special Occasion Handler
  const handleAddOccasion = async (e: React.FormEvent) => {
    e.preventDefault();
    setOccMsg(null);
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          titleAr: occTitleAr,
          titleEn: occTitleEn || occTitleAr,
          descriptionAr: occTime ? `${occTime} • ${occDescAr}` : occDescAr,
          descriptionEn: occTime ? `${occTime} • ${occDescEn || occDescAr}` : (occDescEn || occDescAr),
          type: occType,
          date: occDate,
          locationAr: occLocationAr || 'كنيسة الشهيد العظيم مارجرجس',
          locationEn: 'St. George Church'
        })
      });

      if (res.ok) {
        setOccMsg(language === 'ar' ? 'تم إضافة موعد المناسبة بنجاح!' : 'Occasion added successfully!');
        fetchOccasions();
        setOccTitleAr('');
        setOccTitleEn('');
        setOccDescAr('');
        setOccDescEn('');
        setOccDate('');
        setOccTime('');
        setOccLocationAr('');
      } else {
        const data = await res.json();
        setOccMsg(data.error || 'Error saving occasion.');
      }
    } catch (err) {
      setOccMsg('Failed to connect to server.');
    }
  };

  const handleDeleteOccasion = async (id: string) => {
    if (!token || !window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه المناسبة؟' : 'Are you sure you want to delete this occasion?')) return;
    try {
      const res = await fetch(`${API_URL}/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchOccasions();
      }
    } catch (err) {
      console.log('Error deleting occasion:', err);
    }
  };

  const availableDays = [
    { ar: 'الأحد', en: 'Sunday' },
    { ar: 'الإثنين', en: 'Monday' },
    { ar: 'الثلاثاء', en: 'Tuesday' },
    { ar: 'الأربعاء', en: 'Wednesday' },
    { ar: 'الخميس', en: 'Thursday' },
    { ar: 'الجمعة', en: 'Friday' },
    { ar: 'السبت', en: 'Saturday' }
  ];

  const filteredSchedules = schedules.filter(s => {
    if (!dayFilter) return true;
    return s.dayEn === dayFilter || s.dayAr === dayFilter;
  });

  // Calendar Day Navigation Helpers
  const shiftSelectedDay = (deltaDays: number) => {
    const current = new Date(selectedCalendarDate);
    current.setDate(current.getDate() + deltaDays);
    setSelectedCalendarDate(current.toISOString().split('T')[0]);
  };

  const setCalendarToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedCalendarDate(today);
  };

  // Find occasions and liturgies for selected calendar day
  const selectedDateObj = new Date(selectedCalendarDate);
  const selectedDateDayOfWeek = !isNaN(selectedDateObj.getTime()) ? selectedDateObj.getDay() : -1;
  const daysOfWeekAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const currentDayNameAr = selectedDateDayOfWeek >= 0 ? daysOfWeekAr[selectedDateDayOfWeek] : '';

  const occasionsOnSelectedDay = occasions.filter(o => {
    if (!o.date) return false;
    const occD = new Date(o.date).toISOString().split('T')[0];
    return occD === selectedCalendarDate;
  });

  const liturgiesOnSelectedDay = schedules.filter(s => {
    return s.dayAr === currentDayNameAr;
  });

  const getOccasionTypeBadge = (type: string) => {
    switch (type) {
      case 'PASCHA':
        return { label: language === 'ar' ? '✝️ بصخة مقدسة' : 'Holy Pascha', bg: 'rgba(155, 89, 182, 0.15)', color: '#9b59b6' };
      case 'FEAST':
        return { label: language === 'ar' ? '🌟 عيد كنسي' : 'Feast', bg: 'rgba(241, 196, 15, 0.15)', color: '#f1c40f' };
      case 'MASS':
        return { label: language === 'ar' ? '🕯️ قداس خاص' : 'Special Mass', bg: 'rgba(52, 152, 219, 0.15)', color: '#3498db' };
      case 'PRAYERS':
        return { label: language === 'ar' ? '🙏 صلوات وتسبحة' : 'Prayers & Praise', bg: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71' };
      default:
        return { label: language === 'ar' ? '📅 مناسبة خاصة' : 'Special Occasion', bg: 'rgba(226, 183, 20, 0.15)', color: 'var(--accent-gold)' };
    }
  };

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 3.5vw, 2.5rem) clamp(0.6rem, 2.5vw, 1.2rem)', maxWidth: '980px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Page Title */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%' }}>
        <h1 style={{ 
          fontSize: 'clamp(1.3rem, 5vw, 2.2rem)', 
          fontWeight: '800', 
          color: 'var(--accent-gold)',
          marginBottom: '0.6rem',
          lineHeight: 1.3,
          wordBreak: 'break-word'
        }}>
          {language === 'ar' ? 'مواعيد القداسات والمناسبات الكنسية' : 'Liturgies & Occasions Schedule'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.82rem, 2.8vw, 0.95rem)', lineHeight: 1.5, wordBreak: 'break-word', maxWidth: '650px', margin: '0 auto' }}>
          {language === 'ar' 
            ? 'مواعيد الصلوات الأسبوعية الثابتة، الأعياد والمناسبات، والتقويم القبطي التفاعلي'
            : 'Weekly mass timings, liturgical feasts, and interactive Coptic calendar'}
        </p>
      </div>

      {/* Navigation Tabs (Scrollable on mobile) */}
      <div className="schedule-tabs-container" style={{
        marginBottom: '1.8rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <button
          onClick={() => setActiveTab('weekly')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: activeTab === 'weekly' ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
            backgroundColor: activeTab === 'weekly' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
            color: activeTab === 'weekly' ? '#000000' : 'var(--text-primary)',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
        >
          <CalendarIcon size={16} />
          <span>{language === 'ar' ? 'مواعيد القداسات الثابتة' : 'Regular Liturgies'}</span>
        </button>

        <button
          onClick={() => setActiveTab('occasions')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: activeTab === 'occasions' ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
            backgroundColor: activeTab === 'occasions' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
            color: activeTab === 'occasions' ? '#000000' : 'var(--text-primary)',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
        >
          <Sparkles size={16} />
          <span>{language === 'ar' ? 'مواعيد المناسبات والأعياد' : 'Special Occasions & Feasts'}</span>
        </button>

        <button
          onClick={() => setActiveTab('coptic-calendar')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: activeTab === 'coptic-calendar' ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
            backgroundColor: activeTab === 'coptic-calendar' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
            color: activeTab === 'coptic-calendar' ? '#000000' : 'var(--text-primary)',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
        >
          <BookOpen size={16} />
          <span>{language === 'ar' ? 'التقويم القبطي والنتيجة' : 'Coptic Calendar'}</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: WEEKLY REGULAR LITURGIES */}
      {/* ======================================================== */}
      {activeTab === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          
          {/* Day Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            padding: '0.8rem 1rem',
            borderRadius: '6px',
            flexWrap: 'wrap',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} style={{ color: 'var(--accent-gold)' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 'bold' }}>
                {language === 'ar' ? 'تصفية حسب اليوم:' : 'Filter by Day:'}
              </span>
            </div>
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '8px 12px',
                borderRadius: '4px',
                outline: 'none',
                cursor: 'pointer',
                fontSize: '0.88rem',
                flex: '1 1 180px'
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

          {/* Desktop Table View (>= 769px) */}
          <div className="desktop-only-table" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            overflowX: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <table style={{
              width: '100%',
              minWidth: '500px',
              borderCollapse: 'collapse',
              textAlign: 'start',
              fontSize: '0.95rem'
            }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-card)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '14px', color: 'var(--accent-gold)', fontWeight: 'bold', width: '22%' }}>{language === 'ar' ? 'اليوم' : 'Day'}</th>
                  <th style={{ padding: '14px', color: 'var(--accent-gold)', fontWeight: 'bold', width: '38%' }}>{language === 'ar' ? 'الميعاد' : 'Time'}</th>
                  <th style={{ padding: '14px', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{language === 'ar' ? 'المناسبة / الخدمة' : 'Service Type'}</th>
                  {isAdmin && <th style={{ padding: '14px', color: 'var(--accent-gold)', fontWeight: 'bold', width: '60px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.length > 0 ? (
                  filteredSchedules.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }}>
                      <td style={{ padding: '14px', fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {language === 'ar' ? item.dayAr : item.dayEn}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          backgroundColor: 'rgba(226, 183, 20, 0.08)',
                          color: 'var(--accent-gold)',
                          border: '1px solid rgba(226, 183, 20, 0.25)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                          direction: 'ltr'
                        }}>
                          {language === 'ar' ? item.timeAr : item.timeEn}
                        </span>
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text-primary)' }}>
                        {language === 'ar' ? item.eventTypeAr : item.eventTypeEn}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteSchedule(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ff4d4d',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '4px'
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
                    <td colSpan={isAdmin ? 4 : 3} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {language === 'ar' ? 'لا يوجد قداسات مسجلة حالياً.' : 'No liturgies scheduled.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (< 769px) - Never overflows or cuts columns */}
          <div className="mobile-only-cards" style={{ width: '100%' }}>
            {filteredSchedules.length > 0 ? (
              filteredSchedules.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: 'var(--shadow-sm)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🕯️</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {language === 'ar' ? item.eventTypeAr : item.eventTypeEn}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteSchedule(item.id)}
                        style={{
                          background: 'none',
                          border: '1px solid rgba(255, 77, 77, 0.3)',
                          color: '#ff4d4d',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem'
                        }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                        <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                      </button>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {language === 'ar' ? 'اليوم: ' : 'Day: '}
                      <b style={{ color: 'var(--accent-gold)', fontSize: '1rem' }}>
                        {language === 'ar' ? item.dayAr : item.dayEn}
                      </b>
                    </div>

                    <span style={{
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                      backgroundColor: 'rgba(226, 183, 20, 0.12)',
                      color: 'var(--accent-gold)',
                      border: '1px solid var(--accent-gold)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      direction: 'ltr'
                    }}>
                      {language === 'ar' ? item.timeAr : item.timeEn}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                padding: '24px 15px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-secondary)'
              }}>
                {language === 'ar' ? 'لا يوجد قداسات مسجلة حالياً.' : 'No liturgies scheduled.'}
              </div>
            )}
          </div>

          {/* Admin Form: Add regular mass */}
          {isAdmin && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px dashed var(--accent-gold)',
              borderRadius: '8px',
              padding: 'clamp(1rem, 3vw, 1.8rem)'
            }}>
              <h3 style={{ 
                color: 'var(--accent-gold)', 
                marginBottom: '1rem', 
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Plus size={18} />
                <span>{language === 'ar' ? 'إضافة موعد قداس أسبوعي جديد' : 'Add New Liturgy Schedule'}</span>
              </h3>

              {message && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(226, 183, 20, 0.1)',
                  border: '1px solid var(--accent-gold)',
                  borderRadius: '4px',
                  color: 'var(--accent-gold)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  {message}
                </div>
              )}

              <form onSubmit={handleAddSchedule} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                gap: '1rem',
                alignItems: 'end'
              }}>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                  backgroundColor: 'var(--accent-gold)',
                  color: '#000000',
                  fontWeight: 'bold',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  height: '42px'
                }}>
                  {language === 'ar' ? 'حفظ موعد القداس' : 'Save Liturgy'}
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SPECIAL OCCASIONS, FEASTS & PASCHA */}
      {/* ======================================================== */}
      {activeTab === 'occasions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: 'clamp(1rem, 3vw, 1.8rem)'
          }}>
            <h3 style={{ 
              color: 'var(--accent-gold)', 
              marginBottom: '1rem', 
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Sparkles size={20} />
              <span>{language === 'ar' ? 'مواعيد المناسبات والأعياد الاستثنائية' : 'Special Liturgical Occasions & Feasts'}</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              {language === 'ar'
                ? 'تشمل مواعيد الأعياد الكبرى والصغرى، أسبوع الآلام، صلوات البصخات، القداسات الاستثنائية والعشيات.'
                : 'Includes major and minor feasts, Holy Week, Pascha prayers, and special liturgy schedules.'}
            </p>

            {/* List of Special Occasions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {occasions.length > 0 ? (
                occasions.map(occ => {
                  const badge = getOccasionTypeBadge(occ.type);
                  const formattedDate = new Date(occ.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });

                  return (
                    <div 
                      key={occ.id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: 'clamp(0.9rem, 2.5vw, 1.4rem)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        transition: 'border-color 0.2s ease'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 'min(100%, 250px)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: badge.bg,
                            color: badge.color
                          }}>
                            {badge.label}
                          </span>
                          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            {language === 'ar' ? occ.titleAr : occ.titleEn}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CalendarIcon size={14} style={{ color: 'var(--accent-gold)' }} />
                            <b>{formattedDate}</b>
                          </span>
                          {occ.locationAr && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={14} style={{ color: 'var(--accent-gold)' }} />
                              <span>{language === 'ar' ? occ.locationAr : occ.locationEn}</span>
                            </span>
                          )}
                        </div>

                        {occ.descriptionAr && (
                          <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '8px', lineHeight: '1.5' }}>
                            {language === 'ar' ? occ.descriptionAr : occ.descriptionEn}
                          </p>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteOccasion(occ.id)}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(255, 77, 77, 0.3)',
                            color: '#ff4d4d',
                            cursor: 'pointer',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={14} />
                          <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '6px'
                }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    {language === 'ar' 
                      ? 'لا توجد مناسبات استثنائية مسجلة حالياً. سيتم الإعلان عنها فور اعتمادها.' 
                      : 'No special occasions scheduled currently. They will appear here once announced.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Form: Add Special Occasion */}
          {isAdmin && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px dashed var(--accent-gold)',
              borderRadius: '8px',
              padding: 'clamp(1rem, 3vw, 1.8rem)'
            }}>
              <h3 style={{ 
                color: 'var(--accent-gold)', 
                marginBottom: '1rem', 
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Plus size={18} />
                <span>{language === 'ar' ? 'إضافة مناسبة أو عيد جديد للمواعيد' : 'Add New Occasion / Feast'}</span>
              </h3>

              {occMsg && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(226, 183, 20, 0.1)',
                  border: '1px solid var(--accent-gold)',
                  borderRadius: '4px',
                  color: 'var(--accent-gold)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  {occMsg}
                </div>
              )}

              <form onSubmit={handleAddOccasion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>اسم المناسبة / العيد (عربي) *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: قداس عيد القيامة المجيد"
                      value={occTitleAr}
                      onChange={e => setOccTitleAr(e.target.value)}
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Occasion Title (English)</label>
                    <input
                      type="text"
                      placeholder="Ex: Resurrection Feast Liturgy"
                      value={occTitleEn}
                      onChange={e => setOccTitleEn(e.target.value)}
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>نوع المناسبة *</label>
                    <select
                      value={occType}
                      onChange={e => setOccType(e.target.value)}
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                    >
                      <option value="OCCASION">مناسبة كنسية خاصة</option>
                      <option value="FEAST">عيد كنسي (سيدي أو تذكار)</option>
                      <option value="PASCHA">بصخة مقدسة (أسبوع الآلام)</option>
                      <option value="MASS">قداس استثنائي</option>
                      <option value="PRAYERS">صلوات وتسبحة</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>التاريخ *</label>
                    <input
                      type="date"
                      required
                      value={occDate}
                      onChange={e => setOccDate(e.target.value)}
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>الميعاد (من - إلى)</label>
                    <input
                      type="text"
                      placeholder="مثال: من 7:00 م حتى 12:00 منتصف الليل"
                      value={occTime}
                      onChange={e => setOccTime(e.target.value)}
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>المكان / المذبح</label>
                    <input
                      type="text"
                      placeholder="الكنيسة الكبرى - مذبح مارجرجس"
                      value={occLocationAr}
                      onChange={e => setOccLocationAr(e.target.value)}
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ملاحظات أو تفاصيل إضافية</label>
                  <textarea
                    rows={2}
                    placeholder="تفاصيل إضافية للشعب بخصوص الحضور أو الترتيبات..."
                    value={occDescAr}
                    onChange={e => setOccDescAr(e.target.value)}
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px', resize: 'vertical' }}
                  />
                </div>

                <button type="submit" style={{
                  backgroundColor: 'var(--accent-gold)',
                  color: '#000000',
                  fontWeight: 'bold',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: 'fit-content'
                }}>
                  {language === 'ar' ? 'حفظ المناسبة' : 'Save Occasion'}
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: COPTIC CALENDAR & INTERACTIVE DATE LOOKUP */}
      {/* ======================================================== */}
      {activeTab === 'coptic-calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Calendar Picker Panel */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: 'clamp(1.2rem, 3.5vw, 2rem)',
            boxShadow: 'var(--shadow-md)'
          }}>
            
            {/* Header with Title & Date Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '1.2rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <h3 style={{
                  color: 'var(--accent-gold)',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <BookOpen size={22} />
                  <span>{language === 'ar' ? 'التقويم القبطي والبحث اليومي' : 'Coptic Calendar & Daily Schedule'}</span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {language === 'ar' 
                    ? 'اختر أي تاريخ لعرض اليوم القبطي ومواعيد القداسات أو البصخات والصلوات المقررة' 
                    : 'Select any date to view the Coptic date and scheduled liturgies or prayers'}
                </p>
              </div>

              {/* Quick Today Button */}
              <button
                type="button"
                onClick={setCalendarToToday}
                style={{
                  backgroundColor: 'rgba(226, 183, 20, 0.1)',
                  color: 'var(--accent-gold)',
                  border: '1px solid var(--accent-gold)',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {language === 'ar' ? 'الذهاب لليوم' : 'Today'}
              </button>
            </div>

            {/* Date Selector Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '1.8rem'
            }}>
              <button
                type="button"
                onClick={() => shiftSelectedDay(-1)}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.85rem'
                }}
                title={language === 'ar' ? 'اليوم السابق' : 'Previous Day'}
              >
                <ChevronRight size={18} />
                <span>{language === 'ar' ? 'السابق' : 'Prev'}</span>
              </button>

              <input
                type="date"
                value={selectedCalendarDate}
                onChange={e => setSelectedCalendarDate(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--accent-gold)',
                  color: 'var(--text-primary)',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />

              <button
                type="button"
                onClick={() => shiftSelectedDay(1)}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.85rem'
                }}
                title={language === 'ar' ? 'اليوم التالي' : 'Next Day'}
              >
                <span>{language === 'ar' ? 'التالي' : 'Next'}</span>
                <ChevronLeft size={18} />
              </button>
            </div>

            {/* Prominent Coptic + Gregorian Date Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(226, 183, 20, 0.12) 0%, rgba(226, 183, 20, 0.03) 100%)',
              border: '1px solid var(--accent-gold)',
              borderRadius: '8px',
              padding: 'clamp(1rem, 3vw, 1.5rem)',
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                📅 {new Date(selectedCalendarDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div style={{
                fontSize: 'clamp(1.3rem, 4.5vw, 1.8rem)',
                fontWeight: '900',
                color: 'var(--accent-gold)',
                letterSpacing: '0.5px',
                marginTop: '4px'
              }}>
                📜 {language === 'ar' ? copticDateInfo.formattedAr : copticDateInfo.formattedEn}
              </div>
            </div>

            {/* Results Section for Selected Date */}
            <div>
              <h4 style={{
                fontSize: '1.05rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Clock size={18} style={{ color: 'var(--accent-gold)' }} />
                <span>{language === 'ar' ? 'جدول هذا اليوم:' : 'Schedule for this day:'}</span>
              </h4>

              {/* 1. Special Occasions on Selected Day */}
              {occasionsOnSelectedDay.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.2rem' }}>
                  {occasionsOnSelectedDay.map(occ => {
                    const badge = getOccasionTypeBadge(occ.type);
                    return (
                      <div
                        key={occ.id}
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--accent-gold)',
                          borderRadius: '8px',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: badge.bg,
                            color: badge.color
                          }}>
                            {badge.label}
                          </span>
                          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
                            {language === 'ar' ? occ.titleAr : occ.titleEn}
                          </span>
                        </div>
                        {occ.descriptionAr && (
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                            {language === 'ar' ? occ.descriptionAr : occ.descriptionEn}
                          </p>
                        )}
                        {occ.locationAr && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <MapPin size={14} style={{ color: 'var(--accent-gold)' }} />
                            <span>{language === 'ar' ? occ.locationAr : occ.locationEn}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Regular Liturgies on Selected Day of Week */}
              {liturgiesOnSelectedDay.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.2rem' }}>
                  {liturgiesOnSelectedDay.map(item => (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🕯️</span>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>
                            {language === 'ar' ? item.eventTypeAr : item.eventTypeEn}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {language === 'ar' ? `الموعد الأسبوعي المعتاد ليوم ${item.dayAr}` : `Regular weekly schedule for ${item.dayEn}`}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        backgroundColor: 'rgba(226, 183, 20, 0.08)',
                        color: 'var(--accent-gold)',
                        border: '1px solid rgba(226, 183, 20, 0.25)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        direction: 'ltr'
                      }}>
                        {language === 'ar' ? item.timeAr : item.timeEn}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Exact Fallback Notice if nothing scheduled for this day */}
              {occasionsOnSelectedDay.length === 0 && liturgiesOnSelectedDay.length === 0 && (
                <div style={{
                  backgroundColor: 'rgba(52, 152, 219, 0.05)',
                  border: '1px solid rgba(52, 152, 219, 0.3)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  marginTop: '0.5rem'
                }}>
                  <Bell size={24} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h5 style={{ color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '6px', fontSize: '1rem' }}>
                      {language === 'ar' ? 'تنويه بخصوص مواعيد هذا اليوم' : 'Daily Schedule Notice'}
                    </h5>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                      {language === 'ar'
                        ? 'لم يتم إضافة مواعيد خاصة لهذا اليوم حتى الآن، وعند إضافتها سيتم الإعلان عنها في قسم الأخبار.'
                        : 'No special schedule has been added for this day yet. When added, it will be announced in the news section.'}
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
