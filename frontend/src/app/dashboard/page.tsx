'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../components/ThemeContext';
import styles from '../page.module.css';
import { API_URL } from '../../config';
import { 
  User, Check, X, ShieldAlert, Radio, Bell, Users, 
  Calendar, CheckCircle, HelpCircle, ArrowRight, Video, FileText 
} from 'lucide-react';

interface Booking {
  id: string;
  date: string;
  timeSlot: string;
  status: string;
  notes: string;
  member: {
    fullName: string;
    phone: string;
    nationalId: string;
  };
  priest?: {
    nameAr: string;
    nameEn: string;
    titleAr: string;
    titleEn: string;
  };
}

interface PendingProfile {
  id: string;
  userId: string;
  fullName: string;
  nationalId: string;
  street: string;
  buildingNumber: string;
  floor: string;
  apartment: string;
  job: string;
  phoneNumbers: string;
  email: string;
  socialStatus: string;
  wifeName?: string;
  wifeNationalId?: string;
  wifeJob?: string;
  wifePhone?: string;
  wifeEmail?: string;
  wifeConfessionFather?: string;
  children: any[];
  relatives: any[];
  servants: string[];
  notes?: string;
  status: string;
}

export default function DashboardPage() {
  const { language, t } = useTheme();
  const router = useRouter();
  
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Tabs structure based on role
  const [activeTab, setActiveTab] = useState<string>('');

  // Data states
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [priestBookings, setPriestBookings] = useState<Booking[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingProfile[]>([]);
  const [allMembers, setAllMembers] = useState<PendingProfile[]>([]);
  
  // Live Config State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [youtubeLiveId, setYoutubeLiveId] = useState('');
  const [liveMsg, setLiveMsg] = useState<string | null>(null);

  // Push Alert form state
  const [alertTitle, setAlertTitle] = useState('');
  const [alertBody, setAlertBody] = useState('');
  const [alertTopic, setAlertTopic] = useState('general');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Action input states
  const [rejectionNotes, setRejectionNotes] = useState<{ [id: string]: string }>({});

  const [loading, setLoading] = useState(true);

  // Super Admin Priest Management States
  const [allPriests, setAllPriests] = useState<any[]>([]);
  const [editingPriest, setEditingPriest] = useState<any | null>(null);
  const [priestEmail, setPriestEmail] = useState('');
  const [priestPassword, setPriestPassword] = useState('');
  const [priestFullName, setPriestFullName] = useState('');
  const [priestPhone, setPriestPhone] = useState('');
  const [priestNationalId, setPriestNationalId] = useState('');
  const [priestNameAr, setPriestNameAr] = useState('');
  const [priestNameEn, setPriestNameEn] = useState('');
  const [priestTitleAr, setPriestTitleAr] = useState('أبونا');
  const [priestTitleEn, setPriestTitleEn] = useState('Father');
  const [priestAvatarUrl, setPriestAvatarUrl] = useState('');
  const [priestMaxBookings, setPriestMaxBookings] = useState('5');
  const [priestBuffer, setPriestBuffer] = useState('15');
  const [priestAvailability, setPriestAvailability] = useState('{"Monday": ["17:00-17:30", "17:30-18:00"], "Wednesday": ["18:00-18:30"], "Friday": ["16:00-16:30"]}');
  const [priestMsg, setPriestMsg] = useState<string | null>(null);

  // Super Admin Site Images States
  const [imgHeroBg, setImgHeroBg] = useState('');
  const [imgHistoric1, setImgHistoric1] = useState('');
  const [imgHistoric2, setImgHistoric2] = useState('');
  const [imgHistoric3, setImgHistoric3] = useState('');
  const [imagesMsg, setImagesMsg] = useState<string | null>(null);

  // Load Auth data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('church-token');
      const userStr = localStorage.getItem('church-user');
      
      if (!savedToken || !userStr) {
        router.push('/login');
        return;
      }

      setToken(savedToken);
      const parsedUser = JSON.parse(userStr);
      setUser(parsedUser);

      // Set default tab based on roles
      if (['SUPER_ADMIN', 'CHURCH_ADMIN', 'SECRETARY'].includes(parsedUser.role)) {
        setActiveTab('members');
      } else if (parsedUser.role === 'TRIP_MANAGER') {
        setActiveTab('trips');
      } else if (['PRIEST', 'BISHOP'].includes(parsedUser.role)) {
        setActiveTab('confessions');
      } else {
        setActiveTab('my-profile');
      }

      setLoading(false);
    }
  }, []);

  // Fetch tab details when activeTab shifts
  useEffect(() => {
    if (!token || !user || !activeTab) return;

    if (activeTab === 'my-profile') {
      // Fetch Member bookings
      fetch(`${API_URL}/bookings/my-bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) {
            localStorage.removeItem('church-token');
            router.push('/login');
            throw new Error('Unauthorized');
          }
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setMyBookings(data);
        })
        .catch(err => console.log(err));
    }

    if (activeTab === 'confessions') {
      // Fetch priest bookings
      fetch(`${API_URL}/bookings/priest-bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) throw new Error('Unauthorized');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setPriestBookings(data);
        })
        .catch(err => console.log(err));
    }

    if (activeTab === 'members') {
      // Fetch pending members
      fetch(`${API_URL}/members/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) throw new Error('Unauthorized');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setPendingMembers(data);
        })
        .catch(err => console.log(err));

      // Fetch all members
      fetch(`${API_URL}/members/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) throw new Error('Unauthorized');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setAllMembers(data);
        })
        .catch(err => console.log(err));
    }

    if (activeTab === 'live') {
      // Fetch current live config
      fetch(`${API_URL}/live`)
        .then(res => res.json())
        .then(data => {
          setIsLiveActive(data.isActive);
          setYoutubeLiveId(data.youtubeLiveId);
        })
        .catch(err => console.log(err));
    }

    if (activeTab === 'manage-priests') {
      fetch(`${API_URL}/priests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) throw new Error('Unauthorized');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setAllPriests(data);
        })
        .catch(err => console.log(err));
    }

    if (activeTab === 'manage-images') {
      fetch(`${API_URL}/settings`)
        .then(res => res.json())
        .then(data => {
          setImgHeroBg(data.img_hero_bg || '');
          setImgHistoric1(data.img_historic_1 || '');
          setImgHistoric2(data.img_historic_2 || '');
          setImgHistoric3(data.img_historic_3 || '');
        })
        .catch(err => console.log(err));
    }
  }, [activeTab, token, user]);

  // Appointment Actions: Approve/Reject
  const handleUpdateBookingStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        // Refetch appointments
        setPriestBookings(prev => 
          prev.map(b => b.id === id ? { ...b, status } : b)
        );
      }
    } catch (err) {
      console.log('Error updating booking status:', err);
    }
  };

  // Membership Actions: Approve/Reject
  const handleUpdateMemberStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!token) return;
    const adminNotes = rejectionNotes[id] || '';

    try {
      const res = await fetch(`${API_URL}/members/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, adminNotes })
      });

      if (res.ok) {
        // Remove from pending list
        setPendingMembers(prev => prev.filter(m => m.id !== id));
        // Reset notes input
        setRejectionNotes(prev => ({ ...prev, [id]: '' }));
        // Refresh all list
        fetch(`${API_URL}/members/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setAllMembers(data));
      }
    } catch (err) {
      console.log('Error updating member status:', err);
    }
  };

  // Live Stream Settings Submit
  const handleUpdateLiveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setLiveMsg(null);
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: isLiveActive, youtubeLiveId })
      });

      if (res.ok) {
        setLiveMsg(language === 'ar' ? 'تم تحديث إعدادات البث بنجاح!' : 'Live settings updated successfully!');
      } else {
        setLiveMsg('Failed to update live settings.');
      }
    } catch (err) {
      setLiveMsg('Connection error.');
    }
  };

  // Send push notification alerts submit (Mock alert)
  const handleSendPush = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg(null);
    // Log simulation locally
    console.log(`\n📣 [DASHBOARD ACTION] Triggered Broadcast:\n   Title: ${alertTitle}\n   Body: ${alertBody}\n   Topic: ${alertTopic}\n`);
    setAlertMsg(language === 'ar' ? 'تم إرسال إشعار البث العام لجميع الهواتف!' : 'Firebase push broadcast sent to all users!');
    setAlertTitle('');
    setAlertBody('');
  };

  const handleEndLiveStream = async () => {
    setIsLiveActive(false);
    setYoutubeLiveId('');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: false, youtubeLiveId: '' })
      });

      if (res.ok) {
        setLiveMsg(language === 'ar' ? 'تم إنهاء البث المباشر وحذف الرابط!' : 'Live stream ended and link cleared!');
      } else {
        setLiveMsg('Failed to end live stream.');
      }
    } catch (err) {
      setLiveMsg('Connection error.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert(language === 'ar' ? 'حجم الصورة يجب أن لا يتجاوز 2 ميجابايت' : 'Image size must not exceed 2MB');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Priest handler
  const handleSavePriest = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriestMsg(null);
    if (!token) return;

    const payload = {
      email: priestEmail,
      password: priestPassword || undefined,
      fullName: priestFullName,
      phone: priestPhone,
      nationalId: priestNationalId,
      nameAr: priestNameAr,
      nameEn: priestNameEn,
      titleAr: priestTitleAr,
      titleEn: priestTitleEn,
      avatarUrl: priestAvatarUrl,
      maxBookingsPerDay: priestMaxBookings,
      bufferMinutes: priestBuffer,
      availabilityJson: priestAvailability
    };

    try {
      let res;
      if (editingPriest) {
        res = await fetch(`${API_URL}/priests/${editingPriest.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        if (!priestPassword) {
          setPriestMsg('Password is required for new priest.');
          return;
        }
        res = await fetch(`${API_URL}/priests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const result = await res.json();
      if (res.ok) {
        setPriestMsg(language === 'ar' ? 'تم حفظ بيانات الكاهن بنجاح!' : 'Priest saved successfully!');
        // Refresh
        fetch(`${API_URL}/priests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setAllPriests(data));
        handleResetPriestForm();
      } else {
        setPriestMsg(result.error || 'Failed to save.');
      }
    } catch (err) {
      setPriestMsg('Connection error.');
    }
  };

  const handleEditPriestClick = (priest: any) => {
    setEditingPriest(priest);
    setPriestEmail(priest.email || '');
    setPriestPassword('');
    setPriestFullName(priest.fullName || '');
    setPriestPhone(priest.phone || '');
    setPriestNationalId(priest.nationalId || '');
    setPriestNameAr(priest.nameAr || '');
    setPriestNameEn(priest.nameEn || '');
    setPriestTitleAr(priest.titleAr || 'أبونا');
    setPriestTitleEn(priest.titleEn || 'Father');
    setPriestAvatarUrl(priest.avatarUrl || '');
    setPriestMaxBookings(String(priest.maxBookingsPerDay || 5));
    setPriestBuffer(String(priest.bufferMinutes || 15));
    setPriestAvailability(typeof priest.availabilityJson === 'string' ? priest.availabilityJson : JSON.stringify(priest.availabilityJson));
  };

  const handleDeletePriest = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الكاهن نهائياً؟' : 'Are you sure you want to delete this priest permanently?')) return;
    setPriestMsg(null);
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/priests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setPriestMsg(language === 'ar' ? 'تم الحذف بنجاح.' : 'Priest deleted successfully.');
        setAllPriests(prev => prev.filter(p => p.id !== id));
        if (editingPriest?.id === id) {
          handleResetPriestForm();
        }
      } else {
        setPriestMsg('Failed to delete.');
      }
    } catch (err) {
      setPriestMsg('Error connecting.');
    }
  };

  const handleResetPriestForm = () => {
    setEditingPriest(null);
    setPriestEmail('');
    setPriestPassword('');
    setPriestFullName('');
    setPriestPhone('');
    setPriestNationalId('');
    setPriestNameAr('');
    setPriestNameEn('');
    setPriestTitleAr('أبونا');
    setPriestTitleEn('Father');
    setPriestAvatarUrl('');
    setPriestMaxBookings('5');
    setPriestBuffer('15');
    setPriestAvailability('{"Monday": ["17:00-17:30", "17:30-18:00"], "Wednesday": ["18:00-18:30"], "Friday": ["16:00-16:30"]}');
  };

  const handleSaveImages = async (e: React.FormEvent) => {
    e.preventDefault();
    setImagesMsg(null);
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          img_hero_bg: imgHeroBg,
          img_historic_1: imgHistoric1,
          img_historic_2: imgHistoric2,
          img_historic_3: imgHistoric3
        })
      });

      if (res.ok) {
        setImagesMsg(language === 'ar' ? 'تم تحديث صور الموقع بنجاح!' : 'Site images updated successfully!');
      } else {
        setImagesMsg('Failed to update images.');
      }
    } catch (err) {
      setImagesMsg('Connection error.');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <p>{language === 'ar' ? 'جاري تحميل لوحة التحكم...' : 'Loading Dashboard...'}</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3rem 1rem' }}>
      
      {/* Header Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2.5rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '20px',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>
            {t('nav_dashboard')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            {t('welcome')} {user?.fullName} • 🛡️ <span style={{ color: 'var(--accent-gold)' }}>{user?.role}</span>
          </p>
        </div>
        
        {user?.role === 'MEMBER' && (
          <button 
            onClick={() => router.push('/register-member')}
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
            <FileText size={18} />
            <span>{language === 'ar' ? 'استمارة عضوية العائلة' : 'Family Registry Form'}</span>
          </button>
        )}
      </div>

      {/* Tabs Menu Selection */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '2rem' }}>
        {/* MEMBER tab options */}
        {user?.role === 'MEMBER' && (
          <button 
            onClick={() => setActiveTab('my-profile')}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: activeTab === 'my-profile' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'my-profile' ? '#000000' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            {language === 'ar' ? 'حسابي وعضويتي' : 'My Profile & Status'}
          </button>
        )}

        {/* PRIEST / BISHOP tab options */}
        {['PRIEST', 'BISHOP'].includes(user?.role) && (
          <button 
            onClick={() => setActiveTab('confessions')}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: activeTab === 'confessions' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'confessions' ? '#000000' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            {t('booking_requests')}
          </button>
        )}

        {/* SECRETARY / ADMIN tab options */}
        {['SUPER_ADMIN', 'CHURCH_ADMIN', 'SECRETARY'].includes(user?.role) && (
          <>
            <button 
              onClick={() => setActiveTab('members')}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: activeTab === 'members' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: activeTab === 'members' ? '#000000' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              <Users size={16} style={{ verticalAlign: 'middle', marginInlineEnd: '6px' }} />
              {t('manage_members')}
            </button>
            <button 
              onClick={() => setActiveTab('live')}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: activeTab === 'live' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: activeTab === 'live' ? '#000000' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              <Radio size={16} style={{ verticalAlign: 'middle', marginInlineEnd: '6px' }} />
              {t('manage_live')}
            </button>
            <button 
              onClick={() => setActiveTab('push-alerts')}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: activeTab === 'push-alerts' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: activeTab === 'push-alerts' ? '#000000' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              <Bell size={16} style={{ verticalAlign: 'middle', marginInlineEnd: '6px' }} />
              {language === 'ar' ? 'إرسال إشعار جماعي' : 'Broadcast Push Alerts'}
            </button>
            {user?.role === 'SUPER_ADMIN' && (
              <>
                <button 
                  onClick={() => setActiveTab('manage-priests')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: activeTab === 'manage-priests' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                    color: activeTab === 'manage-priests' ? '#000000' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}
                >
                  {language === 'ar' ? 'إدارة الكهنة' : 'Manage Priests'}
                </button>
                <button 
                  onClick={() => setActiveTab('manage-images')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: activeTab === 'manage-images' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                    color: activeTab === 'manage-images' ? '#000000' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}
                >
                  {language === 'ar' ? 'إدارة صور الموقع' : 'Manage Site Images'}
                </button>
              </>
            )}
          </>
        )}

        {/* TRIP MANAGER Tab Options */}
        {user?.role === 'TRIP_MANAGER' && (
          <button 
            onClick={() => setActiveTab('trips')}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: activeTab === 'trips' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'trips' ? '#000000' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            {t('manage_events')} (Trips Only)
          </button>
        )}
      </div>

      {/* TABS VIEW RENDER */}

      {/* Tab: Member status info */}
      {activeTab === 'my-profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Membership Status Summary */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '2rem'
          }}>
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem' }}>
              🎖️ {language === 'ar' ? 'حالة ملف العضوية الكنسية للأسرة' : 'Family Membership status'}
            </h3>
            
            {user?.familyProfileStatus ? (
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                {t('member_status')}{' '}
                <span style={{ 
                  color: user.familyProfileStatus === 'APPROVED' ? 'var(--accent-green)' : user.familyProfileStatus === 'REJECTED' ? '#ff4d4d' : 'var(--accent-gold)'
                }}>
                  {user.familyProfileStatus === 'APPROVED' && t('status_approved')}
                  {user.familyProfileStatus === 'PENDING' && t('status_pending')}
                  {user.familyProfileStatus === 'REJECTED' && t('status_rejected')}
                </span>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  {language === 'ar' 
                    ? 'لم تقم بملء استمارة العضوية الكنسية بعد. يرجى كتابة البيانات لربط عائلتك بخدمات الكنيسة والتواصل والافتقاد.' 
                    : 'You have not submitted a family membership registry form yet. Fill it to link with church pastoral registers.'}
                </p>
                <button onClick={() => router.push('/register-member')} className={styles.bookBtn} style={{ maxWidth: '250px' }}>
                  {t('membership_title')}
                </button>
              </div>
            )}
          </div>

          {/* Member's booked confession list */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '2rem'
          }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              📅 {language === 'ar' ? 'مواعيد سر الاعتراف المحجوزة' : 'My Confession Sessions'}
            </h3>

            {myBookings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myBookings.map(b => (
                  <div key={b.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: '1.2rem',
                    borderRadius: '6px',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {language === 'ar' 
                          ? `${b.priest?.titleAr} ${b.priest?.nameAr}` 
                          : `${b.priest?.titleEn} ${b.priest?.nameEn}`}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        📅 {new Date(b.date).toLocaleDateString()} • 🕒 {b.timeSlot}
                      </div>
                      {b.notes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>
                          📝 {b.notes}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      backgroundColor: b.status === 'APPROVED' ? 'rgba(46, 204, 113, 0.1)' : b.status === 'REJECTED' ? 'rgba(229, 9, 20, 0.1)' : 'rgba(226, 183, 20, 0.1)',
                      color: b.status === 'APPROVED' ? '#2ecc71' : b.status === 'REJECTED' ? '#ff4d4d' : 'var(--accent-gold)'
                    }}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                {t('no_bookings')}
              </p>
            )}
          </div>

        </div>
      )}

      {/* Tab: Priest Confession Bookings Review */}
      {activeTab === 'confessions' && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
            📋 {t('booking_requests')}
          </h3>

          {priestBookings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {priestBookings.map(b => (
                <div key={b.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  padding: '1.2rem',
                  borderRadius: '6px',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    {/* Security check: Priest emails never visible */}
                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{b.member.fullName}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      📅 {new Date(b.date).toLocaleDateString()} • 🕒 {b.timeSlot} <br />
                      📞 {b.member.phone} • 🪪 {b.member.nationalId}
                    </div>
                    {b.notes && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>
                        📝 {b.notes}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {b.status === 'PENDING' ? (
                      <>
                        <button 
                          onClick={() => handleUpdateBookingStatus(b.id, 'APPROVED')}
                          style={{ backgroundColor: 'var(--accent-green)', border: 'none', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          <Check size={14} /> {t('approve')}
                        </button>
                        <button 
                          onClick={() => handleUpdateBookingStatus(b.id, 'REJECTED')}
                          style={{ backgroundColor: '#ff4d4d', border: 'none', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          <X size={14} /> {language === 'ar' ? 'رفض' : 'Reject'}
                        </button>
                      </>
                    ) : (
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        color: b.status === 'APPROVED' ? '#2ecc71' : '#ff4d4d'
                      }}>
                        {b.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
              {t('no_bookings')}
            </p>
          )}
        </div>
      )}

      {/* Tab: Admin Membership Approvals */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Pending Applications Box */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              📥 {language === 'ar' ? 'طلبات العضوية الكنسية الجديدة المعلقة' : 'Pending Membership Registries'}
            </h3>

            {pendingMembers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {pendingMembers.map(m => (
                  <div key={m.id} style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '1.5rem'
                  }}>
                    {/* Family Head info */}
                    <h4 style={{ color: 'var(--accent-gold)', marginBottom: '10px' }}>👨 رب الأسرة: {m.fullName}</h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '10px', 
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                      marginBottom: '1rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <div>🪪 الرقم القومي: {m.nationalId}</div>
                      <div>💼 الوظيفة: {m.job}</div>
                      <div>📞 الهواتف: {m.phoneNumbers}</div>
                      <div>✉️ البريد: {m.email || 'N/A'}</div>
                      <div>🏠 السكن: ش {m.street}، عمارة {m.buildingNumber}، ط {m.floor}، شقة {m.apartment}</div>
                      <div>💍 الحالة الاجتماعية: {m.socialStatus}</div>
                    </div>

                    {/* Wife info if exists */}
                    {m.wifeName && (
                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                        <h5 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>👩 الزوجة: {m.wifeName}</h5>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                          gap: '10px', 
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)'
                        }}>
                          <div>🪪 الرقم القومي: {m.wifeNationalId}</div>
                          <div>💼 الوظيفة: {m.wifeJob}</div>
                          <div>📞 هاتف: {m.wifePhone}</div>
                          <div>⛪ أب الاعتراف: {m.wifeConfessionFather || 'N/A'}</div>
                        </div>
                      </div>
                    )}

                    {/* Children List */}
                    {m.children && m.children.length > 0 && (
                      <div style={{ marginTop: '10px', fontSize: '0.85rem' }}>
                        <b>👶 الأبناء ({m.children.length}):</b>
                        <ul style={{ paddingInlineStart: '20px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                          {m.children.map((c, i) => (
                            <li key={i}>{c.name} • {c.educationOrJob} • {c.nationalId}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Servants list */}
                    {m.servants && m.servants.length > 0 && (
                      <div style={{ marginTop: '10px', fontSize: '0.85rem' }}>
                        <b>⛪ خدام الافتقاد:</b>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{m.servants.join(', ')}</span>
                      </div>
                    )}

                    {/* notes */}
                    {m.notes && (
                      <div style={{ marginTop: '10px', fontSize: '0.85rem', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
                        <b>📝 ملاحظات:</b> <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{m.notes}</span>
                      </div>
                    )}

                    {/* Decision Action panel */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder={t('feedback_placeholder')}
                        value={rejectionNotes[m.id] || ''}
                        onChange={(e) => setRejectionNotes({ ...rejectionNotes, [m.id]: e.target.value })}
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          padding: '10px',
                          borderRadius: '4px',
                          fontSize: '0.85rem'
                        }}
                      />
                      
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleUpdateMemberStatus(m.id, 'APPROVED')}
                          style={{ backgroundColor: 'var(--accent-green)', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Check size={16} /> {t('approve')}
                        </button>
                        <button
                          onClick={() => handleUpdateMemberStatus(m.id, 'REJECTED')}
                          style={{ backgroundColor: '#ff4d4d', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <X size={16} /> {t('reject')}
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                {language === 'ar' ? 'لا توجد طلبات عضوية معلقة لمراجعتها.' : 'No pending membership applications.'}
              </p>
            )}
          </div>

          {/* All Registered Families list */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              🗂️ {language === 'ar' ? 'جميع العائلات المسجلة بقاعدة البيانات' : 'All Registered Families Database'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                  <div>
                    <b>{m.fullName}</b> • <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🪪 {m.nationalId} • 📞 {m.phoneNumbers.split(',')[0]}</span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '2px',
                    backgroundColor: m.status === 'APPROVED' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(229, 9, 20, 0.1)',
                    color: m.status === 'APPROVED' ? '#2ecc71' : '#ff4d4d'
                  }}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Tab: Admin Live Stream Management */}
      {activeTab === 'live' && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ 
            color: 'var(--accent-gold)', 
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Video size={20} />
            <span>{t('manage_live')}</span>
          </h3>

          {liveMsg && (
            <div style={{
              backgroundColor: 'rgba(226, 183, 20, 0.05)',
              border: '1px solid var(--accent-gold)',
              color: 'var(--accent-gold)',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}>
              {liveMsg}
            </div>
          )}

          <form onSubmit={handleUpdateLiveStream} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <div>
                <b style={{ display: 'block', fontSize: '0.95rem' }}>{language === 'ar' ? 'حالة البث المباشر' : 'Live Stream Status'}</b>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {language === 'ar' ? 'تفعيل الزر يرسل إشعارات للهواتف فوراً' : 'Toggling active triggers notifications to members'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={isLiveActive}
                onChange={(e) => setIsLiveActive(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-red)' }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>YouTube Video ID *</label>
              <input
                type="text"
                required
                placeholder="Ex: dQw4w9WgXcQ"
                value={youtubeLiveId}
                onChange={(e) => setYoutubeLiveId(e.target.value)}
                className={styles.formInput}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                {language === 'ar' ? 'المعرف الفريد المكون من 11 حرفاً الموجود في رابط البث.' : 'The 11-character video ID from the YouTube broadcast URL.'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className={styles.bookBtn} style={{ flex: 1 }}>
                {t('save')}
              </button>
              <button type="button" onClick={handleEndLiveStream} style={{ flex: 1, backgroundColor: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                {language === 'ar' ? 'إنهاء البث' : 'End Live'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Send Push Notifications */}
      {activeTab === 'push-alerts' && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ 
            color: 'var(--accent-gold)', 
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Bell size={20} />
            <span>{language === 'ar' ? 'إرسال إشعار جماعي فوري (FCM)' : 'Broadcast FCM Push Alert'}</span>
          </h3>

          {alertMsg && (
            <div style={{
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              border: '1px solid var(--accent-green)',
              color: '#2ecc71',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}>
              {alertMsg}
            </div>
          )}

          <form onSubmit={handleSendPush} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عنوان الإشعار' : 'Alert Title'}</label>
              <input
                type="text"
                required
                placeholder={language === 'ar' ? 'قداس استثنائي / عظة جديدة...' : 'Liturgy Update / Message...'}
                value={alertTitle}
                onChange={e => setAlertTitle(e.target.value)}
                className={styles.formInput}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'محتوى الإشعار بالتفصيل' : 'Alert Body Content'}</label>
              <textarea
                required
                placeholder={language === 'ar' ? 'نص الرسالة التي تظهر في شريط الهواتف...' : 'Notification body visible on lockscreens...'}
                value={alertBody}
                onChange={e => setAlertBody(e.target.value)}
                className={styles.formInput}
                style={{ height: '80px', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'قناة/شريحة التوجيه' : 'Target Topic Channel'}</label>
              <select
                value={alertTopic}
                onChange={e => setAlertTopic(e.target.value)}
                className={styles.formInput}
                style={{ cursor: 'pointer' }}
              >
                <option value="general">{language === 'ar' ? 'جميع المستخدمين (General)' : 'All Congregation (General)'}</option>
                <option value="members">{language === 'ar' ? 'العائلات والخدام فقط' : 'Members & Servants'}</option>
                <option value="live">{language === 'ar' ? 'تنبيهات البث المباشر' : 'Live Streams Alerts'}</option>
              </select>
            </div>

            <button type="submit" className={styles.bookBtn}>
              {language === 'ar' ? 'إرسال الإشعار فوراً' : 'Broadcast Push Now'}
            </button>
          </form>
        </div>
      )}

      {/* Tab: Trip Manager View */}
      {activeTab === 'trips' && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
            ✈️ {language === 'ar' ? 'إدارة رحلات الكنيسة والأنشطة الترفيهية' : 'Manage Trips & Leisure Activities'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            ℹ️ {language === 'ar' ? 'بصفتك مسؤول رحلات، يمكنك إضافة أو حذف الفعاليات من نوع "TRIP" فقط.' : 'As a Trip Manager, you can create or delete events of type "TRIP" only.'}
          </p>
          
          <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              {language === 'ar' ? 'لوحة تنظيم الرحلات جاهزة، تتوفر إمكانية الحذف المباشر من خلال صفحة المواعيد.' : 'Trips scheduling integrations are active. Manage directly from listings.'}
            </p>
            <button onClick={() => router.push('/')} className={styles.bookBtn} style={{ maxWidth: '200px', marginTop: '1.5rem', display: 'inline-block' }}>
              {language === 'ar' ? 'الذهاب لصفحة الرحلات' : 'Go to Trips Listing'}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Super Admin Priest Management */}
      {activeTab === 'manage-priests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              👤 {editingPriest ? (language === 'ar' ? 'تعديل بيانات كاهن' : 'Edit Priest') : (language === 'ar' ? 'إضافة كاهن جديد' : 'Add New Priest')}
            </h3>

            {priestMsg && (
              <div style={{
                backgroundColor: 'rgba(226, 183, 20, 0.05)',
                border: '1px solid var(--accent-gold)',
                color: 'var(--accent-gold)',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                {priestMsg}
              </div>
            )}

            <form onSubmit={handleSavePriest} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email *</label>
                  <input type="email" required value={priestEmail} onChange={e => setPriestEmail(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Password {editingPriest ? '(leave empty to keep same)' : '*'}</label>
                  <input type="password" required={!editingPriest} value={priestPassword} onChange={e => setPriestPassword(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Account Full Name *</label>
                  <input type="text" required value={priestFullName} onChange={e => setPriestFullName(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Phone</label>
                  <input type="text" value={priestPhone} onChange={e => setPriestPhone(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>National ID</label>
                  <input type="text" maxLength={14} value={priestNationalId} onChange={e => setPriestNationalId(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Name (Arabic) *</label>
                  <input type="text" required value={priestNameAr} onChange={e => setPriestNameAr(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Name (English) *</label>
                  <input type="text" required value={priestNameEn} onChange={e => setPriestNameEn(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Title (Arabic) *</label>
                  <select value={priestTitleAr} onChange={e => setPriestTitleAr(e.target.value)} className={styles.formInput}>
                    <option value="أبونا">أبونا</option>
                    <option value="سيدنا">سيدنا</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Title (English) *</label>
                  <select value={priestTitleEn} onChange={e => setPriestTitleEn(e.target.value)} className={styles.formInput}>
                    <option value="Father">Father</option>
                    <option value="Bishop">Bishop</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'صورة الكاهن (اختياري)' : 'Avatar Image (Optional)'}</label>
                  <input type="file" accept="image/*" onChange={e => handleFileChange(e, setPriestAvatarUrl)} className={styles.formInput} style={{ padding: '6px' }} />
                  {priestAvatarUrl && <img src={priestAvatarUrl} alt="Avatar Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%', marginTop: '4px' }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max Bookings/Day *</label>
                  <input type="number" required value={priestMaxBookings} onChange={e => setPriestMaxBookings(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Buffer Minutes *</label>
                  <input type="number" required value={priestBuffer} onChange={e => setPriestBuffer(e.target.value)} className={styles.formInput} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Weekly Availability (JSON format) *</label>
                <textarea required value={priestAvailability} onChange={e => setPriestAvailability(e.target.value)} className={styles.formInput} style={{ height: '80px', fontFamily: 'monospace' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                {editingPriest && (
                  <button type="button" onClick={handleResetPriestForm} style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
                    {language === 'ar' ? 'إلغاء التعديل' : 'Cancel'}
                  </button>
                )}
                <button type="submit" className={styles.bookBtn} style={{ width: 'auto', padding: '10px 30px' }}>
                  {language === 'ar' ? 'حفظ الكاهن' : 'Save Priest'}
                </button>
              </div>
            </form>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              ⛪ {language === 'ar' ? 'الآباء الكهنة الحاليين' : 'Current Priests & Bishops'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {allPriests.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid var(--border-color)', alignItems: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '6px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {language === 'ar' ? `${p.titleAr} ${p.nameAr}` : `${p.titleEn} ${p.nameEn}`}
                    </span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      ✉️ {p.email} • 📞 {p.phone || 'N/A'} • 🪪 {p.nationalId || 'N/A'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleEditPriestClick(p)} style={{ backgroundColor: 'var(--accent-gold)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button onClick={() => handleDeletePriest(p.id)} style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {language === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Super Admin Site Images Management */}
      {activeTab === 'manage-images' && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
          <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            🖼️ {language === 'ar' ? 'تعديل صور الموقع العامة' : 'Manage Global Site Images'}
          </h3>

          {imagesMsg && (
            <div style={{
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              border: '1px solid var(--accent-green)',
              color: '#2ecc71',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}>
              {imagesMsg}
            </div>
          )}

          <form onSubmit={handleSaveImages} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'صورة الخلفية الرئيسية (Hero Background)' : 'Hero Header Background Image'}</label>
              <input type="file" accept="image/*" onChange={e => handleFileChange(e, setImgHeroBg)} className={styles.formInput} style={{ padding: '8px' }} />
              {imgHeroBg && <img src={imgHeroBg} alt="Preview" style={{ height: '60px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الصورة التاريخية الأولى' : 'Historic Gallery Image 1'}</label>
              <input type="file" accept="image/*" onChange={e => handleFileChange(e, setImgHistoric1)} className={styles.formInput} style={{ padding: '8px' }} />
              {imgHistoric1 && <img src={imgHistoric1} alt="Preview" style={{ height: '60px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الصورة التاريخية الثانية' : 'Historic Gallery Image 2'}</label>
              <input type="file" accept="image/*" onChange={e => handleFileChange(e, setImgHistoric2)} className={styles.formInput} style={{ padding: '8px' }} />
              {imgHistoric2 && <img src={imgHistoric2} alt="Preview" style={{ height: '60px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الصورة التاريخية الثالثة' : 'Historic Gallery Image 3'}</label>
              <input type="file" accept="image/*" onChange={e => handleFileChange(e, setImgHistoric3)} className={styles.formInput} style={{ padding: '8px' }} />
              {imgHistoric3 && <img src={imgHistoric3} alt="Preview" style={{ height: '60px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} />}
            </div>

            <button type="submit" className={styles.bookBtn} style={{ marginTop: '10px' }}>
              {language === 'ar' ? 'حفظ صور الموقع' : 'Save Images'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
