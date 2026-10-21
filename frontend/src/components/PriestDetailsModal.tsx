'use client';

import React, { useState, useEffect } from 'react';
import { X, Award, Calendar, Heart, ShieldCheck, Clock, User, Camera, Plus, Trash2, Edit3, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';
import { API_URL } from '../config';

interface MedalItem {
  id: string;
  titleAr: string;
  titleEn: string;
  year?: number | string;
  icon?: string;
  type?: 'GOLDEN' | 'SILVER' | 'HEGUMEN' | 'CUSTOM';
  descriptionAr?: string;
}

interface PriestDetails {
  ordinationDate?: string;
  ordainedBy?: string;
  hegumenDate?: string | null;
  birthDate?: string | null;
  patronSaint?: string | null;
  yearsOfPriesthood?: number;
  monthsOfPriesthood?: number;
  isGoldenJubilee?: boolean;
  isSilverJubilee?: boolean;
  medals?: MedalItem[];
  bioAr?: string;
  bioEn?: string;
  galleryImages?: string[];
  services?: string[];
}

interface Priest {
  id: string;
  userId?: string;
  nameAr: string;
  nameEn: string;
  titleAr: string;
  titleEn: string;
  avatarUrl: string;
  role: string;
  confessionStatus?: 'ACTIVE' | 'TRAVELING' | 'INACTIVE';
  confessionStatusNote?: string | null;
  noFixedSchedule?: boolean;
  details?: PriestDetails;
}

interface PriestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  priest: Priest | null;
  currentUser: any;
  token: string | null;
  language: string;
  onOpenBooking: (priest: Priest) => void;
  onProfileUpdated?: (updated: Priest) => void;
}

export default function PriestDetailsModal({
  isOpen,
  onClose,
  priest,
  currentUser,
  token,
  language,
  onOpenBooking,
  onProfileUpdated
}: PriestDetailsModalProps) {
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [details, setDetails] = useState<PriestDetails>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Edit form states
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editOrdinationDate, setEditOrdinationDate] = useState('');
  const [editOrdainedBy, setEditOrdainedBy] = useState('');
  const [editHegumenDate, setEditHegumenDate] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editPatronSaint, setEditPatronSaint] = useState('');
  const [editBioAr, setEditBioAr] = useState('');
  const [editBioEn, setEditBioEn] = useState('');
  const [editMedals, setEditMedals] = useState<MedalItem[]>([]);
  const [editGallery, setEditGallery] = useState<string[]>([]);

  // New Medal Input
  const [newMedalTitleAr, setNewMedalTitleAr] = useState('');
  const [newMedalYear, setNewMedalYear] = useState('');
  const [newMedalDesc, setNewMedalDesc] = useState('');

  // New Image Input
  const [newImageUrl, setNewImageUrl] = useState('');

  // Permission checks
  const isAdmin = currentUser && ['SUPER_ADMIN', 'CHURCH_ADMIN', 'DEVELOPER'].includes(currentUser.role);
  const isBishop = currentUser && currentUser.role === 'BISHOP';
  const isSelfPriest = currentUser && currentUser.role === 'PRIEST' && priest && (
    priest.userId === currentUser.id || priest.id === currentUser.priestProfileId
  );
  const canEdit = Boolean(isAdmin || isBishop || isSelfPriest);

  useEffect(() => {
    if (!isOpen || !priest) {
      setActiveTab('VIEW');
      setFeedback(null);
      return;
    }

    // Set initial details from priest prop if available
    if (priest.details) {
      populateState(priest.details);
    }

    // Fetch freshest details from backend
    setLoading(true);
    fetch(`${API_URL}/priests/${priest.id}/details`)
      .then(res => res.json())
      .then(data => {
        if (data && data.details) {
          populateState(data.details);
        }
      })
      .catch(err => console.error('Error fetching priest details:', err))
      .finally(() => setLoading(false));
  }, [isOpen, priest?.id]);

  const populateState = (d: PriestDetails) => {
    setDetails(d);
    setEditAvatarUrl(priest?.avatarUrl || '');
    setEditOrdinationDate(d.ordinationDate ? d.ordinationDate.slice(0, 10) : '');
    setEditOrdainedBy(d.ordainedBy || '');
    setEditHegumenDate(d.hegumenDate ? d.hegumenDate.slice(0, 10) : '');
    setEditBirthDate(d.birthDate ? d.birthDate.slice(0, 10) : '');
    setEditPatronSaint(d.patronSaint || '');
    setEditBioAr(d.bioAr || '');
    setEditBioEn(d.bioEn || '');
    setEditMedals(d.medals || []);
    setEditGallery(d.galleryImages || []);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert(isAr ? 'حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 8 ميجابايت' : 'Image too large, max 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (target === 'avatar') {
        setEditAvatarUrl(base64);
      } else {
        setEditGallery(prev => [...prev, base64]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddMedal = () => {
    if (!newMedalTitleAr.trim()) return;
    const item: MedalItem = {
      id: 'custom-' + Date.now(),
      titleAr: newMedalTitleAr.trim(),
      titleEn: newMedalTitleAr.trim(),
      year: newMedalYear.trim() || new Date().getFullYear(),
      type: 'CUSTOM',
      descriptionAr: newMedalDesc.trim() || undefined
    };
    setEditMedals(prev => [...prev, item]);
    setNewMedalTitleAr('');
    setNewMedalYear('');
    setNewMedalDesc('');
  };

  const handleRemoveMedal = (id: string) => {
    setEditMedals(prev => prev.filter(m => m.id !== id));
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setEditGallery(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveGalleryImage = (index: number) => {
    setEditGallery(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !priest) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`${API_URL}/priests/${priest.id}/details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          avatarUrl: editAvatarUrl || undefined,
          ordinationDate: editOrdinationDate || undefined,
          ordainedBy: editOrdainedBy || undefined,
          hegumenDate: editHegumenDate || undefined,
          birthDate: editBirthDate || undefined,
          patronSaint: editPatronSaint || undefined,
          medals: editMedals,
          bioAr: editBioAr,
          bioEn: editBioEn,
          galleryImages: editGallery
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', msg: isAr ? '✓ تم حفظ بيانات الكاهن بنجاح!' : '✓ Priest details saved successfully!' });
        if (data.profile?.details) {
          populateState(data.profile.details);
          if (onProfileUpdated) {
            onProfileUpdated({
              ...priest,
              avatarUrl: data.profile.avatarUrl || priest.avatarUrl,
              details: data.profile.details
            });
          }
        }
        setTimeout(() => {
          setActiveTab('VIEW');
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback({ type: 'error', msg: data.error || (isAr ? 'فشل حفظ البيانات' : 'Failed to save') });
      }
    } catch (err) {
      console.error('Error saving priest details:', err);
      setFeedback({ type: 'error', msg: isAr ? 'حدث خطأ أثناء حفظ البيانات' : 'Network error saving details' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !priest) return null;

  const years = details.yearsOfPriesthood ?? 0;
  const months = details.monthsOfPriesthood ?? 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      padding: '16px',
      direction: isAr ? 'rtl' : 'ltr',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#15181f',
        border: '1px solid rgba(226, 183, 20, 0.3)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Top Header Banner with Cross Watermark */}
        <div style={{
          position: 'relative',
          padding: '24px 24px 16px',
          background: 'radial-gradient(ellipse at top, rgba(226, 183, 20, 0.15) 0%, rgba(21, 24, 31, 0) 70%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Close Button */}
          <button
            onClick={onClose}
            type="button"
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '16px',
              [isAr ? 'left' : 'right']: '16px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <X size={20} />
          </button>

          {/* Mode Switcher (if canEdit) */}
          {canEdit && (
            <div style={{
              position: 'absolute',
              top: '16px',
              [isAr ? 'right' : 'left']: '20px',
              display: 'flex',
              gap: '6px',
              background: 'rgba(0,0,0,0.4)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('VIEW')}
                style={{
                  background: activeTab === 'VIEW' ? 'var(--accent-gold)' : 'transparent',
                  color: activeTab === 'VIEW' ? '#000000' : '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'عرض البيانات' : 'View'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('EDIT')}
                style={{
                  background: activeTab === 'EDIT' ? 'var(--accent-gold)' : 'transparent',
                  color: activeTab === 'EDIT' ? '#000000' : '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Edit3 size={13} />
                <span>{isAr ? 'تعديل البيانات والصور' : 'Edit & Photos'}</span>
              </button>
            </div>
          )}

          {/* Profile Card Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            marginTop: canEdit ? '34px' : '0',
            flexWrap: 'wrap'
          }}>
            <div style={{
              position: 'relative',
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              padding: '3px',
              background: details.isGoldenJubilee
                ? 'linear-gradient(135deg, #f1c40f, #e67e22)'
                : details.isSilverJubilee
                ? 'linear-gradient(135deg, #bdc3c7, #2c3e50)'
                : 'linear-gradient(135deg, var(--accent-gold), rgba(226, 183, 20, 0.3))',
              flexShrink: 0
            }}>
              <img
                src={priest.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200'}
                alt={priest.nameAr}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              {details.isGoldenJubilee && (
                <span title="اليوبيل الذهبي (50 عاماً)" style={{
                  position: 'absolute',
                  bottom: '-2px',
                  [isAr ? 'left' : 'right']: '-2px',
                  background: '#f1c40f',
                  color: '#000',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                }}>
                  🥇
                </span>
              )}
              {details.isSilverJubilee && !details.isGoldenJubilee && (
                <span title="اليوبيل الفضي (25 عاماً)" style={{
                  position: 'absolute',
                  bottom: '-2px',
                  [isAr ? 'left' : 'right']: '-2px',
                  background: '#bdc3c7',
                  color: '#000',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                }}>
                  🥈
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: priest.role === 'BISHOP' ? 'rgba(155, 89, 182, 0.25)' : 'rgba(226, 183, 20, 0.15)',
                  color: priest.role === 'BISHOP' ? '#9b59b6' : 'var(--accent-gold)',
                  border: priest.role === 'BISHOP' ? '1px solid rgba(155, 89, 182, 0.4)' : '1px solid rgba(226, 183, 20, 0.3)'
                }}>
                  {priest.role === 'BISHOP'
                    ? (isAr ? 'نيافة الأسقف الجليل' : 'General Bishop')
                    : (isAr ? 'كاهن كنيسة الشهيد العظيم أبي سيفين' : 'Church Priest')}
                </span>

                {priest.confessionStatus === 'TRAVELING' && (
                  <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c' }}>
                    ✈️ {priest.confessionStatusNote || (isAr ? 'خارج مصر' : 'Traveling')}
                  </span>
                )}
              </div>

              <h2 style={{
                fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)',
                fontWeight: 900,
                color: '#ffffff',
                margin: '0 0 6px 0',
                lineHeight: 1.3
              }}>
                {isAr ? `${priest.titleAr} ${priest.nameAr}` : `${priest.titleEn} ${priest.nameEn}`}
              </h2>

              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <ShieldCheck size={15} style={{ color: '#2ecc71' }} />
                <span>{isAr ? 'خدمة كهنوتية معتمدة ومباركة' : 'Blessed Apostolic Priesthood'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px 28px', overflowY: 'auto', flex: 1 }}>
          {/* Feedback Alerts */}
          {feedback && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '16px',
              backgroundColor: feedback.type === 'success' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
              border: `1px solid ${feedback.type === 'success' ? '#2ecc71' : '#e74c3c'}`,
              color: feedback.type === 'success' ? '#2ecc71' : '#e74c3c',
              fontSize: '0.88rem',
              fontWeight: 700
            }}>
              {feedback.msg}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: VIEW MODE (READ ONLY)                              */}
          {/* ======================================================== */}
          {activeTab === 'VIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. Jubilee Banner (Prominent Highlight) */}
              <div style={{
                borderRadius: '16px',
                padding: '18px 20px',
                border: details.isGoldenJubilee
                  ? '1px solid rgba(241, 196, 15, 0.4)'
                  : details.isSilverJubilee
                  ? '1px solid rgba(189, 195, 199, 0.4)'
                  : '1px solid rgba(226, 183, 20, 0.25)',
                background: details.isGoldenJubilee
                  ? 'linear-gradient(135deg, rgba(241, 196, 15, 0.18) 0%, rgba(21, 24, 31, 0.9) 100%)'
                  : details.isSilverJubilee
                  ? 'linear-gradient(135deg, rgba(189, 195, 199, 0.18) 0%, rgba(21, 24, 31, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(226, 183, 20, 0.1) 0%, rgba(21, 24, 31, 0.8) 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  fontSize: '2.4rem',
                  lineHeight: 1,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                }}>
                  {details.isGoldenJubilee ? '🥇' : details.isSilverJubilee ? '🥈' : '🕊️'}
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Sparkles size={16} style={{ color: details.isGoldenJubilee ? '#f1c40f' : 'var(--accent-gold)' }} />
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: details.isGoldenJubilee ? '#f1c40f' : details.isSilverJubilee ? '#bdc3c7' : 'var(--accent-gold)'
                    }}>
                      {details.isGoldenJubilee
                        ? (isAr ? 'اليوبيل الذهبي للكهنوت المقدس (50 عاماً)' : 'Golden Jubilee of Priesthood (50 Years)')
                        : details.isSilverJubilee
                        ? (isAr ? 'اليوبيل الفضي للكهنوت المقدس (25 عاماً)' : 'Silver Jubilee of Priesthood (25 Years)')
                        : (isAr ? 'مسيرة الخدمة الكهنوتية المباركة' : 'Blessed Pastoral Journey')}
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: 'clamp(1.05rem, 3vw, 1.35rem)',
                    fontWeight: 900,
                    color: '#ffffff',
                    margin: '0 0 6px 0'
                  }}>
                    {isAr
                      ? `${years} عاماً و ${months} أشهراً في خدمة مذبح الرب`
                      : `${years} Years & ${months} Months Serving the Lord's Altar`}
                  </h3>

                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5
                  }}>
                    {isAr
                      ? `سيم كاهناً مباركاً في تاريخ ${details.ordinationDate ? new Date(details.ordinationDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '---'} ${details.ordainedBy ? `بيد ${details.ordainedBy}` : ''}`
                      : `Ordained on ${details.ordinationDate ? new Date(details.ordinationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '---'} ${details.ordainedBy ? `by ${details.ordainedBy}` : ''}`}
                  </p>
                </div>
              </div>

              {/* 2. Key Ordination Milestones (4-Card Metric Grid) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 175px), 1fr))',
                gap: '12px'
              }}>
                {/* Milestone 1: Ordination Date */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-gold)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                    <Calendar size={15} />
                    <span>{isAr ? 'تاريخ الرسامة' : 'Ordination Date'}</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    {details.ordinationDate ? new Date(details.ordinationDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '---'}
                  </div>
                </div>

                {/* Milestone 2: Duration */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3498db', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                    <Clock size={15} />
                    <span>{isAr ? 'المدة المنقضية' : 'Duration'}</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    {isAr ? `${years} سنة` : `${years} Years`}
                  </div>
                </div>

                {/* Milestone 3: Ordained By */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2ecc71', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                    <User size={15} />
                    <span>{isAr ? 'بوضع يد' : 'Ordained By'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
                    {details.ordainedBy || (isAr ? 'آباء الكنيسة الأجلاء' : 'Church Fathers')}
                  </div>
                </div>

                {/* Milestone 4: Hegumen Rank or Patron Saint */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e67e22', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                    <Award size={15} />
                    <span>{isAr ? 'القمصية / الرتبة' : 'Rank / Dignity'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                    {details.hegumenDate
                      ? `${isAr ? 'قمص منذ' : 'Hegumen since'} ${new Date(details.hegumenDate).getFullYear()}`
                      : priest.role === 'BISHOP'
                      ? (isAr ? 'أسقف إيبارشية' : 'Diocese Bishop')
                      : (isAr ? 'قس ورئيس خدمة' : 'Priest')}
                  </div>
                </div>
              </div>

              {/* 3. Medals and Honors Gallery (الأوسمة والأنواط) */}
              {details.medals && details.medals.length > 0 && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '16px 20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '0.9rem', fontWeight: 800, marginBottom: '12px' }}>
                    <Award size={18} />
                    <span>{isAr ? 'الأنواط والأوسمة والتكريمات الكنسية' : 'Church Medals & Jubilee Honors'}</span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
                    gap: '10px'
                  }}>
                    {details.medals.map((m, idx) => {
                      const isGold = m.type === 'GOLDEN' || m.id?.includes('gold');
                      const isSilv = m.type === 'SILVER' || m.id?.includes('silver');
                      return (
                        <div
                          key={m.id || idx}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: isGold
                              ? 'linear-gradient(135deg, rgba(241, 196, 15, 0.15), rgba(0, 0, 0, 0.4))'
                              : isSilv
                              ? 'linear-gradient(135deg, rgba(189, 195, 199, 0.15), rgba(0, 0, 0, 0.4))'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: isGold
                              ? '1px solid rgba(241, 196, 15, 0.35)'
                              : isSilv
                              ? '1px solid rgba(189, 195, 199, 0.35)'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px'
                          }}
                        >
                          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>
                            {isGold ? '🥇' : isSilv ? '🥈' : '🎖️'}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
                              {isAr ? m.titleAr : m.titleEn}
                            </div>
                            {m.year && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
                                {m.year}
                              </span>
                            )}
                            {m.descriptionAr && (
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
                                {m.descriptionAr}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Pastoral Bio */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '18px 20px'
              }}>
                <h4 style={{
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  color: 'var(--accent-gold)',
                  margin: '0 0 10px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Heart size={16} />
                  <span>{isAr ? 'السيرة الرعوية والخدمة' : 'Pastoral Biography & Ministry'}</span>
                </h4>
                <p style={{
                  color: '#e0e0e0',
                  fontSize: '0.92rem',
                  lineHeight: 1.75,
                  margin: 0,
                  whiteSpace: 'pre-line'
                }}>
                  {isAr ? (details.bioAr || 'لا تتوفر سيرة مسجلة حالياً.') : (details.bioEn || details.bioAr || 'No biography available yet.')}
                </p>
              </div>

              {/* 5. Attached Photos Gallery */}
              {details.galleryImages && details.galleryImages.length > 0 && (
                <div>
                  <h4 style={{
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Camera size={16} style={{ color: 'var(--accent-gold)' }} />
                    <span>{isAr ? 'ألبوم صور الرسامة والخدمة الرعوية' : 'Ordination & Pastoral Photo Gallery'}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      ({details.galleryImages.length})
                    </span>
                  </h4>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '10px'
                  }}>
                    {details.galleryImages.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => setPreviewImage(img)}
                        style={{
                          height: '110px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.1)',
                          position: 'relative'
                        }}
                      >
                        <img
                          src={img}
                          alt="Priest event"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.2s'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Action Footer (Book Confession & Edit CTA) */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '10px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBooking(priest);
                  }}
                  style={{
                    flex: '1 1 200px',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    background: 'var(--accent-gold)',
                    color: '#000000',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(226, 183, 20, 0.3)'
                  }}
                >
                  <Calendar size={17} />
                  <span>
                    {priest.role === 'BISHOP'
                      ? (isAr ? 'طلب لقاء مع نيافة الأسقف' : 'Request Bishop Meeting')
                      : (isAr ? 'حجز موعد سر الاعتراف' : 'Book Confession Appointment')}
                  </span>
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('EDIT')}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit3 size={15} />
                    <span>{isAr ? 'تعديل البيانات وإرفاق الصور' : 'Edit Info & Attach Photos'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: EDIT MODE (FOR AUTHORIZED PRIEST / BISHOP / ADMIN)  */}
          {/* ======================================================== */}
          {activeTab === 'EDIT' && canEdit && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(226, 183, 20, 0.1)',
                border: '1px solid rgba(226, 183, 20, 0.3)',
                color: 'var(--accent-gold)',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldCheck size={18} />
                <span>
                  {isAdmin
                    ? (isAr ? 'وضع التعديل الإداري (كامل الصلاحيات)' : 'Administrator Edit Mode')
                    : isBishop
                    ? (isAr ? 'وضع تعديل نيافة الأسقف الجليل' : 'Bishop Edit Mode')
                    : (isAr ? 'وضع تعديل الصفحة الشخصية للأب الكاهن' : 'Priest Personal Profile Edit')}
                </span>
              </div>

              {/* Section 1: Avatar Image */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', color: '#fff', marginBottom: '8px' }}>
                  {isAr ? 'صورة الأب الكاهن (الرمزية)' : 'Priest Avatar Photo'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <img
                    src={editAvatarUrl || priest.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200'}
                    alt="avatar preview"
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }}
                  />
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <input
                      type="text"
                      placeholder={isAr ? 'رابط الصورة المباشر أو ارفع من جهازك' : 'Image URL or upload from device'}
                      value={editAvatarUrl}
                      onChange={e => setEditAvatarUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.84rem',
                        boxSizing: 'border-box',
                        marginBottom: '6px'
                      }}
                    />
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}>
                      <Camera size={14} />
                      <span>{isAr ? 'اختيار صورة من جهازك' : 'Upload File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handleFileUpload(e, 'avatar')}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 2: Ordination & Priesthood Milestones */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: '14px'
              }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.84rem', color: 'var(--accent-gold)', marginBottom: '6px' }}>
                    {isAr ? 'تاريخ الرسامة كاهناً *' : 'Ordination Date *'}
                  </label>
                  <input
                    type="date"
                    value={editOrdinationDate}
                    onChange={e => setEditOrdinationDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {isAr ? 'يتم حساب اليوبيل الفضي والذهبي والسنوات تلقائياً' : 'Calculates Jubilee automatically'}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.84rem', color: '#fff', marginBottom: '6px' }}>
                    {isAr ? 'بوضع يد (مَن رسمه)' : 'Ordained By'}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? 'مثل: مثلث الرحمات قداسة البابا شنودة الثالث' : 'e.g., Pope Shenouda III'}
                    value={editOrdainedBy}
                    onChange={e => setEditOrdainedBy(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.84rem', color: '#fff', marginBottom: '6px' }}>
                    {isAr ? 'تاريخ القمصية (إن نال الرتبة)' : 'Hegumen Promotion Date'}
                  </label>
                  <input
                    type="date"
                    value={editHegumenDate}
                    onChange={e => setEditHegumenDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.84rem', color: '#fff', marginBottom: '6px' }}>
                    {isAr ? 'تاريخ الميلاد (اختياري)' : 'Birth Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={e => setEditBirthDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Section 3: Pastoral Bio */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginBottom: '6px' }}>
                  {isAr ? 'السيرة الرعوية ونبذة عن الخدمة (عربي)' : 'Pastoral Biography (Arabic)'}
                </label>
                <textarea
                  rows={4}
                  value={editBioAr}
                  onChange={e => setEditBioAr(e.target.value)}
                  placeholder={isAr ? 'اكتب نبذة عن تاريخ الخدمة والرعاية الكنسية...' : 'Write bio here...'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Section 4: Medals & Honors Manager */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={16} />
                    <span>{isAr ? 'الأنواط والشهادات والأوسمة التكريمية' : 'Medals & Honors'}</span>
                  </label>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {editMedals.length} {isAr ? 'أوسمة مسجلة' : 'medals'}
                  </span>
                </div>

                {/* Existing Medals List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {editMedals.map(m => (
                    <div key={m.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🎖️</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{m.titleAr}</span>
                        {m.year && <span style={{ fontSize: '0.78rem', color: 'var(--accent-gold)' }}>({m.year})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedal(m.id)}
                        style={{
                          background: 'rgba(231, 76, 60, 0.2)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#e74c3c',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Custom Medal */}
                <div style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px dashed rgba(226, 183, 20, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                    {isAr ? '+ إضافة وسام أو تكريم كنسي جديد' : '+ Add New Medal / Honor'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder={isAr ? 'اسم الوسام (مثال: نوط الخدمة المتفانية)' : 'Medal title'}
                      value={newMedalTitleAr}
                      onChange={e => setNewMedalTitleAr(e.target.value)}
                      style={{
                        flex: '2 1 180px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.82rem'
                      }}
                    />
                    <input
                      type="number"
                      placeholder={isAr ? 'السنة' : 'Year'}
                      value={newMedalYear}
                      onChange={e => setNewMedalYear(e.target.value)}
                      style={{
                        flex: '1 1 80px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.82rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddMedal}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        background: 'var(--accent-gold)',
                        color: '#000',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'إضافة' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 5: Gallery Photos Manager */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} style={{ color: 'var(--accent-gold)' }} />
                    <span>{isAr ? 'ألبوم الصور والرسامة (إرفاق صور)' : 'Attached Photos Gallery'}</span>
                  </label>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'var(--accent-gold)',
                    color: '#000',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}>
                    <Plus size={14} />
                    <span>{isAr ? 'رفع صورة من جهازك' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleFileUpload(e, 'gallery')}
                    />
                  </label>
                </div>

                {/* Photos Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '8px',
                  marginBottom: '10px'
                }}>
                  {editGallery.map((img, idx) => (
                    <div key={idx} style={{
                      position: 'relative',
                      height: '80px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <img src={img} alt="attached" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(231, 76, 60, 0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Image by URL */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder={isAr ? 'أو ضع رابط صورة مباشر هنا...' : 'Or paste image URL...'}
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '0.82rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'إدراج' : 'Add'}
                  </button>
                </div>
              </div>

              {/* Edit Buttons Footer */}
              <div style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('VIEW')}
                  disabled={saving}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: saving ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(226, 183, 20, 0.3)'
                  }}
                >
                  {saving ? (
                    <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 100001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <img
            src={previewImage}
            alt="Enlarged"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
            }}
          />
        </div>
      )}
    </div>
  );
}
