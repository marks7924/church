'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../components/ThemeContext';
import styles from '../page.module.css';
import { API_URL } from '../../config';
import { formatTimeSlot, formatDateTime } from '../../utils/format';
import { 
  User, Check, X, ShieldAlert, Radio, Bell, Users, 
  Calendar, CheckCircle, HelpCircle, ArrowRight, Video, FileText, ChevronDown, Scissors, Clock, Sparkles, MessageSquare,
  Facebook, Mail, QrCode
} from 'lucide-react';
import PriestScheduleManager from '../../components/PriestScheduleManager';
import ImageCropModal from '../../components/ImageCropModal';
import AdminAiManager from '../../components/AdminAiManager';
import FacebookNewsModerator from '../../components/FacebookNewsModerator';
import AdminEmailCenter from '../../components/AdminEmailCenter';
import EventsInvitationsManager from '../../components/EventsInvitationsManager';
import FyQuestionModerator from '../../components/FyQuestionModerator';
import VipInvitationCard from '../../components/VipInvitationCard';

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
  const [isMobileTabMenuOpen, setIsMobileTabMenuOpen] = useState(false);

  // Data states
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [priestBookings, setPriestBookings] = useState<Booking[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingProfile[]>([]);
  const [allMembers, setAllMembers] = useState<PendingProfile[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [myInvitations, setMyInvitations] = useState<any[]>([]);
  
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
  const [priestBuffer, setPriestBuffer] = useState('5');
  const [priestConfessionDuration, setPriestConfessionDuration] = useState('15');
  const [priestAvailability, setPriestAvailability] = useState('{"recurring":[], "specific":[]}');
  const [priestMsg, setPriestMsg] = useState<string | null>(null);
  const [priestConfessionStatus, setPriestConfessionStatus] = useState<'ACTIVE' | 'TRAVELING' | 'INACTIVE'>('ACTIVE');
  const [priestConfessionStatusNote, setPriestConfessionStatusNote] = useState('');
  const [priestNoFixedSchedule, setPriestNoFixedSchedule] = useState(false);

  // Priest Self-Schedule States
  const [myConfessionStatus, setMyConfessionStatus] = useState<'ACTIVE' | 'TRAVELING' | 'INACTIVE'>('ACTIVE');
  const [myConfessionStatusNote, setMyConfessionStatusNote] = useState('');
  const [myNoFixedSchedule, setMyNoFixedSchedule] = useState(false);
  const [myAvailability, setMyAvailability] = useState('{"recurring":[], "specific":[]}');
  const [myMaxBookings, setMyMaxBookings] = useState('5');
  const [myBufferMinutes, setMyBufferMinutes] = useState('5');
  const [myConfessionDuration, setMyConfessionDuration] = useState('15');
  const [myAvatarUrl, setMyAvatarUrl] = useState('');
  const [myScheduleMsg, setMyScheduleMsg] = useState<string | null>(null);

  // Trip Bookings State & Filters (for Trip Manager & Admins)
  const [allTripBookings, setAllTripBookings] = useState<any[]>([]);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [tripFilter, setTripFilter] = useState('ALL');
  const [tripStatusFilter, setTripStatusFilter] = useState('ALL');
  const [tripSearchFilter, setTripSearchFilter] = useState('');

  // Save Animations feedback states
  const [savedPriest, setSavedPriest] = useState(false);
  const [savedMySchedule, setSavedMySchedule] = useState(false);
  const [savedLive, setSavedLive] = useState(false);
  const [savedSiteInfo, setSavedSiteInfo] = useState(false);
  const [savedNews, setSavedNews] = useState(false);
  const [savedTrip, setSavedTrip] = useState(false);

  // Image Cropper Modal states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropTargetImage, setCropTargetImage] = useState('');
  const [cropPreset, setCropPreset] = useState<'circle' | '1:1' | '16:9' | '4:3' | 'free'>('free');
  const [cropCallback, setCropCallback] = useState<(croppedUrl: string) => void>(() => () => {});

  const openImageCropper = (imageUrl: string, preset: 'circle' | '1:1' | '16:9' | '4:3' | 'free', onDone: (url: string) => void) => {
    if (!imageUrl) {
      alert(language === 'ar' ? 'يرجى اختيار صورة أولاً لقصها.' : 'Please select an image first to crop.');
      return;
    }
    setCropTargetImage(imageUrl);
    setCropPreset(preset);
    setCropCallback(() => onDone);
    setCropModalOpen(true);
  };

  const triggerEditScrollAndHighlight = (elementId: string) => {
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('edit-highlight-target');
        void el.offsetWidth;
        el.classList.add('edit-highlight-target');
      }
    }, 100);
  };

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
  const [serviceCategory, setServiceCategory] = useState<'تربية كنسية' | 'ألحان' | 'كشافة' | 'كورال' | 'أخرى' | string>('تربية كنسية');
  const [serviceNameAr, setServiceNameAr] = useState('');
  const [serviceNameEn, setServiceNameEn] = useState('');
  const [serviceGoalAr, setServiceGoalAr] = useState('');
  const [serviceGoalEn, setServiceGoalEn] = useState('');
  const [serviceScheduleAr, setServiceScheduleAr] = useState('');
  const [serviceScheduleEn, setServiceScheduleEn] = useState('');
  const [serviceImage, setServiceImage] = useState('');
  const [serviceStages, setServiceStages] = useState<any[]>([]);
  const [newStageNameAr, setNewStageNameAr] = useState('');
  const [newStageNameEn, setNewStageNameEn] = useState('');
  const [newStageScheduleAr, setNewStageScheduleAr] = useState('');
  const [newStageScheduleEn, setNewStageScheduleEn] = useState('');
  const [newStageLocationAr, setNewStageLocationAr] = useState('');

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
  const [tripSubTab, setTripSubTab] = useState<'bookings' | 'trips' | 'form'>('bookings');

  const getAvailableTabs = () => {
    if (!user) return [];
    const role = user.role;
    const tabs = [];

    // Member Tab
    if (role === 'MEMBER') {
      tabs.push({
        id: 'my-profile',
        labelAr: 'حسابي وعضويتي',
        labelEn: 'My Profile & Status',
        icon: <User size={16} />
      });
      tabs.push({
        id: 'my-invitations',
        labelAr: language === 'ar' ? 'دعواتي الرسمية (VIP)' : 'My Official Invitations',
        labelEn: language === 'ar' ? 'دعواتي الرسمية (VIP)' : 'My Official Invitations',
        icon: <QrCode size={16} />
      });
    }

    // Non-member News Tab
    if (role && role !== 'MEMBER') {
      tabs.push({
        id: 'manage-news',
        labelAr: 'إدارة الأخبار',
        labelEn: 'Manage News',
        icon: <FileText size={16} />
      });
    }

    // Priest / Bishop Booking requests and Schedule Tab
    if (['PRIEST', 'BISHOP'].includes(role)) {
      tabs.push({
        id: 'my-schedule',
        labelAr: language === 'ar' ? 'مواعيد اعترافاتي وحالتي' : 'My Confession Schedule',
        labelEn: language === 'ar' ? 'مواعيد اعترافاتي وحالتي' : 'My Confession Schedule',
        icon: <Calendar size={16} />
      });
      tabs.push({
        id: 'confessions',
        labelAr: t('booking_requests'),
        labelEn: t('booking_requests'),
        icon: <Calendar size={16} />
      });
    }

    // Admin / Secretary / SuperAdmin / Developer tabs
    if (['SUPER_ADMIN', 'DEVELOPER', 'CHURCH_ADMIN', 'SECRETARY'].includes(role)) {
      tabs.push({
        id: 'members',
        labelAr: t('manage_members'),
        labelEn: t('manage_members'),
        icon: <Users size={16} />
      });
      tabs.push({
        id: 'live',
        labelAr: t('manage_live'),
        labelEn: t('manage_live'),
        icon: <Radio size={16} />
      });
      tabs.push({
        id: 'push-alerts',
        labelAr: language === 'ar' ? 'إرسال إشعار جماعي' : 'Broadcast Push Alerts',
        labelEn: language === 'ar' ? 'إرسال إشعار جماعي' : 'Broadcast Push Alerts',
        icon: <Bell size={16} />
      });

      if (['SUPER_ADMIN', 'DEVELOPER'].includes(role)) {
        tabs.push({
          id: 'manage-priests',
          labelAr: language === 'ar' ? 'إدارة الكهنة' : 'Manage Priests',
          labelEn: language === 'ar' ? 'إدارة الكهنة' : 'Manage Priests',
          icon: <Users size={16} />
        });
        tabs.push({
          id: 'manage-roles',
          labelAr: language === 'ar' ? 'إدارة الرتب والمستخدمين' : 'Manage Role Accounts',
          labelEn: language === 'ar' ? 'إدارة الرتب والمستخدمين' : 'Manage Role Accounts',
          icon: <User size={16} />
        });
        tabs.push({
          id: 'action-logs',
          labelAr: language === 'ar' ? 'سجل العمليات' : 'Action Logs',
          labelEn: language === 'ar' ? 'سجل العمليات' : 'Action Logs',
          icon: <FileText size={16} />
        });
      }

      tabs.push({
        id: 'ai-knowledge-chat',
        labelAr: language === 'ar' ? 'محادثة المعرفة الكنسية (AI Knowledge Chat)' : 'AI Knowledge Chat',
        labelEn: language === 'ar' ? 'محادثة المعرفة الكنسية (AI Knowledge Chat)' : 'AI Knowledge Chat',
        icon: <MessageSquare size={16} />
      });

      tabs.push({
        id: 'ai-assistant',
        labelAr: language === 'ar' ? 'إدارة المساعد الذكي (AI Manager)' : 'AI Assistant Manager',
        labelEn: language === 'ar' ? 'إدارة المساعد الذكي (AI Manager)' : 'AI Assistant Manager',
        icon: <Sparkles size={16} />
      });

      // Four Integrated Systems Admin Tabs
      tabs.push({
        id: 'facebook-news',
        labelAr: language === 'ar' ? 'مشاركات فيسبوك والأخبار' : 'Facebook News & Moderation',
        labelEn: language === 'ar' ? 'مشاركات فيسبوك والأخبار' : 'Facebook News & Moderation',
        icon: <Facebook size={16} />
      });

      tabs.push({
        id: 'email-center',
        labelAr: language === 'ar' ? 'مركز البريد الإلكتروني' : 'Admin Email Center',
        labelEn: language === 'ar' ? 'مركز البريد الإلكتروني' : 'Admin Email Center',
        icon: <Mail size={16} />
      });

      tabs.push({
        id: 'events-qr',
        labelAr: language === 'ar' ? 'الدعوات وتأكيد الحضور (QR)' : 'Invitations & QR Scanner',
        labelEn: language === 'ar' ? 'الدعوات وتأكيد الحضور (QR)' : 'Invitations & QR Scanner',
        icon: <QrCode size={16} />
      });

      tabs.push({
        id: 'fy-moderation',
        labelAr: language === 'ar' ? 'إشراف أسئلة الإيمان (FY)' : 'FY Questions Moderation',
        labelEn: language === 'ar' ? 'إشراف أسئلة الإيمان (FY)' : 'FY Questions Moderation',
        icon: <HelpCircle size={16} />
      });
    }

    // Settings and messages visible to SuperAdmin, Developer, Admin, Secretary, Priest, Bishop
    if (['SUPER_ADMIN', 'DEVELOPER', 'CHURCH_ADMIN', 'SECRETARY', 'PRIEST', 'BISHOP'].includes(role)) {
      tabs.push({
        id: 'manage-site-info',
        labelAr: language === 'ar' ? 'محتوى وإعدادات الموقع' : 'Manage Site & Services',
        labelEn: language === 'ar' ? 'محتوى وإعدادات الموقع' : 'Manage Site & Services',
        icon: <FileText size={16} />
      });
      tabs.push({
        id: 'member-messages',
        labelAr: language === 'ar' ? 'رسائل الأعضاء' : 'Member Messages',
        labelEn: language === 'ar' ? 'رسائل الأعضاء' : 'Member Messages',
        icon: <Bell size={16} />
      });
    }

    // Trip Manager & Admins Tab
    if (['TRIP_MANAGER', 'SUPER_ADMIN', 'CHURCH_ADMIN', 'SECRETARY'].includes(role)) {
      tabs.push({
        id: 'trips',
        labelAr: language === 'ar' ? 'إدارة الرحلات والاشتراكات' : 'Manage Trips & Bookings',
        labelEn: language === 'ar' ? 'إدارة الرحلات والاشتراكات' : 'Manage Trips & Bookings',
        icon: <Calendar size={16} />
      });
    }

    return tabs;
  };

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

      if (token) {
        fetch(`${API_URL}/events/trip-bookings/list`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setAllTripBookings(data);
          })
          .catch(err => console.log(err));
      }
    }

    if (activeTab === 'my-schedule' && token) {
      fetch(`${API_URL}/priests/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setMyConfessionStatus(data.confessionStatus || 'ACTIVE');
            setMyConfessionStatusNote(data.confessionStatusNote || '');
            setMyNoFixedSchedule(data.noFixedSchedule || false);
            setMyAvailability(typeof data.availabilityJson === 'string' ? data.availabilityJson : JSON.stringify(data.availabilityJson || { recurring: [], specific: [] }));
            setMyMaxBookings(String(data.maxBookingsPerDay || '5'));
            setMyBufferMinutes(String(data.bufferMinutes || '5'));
            setMyConfessionDuration(String(data.confessionDuration || '15'));
            setMyAvatarUrl(data.avatarUrl || '');
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
                setChurchServices([]);
              }
            } catch (e) {
              setChurchServices([]);
            }
          } else {
            setChurchServices([]);
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

    if (token && (activeTab === 'my-profile' || activeTab === 'my-invitations')) {
      fetch(`${API_URL}/invitations/my-invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMyInvitations(data);
        })
        .catch(err => console.log('Error fetching invitations:', err));
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
        setSavedLive(true);
        setTimeout(() => setSavedLive(false), 2000);
        setLiveMsg(language === 'ar' ? '✓ تم تحديث إعدادات البث بنجاح!' : '✓ Live settings updated successfully!');
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
      confessionDuration: priestConfessionDuration,
      bufferMinutes: priestBuffer,
      availabilityJson: priestAvailability,
      confessionStatus: priestConfessionStatus,
      confessionStatusNote: priestConfessionStatusNote,
      noFixedSchedule: priestNoFixedSchedule
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
        setSavedPriest(true);
        setTimeout(() => setSavedPriest(false), 2000);
        setPriestMsg(language === 'ar' ? '✓ تم حفظ بيانات الكاهن بنجاح!' : '✓ Priest saved successfully!');
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
    setPriestConfessionDuration(String(priest.confessionDuration || 15));
    setPriestBuffer(String(priest.bufferMinutes || 5));
    setPriestAvailability(typeof priest.availabilityJson === 'string' ? priest.availabilityJson : JSON.stringify(priest.availabilityJson));
    setPriestConfessionStatus(priest.confessionStatus || 'ACTIVE');
    setPriestConfessionStatusNote(priest.confessionStatusNote || '');
    setPriestNoFixedSchedule(priest.noFixedSchedule || false);
    triggerEditScrollAndHighlight('priest-form-card');
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
    setPriestConfessionDuration('15');
    setPriestBuffer('5');
    setPriestAvailability('{"recurring":[], "specific":[]}');
    setPriestConfessionStatus('ACTIVE');
    setPriestConfessionStatusNote('');
    setPriestNoFixedSchedule(false);
  };

  const handleSaveMySchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setMyScheduleMsg(null);
    try {
      const res = await fetch(`${API_URL}/priests/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          avatarUrl: myAvatarUrl,
          confessionStatus: myConfessionStatus,
          confessionStatusNote: myConfessionStatusNote,
          noFixedSchedule: myNoFixedSchedule,
          availabilityJson: myAvailability,
          maxBookingsPerDay: myMaxBookings,
          confessionDuration: myConfessionDuration,
          bufferMinutes: myBufferMinutes
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSavedMySchedule(true);
        setTimeout(() => setSavedMySchedule(false), 2000);
        setMyScheduleMsg(language === 'ar' ? '✓ تم حفظ وتحديث مواعيدك وحالتك بنجاح!' : '✓ Your schedule and status have been updated successfully!');
      } else {
        setMyScheduleMsg(data.error || 'Failed to update schedule.');
      }
    } catch (err) {
      setMyScheduleMsg('Error connecting to server.');
    }
  };

  const handleUpdateTripBookingStatus = async (bookingId: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/events/trip-bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setAllTripBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      }
    } catch (err) {
      console.error(err);
    }
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
        setSavedSiteInfo(true);
        setTimeout(() => setSavedSiteInfo(false), 2000);
        setImagesMsg(language === 'ar' ? '✓ تم تحديث بيانات ومحتوى الموقع والخدمات بنجاح!' : '✓ Site content, services and configurations saved successfully!');
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
    if (!serviceNameAr || !serviceNameEn) {
      alert(language === 'ar' ? 'يرجى إدخال اسم الخدمة ثنائي اللغة.' : 'Please enter bilingual service name.');
      return;
    }

    const payload = {
      id: editingServiceId || Math.random().toString(36).substr(2, 9),
      slug: serviceSlug || serviceCategory.toLowerCase().replace(/\s+/g, '-'),
      category: serviceCategory,
      nameAr: serviceNameAr,
      nameEn: serviceNameEn,
      summaryAr: serviceGoalAr,
      summaryEn: serviceGoalEn,
      goalAr: serviceGoalAr,
      goalEn: serviceGoalEn,
      scheduleAr: serviceScheduleAr,
      scheduleEn: serviceScheduleEn,
      image: serviceImage || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=600',
      stages: serviceStages
    };

    if (editingServiceId) {
      setChurchServices(prev => prev.map(s => s.id === editingServiceId ? payload : s));
    } else {
      setChurchServices(prev => [...prev, payload]);
    }

    setEditingServiceId(null);
    setServiceSlug('');
    setServiceCategory('تربية كنسية');
    setServiceNameAr('');
    setServiceNameEn('');
    setServiceGoalAr('');
    setServiceGoalEn('');
    setServiceScheduleAr('');
    setServiceScheduleEn('');
    setServiceImage('');
    setServiceStages([]);
  };

  const handleEditServiceClick = (service: any) => {
    setEditingServiceId(service.id);
    setServiceSlug(service.slug || '');
    setServiceCategory(service.category || 'تربية كنسية');
    setServiceNameAr(service.nameAr || '');
    setServiceNameEn(service.nameEn || '');
    setServiceGoalAr(service.summaryAr || service.goalAr || '');
    setServiceGoalEn(service.summaryEn || service.goalEn || '');
    setServiceScheduleAr(service.scheduleAr || '');
    setServiceScheduleEn(service.scheduleEn || '');
    setServiceImage(service.image || '');
    setServiceStages(Array.isArray(service.stages) ? service.stages : []);
    triggerEditScrollAndHighlight('service-form-card');
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
        setSavedTrip(true);
        setTimeout(() => setSavedTrip(false), 2000);
        setTripMsg(editingTripId 
          ? (language === 'ar' ? '✓ تم تعديل الفعالية بنجاح!' : '✓ Event updated successfully!')
          : (language === 'ar' ? '✓ تمت إضافة الفعالية بنجاح!' : '✓ Event created successfully!')
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
        setSavedNews(true);
        setTimeout(() => setSavedNews(false), 2000);
        setNewsMsg(editingNewsId 
          ? (language === 'ar' ? '✓ تم تعديل الخبر بنجاح!' : '✓ News updated successfully!')
          : (language === 'ar' ? '✓ تم نشر الخبر بنجاح!' : '✓ News published successfully!')
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

  // Impersonation state (check if currently impersonating another account)
  const [impersonatorBackup, setImpersonatorBackup] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const backup = localStorage.getItem('church-impersonator-backup');
      if (backup) {
        try {
          setImpersonatorBackup(JSON.parse(backup));
        } catch (e) {
          setImpersonatorBackup(null);
        }
      }
    }
  }, []);

  const handleImpersonate = async (targetUserId: string, targetName: string) => {
    if (!confirm(language === 'ar' ? `هل أنت متأكد من تسجيل الدخول بهوية "${targetName}"؟` : `Are you sure you want to log in as "${targetName}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin-users/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId })
      });
      const data = await res.json();
      if (res.ok) {
        if (!localStorage.getItem('church-impersonator-backup')) {
          localStorage.setItem('church-impersonator-backup', JSON.stringify({
            token,
            refreshToken: localStorage.getItem('church-refresh-token') || '',
            user
          }));
        }
        localStorage.setItem('church-token', data.accessToken);
        localStorage.setItem('church-refresh-token', data.refreshToken);
        localStorage.setItem('church-user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('auth-change'));
        window.location.href = '/dashboard';
      } else {
        alert(data.error || 'Failed to impersonate user.');
      }
    } catch (err) {
      alert('Failed to connect to server.');
    }
  };

  const handleRevertImpersonation = () => {
    if (typeof window === 'undefined') return;
    const backup = localStorage.getItem('church-impersonator-backup');
    if (backup) {
      try {
        const data = JSON.parse(backup);
        localStorage.setItem('church-token', data.token);
        localStorage.setItem('church-refresh-token', data.refreshToken);
        localStorage.setItem('church-user', JSON.stringify(data.user));
        localStorage.removeItem('church-impersonator-backup');
        window.dispatchEvent(new Event('auth-change'));
        window.location.href = '/dashboard';
      } catch (e) {
        localStorage.removeItem('church-impersonator-backup');
        window.location.reload();
      }
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
    <div className="container dashboard-main-container" style={{ padding: 'clamp(1rem, 3vw, 2.5rem) clamp(0.75rem, 2vw, 1.25rem)', width: '100%', maxWidth: '1300px', boxSizing: 'border-box', overflowX: 'hidden' }}>
      
      {/* Impersonation Alert Banner */}
      {impersonatorBackup && (
        <div style={{
          backgroundColor: 'rgba(226, 183, 20, 0.12)',
          border: '2px solid var(--accent-gold)',
          borderRadius: '8px',
          padding: '12px 18px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {language === 'ar' ? 'أنت تتصفح النظام حالياً بهوية: ' : 'You are currently logged in as: '}
                <span style={{ color: 'var(--accent-gold)' }}>{user?.fullName} ({user?.role})</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {language === 'ar' ? 'جلسة السوبر أدمن الأصلية محفوظة ومؤمنة' : 'Original Super Admin session is safely retained'}
              </div>
            </div>
          </div>
          <button
            onClick={handleRevertImpersonation}
            style={{
              backgroundColor: 'var(--accent-gold)',
              color: '#000000',
              fontWeight: 'bold',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>↩️</span>
            <span>{language === 'ar' ? 'العودة لحساب السوبر أدمن' : 'Return to Super Admin'}</span>
          </button>
        </div>
      )}

      {/* Header Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ minWidth: 'min(100%, 260px)' }}>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 2.2rem)', fontWeight: '800', margin: 0 }}>
            {t('nav_dashboard')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px', margin: 0 }}>
            {t('welcome')} {user?.fullName} • 🛡️ <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{user?.role}</span>
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
              padding: '10px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '42px',
              touchAction: 'manipulation'
            }}
          >
            <FileText size={18} />
            <span>{language === 'ar' ? 'استمارة عضوية العائلة' : 'Family Registry Form'}</span>
          </button>
        )}
      </div>

      {/* Unified Phone & Desktop Navigation Container */}
      <div className="dashboard-mobile-nav-container">
        {/* Mobile Tab Dropdown Button */}
        <button 
          type="button"
          className="dashboard-mobile-menu-btn" 
          onClick={() => setIsMobileTabMenuOpen(true)}
          aria-label={language === 'ar' ? 'تغيير قسم لوحة التحكم' : 'Change Dashboard Section'}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {getAvailableTabs().find(t => t.id === activeTab)?.icon}
            </span>
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'start' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', fontWeight: 500 }}>
                {language === 'ar' ? 'القسم الحالي:' : 'Current Section:'}
              </span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                {(() => {
                  const currentTab = getAvailableTabs().find(t => t.id === activeTab);
                  return currentTab ? (language === 'ar' ? currentTab.labelAr : currentTab.labelEn) : '';
                })()}
              </strong>
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-gold)', fontSize: '0.82rem', fontWeight: 700, backgroundColor: 'rgba(226, 183, 20, 0.1)', padding: '6px 10px', borderRadius: '6px', flexShrink: 0 }}>
            <span>{language === 'ar' ? 'الأقسام' : 'Sections'}</span>
            <ChevronDown size={16} />
          </span>
        </button>

        {/* Scrollable Horizontal Pill Tabs */}
        <div 
          className="dashboard-tabs-scrollable" 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '10px', 
            marginBottom: '1.8rem',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x'
          }}
        >
          {getAvailableTabs().map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                type="button"
                className={`dashboard-tab-btn ${isActive ? 'dashboard-tab-btn-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '24px',
                  border: isActive ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                  background: isActive ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                  color: isActive ? '#000000' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: isActive ? '700' : '600',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minHeight: '40px',
                  touchAction: 'manipulation',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(226, 183, 20, 0.25)' : 'none'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
                <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer (Bottom Sheet) for Dashboard Tabs */}
      {isMobileTabMenuOpen && (
        <div className="dashboard-drawer-overlay" onClick={() => setIsMobileTabMenuOpen(false)}>
          <div className="dashboard-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-drawer-header">
              <span className="dashboard-drawer-title">{language === 'ar' ? 'أقسام وإدارات لوحة التحكم' : 'Dashboard Sections'}</span>
              <button 
                type="button"
                className="dashboard-drawer-close" 
                onClick={() => setIsMobileTabMenuOpen(false)}
                aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
                style={{ padding: '6px', minHeight: '36px', minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {getAvailableTabs().map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`dashboard-drawer-item ${isActive ? 'dashboard-drawer-item-active' : ''}`}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileTabMenuOpen(false);
                    }}
                    style={{
                      minHeight: '48px',
                      touchAction: 'manipulation'
                    }}
                  >
                    <span style={{ color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                      {tab.icon}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.92rem' }}>
                      {language === 'ar' ? tab.labelAr : tab.labelEn}
                    </span>
                    {isActive && (
                      <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--accent-gold)', color: '#000000', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        {language === 'ar' ? 'نشط' : 'Active'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
                        📅 {new Date(b.date).toLocaleDateString()} • 🕒 {formatTimeSlot(b.timeSlot, language)}
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

          {/* Member's Invitations & VIP Passes */}
          <div className="dashboard-panel">
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              🎟️ {language === 'ar' ? 'دعواتي الرسمية وبطاقات الدخول (VIP Passes)' : 'My Official Event Invitations & Passes'}
            </h3>

            {myInvitations.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {myInvitations.map(inv => (
                  <VipInvitationCard key={inv.id} invitation={inv} language={language} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', margin: '1rem 0' }}>
                {language === 'ar' ? 'لا توجد دعوات حالية صادرة لحسابك.' : 'No active invitations found for your account.'}
              </p>
            )}
          </div>

        </div>
      )}

      {/* Tab: Member Dedicated Invitations View */}
      {activeTab === 'my-invitations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="dashboard-panel">
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              🎟️ {language === 'ar' ? 'دعواتي الرسمية وبطاقات الدخول (VIP Passes)' : 'My Official Event Invitations & Passes'}
            </h3>

            {myInvitations.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {myInvitations.map(inv => (
                  <VipInvitationCard key={inv.id} invitation={inv} language={language} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', textAlign: 'center', margin: '2rem 0' }}>
                {language === 'ar' ? 'لا توجد دعوات صادرة لحسابك حتى الآن.' : 'No active invitations found for your account.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Priest Confession Schedule & Status Self-Management */}
      {activeTab === 'my-schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div className="dashboard-panel">
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              🗓️ {language === 'ar' ? 'إدارة مواعيد اعترافاتي وحالتي' : 'My Confession Schedule & Availability'}
            </h3>

            {myScheduleMsg && (
              <div style={{
                backgroundColor: 'rgba(226, 183, 20, 0.08)',
                border: '1px solid var(--accent-gold)',
                color: 'var(--accent-gold)',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem'
              }}>
                {myScheduleMsg}
              </div>
            )}

            <form onSubmit={handleSaveMySchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Confession Status Selector */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--accent-gold)' }}>
                  {language === 'ar' ? 'حالة استقبال الاعترافات حالياً:' : 'Current Confession Reception Status:'}
                </label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 14px', borderRadius: '6px', backgroundColor: myConfessionStatus === 'ACTIVE' ? 'rgba(46, 204, 113, 0.15)' : 'transparent', border: `1px solid ${myConfessionStatus === 'ACTIVE' ? 'var(--accent-green)' : 'var(--border-color)'}` }}>
                    <input
                      type="radio"
                      name="myConfessionStatus"
                      value="ACTIVE"
                      checked={myConfessionStatus === 'ACTIVE'}
                      onChange={() => setMyConfessionStatus('ACTIVE')}
                    />
                    <span style={{ fontWeight: myConfessionStatus === 'ACTIVE' ? 'bold' : 'normal', color: myConfessionStatus === 'ACTIVE' ? '#2ecc71' : 'var(--text-primary)' }}>
                      🟢 {language === 'ar' ? 'متاح للاعترافات' : 'Active (Accepting)'}
                    </span>
                  </label>

                  {(user?.fullName?.includes('مايكل') || user?.priestProfile?.nameAr?.includes('مايكل') || user?.email?.includes('michael')) && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 14px', borderRadius: '6px', backgroundColor: myConfessionStatus === 'TRAVELING' ? 'rgba(226, 183, 20, 0.15)' : 'transparent', border: `1px solid ${myConfessionStatus === 'TRAVELING' ? 'var(--accent-gold)' : 'var(--border-color)'}` }}>
                      <input
                        type="radio"
                        name="myConfessionStatus"
                        value="TRAVELING"
                        checked={myConfessionStatus === 'TRAVELING'}
                        onChange={() => setMyConfessionStatus('TRAVELING')}
                      />
                      <span style={{ fontWeight: myConfessionStatus === 'TRAVELING' ? 'bold' : 'normal', color: myConfessionStatus === 'TRAVELING' ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                        ✈️ {language === 'ar' ? 'خارج مصر' : 'Abroad'}
                      </span>
                    </label>
                  )}

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 14px', borderRadius: '6px', backgroundColor: myConfessionStatus === 'INACTIVE' ? 'rgba(229, 9, 20, 0.15)' : 'transparent', border: `1px solid ${myConfessionStatus === 'INACTIVE' ? 'var(--accent-red)' : 'var(--border-color)'}` }}>
                    <input
                      type="radio"
                      name="myConfessionStatus"
                      value="INACTIVE"
                      checked={myConfessionStatus === 'INACTIVE'}
                      onChange={() => setMyConfessionStatus('INACTIVE')}
                    />
                    <span style={{ fontWeight: myConfessionStatus === 'INACTIVE' ? 'bold' : 'normal', color: myConfessionStatus === 'INACTIVE' ? '#ff4d4d' : 'var(--text-primary)' }}>
                      ⏸️ {language === 'ar' ? 'غير متاح للاعترافات حالياً' : 'Not Available Currently'}
                    </span>
                  </label>
                </div>

                {myConfessionStatus !== 'ACTIVE' && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      {language === 'ar' ? 'رسالة توضيحية للشعب تظهر عند محاولة الحجز (اختياري):' : 'Status note shown to congregation (Optional):'}
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={myConfessionStatusNote}
                      onChange={e => setMyConfessionStatusNote(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: خارج مصر في زيارة رعوية حتى أول الشهر' : 'e.g. Abroad on pastoral duty until next month'}
                    />
                  </div>
                )}
              </div>

              {/* Priest / Bishop Public Avatar Section */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h4 style={{ color: 'var(--accent-gold)', fontSize: '1rem', marginBottom: '4px' }}>
                    🖼️ {language === 'ar' ? 'صورتك الشخصية الظاهرة للشعب في الموقع' : 'Your Public Profile Photo'}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {language === 'ar' 
                      ? 'تظهر هذه الصورة للجميع في صفحة الآباء الكهنة، وفي قسم حجز مواعيد الاعتراف.' 
                      : 'This photo will be displayed to all congregation members on the clergy page and confession booking.'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  {myAvatarUrl ? (
                    <img
                      src={myAvatarUrl}
                      alt="Avatar"
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--accent-gold)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(226, 183, 20, 0.1)',
                      border: '2px dashed var(--accent-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.8rem',
                      color: 'var(--accent-gold)'
                    }}>
                      👤
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 'min(100%, 220px)' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileChange(e, setMyAvatarUrl)}
                      className={styles.formInput}
                      style={{ padding: '8px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {myAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => openImageCropper(myAvatarUrl, 'circle', (cropped) => setMyAvatarUrl(cropped))}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--accent-gold)',
                            color: 'var(--accent-gold)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                          }}
                        >
                          <Scissors size={14} />
                          <span>{language === 'ar' ? 'قص وضبط صورة الكاهن (دائري)' : 'Circular Priest Crop'}</span>
                        </button>
                      )}
                      {myAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setMyAvatarUrl('')}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'transparent',
                            border: '1px solid #ff4d4d',
                            color: '#ff4d4d',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          {language === 'ar' ? 'إزالة الصورة' : 'Remove Photo'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* No Fixed Schedule Toggle */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={myNoFixedSchedule}
                    onChange={e => setMyNoFixedSchedule(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }}
                  />
                  <span>
                    ⏰ {language === 'ar' ? 'مفيش ميعاد محدد (حجز مفتوح / المواعيد بالتنسيق المباشر)' : 'No fixed schedule (Open requests / Coordinated directly)'}
                  </span>
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', marginInlineStart: '28px' }}>
                  {language === 'ar' 
                    ? 'عند تفعيل هذا الخيار، لن يُطلب من المعترف اختيار ساعة محددة، بل سيضع تاريخاً مفضلاً وبيانات تواصله وموضوع المقابلة، وتقوم أنت أو مكتبك بتأكيد الميعاد المناسب معه.'
                    : 'When checked, people will submit an open appointment request with preferred date and contact details without picking a specific time slot.'}
                </p>
              </div>

              {/* If Fixed Schedule is enabled: PriestScheduleManager */}
              {!myNoFixedSchedule && (
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ color: 'var(--accent-gold)', marginBottom: '1rem' }}>
                    📅 {language === 'ar' ? 'تحديد الأيام وساعات التواجد:' : 'Set Available Days & Times:'}
                  </h4>
                  <PriestScheduleManager 
                    language={language}
                    availabilityJson={myAvailability}
                    confessionDuration={myConfessionDuration}
                    bufferMinutes={myBufferMinutes}
                    onAvailabilityChange={setMyAvailability}
                    onConfessionDurationChange={setMyConfessionDuration}
                    onBufferMinutesChange={setMyBufferMinutes}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="submit" 
                  className={`${styles.bookBtn} ${savedMySchedule ? 'btn-saved-success' : ''}`} 
                  style={{ 
                    width: 'auto', 
                    padding: '12px 36px', 
                    fontSize: '1rem',
                    backgroundColor: savedMySchedule ? '#2ecc71' : undefined,
                    color: savedMySchedule ? '#fff' : undefined,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {savedMySchedule ? '✓ تم الحفظ بنجاح!' : `💾 ${language === 'ar' ? 'حفظ إعدادات المواعيد والحالة' : 'Save Schedule & Status'}`}
                </button>
              </div>
            </form>
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
                      📅 {new Date(b.date).toLocaleDateString()} • 🕒 {formatTimeSlot(b.timeSlot, language)} <br />
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <b style={{ fontSize: '0.95rem' }}>{m.fullName}</b>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>🪪 {m.nationalId}</span>
                      <span>•</span>
                      <span>📞 {m.phoneNumbers.split(',')[0]}</span>
                    </div>
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
              <button 
                type="submit" 
                className={`${styles.bookBtn} ${savedLive ? 'btn-saved-success' : ''}`} 
                style={{ 
                  flex: 1,
                  backgroundColor: savedLive ? '#2ecc71' : undefined,
                  color: savedLive ? '#fff' : undefined,
                  transition: 'all 0.3s ease'
                }}
              >
                {savedLive ? '✓ تم الحفظ بنجاح!' : t('save')}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Mobile-First Segmented Sub-Navigation */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
            gap: '8px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <button
              type="button"
              onClick={() => setTripSubTab('bookings')}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: tripSubTab === 'bookings' ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                backgroundColor: tripSubTab === 'bookings' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: tripSubTab === 'bookings' ? '#000000' : 'var(--text-primary)',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                minHeight: '44px',
                transition: 'all 0.2s ease',
                boxShadow: tripSubTab === 'bookings' ? '0 2px 8px rgba(226, 183, 20, 0.25)' : 'none'
              }}
            >
              <span>📋</span>
              <span>{language === 'ar' ? 'طلبات الاشتراك' : 'Bookings'}</span>
              {allTripBookings.filter(b => b.status === 'PENDING').length > 0 && (
                <span style={{
                  backgroundColor: tripSubTab === 'bookings' ? '#000000' : 'var(--accent-gold)',
                  color: tripSubTab === 'bookings' ? 'var(--accent-gold)' : '#000000',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold'
                }}>
                  {allTripBookings.filter(b => b.status === 'PENDING').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTripSubTab('trips')}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: tripSubTab === 'trips' ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                backgroundColor: tripSubTab === 'trips' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: tripSubTab === 'trips' ? '#000000' : 'var(--text-primary)',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                minHeight: '44px',
                transition: 'all 0.2s ease',
                boxShadow: tripSubTab === 'trips' ? '0 2px 8px rgba(226, 183, 20, 0.25)' : 'none'
              }}
            >
              <span>✈️</span>
              <span>{language === 'ar' ? 'الرحلات الحالية' : 'Trips List'} ({tripsList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTripSubTab('form')}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: tripSubTab === 'form' ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                backgroundColor: tripSubTab === 'form' ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                color: tripSubTab === 'form' ? '#000000' : 'var(--text-primary)',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                minHeight: '44px',
                transition: 'all 0.2s ease',
                boxShadow: tripSubTab === 'form' ? '0 2px 8px rgba(226, 183, 20, 0.25)' : 'none'
              }}
            >
              <span>{editingTripId ? '✏️' : '➕'}</span>
              <span>{editingTripId ? (language === 'ar' ? 'تعديل الفعالية' : 'Edit Event') : (language === 'ar' ? 'إضافة فعالية' : 'Add Event')}</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* SUBTAB 1: BOOKINGS & SUBMISSIONS */}
          {/* ======================================================== */}
          {tripSubTab === 'bookings' && (
            <div className="dashboard-panel" style={{ width: '100%', boxSizing: 'border-box' }}>
              
              {/* Header with Stats Badges */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '10px',
                marginBottom: '1rem'
              }}>
                <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.1rem' }}>
                  📋 {language === 'ar' ? 'سجل طلبات واشتراكات الرحلات' : 'Trip Bookings & Submissions'}
                </h3>
                
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(226,183,20,0.15)', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                    {language === 'ar' ? `قيد المراجعة: ${allTripBookings.filter(b => b.status === 'PENDING').length}` : `Pending: ${allTripBookings.filter(b => b.status === 'PENDING').length}`}
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(46,204,113,0.15)', color: '#2ecc71', fontWeight: 'bold' }}>
                    {language === 'ar' ? `مؤكد: ${allTripBookings.filter(b => b.status === 'CONFIRMED').length}` : `Confirmed: ${allTripBookings.filter(b => b.status === 'CONFIRMED').length}`}
                  </span>
                </div>
              </div>

              {/* Mobile Filter Bar */}
              {allTripBookings.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '1.2rem',
                  padding: '10px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {/* Search input */}
                  <input
                    type="text"
                    value={tripSearchFilter}
                    onChange={e => setTripSearchFilter(e.target.value)}
                    placeholder={language === 'ar' ? '🔍 بحث باسم المشترك، الهاتف، أو اسم الرحلة...' : 'Search by name, phone or trip...'}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      outline: 'none',
                      fontSize: '0.88rem'
                    }}
                  />

                  {/* Filters row: Trip dropdown + Status dropdown */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
                    gap: '8px'
                  }}>
                    <select
                      value={tripFilter}
                      onChange={e => setTripFilter(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '9px 10px',
                        borderRadius: '6px',
                        outline: 'none',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="ALL">{language === 'ar' ? 'جميع الرحلات والمؤتمرات' : 'All Trips & Conferences'}</option>
                      {Array.from(new Set(allTripBookings.map(b => b.event?.titleAr).filter(Boolean))).map((title: any) => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>

                    <select
                      value={tripStatusFilter}
                      onChange={e => setTripStatusFilter(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '9px 10px',
                        borderRadius: '6px',
                        outline: 'none',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="ALL">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                      <option value="PENDING">{language === 'ar' ? 'قيد المراجعة ⏳' : 'Pending'}</option>
                      <option value="APPROVED">{language === 'ar' ? 'تم التأكيد ✓' : 'Confirmed'}</option>
                      <option value="REJECTED">{language === 'ar' ? 'مرفوض ✕' : 'Rejected'}</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Booking Cards Stream */}
              {allTripBookings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                  {allTripBookings
                    .filter(b => {
                      const matchesTrip = tripFilter === 'ALL' || b.event?.titleAr === tripFilter || b.eventId === tripFilter;
                      const matchesStatus = tripStatusFilter === 'ALL' || b.status === tripStatusFilter;
                      const matchesSearch = !tripSearchFilter ||
                        b.fullName?.toLowerCase().includes(tripSearchFilter.toLowerCase()) ||
                        b.phone?.includes(tripSearchFilter) ||
                        b.event?.titleAr?.toLowerCase().includes(tripSearchFilter.toLowerCase());
                      return matchesTrip && matchesStatus && matchesSearch;
                    })
                    .map(b => (
                    <div
                      key={b.id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        width: '100%',
                        boxSizing: 'border-box',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {/* Top Row: Name, Clickable Phone, Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            👤 {b.fullName}
                          </div>
                          <a
                            href={`tel:${b.phone}`}
                            style={{
                              fontSize: '0.82rem',
                              color: 'var(--accent-gold)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '2px',
                              fontWeight: 'bold'
                            }}
                          >
                            📞 {b.phone}
                          </a>
                        </div>

                        {/* Status Badge */}
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 'bold',
                          backgroundColor: b.status === 'CONFIRMED' ? 'rgba(46, 204, 113, 0.15)' : b.status === 'REJECTED' ? 'rgba(229, 9, 20, 0.15)' : 'rgba(226, 183, 20, 0.15)',
                          color: b.status === 'CONFIRMED' ? '#2ecc71' : b.status === 'REJECTED' ? '#ff4d4d' : 'var(--accent-gold)',
                          border: `1px solid ${b.status === 'CONFIRMED' ? 'rgba(46, 204, 113, 0.3)' : b.status === 'REJECTED' ? 'rgba(229, 9, 20, 0.3)' : 'rgba(226, 183, 20, 0.3)'}`
                        }}>
                          {b.status === 'CONFIRMED' 
                            ? '✓ ' + (language === 'ar' ? 'مؤكد ومقبول' : 'Confirmed') 
                            : b.status === 'REJECTED'
                            ? '✕ ' + (language === 'ar' ? 'مرفوض' : 'Rejected')
                            : '⏳ ' + (language === 'ar' ? 'قيد المراجعة' : 'Pending')}
                        </span>
                      </div>

                      {/* Event Title */}
                      <div style={{
                        fontSize: '0.92rem',
                        color: 'var(--accent-gold)',
                        fontWeight: 'bold',
                        padding: '6px 10px',
                        backgroundColor: 'rgba(226, 183, 20, 0.05)',
                        borderRadius: '6px',
                        border: '1px solid rgba(226, 183, 20, 0.15)'
                      }}>
                        🎫 {language === 'ar' ? b.event?.titleAr : b.event?.titleEn}
                      </div>

                      {/* Payment & Amount Details Chips */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
                        gap: '6px',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          💰 {language === 'ar' ? 'المبلغ:' : 'Amount:'} <b style={{ color: 'var(--text-primary)' }}>{b.totalAmount} {language === 'ar' ? 'ج.م' : 'EGP'}</b>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          💳 {b.paymentMethod === 'INSTALLMENT' 
                            ? (language === 'ar' ? `تقسيط (${b.firstInstallment} ج.م)` : `Installment (${b.firstInstallment} EGP)`)
                            : (language === 'ar' ? 'دفع كامل' : 'Full Payment')}
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          💵 {b.paymentChannel === 'INSTAPAY' ? 'InstaPay (إنستاباي)' : (language === 'ar' ? 'كاش للمسؤول' : 'Cash')}
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          📅 {new Date(b.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </div>
                      </div>

                      {/* Member Notes */}
                      {b.notes && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px' }}>
                          📝 {b.notes}
                        </div>
                      )}

                      {/* InstaPay Receipt Preview Button */}
                      {b.receiptImageUrl && (
                        <button
                          type="button"
                          onClick={() => setViewingReceiptUrl(b.receiptImageUrl)}
                          style={{
                            backgroundColor: 'rgba(226, 183, 20, 0.1)',
                            border: '1px solid var(--accent-gold)',
                            color: 'var(--accent-gold)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            width: '100%',
                            minHeight: '40px'
                          }}
                        >
                          🔍 {language === 'ar' ? 'معاينة إيصال تحويل إنستاباي' : 'View InstaPay Receipt'}
                        </button>
                      )}

                      {/* Decision Action Buttons for PENDING */}
                      {b.status === 'PENDING' && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginTop: '4px',
                          paddingTop: '8px',
                          borderTop: '1px dashed var(--border-color)'
                        }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateTripBookingStatus(b.id, 'CONFIRMED')}
                            style={{
                              backgroundColor: '#2ecc71',
                              color: '#ffffff',
                              border: 'none',
                              padding: '10px 14px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              minHeight: '44px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            ✓ {language === 'ar' ? 'تأكيد الحجز' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateTripBookingStatus(b.id, 'REJECTED')}
                            style={{
                              backgroundColor: '#ff4d4d',
                              color: '#ffffff',
                              border: 'none',
                              padding: '10px 14px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              minHeight: '44px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            ✕ {language === 'ar' ? 'رفض' : 'Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 1rem' }}>
                  {language === 'ar' ? 'لا توجد طلبات اشتراك في الرحلات حتى الآن.' : 'No trip bookings submitted yet.'}
                </p>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SUBTAB 2: CURRENT TRIPS LIST */}
          {/* ======================================================== */}
          {tripSubTab === 'trips' && (
            <div className="dashboard-panel" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '10px',
                marginBottom: '1rem'
              }}>
                <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.1rem' }}>
                  📋 {language === 'ar' ? 'قائمة الرحلات والمؤتمرات المضافة' : 'Current Trips & Conferences'}
                </h3>
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
                    setTripSubTab('form');
                  }}
                  style={{
                    backgroundColor: 'var(--accent-gold)',
                    color: '#000000',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}
                >
                  ➕ {language === 'ar' ? 'إضافة فعالية جديدة' : 'Add New'}
                </button>
              </div>

              {tripsList.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                  {tripsList.map(t => (
                    <div
                      key={t.id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: 'var(--shadow-sm)',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Top: Type badge + Title */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            backgroundColor: t.type === 'TRIP' ? 'rgba(52, 152, 219, 0.15)' : 'rgba(155, 89, 182, 0.15)',
                            color: t.type === 'TRIP' ? 'var(--accent-blue)' : '#9b59b6',
                            border: `1px solid ${t.type === 'TRIP' ? 'rgba(52, 152, 219, 0.3)' : 'rgba(155, 89, 182, 0.3)'}`,
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}>
                            {t.type === 'TRIP' ? (language === 'ar' ? '✈️ رحلة كنسية' : 'Trip') : (language === 'ar' ? '🏛️ مؤتمر كنسي' : 'Conference')}
                          </span>
                        </div>
                        <h4 style={{ fontWeight: 'bold', fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                          {language === 'ar' ? t.titleAr : t.titleEn}
                        </h4>
                      </div>

                      {/* Chips row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          📅 {new Date(t.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </span>
                        <span style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          📍 {language === 'ar' ? t.locationAr : t.locationEn}
                        </span>
                        <span style={{ backgroundColor: 'rgba(226,183,20,0.1)', color: 'var(--accent-gold)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(226,183,20,0.25)', fontWeight: 'bold' }}>
                          💰 {t.price} {language === 'ar' ? 'ج.م للفرد' : 'EGP'}
                        </span>
                      </div>

                      {/* Description */}
                      {t.descriptionAr && (
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                          {language === 'ar' ? t.descriptionAr : t.descriptionEn}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border-color)'
                      }}>
                        <button 
                          onClick={() => {
                            setEditingTripId(t.id);
                            setTripTitleAr(t.titleAr);
                            setTripTitleEn(t.titleEn);
                            setTripDescAr(t.descriptionAr || '');
                            setTripDescEn(t.descriptionEn || '');
                            setTripLocationAr(t.locationAr || '');
                            setTripLocationEn(t.locationEn || '');
                            setTripDate(t.date ? t.date.split('T')[0] : '');
                            setTripPrice(String(t.price));
                            setTripType(t.type);
                            setTripSubTab('form');
                          }}
                          style={{
                            backgroundColor: 'var(--accent-gold)',
                            color: '#000000',
                            border: 'none',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            minHeight: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          ✏️ {language === 'ar' ? 'تعديل الفعالية' : 'Edit Event'}
                        </button>
                        <button 
                          onClick={() => handleDeleteTrip(t.id)}
                          style={{
                            backgroundColor: 'rgba(255, 77, 77, 0.1)',
                            border: '1px solid rgba(255, 77, 77, 0.3)',
                            color: '#ff4d4d',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            minHeight: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          🗑️ {language === 'ar' ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 1rem' }}>
                  {language === 'ar' ? 'لا توجد رحلات أو مؤتمرات مضافة حالياً.' : 'No trips or conferences added yet.'}
                </p>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SUBTAB 3: ADD / EDIT TRIP FORM */}
          {/* ======================================================== */}
          {tripSubTab === 'form' && (
            <div className="dashboard-panel" id="trip-form-card" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '10px',
                marginBottom: '1rem'
              }}>
                <h3 style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '1.1rem' }}>
                  ✈️ {editingTripId 
                    ? (language === 'ar' ? 'تعديل بيانات الرحلة / المؤتمر' : 'Edit Trip / Conference') 
                    : (language === 'ar' ? 'إضافة رحلة أو مؤتمر جديد' : 'Add New Trip / Conference')}
                </h3>

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
                      setTripSubTab('trips');
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    ✕ {language === 'ar' ? 'إلغاء والعودة' : 'Cancel'}
                  </button>
                )}
              </div>

              {tripMsg && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(226, 183, 20, 0.1)',
                  border: '1px solid var(--accent-gold)',
                  color: 'var(--accent-gold)',
                  borderRadius: '6px',
                  marginBottom: '1.2rem',
                  fontSize: '0.85rem'
                }}>
                  {tripMsg}
                </div>
              )}

              <form onSubmit={handleSaveTrip} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
                
                {/* Event Type Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                    {language === 'ar' ? 'نوع الفعالية *' : 'Event Type *'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setTripType('TRIP')}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: tripType === 'TRIP' ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                        backgroundColor: tripType === 'TRIP' ? 'rgba(226, 183, 20, 0.15)' : 'var(--bg-card)',
                        color: tripType === 'TRIP' ? 'var(--accent-gold)' : 'var(--text-primary)',
                        fontWeight: 'bold',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        minHeight: '44px'
                      }}
                    >
                      ✈️ {language === 'ar' ? 'رحلة كنسية' : 'Church Trip'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTripType('CONFERENCE')}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: tripType === 'CONFERENCE' ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                        backgroundColor: tripType === 'CONFERENCE' ? 'rgba(226, 183, 20, 0.15)' : 'var(--bg-card)',
                        color: tripType === 'CONFERENCE' ? 'var(--accent-gold)' : 'var(--text-primary)',
                        fontWeight: 'bold',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        minHeight: '44px'
                      }}
                    >
                      🏛️ {language === 'ar' ? 'مؤتمر كنسي' : 'Conference'}
                    </button>
                  </div>
                </div>

                {/* Title (Arabic & English) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {language === 'ar' ? 'عنوان الفعالية (عربي) *' : 'Title (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'ar' ? 'مثال: رحلة إلى دير مارمينا بمريوط' : 'Arabic Title'}
                      value={tripTitleAr}
                      onChange={e => setTripTitleAr(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {language === 'ar' ? 'عنوان الفعالية (إنجليزي) *' : 'Title (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Trip to St. Mina Monastery"
                      value={tripTitleEn}
                      onChange={e => setTripTitleEn(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                {/* Location (Arabic & English) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {language === 'ar' ? 'الموقع / المكان (عربي)' : 'Location (Arabic)'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'ar' ? 'مثال: كينج مريوط - الإسكندرية' : 'Location in Arabic'}
                      value={tripLocationAr}
                      onChange={e => setTripLocationAr(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {language === 'ar' ? 'الموقع / المكان (إنجليزي)' : 'Location (English)'}
                    </label>
                    <input
                      type="text"
                      placeholder="Alexandria"
                      value={tripLocationEn}
                      onChange={e => setTripLocationEn(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                {/* Date & Price */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {language === 'ar' ? 'التاريخ *' : 'Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={tripDate}
                      onChange={e => setTripDate(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {language === 'ar' ? 'سعر الفرد (ج.م)' : 'Price (EGP)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={tripPrice}
                      onChange={e => setTripPrice(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                {/* Description (Arabic & English) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {language === 'ar' ? 'تفاصيل وبرنامج الرحلة (عربي)' : 'Program Details (Arabic)'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={language === 'ar' ? 'تفاصيل التجمع، البرنامج الروحي والترفيهي...' : 'Details in Arabic'}
                    value={tripDescAr}
                    onChange={e => setTripDescAr(e.target.value)}
                    className={styles.formInput}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {language === 'ar' ? 'تفاصيل البرنامج (إنجليزي)' : 'Program Details (English)'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Program description in English..."
                    value={tripDescEn}
                    onChange={e => setTripDescEn(e.target.value)}
                    className={styles.formInput}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <button 
                    type="submit" 
                    className={`${styles.bookBtn} ${savedTrip ? 'btn-saved-success' : ''}`} 
                    style={{ 
                      width: '100%',
                      backgroundColor: savedTrip ? '#2ecc71' : undefined,
                      color: savedTrip ? '#fff' : undefined,
                      transition: 'all 0.3s ease',
                      minHeight: '48px',
                      fontSize: '0.95rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {savedTrip ? '✓ تم الحفظ بنجاح!' : (editingTripId ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (language === 'ar' ? 'إضافة الفعالية' : 'Add Event'))}
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
                        setTripSubTab('trips');
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        minHeight: '44px'
                      }}
                    >
                      {language === 'ar' ? 'إلغاء والعودة للقائمة' : 'Cancel'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

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

              <button type="submit" className={styles.bookBtn} style={{ marginTop: '0.8rem', width: 'min(100%, 220px)' }}>
                {language === 'ar' ? 'إنشاء الحساب' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* List of current admin roles */}
          <div className="dashboard-panel">
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              👥 {language === 'ar' ? 'سجل أصحاب الرتب والمسؤولين' : 'Administrative Roles Directory'}
            </h3>

            {adminUsers.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: '12px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {adminUsers.map(u => {
                  const getRoleBadgeStyle = (role: string) => {
                    switch (role) {
                      case 'BISHOP':
                        return { bg: 'rgba(155, 89, 182, 0.15)', color: '#9b59b6', border: 'rgba(155, 89, 182, 0.3)' };
                      case 'PRIEST':
                        return { bg: 'rgba(226, 183, 20, 0.15)', color: 'var(--accent-gold)', border: 'rgba(226, 183, 20, 0.3)' };
                      case 'SUPER_ADMIN':
                      case 'DEVELOPER':
                        return { bg: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c', border: 'rgba(231, 76, 60, 0.3)' };
                      case 'TRIP_MANAGER':
                        return { bg: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: 'rgba(46, 204, 113, 0.3)' };
                      case 'SECRETARY':
                        return { bg: 'rgba(230, 126, 34, 0.15)', color: '#e67e22', border: 'rgba(230, 126, 34, 0.3)' };
                      default:
                        return { bg: 'rgba(52, 152, 219, 0.15)', color: '#3498db', border: 'rgba(52, 152, 219, 0.3)' };
                    }
                  };
                  const roleStyle = getRoleBadgeStyle(u.role);

                  return (
                    <div
                      key={u.id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        boxShadow: 'var(--shadow-sm)',
                        boxSizing: 'border-box',
                        width: '100%'
                      }}
                    >
                      <div>
                        {/* Top Row: User Name + Role Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            👤 {u.fullName}
                          </span>
                          <span style={{
                            fontWeight: 'bold',
                            fontSize: '0.78rem',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.color,
                            border: `1px solid ${roleStyle.border}`
                          }}>
                            {u.role}
                          </span>
                        </div>

                        {/* Contact details */}
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div style={{ wordBreak: 'break-all' }}>
                            ✉️ <a href={`mailto:${u.email}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{u.email}</a>
                          </div>
                          {u.phone && (
                            <div>
                              📞 <a href={`tel:${u.phone}`} style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 'bold' }}>{u.phone}</a>
                            </div>
                          )}
                          {u.nationalId && <div>🪪 {u.nationalId}</div>}
                        </div>
                      </div>

                      {/* Impersonate button if authorized */}
                      {['SUPER_ADMIN', 'DEVELOPER'].includes(user?.role) && u.id !== user?.id && (
                        <button
                          type="button"
                          onClick={() => handleImpersonate(u.id, u.fullName)}
                          style={{
                            backgroundColor: 'rgba(226, 183, 20, 0.1)',
                            color: 'var(--accent-gold)',
                            border: '1px solid var(--accent-gold)',
                            padding: '9px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            width: '100%',
                            marginTop: '8px',
                            minHeight: '40px'
                          }}
                        >
                          <span>🔑</span>
                          <span>{language === 'ar' ? `دخول بحساب ${u.fullName}` : `Login as ${u.fullName}`}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
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
        <div className="dashboard-panel" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '10px',
            marginBottom: '1.2rem'
          }}>
            <h3 style={{ color: 'var(--accent-gold)', margin: 0 }}>
              📋 {language === 'ar' ? 'سجل العمليات والعمليات الإدارية' : 'System Operations Action Log'}
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              {language === 'ar' ? `${actionLogs.length} عملية مسجلة` : `${actionLogs.length} logs recorded`}
            </span>
          </div>

          {actionLogs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
              {actionLogs.map(l => {
                const isAuto = l.action.startsWith('AUTO_') || l.action.includes('BACKUP');
                const isDanger = l.action.includes('DELETE') || l.action.includes('REJECT');
                const isSuccess = l.action.includes('CREATE') || l.action.includes('CONFIRM') || l.action.includes('APPROVE');

                const badgeBg = isAuto 
                  ? 'rgba(52, 152, 219, 0.15)' 
                  : isDanger 
                  ? 'rgba(231, 76, 60, 0.15)' 
                  : isSuccess 
                  ? 'rgba(46, 204, 113, 0.15)' 
                  : 'rgba(226, 183, 20, 0.15)';
                const badgeColor = isAuto 
                  ? 'var(--accent-blue)' 
                  : isDanger 
                  ? '#ff4d4d' 
                  : isSuccess 
                  ? '#2ecc71' 
                  : 'var(--accent-gold)';

                return (
                  <div
                    key={l.id}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: 'var(--shadow-sm)',
                      boxSizing: 'border-box',
                      width: '100%'
                    }}
                  >
                    {/* Top Row: Action Badge + Timestamp */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '3px 8px', 
                        backgroundColor: badgeBg, 
                        color: badgeColor, 
                        border: `1px solid ${badgeColor}`,
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        letterSpacing: '0.3px'
                      }}>
                        {l.action}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>{formatDateTime(l.createdAt, language)}</span>
                      </span>
                    </div>

                    {/* Middle Row: User identity */}
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <b>👤 {l.userName}</b>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>({l.userEmail})</span>
                    </div>

                    {/* Bottom: Details block */}
                    <div style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      wordBreak: 'break-word',
                      lineHeight: 1.5
                    }}>
                      {l.details}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 1rem' }}>
              {language === 'ar' ? 'سجل العمليات فارغ حالياً.' : 'No operations logged yet.'}
            </p>
          )}
        </div>
      )}

      {/* Tab: Super Admin Priest Management */}
      {activeTab === 'manage-priests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div className="dashboard-panel" id="priest-form-card">
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
                    {priestAvatarUrl && (
                      <button 
                        type="button" 
                        onClick={() => openImageCropper(priestAvatarUrl, 'circle', (cropped) => setPriestAvatarUrl(cropped))}
                        title={language === 'ar' ? 'قص وضبط صورة الكاهن (دائري)' : 'Circular Priest Crop'}
                        style={{ padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                      >
                        <Scissors size={14} /> {language === 'ar' ? 'قص دائري' : 'Circle Crop'}
                      </button>
                    )}
                    <button type="button" onClick={() => setPriestAvatarUrl('')} style={{ padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: '4px', cursor: 'pointer' }}>{language === 'ar' ? 'مسح' : 'Clear'}</button>
                  </div>
                  {priestAvatarUrl && <img src={priestAvatarUrl} alt="Avatar Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%', marginTop: '4px' }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max Bookings/Day (Calculated Automatically unless forced) *</label>
                  <input type="number" required value={priestMaxBookings} onChange={e => setPriestMaxBookings(e.target.value)} className={styles.formInput} />
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '6px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-gold)', marginBottom: '8px' }}>
                  {language === 'ar' ? 'حالة استقبال الاعترافات:' : 'Confession Status:'}
                </label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" name="adminPriestStatus" value="ACTIVE" checked={priestConfessionStatus === 'ACTIVE'} onChange={() => setPriestConfessionStatus('ACTIVE')} />
                    <span>🟢 {language === 'ar' ? 'متاح' : 'Active'}</span>
                  </label>
                  {(priestNameAr.includes('مايكل') || priestNameEn.toLowerCase().includes('michael')) && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="radio" name="adminPriestStatus" value="TRAVELING" checked={priestConfessionStatus === 'TRAVELING'} onChange={() => setPriestConfessionStatus('TRAVELING')} />
                      <span>✈️ {language === 'ar' ? 'خارج مصر' : 'Abroad'}</span>
                    </label>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" name="adminPriestStatus" value="INACTIVE" checked={priestConfessionStatus === 'INACTIVE'} onChange={() => setPriestConfessionStatus('INACTIVE')} />
                    <span>⏸️ {language === 'ar' ? 'غير متاح حالياً' : 'Inactive'}</span>
                  </label>
                </div>
                {priestConfessionStatus !== 'ACTIVE' && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'ملاحظة الحالة' : 'Status Note'}</label>
                    <input type="text" value={priestConfessionStatusNote} onChange={e => setPriestConfessionStatusNote(e.target.value)} className={styles.formInput} placeholder={language === 'ar' ? 'مثال: خارج مصر حالياً' : 'e.g. Currently abroad'} />
                  </div>
                )}
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={priestNoFixedSchedule} onChange={e => setPriestNoFixedSchedule(e.target.checked)} />
                    <span>⏰ {language === 'ar' ? 'مفيش ميعاد محدد (حجز مفتوح بدون أوقات ثابتة)' : 'No fixed schedule (Open requests)'}</span>
                  </label>
                </div>
              </div>

              {!priestNoFixedSchedule && (
                <div style={{ marginTop: '10px' }}>
                  <PriestScheduleManager 
                    language={language}
                    availabilityJson={priestAvailability}
                    confessionDuration={priestConfessionDuration}
                    bufferMinutes={priestBuffer}
                    onAvailabilityChange={setPriestAvailability}
                    onConfessionDurationChange={setPriestConfessionDuration}
                    onBufferMinutesChange={setPriestBuffer}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                {editingPriest && (
                  <button type="button" onClick={handleResetPriestForm} style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
                    {language === 'ar' ? 'إلغاء التعديل' : 'Cancel'}
                  </button>
                )}
                <button 
                  type="submit" 
                  className={`${styles.bookBtn} ${savedPriest ? 'btn-saved-success' : ''}`} 
                  style={{ 
                    width: 'auto', 
                    padding: '10px 30px',
                    backgroundColor: savedPriest ? '#2ecc71' : undefined,
                    color: savedPriest ? '#fff' : undefined,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {savedPriest ? '✓ تم الحفظ بنجاح!' : (language === 'ar' ? 'حفظ الكاهن' : 'Save Priest')}
                </button>
              </div>
            </form>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: 'clamp(1rem, 3vw, 2rem)' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
              ⛪ {language === 'ar' ? 'الآباء الكهنة الحاليين' : 'Current Priests & Bishops'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {allPriests.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid var(--border-color)', alignItems: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '8px', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 'min(100%, 240px)', flex: 1 }}>
                    {p.avatarUrl ? (
                      <img 
                        src={p.avatarUrl} 
                        alt={p.nameAr} 
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          borderRadius: '50%', 
                          objectFit: 'cover', 
                          border: '2px solid var(--accent-gold)', 
                          flexShrink: 0,
                          boxShadow: 'var(--shadow-sm)'
                        }} 
                      />
                    ) : (
                      <div style={{ 
                        width: '50px', 
                        height: '50px', 
                        borderRadius: '50%', 
                        backgroundColor: 'rgba(226, 183, 20, 0.12)', 
                        border: '2px dashed var(--accent-gold)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '1.3rem', 
                        color: 'var(--accent-gold)', 
                        flexShrink: 0 
                      }}>
                        👤
                      </div>
                    )}
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '1.05rem', display: 'block' }}>
                        {language === 'ar' ? `${p.titleAr} ${p.nameAr}` : `${p.titleEn} ${p.nameEn}`}
                      </span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', wordBreak: 'break-word' }}>
                        ✉️ {p.email} • 📞 {p.phone || 'N/A'} • 🪪 {p.nationalId || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['SUPER_ADMIN', 'DEVELOPER'].includes(user?.role) && p.userId !== user?.id && (
                      <button
                        type="button"
                        onClick={() => handleImpersonate(p.userId, language === 'ar' ? `${p.titleAr} ${p.nameAr}` : `${p.titleEn} ${p.nameEn}`)}
                        style={{
                          backgroundColor: 'rgba(52, 152, 219, 0.15)',
                          color: 'var(--accent-blue)',
                          border: '1px solid var(--accent-blue)',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                        title={language === 'ar' ? 'دخول بحساب الكاهن ومواعيده' : 'Login as priest'}
                      >
                        <span>🔑</span>
                        <span>{language === 'ar' ? 'دخول ككاهن' : 'Login as Priest'}</span>
                      </button>
                    )}
                    <button onClick={() => handleEditPriestClick(p)} style={{ backgroundColor: 'var(--accent-gold)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    <button onClick={() => handleDeletePriest(p.id)} style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
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
              <div id="service-form-card" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--bg-card)' }}>
                <h4 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', fontSize: '1rem' }}>
                  {editingServiceId ? (language === 'ar' ? '📝 تعديل الخدمة المحددة' : '📝 Edit Selected Service') : (language === 'ar' ? '➕ إضافة خدمة جديدة' : '➕ Add New Service')}
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {language === 'ar' ? 'فئة الخدمة الكنسية *' : 'Service Category *'}
                    </label>
                    <select 
                      value={serviceCategory} 
                      onChange={e => setServiceCategory(e.target.value)} 
                      className={styles.formInput}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="تربية كنسية">تربية كنسية</option>
                      <option value="ألحان">ألحان</option>
                      <option value="كشافة">كشافة</option>
                      <option value="كورال">كورال</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Slug (Unique ID, e.g. sunday-school, hymns)</label>
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="file" accept="image/*" onChange={e => handleFileChange(e, setServiceImage)} className={styles.formInput} style={{ padding: '6px', flex: 1 }} />
                      {serviceImage && (
                        <button 
                          type="button" 
                          onClick={() => openImageCropper(serviceImage, '16:9', (cropped) => setServiceImage(cropped))}
                          title={language === 'ar' ? 'قص وضبط أبعاد الصورة' : 'Crop & Adjust'}
                          style={{ padding: '6px 10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                        >
                          <Scissors size={14} /> {language === 'ar' ? 'قص' : 'Crop'}
                        </button>
                      )}
                    </div>
                    {serviceImage && <img src={serviceImage} alt="Service Preview" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} />}
                  </div>
                </div>

                <div className="grid-2-col" style={{ marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description/Summary (Arabic)</label>
                    <textarea value={serviceGoalAr} onChange={e => setServiceGoalAr(e.target.value)} className={styles.formInput} style={{ height: '60px', resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description/Summary (English)</label>
                    <textarea value={serviceGoalEn} onChange={e => setServiceGoalEn(e.target.value)} className={styles.formInput} style={{ height: '60px', resize: 'vertical' }} />
                  </div>
                </div>

                {/* Stages & Schedule breakdown per Stage */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '1.2rem' }}>
                  <b style={{ color: 'var(--accent-gold)', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>
                    📑 {language === 'ar' ? 'مراحل الخدمة وتفاصيل المواعيد (حسب المراحل الكنسية):' : 'Ministry Stages & Age Schedules:'}
                  </b>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', alignItems: 'flex-end', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المرحلة (عربي)' : 'Stage (Arabic)'}</label>
                      <input type="text" placeholder="مثال: إعدادي وثانوي" value={newStageNameAr} onChange={e => setNewStageNameAr(e.target.value)} className={styles.formInput} style={{ padding: '6px', fontSize: '0.8rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المرحلة (إنجليزي)' : 'Stage (English)'}</label>
                      <input type="text" placeholder="e.g. Middle & High School" value={newStageNameEn} onChange={e => setNewStageNameEn(e.target.value)} className={styles.formInput} style={{ padding: '6px', fontSize: '0.8rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الميعاد (عربي)' : 'Schedule (Arabic)'}</label>
                      <input type="text" placeholder="مثال: الجمعة 5:00 م" value={newStageScheduleAr} onChange={e => setNewStageScheduleAr(e.target.value)} className={styles.formInput} style={{ padding: '6px', fontSize: '0.8rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الميعاد (إنجليزي)' : 'Schedule (English)'}</label>
                      <input type="text" placeholder="e.g. Friday 5:00 PM" value={newStageScheduleEn} onChange={e => setNewStageScheduleEn(e.target.value)} className={styles.formInput} style={{ padding: '6px', fontSize: '0.8rem' }} />
                    </div>
                    <div>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (!newStageNameAr) {
                            alert(language === 'ar' ? 'يرجى إدخال اسم المرحلة' : 'Please enter stage name');
                            return;
                          }
                          setServiceStages(prev => [...prev, {
                            nameAr: newStageNameAr,
                            nameEn: newStageNameEn || newStageNameAr,
                            scheduleAr: newStageScheduleAr,
                            scheduleEn: newStageScheduleEn || newStageScheduleAr,
                            locationAr: 'مبنى الخدمات',
                            locationEn: 'Services Building'
                          }]);
                          setNewStageNameAr('');
                          setNewStageNameEn('');
                          setNewStageScheduleAr('');
                          setNewStageScheduleEn('');
                        }}
                        style={{ padding: '7px 14px', backgroundColor: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}
                      >
                        + {language === 'ar' ? 'إضافة مرحلة' : 'Add Stage'}
                      </button>
                    </div>
                  </div>

                  {serviceStages.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                      {serviceStages.map((stg, sIdx) => (
                        <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '6px 10px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                          <span><b>{language === 'ar' ? (stg.nameAr || stg.name) : (stg.nameEn || stg.name)}</b> — {language === 'ar' ? (stg.scheduleAr || stg.time) : (stg.scheduleEn || stg.time)}</span>
                          <button 
                            type="button" 
                            onClick={() => setServiceStages(prev => prev.filter((_, i) => i !== sIdx))}
                            style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            ✕ {language === 'ar' ? 'حذف' : 'Remove'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  {editingServiceId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingServiceId(null);
                        setServiceSlug('');
                        setServiceCategory('تربية كنسية');
                        setServiceNameAr('');
                        setServiceNameEn('');
                        setServiceGoalAr('');
                        setServiceGoalEn('');
                        setServiceScheduleAr('');
                        setServiceScheduleEn('');
                        setServiceImage('');
                        setServiceStages([]);
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
                          ({s.category || s.slug})
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
            <button 
              type="submit" 
              className={`${styles.bookBtn} ${savedSiteInfo ? 'btn-saved-success' : ''}`} 
              style={{ 
                padding: '14px 40px', 
                fontSize: '1.1rem', 
                fontWeight: 'bold', 
                boxShadow: '0 4px 15px rgba(226,183,20,0.3)', 
                width: 'auto', 
                alignSelf: 'center',
                backgroundColor: savedSiteInfo ? '#2ecc71' : undefined,
                color: savedSiteInfo ? '#fff' : undefined,
                transition: 'all 0.3s ease'
              }}
            >
              {savedSiteInfo ? '✓ تم الحفظ بنجاح!' : `💾 ${language === 'ar' ? 'حفظ إعدادات ومحتوى الموقع بالكامل' : 'Save All Site Content'}`}
            </button>

          </form>
        </div>
      )}

      {/* Tab: Manage News */}
      {activeTab === 'manage-news' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div className="dashboard-panel" id="news-form-card">
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
                  {newsImageUrl && (
                    <button 
                      type="button" 
                      onClick={() => openImageCropper(newsImageUrl, 'free', (cropped) => setNewsImageUrl(cropped))}
                      title={language === 'ar' ? 'قص وضبط أبعاد الصورة' : 'Crop & Adjust'}
                      style={{ padding: '8px 12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                    >
                      <Scissors size={14} /> {language === 'ar' ? 'قص' : 'Crop'}
                    </button>
                  )}
                  <button type="button" onClick={() => setNewsImageUrl('')} style={{ padding: '8px 12px', backgroundColor: 'var(--bg-card)', border: '1px solid #ff4d4d', color: '#ff4d4d', borderRadius: '4px', cursor: 'pointer' }}>{language === 'ar' ? 'مسح' : 'Clear'}</button>
                </div>
                {newsImageUrl && <img src={newsImageUrl} alt="Preview" style={{ height: '120px', objectFit: 'contain', borderRadius: '4px', marginTop: '4px', alignSelf: 'flex-start' }} />}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="submit" 
                  className={`${styles.bookBtn} ${savedNews ? 'btn-saved-success' : ''}`} 
                  style={{ 
                    marginTop: '10px', 
                    width: '200px',
                    backgroundColor: savedNews ? '#2ecc71' : undefined,
                    color: savedNews ? '#fff' : undefined,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {savedNews ? '✓ تم الحفظ بنجاح!' : (editingNewsId ? (language === 'ar' ? 'حفظ التعديل' : 'Save Changes') : (language === 'ar' ? 'نشر الخبر' : 'Publish News'))}
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
                        triggerEditScrollAndHighlight('news-form-card');
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
                        📅 {formatDateTime(msg.createdAt, language)}
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

      {/* Tab: AI Knowledge Chat */}
      {activeTab === 'ai-knowledge-chat' && (
        <AdminAiManager token={token} language={language} initialSubTab="admin-chat" />
      )}

      {/* Tab: AI Assistant Administration & Safe Testing Playground */}
      {activeTab === 'ai-assistant' && (
        <AdminAiManager token={token} language={language} />
      )}

      {/* Tab: Facebook Posts & News Moderation */}
      {activeTab === 'facebook-news' && (
        <div className="dashboard-panel">
          <FacebookNewsModerator token={token} />
        </div>
      )}

      {/* Tab: Official Email Center */}
      {activeTab === 'email-center' && (
        <div className="dashboard-panel">
          <AdminEmailCenter token={token} />
        </div>
      )}

      {/* Tab: Events, VIP Invitations & Continuous QR Check-in */}
      {activeTab === 'events-qr' && (
        <div className="dashboard-panel">
          <EventsInvitationsManager token={token} />
        </div>
      )}

      {/* Tab: FY Questions Moderation */}
      {activeTab === 'fy-moderation' && (
        <div className="dashboard-panel">
          <FyQuestionModerator token={token} />
        </div>
      )}

      {/* InstaPay Receipt Preview Modal */}
      {viewingReceiptUrl && (
        <div className={styles.modalOverlay} onClick={() => setViewingReceiptUrl(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', textAlign: 'center', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className={styles.closeBtn} onClick={() => setViewingReceiptUrl(null)}>
              <X size={20} />
            </button>
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.2rem', fontSize: '1.3rem' }}>
              🧾 {language === 'ar' ? 'معاينة إيصال تحويل إنستاباي' : 'InstaPay Receipt Preview'}
            </h3>
            <img 
              src={viewingReceiptUrl} 
              alt="Receipt" 
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--border-color)' }} 
            />
            <div style={{ marginTop: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setViewingReceiptUrl(null)} 
                className={styles.bookBtn} 
                style={{ width: 'auto', padding: '8px 24px' }}
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop & Ratio Adjustment Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageUrl={cropTargetImage}
        aspectRatioPreset={cropPreset}
        onCropComplete={(croppedDataUrl) => {
          cropCallback(croppedDataUrl);
          setCropModalOpen(false);
        }}
        onClose={() => setCropModalOpen(false)}
      />
    </div>
  );
}
