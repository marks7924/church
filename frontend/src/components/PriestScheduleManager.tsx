'use client';

import React, { useState, useEffect } from 'react';
import styles from '../app/page.module.css';

interface RecurringSlot {
  day: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
}

interface SpecificSlot {
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
}

export interface ScheduleData {
  recurring: RecurringSlot[];
  specific: SpecificSlot[];
}

interface PriestScheduleManagerProps {
  language: string;
  availabilityJson: string;
  confessionDuration: string;
  bufferMinutes: string;
  onAvailabilityChange: (json: string) => void;
  onConfessionDurationChange: (val: string) => void;
  onBufferMinutesChange: (val: string) => void;
}

const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PriestScheduleManager({
  language,
  availabilityJson,
  confessionDuration,
  bufferMinutes,
  onAvailabilityChange,
  onConfessionDurationChange,
  onBufferMinutesChange
}: PriestScheduleManagerProps) {
  const [schedule, setSchedule] = useState<ScheduleData>({ recurring: [], specific: [] });

  // Parse initial JSON
  useEffect(() => {
    try {
      const parsed = JSON.parse(availabilityJson || '{"recurring":[], "specific":[]}');
      // Migrate old format if needed
      if (!parsed.recurring && !parsed.specific) {
        setSchedule({ recurring: [], specific: [] });
      } else {
        setSchedule({
          recurring: parsed.recurring || [],
          specific: parsed.specific || []
        });
      }
    } catch (e) {
      setSchedule({ recurring: [], specific: [] });
    }
  }, [availabilityJson]);

  const updateParentJson = (newSchedule: ScheduleData) => {
    setSchedule(newSchedule);
    onAvailabilityChange(JSON.stringify(newSchedule));
  };

  // --- Recurring Handlers ---
  const [newRecDay, setNewRecDay] = useState<number>(0);
  const [newRecStart, setNewRecStart] = useState('18:00');
  const [newRecEnd, setNewRecEnd] = useState('20:00');

  const addRecurring = () => {
    if (!newRecStart || !newRecEnd) return;
    const newSchedule = {
      ...schedule,
      recurring: [...schedule.recurring, { day: newRecDay, startTime: newRecStart, endTime: newRecEnd }]
    };
    updateParentJson(newSchedule);
  };

  const removeRecurring = (idx: number) => {
    const updated = [...schedule.recurring];
    updated.splice(idx, 1);
    updateParentJson({ ...schedule, recurring: updated });
  };

  // --- Specific Handlers ---
  const [newSpecDate, setNewSpecDate] = useState('');
  const [newSpecStart, setNewSpecStart] = useState('18:00');
  const [newSpecEnd, setNewSpecEnd] = useState('20:00');

  const addSpecific = () => {
    if (!newSpecDate || !newSpecStart || !newSpecEnd) return;
    const newSchedule = {
      ...schedule,
      specific: [...schedule.specific, { date: newSpecDate, startTime: newSpecStart, endTime: newSpecEnd }]
    };
    updateParentJson(newSchedule);
    setNewSpecDate('');
  };

  const removeSpecific = (idx: number) => {
    const updated = [...schedule.specific];
    updated.splice(idx, 1);
    updateParentJson({ ...schedule, specific: updated });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
      <h4 style={{ color: 'var(--accent-gold)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
        📅 {language === 'ar' ? 'إدارة مواعيد الاعترافات' : 'Confession Schedule Management'}
      </h4>

      {/* Global Settings */}
      <div className="grid-2-col" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مدة الاعتراف للشخص (بالدقائق) *' : 'Confession Duration per person (mins) *'}</label>
          <input type="number" required min="5" value={confessionDuration} onChange={e => onConfessionDurationChange(e.target.value)} className={styles.formInput} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الراحة بين كل اعتراف والآخر (بالدقائق) *' : 'Break between confessions (mins) *'}</label>
          <input type="number" required min="0" value={bufferMinutes} onChange={e => onBufferMinutesChange(e.target.value)} className={styles.formInput} />
        </div>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
        {language === 'ar' 
          ? 'ملاحظة: سيقوم النظام بحساب عدد الأشخاص المتاح استقبالهم أوتوماتيكياً وتقسيم الفترات الزمنية بناءً على المدة والراحة.' 
          : 'Note: The system will automatically calculate max capacity and split timeslots based on duration and break time.'}
      </p>

      {/* Recurring Schedule */}
      <div>
        <h5 style={{ marginBottom: '10px', fontSize: '0.95rem' }}>{language === 'ar' ? 'المواعيد الثابتة أسبوعياً' : 'Weekly Recurring Schedule'}</h5>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'اليوم' : 'Day'}</label>
            <select value={newRecDay} onChange={e => setNewRecDay(Number(e.target.value))} className={styles.formInput}>
              {DAYS_EN.map((dayEn, i) => (
                <option key={i} value={i}>{language === 'ar' ? DAYS_AR[i] : dayEn}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'من الساعة' : 'From Time'}</label>
            <input type="time" value={newRecStart} onChange={e => setNewRecStart(e.target.value)} className={styles.formInput} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إلى الساعة' : 'To Time'}</label>
            <input type="time" value={newRecEnd} onChange={e => setNewRecEnd(e.target.value)} className={styles.formInput} />
          </div>
          <button type="button" onClick={addRecurring} style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', height: '40px' }}>
            {language === 'ar' ? 'إضافة' : 'Add'}
          </button>
        </div>
        
        {/* List Recurring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {schedule.recurring.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.9rem' }}>
                <b style={{ color: 'var(--accent-gold)' }}>{language === 'ar' ? DAYS_AR[item.day] : DAYS_EN[item.day]}</b>: {item.startTime} - {item.endTime}
              </span>
              <button type="button" onClick={() => removeRecurring(idx)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>
          ))}
          {schedule.recurring.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'لا يوجد مواعيد ثابتة.' : 'No recurring schedules.'}</span>}
        </div>
      </div>

      {/* Specific Dates Schedule */}
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <h5 style={{ marginBottom: '10px', fontSize: '0.95rem' }}>{language === 'ar' ? 'مواعيد استثنائية (تواريخ محددة)' : 'Specific Dates (Exceptions)'}</h5>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'التاريخ' : 'Date'}</label>
            <input type="date" value={newSpecDate} onChange={e => setNewSpecDate(e.target.value)} className={styles.formInput} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'من الساعة' : 'From Time'}</label>
            <input type="time" value={newSpecStart} onChange={e => setNewSpecStart(e.target.value)} className={styles.formInput} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إلى الساعة' : 'To Time'}</label>
            <input type="time" value={newSpecEnd} onChange={e => setNewSpecEnd(e.target.value)} className={styles.formInput} />
          </div>
          <button type="button" onClick={addSpecific} style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', height: '40px' }}>
            {language === 'ar' ? 'إضافة' : 'Add'}
          </button>
        </div>

        {/* List Specific Dates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {schedule.specific.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.9rem' }}>
                <b style={{ color: 'var(--accent-gold)' }}>{item.date}</b>: {item.startTime} - {item.endTime}
              </span>
              <button type="button" onClick={() => removeSpecific(idx)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>
          ))}
          {schedule.specific.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'لا يوجد استثناءات.' : 'No specific dates.'}</span>}
        </div>
      </div>

    </div>
  );
}
