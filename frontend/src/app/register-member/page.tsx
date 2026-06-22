'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../components/ThemeContext';
import { Plus, Trash2, ShieldAlert, CheckCircle, ArrowLeft, Send } from 'lucide-react';
import { API_URL } from '../../config';

interface Child {
  name: string;
  nationalId: string;
  educationOrJob: string;
  phone: string;
}

interface Relative {
  name: string;
  nationalId: string;
  relationshipType: string;
}

export default function RegisterMemberPage() {
  const { language, t } = useTheme();
  const router = useRouter();
  
  // Auth checking
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [street, setStreet] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [job, setJob] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [email, setEmail] = useState('');
  const [socialStatus, setSocialStatus] = useState('SINGLE');

  // Wife Details (if married)
  const [wifeName, setWifeName] = useState('');
  const [wifeNationalId, setWifeNationalId] = useState('');
  const [wifeJob, setWifeJob] = useState('');
  const [wifePhone, setWifePhone] = useState('');
  const [wifeEmail, setWifeEmail] = useState('');
  const [wifeConfessionFather, setWifeConfessionFather] = useState('');

  // Dynamic Lists
  const [children, setChildren] = useState<Child[]>([]);
  const [relatives, setRelatives] = useState<Relative[]>([]);
  const [servants, setServants] = useState<string[]>(['']);
  
  // Administrative notes & feedback
  const [notes, setNotes] = useState('');

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<any>(null);

  // Fetch current user details & profile state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('church-token');
      const userStr = localStorage.getItem('church-user');
      setToken(savedToken);
      
      if (savedToken && userStr) {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        
        // Fetch existing profile if exists
        fetch(`${API_URL}/members/my-profile`, {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        })
          .then(res => {
            if (res.ok) return res.json();
            return null;
          })
          .then(profile => {
            if (profile) {
              setCurrentProfile(profile);
              // Prepopulate fields
              setFullName(profile.fullName || '');
              setNationalId(profile.nationalId || '');
              setStreet(profile.street || '');
              setBuildingNumber(profile.buildingNumber || '');
              setFloor(profile.floor || '');
              setApartment(profile.apartment || '');
              setJob(profile.job || '');
              setPhoneNumbers(profile.phoneNumbers || '');
              setEmail(profile.email || '');
              setSocialStatus(profile.socialStatus || 'SINGLE');

              setWifeName(profile.wifeName || '');
              setWifeNationalId(profile.wifeNationalId || '');
              setWifeJob(profile.wifeJob || '');
              setWifePhone(profile.wifePhone || '');
              setWifeEmail(profile.wifeEmail || '');
              setWifeConfessionFather(profile.wifeConfessionFather || '');

              setChildren(profile.children || []);
              setRelatives(profile.relatives || []);
              setServants(profile.servants && profile.servants.length > 0 ? profile.servants : ['']);
              setNotes(profile.notes || '');
            }
          })
          .catch(err => console.log('Error checking profile:', err));
      }
    }
  }, []);

  // Dynamic Children additions
  const addChild = () => {
    setChildren([...children, { name: '', nationalId: '', educationOrJob: '', phone: '' }]);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChild = (index: number, key: keyof Child, value: string) => {
    const updated = [...children];
    updated[index][key] = value;
    setChildren(updated);
  };

  // Dynamic Relatives additions
  const addRelative = () => {
    setRelatives([...relatives, { name: '', nationalId: '', relationshipType: '' }]);
  };

  const removeRelative = (index: number) => {
    setRelatives(relatives.filter((_, i) => i !== index));
  };

  const updateRelative = (index: number, key: keyof Relative, value: string) => {
    const updated = [...relatives];
    updated[index][key] = value;
    setRelatives(updated);
  };

  // Dynamic Servants additions
  const addServant = () => {
    setServants([...servants, '']);
  };

  const removeServant = (index: number) => {
    setServants(servants.filter((_, i) => i !== index));
  };

  const updateServant = (index: number, value: string) => {
    const updated = [...servants];
    updated[index] = value;
    setServants(updated);
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setLoading(true);

    if (!token) return;

    // Filter empty servants
    const filteredServants = servants.filter(s => s.trim() !== '');

    const payload = {
      fullName,
      nationalId,
      street,
      buildingNumber,
      floor,
      apartment,
      job,
      phoneNumbers,
      email,
      socialStatus,
      
      // Send wife details only if married/divorced/widowed and filled
      wifeName: socialStatus === 'MARRIED' ? wifeName : null,
      wifeNationalId: socialStatus === 'MARRIED' ? wifeNationalId : null,
      wifeJob: socialStatus === 'MARRIED' ? wifeJob : null,
      wifePhone: socialStatus === 'MARRIED' ? wifePhone : null,
      wifeEmail: socialStatus === 'MARRIED' ? wifeEmail : null,
      wifeConfessionFather: socialStatus === 'MARRIED' ? wifeConfessionFather : null,
      
      children: children.filter(c => c.name.trim() !== ''),
      relatives: relatives.filter(r => r.name.trim() !== ''),
      servants: filteredServants,
      notes
    };

    try {
      const res = await fetch(`${API_URL}/members/register-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: language === 'ar' 
            ? 'تم تقديم استمارة العضوية الكنسية بنجاح! طلبك قيد المراجعة الآن.'
            : 'Family profile submitted successfully! Your application is now pending review.'
        });
        setCurrentProfile(result.profile);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'Failed to submit application.'
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Could not connect to database.' });
    } finally {
      setLoading(false);
    }
  };

  // Auth Protection Guard
  if (!token) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center', maxWidth: '550px' }}>
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '3rem 2rem' }}>
          <ShieldAlert size={48} style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>{language === 'ar' ? 'تنبيه تسجيل الدخول' : 'Login Required'}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
            {language === 'ar' 
              ? 'يجب تسجيل الدخول في حسابك لتتمكن من تقديم بيانات العضوية الكنسية للأسرة.'
              : 'You must log in to your account first to register your family membership records.'}
          </p>
          <button onClick={() => router.push('/login')} style={{
            backgroundColor: 'var(--accent-gold)',
            color: '#000000',
            fontWeight: 'bold',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            maxWidth: '200px',
            display: 'inline-block'
          }}>
            {t('login')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '850px' }}>
      {/* Return button */}
      <button onClick={() => router.push('/')} style={{
        background: 'none',
        border: 'none',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.9rem',
        marginBottom: '1.5rem'
      }}>
        <ArrowLeft size={16} />
        <span>{t('back')}</span>
      </button>

      <h1 style={{ fontSize: '2.1rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>
        {t('membership_title')}
      </h1>

      {currentProfile && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: `1px solid ${currentProfile.status === 'APPROVED' ? 'var(--accent-green)' : currentProfile.status === 'REJECTED' ? 'var(--accent-red)' : 'var(--accent-gold)'}`,
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {currentProfile.status === 'APPROVED' && <CheckCircle size={20} style={{ color: 'var(--accent-green)' }} />}
          {currentProfile.status === 'PENDING' && <CheckCircle size={20} style={{ color: 'var(--accent-gold)' }} />}
          <div>
            <b>{t('member_status')}</b>{' '}
            <span style={{ 
              fontWeight: 'bold', 
              color: currentProfile.status === 'APPROVED' ? 'var(--accent-green)' : currentProfile.status === 'REJECTED' ? '#ff4d4d' : 'var(--accent-gold)'
            }}>
              {currentProfile.status === 'APPROVED' && t('status_approved')}
              {currentProfile.status === 'PENDING' && t('status_pending')}
              {currentProfile.status === 'REJECTED' && t('status_rejected')}
            </span>
            {currentProfile.notes && (
              <div style={{ marginTop: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                📋 {currentProfile.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {statusMessage && (
        <div style={{
          backgroundColor: statusMessage.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(229, 9, 20, 0.1)',
          border: `1px solid ${statusMessage.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          color: statusMessage.type === 'success' ? '#2ecc71' : '#ff4d4d',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '2rem',
          fontSize: '0.9rem'
        }}>
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmitProfile} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Section 1: Family Head */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
            1. {t('family_head')}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('fullName')} *</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('nationalId')} *</label>
              <input type="text" required maxLength={14} pattern="\d{14}" value={nationalId} onChange={e => setNationalId(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('social_status')} *</label>
              <select value={socialStatus} onChange={e => setSocialStatus(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }}>
                <option value="SINGLE">{t('status_single')}</option>
                <option value="MARRIED">{t('status_married')}</option>
                <option value="DIVORCED">{t('status_divorced')}</option>
                <option value="WIDOWED">{t('status_widowed')}</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('job')} *</label>
              <input type="text" required value={job} onChange={e => setJob(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('phone')} *</label>
              <input type="text" required value={phoneNumbers} onChange={e => setPhoneNumbers(e.target.value)} placeholder="01222222222, 0225748839" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
            </div>
          </div>

          <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', margin: '1.5rem 0 1rem 0' }}>📍 {language === 'ar' ? 'العنوان وتفاصيل السكن' : 'Address Coordinates'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('street')} *</label>
              <input type="text" required value={street} onChange={e => setStreet(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('building')} *</label>
              <input type="text" required value={buildingNumber} onChange={e => setBuildingNumber(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('floor')} *</label>
              <input type="text" required value={floor} onChange={e => setFloor(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('apartment')} *</label>
              <input type="text" required value={apartment} onChange={e => setApartment(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
            </div>
          </div>
        </div>

        {/* Section 2: Wife Details (Only if married) */}
        {socialStatus === 'MARRIED' && (
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              2. {t('wife_details')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('wife_details')} (الاسم الكامل) *</label>
                <input type="text" required value={wifeName} onChange={e => setWifeName(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>الرقم القومي للزوجة *</label>
                <input type="text" required maxLength={14} pattern="\d{14}" value={wifeNationalId} onChange={e => setWifeNationalId(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>وظيفة الزوجة *</label>
                <input type="text" required value={wifeJob} onChange={e => setWifeJob(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>هاتف الزوجة *</label>
                <input type="text" required value={wifePhone} onChange={e => setWifePhone(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>بريد الزوجة الإلكتروني</label>
                <input type="email" value={wifeEmail} onChange={e => setWifeEmail(e.target.value)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('confession_father')}</label>
                <input type="text" value={wifeConfessionFather} onChange={e => setWifeConfessionFather(e.target.value)} placeholder="القمص يوحنا كمال" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Children (Dynamic List) */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--accent-gold)' }}>3. {t('children_list')}</h3>
            <button type="button" onClick={addChild} style={{
              backgroundColor: 'rgba(226, 183, 20, 0.1)',
              color: 'var(--accent-gold)',
              border: '1px solid var(--accent-gold)',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}>
              {t('add_child')}
            </button>
          </div>

          {children.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
              {language === 'ar' ? 'لا يوجد أبناء مضافين حالياً.' : 'No children added yet.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {children.map((child, index) => (
                <div key={index} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 40px',
                  gap: '1rem',
                  alignItems: 'end',
                  backgroundColor: 'var(--bg-card)',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('child_name')} *</label>
                    <input type="text" required value={child.name} onChange={e => updateChild(index, 'name', e.target.value)} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>الرقم القومي للابن *</label>
                    <input type="text" required maxLength={14} pattern="\d{14}" value={child.nationalId} onChange={e => updateChild(index, 'nationalId', e.target.value)} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('child_edu_job')} *</label>
                    <input type="text" required value={child.educationOrJob} onChange={e => updateChild(index, 'educationOrJob', e.target.value)} placeholder="مثال: ثالثة إعدادي" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>الهاتف (اختياري)</label>
                    <input type="text" value={child.phone} onChange={e => updateChild(index, 'phone', e.target.value)} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }} />
                  </div>
                  <button type="button" onClick={() => removeChild(index)} style={{
                    backgroundColor: 'none',
                    border: 'none',
                    color: '#ff4d4d',
                    padding: '8px 0',
                    cursor: 'pointer'
                  }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Relatives in home (Dynamic List) */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--accent-gold)' }}>4. {t('relatives_list')}</h3>
            <button type="button" onClick={addRelative} style={{
              backgroundColor: 'rgba(226, 183, 20, 0.1)',
              color: 'var(--accent-gold)',
              border: '1px solid var(--accent-gold)',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}>
              {t('add_relative')}
            </button>
          </div>

          {relatives.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
              {language === 'ar' ? 'لا يوجد أقارب مقيمين مضافين.' : 'No residing relatives added.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {relatives.map((rel, index) => (
                <div key={index} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) 40px',
                  gap: '1rem',
                  alignItems: 'end',
                  backgroundColor: 'var(--bg-card)',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>الاسم بالكامل *</label>
                    <input type="text" required value={rel.name} onChange={e => updateRelative(index, 'name', e.target.value)} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>الرقم القومي للقريب *</label>
                    <input type="text" required maxLength={14} pattern="\d{14}" value={rel.nationalId} onChange={e => updateRelative(index, 'nationalId', e.target.value)} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('relationship_type')} *</label>
                    <input type="text" required value={rel.relationshipType} onChange={e => updateRelative(index, 'relationshipType', e.target.value)} placeholder="مثال: جدة / عم" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }} />
                  </div>
                  <button type="button" onClick={() => removeRelative(index)} style={{
                    backgroundColor: 'none',
                    border: 'none',
                    color: '#ff4d4d',
                    padding: '8px 0',
                    cursor: 'pointer'
                  }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Servants visiting the family (Name only) */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--accent-gold)' }}>5. {t('servants_list')}</h3>
            <button type="button" onClick={addServant} style={{
              backgroundColor: 'rgba(226, 183, 20, 0.1)',
              color: 'var(--accent-gold)',
              border: '1px solid var(--accent-gold)',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}>
              {t('add_servant')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {servants.map((serv, index) => (
              <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'اسم خادم الافتقاد فقط...' : 'Servant name only...'}
                  value={serv}
                  onChange={e => updateServant(index, e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '10px',
                    borderRadius: '4px'
                  }}
                />
                {servants.length > 1 && (
                  <button type="button" onClick={() => removeServant(index)} style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff4d4d',
                    cursor: 'pointer'
                  }}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes & Submit */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('family_notes')}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={language === 'ar' ? 'اكتب أي ملاحظات إضافية بخصوص الخدمة أو حالات خاصة بالمنزل...' : 'Write any other notes...'}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '10px',
                borderRadius: '4px',
                height: '100px',
                resize: 'none'
              }}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            backgroundColor: 'var(--accent-gold)',
            color: '#000000',
            fontWeight: 'bold',
            border: 'none',
            padding: '14px',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <Send size={18} />
            <span>{loading ? (language === 'ar' ? 'جاري التقديم...' : 'Submitting...') : t('submit_membership')}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
