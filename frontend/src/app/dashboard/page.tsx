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

const defaultMinistries = [
  {
    id: 'youth',
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
    id: 'sunday-school',
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
    id: 'choir',
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
    id: 'social-service',
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
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  
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

  // Hero Backgrounds Array
  const [heroBgs, setHeroBgs] = useState<string[]>([]);
  
  // About the Church
  const [aboutHistoryAr, setAboutHistoryAr] = useState('');
  const [aboutHistoryEn, setAboutHistoryEn] = useState('');
  const [aboutMissionAr, setAboutMissionAr] = useState('');
  const [aboutMissionEn, setAboutMissionEn] = useState('');
  const [aboutVisionAr, setAboutVisionAr] = useState('');
  const [aboutVisionEn, setAboutVisionEn] = useState('');

  // Church Services (Ministries)
  const [churchServices, setChurchServices] = useState<any[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceSlug, setServiceSlug] = useState('');
  const [serviceNameAr, setServiceNameAr] = useState('');
  const [serviceNameEn, setServiceNameEn] = useState('');
  const [serviceGoalAr, setServiceGoalAr] = useState('');
  const [serviceGoalEn, setServiceGoalEn] = useState('');
  const [serviceScheduleAr, setServiceScheduleAr] = useState('');
  const [serviceScheduleEn, setServiceScheduleEn] = useState('');
  const [serviceImage, setServiceImage] = useState('');

  // Services Intro & Title States
  const [servicesTitleAr, setServicesTitleAr] = useState('الخدمات الكنسية');
  const [servicesTitleEn, setServicesTitleEn] = useState('Church Services');
  const [servicesIntroAr, setServicesIntroAr] = useState('تضم كنيستنا العديد من الخدمات والأنشطة المباركة التي تخدم كل أفراد الأسرة من الأطفال إلى كبار السن.');
  const [servicesIntroEn, setServicesIntroEn] = useState('Our church offers various blessed ministries and activities designed to serve all family members from young children to seniors.');

  // News Management States
  const [allNews, setAllNews] = useState<any[]>([]);
  const [newsContent, setNewsContent] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsMsg, setNewsMsg] = useState<string | null>(null);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);

  // Role accounts and action log states
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [adminUserRole, setAdminUserRole] = useState('PRIEST');
  const [adminUserEmail, setAdminUserEmail] = useState('');
  const [adminUserPassword, setAdminUserPassword] = useState('');
  const [adminUserFullName, setAdminUserFullName] = useState('');
  const [adminUserPhone, setAdminUserPhone] = useState('');
  const [adminUserNationalId, setAdminUserNationalId] = useState('');
  const [adminUserMsg, setAdminUserMsg] = useState<string | null>(null);

  // Trips & Conferences management states
  const [tripsList, setTripsList] = useState<any[]>([]);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [tripTitleAr, setTripTitleAr] = useState('');
  const [tripTitleEn, setTripTitleEn] = useState('');
  const [tripDescAr, setTripDescAr] = useState('');
  const [tripDescEn, setTripDescEn] = useState('');
  const [tripLocationAr, setTripLocationAr] = useState('');
  const [tripLocationEn, setTripLocationEn] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [tripPrice, setTripPrice] = useState('0');
  const [tripType, setTripType] = useState('TRIP');
  const [tripMsg, setTripMsg] = useState<string | null>(null);

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

      if (['SUPER_ADMIN', 'DEVELOPER', 'CHURCH_ADMIN', 'SECRETARY'].includes(parsedUser.role)) {
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

    if (activeTab === 'manage-roles') {
      fetch(`${API_URL}/admin-users/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) throw new Error('Unauthorized');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setAdminUsers(data);
        })
        .catch(err => console.log(err));
    }

    if (activeTab === 'action-logs') {
      fetch(`${API_URL}/admin-users/action-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) throw new Error('Unauthorized');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setActionLogs(data);
        })
        .catch(err => console.log(err));
    }

    if (activeTab === 'trips') {
      fetch(`${API_URL}/events`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTripsList(data.filter((e: any) => e.type === 'TRIP' || e.type === 'CONFERENCE'));
          }
        })
        .catch(err => console.log(err));
    }

    if (activeTab === 'manage-site-info') {
      fetch(`${API_URL}/settings`)
        .then(res => res.json())
        .then(data => {
          setImgHeroBg(data.img_hero_bg || '');
          setImgHistoric1(data.img_historic_1 || '');
          setImgHistoric2(data.img_historic_2 || '');
          setImgHistoric3(data.img_historic_3 || '');

          if (data.img_hero_bgs) {
            try {
              const parsed = JSON.parse(data.img_hero_bgs);
              if (Array.isArray(parsed)) setHeroBgs(parsed);
            } catch (e) {
              setHeroBgs(data.img_hero_bgs.split(',').filter(Boolean));
            }
          } else if (data.img_hero_bg) {
            setHeroBgs([data.img_hero_bg]);
          } else {
            setHeroBgs([]);
          }

          setAboutHistoryAr(data.about_history_ar || '');
          setAboutHistoryEn(data.about_history_en || '');
          setAboutMissionAr(data.about_mission_ar || '');
          setAboutMissionEn(data.about_mission_en || '');
          setAboutVisionAr(data.about_vision_ar || '');
          setAboutVisionEn(data.about_vision_en || '');

          setServicesTitleAr(data.services_title_ar || 'الخدمات الكنسية');
          setServicesTitleEn(data.services_title_en || 'Church Services');
          setServicesIntroAr(data.services_intro_ar || 'تضم كنيستنا العديد من الخدمات والأنشطة المباركة التي تخدم كل أفراد الأسرة من الأطفال إلى كبار السن.');
          setServicesIntroEn(data.services_intro_en || 'Our church offers various blessed ministries and activities designed to serve all family members from young children to seniors.');

          if (data.hasOwnProperty('church_services') && data.church_services !== undefined && data.church_services !== null) {
            try {
              const parsed = JSON.parse(data.church_services);
              if (Array.isArray(parsed)) {
                setChurchServices(parsed);
              } else {
                setChurchServices(defaultMinistries);
              }
            } catch (e) {
              setChurchServices(defaultMinistries);
            }
          } else {
            setChurchServices(defaultMinistries);
          }
        })
        .catch(err => console.log(err));
    }

    if (activeTab === 'manage-news') {
      fetch(`${API_URL}/news`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllNews(data);
        })
        .catch(err => console.log(err));
    }

    if (activeTab === 'member-messages') {
      fetch(`${API_URL}/contact`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401) throw new Error('Unauthorized');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setContactMessages(data);
        })
        .catch(err => console.log(err));
    }
  }, [activeTab, token, user]);

  const handleDeleteContactMessage = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الرسالة؟' : 'Are you sure you want to delete this message?')) return;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/contact/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setContactMessages(prev => prev.filter(m => m.id !== id));
      } else {
        alert('Failed to delete message.');
      }
    } catch (err) {
      console.log('Error deleting message:', err);
    }
  };

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

  const handleSaveSiteInfo = async (e: React.FormEvent) => {
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
          img_hero_bg: heroBgs[0] || imgHeroBg,
          img_hero_bgs: JSON.stringify(heroBgs),
          img_historic_1: imgHistoric1,
          img_historic_2: imgHistoric2,
          img_historic_3: imgHistoric3,
          about_history_ar: aboutHistoryAr,
          about_history_en: aboutHistoryEn,
          about_mission_ar: aboutMissionAr,
          about_mission_en: aboutMissionEn,
          about_vision_ar: aboutVisionAr,
          about_vision_en: aboutVisionEn,
          services_title_ar: servicesTitleAr,
          services_title_en: servicesTitleEn,
          services_intro_ar: servicesIntroAr,
          services_intro_en: servicesIntroEn,
          church_services: JSON.stringify(churchServices)
        })
      });

      if (res.ok) {
        setImagesMsg(language === 'ar' ? 'تم تحديث بيانات ومحتوى الموقع والخدمات بنجاح!' : 'Site content, services and configurations saved successfully!');
      } else {
        setImagesMsg('Failed to update settings.');
      }
    } catch (err) {
      setImagesMsg('Connection error.');
    }
  };

  const handleAddHeroBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(language === 'ar' ? 'حجم الصورة يجب أن لا يتجاوز 2 ميجابايت' : 'Image size must not exceed 2MB');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeroBgs(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOrUpdateService = () => {
    if (!serviceSlug || !serviceNameAr || !serviceNameEn) {
      alert(language === 'ar' ? 'يرجى إدخال Slug واسم الخدمة ثنائي اللغة.' : 'Please enter Slug and bilingual service name.');
      return;
    }

    const payload = {
      id: editingServiceId || Math.random().toString(36).substr(2, 9),
      slug: serviceSlug,
      nameAr: serviceNameAr,
      nameEn: serviceNameEn,
      goalAr: serviceGoalAr,
      goalEn: serviceGoalEn,
      scheduleAr: serviceScheduleAr,
      scheduleEn: serviceScheduleEn,
      image: serviceImage || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=400'
    };

    if (editingServiceId) {
      setChurchServices(prev => prev.map(s => s.id === editingServiceId ? payload : s));
    } else {
      setChurchServices(prev => [...prev, payload]);
    }

    setEditingServiceId(null);
    setServiceSlug('');
    setServiceNameAr('');
    setServiceNameEn('');
    setServiceGoalAr('');
    setServiceGoalEn('');
    setServiceScheduleAr('');
    setServiceScheduleEn('');
    setServiceImage('');
  };

  const handleEditServiceClick = (service: any) => {
    setEditingServiceId(service.id);
    setServiceSlug(service.slug);
    setServiceNameAr(service.nameAr);
    setServiceNameEn(service.nameEn);
    setServiceGoalAr(service.goalAr);
    setServiceGoalEn(service.goalEn);
    setServiceScheduleAr(service.scheduleAr);
    setServiceScheduleEn(service.scheduleEn);
    setServiceImage(service.image || '');
  };

  const handleDeleteServiceClick = (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الخدمة؟' : 'Are you sure you want to delete this service?')) return;
    setChurchServices(prev => prev.filter(s => s.id !== id));
  };

  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminUserMsg(null);

    if (!adminUserEmail || !adminUserPassword || !adminUserFullName || !adminUserRole) {
      setAdminUserMsg(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة.' : 'Please fill in all required fields.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/admin-users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: adminUserEmail,
          password: adminUserPassword,
          fullName: adminUserFullName,
          role: adminUserRole,
          phone: adminUserPhone || undefined,
          nationalId: adminUserNationalId || undefined,
          nameAr: priestNameAr || undefined,
          nameEn: priestNameEn || undefined,
          titleAr: priestTitleAr || undefined,
          titleEn: priestTitleEn || undefined,
          avatarUrl: priestAvatarUrl || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAdminUserMsg(language === 'ar' ? 'تم إنشاء الحساب بنجاح!' : 'Account created successfully!');
        setAdminUserEmail('');
        setAdminUserPassword('');
        setAdminUserFullName('');
        setAdminUserPhone('');
        setAdminUserNationalId('');
        setPriestNameAr('');
        setPriestNameEn('');
        setPriestAvatarUrl('');
        // Refresh list
        fetch(`${API_URL}/admin-users/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setAdminUsers(data);
          });
      } else {
        setAdminUserMsg(data.error || 'Failed to create account.');
      }
    } catch (err) {
      setAdminUserMsg('Error connecting to server.');
    }
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setTripMsg(null);

    if (!tripTitleAr || !tripTitleEn || !tripDate) {
      setTripMsg(language === 'ar' ? 'يرجى ملء جميع الحقول الإلزامية.' : 'Please fill in all required fields.');
      return;
    }

    const method = editingTripId ? 'PATCH' : 'POST';
    const url = editingTripId ? `${API_URL}/events/${editingTripId}` : `${API_URL}/events`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          titleAr: tripTitleAr,
          titleEn: tripTitleEn,
          descriptionAr: tripDescAr,
          descriptionEn: tripDescEn,
          locationAr: tripLocationAr,
          locationEn: tripLocationEn,
          date: tripDate,
          price: tripPrice ? parseFloat(tripPrice) : 0,
          type: tripType
        })
      });

      const result = await res.json();
      if (res.ok) {
        setTripMsg(editingTripId 
          ? (language === 'ar' ? 'تم تعديل الفعالية بنجاح!' : 'Event updated successfully!')
          : (language === 'ar' ? 'تمت إضافة الفعالية بنجاح!' : 'Event created successfully!')
        );
        setEditingTripId(null);
        setTripTitleAr('');
        setTripTitleEn('');
        setTripDescAr('');
        setTripDescEn('');
        setTripLocationAr('');
        setTripLocationEn('');
        setTripDate('');
        setTripPrice('0');
        setTripType('TRIP');

        // Refresh list
        fetch(`${API_URL}/events`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setTripsList(data.filter((e: any) => e.type === 'TRIP' || e.type === 'CONFERENCE'));
            }
          });
      } else {
        setTripMsg(result.error || 'Failed to save event.');
      }
    } catch (err) {
      setTripMsg('Connection error.');
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الرحلة/المؤتمر؟' : 'Are you sure you want to delete this trip/conference?')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setTripsList(prev => prev.filter(e => e.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete event.');
      }
    } catch (err) {
      alert('Connection error.');
    }
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsMsg(null);
    if (!token) return;
    if (!newsContent && !newsImageUrl) {
      setNewsMsg(language === 'ar' ? 'يجب إدخال نص الخبر أو صورة على الأقل.' : 'Must provide text or image.');
      return;
    }

    const method = editingNewsId ? 'PATCH' : 'POST';
    const url = editingNewsId ? `${API_URL}/news/${editingNewsId}` : `${API_URL}/news`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newsContent, imageUrl: newsImageUrl })
      });

      if (res.ok) {
        setNewsMsg(editingNewsId 
          ? (language === 'ar' ? 'تم تعديل الخبر بنجاح!' : 'News updated successfully!')
          : (language === 'ar' ? 'تم نشر الخبر بنجاح!' : 'News published successfully!')
        );
        setNewsContent('');
        setNewsImageUrl('');
        setEditingNewsId(null);
        // refresh news
        fetch(`${API_URL}/news`)
          .then(res => res.json())
          .then(data => { if (Array.isArray(data)) setAllNews(data); });
      } else {
        const result = await res.json();
        setNewsMsg(result.error || 'Failed to publish.');
      }
    } catch (err) {
      setNewsMsg('Connection error.');
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الخبر؟' : 'Are you sure you want to delete this news?')) return;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/news/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAllNews(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.log(err);
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
            className="dashboard-tab-btn"
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

        {/* NON-MEMBER Shared tab options */}
        {user?.role && user.role !== 'MEMBER' && (
          <button 
            className="dashboard-tab-btn"
            onClick={() => setActiveTab('manage-news')}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: activeTab === 'manage-news' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'manage-news' ? '#000000' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            <FileText size={16} style={{ verticalAlign: 'middle', marginInlineEnd: '6px' }} />
            {language === 'ar' ? 'إدارة الأخبار' : 'Manage News'}
          </button>
        )}

        {/* PRIEST / BISHOP tab options */}
        {['PRIEST', 'BISHOP'].includes(user?.role) && (
          <button 
            className="dashboard-tab-btn"
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
        {['SUPER_ADMIN', 'DEVELOPER', 'CHURCH_ADMIN', 'SECRETARY'].includes(user?.role) && (
          <>
            <button 
              className="dashboard-tab-btn"
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
              className="dashboard-tab-btn"
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
              className="dashboard-tab-btn"
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
            {['SUPER_ADMIN', 'DEVELOPER'].includes(user?.role) && (
              <>
                <button 
                  className="dashboard-tab-btn"
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
                  className="dashboard-tab-btn"
                  onClick={() => setActiveTab('manage-roles')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: activeTab === 'manage-roles' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                    color: activeTab === 'manage-roles' ? '#000000' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}
                >
                  {language === 'ar' ? 'إدارة الرتب والمستخدمين' : 'Manage Role Accounts'}
                </button>
                <button 
                  className="dashboard-tab-btn"
                  onClick={() => setActiveTab('action-logs')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: activeTab === 'action-logs' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                    color: activeTab === 'action-logs' ? '#000000' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}
                >
                  {language === 'ar' ? 'سجل العمليات' : 'Action Logs'}
                </button>
              </>
            )}
          </>
        )}

        {/* Site Settings & Member Messages tab selection (visible to all admin and priest roles, except TRIP_MANAGER/MEMBER) */}
        {['SUPER_ADMIN', 'DEVELOPER', 'CHURCH_ADMIN', 'SECRETARY', 'PRIEST', 'BISHOP'].includes(user?.role) && (
          <>
            <button 
              className="dashboard-tab-btn"
              onClick={() => setActiveTab('manage-site-info')}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: activeTab === 'manage-site-info' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: activeTab === 'manage-site-info' ? '#000000' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              {language === 'ar' ? 'محتوى وإعدادات الموقع' : 'Manage Site & Services'}
            </button>
            <button 
              className="dashboard-tab-btn"
              onClick={() => setActiveTab('member-messages')}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: activeTab === 'member-messages' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: activeTab === 'member-messages' ? '#000000' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              {language === 'ar' ? 'رسائل الأعضاء' : 'Member Messages'}
            </button>
          </>
        )}

        {/* TRIP MANAGER Tab Options */}
        {user?.role === 'TRIP_MANAGER' && (
          <button 
            className="dashboard-tab-btn"
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
          <div className="dashboard-panel">
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
          <div className="dashboard-panel">
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
        <div className="dashboard-panel">
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
          <div className="dashboard-panel">
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
                      
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
          <div className="dashboard-panel">
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              🗂️ {language === 'ar' ? 'جميع العائلات المسجلة بقاعدة البيانات' : 'All Registered Families Database'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-color)', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
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
        <div className="dashboard-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
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
        <div className="dashboard-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Create/Edit Trip/Conference Form */}
          <div className="dashboard-panel">
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              ✈️ {editingTripId 
                ? (language === 'ar' ? 'تعديل الرحلة/المؤتمر' : 'Edit Trip/Conference') 
                : (language === 'ar' ? 'إضافة رحلة أو مؤتمر جديد' : 'Add New Trip/Conference')}
            </h3>

            {tripMsg && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(226, 183, 20, 0.05)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                {tripMsg}
              </div>
            )}

            <form onSubmit={handleSaveTrip} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="grid-2-col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'العنوان (عربي) *' : 'Title (Arabic) *'}</label>
                  <input type="text" required value={tripTitleAr} onChange={e => setTripTitleAr(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'العنوان (إنجليزي) *' : 'Title (English) *'}</label>
                  <input type="text" required value={tripTitleEn} onChange={e => setTripTitleEn(e.target.value)} className={styles.formInput} />
                </div>
              </div>

              <div className="grid-2-col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}</label>
                  <textarea value={tripDescAr} onChange={e => setTripDescAr(e.target.value)} className={styles.formInput} style={{ height: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}</label>
                  <textarea value={tripDescEn} onChange={e => setTripDescEn(e.target.value)} className={styles.formInput} style={{ height: '80px', resize: 'vertical' }} />
                </div>
              </div>

              <div className="grid-2-col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الموقع (عربي)' : 'Location (Arabic)'}</label>
                  <input type="text" value={tripLocationAr} onChange={e => setTripLocationAr(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الموقع (إنجليزي)' : 'Location (English)'}</label>
                  <input type="text" value={tripLocationEn} onChange={e => setTripLocationEn(e.target.value)} className={styles.formInput} />
                </div>
              </div>

              <div className="grid-2-col" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'التاريخ *' : 'Date *'}</label>
                  <input type="date" required value={tripDate} onChange={e => setTripDate(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'السعر (ج.م)' : 'Price (EGP)'}</label>
                  <input type="number" step="any" value={tripPrice} onChange={e => setTripPrice(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'النوع *' : 'Type *'}</label>
                  <select value={tripType} onChange={e => setTripType(e.target.value)} className={styles.formInput}>
                    <option value="TRIP">{language === 'ar' ? 'رحلة' : 'Trip'}</option>
                    <option value="CONFERENCE">{language === 'ar' ? 'مؤتمر كنسي' : 'Conference'}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="submit" className={styles.bookBtn} style={{ width: '180px' }}>
                  {editingTripId ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (language === 'ar' ? 'إضافة الفعالية' : 'Add Event')}
                </button>
                {editingTripId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingTripId(null);
                      setTripTitleAr('');
                      setTripTitleEn('');
                      setTripDescAr('');
                      setTripDescEn('');
                      setTripLocationAr('');
                      setTripLocationEn('');
                      setTripDate('');
                      setTripPrice('0');
                      setTripType('TRIP');
                    }}
                    style={{ padding: '10px 20px', backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Trips List Panel */}
          <div className="dashboard-panel">
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              📋 {language === 'ar' ? 'قائمة الرحلات والمؤتمرات الحالية' : 'Current Trips & Conferences'}
            </h3>

            {tripsList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tripsList.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1.2rem', borderRadius: '6px', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', backgroundColor: 'rgba(226,183,20,0.1)', color: 'var(--accent-gold)', borderRadius: '4px', fontWeight: 'bold' }}>
                          {t.type === 'TRIP' ? (language === 'ar' ? 'رحلة' : 'Trip') : (language === 'ar' ? 'مؤتمر' : 'Conference')}
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                          {language === 'ar' ? t.titleAr : t.titleEn}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {language === 'ar' ? t.descriptionAr : t.descriptionEn}
                      </p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        📅 {new Date(t.date).toLocaleDateString()} • 📍 {language === 'ar' ? t.locationAr : t.locationEn} • 💰 {t.price} {language === 'ar' ? 'ج.م' : 'EGP'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => {
                          setEditingTripId(t.id);
                          setTripTitleAr(t.titleAr);
                          setTripTitleEn(t.titleEn);
                          setTripDescAr(t.descriptionAr || '');
                          setTripDescEn(t.descriptionEn || '');
                          setTripLocationAr(t.locationAr || '');
                          setTripLocationEn(t.locationEn || '');
                          setTripDate(t.date.split('T')[0]);
                          setTripPrice(String(t.price));
                          setTripType(t.type);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{ backgroundColor: 'var(--accent-gold)', color: '#000000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                      <button 
                        onClick={() => handleDeleteTrip(t.id)}
                        style={{ backgroundColor: '#ff4d4d', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                {language === 'ar' ? 'لا توجد رحلات أو مؤتمرات مضافة حالياً.' : 'No trips or conferences added yet.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Manage Role Accounts */}
      {activeTab === 'manage-roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Create User Form */}
          <div className="dashboard-panel">
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              👤 {language === 'ar' ? 'إنشاء حساب جديد وتعيين رتبة' : 'Create Role Account'}
            </h3>

            {adminUserMsg && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(226, 183, 20, 0.05)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                {adminUserMsg}
              </div>
            )}

            <form onSubmit={handleCreateAdminUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="grid-2-col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}</label>
                  <input type="text" required value={adminUserFullName} onChange={e => setAdminUserFullName(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'البريد الإلكتروني (الرتبة) *' : 'Email Address *'}</label>
                  <input type="text" required value={adminUserEmail} onChange={e => setAdminUserEmail(e.target.value)} className={styles.formInput} placeholder="name@church.org" />
                </div>
              </div>

              <div className="grid-2-col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'كلمة المرور *' : 'Password *'}</label>
                  <input type="password" required value={adminUserPassword} onChange={e => setAdminUserPassword(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الرتبة / الدور *' : 'Role *'}</label>
                  <select value={adminUserRole} onChange={e => setAdminUserRole(e.target.value)} className={styles.formInput}>
                    <option value="PRIEST">{language === 'ar' ? 'كاهن' : 'Priest'}</option>
                    <option value="BISHOP">{language === 'ar' ? 'أسقف (سيدنا)' : 'Bishop'}</option>
                    <option value="CHURCH_ADMIN">{language === 'ar' ? 'أدمن' : 'Admin'}</option>
                    <option value="TRIP_MANAGER">{language === 'ar' ? 'مسؤول رحلات' : 'Trip Manager'}</option>
                    <option value="SECRETARY">{language === 'ar' ? 'سكرتير' : 'Secretary'}</option>
                    <option value="SUPER_ADMIN">{language === 'ar' ? 'أدمن عام' : 'Super Admin'}</option>
                    <option value="DEVELOPER">{language === 'ar' ? 'مطور النظام (Developer)' : 'Developer'}</option>
                  </select>
                </div>
              </div>

              <div className="grid-2-col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
                  <input type="text" value={adminUserPhone} onChange={e => setAdminUserPhone(e.target.value)} className={styles.formInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الرقم القومي (اختياري)' : 'National ID (Optional)'}</label>
                  <input type="text" maxLength={14} value={adminUserNationalId} onChange={e => setAdminUserNationalId(e.target.value)} className={styles.formInput} />
                </div>
              </div>

              {/* If Priest or Bishop, render profile details */}
              {['PRIEST', 'BISHOP'].includes(adminUserRole) && (
                <div style={{ border: '1px solid var(--border-color)', padding: '1.2rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', backgroundColor: 'var(--bg-card)' }}>
                  <h4 style={{ color: 'var(--accent-gold)', fontSize: '0.9rem' }}>ℹ️ {language === 'ar' ? 'تفاصيل ملف الكاهن / الأسقف المساعد' : 'Priest / Bishop Profile Details'}</h4>
                  <div className="grid-2-col">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الاسم بالطقوس (عربي) *' : 'Ecclesiastical Name (Arabic) *'}</label>
                      <input type="text" value={priestNameAr} onChange={e => setPriestNameAr(e.target.value)} className={styles.formInput} placeholder="مثال: القمص يوحنا كمال" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الاسم بالطقوس (إنجليزي) *' : 'Ecclesiastical Name (English) *'}</label>
                      <input type="text" value={priestNameEn} onChange={e => setPriestNameEn(e.target.value)} className={styles.formInput} placeholder="Fr. John Kamal" />
                    </div>
                  </div>
                  <div className="grid-2-col">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'اللقب (عربي)' : 'Title (Arabic)'}</label>
                      <input type="text" value={priestTitleAr} onChange={e => setPriestTitleAr(e.target.value)} className={styles.formInput} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'اللقب (إنجليزي)' : 'Title (English)'}</label>
                      <input type="text" value={priestTitleEn} onChange={e => setPriestTitleEn(e.target.value)} className={styles.formInput} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'رابط الصورة الرمزية (اختياري)' : 'Avatar URL (Optional)'}</label>
                    <input type="text" value={priestAvatarUrl} onChange={e => setPriestAvatarUrl(e.target.value)} className={styles.formInput} />
                  </div>
                </div>
              )}

              <button type="submit" className={styles.bookBtn} style={{ marginTop: '0.8rem', width: '200px' }}>
                {language === 'ar' ? 'إنشاء الحساب' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* List of current admin roles */}
          <div className="dashboard-panel">
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              👥 {language === 'ar' ? 'سجل أصحاب الرتب والمسؤولين' : 'Administrative Roles Directory'}
            </h3>

            {adminUsers.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'start' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--accent-gold)' }}>
                      <th style={{ padding: '10px', textAlign: 'inherit' }}>{language === 'ar' ? 'الاسم بالكامل' : 'Full Name'}</th>
                      <th style={{ padding: '10px', textAlign: 'inherit' }}>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                      <th style={{ padding: '10px', textAlign: 'inherit' }}>{language === 'ar' ? 'الرتبة' : 'Role'}</th>
                      <th style={{ padding: '10px', textAlign: 'inherit' }}>{language === 'ar' ? 'الهاتف' : 'Phone'}</th>
                      <th style={{ padding: '10px', textAlign: 'inherit' }}>{language === 'ar' ? 'الرقم القومي' : 'National ID'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px' }}>{u.fullName}</td>
                        <td style={{ padding: '10px' }}>{u.email}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: 'var(--accent-gold)' }}>{u.role}</td>
                        <td style={{ padding: '10px' }}>{u.phone || 'N/A'}</td>
                        <td style={{ padding: '10px' }}>{u.nationalId || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                {language === 'ar' ? 'لا يوجد أصحاب رتب مسجلين.' : 'No admin roles registered.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Action Logs */}
      {activeTab === 'action-logs' && (
        <div className="dashboard-panel">
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
            📋 {language === 'ar' ? 'سجل العمليات والعمليات الإدارية' : 'System Operations Action Log'}
          </h3>

          {actionLogs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'start' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--accent-gold)' }}>
                    <th style={{ padding: '8px', textAlign: 'inherit', width: '160px' }}>{language === 'ar' ? 'التوقيت' : 'Time'}</th>
                    <th style={{ padding: '8px', textAlign: 'inherit', width: '180px' }}>{language === 'ar' ? 'المسؤول' : 'User'}</th>
                    <th style={{ padding: '8px', textAlign: 'inherit', width: '160px' }}>{language === 'ar' ? 'العملية' : 'Action'}</th>
                    <th style={{ padding: '8px', textAlign: 'inherit' }}>{language === 'ar' ? 'التفاصيل' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody>
                  {actionLogs.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{new Date(l.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '8px' }}>
                        <b>{l.userName}</b> <br />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{l.userEmail}</span>
                      </td>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '2px 6px', 
                          backgroundColor: l.action.startsWith('AUTO_') ? 'rgba(52, 152, 219, 0.1)' : 'rgba(226, 183, 20, 0.1)', 
                          color: l.action.startsWith('AUTO_') ? 'var(--accent-blue)' : 'var(--accent-gold)', 
                          borderRadius: '4px' 
                        }}>
                          {l.action}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
              {language === 'ar' ? 'سجل العمليات فارغ حالياً.' : 'No operations logged yet.'}
            </p>
          )}
        </div>
      )}

      {/* Tab: Super Admin Priest Management */}
      {activeTab === 'manage-priests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div className="dashboard-panel">
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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="file" accept="image/*" onChange={e => handleFileChange(e, setPriestAvatarUrl)} className={styles.formInput} style={{ padding: '6px', flex: 1 }} />
                    <button type="button" onClick={() => setPriestAvatarUrl('')} style={{ padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: '4px', cursor: 'pointer' }}>{language === 'ar' ? 'مسح' : 'Clear'}</button>
                  </div>
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

      {/* Tab: Super Admin Site Content, Images & Services Management */}
      {activeTab === 'manage-site-info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Main Save Status Banner */}
          {imagesMsg && (
            <div style={{
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              border: '1px solid var(--accent-green)',
              color: '#2ecc71',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}>
              {imagesMsg}
            </div>
          )}

          <form onSubmit={handleSaveSiteInfo} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* PANEL 1: HERO & GALLERY IMAGES */}
            <div className="dashboard-panel">
              <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                🖼️ {language === 'ar' ? 'إدارة صور الموقع وخلفيات العرض المتغيرة' : 'Manage Global Site Images & Hero Backgrounds'}
              </h3>
              
              {/* Multi Hero BG section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {language === 'ar' ? 'صور الخلفية الدوارة للهيرو (Hero Background Slider)' : 'Hero Slider Background Images'}
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {heroBgs.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '120px', height: '80px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img src={url} alt="Hero BG" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => setHeroBgs(prev => prev.filter((_, i) => i !== idx))}
                        style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(255, 77, 77, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {heroBgs.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {language === 'ar' ? 'لا توجد صور مخصصة حالياً، سيتم استخدام الخلفية الافتراضية.' : 'No custom images added. Falling back to default.'}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="file" accept="image/*" onChange={handleAddHeroBg} className={styles.formInput} style={{ padding: '8px', flex: 1 }} />
                  <button type="button" onClick={() => setHeroBgs([])} style={{ padding: '8px 12px', backgroundColor: 'var(--bg-card)', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: '4px', cursor: 'pointer' }}>
                    {language === 'ar' ? 'مسح الكل' : 'Clear All'}
                  </button>
                </div>
              </div>

              {/* Historic Images */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
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
              </div>
            </div>

            {/* PANEL 2: ABOUT THE CHURCH CONTENT */}
            <div className="dashboard-panel">
              <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                ⛪ {language === 'ar' ? 'إدارة نصوص صفحة عن الكنيسة' : 'Manage "About the Church" Texts'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="grid-2-col">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تاريخ الكنيسة (عربي)' : 'Church History (Arabic)'}</label>
                    <textarea value={aboutHistoryAr} onChange={e => setAboutHistoryAr(e.target.value)} className={styles.formInput} style={{ height: '100px', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تاريخ الكنيسة (إنجليزي)' : 'Church History (English)'}</label>
                    <textarea value={aboutHistoryEn} onChange={e => setAboutHistoryEn(e.target.value)} className={styles.formInput} style={{ height: '100px', resize: 'vertical' }} />
                  </div>
                </div>

                <div className="grid-2-col">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'رؤيتنا الروحية (عربي)' : 'Our Vision (Arabic)'}</label>
                    <textarea value={aboutVisionAr} onChange={e => setAboutVisionAr(e.target.value)} className={styles.formInput} style={{ height: '80px', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'رؤيتنا الروحية (إنجليزي)' : 'Our Vision (English)'}</label>
                    <textarea value={aboutVisionEn} onChange={e => setAboutVisionEn(e.target.value)} className={styles.formInput} style={{ height: '80px', resize: 'vertical' }} />
                  </div>
                </div>

                <div className="grid-2-col">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'رسالتنا الرعوية (عربي)' : 'Our Mission (Arabic)'}</label>
                    <textarea value={aboutMissionAr} onChange={e => setAboutMissionAr(e.target.value)} className={styles.formInput} style={{ height: '80px', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'رسالتنا الرعوية (إنجليزي)' : 'Our Mission (English)'}</label>
                    <textarea value={aboutMissionEn} onChange={e => setAboutMissionEn(e.target.value)} className={styles.formInput} style={{ height: '80px', resize: 'vertical' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL 2.5: SERVICES PAGE HEADER CONTENT */}
            <div className="dashboard-panel">
              <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                🤝 {language === 'ar' ? 'إدارة مقدمة صفحة الخدمات الكنسية' : 'Manage Services Page Header & Intro'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="grid-2-col">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عنوان صفحة الخدمات (عربي)' : 'Services Page Title (Arabic)'}</label>
                    <input type="text" value={servicesTitleAr} onChange={e => setServicesTitleAr(e.target.value)} className={styles.formInput} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عنوان صفحة الخدمات (إنجليزي)' : 'Services Page Title (English)'}</label>
                    <input type="text" value={servicesTitleEn} onChange={e => setServicesTitleEn(e.target.value)} className={styles.formInput} />
                  </div>
                </div>

                <div className="grid-2-col">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مقدمة صفحة الخدمات (عربي)' : 'Services Page Intro (Arabic)'}</label>
                    <textarea value={servicesIntroAr} onChange={e => setServicesIntroAr(e.target.value)} className={styles.formInput} style={{ height: '80px', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مقدمة صفحة الخدمات (إنجليزي)' : 'Services Page Intro (English)'}</label>
                    <textarea value={servicesIntroEn} onChange={e => setServicesIntroEn(e.target.value)} className={styles.formInput} style={{ height: '80px', resize: 'vertical' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL 3: CHURCH SERVICES (MINISTRIES) */}
            <div className="dashboard-panel">
              <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                🤝 {language === 'ar' ? 'إدارة الخدمات الكنسية والاجتماعات' : 'Manage Church Services & Ministries'}
              </h3>

              {/* Sub-form to Add/Edit a Service */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--bg-card)' }}>
                <h4 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', fontSize: '1rem' }}>
                  {editingServiceId ? (language === 'ar' ? '📝 تعديل الخدمة المحددة' : '📝 Edit Selected Service') : (language === 'ar' ? '➕ إضافة خدمة جديدة' : '➕ Add New Service')}
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Slug (Unique ID, e.g. youth, choir)</label>
                    <input type="text" value={serviceSlug} onChange={e => setServiceSlug(e.target.value)} className={styles.formInput} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Name (Arabic) *</label>
                    <input type="text" value={serviceNameAr} onChange={e => setServiceNameAr(e.target.value)} className={styles.formInput} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Name (English) *</label>
                    <input type="text" value={serviceNameEn} onChange={e => setServiceNameEn(e.target.value)} className={styles.formInput} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Schedule (Arabic)</label>
                    <input type="text" value={serviceScheduleAr} onChange={e => setServiceScheduleAr(e.target.value)} className={styles.formInput} placeholder="خميس 7:00 م" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Schedule (English)</label>
                    <input type="text" value={serviceScheduleEn} onChange={e => setServiceScheduleEn(e.target.value)} className={styles.formInput} placeholder="Thursday 7:00 PM" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Service Image</label>
                    <input type="file" accept="image/*" onChange={e => handleFileChange(e, setServiceImage)} className={styles.formInput} style={{ padding: '6px' }} />
                  </div>
                </div>

                <div className="grid-2-col" style={{ marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description/Goal (Arabic)</label>
                    <textarea value={serviceGoalAr} onChange={e => setServiceGoalAr(e.target.value)} className={styles.formInput} style={{ height: '60px', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description/Goal (English)</label>
                    <textarea value={serviceGoalEn} onChange={e => setServiceGoalEn(e.target.value)} className={styles.formInput} style={{ height: '60px', resize: 'vertical' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  {editingServiceId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingServiceId(null);
                        setServiceSlug('');
                        setServiceNameAr('');
                        setServiceNameEn('');
                        setServiceGoalAr('');
                        setServiceGoalEn('');
                        setServiceScheduleAr('');
                        setServiceScheduleEn('');
                        setServiceImage('');
                      }} 
                      style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={handleAddOrUpdateService} 
                    className={styles.bookBtn} 
                    style={{ width: 'auto', padding: '6px 20px', fontSize: '0.85rem' }}
                  >
                    {editingServiceId ? (language === 'ar' ? 'تحديث الخدمة في القائمة' : 'Update in List') : (language === 'ar' ? 'إضافة للقائمة مؤقتاً' : 'Add to List')}
                  </button>
                </div>
              </div>

              {/* Current Services List */}
              <label style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                {language === 'ar' ? 'قائمة الخدمات المضافة حالياً (يجب الضغط على زر الحفظ بالأسفل لتثبيت التغييرات)' : 'List of Services (Click Save Site Info below to apply changes)'}
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {churchServices.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-color)', alignItems: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '6px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {s.image && <img src={s.image} alt="Service" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                      <div>
                        <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                          {language === 'ar' ? s.nameAr : s.nameEn}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginInlineStart: '10px' }}>
                          ({s.slug})
                        </span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          🕒 {language === 'ar' ? s.scheduleAr : s.scheduleEn}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => handleEditServiceClick(s)} style={{ backgroundColor: 'var(--accent-gold)', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                      <button type="button" onClick={() => handleDeleteServiceClick(s.id)} style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
                {churchServices.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {language === 'ar' ? 'لا توجد خدمات كنسية مضافة.' : 'No church services added.'}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom main save button */}
            <button type="submit" className={styles.bookBtn} style={{ padding: '14px 40px', fontSize: '1.1rem', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(226,183,20,0.3)', width: 'auto', alignSelf: 'center' }}>
              💾 {language === 'ar' ? 'حفظ إعدادات ومحتوى الموقع بالكامل' : 'Save All Site Content'}
            </button>

          </form>
        </div>
      )}

      {/* Tab: Manage News */}
      {activeTab === 'manage-news' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div className="dashboard-panel">
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              📰 {editingNewsId 
                ? (language === 'ar' ? 'تعديل الخبر المحدد' : 'Edit Selected News') 
                : (language === 'ar' ? 'نشر خبر جديد' : 'Post New News')}
            </h3>

            {newsMsg && (
              <div style={{
                backgroundColor: 'rgba(226, 183, 20, 0.05)',
                border: '1px solid var(--accent-gold)',
                color: 'var(--accent-gold)',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                {newsMsg}
              </div>
            )}

            <form onSubmit={handleSaveNews} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'محتوى الخبر' : 'News Content'}</label>
                <textarea
                  value={newsContent}
                  onChange={e => setNewsContent(e.target.value)}
                  className={styles.formInput}
                  style={{ height: '100px', resize: 'vertical' }}
                  placeholder={language === 'ar' ? 'اكتب تفاصيل الخبر هنا...' : 'Write news details here...'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'صورة مرفقة (اختياري)' : 'Attached Image (Optional)'}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="file" accept="image/*" onChange={e => handleFileChange(e, setNewsImageUrl)} className={styles.formInput} style={{ padding: '8px', flex: 1 }} />
                  <button type="button" onClick={() => setNewsImageUrl('')} style={{ padding: '8px 12px', backgroundColor: 'var(--bg-card)', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: '4px', cursor: 'pointer' }}>{language === 'ar' ? 'مسح' : 'Clear'}</button>
                </div>
                {newsImageUrl && <img src={newsImageUrl} alt="Preview" style={{ height: '120px', objectFit: 'contain', borderRadius: '4px', marginTop: '4px', alignSelf: 'flex-start' }} />}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className={styles.bookBtn} style={{ marginTop: '10px', width: '200px' }}>
                  {editingNewsId ? (language === 'ar' ? 'حفظ التعديل' : 'Save Changes') : (language === 'ar' ? 'نشر الخبر' : 'Publish News')}
                </button>
                {editingNewsId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingNewsId(null);
                      setNewsContent('');
                      setNewsImageUrl('');
                    }}
                    style={{ marginTop: '10px', padding: '10px 20px', backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="dashboard-panel">
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              📰 {language === 'ar' ? 'أخبار الكنيسة الحالية' : 'Current Church News'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {allNews.map(n => (
                <div key={n.id} style={{ display: 'flex', flexDirection: 'column', padding: '15px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--accent-gold)' }}>
                        {n.author?.fullName} ({n.author?.role})
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        📅 {new Date(n.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => {
                        setEditingNewsId(n.id);
                        setNewsContent(n.content || '');
                        setNewsImageUrl(n.imageUrl || '');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} style={{ backgroundColor: 'var(--accent-gold)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                      <button onClick={() => handleDeleteNews(n.id)} style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  {n.content && <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', marginBottom: n.imageUrl ? '10px' : '0' }}>{n.content}</p>}
                  {n.imageUrl && <img src={n.imageUrl} alt="News" style={{ maxHeight: '200px', objectFit: 'contain', alignSelf: 'flex-start', borderRadius: '4px' }} />}
                </div>
              ))}
              {allNews.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{language === 'ar' ? 'لا توجد أخبار حالياً.' : 'No news posted currently.'}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Member Messages */}
      {activeTab === 'member-messages' && (
        <div className="dashboard-panel">
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
            📬 {language === 'ar' ? 'رسائل واستفسارات الأعضاء' : 'Member Messages & Inquiries'}
          </h3>

          {contactMessages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {contactMessages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', padding: '15px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{msg.name}</span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        ✉️ {msg.email} • 📞 {msg.phone} <br />
                        📅 {new Date(msg.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteContactMessage(msg.id)} 
                      style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                    >
                      {language === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '5px' }}>
                    <b style={{ color: 'var(--accent-gold)', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>
                      {language === 'ar' ? 'الموضوع: ' : 'Subject: '} {msg.subject}
                    </b>
                    <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: '1.5', color: 'var(--text-primary)' }}>{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
              {language === 'ar' ? 'لا توجد رسائل واردة حالياً.' : 'No incoming messages currently.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
