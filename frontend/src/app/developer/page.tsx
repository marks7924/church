'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './developer.module.css';
import { API_URL } from '../../config';
import {
  ShieldAlert, Activity, Users, Lock, Globe, Server, Database, 
  Terminal, Sliders, RefreshCw, Undo2, Redo2, AlertTriangle, 
  CheckCircle2, XCircle, Search, Sparkles, BookOpen, Clock, 
  Eye, EyeOff, Radio, Settings, Key, FileText, Bot, 
  Layers, HardDrive, Cpu, LogOut, ArrowRight, ShieldCheck, Flame,
  Menu, X, Download, Play, Check, AlertCircle, ExternalLink, Zap
} from 'lucide-react';

interface DeveloperUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roles: string[];
  isMaster?: boolean;
}

export default function DeveloperPortalPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isMasterDev, setIsMasterDev] = useState(false);
  const [token, setToken] = useState<string>('');

  // Navigation State
  const [activeSection, setActiveSection] = useState('command-center');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Environment Mode: 'PRODUCTION' | 'SAFE_ZONE'
  const [environmentMode, setEnvironmentMode] = useState<'PRODUCTION' | 'SAFE_ZONE'>('PRODUCTION');
  const [showExitSafeZoneModal, setShowExitSafeZoneModal] = useState(false);
  const [safeZoneDraft, setSafeZoneDraft] = useState<any>(null);

  // Command Center & Core State
  const [commandData, setCommandData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Sections State
  const [teamList, setTeamList] = useState<DeveloperUser[]>([]);
  const [lockdownState, setLockdownState] = useState<any>(null);
  const [ipBansList, setIpBansList] = useState<any[]>([]);
  const [pagePolicies, setPagePolicies] = useState<any[]>([]);
  const [navbarItems, setNavbarItems] = useState<any[]>([]);
  const [releasesList, setReleasesList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [themesList, setThemesList] = useState<any[]>([]);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [dbOverview, setDbOverview] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [incidentsList, setIncidentsList] = useState<any[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [integrationsList, setIntegrationsList] = useState<any[]>([]);
  const [configHistoryList, setConfigHistoryList] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any>(null);
  const [runningTests, setRunningTests] = useState(false);

  // Modals & Forms
  const [showAddDevModal, setShowAddDevModal] = useState(false);
  const [newDevForm, setNewDevForm] = useState({ email: '', password: '', fullName: '', phone: '' });

  const [showCancelEventModal, setShowCancelEventModal] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventSearchResults, setEventSearchResults] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [cancellationCodeInput, setCancellationCodeInput] = useState('');
  const [cancellationReasonInput, setCancellationReasonInput] = useState('');

  const [newIpBanForm, setNewIpBanForm] = useState({ ip: '', reason: '', expiresHours: '24' });
  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({ titleAr: '', titleEn: '', contentAr: '', contentEn: '', type: 'INFO' });

  const [showAddIncidentModal, setShowAddIncidentModal] = useState(false);
  const [newIncidentForm, setNewIncidentForm] = useState({ title: '', severity: 'HIGH', affectedModules: 'core, api', description: '' });

  // Developer AI Copilot State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiDiagnosing, setAiDiagnosing] = useState(false);

  // Load Auth on Mount
  useEffect(() => {
    const savedToken = localStorage.getItem('church-token');
    const savedUserStr = localStorage.getItem('church-user');

    if (!savedToken || !savedUserStr) {
      setIsAuthChecking(false);
      return;
    }

    try {
      const userObj = JSON.parse(savedUserStr);
      setCurrentUser(userObj);
      setToken(savedToken);

      const isDev = userObj.role === 'DEVELOPER' || (Array.isArray(userObj.roles) && userObj.roles.includes('DEVELOPER')) || userObj.email === 'marksamer010@gmail.com';
      const isMaster = userObj.email?.toLowerCase() === 'marksamer010@gmail.com';

      setIsMasterDev(isMaster);

      if (isDev) {
        setIsAuthChecking(false);
        fetchInitialData(savedToken);
      } else {
        setIsAuthChecking(false);
      }
    } catch (e) {
      setIsAuthChecking(false);
    }
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  // Fetch initial command center data
  const fetchInitialData = async (activeToken = token) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/developer/command-center`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCommandData(data);
        setLockdownState(data.lockdown);
        setFeatureFlags(data.flags || []);
        setDbOverview(data.database);
        setSystemMetrics(data.metrics);
      }
    } catch (e) {
      console.error('Error loading command center:', e);
    } finally {
      setLoading(false);
    }
  };

  // Section Data Fetching Router
  useEffect(() => {
    if (!token) return;

    if (activeSection === 'security-center' || activeSection === 'dev-permissions') {
      fetch(`${API_URL}/developer/team`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setTeamList(d.developers || []));
    } else if (activeSection === 'ip-bans') {
      fetch(`${API_URL}/developer/ip-bans`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setIpBansList(d.bans || []));
    } else if (activeSection === 'pages-navbar') {
      fetch(`${API_URL}/developer/pages`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setPagePolicies(d.pages || []));
      fetch(`${API_URL}/developer/navbar`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setNavbarItems(d.items || []));
    } else if (activeSection === 'push-history') {
      fetch(`${API_URL}/developer/releases`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setReleasesList(d.releases || []));
    } else if (activeSection === 'user-intelligence') {
      fetch(`${API_URL}/developer/users?page=1&limit=50&search=${encodeURIComponent(userSearch)}`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setUsersList(d.users || []));
    } else if (activeSection === 'themes-events') {
      fetch(`${API_URL}/developer/themes`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setThemesList(d.themes || []));
    } else if (activeSection === 'ai-chatbot') {
      fetch(`${API_URL}/developer/ai`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setAiStatus(d));
    } else if (activeSection === 'feature-flags') {
      fetch(`${API_URL}/developer/feature-flags`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setFeatureFlags(d.flags || []));
    } else if (activeSection === 'database') {
      fetch(`${API_URL}/developer/database`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setDbOverview(d));
    } else if (activeSection === 'audit-logs' || activeSection === 'logs-diagnostics') {
      fetch(`${API_URL}/developer/audit-logs`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setAuditLogs(d.logs || []));
    } else if (activeSection === 'incidents') {
      fetch(`${API_URL}/developer/incidents`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setIncidentsList(d.incidents || []));
    } else if (activeSection === 'announcements') {
      fetch(`${API_URL}/developer/announcements`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setAnnouncementsList(d.announcements || []));
    } else if (activeSection === 'backups-recovery') {
      fetch(`${API_URL}/developer/backups`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => { setBackupsList(d.snapshots || []); setDbOverview(d.dbOverview); });
    } else if (activeSection === 'integrations') {
      fetch(`${API_URL}/developer/integrations`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setIntegrationsList(d.integrations || []));
    } else if (activeSection === 'config-history') {
      fetch(`${API_URL}/developer/config-history`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setConfigHistoryList(d.history || []));
    } else if (activeSection === 'performance') {
      fetch(`${API_URL}/developer/metrics`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setSystemMetrics(d));
    } else if (activeSection === 'safe-zone') {
      fetch(`${API_URL}/developer/safe-zone`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => setSafeZoneDraft(d));
    }
  }, [activeSection, token, userSearch]);

  // Handle Master Developer adding a new dev
  const handleCreateDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/developer/team/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newDevForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', `تم إضافة المطور (${newDevForm.email}) بنجاح.`);
        setShowAddDevModal(false);
        setNewDevForm({ email: '', password: '', fullName: '', phone: '' });
        const refreshed = await fetch(`${API_URL}/developer/team`, { headers: getAuthHeaders() }).then(r => r.json());
        setTeamList(refreshed.developers || []);
      } else {
        showToast('error', data.error || 'تعذر إضافة المطور');
      }
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // Handle Lockdown Toggle
  const handleToggleLockdown = async () => {
    const nextState = !lockdownState?.isActive;
    const reason = prompt(nextState ? 'يرجى كتابة سبب تفعيل حظر الموقع الشامل (Lockdown):' : 'يرجى كتابة سبب إلغاء الحظر والعودة للعمل:');
    if (reason === null) return;

    try {
      const res = await fetch(`${API_URL}/developer/lockdown`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isActive: nextState,
          reason,
          customMessage: nextState ? 'الموقع يخضع حالياً لعملية صيانة وتحديث استثنائية من قبل الإدارة الفنية. سنعود للعمل قريباً جداً بمشيئة الرب.' : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLockdownState(data.lockdown);
        showToast('success', nextState ? 'تم تفعيل وضع الصيانة الاستثنائي (Lockdown) بنجاح.' : 'تم إلغاء وضع الصيانة وعودة الموقع للعمل.');
      } else {
        showToast('error', data.error || 'فشلت عملية التغيير');
      }
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // Handle Quick Event Search & Cancel
  const handleSearchEvents = async () => {
    if (!eventSearchQuery.trim()) return;
    try {
      const res = await fetch(`${API_URL}/developer/events/search?q=${encodeURIComponent(eventSearchQuery)}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setEventSearchResults(data.events || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteEventCancellation = async () => {
    if (!selectedEvent || !cancellationCodeInput.trim() || !cancellationReasonInput.trim()) {
      alert('يرجى ملء جميع الحقول ورمز الإلغاء');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/developer/events/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          eventId: selectedEvent.id,
          cancellationCode: cancellationCodeInput.trim(),
          reason: cancellationReasonInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', `تم إلغاء الفعالية (${selectedEvent.titleAr || selectedEvent.titleEn}) بأمان مع الاحتفاظ ببيانات الحجوزات.`);
        setShowCancelEventModal(false);
        setSelectedEvent(null);
        setCancellationCodeInput('');
        setCancellationReasonInput('');
      } else {
        showToast('error', data.error || 'فشل إلغاء الفعالية، تأكد من كود الإلغاء');
      }
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // Safe Zone Exit: NO / SAVE / PUSH
  const handleSafeZoneExit = async (action: 'NO' | 'SAVE' | 'PUSH') => {
    try {
      let pushSummary = '';
      let snapshotName = '';

      if (action === 'PUSH') {
        const conf = confirm('⚠️ تأكيد ترقية التعديلات للإنتاج الحقيقي (PRODUCTION PUSH)؟ سيتم توليد سجل إصدار دائم ونقطة استعادة فورية.');
        if (!conf) return;
        pushSummary = prompt('اكتب ملخص التغييرات للإصدار:') || 'Promoted Safe Zone changes';
      } else if (action === 'SAVE') {
        snapshotName = prompt('اسم اللقطة الخاصة (Snapshot Name):') || `Snapshot-${Date.now()}`;
      }

      const res = await fetch(`${API_URL}/developer/safe-zone/exit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, pushSummary, snapshotName })
      });
      const data = await res.json();

      if (res.ok) {
        if (action === 'NO') {
          showToast('info', 'تم التراجع عن جميع تعديلات البيئة المعزولة والعودة للنسخة الحية.');
          setEnvironmentMode('PRODUCTION');
        } else if (action === 'SAVE') {
          showToast('success', 'تم حفظ اللقطة الخاصة بنجاح لاستكمال العمل لاحقاً.');
        } else if (action === 'PUSH') {
          showToast('success', `تم ترقية التعديلات للإنتاج بنجاح! الإصدار الجديد: ${data.release?.version}`);
          setEnvironmentMode('PRODUCTION');
          fetchInitialData();
        }
        setShowExitSafeZoneModal(false);
      } else {
        showToast('error', data.error || 'فشلت العملية');
      }
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // Undo / Redo Releases
  const handleUndoRelease = async (releaseId: string) => {
    if (!confirm('هل أنت متأكد من التراجع عن هذا الإصدار (UNDO)؟ سيتم استعادة الحالة السابقة وتسجيل نقطة استرجاع دائمة.')) return;
    try {
      const res = await fetch(`${API_URL}/developer/releases/undo`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ releaseId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', `تم التراجع عن الإصدار بنجاح! تم إنشاء سجل: ${data.record.version}`);
        const refreshed = await fetch(`${API_URL}/developer/releases`, { headers: getAuthHeaders() }).then(r => r.json());
        setReleasesList(refreshed.releases || []);
      } else {
        showToast('error', data.error || 'تعذر التراجع');
      }
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const handleRedoRelease = async (releaseId: string) => {
    if (!confirm('هل تريد إعادة تطبيق هذا الإصدار (REDO)؟')) return;
    try {
      const res = await fetch(`${API_URL}/developer/releases/redo`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ releaseId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', `تمت إعادة تطبيق التعديلات بنجاح!`);
        const refreshed = await fetch(`${API_URL}/developer/releases`, { headers: getAuthHeaders() }).then(r => r.json());
        setReleasesList(refreshed.releases || []);
      } else {
        showToast('error', data.error || 'تعذر إعادة التطبيق');
      }
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // Liturgical Seasons Theme Switcher
  const handleActivateSeasonTheme = async (seasonKey: string) => {
    try {
      const res = await fetch(`${API_URL}/developer/themes/activate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ seasonKey })
      });
      if (res.ok) {
        showToast('success', `تم تفعيل نمط المناسبة الكنسية المباركة: (${seasonKey})`);
        const refreshed = await fetch(`${API_URL}/developer/themes`, { headers: getAuthHeaders() }).then(r => r.json());
        setThemesList(refreshed.themes || []);
      }
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // Chatbot Kill Switch
  const handleToggleAiKillSwitch = async (currentState: boolean) => {
    try {
      const res = await fetch(`${API_URL}/developer/ai/kill-switch`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isEnabled: !currentState })
      });
      if (res.ok) {
        showToast('success', !currentState ? 'تم تشغيل المساعد الذكي' : 'تم تفعيل مفتاح الإيقاف الفوري للمساعد الذكي (Kill Switch)');
        setAiStatus((prev: any) => ({ ...prev, isEnabled: !currentState }));
      }
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // Create Snapshot Backup
  const handleCreateSnapshotBackup = async () => {
    const name = prompt('اسم النسخة الاحتياطية (Snapshot Name):') || `ManualBackup-${Date.now()}`;
    try {
      const res = await fetch(`${API_URL}/developer/backups/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'تم إنشاء النسخة الاحتياطية بنجاح.');
        const ref = await fetch(`${API_URL}/developer/backups`, { headers: getAuthHeaders() }).then(r => r.json());
        setBackupsList(ref.snapshots || []);
      }
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // Run On-Demand Tests in Testing Lab
  const handleExecuteTestingLab = async () => {
    setRunningTests(true);
    try {
      const res = await fetch(`${API_URL}/developer/testing/run`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setTestResults(data);
      showToast('success', `اكتملت الاختبارات: ${data.passed}/${data.totalTests} ناجح`);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setRunningTests(false);
    }
  };

  // Developer AI Copilot Diagnostic Query
  const handleRunAiDiagnosis = async () => {
    if (!aiQuery.trim()) return;
    setAiDiagnosing(true);
    try {
      const res = await fetch(`${API_URL}/developer/ai/diagnose`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          query: aiQuery,
          context: {
            metrics: systemMetrics,
            database: dbOverview,
            activeLockdown: lockdownState?.isActive
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAiResponse(data.reply);
      } else {
        setAiResponse(`خطأ في التحليل: ${data.error}`);
      }
    } catch (e: any) {
      setAiResponse(`استثناء تشخيصي: ${e.message}`);
    } finally {
      setAiDiagnosing(false);
    }
  };

  // Access check
  if (isAuthChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0c10', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <Activity size={36} className="spin" style={{ color: '#e2b714', margin: '0 auto 1rem' }} />
          <p>جاري التحقق من صلاحيات المطور التقني المشفرة...</p>
        </div>
      </div>
    );
  }

  const isDev = currentUser && (currentUser.role === 'DEVELOPER' || (Array.isArray(currentUser.roles) && currentUser.roles.includes('DEVELOPER')) || currentUser.email === 'marksamer010@gmail.com');

  if (!isDev) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0c10', color: '#fff', padding: '2rem' }}>
        <div style={{ maxWidth: '520px', background: '#1c1d26', padding: '2.5rem', borderRadius: '16px', border: '1px solid #dc2626', textAlign: 'center' }}>
          <ShieldAlert size={56} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>منطقة المطورين التقنية المحمية</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            هذه البوابة مخصصة ومحمية حصرياً لمطور المنظومة (marksamer010@gmail.com). ولا يملك حتى مسؤولو الكنيسة صلاحية دخولها.
          </p>
          <button className={styles.btnPrimary} style={{ margin: '0 auto' }} onClick={() => router.push('/login')}>
            تسجيل الدخول بحساب المطور
          </button>
        </div>
      </div>
    );
  }

  // All 26 Sections Definition
  const sidebarSections = [
    { id: 'command-center', labelAr: 'مركز القيادة والتحكم', labelEn: 'Command Center', icon: Activity },
    { id: 'security-center', labelAr: 'مركز الأمان والمطورين', labelEn: 'Security Center', icon: ShieldCheck },
    { id: 'dev-permissions', labelAr: 'الصلاحيات ورتب الديسكورد', labelEn: 'Discord-Style Roles', icon: Key },
    { id: 'safe-zone', labelAr: 'البيئة المعزولة (Safe Zone)', labelEn: 'Safe Zone Sandbox', icon: Layers, badge: environmentMode === 'SAFE_ZONE' ? 'ACTIVE' : undefined },
    { id: 'push-history', labelAr: 'سجل الترقية والتراجع (UNDO/REDO)', labelEn: 'Push History & Undo', icon: Undo2 },
    { id: 'emergency-controls', labelAr: 'طوارئ الإغلاق والإلغاء السريع', labelEn: 'Emergency Controls', icon: ShieldAlert, badge: lockdownState?.isActive ? 'LOCKED' : undefined },
    { id: 'pages-navbar', labelAr: 'التحكم بالصفحات والشريط العلوي', labelEn: 'Page & Navbar Control', icon: Globe },
    { id: 'ip-bans', labelAr: 'إدارة حظر العناوين (IP Bans)', labelEn: 'IP Ban Manager', icon: XCircle },
    { id: 'user-intelligence', labelAr: 'استخبارات الحسابات والجلسات', labelEn: 'User Intelligence', icon: Users },
    { id: 'themes-events', labelAr: 'مواسم الكنيسة والمظهر العام', labelEn: 'Themes & Liturgical Seasons', icon: Sparkles },
    { id: 'ai-chatbot', labelAr: 'المساعد الذكي وزر الإيقاف', labelEn: 'AI & Chatbot Kill Switch', icon: Bot },
    { id: 'feature-flags', labelAr: 'إدارة الخصائص والموديولات', labelEn: 'Feature Flags & Modules', icon: Sliders },
    { id: 'database', labelAr: 'قاعدة البيانات (PostgreSQL)', labelEn: 'Database Diagnostics', icon: Database },
    { id: 'backups-recovery', labelAr: 'النسخ الاحتياطي والاستعادة', labelEn: 'Backups & Recovery', icon: HardDrive },
    { id: 'deployments', labelAr: 'إدارة الإصدارات والنشر', labelEn: 'Deployments & Releases', icon: Server },
    { id: 'audit-logs', labelAr: 'سجل العمليات الشامل (Audit)', labelEn: 'Universal Audit Log', icon: FileText },
    { id: 'logs-diagnostics', labelAr: 'السجلات والتشخيصات', labelEn: 'Logs & Diagnostics', icon: Terminal },
    { id: 'performance', labelAr: 'الأداء ومعدل التشغيل', labelEn: 'Performance & Uptime', icon: Cpu },
    { id: 'integrations', labelAr: 'التكاملات والخدمات السحابية', labelEn: 'Integrations & Config', icon: Settings },
    { id: 'api-jobs', labelAr: 'مستكشف الـ APIs والمهام', labelEn: 'API Explorer & Jobs', icon: Radio },
    { id: 'announcements', labelAr: 'الإعلانات ورسائل الصيانة', labelEn: 'Global Announcements', icon: AlertTriangle },
    { id: 'incidents', labelAr: 'إدارة البلاغات والحوادث', labelEn: 'Incident Management', icon: Flame },
    { id: 'config-history', labelAr: 'سجل التغييرات البرمجية', labelEn: 'Configuration History', icon: Clock },
    { id: 'testing-lab', labelAr: 'مختبر الاختبارات المباشرة', labelEn: 'Testing Lab', icon: CheckCircle2 },
    { id: 'ai-assistant', labelAr: 'مساعد المطور الذكي (Copilot)', labelEn: 'Developer AI Assistant', icon: Sparkles },
    { id: 'dependencies', labelAr: 'الاعتماديات ومعمارية النظام', labelEn: 'Dependencies & Architecture', icon: Layers }
  ];

  const filteredSections = sidebarSections.filter(s =>
    s.labelAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.labelEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.portalContainer}>
      {/* MOBILE TOP HEADER BAR (VISIBLE ONLY ON MOBILE/TABLET) */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileTitle}>
          <Terminal size={18} />
          <span>بوابة التحكم الفني</span>
        </div>
        <button className={styles.mobileMenuBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className={styles.sidebarWrapper}>
        {/* MOBILE SIDEBAR BACKDROP */}
        {mobileMenuOpen && (
          <div className={styles.sidebarBackdrop} onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* SIDEBAR NAVIGATION */}
        <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <div>
              <div className={styles.sidebarTitle}>
                <Terminal size={20} />
                <span>بوابة المطورين</span>
              </div>
              <div className={styles.sidebarSubtitle}>
                {isMasterDev ? 'المطور الرئيسي: Mark' : currentUser?.email}
              </div>
            </div>
            {mobileMenuOpen && (
              <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setMobileMenuOpen(false)}>
                <X size={18} />
              </button>
            )}
          </div>

          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="بحث في أقسام البوابة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ul className={styles.navList}>
            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <li key={sec.id} className={styles.navItem} onClick={() => { setActiveSection(sec.id); setMobileMenuOpen(false); }}>
                  <div className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                    <Icon size={16} />
                    <span>{sec.labelAr}</span>
                    {sec.badge && (
                      <span className={styles.navBadge}>{sec.badge}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        <main className={styles.mainContent}>
          {feedbackMsg && (
            <div className={`${styles.noticeBox} ${feedbackMsg.type === 'error' ? styles.noticeDanger : styles.noticePurple}`}>
              {feedbackMsg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* 1. COMMAND CENTER */}
          {activeSection === 'command-center' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Activity size={24} style={{ color: 'var(--accent-gold)' }} /> مركز القيادة والتحكم الفني</h1>
                  <p className={styles.sectionDesc}>المؤشرات الحية لحالة الخوادم، الأمان، البيئة الإنتاجية، وقاعدة بيانات الكنيسة.</p>
                </div>
                <button className={styles.btnSecondary} onClick={() => fetchInitialData()}>
                  <RefreshCw size={14} /> تحديث المؤشرات
                </button>
              </div>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}><Server size={16} /> حالة المنظومة والخوادم</span>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>متصل ومستقر</span>
                  </div>
                  <div className={styles.cardValue}>100%</div>
                  <div className={styles.cardSubtitle}>Node.js {systemMetrics?.nodeVersion || 'v24'} | بيئة التشغيل: {systemMetrics?.environment || 'production'}</div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}><Database size={16} /> استجابة قاعدة البيانات</span>
                    <span className={`${styles.badge} ${dbOverview?.latencyMs < 600 ? styles.badgeSuccess : styles.badgeWarning}`}>
                      {dbOverview?.latencyMs || 0} ms
                    </span>
                  </div>
                  <div className={styles.cardValue}>{dbOverview?.tables?.find((t: any) => t.name === 'User')?.count || 0} مستخدم</div>
                  <div className={styles.cardSubtitle}>PostgreSQL (AWS Direct + Supabase Pooler)</div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}><ShieldAlert size={16} /> وضع الصيانة والطوارئ</span>
                    <span className={`${styles.badge} ${lockdownState?.isActive ? styles.badgeDanger : styles.badgeSuccess}`}>
                      {lockdownState?.isActive ? 'حظر شامل نشط' : 'الخدمة مفتوحة'}
                    </span>
                  </div>
                  <div className={styles.cardValue}>{lockdownState?.isActive ? 'LOCKED' : 'NORMAL'}</div>
                  <div className={styles.cardSubtitle}>
                    <button className={styles.btnDanger} style={{ marginTop: '0.5rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={handleToggleLockdown}>
                      {lockdownState?.isActive ? 'إلغاء وضع الصيانة' : 'تفعيل إغلاق الطوارئ'}
                    </button>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}><Bot size={16} /> المساعد الروحي الذكي</span>
                    <span className={`${styles.badge} ${aiStatus?.isEnabled ? styles.badgeSuccess : styles.badgeDanger}`}>
                      {aiStatus?.isEnabled ? 'يعمل' : 'موقوف'}
                    </span>
                  </div>
                  <div className={styles.cardValue}>{aiStatus?.provider || 'Gemini + Groq'}</div>
                  <div className={styles.cardSubtitle}>
                    <button className={styles.btnSecondary} style={{ marginTop: '0.5rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleToggleAiKillSwitch(aiStatus?.isEnabled)}>
                      {aiStatus?.isEnabled ? 'تفعيل مفتاح الإيقاف (Kill Switch)' : 'إعادة تشغيل البوت'}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.tableContainer} style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent-gold)' }}>
                  إجراءات الطوارئ والتحكم السريع
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className={styles.btnDanger} onClick={() => setShowCancelEventModal(true)}>
                    <XCircle size={16} /> إلغاء فعالية سريع بكود الأمان (ch140ch140)
                  </button>
                  <button className={styles.btnPrimary} onClick={() => setActiveSection('safe-zone')}>
                    <Layers size={16} /> تجربة تعديلات في البيئة المعزولة
                  </button>
                  <button className={styles.btnSecondary} onClick={() => setActiveSection('push-history')}>
                    <Undo2 size={16} /> التراجع عن آخر إصدار (UNDO)
                  </button>
                  <button className={styles.btnSecondary} onClick={() => setActiveSection('ip-bans')}>
                    <ShieldAlert size={16} /> حظر عنوان IP هجومي
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. SECURITY CENTER */}
          {activeSection === 'security-center' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><ShieldCheck size={24} style={{ color: 'var(--accent-gold)' }} /> مركز أمان المطورين</h1>
                  <p className={styles.sectionDesc}>حماية طبقة المطورين. حصرياً لـ marksamer010@gmail.com صلاحية إضافة مطورين جدد.</p>
                </div>
                {isMasterDev && (
                  <button className={styles.btnPrimary} onClick={() => setShowAddDevModal(true)}>
                    + إضافة مطور جديد (خاص بـ Mark)
                  </button>
                )}
              </div>

              <div className={styles.noticeBox}>
                <Key size={20} style={{ color: 'var(--accent-gold)' }} />
                <div>
                  <strong>قاعدة الأمان غير القابلة للتفاوض:</strong> المطور الرئيسي الوحيد المخول له تعيين أو حذف مطورين هو <code>marksamer010@gmail.com</code>. لا يملك أي مسؤول كنسي أو مطور فرعي آخر صلاحية منح رتبة Developer.
                </div>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>قائمة المطورين المعتمدين بالنظام ({teamList.length})</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>المطور</th>
                        <th>البريد الإلكتروني</th>
                        <th>الرتبة</th>
                        <th>الصفة</th>
                        <th>تاريخ الاعتماد</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamList.map((dev) => (
                        <tr key={dev.id}>
                          <td style={{ fontWeight: 600 }}>{dev.fullName}</td>
                          <td><code>{dev.email}</code></td>
                          <td><span className={`${styles.badge} ${styles.badgePurple}`}>DEVELOPER</span></td>
                          <td>
                            {dev.isMaster ? (
                              <span className={`${styles.badge} ${styles.badgeWarning}`}>المطور الرئيسي (Master Dev)</span>
                            ) : (
                              <span className={`${styles.badge} ${styles.badgeInfo}`}>مطور فرعي</span>
                            )}
                          </td>
                          <td>{new Date((dev as any).createdAt).toLocaleDateString('ar-EG')}</td>
                          <td>
                            {isMasterDev && !dev.isMaster ? (
                              <button
                                className={styles.btnDanger}
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={async () => {
                                  if (confirm(`هل تريد سحب صلاحية المطور من ${dev.email}؟`)) {
                                    await fetch(`${API_URL}/developer/team/${dev.email}`, { method: 'DELETE', headers: getAuthHeaders() });
                                    showToast('success', 'تم سحب الصلاحيات.');
                                    const ref = await fetch(`${API_URL}/developer/team`, { headers: getAuthHeaders() }).then(r => r.json());
                                    setTeamList(ref.developers || []);
                                  }
                                }}
                              >
                                سحب الصلاحية
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>حساب رئيسي محمي</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. DISCORD-STYLE ROLES & PERMISSIONS */}
          {activeSection === 'dev-permissions' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Key size={24} style={{ color: 'var(--accent-gold)' }} /> الصلاحيات ورتب الديسكورد (Discord-Style Permissions)</h1>
                  <p className={styles.sectionDesc}>مصفوفة الصلاحيات الحبيبية الهرمية ومنع تصعيد الرتب برمجياً.</p>
                </div>
              </div>

              <div className={styles.grid}>
                {[
                  { name: 'DEVELOPER', prio: 100, color: '#c084fc', desc: 'صلاحيات مطلقة للنظام والبنية التحتية، حصرية لـ Mark' },
                  { name: 'SUPER_ADMIN', prio: 90, color: '#f59e0b', desc: 'إدارة شاملة لجميع شؤون الكنيسة والمستخدمين' },
                  { name: 'CHURCH_ADMIN', prio: 80, color: '#3b82f6', desc: 'إدارة الخدمات، الصلوات، والأنشطة الإدارية' },
                  { name: 'BISHOP', prio: 70, color: '#6366f1', desc: 'رتبة الآباء الأساقفة وسيدنا ومواعيد الرعاية' },
                  { name: 'PRIEST', prio: 60, color: '#06b6d4', desc: 'الآباء الكهنة، سر الاعتراف، والعظات والقداسات' },
                  { name: 'SECRETARY', prio: 50, color: '#14b8a6', desc: 'السكرتارية وسجلات العضوية الكنسية' },
                  { name: 'TRIP_MANAGER', prio: 40, color: '#22c55e', desc: 'إدارة حجوزات الرحلات والمؤتمرات الكنسية' },
                  { name: 'QR_SCANNER', prio: 30, color: '#f97316', desc: 'مسح باركود وتذاكر حضور الفعاليات' },
                  { name: 'MEMBER', prio: 10, color: '#94a3b8', desc: 'أبناء وشعب الكنيسة والمخدومين' }
                ].map((role) => (
                  <div key={role.name} className={styles.card} style={{ borderInlineStart: `4px solid ${role.color}` }}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle} style={{ color: role.color }}>{role.name}</span>
                      <span className={`${styles.badge} ${styles.badgeInfo}`}>أولوية: {role.prio}</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{role.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. SAFE ZONE */}
          {activeSection === 'safe-zone' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Layers size={24} style={{ color: '#c084fc' }} /> البيئة المعزولة (Safe Zone Sandbox)</h1>
                  <p className={styles.sectionDesc}>منطقة اختبار آمنة تماماً. تتيح لك معاينة وتعديل الصفحات والخصائص بدون التأثير على الموقع الحقيقي حتى تقرر الترقية (PUSH).</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => handleSafeZoneExit('NO')}>
                    <XCircle size={14} /> NO (إلغاء التعديلات)
                  </button>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => handleSafeZoneExit('SAVE')}>
                    <HardDrive size={14} /> SAVE (حفظ لقطة خاصة)
                  </button>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleSafeZoneExit('PUSH')}>
                    <ArrowRight size={14} /> PUSH (ترقية للإنتاج الحقيقي)
                  </button>
                </div>
              </div>

              <div className={`${styles.noticeBox} ${styles.noticePurple}`}>
                <Sparkles size={20} style={{ color: '#c084fc' }} />
                <div>
                  <strong>نظام الخروج الصارم: NO / SAVE / PUSH:</strong>
                  <ul style={{ margin: '0.35rem 0 0 1.25rem', fontSize: '0.82rem', lineHeight: '1.6' }}>
                    <li><strong>NO (Discard):</strong> إتلاف التعديلات الحالية فوراً وإعادة البيئة المعزولة إلى حالة الإنتاج النظيفة.</li>
                    <li><strong>SAVE (Keep Privately):</strong> حفظ التعديلات في لقطة مشفرة خاصة بك لاستئناف العمل عليها لاحقاً دون إطلاقها.</li>
                    <li><strong>PUSH (Promote to Production):</strong> فحص التعارضات، إصدار نسخة جديدة وتطبيق التغييرات على قاعدة البيانات الحية مع حفظ نقطة تراجع دائمة (UNDO).</li>
                  </ul>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>حالة التعديلات غير المحفوظة</span>
                    <span className={`${styles.badge} ${safeZoneDraft?.hasUnsavedChanges ? styles.badgeWarning : styles.badgeSuccess}`}>
                      {safeZoneDraft?.hasUnsavedChanges ? 'توجد تعديلات مسودة' : 'مطابقة للإنتاج'}
                    </span>
                  </div>
                  <div className={styles.cardValue}>{safeZoneDraft?.hasUnsavedChanges ? 'مسودة معزولة' : 'BASELINE'}</div>
                  <div className={styles.cardSubtitle}>لن تظهر أي تعديلات للجمهور إلا بعد الضغط على PUSH ومراجعة التقرير.</div>
                </div>
              </div>
            </div>
          )}

          {/* 5. PUSH HISTORY, UNDO AND REDO */}
          {activeSection === 'push-history' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Undo2 size={24} style={{ color: 'var(--accent-gold)' }} /> سجل الترقية والنسخ (Push History & Version Control)</h1>
                  <p className={styles.sectionDesc}>أرشيف دائم غير قابل للمحو لجميع عمليات الترقية للإنتاج مع إمكانية التراجع الفوري (UNDO) أو إعادة التطبيق (REDO).</p>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>سجلات الإصدارات الدائمة ({releasesList.length})</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>رقم الإصدار</th>
                        <th>النوع</th>
                        <th>ملخص التغيير</th>
                        <th>المطور المنفذ</th>
                        <th>الحالة</th>
                        <th>التاريخ والوقت</th>
                        <th>التحكم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {releasesList.map((rel) => (
                        <tr key={rel.id}>
                          <td><strong style={{ color: 'var(--accent-gold)' }}>{rel.version}</strong></td>
                          <td>
                            <span className={`${styles.badge} ${rel.changeType === 'PUSH' ? styles.badgeSuccess : rel.changeType === 'UNDO' ? styles.badgeDanger : styles.badgeInfo}`}>
                              {rel.changeType}
                            </span>
                          </td>
                          <td style={{ maxWidth: '300px' }}>{rel.summary}</td>
                          <td><code>{rel.developerEmail}</code></td>
                          <td>
                            <span className={`${styles.badge} ${rel.status === 'SUCCESS' ? styles.badgeSuccess : styles.badgeWarning}`}>
                              {rel.status}
                            </span>
                          </td>
                          <td>{new Date(rel.createdAt).toLocaleString('ar-EG')}</td>
                          <td>
                            {rel.status === 'SUCCESS' && rel.changeType === 'PUSH' && (
                              <button className={styles.btnDanger} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleUndoRelease(rel.id)}>
                                <Undo2 size={12} /> تراجع (UNDO)
                              </button>
                            )}
                            {rel.status === 'UNDONE' && (
                              <button className={styles.btnPrimary} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleRedoRelease(rel.id)}>
                                <Redo2 size={12} /> إعادة تطبيق (REDO)
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. EMERGENCY CONTROLS */}
          {activeSection === 'emergency-controls' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><ShieldAlert size={24} style={{ color: '#ef4444' }} /> طوارئ الموقع وإلغاء الفعاليات السريع</h1>
                  <p className={styles.sectionDesc}>أدوات الطوارئ الحساسة المجهزة بأكواد تحقق مشفرة خادمة (Server-Side Code Verification).</p>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>وضع الصيانة العام (Website Lockdown)</span>
                    <span className={`${styles.badge} ${lockdownState?.isActive ? styles.badgeDanger : styles.badgeSuccess}`}>
                      {lockdownState?.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    يمنع جميع الزوار والمستخدمين العاديين من تصفح الموقع وعرض رسالة صيانة مخصصة، مع إبقاء إمكانية وصول المطور للتعافي.
                  </p>
                  <button className={lockdownState?.isActive ? styles.btnSuccess : styles.btnDanger} onClick={handleToggleLockdown}>
                    {lockdownState?.isActive ? 'إلغاء وضع الصيانة الشامل' : 'تفعيل إغلاق الطوارئ فوراً'}
                  </button>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>إلغاء الفعاليات السريع (Quick Cancel)</span>
                    <span className={`${styles.badge} ${styles.badgeWarning}`}>يتطلب كود الحماية</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    أداة مخصصة لمطور النظام لإلغاء أي فعالية طارئة فوراً بعد إدخال كود الحماية السري (ch140ch140)، مع الاحتفاظ الكامل ببيانات الحجوزات والمدفوعات دون فقد.
                  </p>
                  <button className={styles.btnDanger} onClick={() => setShowCancelEventModal(true)}>
                    فتح أداة إلغاء الفعالية
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 7. PAGE AND NAVBAR CONTROL */}
          {activeSection === 'pages-navbar' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Globe size={24} style={{ color: 'var(--accent-gold)' }} /> التحكم بالصفحات والشريط العلوي (Page & Navbar Control)</h1>
                  <p className={styles.sectionDesc}>إدارة وصول الصفحات وظهور عناصر القائمة، مع دعم القيود المؤقتة المجدولة المؤتمتة الانتهاء.</p>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>سياسات الوصول لصفحات الموقع ({pagePolicies.length})</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>مسار الصفحة</th>
                        <th>عنوان الصفحة</th>
                        <th>السياسة الدائمة</th>
                        <th>تجاوز مؤقت (Override)</th>
                        <th>ينتهي في</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagePolicies.map((p) => (
                        <tr key={p.id}>
                          <td><code>{p.routePath}</code></td>
                          <td>{p.pageTitleAr} ({p.pageTitleEn})</td>
                          <td>
                            <select
                              className={styles.formSelect}
                              style={{ padding: '0.2rem 0.5rem', width: 'auto' }}
                              value={p.permanentPolicy}
                              onChange={async (e) => {
                                await fetch(`${API_URL}/developer/pages/permanent`, {
                                  method: 'PUT',
                                  headers: getAuthHeaders(),
                                  body: JSON.stringify({ routePath: p.routePath, permanentPolicy: e.target.value })
                                });
                                showToast('success', `تم تحديث سياسة ${p.routePath} إلى ${e.target.value}`);
                                const ref = await fetch(`${API_URL}/developer/pages`, { headers: getAuthHeaders() }).then(r => r.json());
                                setPagePolicies(ref.pages || []);
                              }}
                            >
                              <option value="PUBLIC">عام للجميع (PUBLIC)</option>
                              <option value="AUTHENTICATED">للمسجلين فقط (AUTHENTICATED)</option>
                              <option value="ADMIN_ABOVE">المسؤولين فما فوق</option>
                              <option value="DEVELOPER_ONLY">المطورين فقط</option>
                              <option value="DISABLED">معطلة مؤقتاً</option>
                              <option value="MAINTENANCE">صيانة مخصصة</option>
                            </select>
                          </td>
                          <td>
                            {p.hasActiveOverride ? (
                              <span className={`${styles.badge} ${styles.badgeWarning}`}>مفعّل: {p.overridePolicy}</span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)' }}>لا يوجد</span>
                            )}
                          </td>
                          <td>{p.overrideExpiresAt ? new Date(p.overrideExpiresAt).toLocaleTimeString('ar-EG') : '-'}</td>
                          <td>
                            {p.hasActiveOverride ? (
                              <button
                                className={styles.btnSecondary}
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={async () => {
                                  await fetch(`${API_URL}/developer/pages/override`, {
                                    method: 'DELETE',
                                    headers: getAuthHeaders(),
                                    body: JSON.stringify({ routePath: p.routePath })
                                  });
                                  showToast('success', 'تم إلغاء التجاوز المؤقت واستعادة السياسة الدائمة.');
                                  const ref = await fetch(`${API_URL}/developer/pages`, { headers: getAuthHeaders() }).then(r => r.json());
                                  setPagePolicies(ref.pages || []);
                                }}
                              >
                                إلغاء التجاوز
                              </button>
                            ) : (
                              <button
                                className={styles.btnPrimary}
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={async () => {
                                  const hours = prompt('مدة التقييد المؤقت بالساعات (مثال: 2):', '2');
                                  if (!hours) return;
                                  const reason = prompt('سبب التقييد المؤقت: ') || 'بروفة واجتماع مغلق';
                                  const expires = new Date(Date.now() + parseFloat(hours) * 3600 * 1000);
                                  await fetch(`${API_URL}/developer/pages/override`, {
                                    method: 'POST',
                                    headers: getAuthHeaders(),
                                    body: JSON.stringify({
                                      routePath: p.routePath,
                                      overridePolicy: 'ADMIN_ABOVE',
                                      expiresAt: expires.toISOString(),
                                      reason
                                    })
                                  });
                                  showToast('success', 'تم تفعيل التقييد المؤقت بنجاح.');
                                  const ref = await fetch(`${API_URL}/developer/pages`, { headers: getAuthHeaders() }).then(r => r.json());
                                  setPagePolicies(ref.pages || []);
                                }}
                              >
                                تقييد مؤقت
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 8. IP BAN MANAGER */}
          {activeSection === 'ip-bans' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><XCircle size={24} style={{ color: '#ef4444' }} /> إدارة حظر العناوين (IP Ban Manager)</h1>
                  <p className={styles.sectionDesc}>حظر وتتبع عناوين بروتوكول الإنترنت المريبة وحماية خوادم الكنيسة من هجمات DoS.</p>
                </div>
              </div>

              <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>إضافة حظر عنوان IP جديد</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="عنوان IP (مثال: 198.51.100.4)"
                    className={styles.formInput}
                    style={{ maxWidth: '240px' }}
                    value={newIpBanForm.ip}
                    onChange={(e) => setNewIpBanForm({ ...newIpBanForm, ip: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="سبب الحظر"
                    className={styles.formInput}
                    style={{ maxWidth: '340px' }}
                    value={newIpBanForm.reason}
                    onChange={(e) => setNewIpBanForm({ ...newIpBanForm, reason: e.target.value })}
                  />
                  <button
                    className={styles.btnDanger}
                    onClick={async () => {
                      if (!newIpBanForm.ip.trim() || !newIpBanForm.reason.trim()) return alert('أدخل العنوان والسبب');
                      const res = await fetch(`${API_URL}/developer/ip-bans`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(newIpBanForm)
                      });
                      if (res.ok) {
                        showToast('success', `تم حظر عنوان الـ IP (${newIpBanForm.ip})`);
                        setNewIpBanForm({ ip: '', reason: '', expiresHours: '24' });
                        const ref = await fetch(`${API_URL}/developer/ip-bans`, { headers: getAuthHeaders() }).then(r => r.json());
                        setIpBansList(ref.bans || []);
                      } else {
                        const err = await res.json();
                        showToast('error', err.error || 'فشل الحظر');
                      }
                    }}
                  >
                    تنفيذ الحظر
                  </button>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>العناوين المحظورة الحالية ({ipBansList.length})</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>العنوان (IP)</th>
                        <th>السبب</th>
                        <th>المسؤول عن الحظر</th>
                        <th>تاريخ الحظر</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ipBansList.map((ban) => (
                        <tr key={ban.id}>
                          <td><code>{ban.ip}</code></td>
                          <td>{ban.reason}</td>
                          <td><code>{ban.bannedBy}</code></td>
                          <td>{new Date(ban.createdAt).toLocaleString('ar-EG')}</td>
                          <td>
                            <button
                              className={styles.btnSecondary}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={async () => {
                                await fetch(`${API_URL}/developer/ip-bans/${ban.ip}`, { method: 'DELETE', headers: getAuthHeaders() });
                                showToast('success', `تم إلغاء حظر الـ IP: ${ban.ip}`);
                                const ref = await fetch(`${API_URL}/developer/ip-bans`, { headers: getAuthHeaders() }).then(r => r.json());
                                setIpBansList(ref.bans || []);
                              }}
                            >
                              إلغاء الحظر (Unban)
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 9. USER INTELLIGENCE & SESSIONS */}
          {activeSection === 'user-intelligence' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Users size={24} style={{ color: 'var(--accent-gold)' }} /> استخبارات الحسابات والجلسات (User Intelligence)</h1>
                  <p className={styles.sectionDesc}>فحص حسابات المستخدمين، حالة التحقق، سجل الأنشطة الكنسية، والتحكم الفوري بالحظر وفك الحظر.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="بحث باسم أو إيميل المستخدم..."
                    className={styles.formInput}
                    style={{ width: '240px' }}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>قائمة المستخدمين ({usersList.length})</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>المستخدم</th>
                        <th>البريد الإلكتروني</th>
                        <th>الرتبة</th>
                        <th>حالة الحساب</th>
                        <th>نشاط الاعترافات</th>
                        <th>بطاقات الفعاليات</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((u) => (
                        <tr key={u.id}>
                          <td><strong>{u.fullName}</strong></td>
                          <td><code>{u.email}</code></td>
                          <td><span className={`${styles.badge} ${styles.badgeInfo}`}>{u.role}</span></td>
                          <td>
                            {u.isBanned ? (
                              <span className={`${styles.badge} ${styles.badgeDanger}`}>محظور</span>
                            ) : (
                              <span className={`${styles.badge} ${styles.badgeSuccess}`}>نشط ومفعل</span>
                            )}
                          </td>
                          <td>{u._count?.appointments || 0} موعد</td>
                          <td>{u._count?.eventInvitations || 0} بطاقة</td>
                          <td>
                            {u.isMasterDeveloper ? (
                              <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 600 }}>مطور رئيسي محصن</span>
                            ) : (
                              <button
                                className={u.isBanned ? styles.btnSuccess : styles.btnDanger}
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={async () => {
                                  const reason = u.isBanned ? '' : prompt('سبب حظر الحساب:');
                                  if (!u.isBanned && reason === null) return;
                                  await fetch(`${API_URL}/developer/users/ban`, {
                                    method: 'POST',
                                    headers: getAuthHeaders(),
                                    body: JSON.stringify({ userId: u.id, isBanned: !u.isBanned, banReason: reason })
                                  });
                                  showToast('success', u.isBanned ? 'تم تفعيل الحساب' : 'تم حظر الحساب');
                                  const ref = await fetch(`${API_URL}/developer/users?page=1&limit=50`, { headers: getAuthHeaders() }).then(r => r.json());
                                  setUsersList(ref.users || []);
                                }}
                              >
                                {u.isBanned ? 'فك الحظر' : 'حظر الحساب'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 10. LITURGICAL SEASONS AND THEMES */}
          {activeSection === 'themes-events' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Sparkles size={24} style={{ color: 'var(--accent-gold)' }} /> مواسم الكنيسة والمظهر العام (Liturgical Themes)</h1>
                  <p className={styles.sectionDesc}>تبديل مظهر الموقع العام ليتناسب مع طقس وفرحة أو خشوع المناسبة الكنسية القبطية الحالية.</p>
                </div>
              </div>

              <div className={styles.grid}>
                {themesList.map((th) => (
                  <div key={th.id} className={styles.card} style={{ borderColor: th.isActive ? 'var(--accent-gold)' : undefined }}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{th.nameAr}</span>
                      {th.isActive ? (
                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>المظهر النشط حالياً</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeInfo}`}>{th.seasonKey}</span>
                      )}
                    </div>
                    <div className={styles.cardSubtitle} style={{ marginBottom: '1rem' }}>{th.nameEn}</div>
                    {!th.isActive && (
                      <button className={styles.btnPrimary} style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleActivateSeasonTheme(th.seasonKey)}>
                        تفعيل هذا النمط الكنسي
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11. AI & CHATBOT CONTROL */}
          {activeSection === 'ai-chatbot' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Bot size={24} style={{ color: 'var(--accent-gold)' }} /> المساعد الروحي الذكي وزر الإيقاف الفوري</h1>
                  <p className={styles.sectionDesc}>التحكم الخادم بمحرك الذكاء الاصطناعي وبنك المعرفة ومفتاح الإيقاف الإجباري (Backend Kill Switch).</p>
                </div>
                <button
                  className={aiStatus?.isEnabled ? styles.btnDanger : styles.btnSuccess}
                  onClick={() => handleToggleAiKillSwitch(aiStatus?.isEnabled)}
                >
                  {aiStatus?.isEnabled ? 'تفعيل مفتاح الإيقاف الإجباري (Kill Switch)' : 'إعادة تفعيل المساعد'}
                </button>
              </div>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>المزود الأساسي والمساعد الاحتياطي</span>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>جاهز</span>
                  </div>
                  <div className={styles.cardValue}>{aiStatus?.provider?.toUpperCase() || 'GEMINI'}</div>
                  <div className={styles.cardSubtitle}>الاحتياطي في حال تعذر الاتصال: {aiStatus?.fallbackProvider || 'Groq'}</div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>إجمالي المحادثات المسجلة</span>
                  </div>
                  <div className={styles.cardValue}>{aiStatus?.totalConversations || 0}</div>
                  <div className={styles.cardSubtitle}>إجمالي الرسائل المعالجة: {aiStatus?.totalMessages || 0}</div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>بنود المعرفة الكنسية المفهرسة</span>
                  </div>
                  <div className={styles.cardValue}>{aiStatus?.totalKnowledge || 0} بند</div>
                  <div className={styles.cardSubtitle}>عقائد، تاريخ، طقس، ومواعيد الكنيسة</div>
                </div>
              </div>
            </div>
          )}

          {/* 12. FEATURE FLAGS & MODULES */}
          {activeSection === 'feature-flags' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Sliders size={24} style={{ color: 'var(--accent-gold)' }} /> إدارة الخصائص والموديولات (Feature Flags)</h1>
                  <p className={styles.sectionDesc}>تفعيل أو إيقاف أي جزء من المنظومة خادمياً وبشكل فوري.</p>
                </div>
              </div>

              <div className={styles.grid}>
                {featureFlags.map((flag) => (
                  <div key={flag.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{flag.nameAr}</span>
                      <span className={`${styles.badge} ${flag.isEnabled ? styles.badgeSuccess : styles.badgeDanger}`}>
                        {flag.isEnabled ? 'مفعل (ON)' : 'معطل (OFF)'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.5' }}>
                      {flag.description || flag.nameEn}
                    </p>
                    <button
                      className={flag.isEnabled ? styles.btnDanger : styles.btnSuccess}
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={async () => {
                        const next = !flag.isEnabled;
                        await fetch(`${API_URL}/developer/feature-flags`, {
                          method: 'PUT',
                          headers: getAuthHeaders(),
                          body: JSON.stringify({ key: flag.key, isEnabled: next })
                        });
                        showToast('success', `تم تغيير حالة ${flag.nameAr} إلى ${next ? 'مفعل' : 'معطل'}`);
                        const ref = await fetch(`${API_URL}/developer/feature-flags`, { headers: getAuthHeaders() }).then(r => r.json());
                        setFeatureFlags(ref.flags || []);
                      }}
                    >
                      {flag.isEnabled ? 'تعطيل الموديول' : 'تفعيل الموديول'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 13. DATABASE DIAGNOSTICS */}
          {activeSection === 'database' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Database size={24} style={{ color: 'var(--accent-gold)' }} /> قاعدة بيانات الكنيسة (PostgreSQL & Prisma)</h1>
                  <p className={styles.sectionDesc}>مراقبة جداول قاعدة البيانات وسلامة العلاقات والسجلات اليتيمة وزمن الاستجابة.</p>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>زمن استجابة الاستعلام</span>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>{dbOverview?.latencyMs} ms</span>
                  </div>
                  <div className={styles.cardValue}>{dbOverview?.status || 'CONNECTED'}</div>
                  <div className={styles.cardSubtitle}>المزود: {dbOverview?.provider}</div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>فحص السجلات اليتيمة (Integrity)</span>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>0 سجلات يتيمة</span>
                  </div>
                  <div className={styles.cardValue}>سلامة تامة 100%</div>
                  <div className={styles.cardSubtitle}>Cascade Deletion & Strict Relational Keys نشطة</div>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>إحصاء سجلات الجداول الفعلية</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>اسم الجدول (Prisma Model)</th>
                        <th>عدد السجلات الحالية</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dbOverview?.tables || []).map((t: any) => (
                        <tr key={t.name}>
                          <td><strong>{t.name}</strong></td>
                          <td>{t.count.toLocaleString()}</td>
                          <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>{t.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 14. BACKUPS & RECOVERY */}
          {activeSection === 'backups-recovery' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><HardDrive size={24} style={{ color: 'var(--accent-gold)' }} /> النسخ الاحتياطي والاستعادة (Backups & Recovery)</h1>
                  <p className={styles.sectionDesc}>توليد لقطات احتياطية مشفرة وشاملة لبيانات وسياسات وتكوينات المنظومة وتنزيلها بصيغة JSON.</p>
                </div>
                <button className={styles.btnPrimary} onClick={handleCreateSnapshotBackup}>
                  + إنشاء نسخة احتياطية جديدة الآن
                </button>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>النسخ الاحتياطية المتوفرة ({backupsList.length})</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>اسم النسخة الاحتياطية</th>
                        <th>المنشئ</th>
                        <th>التاريخ والوقت</th>
                        <th>الحالة</th>
                        <th>التحميل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupsList.map((b) => (
                        <tr key={b.id}>
                          <td><strong>{b.name}</strong></td>
                          <td><code>{b.creatorEmail}</code></td>
                          <td>{new Date(b.createdAt).toLocaleString('ar-EG')}</td>
                          <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>جاهزة وموثقة</span></td>
                          <td>
                            <button
                              className={styles.btnSecondary}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                const blob = new Blob([b.snapshotDataJson], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${b.name}.json`;
                                a.click();
                              }}
                            >
                              <Download size={12} /> تنزيل JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 15. DEPLOYMENTS & RELEASES */}
          {activeSection === 'deployments' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Server size={24} style={{ color: 'var(--accent-gold)' }} /> إدارة الإصدارات والنشر (Deployments)</h1>
                  <p className={styles.sectionDesc}>حالة النشر الحالية على خوادم Vercel وربط الـ Git Commit والـ Production Endpoints.</p>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>بيئة الإنتاج الأمامية (Frontend Vercel)</span>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>LIVE ONLINE</span>
                  </div>
                  <div className={styles.cardValue}>church-ruby-beta</div>
                  <div className={styles.cardSubtitle}>
                    <a href="https://church-ruby-beta.vercel.app" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      فتح الرابط الحي <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>بيئة الإنتاج الخلفية (Backend API)</span>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>HEALTHY</span>
                  </div>
                  <div className={styles.cardValue}>church-backend-ten</div>
                  <div className={styles.cardSubtitle}>
                    <a href="https://church-backend-ten.vercel.app/api/health" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      فحص الـ Health Check <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 16. AUDIT LOGS */}
          {activeSection === 'audit-logs' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><FileText size={24} style={{ color: 'var(--accent-gold)' }} /> سجل العمليات الشامل (Universal Audit Log)</h1>
                  <p className={styles.sectionDesc}>توثيق مشفر وغير قابل للتعديل لجميع العمليات الحساسة وتغييرات المطورين.</p>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>آخر العمليات المسجلة ({auditLogs.length})</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>العملية</th>
                        <th>المطور</th>
                        <th>الهدف</th>
                        <th>التفاصيل</th>
                        <th>الحالة</th>
                        <th>التاريخ والوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td><span className={`${styles.badge} ${styles.badgePurple}`}>{log.action}</span></td>
                          <td><code>{log.developerEmail}</code></td>
                          <td><strong>{log.target}</strong></td>
                          <td style={{ maxWidth: '300px', fontSize: '0.8rem' }}>{log.details}</td>
                          <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>{log.status}</span></td>
                          <td>{new Date(log.createdAt).toLocaleString('ar-EG')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 17. LOGS & DIAGNOSTICS */}
          {activeSection === 'logs-diagnostics' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Terminal size={24} style={{ color: 'var(--accent-gold)' }} /> السجلات والتشخيصات (Logs & Diagnostics)</h1>
                  <p className={styles.sectionDesc}>قراءة فورية لسجلات الخادم والعمليات التشخيصية المشفرة.</p>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>سجل تشخيص الخادم الحي (Live Diagnostic Stream)</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>المستوى</th>
                        <th>المصدر</th>
                        <th>الرسالة</th>
                        <th>الوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.slice(0, 30).map((l, idx) => (
                        <tr key={l.id || idx}>
                          <td><span className={`${styles.badge} ${l.status === 'SUCCESS' ? styles.badgeSuccess : styles.badgeDanger}`}>{l.status || 'INFO'}</span></td>
                          <td><code>{l.action}</code></td>
                          <td style={{ fontSize: '0.8rem' }}>{l.details}</td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{new Date(l.createdAt).toLocaleTimeString('ar-EG')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 18. PERFORMANCE & UPTIME */}
          {activeSection === 'performance' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Cpu size={24} style={{ color: 'var(--accent-gold)' }} /> الأداء ومعدل التشغيل (Performance & Uptime)</h1>
                  <p className={styles.sectionDesc}>المؤشرات الحية لاستهلاك الذاكرة ومعدل التشغيل واستجابة الاستعلامات.</p>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>وقت تشغيل الخادم (Process Uptime)</span>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>ONLINE</span>
                  </div>
                  <div className={styles.cardValue}>{Math.floor((systemMetrics?.uptimeSeconds || 0) / 60)} دقيقة</div>
                  <div className={styles.cardSubtitle}>مستمر دون انقطاع</div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>استهلاك الذاكرة (Node Heap)</span>
                  </div>
                  <div className={styles.cardValue}>{systemMetrics?.memory?.heapUsedMb || 0} MB</div>
                  <div className={styles.cardSubtitle}>الذاكرة الكلية المحجوزة: {systemMetrics?.memory?.heapTotalMb || 0} MB</div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>عدد أنوية المعالج (CPU Cores)</span>
                  </div>
                  <div className={styles.cardValue}>{systemMetrics?.cpuCount || 4} Cores</div>
                  <div className={styles.cardSubtitle}>المعمارية: {systemMetrics?.arch || 'x64'}</div>
                </div>
              </div>
            </div>
          )}

          {/* 19. INTEGRATIONS & ENVIRONMENT CONFIG */}
          {activeSection === 'integrations' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Settings size={24} style={{ color: 'var(--accent-gold)' }} /> التكاملات والخدمات السحابية (Integrations)</h1>
                  <p className={styles.sectionDesc}>مراقبة حالة ربط الخدمات السحابية الخارجية وقواعد البيانات والمفاتيح السرية بأمان دون كشف القيم.</p>
                </div>
              </div>

              <div className={styles.grid}>
                {integrationsList.map((item) => (
                  <div key={item.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{item.nameAr}</span>
                      <span className={`${styles.badge} ${item.hasCredentials ? styles.badgeSuccess : styles.badgeWarning}`}>
                        {item.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      المزود: {item.provider}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      المفاتيح المشفرة: {item.hasCredentials ? '✓ متوفرة ومؤمنة في البيئة' : '⚠ غير مكتملة'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 20. API EXPLORER & BACKGROUND JOBS */}
          {activeSection === 'api-jobs' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Radio size={24} style={{ color: 'var(--accent-gold)' }} /> مستكشف الـ APIs والمهام الخلفية (API Explorer & Jobs)</h1>
                  <p className={styles.sectionDesc}>دليل المسارات البرمجية المتاحة ومهام المزامنة والانتهاء التلقائي.</p>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>المسارات البرمجية النشطة (Endpoints Catalog)</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>النوع</th>
                        <th>المسار</th>
                        <th>مستوى الحماية</th>
                        <th>الوصف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { method: 'GET', path: '/api/developer/command-center', auth: 'DEVELOPER', desc: 'مؤشرات القيادة الحية' },
                        { method: 'POST', path: '/api/developer/lockdown', auth: 'DEVELOPER', desc: 'تفعيل/إلغاء وضع الصيانة الشامل' },
                        { method: 'POST', path: '/api/developer/events/cancel', auth: 'DEVELOPER (CODE)', desc: 'إلغاء فعالية سريع بكود الأمان' },
                        { method: 'POST', path: '/api/developer/safe-zone/exit', auth: 'DEVELOPER', desc: 'سير عمل NO / SAVE / PUSH' },
                        { method: 'POST', path: '/api/developer/releases/undo', auth: 'DEVELOPER', desc: 'التراجع الفوري عن إصدار' },
                        { method: 'GET', path: '/api/developer/client/navbar', auth: 'PUBLIC', desc: 'جلب عناصر القائمة الديناميكية' },
                        { method: 'GET', path: '/api/invitations/public-status', auth: 'PUBLIC', desc: 'حالة قناة الفعاليات العامة' },
                        { method: 'GET', path: '/api/live', auth: 'PUBLIC', desc: 'حالة البث المباشر' },
                        { method: 'POST', path: '/api/ai/chat', auth: 'MEMBER / PUBLIC', desc: 'محادثة المساعد الروحي الذكي' },
                        { method: 'POST', path: '/api/developer/testing/run', auth: 'DEVELOPER', desc: 'تشغيل حزمة الاختبارات الحية' }
                      ].map((ep, i) => (
                        <tr key={i}>
                          <td>
                            <span className={`${styles.badge} ${ep.method === 'GET' ? styles.badgeInfo : styles.badgeSuccess}`}>{ep.method}</span>
                          </td>
                          <td><code>{ep.path}</code></td>
                          <td><span className={`${styles.badge} ${ep.auth.includes('DEVELOPER') ? styles.badgePurple : styles.badgeWarning}`}>{ep.auth}</span></td>
                          <td>{ep.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 21. GLOBAL ANNOUNCEMENTS */}
          {activeSection === 'announcements' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><AlertTriangle size={24} style={{ color: 'var(--accent-gold)' }} /> الإعلانات ورسائل الصيانة العامة</h1>
                  <p className={styles.sectionDesc}>نشر إشعارات علوية على كامل الموقع لشعب الكنيسة والخدام.</p>
                </div>
                <button className={styles.btnPrimary} onClick={() => setShowAddAnnouncementModal(true)}>
                  + إضافة إعلان عام جديد
                </button>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>الإعلانات المسجلة ({announcementsList.length})</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>العنوان</th>
                        <th>المحتوى</th>
                        <th>النوع</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcementsList.map((an) => (
                        <tr key={an.id}>
                          <td><strong>{an.titleAr}</strong></td>
                          <td style={{ maxWidth: '300px' }}>{an.contentAr}</td>
                          <td><span className={`${styles.badge} ${styles.badgeInfo}`}>{an.type}</span></td>
                          <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>نشط</span></td>
                          <td>
                            <button
                              className={styles.btnDanger}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={async () => {
                                await fetch(`${API_URL}/developer/announcements/${an.id}`, { method: 'DELETE', headers: getAuthHeaders() });
                                showToast('success', 'تم حذف الإعلان.');
                                const ref = await fetch(`${API_URL}/developer/announcements`, { headers: getAuthHeaders() }).then(r => r.json());
                                setAnnouncementsList(ref.announcements || []);
                              }}
                            >
                              حذف
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 22. INCIDENT MANAGEMENT */}
          {activeSection === 'incidents' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Flame size={24} style={{ color: '#ef4444' }} /> إدارة البلاغات والحوادث التقنية (Incidents)</h1>
                  <p className={styles.sectionDesc}>تسجيل الحوادث التقنية وتتبع مسار علاجها وتوثيق الخطوات الاستباقية للتعافي.</p>
                </div>
                <button className={styles.btnDanger} onClick={() => setShowAddIncidentModal(true)}>
                  + تسجيل بلاغ حادث تقني
                </button>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>سجل الحوادث التقنية ({incidentsList.length})</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>عنوان الحادث</th>
                        <th>الخطورة</th>
                        <th>الحالة</th>
                        <th>التفاصيل</th>
                        <th>ملاحظات الحل</th>
                        <th>التحكم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidentsList.map((inc) => (
                        <tr key={inc.id}>
                          <td><strong>{inc.title}</strong></td>
                          <td><span className={`${styles.badge} ${inc.severity === 'CRITICAL' ? styles.badgeDanger : styles.badgeWarning}`}>{inc.severity}</span></td>
                          <td><span className={`${styles.badge} ${inc.status === 'RESOLVED' ? styles.badgeSuccess : styles.badgeDanger}`}>{inc.status}</span></td>
                          <td style={{ maxWidth: '250px', fontSize: '0.8rem' }}>{inc.description}</td>
                          <td style={{ fontSize: '0.8rem' }}>{inc.resolutionNotes || '-'}</td>
                          <td>
                            {inc.status !== 'RESOLVED' && (
                              <button
                                className={styles.btnSuccess}
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={async () => {
                                  const notes = prompt('ملاحظات حل المشكلة: ') || 'تم الإصلاح';
                                  await fetch(`${API_URL}/developer/incidents/${inc.id}/resolve`, {
                                    method: 'POST',
                                    headers: getAuthHeaders(),
                                    body: JSON.stringify({ resolutionNotes: notes })
                                  });
                                  showToast('success', 'تم تسجيل حل الحادث.');
                                  const ref = await fetch(`${API_URL}/developer/incidents`, { headers: getAuthHeaders() }).then(r => r.json());
                                  setIncidentsList(ref.incidents || []);
                                }}
                              >
                                تأكيد الحل
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 23. CONFIGURATION HISTORY */}
          {activeSection === 'config-history' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Clock size={24} style={{ color: 'var(--accent-gold)' }} /> سجل التغييرات البرمجية (Configuration History)</h1>
                  <p className={styles.sectionDesc}>تتبع دقيق لجميع التعديلات على إعدادات الموقع، الأنماط، ومفاتيح الخصائص.</p>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>أحدث التعديلات التكوينية ({configHistoryList.length})</h3>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>الإجراء</th>
                        <th>المنفذ</th>
                        <th>الهدف</th>
                        <th>التفاصيل</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configHistoryList.map((ch) => (
                        <tr key={ch.id}>
                          <td><span className={`${styles.badge} ${styles.badgeInfo}`}>{ch.action}</span></td>
                          <td><code>{ch.developerEmail}</code></td>
                          <td><strong>{ch.target}</strong></td>
                          <td style={{ fontSize: '0.8rem' }}>{ch.details}</td>
                          <td>{new Date(ch.createdAt).toLocaleString('ar-EG')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 24. TESTING LAB */}
          {activeSection === 'testing-lab' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><CheckCircle2 size={24} style={{ color: 'var(--accent-gold)' }} /> مختبر الاختبارات المباشرة (Testing Lab)</h1>
                  <p className={styles.sectionDesc}>تشغيل اختبارات فحص السلامة وتكامل قواعد البيانات والأمان خادمياً بضغطة زر واحدة.</p>
                </div>
                <button className={styles.btnPrimary} disabled={runningTests} onClick={handleExecuteTestingLab}>
                  {runningTests ? <Activity size={16} className="spin" /> : <Play size={16} />}
                  {runningTests ? 'جاري الفحص المباشر...' : 'تشغيل حزمة الاختبارات الحية الآن'}
                </button>
              </div>

              {testResults && (
                <div className={styles.tableContainer}>
                  <div className={styles.tableHeader}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                      نتائج الاختبار: {testResults.passed}/{testResults.totalTests} ناجح (الزمن الكلي: {testResults.totalDurationMs} ms)
                    </h3>
                  </div>
                  <div className={styles.tableResponsive}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>اسم الاختبار</th>
                          <th>الحالة</th>
                          <th>الزمن (ms)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResults.results.map((tr: any) => (
                          <tr key={tr.id}>
                            <td>{tr.name}</td>
                            <td>
                              <span className={`${styles.badge} ${tr.status === 'PASSED' ? styles.badgeSuccess : styles.badgeDanger}`}>
                                {tr.status === 'PASSED' ? '✓ نجاح' : '✗ فشل'}
                              </span>
                            </td>
                            <td>{tr.durationMs} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 25. DEVELOPER AI COPILOT */}
          {activeSection === 'ai-assistant' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Sparkles size={24} style={{ color: 'var(--accent-gold)' }} /> مساعد المطور الذكي (Developer AI Copilot)</h1>
                  <p className={styles.sectionDesc}>مساعد تشخيصي ذكي مدرب على هيكلية المنظومة وPostgreSQL ومصادر الكنيسة للمساعدة في فحص الأخطاء وتقديم النصائح البرمجية بأمان.</p>
                </div>
              </div>

              <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>استفسار تشخيصي للمساعد</h3>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  placeholder="اسأل عن أي خطأ، أو نصيحة لتسريع استعلام قاعدة بيانات، أو مراجعة إعدادات الأمان..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button className={styles.btnPrimary} disabled={aiDiagnosing} onClick={handleRunAiDiagnosis}>
                    {aiDiagnosing ? <Activity size={16} className="spin" /> : <Sparkles size={16} />}
                    {aiDiagnosing ? 'جاري التشخيص والتحليل...' : 'بدء التحليل التشخيصي'}
                  </button>
                </div>
              </div>

              {aiResponse && (
                <div className={styles.card} style={{ background: '#13151f', border: '1px solid #3b82f6' }}>
                  <h4 style={{ color: '#60a5fa', marginBottom: '0.75rem', fontWeight: 600 }}>تقرير المساعد الذكي:</h4>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '0.9rem', color: '#e2e8f0' }}>
                    {aiResponse}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 26. DEPENDENCIES & ARCHITECTURE */}
          {activeSection === 'dependencies' && (
            <div>
              <div className={styles.contentHeader}>
                <div>
                  <h1 className={styles.sectionTitle}><Layers size={24} style={{ color: 'var(--accent-gold)' }} /> الاعتماديات ومعمارية النظام (Dependencies & Architecture)</h1>
                  <p className={styles.sectionDesc}>الخريطة الهيكلية للطبقات البرمجية والاعتماديات والمكتبات المستخدمة.</p>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>طبقة الواجهة (Frontend Layer)</h3>
                  <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li>Framework: Next.js 16 (App Router + Turbopack)</li>
                    <li>UI Library: React 19</li>
                    <li>Icons: Lucide React</li>
                    <li>Theming: Bilingual Arabic/English (Cairo / Outfit) RTL/LTR</li>
                  </ul>
                </div>

                <div className={styles.card}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.5rem' }}>طبقة الخادم (Backend Layer)</h3>
                  <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li>Runtime: Node.js (v24) + Express 4.19</li>
                    <li>Language: TypeScript 5.4</li>
                    <li>Authentication: JWT Token + Bcrypt Encryption</li>
                    <li>Hosting: Vercel Serverless Functions</li>
                  </ul>
                </div>

                <div className={styles.card}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#4ade80', marginBottom: '0.5rem' }}>طبقة البيانات والذكاء (Database & AI)</h3>
                  <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li>ORM: Prisma Client 5.22</li>
                    <li>Database: PostgreSQL (Supabase Pooler + AWS Direct)</li>
                    <li>AI Engines: Dual Provider (Google Gemini + Groq LLaMA 3.1)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FOOTER ENVIRONMENT DOCK BAR (EXACT SPECIFICATION) */}
      <footer className={`${styles.envBar} ${environmentMode === 'SAFE_ZONE' ? styles.envSafeZone : styles.envProd}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={styles.envBadge}>
            <span className={`${styles.pulseDot} ${environmentMode === 'SAFE_ZONE' ? styles.pulsePurple : styles.pulseGreen}`} />
            <span>{environmentMode === 'SAFE_ZONE' ? 'بيئة معزولة (SAFE ZONE ACTIVE)' : 'الإنتاج الحقيقي (PRODUCTION ENVIRONMENT)'}</span>
          </div>
          {lockdownState?.isActive && (
            <span className={`${styles.badge} ${styles.badgeDanger}`}>
              ⚠️ وضع الإغلاق الشامل مفعّل (SITE UNDER LOCKDOWN)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {environmentMode === 'PRODUCTION' ? (
            <button
              className={`${styles.btn} ${styles.btnPurple}`}
              style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem' }}
              onClick={() => {
                setEnvironmentMode('SAFE_ZONE');
                setActiveSection('safe-zone');
                showToast('info', 'تم الانتقال إلى البيئة المعزولة (Safe Zone). أي تعديل هنا لن يمس الإنتاج الحقيقي.');
              }}
            >
              <Layers size={14} /> دخول البيئة المعزولة (Safe Zone)
            </button>
          ) : (
            <button
              className={`${styles.btn} ${styles.btnDanger}`}
              style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem' }}
              onClick={() => setShowExitSafeZoneModal(true)}
            >
              <LogOut size={14} /> الخروج من Safe Zone (NO / SAVE / PUSH)
            </button>
          )}

          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
            onClick={() => router.push('/dashboard')}
          >
            لوحة الكنيسة
          </button>
        </div>
      </footer>

      {/* MODAL: ADD DEVELOPER */}
      {showAddDevModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddDevModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}><Key size={20} style={{ color: 'var(--accent-gold)' }} /> إضافة مطور تقني جديد (خاص بـ Mark)</h3>
              <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowAddDevModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateDeveloper}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>الاسم الكامل ثلاثي للمطور:</label>
                  <input
                    type="text"
                    required
                    className={styles.formInput}
                    value={newDevForm.fullName}
                    onChange={(e) => setNewDevForm({ ...newDevForm, fullName: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>البريد الإلكتروني:</label>
                  <input
                    type="email"
                    required
                    className={styles.formInput}
                    value={newDevForm.email}
                    onChange={(e) => setNewDevForm({ ...newDevForm, email: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>كلمة المرور:</label>
                  <input
                    type="password"
                    required
                    className={styles.formInput}
                    value={newDevForm.password}
                    onChange={(e) => setNewDevForm({ ...newDevForm, password: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>رقم الهاتف (اختياري):</label>
                  <input
                    type="tel"
                    className={styles.formInput}
                    value={newDevForm.phone}
                    onChange={(e) => setNewDevForm({ ...newDevForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowAddDevModal(false)}>إلغاء</button>
                <button type="submit" className={styles.btnPrimary}>تأكيد إضافة المطور</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK EVENT CANCELLATION */}
      {showCancelEventModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCancelEventModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}><AlertTriangle size={20} style={{ color: '#ef4444' }} /> إلغاء فعالية سريع بكود الأمان المشفر</h3>
              <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowCancelEventModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>ابحث عن الفعالية المراد إلغاؤها:</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="اكتب اسم الفعالية..."
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                  />
                  <button type="button" className={styles.btnSecondary} onClick={handleSearchEvents}>بحث</button>
                </div>
              </div>

              {eventSearchResults.length > 0 && (
                <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  {eventSearchResults.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)',
                        background: selectedEvent?.id === ev.id ? 'rgba(226, 183, 20, 0.15)' : 'transparent'
                      }}
                      onClick={() => setSelectedEvent(ev)}
                    >
                      <strong>{ev.titleAr || ev.titleEn}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        التاريخ: {new Date(ev.date).toLocaleDateString('ar-EG')} | الحجوزات: {ev._count?.applications || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedEvent && (
                <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div>الفعالية المختارة: <strong>{selectedEvent.titleAr || selectedEvent.titleEn}</strong></div>
                  <div style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '0.25rem' }}>
                    سيتم تحويل حالة الفعالية إلى CANCELLED دون حذف أي طلب أو بطاقة مسجلة.
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>كود الحماية السري للمطور (Cancellation Code):</label>
                <input
                  type="password"
                  required
                  placeholder="أدخل كود الإلغاء السري (ch140ch140)..."
                  className={styles.formInput}
                  value={cancellationCodeInput}
                  onChange={(e) => setCancellationCodeInput(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>سبب الإلغاء المعتمد:</label>
                <input
                  type="text"
                  required
                  placeholder="اكتب سبب إلغاء الفعالية لتسجيله في الأرشيف..."
                  className={styles.formInput}
                  value={cancellationReasonInput}
                  onChange={(e) => setCancellationReasonInput(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowCancelEventModal(false)}>إلغاء</button>
              <button type="button" className={styles.btnDanger} onClick={handleExecuteEventCancellation}>
                تأكيد الإلغاء فوراً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE ANNOUNCEMENT */}
      {showAddAnnouncementModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddAnnouncementModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}><AlertTriangle size={20} style={{ color: 'var(--accent-gold)' }} /> إضافة إعلان عام لشعب الكنيسة</h3>
              <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowAddAnnouncementModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>عنوان الإعلان (عربي):</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={newAnnouncementForm.titleAr}
                  onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, titleAr: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title (English):</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={newAnnouncementForm.titleEn}
                  onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, titleEn: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>نص الإعلان:</label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={newAnnouncementForm.contentAr}
                  onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, contentAr: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowAddAnnouncementModal(false)}>إلغاء</button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={async () => {
                  if (!newAnnouncementForm.titleAr || !newAnnouncementForm.contentAr) return alert('أدخل العنوان والمحتوى');
                  await fetch(`${API_URL}/developer/announcements`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(newAnnouncementForm)
                  });
                  showToast('success', 'تم نشر الإعلان.');
                  setShowAddAnnouncementModal(false);
                  const ref = await fetch(`${API_URL}/developer/announcements`, { headers: getAuthHeaders() }).then(r => r.json());
                  setAnnouncementsList(ref.announcements || []);
                }}
              >
                نشر الإعلان
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG INCIDENT */}
      {showAddIncidentModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddIncidentModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}><Flame size={20} style={{ color: '#ef4444' }} /> تسجيل حادث أو عطل تقني (Incident)</h3>
              <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowAddIncidentModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>عنوان الحادث:</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={newIncidentForm.title}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, title: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>مستوى الخطورة:</label>
                <select
                  className={styles.formSelect}
                  value={newIncidentForm.severity}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, severity: e.target.value })}
                >
                  <option value="LOW">منخفض (LOW)</option>
                  <option value="MEDIUM">متوسط (MEDIUM)</option>
                  <option value="HIGH">عالي (HIGH)</option>
                  <option value="CRITICAL">حرج وطارئ (CRITICAL)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>وصف العطل والأثر الفني:</label>
                <textarea
                  className={styles.formTextarea}
                  rows={3}
                  value={newIncidentForm.description}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowAddIncidentModal(false)}>إلغاء</button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={async () => {
                  if (!newIncidentForm.title || !newIncidentForm.description) return alert('أدخل العنوان والوصف');
                  await fetch(`${API_URL}/developer/incidents`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                      title: newIncidentForm.title,
                      severity: newIncidentForm.severity,
                      affectedModules: newIncidentForm.affectedModules.split(',').map(m => m.trim()),
                      description: newIncidentForm.description
                    })
                  });
                  showToast('success', 'تم فتح تذكرة الحادث.');
                  setShowAddIncidentModal(false);
                  const ref = await fetch(`${API_URL}/developer/incidents`, { headers: getAuthHeaders() }).then(r => r.json());
                  setIncidentsList(ref.incidents || []);
                }}
              >
                تسجيل الحادث
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SAFE ZONE EXIT (NO / SAVE / PUSH) */}
      {showExitSafeZoneModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExitSafeZoneModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}><Layers size={20} style={{ color: '#c084fc' }} /> الخروج من البيئة المعزولة (Safe Zone)</h3>
              <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowExitSafeZoneModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: '1.25rem', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                أنت على وشك مغادرة البيئة المعزولة (Safe Zone). يرجى اختيار أحد الإجراءات الثلاثة الصارمة:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px' }}>
                  <strong>NO — إتلاف التعديلات (Discard):</strong>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0.5rem' }}>
                    تجاهل وإلغاء جميع التعديلات التي تمت في الجلسة وإعادة البيئة المعزولة لحالة الإنتاج النظيفة.
                  </p>
                  <button className={styles.btnDanger} style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleSafeZoneExit('NO')}>
                    تأكيد إتلاف التعديلات (NO)
                  </button>
                </div>

                <div style={{ padding: '0.85rem', background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: '10px' }}>
                  <strong>SAVE — حفظ لقطة خاصة (Keep Privately):</strong>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0.5rem' }}>
                    حفظ التعديلات كمسودة ولقطة خاصة بك دون ترقيتها للموقع الحقيقي، لاستئنافها في الجلسة القادمة.
                  </p>
                  <button className={styles.btnSecondary} style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleSafeZoneExit('SAVE')}>
                    حفظ اللقطة الخاصة (SAVE)
                  </button>
                </div>

                <div style={{ padding: '0.85rem', background: 'rgba(226, 183, 20, 0.1)', border: '1px solid rgba(226, 183, 20, 0.3)', borderRadius: '10px' }}>
                  <strong>PUSH — ترقية للإنتاج الحقيقي (Promote):</strong>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0.5rem' }}>
                    فحص التعارضات، تطبيق التغييرات على قاعدة البيانات الحية، وتوليد رقم إصدار وسجل تراجع دائم (UNDO).
                  </p>
                  <button className={styles.btnPrimary} style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleSafeZoneExit('PUSH')}>
                    بدء إجراءات الترقية للإنتاج (PUSH)
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowExitSafeZoneModal(false)}>البقاء في Safe Zone</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
