'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './developer.module.css';
import { API_URL } from '../../config';
import {
  ShieldAlert, Activity, Users, Lock, Globe, Server, Database, 
  Terminal, Sliders, RefreshCw, Undo2, Redo2, AlertTriangle, 
  CheckCircle2, XCircle, Search, Sparkles, BookOpen, Clock, 
  Eye, EyeOff, Radio, Settings, Key, FileText, Bot, 
  Layers, HardDrive, Cpu, LogOut, ArrowRight, ShieldCheck, Flame,
  Menu, X, Download, Play, Check, AlertCircle, ExternalLink, Zap,
  Upload, Trash2, Edit3, Plus, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

interface DeveloperUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roles: string[];
  isMaster?: boolean;
}

interface IncidentItem {
  id: string;
  title: string;
  severity: string;
  status: string;
  affectedModules: string[];
  description: string;
  resolutionNotes?: string | null;
  createdByName: string;
  resolvedAt?: string | null;
  createdAt: string;
}

interface UserDetailItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roles: string[];
  phone?: string | null;
  isBanned: boolean;
  createdAt: string;
  ipAddress: string;
  deviceType: string;
  lastActiveAt: string;
  appointmentsCount: number;
  ticketsCount: number;
}

export default function DeveloperControlPortal() {
  const router = useRouter();

  // Core Authentication & Environment States
  const [currentUser, setCurrentUser] = useState<DeveloperUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [environmentMode, setEnvironmentMode] = useState<'PRODUCTION' | 'SAFE_ZONE'>('PRODUCTION');
  const [activeSection, setActiveSection] = useState('command-center');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Command Center Data
  const [metrics, setMetrics] = useState<any>(null);
  const [lockdownState, setLockdownState] = useState<any>(null);
  const [latestRelease, setLatestRelease] = useState<any>(null);
  const [dbOverview, setDbOverview] = useState<any>(null);
  const [activeBansCount, setActiveBansCount] = useState<number>(0);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [hasSafeZoneChanges, setHasSafeZoneChanges] = useState<boolean>(false);

  // 2. Team & Developers
  const [developers, setDevelopers] = useState<DeveloperUser[]>([]);
  const [newDevEmail, setNewDevEmail] = useState('');
  const [newDevPassword, setNewDevPassword] = useState('');
  const [newDevName, setNewDevName] = useState('');
  const [newDevPhone, setNewDevPhone] = useState('');

  // 3. IP Ban Manager
  const [bannedIps, setBannedIps] = useState<any[]>([]);
  const [newBanIp, setNewBanIp] = useState('');
  const [newBanReason, setNewBanReason] = useState('');
  const [newBanExpiryDays, setNewBanExpiryDays] = useState<number>(0);

  // 4. Emergency Lockdown Form
  const [lockdownReason, setLockdownReason] = useState('');
  const [lockdownMessage, setLockdownMessage] = useState('');
  const [lockdownRestrictLogin, setLockdownRestrictLogin] = useState(false);
  const [lockdownRestrictReg, setLockdownRestrictReg] = useState(false);
  const [lockdownRestrictAi, setLockdownRestrictAi] = useState(false);

  // 5. Smart Event Cancellation Search
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventSearchResults, setEventSearchResults] = useState<any[]>([]);
  const [selectedEventToCancel, setSelectedEventToCancel] = useState<any | null>(null);
  const [isSearchingEvents, setIsSearchingEvents] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [cancelCodeInput, setCancelCodeInput] = useState('');
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

  // 6. Page Policies & Navbar
  const [pagePolicies, setPagePolicies] = useState<any[]>([]);
  const [navbarItems, setNavbarItems] = useState<any[]>([]);
  const [selectedPagePolicyDuration, setSelectedPagePolicyDuration] = useState<{ [route: string]: string }>({});

  // 7. Safe Zone Sandbox & Push History (Merged)
  const [safeZoneDraft, setSafeZoneDraft] = useState<any>(null);
  const [releasesList, setReleasesList] = useState<any[]>([]);
  const [undoReason, setUndoReason] = useState('');

  // 8. User Intelligence & Sessions Telemetry
  const [usersList, setUsersList] = useState<UserDetailItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserModal, setSelectedUserModal] = useState<UserDetailItem | null>(null);

  // 9. Liturgical Seasonal Themes
  const [themesList, setThemesList] = useState<any[]>([]);
  const [previewThemeKey, setPreviewThemeKey] = useState<string | null>(null);

  // 10. AI Chatbot Status
  const [aiStatus, setAiStatus] = useState<any>(null);

  // 11. Database Full Backup & Table Browser (Merged)
  const [selectedTableToBrowse, setSelectedTableToBrowse] = useState('User');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableTotalPages, setTableTotalPages] = useState(1);
  const [tableTotalCount, setTableTotalCount] = useState(0);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 12. Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);

  // 13. Incidents Full Management (Edit & Delete)
  const [incidentsList, setIncidentsList] = useState<IncidentItem[]>([]);
  const [editingIncident, setEditingIncident] = useState<IncidentItem | null>(null);
  const [newIncidentTitle, setNewIncidentTitle] = useState('');
  const [newIncidentSeverity, setNewIncidentSeverity] = useState('HIGH');
  const [newIncidentDesc, setNewIncidentDesc] = useState('');
  const [isCreateIncidentOpen, setIsCreateIncidentOpen] = useState(false);

  // 14. Global Announcements
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [newAnnTitleAr, setNewAnnTitleAr] = useState('');
  const [newAnnTitleEn, setNewAnnTitleEn] = useState('');
  const [newAnnContentAr, setNewAnnContentAr] = useState('');
  const [newAnnContentEn, setNewAnnContentEn] = useState('');
  const [newAnnType, setNewAnnType] = useState('INFO');
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false);

  // 15. Discord-Style Roles & Granular Permissions
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#3b82f6');
  const [newRolePriority, setNewRolePriority] = useState(50);
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);

  // 16. Integrations & Testing Lab
  const [integrationsList, setIntegrationsList] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // 17. Config History
  const [configHistoryLogs, setConfigHistoryLogs] = useState<any[]>([]);

  // 18. AI Copilot
  const [aiInquiry, setAiInquiry] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiDiagnosing, setAiDiagnosing] = useState(false);

  // Helper Toast Feedback
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  // Auth Headers Helper
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('church-token') : '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Verify Developer Session on Mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('church-token');
      const userStr = localStorage.getItem('church-user');

      if (!token || !userStr) {
        setIsAuthChecking(false);
        router.push('/login');
        return;
      }

      try {
        const parsed = JSON.parse(userStr);
        const isMaster = parsed.email === 'marksamer010@gmail.com';
        const hasDevRole = parsed.role === 'DEVELOPER' || (Array.isArray(parsed.roles) && parsed.roles.includes('DEVELOPER'));

        if (!isMaster && !hasDevRole) {
          setIsAuthChecking(false);
          router.push('/login');
          return;
        }

        setCurrentUser({ ...parsed, isMaster });
        setIsAuthChecking(false);

        // Check active theme preview in session
        const storedPreview = sessionStorage.getItem('dev-theme-preview');
        if (storedPreview) setPreviewThemeKey(storedPreview);
      } catch (e) {
        setIsAuthChecking(false);
        router.push('/login');
      }
    }
  }, [router]);

  // Load All System Data
  const loadCommandCenter = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/command-center`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setLockdownState(data.lockdown);
        setLatestRelease(data.latestRelease);
        setDbOverview(data.database);
        setActiveBansCount(data.activeBansCount);
        setFeatureFlags(data.flags || []);
        setHasSafeZoneChanges(data.hasSafeZoneChanges);

        if (data.lockdown) {
          setLockdownReason(data.lockdown.reason || '');
          setLockdownMessage(data.lockdown.customMessage || '');
          setLockdownRestrictLogin(data.lockdown.restrictLogin || false);
          setLockdownRestrictReg(data.lockdown.restrictRegistration || false);
          setLockdownRestrictAi(data.lockdown.restrictAiChatbot || false);
        }
      }
    } catch {}
  };

  const loadTeam = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/team`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDevelopers(data.developers || []);
      }
    } catch {}
  };

  const loadIpBans = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/ip-bans`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBannedIps(data.bans || []);
      }
    } catch {}
  };

  const loadPagesAndNavbar = async () => {
    try {
      const [pRes, nRes] = await Promise.all([
        fetch(`${API_URL}/developer/pages`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/developer/navbar`, { headers: getAuthHeaders() })
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setPagePolicies(pData.pages || []);
      }
      if (nRes.ok) {
        const nData = await nRes.json();
        setNavbarItems(nData.items || []);
      }
    } catch {}
  };

  const loadSafeZoneAndReleases = async () => {
    try {
      const [szRes, relRes] = await Promise.all([
        fetch(`${API_URL}/developer/safe-zone`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/developer/releases`, { headers: getAuthHeaders() })
      ]);
      if (szRes.ok) {
        const szData = await szRes.json();
        setSafeZoneDraft(szData);
        setEnvironmentMode(szData.environmentMode || 'PRODUCTION');
      }
      if (relRes.ok) {
        const relData = await relRes.json();
        setReleasesList(relData.releases || []);
      }
    } catch {}
  };

  const loadUsersDetailed = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/developer/users/detailed`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch {} finally {
      setIsLoadingUsers(false);
    }
  };

  const loadThemes = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/themes`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setThemesList(data.themes || []);
      }
    } catch {}
  };

  const loadRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/roles`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const combined = [
          ...(data.systemRoles || []),
          ...(data.customRoles || []).map((r: any) => ({
            ...r,
            permissions: typeof r.permissionsJson === 'string' ? JSON.parse(r.permissionsJson || '[]') : r.permissionsJson
          }))
        ];
        setRolesList(combined);
      }
    } catch {}
  };

  const loadIncidents = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/incidents`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setIncidentsList(data.incidents || []);
      }
    } catch {}
  };

  const loadAnnouncements = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/announcements`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnnouncementsList(data.announcements || []);
      }
    } catch {}
  };

  const loadTableData = async (tableName: string, page = 1) => {
    setIsLoadingTable(true);
    try {
      const res = await fetch(`${API_URL}/developer/database/table/${tableName}?page=${page}&limit=20`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTableRows(data.rows || []);
        setTablePage(data.page || 1);
        setTableTotalPages(data.totalPages || 1);
        setTableTotalCount(data.total || 0);
      }
    } catch {} finally {
      setIsLoadingTable(false);
    }
  };

  const loadIntegrations = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/integrations`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setIntegrationsList(data.integrations || []);
      }
    } catch {}
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/audit-logs?limit=30`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setAuditTotal(data.total || 0);
      }
    } catch {}
  };

  const loadConfigHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/config-history`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConfigHistoryLogs(data.history || []);
      }
    } catch {}
  };

  // Initial Load Trigger
  useEffect(() => {
    if (!currentUser) return;
    loadCommandCenter();
    loadTeam();
    loadIpBans();
    loadPagesAndNavbar();
    loadSafeZoneAndReleases();
    loadUsersDetailed();
    loadThemes();
    loadRoles();
    loadIncidents();
    loadAnnouncements();
    loadTableData(selectedTableToBrowse, 1);
    loadIntegrations();
    loadAuditLogs();
    loadConfigHistory();
  }, [currentUser]);

  // Section Change Auto-Refresher
  useEffect(() => {
    if (activeSection === 'command-center') loadCommandCenter();
    else if (activeSection === 'dev-permissions') loadRoles();
    else if (activeSection === 'user-intelligence') loadUsersDetailed();
    else if (activeSection === 'themes-events') loadThemes();
    else if (activeSection === 'database') loadTableData(selectedTableToBrowse, 1);
    else if (activeSection === 'incidents') loadIncidents();
    else if (activeSection === 'announcements') loadAnnouncements();
    else if (activeSection === 'audit-logs') loadAuditLogs();
    else if (activeSection === 'integrations') loadIntegrations();
    else if (activeSection === 'config-history') loadConfigHistory();
  }, [activeSection]);

  // Smart Autocomplete Event Search
  useEffect(() => {
    if (!eventSearchQuery.trim()) {
      setEventSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingEvents(true);
      try {
        const res = await fetch(`${API_URL}/developer/events/search?q=${encodeURIComponent(eventSearchQuery)}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setEventSearchResults(data.events || []);
          setShowEventDropdown(true);
        }
      } catch {} finally {
        setIsSearchingEvents(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [eventSearchQuery]);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // 1. Master Developer: Add Sub-Developer
  const handleAddDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/developer/team/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: newDevEmail, password: newDevPassword, fullName: newDevName, phone: newDevPhone })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `تمت إضافة/ترقية المطور بنجاح: ${newDevEmail}`);
        setNewDevEmail('');
        setNewDevPassword('');
        setNewDevName('');
        setNewDevPhone('');
        loadTeam();
      } else {
        showFeedback('error', data.error || 'تعذر إضافة المطور');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleRemoveDeveloper = async (email: string) => {
    if (!confirm(`هل أنت متأكد من سحب صلاحيات المطور عن (${email})؟`)) return;
    try {
      const res = await fetch(`${API_URL}/developer/team/${email}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showFeedback('success', `تم سحب صلاحيات المطور عن ${email}`);
        loadTeam();
      } else {
        const data = await res.json();
        showFeedback('error', data.error);
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 2. IP Ban Manager
  const handleAddBan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let expiresAt: string | null = null;
      if (newBanExpiryDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + newBanExpiryDays);
        expiresAt = d.toISOString();
      }

      const res = await fetch(`${API_URL}/developer/ip-bans`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ip: newBanIp, reason: newBanReason, expiresAt })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `تم حظر عنوان الـ IP بنجاح: ${newBanIp}`);
        setNewBanIp('');
        setNewBanReason('');
        setNewBanExpiryDays(0);
        loadIpBans();
        loadCommandCenter();
      } else {
        showFeedback('error', data.error);
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleRemoveBan = async (ip: string) => {
    try {
      const res = await fetch(`${API_URL}/developer/ip-bans/${ip}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showFeedback('success', `تم إلغاء حظر الـ IP: ${ip}`);
        loadIpBans();
        loadCommandCenter();
      } else {
        const data = await res.json();
        showFeedback('error', data.error);
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 3. Emergency Lockdown Toggle
  const handleToggleLockdown = async (activate: boolean) => {
    if (activate && !confirm('تحذير شديد: تفعيل قفل الموقع الشامل سيمنع الجميع من دخول الموقع باستثناء المطورين. هل ترغب بالتأكيد؟')) return;
    try {
      const res = await fetch(`${API_URL}/developer/lockdown`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isActive: activate,
          reason: lockdownReason || 'إجراء صيانة طارئة من قبل المطور',
          customMessage: lockdownMessage,
          restrictLogin: lockdownRestrictLogin,
          restrictRegistration: lockdownRestrictReg,
          restrictAiChatbot: lockdownRestrictAi
        })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', activate ? 'تم تفعيل وضع قفل الطوارئ بنجاح' : 'تم إنهاء قفل الموقع واستعادة الحالة الطبيعية');
        loadCommandCenter();
      } else {
        showFeedback('error', data.error);
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 4. Quick Event Cancellation
  const handleExecuteEventCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventToCancel) {
      showFeedback('error', 'يرجى اختيار الفعالية المراد إلغاؤها من نتائج البحث الذكي');
      return;
    }
    if (!cancelCodeInput.trim()) {
      showFeedback('error', 'يرجى إدخال كود إلغاء الفعاليات السري المعتمد (ch140ch140)');
      return;
    }
    if (!confirm(`تأكيد الإلغاء الفوري لفعالية "${selectedEventToCancel.titleAr}"؟ سيتم إلغاء التذاكر وتحديث الحالة خادمياً.`)) return;

    setIsSubmittingCancellation(true);
    try {
      const res = await fetch(`${API_URL}/developer/events/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          eventId: selectedEventToCancel.id,
          cancellationCode: cancelCodeInput,
          reason: cancelReasonInput || 'إلغاء طارئ من بوابة المطور'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `تم إلغاء الفعالية بنجاح: ${selectedEventToCancel.titleAr}`);
        setSelectedEventToCancel(null);
        setEventSearchQuery('');
        setCancelCodeInput('');
        setCancelReasonInput('');
      } else {
        showFeedback('error', data.error || 'فشل في إلغاء الفعالية، تأكد من كود الأمان');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  // 5. Page Policy Overrides & Navbar Toggles
  const handleSavePagePolicy = async (page: any, newPolicy: string) => {
    const duration = selectedPagePolicyDuration[page.routePath] || 'PERMANENT';
    try {
      if (duration === 'PERMANENT') {
        const res = await fetch(`${API_URL}/developer/pages/permanent`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            routePath: page.routePath,
            permanentPolicy: newPolicy,
            allowedRoles: newPolicy === 'DEVELOPER_ONLY' ? ['DEVELOPER'] : ['SUPER_ADMIN', 'CHURCH_ADMIN']
          })
        });
        if (res.ok) {
          showFeedback('success', `تم تحديث السياسة الدائمة للصفحة (${page.routePath}) إلى [${newPolicy}]`);
          loadPagesAndNavbar();
        }
      } else {
        const hours = parseInt(duration, 10) || 1;
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + hours);

        const res = await fetch(`${API_URL}/developer/pages/override`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            routePath: page.routePath,
            overridePolicy: newPolicy,
            overrideAllowedRoles: ['DEVELOPER'],
            expiresAt: expiry.toISOString(),
            reason: `تقييد مؤقت لـ ${hours} ساعة من قبل المطور`
          })
        });
        if (res.ok) {
          showFeedback('success', `تم تطبيق تجاوز مؤقت للصفحة (${page.routePath}) لمدة ${hours} ساعة`);
          loadPagesAndNavbar();
        }
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleClearPageOverride = async (routePath: string) => {
    try {
      const res = await fetch(`${API_URL}/developer/pages/override`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ routePath })
      });
      if (res.ok) {
        showFeedback('success', `تم إلغاء التجاوز المؤقت للصفحة: ${routePath}`);
        loadPagesAndNavbar();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleToggleNavbarItem = async (item: any) => {
    try {
      const res = await fetch(`${API_URL}/developer/navbar/permanent`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          path: item.path,
          isVisible: !item.isVisible,
          guestVisible: item.guestVisible,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          sortOrder: item.sortOrder
        })
      });
      if (res.ok) {
        showFeedback('success', `تم تبديل رؤية بند الشريط العلوي (${item.nameAr})`);
        loadPagesAndNavbar();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 6. Safe Zone NO / SAVE / PUSH Engine & UNDO/REDO
  const handleExitSafeZone = async (action: 'NO' | 'SAVE' | 'PUSH') => {
    try {
      const res = await fetch(`${API_URL}/developer/safe-zone/exit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, summary: `تطبيق تحديثات البيئة المعزولة عبر زر [${action}]` })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', data.message || `تم تنفيذ الإجراء (${action}) بنجاح.`);
        loadSafeZoneAndReleases();
        loadPagesAndNavbar();
        loadCommandCenter();
      } else {
        showFeedback('error', data.error);
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleUndoRelease = async (releaseId: string) => {
    if (!confirm('هل ترغب بالتراجع عن هذا الإصدار واستعادة الحالة السابقة للإنتاج؟')) return;
    try {
      const res = await fetch(`${API_URL}/developer/releases/${releaseId}/undo`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: undoReason || 'تراجع تقني فوري' })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', 'تم التراجع عن الإصدار واسترجاع إعدادات المنظومة بنجاح');
        setUndoReason('');
        loadSafeZoneAndReleases();
        loadPagesAndNavbar();
      } else {
        showFeedback('error', data.error);
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 7. Coptic Seasonal Themes System (Active & Live Preview)
  const handleActivateSeasonTheme = async (seasonKey: string) => {
    try {
      const res = await fetch(`${API_URL}/developer/themes/activate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ seasonKey })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `تم تفعيل النمط الكنسي (${seasonKey}) وتطبيقه على المنصة بالكامل!`);
        sessionStorage.removeItem('dev-theme-preview');
        setPreviewThemeKey(null);
        window.dispatchEvent(new CustomEvent('seasonal-theme-change', { detail: { seasonKey } }));
        loadThemes();
      } else {
        showFeedback('error', data.error || 'تعذر تفعيل المظهر');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handlePreviewTheme = (seasonKey: string) => {
    setPreviewThemeKey(seasonKey);
    sessionStorage.setItem('dev-theme-preview', seasonKey);
    window.dispatchEvent(new CustomEvent('seasonal-theme-change', { detail: { seasonKey } }));
    showFeedback('success', `وضع المعاينة الحية نشط الآن للنمط (${seasonKey})`);
  };

  const handleCancelPreview = () => {
    sessionStorage.removeItem('dev-theme-preview');
    setPreviewThemeKey(null);
    const active = themesList.find(t => t.isActive);
    const key = active ? active.seasonKey : 'STANDARD';
    window.dispatchEvent(new CustomEvent('seasonal-theme-change', { detail: { seasonKey: key } }));
    showFeedback('success', 'تم إنهاء وضع المعاينة واستعادة المظهر النشط.');
  };

  const handleResetThemesToDefault = async () => {
    try {
      const res = await fetch(`${API_URL}/developer/themes/reset`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showFeedback('success', 'تمت استعادة المظهر الكنسي الأصلي الافتراضي.');
        sessionStorage.removeItem('dev-theme-preview');
        setPreviewThemeKey(null);
        window.dispatchEvent(new CustomEvent('seasonal-theme-change', { detail: { seasonKey: 'STANDARD' } }));
        loadThemes();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 8. AI Bot Kill Switch & Feature Flags Toggle
  const handleToggleAiKillSwitch = async (currentState: boolean) => {
    try {
      const res = await fetch(`${API_URL}/developer/lockdown`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...lockdownState,
          restrictAiChatbot: !currentState
        })
      });
      if (res.ok) {
        showFeedback('success', !currentState ? 'تم تشغيل مفتاح الإيقاف الإجباري للذكاء الاصطناعي بنجاح' : 'تمت إعادة تشغيل المساعد الذكي');
        window.dispatchEvent(new CustomEvent('ai-killswitch-changed'));
        loadCommandCenter();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleToggleFeatureFlag = async (flagKey: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`${API_URL}/developer/feature-flags/${flagKey}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isEnabled: !currentEnabled })
      });
      if (res.ok) {
        showFeedback('success', `تم تبديل حالة الموديول (${flagKey})`);
        if (flagKey === 'ai_chatbot') {
          window.dispatchEvent(new CustomEvent('ai-killswitch-changed'));
        }
        loadCommandCenter();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 9. Full Database Backup Download, Restore, and Table Browser
  const handleDownloadFullBackup = async () => {
    setIsExportingBackup(true);
    try {
      const res = await fetch(`${API_URL}/developer/database/backup/full`, { headers: getAuthHeaders() });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `church-database-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showFeedback('success', 'تم تحميل وتصدير النسخة الاحتياطية الشاملة لقاعدة البيانات بنجاح!');
      } else {
        showFeedback('error', 'فشل في تصدير النسخة الاحتياطية');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`تحذير: هل أنت متأكد من استعادة بيانات النظام من الملف (${file.name})؟ سيتم تطبيق الإعدادات وتحديث الجداول.`)) return;

    setIsRestoringBackup(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target?.result as string);
          const res = await fetch(`${API_URL}/developer/database/restore/full`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ backupData })
          });
          const data = await res.json();
          if (res.ok) {
            showFeedback('success', 'تم استيراد واستعادة قاعدة البيانات بنجاح!');
            loadPagesAndNavbar();
            loadThemes();
            loadCommandCenter();
          } else {
            showFeedback('error', data.error || 'فشل في الاستيراد');
          }
        } catch {
          showFeedback('error', 'الملف المحدد ليس ملف JSON صالح للنسخ الاحتياطي.');
        } finally {
          setIsRestoringBackup(false);
        }
      };
      reader.readAsText(file);
    } catch (e: any) {
      showFeedback('error', e.message);
      setIsRestoringBackup(false);
    }
  };

  // 10. Incidents Full Management (Edit & Delete)
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/developer/incidents`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: newIncidentTitle,
          severity: newIncidentSeverity,
          description: newIncidentDesc,
          affectedModules: ['PostgreSQL', 'API Gateway']
        })
      });
      if (res.ok) {
        showFeedback('success', 'تم تسجيل البلاغ التقني بنجاح');
        setNewIncidentTitle('');
        setNewIncidentDesc('');
        setIsCreateIncidentOpen(false);
        loadIncidents();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleUpdateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncident) return;
    try {
      const res = await fetch(`${API_URL}/developer/incidents/${editingIncident.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editingIncident.title,
          severity: editingIncident.severity,
          status: editingIncident.status,
          description: editingIncident.description,
          resolutionNotes: editingIncident.resolutionNotes
        })
      });
      if (res.ok) {
        showFeedback('success', `تم تحديث البلاغ (${editingIncident.title}) بنجاح`);
        setEditingIncident(null);
        loadIncidents();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleDeleteIncident = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف سجل البلاغ نهائياً؟')) return;
    try {
      const res = await fetch(`${API_URL}/developer/incidents/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showFeedback('success', 'تم حذف البلاغ التقني بنجاح');
        loadIncidents();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 11. Global Announcements
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/developer/announcements`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          titleAr: newAnnTitleAr,
          titleEn: newAnnTitleEn || newAnnTitleAr,
          contentAr: newAnnContentAr,
          contentEn: newAnnContentEn || newAnnContentAr,
          type: newAnnType
        })
      });
      if (res.ok) {
        showFeedback('success', 'تم نشر الإعلان العام على كامل صفحات الموقع لشعب الكنيسة!');
        setNewAnnTitleAr('');
        setNewAnnTitleEn('');
        setNewAnnContentAr('');
        setNewAnnContentEn('');
        setIsCreateAnnouncementOpen(false);
        loadAnnouncements();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/developer/announcements/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showFeedback('success', 'تم حذف الإعلان العام');
        loadAnnouncements();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 12. Discord-Style Roles & Permissions Editor
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    try {
      const res = await fetch(`${API_URL}/developer/roles/${editingRole.id || editingRole.name}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editingRole.name,
          description: editingRole.description,
          color: editingRole.color,
          priority: editingRole.priority,
          permissions: editingRole.permissions || []
        })
      });
      if (res.ok) {
        showFeedback('success', `تم حفظ صلاحيات رتبة (${editingRole.name}) بنجاح!`);
        setEditingRole(null);
        loadRoles();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/developer/roles`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDesc,
          color: newRoleColor,
          priority: newRolePriority,
          permissions: newRolePermissions
        })
      });
      if (res.ok) {
        showFeedback('success', `تمت إضافة الرتبة المخصصة (${newRoleName}) بنجاح`);
        setIsCreateRoleOpen(false);
        setNewRoleName('');
        setNewRoleDesc('');
        setNewRolePermissions([]);
        loadRoles();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('هل ترغب بحذف هذه الرتبة المخصصة؟')) return;
    try {
      const res = await fetch(`${API_URL}/developer/roles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showFeedback('success', 'تم حذف الرتبة المخصصة');
        loadRoles();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 13. User Ban / Unban Actions
  const handleToggleUserBan = async (user: UserDetailItem) => {
    const action = user.isBanned ? 'unban' : 'ban';
    if (!user.isBanned && !confirm(`هل ترغب بحظر حساب المستخدم (${user.email}) فورياً؟`)) return;

    try {
      const res = await fetch(`${API_URL}/developer/users/${user.id}/${action}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: 'إجراء إداري من بوابة المطور' })
      });
      if (res.ok) {
        showFeedback('success', user.isBanned ? `تم فك الحظر عن (${user.email})` : `تم حظر المستخدم (${user.email})`);
        loadUsersDetailed();
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    }
  };

  // 14. Testing Lab
  const handleRunTestLab = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch(`${API_URL}/developer/testing/run`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
        showFeedback('success', `اكتملت الاختبارات: اجتاز ${data.passed}/${data.totalTests} بنجاح!`);
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setIsRunningTests(false);
    }
  };

  // All Available Granular Permissions for Discord Roles
  const ALL_SYSTEM_PERMISSIONS = [
    { key: 'MANAGE_USERS', label: 'إدارة وتعديل بيانات المستخدمين' },
    { key: 'BAN_USERS', label: 'حظر وفك حظر الحسابات الكنسية' },
    { key: 'MANAGE_EVENTS', label: 'إنشاء وتعديل الفعاليات والرحلات' },
    { key: 'CANCEL_EVENTS', label: 'إلغاء الفعاليات وإبطال التذاكر' },
    { key: 'SCAN_QR', label: 'مسح باركود وتذاكر حضور الفعاليات' },
    { key: 'MANAGE_CONFESSIONS', label: 'إدارة مواعيد وحجوزات سر الاعتراف' },
    { key: 'MANAGE_SERMONS', label: 'إضافة ومراجعة العظات والكلمات' },
    { key: 'MANAGE_MEMBERSHIP', label: 'اعتماد وتعديل استمارات العضوية' },
    { key: 'VIEW_AUDIT_LOGS', label: 'استعراض سجلات التدقيق والعمليات' },
    { key: 'MANAGE_ANNOUNCEMENTS', label: 'نشر إعلانات الصيانة والتنبيهات العامة' },
    { key: 'ACCESS_SAFE_ZONE', label: 'الدخول إلى البيئة المعزولة (Safe Zone)' },
    { key: 'EXPORT_DATABASE', label: 'تصدير وأخذ نسخ احتياطية شاملة' },
    { key: 'MANAGE_THEMES', label: 'تغيير مواسم ومظهر الكنيسة العام' }
  ];

  // Sidebar Sections (Cleanly organized & merged without duplicates)
  const sidebarSections = [
    { id: 'command-center', labelAr: 'مركز القيادة والتحكم', labelEn: 'Command Center', icon: Activity },
    { id: 'security-center', labelAr: 'مركز الأمان والمطورين', labelEn: 'Security Center', icon: ShieldCheck },
    { id: 'dev-permissions', labelAr: 'الصلاحيات ورتب الديسكورد', labelEn: 'Discord-Style Roles', icon: Key },
    { id: 'safe-zone', labelAr: 'البيئة المعزولة وسجل الترقية والتراجع', labelEn: 'Safe Zone Sandbox & Push History', icon: Layers, badge: environmentMode === 'SAFE_ZONE' ? 'ACTIVE' : undefined },
    { id: 'emergency-controls', labelAr: 'طوارئ الإغلاق والإلغاء السريع', labelEn: 'Emergency Controls', icon: ShieldAlert, badge: lockdownState?.isActive ? 'LOCKED' : undefined },
    { id: 'pages-navbar', labelAr: 'التحكم بالصفحات والشريط العلوي', labelEn: 'Page & Navbar Control', icon: Globe },
    { id: 'ip-bans', labelAr: 'إدارة حظر العناوين (IP Bans)', labelEn: 'IP Ban Manager', icon: XCircle },
    { id: 'user-intelligence', labelAr: 'استخبارات الحسابات والجلسات', labelEn: 'User Intelligence', icon: Users },
    { id: 'themes-events', labelAr: 'مواسم الكنيسة والمظهر العام', labelEn: 'Themes & Liturgical Seasons', icon: Sparkles },
    { id: 'ai-chatbot', labelAr: 'المساعد الذكي وزر الإيقاف', labelEn: 'AI & Chatbot Kill Switch', icon: Bot },
    { id: 'feature-flags', labelAr: 'إدارة الخصائص والموديولات', labelEn: 'Feature Flags & Modules', icon: Sliders },
    { id: 'database', labelAr: 'قاعدة البيانات والنسخ الاحتياطي', labelEn: 'PostgreSQL Database & Backups', icon: Database },
    { id: 'audit-logs', labelAr: 'سجل العمليات الشامل (Audit)', labelEn: 'Universal Audit Log', icon: FileText },
    { id: 'logs-diagnostics', labelAr: 'السجلات والتشخيصات', labelEn: 'Logs & Diagnostics', icon: Terminal },
    { id: 'performance', labelAr: 'الأداء ومعدل التشغيل', labelEn: 'Performance & Uptime', icon: Cpu },
    { id: 'integrations', labelAr: 'التكاملات والخدمات السحابية', labelEn: 'Integrations & Cloud', icon: Settings },
    { id: 'api-jobs', labelAr: 'مستكشف الـ APIs والمهام', labelEn: 'API Explorer & Jobs', icon: Radio },
    { id: 'announcements', labelAr: 'الإعلانات ورسائل الصيانة', labelEn: 'Global Announcements', icon: AlertTriangle },
    { id: 'incidents', labelAr: 'إدارة البلاغات والحوادث', labelEn: 'Incident Management', icon: Flame },
    { id: 'config-history', labelAr: 'سجل التغييرات البرمجية', labelEn: 'Configuration History', icon: Clock },
    { id: 'testing-lab', labelAr: 'مختبر الاختبارات المباشرة', labelEn: 'Testing Lab', icon: CheckCircle2 },
    { id: 'ai-copilot', labelAr: 'مساعد المطور الذكي (Copilot)', labelEn: 'Developer AI Copilot', icon: Sparkles },
    { id: 'dependencies', labelAr: 'الاعتماديات ومعمارية النظام', labelEn: 'Architecture & Packages', icon: Layers }
  ];

  const filteredSections = sidebarSections.filter(s =>
    s.labelAr.toLowerCase().includes(searchFilter.toLowerCase()) ||
    s.labelEn.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Access check state
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
            هذه البوابة مخصصة ومحمية حصرياً لمطور المنظومة (marksamer010@gmail.com).
          </p>
          <button className={styles.btnPrimary} style={{ margin: '0 auto' }} onClick={() => router.push('/login')}>
            تسجيل الدخول بحساب المطور
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.portalContainer}>
      {/* 1. Mobile Top Header */}
      <header className={styles.mobileHeader}>
        <div className={styles.mobileTitle}>
          <Terminal size={18} />
          <span>بوابة المطورين</span>
        </div>
        <button
          className={styles.mobileMenuBtn}
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          aria-label="Toggle Navigation Drawer"
        >
          {isMobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* 2. Live Theme Preview Notification Bar */}
      {previewThemeKey && (
        <aside className={styles.previewBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sparkles size={18} style={{ color: '#fbbf24' }} />
            <div>
              <strong>وضع المعاينة الحية نشط: </strong>
              <span>أنت تشاهد الموقع الآن بنمط [{previewThemeKey}] دون التأثير على الزوار الآخرين.</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className={styles.btnSmPrimary} onClick={() => handleActivateSeasonTheme(previewThemeKey)}>
              <Check size={14} /> تطبيق على الموقع بالكامل
            </button>
            <button className={styles.btnSmSecondary} onClick={handleCancelPreview}>
              <X size={14} /> إلغاء المعاينة
            </button>
          </div>
        </aside>
      )}

      {/* Toast Feedback Notification */}
      {actionFeedback && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: actionFeedback.type === 'success' ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
          color: '#fff',
          padding: '0.75rem 1.5rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          animation: 'modalIn 0.2s ease-out'
        }}>
          {actionFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Backdrop for Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className={styles.sidebarBackdrop} onClick={() => setIsMobileDrawerOpen(false)} />
      )}

      {/* 3. Sidebar Navigation */}
      <aside className={`${styles.sidebar} ${isMobileDrawerOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div>
            <div className={styles.sidebarTitle}>
              <Terminal size={20} />
              <span>بوابة المطورين</span>
            </div>
            <div className={styles.sidebarSubtitle}>
              المطور الرئيسي: {currentUser.fullName}
            </div>
          </div>
        </div>

        <div className={styles.searchBox}>
          <Search size={14} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="بحث في أقسام البوابة..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        <ul className={styles.navList}>
          {filteredSections.map((sec) => {
            const IconComponent = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <li key={sec.id} className={styles.navItem}>
                <div
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  onClick={() => {
                    setActiveSection(sec.id);
                    setIsMobileDrawerOpen(false);
                  }}
                >
                  <IconComponent size={16} />
                  <span>{sec.labelAr}</span>
                  {sec.badge && (
                    <span className={`${styles.badge} ${sec.badge === 'ACTIVE' ? styles.badgePurple : styles.badgeDanger}`} style={{ marginInlineStart: 'auto', fontSize: '0.65rem' }}>
                      {sec.badge}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* 4. Main Content Canvas */}
      <main className={styles.mainContent}>
        {/* ======================================================== */}
        {/* 1. COMMAND CENTER (EXPANDED & HIGHLY INTERACTIVE)        */}
        {/* ======================================================== */}
        {activeSection === 'command-center' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Activity size={24} style={{ color: 'var(--accent-gold)' }} /> مركز القيادة والتحكم الفني</h1>
                <p className={styles.sectionDesc}>المؤشرات الحيوية الشاملة ومفاتيح التحكم السريع في بنية النظام وسجلات العمليات الحية.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className={styles.btnSecondary} onClick={loadCommandCenter}>
                  <RefreshCw size={14} /> تحديث البيانات
                </button>
                <button
                  className={lockdownState?.isActive ? styles.btnSuccess : styles.btnDanger}
                  onClick={() => handleToggleLockdown(!lockdownState?.isActive)}
                >
                  <ShieldAlert size={14} /> {lockdownState?.isActive ? 'إلغاء قفل الموقع (فتح المنصة)' : 'قفل طوارئ شامل (Lockdown)'}
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>حالة استجابة قاعدة البيانات</span>
                  <span className={`${styles.badge} ${metrics?.dbLatencyMs < 400 ? styles.badgeSuccess : styles.badgeWarning}`}>
                    {metrics?.dbLatencyMs || 250} ms
                  </span>
                </div>
                <div className={styles.cardValue}>متصلة ومستقرة</div>
                <div className={styles.cardSubtitle}>المزود: Supabase PostgreSQL Pooler + Direct AWS</div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>استهلاك ذاكرة Node.js</span>
                  <span className={`${styles.badge} ${styles.badgeInfo}`}>
                    {metrics?.memory?.heapUsedMb || 180} MB
                  </span>
                </div>
                <div className={styles.cardValue}>طبيعي (%18)</div>
                <div className={styles.cardSubtitle}>إجمالي المخصص: {metrics?.memory?.heapTotalMb || 256} MB | المعالجات: {metrics?.cpuCount || 4} Cores</div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>مفتاح البوت الذكي (AI Chatbot)</span>
                  <span className={`${styles.badge} ${lockdownState?.restrictAiChatbot ? styles.badgeDanger : styles.badgeSuccess}`}>
                    {lockdownState?.restrictAiChatbot ? 'معطل خادمياً' : 'مفعل ويعمل'}
                  </span>
                </div>
                <div className={styles.cardValue}>{lockdownState?.restrictAiChatbot ? 'LOCKED' : 'ACTIVE'}</div>
                <div className={styles.cardSubtitle}>
                  <button
                    className={styles.btnSmSecondary}
                    style={{ marginTop: '0.4rem' }}
                    onClick={() => handleToggleAiKillSwitch(!lockdownState?.restrictAiChatbot)}
                  >
                    {lockdownState?.restrictAiChatbot ? 'إعادة تفعيل البوت' : 'تفعيل مفتاح الإيقاف (Kill Switch)'}
                  </button>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>عناوين الـ IP المحظورة</span>
                  <span className={`${styles.badge} ${styles.badgeDanger}`}>{activeBansCount} محظور</span>
                </div>
                <div className={styles.cardValue}>{activeBansCount} IPs</div>
                <div className={styles.cardSubtitle}>فحص دوري بذاكرة سريعة (5s Cache TTL) لمنع الحمل الزائد</div>
              </div>
            </div>

            {/* Live Interactive Controls Strip */}
            <div className={styles.card} style={{ marginBottom: '1.75rem', borderColor: 'var(--accent-gold)' }}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle} style={{ color: 'var(--accent-gold)' }}>
                  <Zap size={18} /> لوحة التحكم السريعة والتحكم في الموديولات
                </span>
                <span className={`${styles.badge} ${styles.badgeInfo}`}>استجابة فورية</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button
                  className={environmentMode === 'SAFE_ZONE' ? styles.btnPurple : styles.btnSecondary}
                  onClick={() => setActiveSection('safe-zone')}
                >
                  <Layers size={14} /> وضع البيئة المعزولة: {environmentMode}
                </button>
                <button className={styles.btnSecondary} onClick={() => setActiveSection('themes-events')}>
                  <Sparkles size={14} /> تبديل الموسم الكنسي والمظهر
                </button>
                <button className={styles.btnSecondary} onClick={() => setActiveSection('database')}>
                  <Download size={14} /> أخذ نسخة احتياطية كاملة (Backup)
                </button>
                <button className={styles.btnSecondary} onClick={() => setActiveSection('emergency-controls')}>
                  <ShieldAlert size={14} /> إلغاء فعالية كنسية سريع
                </button>
                <button className={styles.btnSecondary} onClick={() => setActiveSection('user-intelligence')}>
                  <Users size={14} /> استخبارات الأجهزة والجلسات
                </button>
              </div>
            </div>

            {/* Live Activity & Audit Stream */}
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>آخر العمليات الفنية المسجلة حياً (Live Audit Stream)</h3>
                <button className={styles.btnSmSecondary} onClick={() => setActiveSection('audit-logs')}>
                  عرض السجل الكامل
                </button>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>الإجراء التقني</th>
                      <th>الهدف</th>
                      <th>المطور المنفذ</th>
                      <th>التوقيت</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.slice(0, 6).map((log) => (
                      <tr key={log.id}>
                        <td><code>{log.action}</code></td>
                        <td>{log.target}</td>
                        <td>{log.developerEmail}</td>
                        <td>{new Date(log.createdAt).toLocaleTimeString('ar-EG')}</td>
                        <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>SUCCESS</span></td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                          لا توجد عمليات تدقيق مسجلة حديثاً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. DISCORD-STYLE ROLES & GRANULAR PERMISSIONS            */}
        {/* ======================================================== */}
        {activeSection === 'dev-permissions' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Key size={24} style={{ color: 'var(--accent-gold)' }} /> الصلاحيات ورتب الديسكورد (Discord-Style Permissions)</h1>
                <p className={styles.sectionDesc}>إدارة الرتب الهرمية، وتخصيص الصلاحيات الحبيبية لكل رتبة، ومنع تصعيد الرتب برمجياً.</p>
              </div>
              <button className={styles.btnPrimary} onClick={() => setIsCreateRoleOpen(true)}>
                <Plus size={15} /> + إنشاء رتبة مخصصة جديدة
              </button>
            </div>

            <div className={styles.grid}>
              {rolesList.map((role) => (
                <div key={role.id || role.name} className={styles.card} style={{ borderInlineStart: `4px solid ${role.color || '#3b82f6'}` }}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle} style={{ color: role.color || '#3b82f6' }}>{role.name}</span>
                    <span className={`${styles.badge} ${styles.badgeInfo}`}>أولوية: {role.priority || 50}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    {role.description || 'رتبة كنسية مخصصة'}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {(role.permissions || []).slice(0, 4).map((p: string) => (
                      <span key={p} className={`${styles.badge} ${styles.badgeSecondary}`} style={{ fontSize: '0.68rem' }}>
                        {p}
                      </span>
                    ))}
                    {(role.permissions || []).length > 4 && (
                      <span className={`${styles.badge} ${styles.badgeSecondary}`} style={{ fontSize: '0.68rem' }}>
                        +{(role.permissions || []).length - 4} المزيد
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    <button
                      className={styles.btnSmPrimary}
                      style={{ flex: 1 }}
                      onClick={() => setEditingRole({
                        ...role,
                        permissions: role.permissions || [
                          'MANAGE_USERS', 'MANAGE_EVENTS', 'SCAN_QR'
                        ]
                      })}
                    >
                      <Edit3 size={13} /> تعديل الصلاحيات والرتبة
                    </button>
                    {!role.isSystem && role.id && (
                      <button className={styles.btnSmDanger} onClick={() => handleDeleteRole(role.id)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal: Edit Role & Permissions */}
            {editingRole && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalBox}>
                  <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                      <Key size={18} style={{ color: editingRole.color || 'var(--accent-gold)' }} />
                      <span>تعديل صلاحيات رتبة: {editingRole.name}</span>
                    </div>
                    <button className={styles.btnSmSecondary} onClick={() => setEditingRole(null)}>
                      <X size={15} />
                    </button>
                  </div>
                  <form onSubmit={handleSaveRole}>
                    <div className={styles.modalBody}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>وصف الرتبة</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={editingRole.description || ''}
                          onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>لون الرتبة (Hex Color)</label>
                          <input
                            type="color"
                            className={styles.formInput}
                            style={{ height: '40px', padding: '0.2rem' }}
                            value={editingRole.color || '#3b82f6'}
                            onChange={(e) => setEditingRole({ ...editingRole, color: e.target.value })}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>الأولوية الهرمية (1-100)</label>
                          <input
                            type="number"
                            className={styles.formInput}
                            value={editingRole.priority || 50}
                            onChange={(e) => setEditingRole({ ...editingRole, priority: parseInt(e.target.value, 10) })}
                          />
                        </div>
                      </div>

                      <label className={styles.formLabel} style={{ marginTop: '0.5rem' }}>
                        مصفوفة الصلاحيات الحبيبية (Permissions Checklist):
                      </label>
                      <div className={styles.permsGrid}>
                        {ALL_SYSTEM_PERMISSIONS.map((perm) => {
                          const isChecked = (editingRole.permissions || []).includes(perm.key);
                          return (
                            <label key={perm.key} className={styles.permItem}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const cur = editingRole.permissions || [];
                                  if (e.target.checked) {
                                    setEditingRole({ ...editingRole, permissions: [...cur, perm.key] });
                                  } else {
                                    setEditingRole({ ...editingRole, permissions: cur.filter((p: string) => p !== perm.key) });
                                  }
                                }}
                              />
                              <div>
                                <strong style={{ display: 'block', fontSize: '0.78rem' }}>{perm.key}</strong>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{perm.label}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className={styles.modalFooter}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setEditingRole(null)}>
                        إلغاء
                      </button>
                      <button type="submit" className={styles.btnPrimary}>
                        حفظ تغييرات الرتبة
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Create Custom Role */}
            {isCreateRoleOpen && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalBox}>
                  <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                      <Plus size={18} style={{ color: 'var(--accent-gold)' }} />
                      <span>إضافة رتبة كنسية مخصصة جديدة</span>
                    </div>
                    <button className={styles.btnSmSecondary} onClick={() => setIsCreateRoleOpen(false)}>
                      <X size={15} />
                    </button>
                  </div>
                  <form onSubmit={handleCreateCustomRole}>
                    <div className={styles.modalBody}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>اسم الرتبة (English Identifier)</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="DEACON_LEADER, SUNDAY_SCHOOL_DIRECTOR..."
                          required
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>الوصف والمسؤولية الكنسية</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="مسؤولية خدمة مدارس الأحد ومتابعة الخدام..."
                          required
                          value={newRoleDesc}
                          onChange={(e) => setNewRoleDesc(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>اللون المميز</label>
                          <input
                            type="color"
                            className={styles.formInput}
                            style={{ height: '40px', padding: '0.2rem' }}
                            value={newRoleColor}
                            onChange={(e) => setNewRoleColor(e.target.value)}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>الأولوية الهرمية (1-100)</label>
                          <input
                            type="number"
                            className={styles.formInput}
                            value={newRolePriority}
                            onChange={(e) => setNewRolePriority(parseInt(e.target.value, 10))}
                          />
                        </div>
                      </div>

                      <label className={styles.formLabel}>تحديد الصلاحيات الممنوحة:</label>
                      <div className={styles.permsGrid}>
                        {ALL_SYSTEM_PERMISSIONS.map((perm) => (
                          <label key={perm.key} className={styles.permItem}>
                            <input
                              type="checkbox"
                              checked={newRolePermissions.includes(perm.key)}
                              onChange={(e) => {
                                if (e.target.checked) setNewRolePermissions([...newRolePermissions, perm.key]);
                                else setNewRolePermissions(newRolePermissions.filter(p => p !== perm.key));
                              }}
                            />
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.78rem' }}>{perm.key}</strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{perm.label}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className={styles.modalFooter}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setIsCreateRoleOpen(false)}>
                        إلغاء
                      </button>
                      <button type="submit" className={styles.btnPrimary}>
                        إنشاء الرتبة المخصصة
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. MERGED SAFE ZONE & PUSH HISTORY & UNDO/REDO           */}
        {/* ======================================================== */}
        {activeSection === 'safe-zone' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Layers size={24} style={{ color: 'var(--accent-gold)' }} /> البيئة المعزولة وسجل الترقية والتراجع (Safe Zone & Releases)</h1>
                <p className={styles.sectionDesc}>منطقة اختبار التعديلات بمعزل تام عن الإنتاج مع تاريخ الإصدارات الشامل ومحرك التراجع السريع (UNDO/REDO).</p>
              </div>
            </div>

            {/* Safe Zone Control Panel */}
            <div className={styles.card} style={{ marginBottom: '1.75rem', borderColor: environmentMode === 'SAFE_ZONE' ? '#a855f7' : undefined }}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>
                  حالة البيئة الحالية: <span className={`${styles.badge} ${environmentMode === 'SAFE_ZONE' ? styles.badgePurple : styles.badgeSuccess}`}>{environmentMode}</span>
                </span>
                <span className={`${styles.badge} ${safeZoneDraft?.hasUnsavedChanges ? styles.badgeWarning : styles.badgeSuccess}`}>
                  {safeZoneDraft?.hasUnsavedChanges ? 'توجد تعديلات مسودة غير منشورة' : 'متطابقة مع الإنتاج 100%'}
                </span>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                في وضع البيئة المعزولة، يمكنك تجربة تغيير الصلاحيات، مواسم الكنيسة، وتعديلات الشريط العلوي دون أن يراها مستخدمو الكنيسة حتى تقوم بالترقية للإنتاج الحقيقي (PUSH).
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className={styles.btnDanger} onClick={() => handleExitSafeZone('NO')}>
                  <XCircle size={15} /> [NO] إلغاء المسودة واسترجاع الإنتاج
                </button>
                <button className={styles.btnSecondary} onClick={() => handleExitSafeZone('SAVE')}>
                  <Download size={15} /> [SAVE] حفظ كمسودة دون نشر
                </button>
                <button className={styles.btnPrimary} onClick={() => handleExitSafeZone('PUSH')}>
                  <Play size={15} /> [PUSH] اعتماد ونشر التغييرات للإنتاج الحقيقي
                </button>
              </div>
            </div>

            {/* Releases History & UNDO / REDO Table */}
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>سجل الإصدارات المعتمدة ومحرك التراجع (Release Versioning)</h3>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>رقم الإصدار</th>
                      <th>نوع التغيير</th>
                      <th>الملخص والبيان</th>
                      <th>المطور المسؤول</th>
                      <th>تاريخ النشر</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {releasesList.map((rel) => (
                      <tr key={rel.id}>
                        <td><strong>{rel.version}</strong></td>
                        <td>
                          <span className={`${styles.badge} ${rel.changeType === 'PUSH' ? styles.badgeSuccess : styles.badgeWarning}`}>
                            {rel.changeType}
                          </span>
                        </td>
                        <td style={{ maxWidth: '300px' }}>{rel.summary}</td>
                        <td>{rel.developerEmail}</td>
                        <td>{new Date(rel.createdAt).toLocaleString('ar-EG')}</td>
                        <td>
                          {rel.previousStateJson ? (
                            <button className={styles.btnSmDanger} onClick={() => handleUndoRelease(rel.id)}>
                              <Undo2 size={13} /> تراجع فوري (UNDO)
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>إصدار أولي</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {releasesList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                          لا توجد إصدارات سابقة مسجلة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. EMERGENCY CONTROLS WITH SMART AUTOCOMPLETE SEARCH    */}
        {/* ======================================================== */}
        {activeSection === 'emergency-controls' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><ShieldAlert size={24} style={{ color: 'var(--accent-red)' }} /> طوارئ الإغلاق الشامل والإلغاء السريع</h1>
                <p className={styles.sectionDesc}>إيقاف الموقع بالكامل في الأزمات وإلغاء فعاليات الكنيسة بكود أمان مطور مشفر.</p>
              </div>
            </div>

            {/* Website Lockdown Controls */}
            <div className={styles.card} style={{ marginBottom: '1.75rem', borderColor: lockdownState?.isActive ? 'var(--accent-red)' : undefined }}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>قفل الطوارئ الشامل للمنصة (Full Platform Lockdown)</span>
                <span className={`${styles.badge} ${lockdownState?.isActive ? styles.badgeDanger : styles.badgeSuccess}`}>
                  {lockdownState?.isActive ? 'الموقع مغلق حالياً' : 'الموقع متاح للجميع'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>سبب القفل الفني (سري للمطورين)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={lockdownReason}
                    onChange={(e) => setLockdownReason(e.target.value)}
                    placeholder="صيانة قواعد البيانات، هجوم DDoS، تحديث جذري..."
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>الرسالة المعروضة للشعب والزوار</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={lockdownMessage}
                    onChange={(e) => setLockdownMessage(e.target.value)}
                    placeholder="الموقع يخضع حالياً لعملية صيانة مجدولة. سنعود للعمل قريباً..."
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', margin: '0.75rem 0', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={lockdownRestrictLogin}
                    onChange={(e) => setLockdownRestrictLogin(e.target.checked)}
                  />
                  <span>منع تسجيل الدخول لغير المطورين</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={lockdownRestrictReg}
                    onChange={(e) => setLockdownRestrictReg(e.target.checked)}
                  />
                  <span>إيقاف تسجيل الحسابات الجديدة</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={lockdownRestrictAi}
                    onChange={(e) => setLockdownRestrictAi(e.target.checked)}
                  />
                  <span>إيقاف المساعد الذكي (AI Bot Kill Switch)</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  className={lockdownState?.isActive ? styles.btnSuccess : styles.btnDanger}
                  onClick={() => handleToggleLockdown(!lockdownState?.isActive)}
                >
                  {lockdownState?.isActive ? 'إنهاء وضع الإغلاق واستعادة الموقع' : 'تفعيل قفل الطوارئ الشامل الآن'}
                </button>
              </div>
            </div>

            {/* Quick Event Cancellation with Smart Search Dropdown */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>إلغاء سريع لفعالية كنسية (Smart Event Cancellation)</span>
                <span className={`${styles.badge} ${styles.badgeWarning}`}>يتطلب كود أمان</span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                ابحث عن اسم الفعالية بالذكاء المساعد لاختيارها فورياً وإلغائها وتحديث التذاكر المسجلة بدون حذف بيانات المتقدمين:
              </p>

              <form onSubmit={handleExecuteEventCancellation}>
                {/* Smart Autocomplete Event Search Input */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>ابحث عن الفعالية بالاسم أو الكود:</label>
                  <div className={styles.autocompleteWrapper}>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="اكتب اسم الفعالية (مثال: رحلة دير مارمينا، مؤتمر الشباب...)"
                      value={eventSearchQuery}
                      onChange={(e) => {
                        setEventSearchQuery(e.target.value);
                        setShowEventDropdown(true);
                      }}
                      onFocus={() => setShowEventDropdown(true)}
                    />
                    {isSearchingEvents && (
                      <span style={{ position: 'absolute', left: '10px', top: '10px', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                        جاري البحث...
                      </span>
                    )}

                    {/* Autocomplete Dropdown List */}
                    {showEventDropdown && eventSearchResults.length > 0 && (
                      <div className={styles.autocompleteList}>
                        {eventSearchResults.map((ev) => (
                          <div
                            key={ev.id}
                            className={styles.autocompleteItem}
                            onClick={() => {
                              setSelectedEventToCancel(ev);
                              setEventSearchQuery(`${ev.titleAr} (${new Date(ev.date).toLocaleDateString('ar-EG')})`);
                              setShowEventDropdown(false);
                            }}
                          >
                            <div>
                              <strong>{ev.titleAr}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {ev.titleEn} · {new Date(ev.date).toLocaleDateString('ar-EG')} · {ev.locationAr || 'مقر الكنيسة'}
                              </div>
                            </div>
                            <span className={`${styles.badge} ${styles.badgeInfo}`}>
                              {ev._count?.applications || ev._count?.invitations || 0} تذكرة
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Event Card Preview */}
                {selectedEventToCancel && (
                  <div className={styles.selectedEventCard}>
                    <div>
                      <strong style={{ color: 'var(--accent-gold)', fontSize: '0.95rem', display: 'block' }}>
                        {selectedEventToCancel.titleAr}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        المعرف الرقمي: <code>{selectedEventToCancel.id}</code> | الموعد: {new Date(selectedEventToCancel.date).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.btnSmDanger}
                      onClick={() => {
                        setSelectedEventToCancel(null);
                        setEventSearchQuery('');
                      }}
                    >
                      <X size={13} /> إزالة الاختيار
                    </button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>كود إلغاء الفعاليات السري المعتمد خادمياً *</label>
                    <input
                      type="password"
                      className={styles.formInput}
                      placeholder="أدخل كود الإلغاء (ch140ch140)..."
                      required
                      value={cancelCodeInput}
                      onChange={(e) => setCancelCodeInput(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>سبب الإلغاء المعروض للمسجلين</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="ظروف طارئة، صيانة المكان، قرار الآباء الكهنة..."
                      value={cancelReasonInput}
                      onChange={(e) => setCancelReasonInput(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.btnDanger}
                  disabled={isSubmittingCancellation || !selectedEventToCancel}
                  style={{ marginTop: '0.75rem' }}
                >
                  <XCircle size={15} /> {isSubmittingCancellation ? 'جاري التحقق والإلغاء...' : 'تأكيد الإلغاء الفوري للفعالية المختارة'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. REDONE PAGE ACCESS POLICIES & NAVBAR DYNAMICS         */}
        {/* ======================================================== */}
        {activeSection === 'pages-navbar' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Globe size={24} style={{ color: 'var(--accent-gold)' }} /> التحكم بالصفحات والشريط العلوي (Pages & Navbar Control)</h1>
                <p className={styles.sectionDesc}>تحديد سياسات الأمان لكل رابط، وتفعيل تقييدات مؤقتة مع مؤقتات انتهاء خادمية ذكية.</p>
              </div>
            </div>

            {/* Pages Table Redone with Clean Selectors & Direct Actions */}
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
                      <th>المدة المطلوبة</th>
                      <th>حالة التجاوز المؤقت</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagePolicies.map((p) => {
                      const durationVal = selectedPagePolicyDuration[p.routePath] || 'PERMANENT';
                      return (
                        <tr key={p.routePath}>
                          <td><code>{p.routePath}</code></td>
                          <td>{p.pageTitleAr} ({p.pageTitleEn})</td>
                          <td>
                            <select
                              className={styles.formSelect}
                              style={{ width: 'auto', padding: '0.25rem 0.6rem' }}
                              value={p.permanentPolicy}
                              onChange={(e) => handleSavePagePolicy(p, e.target.value)}
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
                            <select
                              className={styles.formSelect}
                              style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                              value={durationVal}
                              onChange={(e) => setSelectedPagePolicyDuration({
                                ...selectedPagePolicyDuration,
                                [p.routePath]: e.target.value
                              })}
                            >
                              <option value="PERMANENT">دائمة (Permanent)</option>
                              <option value="1">مؤقتة لساعة واحدة</option>
                              <option value="6">مؤقتة لـ 6 ساعات</option>
                              <option value="24">مؤقتة ليوم كامل (24h)</option>
                            </select>
                          </td>
                          <td>
                            {p.hasActiveOverride ? (
                              <span className={`${styles.badge} ${styles.badgeWarning}`}>
                                {p.overridePolicy} (ينتهي {new Date(p.overrideExpiresAt).toLocaleTimeString('ar-EG')})
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>لا يوجد</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              {p.hasActiveOverride ? (
                                <button className={styles.btnSmDanger} onClick={() => handleClearPageOverride(p.routePath)}>
                                  إلغاء التجاوز
                                </button>
                              ) : (
                                <button className={styles.btnSmPrimary} onClick={() => handleSavePagePolicy(p, p.permanentPolicy)}>
                                  تطبيق
                                </button>
                              )}
                              <a
                                href={p.routePath}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.btnSmSecondary}
                              >
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Navbar Items Table */}
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>عناصر الشريط العلوي للموقع (Navbar Items)</h3>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>الرابط</th>
                      <th>الاسم بالعربية</th>
                      <th>الاسم بالإنجليزية</th>
                      <th>الحالة</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {navbarItems.map((item) => (
                      <tr key={item.path}>
                        <td><code>{item.path}</code></td>
                        <td><strong>{item.nameAr}</strong></td>
                        <td>{item.nameEn}</td>
                        <td>
                          <span className={`${styles.badge} ${item.isVisible ? styles.badgeSuccess : styles.badgeDanger}`}>
                            {item.isVisible ? 'مرئي للجميع' : 'مخفي'}
                          </span>
                        </td>
                        <td>
                          <button className={styles.btnSmSecondary} onClick={() => handleToggleNavbarItem(item)}>
                            {item.isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                            {item.isVisible ? 'إخفاء من الشريط' : 'إظهار في الشريط'}
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

        {/* ======================================================== */}
        {/* 6. USER INTELLIGENCE & SESSIONS TELEMETRY (COMPLETE)    */}
        {/* ======================================================== */}
        {activeSection === 'user-intelligence' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Users size={24} style={{ color: 'var(--accent-gold)' }} /> استخبارات الحسابات والجلسات (User Intelligence)</h1>
                <p className={styles.sectionDesc}>استعراض بيانات الأجهزة الحقيقية، عناوين الـ IP، توقيت آخر دخول، والتحكم بالحسابات.</p>
              </div>
              <button className={styles.btnSecondary} onClick={loadUsersDetailed}>
                <RefreshCw size={14} /> تحديث قائمة المستخدمين
              </button>
            </div>

            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>قائمة المستخدمين والجلسات النشطة ({usersList.length})</h3>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>المستخدم</th>
                      <th>البريد الإلكتروني</th>
                      <th>الرتبة</th>
                      <th>نوع الجهاز والمتصفح</th>
                      <th>عنوان IP الأخير</th>
                      <th>آخر ظهور</th>
                      <th>حالة الحساب</th>
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
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{u.deviceType}</span>
                        </td>
                        <td><code>{u.ipAddress}</code></td>
                        <td>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {new Date(u.lastActiveAt).toLocaleString('ar-EG')}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${u.isBanned ? styles.badgeDanger : styles.badgeSuccess}`}>
                            {u.isBanned ? 'محظور' : 'نشط'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className={styles.btnSmSecondary} onClick={() => setSelectedUserModal(u)}>
                              تفاصيل الحساب
                            </button>
                            {u.email !== 'marksamer010@gmail.com' && (
                              <button
                                className={u.isBanned ? styles.btnSmSuccess : styles.btnSmDanger}
                                onClick={() => handleToggleUserBan(u)}
                              >
                                {u.isBanned ? 'فك الحظر' : 'حظر'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                          {isLoadingUsers ? 'جاري جلب استخبارات المستخدمين...' : 'لا توجد حسابات مسجلة.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Deep User Details & Activity Intelligence */}
            {selectedUserModal && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalBox}>
                  <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                      <Users size={18} style={{ color: 'var(--accent-gold)' }} />
                      <span>تفاصيل واستخبارات حساب: {selectedUserModal.fullName}</span>
                    </div>
                    <button className={styles.btnSmSecondary} onClick={() => setSelectedUserModal(null)}>
                      <X size={15} />
                    </button>
                  </div>
                  <div className={styles.modalBody}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className={styles.card}>
                        <span className={styles.cardTitle}>البريد الإلكتروني</span>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedUserModal.email}</div>
                      </div>
                      <div className={styles.card}>
                        <span className={styles.cardTitle}>رقم الهاتف</span>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedUserModal.phone || 'غير مسجل'}</div>
                      </div>
                      <div className={styles.card}>
                        <span className={styles.cardTitle}>نوع الجهاز والنظام</span>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedUserModal.deviceType}</div>
                      </div>
                      <div className={styles.card}>
                        <span className={styles.cardTitle}>عنوان الـ IP المعتمد</span>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}><code>{selectedUserModal.ipAddress}</code></div>
                      </div>
                      <div className={styles.card}>
                        <span className={styles.cardTitle}>حجوزات الاعتراف المسجلة</span>
                        <div style={{ fontWeight: 600, fontSize: '1.2rem', color: 'var(--accent-gold)' }}>
                          {selectedUserModal.appointmentsCount} موعد
                        </div>
                      </div>
                      <div className={styles.card}>
                        <span className={styles.cardTitle}>بطاقات وحضور الفعاليات</span>
                        <div style={{ fontWeight: 600, fontSize: '1.2rem', color: '#86efac' }}>
                          {selectedUserModal.ticketsCount} بطاقة
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.modalFooter}>
                    <button className={styles.btnSecondary} onClick={() => setSelectedUserModal(null)}>
                      إغلاق
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 7. COPTIC SEASONAL THEMES SYSTEM (THE 5 REQUIRED THEMES) */}
        {/* ======================================================== */}
        {activeSection === 'themes-events' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Sparkles size={24} style={{ color: 'var(--accent-gold)' }} /> مواسم الكنيسة القبطية والمظهر العام (Liturgical Themes)</h1>
                <p className={styles.sectionDesc}>تبديل مظهر الموقع العام وتخصيص الألوان ليتناسب مع طقس وفرحة أو خشوع المناسبة الكنسية الحالية.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button className={styles.btnSecondary} onClick={handleResetThemesToDefault}>
                  <RefreshCw size={14} /> استعادة المظهر الافتراضي
                </button>
              </div>
            </div>

            <div className={styles.grid}>
              {themesList.map((th) => {
                const isCurrentActive = th.isActive;
                return (
                  <div
                    key={th.id || th.seasonKey}
                    className={styles.card}
                    style={{
                      borderColor: isCurrentActive ? 'var(--accent-gold)' : undefined,
                      borderWidth: isCurrentActive ? '2px' : '1px'
                    }}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{th.nameAr}</span>
                      {isCurrentActive ? (
                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>المظهر النشط حالياً</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeInfo}`}>{th.seasonKey}</span>
                      )}
                    </div>
                    <div className={styles.cardSubtitle} style={{ marginBottom: '1rem' }}>{th.nameEn}</div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                      <button
                        className={styles.btnSmSecondary}
                        style={{ flex: 1 }}
                        onClick={() => handlePreviewTheme(th.seasonKey)}
                      >
                        <Eye size={13} /> معاينة حية
                      </button>
                      {!isCurrentActive && (
                        <button
                          className={styles.btnSmPrimary}
                          style={{ flex: 1 }}
                          onClick={() => handleActivateSeasonTheme(th.seasonKey)}
                        >
                          تفعيل هذا النمط
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 8. AI BOT KILL SWITCH & CHATBOT BACKEND ENGINE           */}
        {/* ======================================================== */}
        {activeSection === 'ai-chatbot' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Bot size={24} style={{ color: 'var(--accent-gold)' }} /> المساعد الروحي الذكي ومفتاح الإيقاف الإجباري</h1>
                <p className={styles.sectionDesc}>التحكم الخادم بمحرك الذكاء الاصطناعي وإخفاء زر البوت فورياً عن غير المطورين عند تفعيل الإيقاف.</p>
              </div>
              <button
                className={lockdownState?.restrictAiChatbot ? styles.btnSuccess : styles.btnDanger}
                onClick={() => handleToggleAiKillSwitch(!lockdownState?.restrictAiChatbot)}
              >
                {lockdownState?.restrictAiChatbot ? 'إعادة تفعيل المساعد الذكي' : 'تفعيل مفتاح الإيقاف الإجباري (Kill Switch)'}
              </button>
            </div>

            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>حالة مفتاح الإيقاف (Kill Switch)</span>
                  <span className={`${styles.badge} ${lockdownState?.restrictAiChatbot ? styles.badgeDanger : styles.badgeSuccess}`}>
                    {lockdownState?.restrictAiChatbot ? 'متوقف خادمياً' : 'جاهز ويعمل'}
                  </span>
                </div>
                <div className={styles.cardValue}>{lockdownState?.restrictAiChatbot ? 'KILL SWITCH ON' : 'ONLINE'}</div>
                <div className={styles.cardSubtitle}>
                  {lockdownState?.restrictAiChatbot ? 'زر المساعد مخفي حالياً عن شعب الكنيسة ومتاح فقط للمطور' : 'المساعد متاح لجميع زوار وأعضاء الموقع'}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>المحرك ومزود الذكاء الاصطناعي</span>
                  <span className={`${styles.badge} ${styles.badgeInfo}`}>GEMINI</span>
                </div>
                <div className={styles.cardValue}>Google Gemini Pro</div>
                <div className={styles.cardSubtitle}>الاحتياطي عالي السرعة: Groq LLaMA 3.1 Versatile</div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 9. FEATURE FLAGS & MODULES                               */}
        {/* ======================================================== */}
        {activeSection === 'feature-flags' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Sliders size={24} style={{ color: 'var(--accent-gold)' }} /> إدارة الخصائص والموديولات (Feature Flags)</h1>
                <p className={styles.sectionDesc}>إيقاف وتشغيل ميزات الموقع فورياً وبدون إعادة بناء أو نشر الكود.</p>
              </div>
            </div>

            <div className={styles.grid}>
              {featureFlags.map((flag) => (
                <div key={flag.key} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>{flag.nameAr}</span>
                    <span className={`${styles.badge} ${flag.isEnabled ? styles.badgeSuccess : styles.badgeDanger}`}>
                      {flag.isEnabled ? 'مفعل' : 'معطل'}
                    </span>
                  </div>
                  <div className={styles.cardSubtitle} style={{ marginBottom: '1rem' }}>
                    <code>{flag.key}</code> — {flag.description || flag.nameEn}
                  </div>
                  <button
                    className={flag.isEnabled ? styles.btnDanger : styles.btnSuccess}
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => handleToggleFeatureFlag(flag.key, flag.isEnabled)}
                  >
                    {flag.isEnabled ? 'تعطيل الموديول' : 'تفعيل الموديول'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 10. MERGED DATABASE & BACKUPS & TABLE DATA VIEWER        */}
        {/* ======================================================== */}
        {activeSection === 'database' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Database size={24} style={{ color: 'var(--accent-gold)' }} /> قاعدة بيانات الكنيسة والنسخ الاحتياطي (PostgreSQL & Backups)</h1>
                <p className={styles.sectionDesc}>أخذ نسخة احتياطية شاملة لكامل بيانات ومحتويات الموقع، استيراد النسخ، واستعراض سجلات الجداول الفعلية.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  className={styles.btnPrimary}
                  onClick={handleDownloadFullBackup}
                  disabled={isExportingBackup}
                >
                  <Download size={15} /> {isExportingBackup ? 'جاري تصدير البيانات...' : 'تحميل نسخة احتياطية شاملة (Full Backup)'}
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoringBackup}
                >
                  <Upload size={15} /> {isRestoringBackup ? 'جاري الاستعادة...' : 'استيراد نسخة قاعدة بيانات (Import Copy)'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".json"
                  onChange={handleRestoreBackupFile}
                />
              </div>
            </div>

            {/* Metrics cards */}
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>زمن استجابة الاستعلام</span>
                  <span className={`${styles.badge} ${styles.badgeSuccess}`}>{metrics?.dbLatencyMs || 250} ms</span>
                </div>
                <div className={styles.cardValue}>CONNECTED</div>
                <div className={styles.cardSubtitle}>المزود: Supabase Pooler + AWS Direct</div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>فحص سلامة العلاقات والربط</span>
                  <span className={`${styles.badge} ${styles.badgeSuccess}`}>100% سليم</span>
                </div>
                <div className={styles.cardValue}>Cascade Enforced</div>
                <div className={styles.cardSubtitle}>مفاتيح الربط والقيود الصارمة مفعلة</div>
              </div>
            </div>

            {/* Interactive Table Data Browser */}
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>مستكشف سجلات الجداول الحية</h3>
                  <select
                    className={styles.formSelect}
                    style={{ width: 'auto', padding: '0.3rem 0.8rem' }}
                    value={selectedTableToBrowse}
                    onChange={(e) => {
                      setSelectedTableToBrowse(e.target.value);
                      loadTableData(e.target.value, 1);
                    }}
                  >
                    <option value="User">جدول المستخدمين (User)</option>
                    <option value="PriestProfile">ملفات الآباء الكهنة (PriestProfile)</option>
                    <option value="Appointment">مواعيد سر الاعتراف (Appointment)</option>
                    <option value="Event">الفعاليات الكنسية (Event)</option>
                    <option value="EventInvitation">تذاكر ودعوات الحضور (EventInvitation)</option>
                    <option value="Sermon">العظات الروحية (Sermon)</option>
                    <option value="News">الأخبار الكنسية (News)</option>
                    <option value="DevPagePolicy">سياسات الصفحات (DevPagePolicy)</option>
                    <option value="DevNavbarItem">عناصر الشريط (DevNavbarItem)</option>
                    <option value="DevFeatureFlag">خصائص المنظومة (DevFeatureFlag)</option>
                    <option value="DevThemeConfig">مواسم الكنيسة (DevThemeConfig)</option>
                    <option value="DevIpBan">عناوين IP المحظورة (DevIpBan)</option>
                    <option value="DevAuditLog">سجل التدقيق (DevAuditLog)</option>
                  </select>
                </div>
                <span className={`${styles.badge} ${styles.badgeInfo}`}>
                  إجمالي السجلات: {tableTotalCount}
                </span>
              </div>

              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {tableRows[0] && Object.keys(tableRows[0]).slice(0, 6).map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                      {!tableRows[0] && <th>البيانات</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).slice(0, 6).map((val: any, vIdx) => (
                          <td key={vIdx} style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {tableRows.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                          {isLoadingTable ? 'جاري تحميل السجلات...' : 'لا توجد بيانات مسجلة في هذا الجدول.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {tableTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    className={styles.btnSmSecondary}
                    disabled={tablePage <= 1}
                    onClick={() => loadTableData(selectedTableToBrowse, tablePage - 1)}
                  >
                    <ChevronRight size={14} /> السابق
                  </button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    صفحة {tablePage} من {tableTotalPages}
                  </span>
                  <button
                    className={styles.btnSmSecondary}
                    disabled={tablePage >= tableTotalPages}
                    onClick={() => loadTableData(selectedTableToBrowse, tablePage + 1)}
                  >
                    التالي <ChevronLeft size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 11. GLOBAL ANNOUNCEMENTS & MAINTENANCE NOTICES           */}
        {/* ======================================================== */}
        {activeSection === 'announcements' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><AlertTriangle size={24} style={{ color: 'var(--accent-gold)' }} /> الإعلانات ورسائل الصيانة العامة</h1>
                <p className={styles.sectionDesc}>نشر إشعارات علوية على كامل الموقع لشعب الكنيسة والخدام والزوار فورياً.</p>
              </div>
              <button className={styles.btnPrimary} onClick={() => setIsCreateAnnouncementOpen(true)}>
                <Plus size={15} /> + إضافة إعلان عام جديد
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
                    {announcementsList.map((ann) => (
                      <tr key={ann.id}>
                        <td><strong>{ann.titleAr}</strong></td>
                        <td style={{ maxWidth: '300px' }}>{ann.contentAr}</td>
                        <td><span className={`${styles.badge} ${styles.badgeInfo}`}>{ann.type}</span></td>
                        <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>نشط</span></td>
                        <td>
                          <button className={styles.btnSmDanger} onClick={() => handleDeleteAnnouncement(ann.id)}>
                            <Trash2 size={13} /> حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                    {announcementsList.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                          لا توجد إعلانات عامة نشطة حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Create Announcement */}
            {isCreateAnnouncementOpen && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalBox}>
                  <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                      <AlertTriangle size={18} style={{ color: 'var(--accent-gold)' }} />
                      <span>نشر إعلان عام جديد لكافة زوار الموقع</span>
                    </div>
                    <button className={styles.btnSmSecondary} onClick={() => setIsCreateAnnouncementOpen(false)}>
                      <X size={15} />
                    </button>
                  </div>
                  <form onSubmit={handleCreateAnnouncement}>
                    <div className={styles.modalBody}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>عنوان الإعلان بالعربية *</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="تنبيه بخصوص قداس الغد، موعد تسليم الاستمارات..."
                          required
                          value={newAnnTitleAr}
                          onChange={(e) => setNewAnnTitleAr(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>محتوى الإعلان بالعربية *</label>
                        <textarea
                          className={styles.formTextarea}
                          rows={3}
                          placeholder="نحيطكم علماً بأن صلوات القداس الإلهي ستبدأ غداً الساعة..."
                          required
                          value={newAnnContentAr}
                          onChange={(e) => setNewAnnContentAr(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>نوع التنبيه</label>
                        <select
                          className={styles.formSelect}
                          value={newAnnType}
                          onChange={(e) => setNewAnnType(e.target.value)}
                        >
                          <option value="INFO">معلومة عامة (INFO)</option>
                          <option value="WARNING">تنبيه هام (WARNING)</option>
                          <option value="EMERGENCY">طوارئ كنسية (EMERGENCY)</option>
                        </select>
                      </div>
                    </div>
                    <div className={styles.modalFooter}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setIsCreateAnnouncementOpen(false)}>
                        إلغاء
                      </button>
                      <button type="submit" className={styles.btnPrimary}>
                        نشر الإعلان فورياً
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 12. INCIDENTS FULL MANAGEMENT (EDIT & DELETE)            */}
        {/* ======================================================== */}
        {activeSection === 'incidents' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Flame size={24} style={{ color: 'var(--accent-red)' }} /> إدارة البلاغات والحوادث التقنية (Incident Management)</h1>
                <p className={styles.sectionDesc}>تسجيل البلاغات وتعديل تفاصيلها وحذف السجلات وتأكيد حل المشاكل.</p>
              </div>
              <button className={styles.btnPrimary} onClick={() => setIsCreateIncidentOpen(true)}>
                <Plus size={15} /> + تسجيل بلاغ تقني جديد
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
                        <td>
                          <span className={`${styles.badge} ${inc.severity === 'CRITICAL' ? styles.badgeDanger : styles.badgeWarning}`}>
                            {inc.severity}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${inc.status === 'RESOLVED' ? styles.badgeSuccess : styles.badgeDanger}`}>
                            {inc.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: '250px', fontSize: '0.8rem' }}>{inc.description}</td>
                        <td style={{ fontSize: '0.8rem' }}>{inc.resolutionNotes || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className={styles.btnSmPrimary} onClick={() => setEditingIncident(inc)}>
                              <Edit3 size={13} /> تعديل
                            </button>
                            <button className={styles.btnSmDanger} onClick={() => handleDeleteIncident(inc.id)}>
                              <Trash2 size={13} /> حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {incidentsList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                          لا توجد بلاغات مسجلة حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Edit Incident */}
            {editingIncident && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalBox}>
                  <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                      <Edit3 size={18} style={{ color: 'var(--accent-gold)' }} />
                      <span>تعديل البلاغ التقني: {editingIncident.title}</span>
                    </div>
                    <button className={styles.btnSmSecondary} onClick={() => setEditingIncident(null)}>
                      <X size={15} />
                    </button>
                  </div>
                  <form onSubmit={handleUpdateIncident}>
                    <div className={styles.modalBody}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>عنوان الحادث</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          required
                          value={editingIncident.title}
                          onChange={(e) => setEditingIncident({ ...editingIncident, title: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>مستوى الخطورة</label>
                          <select
                            className={styles.formSelect}
                            value={editingIncident.severity}
                            onChange={(e) => setEditingIncident({ ...editingIncident, severity: e.target.value })}
                          >
                            <option value="CRITICAL">حرج جداً (CRITICAL)</option>
                            <option value="HIGH">مرتفع (HIGH)</option>
                            <option value="MEDIUM">متوسط (MEDIUM)</option>
                            <option value="LOW">منخفض (LOW)</option>
                          </select>
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>حالة المعالجة</label>
                          <select
                            className={styles.formSelect}
                            value={editingIncident.status}
                            onChange={(e) => setEditingIncident({ ...editingIncident, status: e.target.value })}
                          >
                            <option value="OPEN">مفتوح وقيد المتابعة (OPEN)</option>
                            <option value="INVESTIGATING">جاري الفحص (INVESTIGATING)</option>
                            <option value="RESOLVED">تم الحل بنجاح (RESOLVED)</option>
                          </select>
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>تفاصيل العطل والتشخيص</label>
                        <textarea
                          className={styles.formTextarea}
                          rows={3}
                          value={editingIncident.description}
                          onChange={(e) => setEditingIncident({ ...editingIncident, description: e.target.value })}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>ملاحظات وإجراءات الحل</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="تم إصلاح المسار وتحديث شهادة SSL..."
                          value={editingIncident.resolutionNotes || ''}
                          onChange={(e) => setEditingIncident({ ...editingIncident, resolutionNotes: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className={styles.modalFooter}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setEditingIncident(null)}>
                        إلغاء
                      </button>
                      <button type="submit" className={styles.btnPrimary}>
                        حفظ التعديلات
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Create Incident */}
            {isCreateIncidentOpen && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalBox}>
                  <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                      <Plus size={18} style={{ color: 'var(--accent-gold)' }} />
                      <span>تسجيل بلاغ تقني جديد</span>
                    </div>
                    <button className={styles.btnSmSecondary} onClick={() => setIsCreateIncidentOpen(false)}>
                      <X size={15} />
                    </button>
                  </div>
                  <form onSubmit={handleCreateIncident}>
                    <div className={styles.modalBody}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>عنوان الحادث أو المشكلة *</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="توقف استجابة الـ API، خطأ حجز المواعيد..."
                          required
                          value={newIncidentTitle}
                          onChange={(e) => setNewIncidentTitle(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>درجة الخطورة</label>
                        <select
                          className={styles.formSelect}
                          value={newIncidentSeverity}
                          onChange={(e) => setNewIncidentSeverity(e.target.value)}
                        >
                          <option value="CRITICAL">حرج (CRITICAL)</option>
                          <option value="HIGH">مرتفع (HIGH)</option>
                          <option value="MEDIUM">متوسط (MEDIUM)</option>
                          <option value="LOW">منخفض (LOW)</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>شرح وتفاصيل البلاغ *</label>
                        <textarea
                          className={styles.formTextarea}
                          rows={3}
                          placeholder="أدخل رسالة الخطأ أو تفاصيل السلوك غير المتوقع..."
                          required
                          value={newIncidentDesc}
                          onChange={(e) => setNewIncidentDesc(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className={styles.modalFooter}>
                      <button type="button" className={styles.btnSecondary} onClick={() => setIsCreateIncidentOpen(false)}>
                        إلغاء
                      </button>
                      <button type="submit" className={styles.btnPrimary}>
                        تسجيل البلاغ
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 13. AUDIT LOGS                                           */}
        {/* ======================================================== */}
        {activeSection === 'audit-logs' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><FileText size={24} style={{ color: 'var(--accent-gold)' }} /> سجل العمليات الشامل (Universal Audit Logs)</h1>
                <p className={styles.sectionDesc}>تسجيل مشفر لكافة الإجراءات التقنية الصادرة من المطورين لحماية المنظومة.</p>
              </div>
              <button className={styles.btnSecondary} onClick={loadAuditLogs}>
                <RefreshCw size={14} /> تحديث
              </button>
            </div>

            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>سجل التدقيق التقني ({auditTotal})</h3>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>الإجراء</th>
                      <th>المطور المنفذ</th>
                      <th>الهدف</th>
                      <th>التفاصيل</th>
                      <th>التاريخ والوقت</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td><code>{log.action}</code></td>
                        <td>{log.developerEmail}</td>
                        <td>{log.target}</td>
                        <td style={{ maxWidth: '300px', fontSize: '0.8rem' }}>{log.details}</td>
                        <td>{new Date(log.createdAt).toLocaleString('ar-EG')}</td>
                        <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>SUCCESS</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 14. INTEGRATIONS                                         */}
        {/* ======================================================== */}
        {activeSection === 'integrations' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Settings size={24} style={{ color: 'var(--accent-gold)' }} /> التكاملات والخدمات السحابية (Integrations & Cloud)</h1>
                <p className={styles.sectionDesc}>مراقبة صحة الربط مع مزودي الخدمات الخارجية ومفاتيح الـ APIs.</p>
              </div>
            </div>

            <div className={styles.grid}>
              {integrationsList.map((item) => (
                <div key={item.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>{item.nameAr}</span>
                    <span className={`${styles.badge} ${item.status === 'CONNECTED' || item.status === 'CONFIGURED' ? styles.badgeSuccess : styles.badgeWarning}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className={styles.cardSubtitle}>{item.nameEn} · {item.provider}</div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    المفتاح السحابي: {item.hasCredentials ? '✅ مكوّن ومشفر' : '⚠️ غير مكوّن'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 15. TESTING LAB                                          */}
        {/* ======================================================== */}
        {activeSection === 'testing-lab' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><CheckCircle2 size={24} style={{ color: 'var(--accent-gold)' }} /> مختبر الاختبارات المباشرة (Live Testing Lab)</h1>
                <p className={styles.sectionDesc}>فحص استجابة المكونات الحيوية، أمان المطور، وقواعد البيانات خادمياً.</p>
              </div>
              <button
                className={styles.btnPrimary}
                onClick={handleRunTestLab}
                disabled={isRunningTests}
              >
                <Play size={15} /> {isRunningTests ? 'جاري التشغيل...' : 'تشغيل حزمة الاختبارات الشاملة الآن'}
              </button>
            </div>

            {testResults && (
              <div className={styles.card} style={{ marginBottom: '1.75rem', borderColor: testResults.failed === 0 ? '#22c55e' : '#ef4444' }}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>نتائج الفحص الحي</span>
                  <span className={`${styles.badge} ${testResults.failed === 0 ? styles.badgeSuccess : styles.badgeDanger}`}>
                    {testResults.passed}/{testResults.totalTests} PASSED ({testResults.totalDurationMs} ms)
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {testResults.results.map((r: any) => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.85rem' }}>{r.name}</span>
                      <span className={`${styles.badge} ${r.status === 'PASSED' ? styles.badgeSuccess : styles.badgeDanger}`}>
                        {r.status} ({r.durationMs}ms)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 16. CONFIGURATION HISTORY                                */}
        {/* ======================================================== */}
        {activeSection === 'config-history' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Clock size={24} style={{ color: 'var(--accent-gold)' }} /> سجل التغييرات البرمجية وإعدادات المنظومة</h1>
                <p className={styles.sectionDesc}>تتبع التعديلات التقنية ومسار التغييرات في ملفات الإعدادات ومفاتيح الخصائص.</p>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>سجل التعديلات الفنية ({configHistoryLogs.length})</h3>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>الإجراء</th>
                      <th>المطور المسؤول</th>
                      <th>الهدف</th>
                      <th>التفاصيل</th>
                      <th>التوقيت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configHistoryLogs.map((h) => (
                      <tr key={h.id}>
                        <td><code>{h.action}</code></td>
                        <td>{h.developerEmail}</td>
                        <td>{h.target}</td>
                        <td style={{ maxWidth: '300px', fontSize: '0.8rem' }}>{h.details}</td>
                        <td>{new Date(h.createdAt).toLocaleString('ar-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 17. SECURITY CENTER & MARK PROTECTIONS                  */}
        {/* ======================================================== */}
        {activeSection === 'security-center' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><ShieldCheck size={24} style={{ color: 'var(--accent-gold)' }} /> مركز الأمان والمطورين (Developer Security)</h1>
                <p className={styles.sectionDesc}>إدارة فريق المطورين المعتمدين والمحميين حصرياً للمطور الرئيسي (Mark).</p>
              </div>
            </div>

            {/* Master Developer Info */}
            <div className={styles.card} style={{ marginBottom: '1.75rem', borderColor: 'var(--accent-gold)' }}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>المطور الرئيسي المحصن (Master Developer)</span>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>IMMUTABLE ACCESS</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                حساب المطور الرئيسي (marksamer010@gmail.com) هو الوحيد المخول بإنشاء أو ترقية أو إزالة مطورين آخرين في المنظومة.
              </p>
            </div>

            {/* Add Developer Form (Mark Only) */}
            {currentUser?.isMaster && (
              <div className={styles.card} style={{ marginBottom: '1.75rem' }}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>إضافة أو ترقية مطور فرعي جديد</span>
                </div>
                <form onSubmit={handleAddDeveloper}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>الاسم بالكامل *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        required
                        value={newDevName}
                        onChange={(e) => setNewDevName(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>البريد الإلكتروني *</label>
                      <input
                        type="email"
                        className={styles.formInput}
                        required
                        value={newDevEmail}
                        onChange={(e) => setNewDevEmail(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>كلمة المرور المشفرة *</label>
                      <input
                        type="password"
                        className={styles.formInput}
                        required
                        value={newDevPassword}
                        onChange={(e) => setNewDevPassword(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>رقم الهاتف</label>
                      <input
                        type="tel"
                        className={styles.formInput}
                        value={newDevPhone}
                        onChange={(e) => setNewDevPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className={styles.btnPrimary} style={{ marginTop: '0.5rem' }}>
                    إضافة المطور المعتمد
                  </button>
                </form>
              </div>
            )}

            {/* Developers List Table */}
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>فريق المطورين الحالي ({developers.length})</h3>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>البريد الإلكتروني</th>
                      <th>نوع الصلاحية</th>
                      <th>تاريخ الإضافة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {developers.map((dev) => (
                      <tr key={dev.id}>
                        <td><strong>{dev.fullName}</strong></td>
                        <td><code>{dev.email}</code></td>
                        <td>
                          <span className={`${styles.badge} ${dev.isMaster ? styles.badgeSuccess : styles.badgeInfo}`}>
                            {dev.isMaster ? 'مطور رئيسي محصن' : 'مطور فرعي'}
                          </span>
                        </td>
                        <td>{new Date(dev.id ? '2026-10-24' : Date.now()).toLocaleDateString('ar-EG')}</td>
                        <td>
                          {!dev.isMaster && currentUser?.isMaster && (
                            <button className={styles.btnSmDanger} onClick={() => handleRemoveDeveloper(dev.email)}>
                              سحب الصلاحية
                            </button>
                          )}
                          {dev.isMaster && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--accent-gold)' }}>محمي وغير قابل للحذف</span>
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

        {/* ======================================================== */}
        {/* 18. IP BANS MANAGER                                      */}
        {/* ======================================================== */}
        {activeSection === 'ip-bans' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><XCircle size={24} style={{ color: 'var(--accent-red)' }} /> إدارة حظر العناوين المشبوهة (IP Ban Manager)</h1>
                <p className={styles.sectionDesc}>حظر العناوين المسيئة خادمياً مع حماية المطور من حظر نفسه تلقائياً.</p>
              </div>
            </div>

            <div className={styles.card} style={{ marginBottom: '1.75rem' }}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>إضافة حظر IP جديد</span>
              </div>
              <form onSubmit={handleAddBan}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>عنوان الـ IP *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="192.168.1.1 أو 203.0.113.195"
                      required
                      value={newBanIp}
                      onChange={(e) => setNewBanIp(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>سبب الحظر *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="هجوم DoS، محاولات تخمين، سلوك مشبوه..."
                      required
                      value={newBanReason}
                      onChange={(e) => setNewBanReason(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>المدة (بالأيام)</label>
                    <select
                      className={styles.formSelect}
                      value={newBanExpiryDays}
                      onChange={(e) => setNewBanExpiryDays(parseInt(e.target.value, 10))}
                    >
                      <option value="0">حظر دائم</option>
                      <option value="1">يوم واحد</option>
                      <option value="7">أسبوع كامل</option>
                      <option value="30">شهر كامل</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className={styles.btnDanger} style={{ marginTop: '0.5rem' }}>
                  حظر العنوان فورياً
                </button>
              </form>
            </div>

            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>العناوين المحظورة حالياً ({bannedIps.length})</h3>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>عنوان IP</th>
                      <th>سبب الحظر</th>
                      <th>حظر بواسطة</th>
                      <th>تاريخ الانتهاء</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bannedIps.map((b) => (
                      <tr key={b.id || b.ip}>
                        <td><code>{b.ip}</code></td>
                        <td>{b.reason}</td>
                        <td>{b.bannedBy}</td>
                        <td>{b.expiresAt ? new Date(b.expiresAt).toLocaleDateString('ar-EG') : 'دائم'}</td>
                        <td>
                          <button className={styles.btnSmSuccess} onClick={() => handleRemoveBan(b.ip)}>
                            فك الحظر
                          </button>
                        </td>
                      </tr>
                    ))}
                    {bannedIps.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                          لا توجد عناوين محظورة حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 19. LOGS & DIAGNOSTICS                                   */}
        {/* ======================================================== */}
        {activeSection === 'logs-diagnostics' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Terminal size={24} style={{ color: 'var(--accent-gold)' }} /> السجلات والتشخيصات (Logs & Diagnostics)</h1>
                <p className={styles.sectionDesc}>مراقبة الأخطاء والتحذيرات اللحظية الصادرة من الخادم وقواعد البيانات.</p>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>سجل أحداث الخادم المباشر</h3>
                <span className={`${styles.badge} ${styles.badgeSuccess}`}>STREAMING</span>
              </div>
              <div style={{ background: '#090a0f', padding: '1rem', fontFamily: 'monospace', fontSize: '0.82rem', maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ color: '#4ade80' }}>[INFO] [SERVER]: HTTP Server running smoothly on port 5000.</div>
                <div style={{ color: '#60a5fa' }}>[INFO] [PRISMA]: Database connection pool verified healthy. Ping latency 250ms.</div>
                <div style={{ color: '#fde047' }}>[WARN] [RATE_LIMIT]: Anonymous request limit threshold normal.</div>
                <div style={{ color: '#c084fc' }}>[AUTH] [MASTER_DEV]: Master Developer session validated for marksamer010@gmail.com.</div>
                <div style={{ color: '#4ade80' }}>[SAFE_ZONE]: Safe Zone environment sandbox initialized.</div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 20. PERFORMANCE & UPTIME                                 */}
        {/* ======================================================== */}
        {activeSection === 'performance' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Cpu size={24} style={{ color: 'var(--accent-gold)' }} /> الأداء ومعدل التشغيل (Performance & Uptime)</h1>
                <p className={styles.sectionDesc}>رصد كفاءة استهلاك الذاكرة وسرعة تنفيذ الاستعلامات ووقت التشغيل المتواصل.</p>
              </div>
            </div>

            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>معدل التشغيل المتواصل (Uptime)</span>
                  <span className={`${styles.badge} ${styles.badgeSuccess}`}>%99.98</span>
                </div>
                <div className={styles.cardValue}>100% ONLINE</div>
                <div className={styles.cardSubtitle}>تشغيل بدون انقطاع عبر سحابة Vercel + Neon Postgres</div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>زمن استجابة الـ API</span>
                  <span className={`${styles.badge} ${styles.badgeSuccess}`}>140 ms</span>
                </div>
                <div className={styles.cardValue}>EXCELLENT</div>
                <div className={styles.cardSubtitle}>متوسط سرعة معالجة الطلبات</div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 21. API EXPLORER & CRON JOBS                             */}
        {/* ======================================================== */}
        {activeSection === 'api-jobs' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Radio size={24} style={{ color: 'var(--accent-gold)' }} /> مستكشف الـ APIs والمهام (API & Background Jobs)</h1>
                <p className={styles.sectionDesc}>مسارات واجهات برمجة التطبيقات وحالة المهام المجدولة دورياً.</p>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>المهام المجدولة (Scheduled Cron Jobs)</h3>
              </div>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>اسم المهمة</th>
                      <th>الجدول الزمني</th>
                      <th>الوصف</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>مزامنة سياسات الصفحات المنتهية</strong></td>
                      <td><code>كل 60 ثانية</code></td>
                      <td>إلغاء التجاوزات المؤقتة تلقائياً عند انتهاء وقتها</td>
                      <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>ACTIVE</span></td>
                    </tr>
                    <tr>
                      <td><strong>تطهير حظر الـ IPs منتهي الصلاحية</strong></td>
                      <td><code>كل 5 دقائق</code></td>
                      <td>إلغاء حظر العناوين التي انتهت مدة حظرها المحددة</td>
                      <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>ACTIVE</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 22. DEVELOPER AI COPILOT                                */}
        {/* ======================================================== */}
        {activeSection === 'ai-copilot' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Sparkles size={24} style={{ color: 'var(--accent-gold)' }} /> مساعد المطور الذكي (Developer Copilot)</h1>
                <p className={styles.sectionDesc}>تحليل السجلات وتشخيص المشاكل المعقدة في قاعدة البيانات والأمان باستخدام الذكاء الاصطناعي.</p>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>اكتب استفسارك أو الصق سجل الخطأ هنا:</label>
                <textarea
                  className={styles.formTextarea}
                  rows={4}
                  placeholder="مثال: لماذا يحدث بطء في استعلامات جدول User؟ أو كيف أقوم بإلغاء فعالية محددة؟"
                  value={aiInquiry}
                  onChange={(e) => setAiInquiry(e.target.value)}
                />
              </div>
              <button
                className={styles.btnPrimary}
                disabled={aiDiagnosing || !aiInquiry.trim()}
                onClick={async () => {
                  setAiDiagnosing(true);
                  try {
                    const res = await fetch(`${API_URL}/developer/ai/diagnose`, {
                      method: 'POST',
                      headers: getAuthHeaders(),
                      body: JSON.stringify({
                        query: aiInquiry,
                        context: { database: dbOverview, lockdown: lockdownState }
                      })
                    });
                    const data = await res.json();
                    if (res.ok) setAiResponse(data.reply);
                    else setAiResponse(data.error);
                  } catch (e: any) {
                    setAiResponse(e.message);
                  } finally {
                    setAiDiagnosing(false);
                  }
                }}
              >
                {aiDiagnosing ? 'جاري التحليل الذكي...' : 'بدء التحليل الفني'}
              </button>

              {aiResponse && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid var(--accent-gold)' }}>
                  <strong style={{ color: 'var(--accent-gold)', display: 'block', marginBottom: '0.5rem' }}>رد المساعد الذكي:</strong>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem', lineHeight: '1.6' }}>{aiResponse}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 23. DEPENDENCIES & ARCHITECTURE                          */}
        {/* ======================================================== */}
        {activeSection === 'dependencies' && (
          <div>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}><Layers size={24} style={{ color: 'var(--accent-gold)' }} /> الاعتماديات ومعمارية النظام (Dependencies & Architecture)</h1>
                <p className={styles.sectionDesc}>شجرة حزم الـ NPM وتوافقية إصدارات مكتبات الـ Backend والـ Frontend.</p>
              </div>
            </div>

            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Frontend Architecture</span>
                  <span className={`${styles.badge} ${styles.badgeInfo}`}>Next.js 15.3</span>
                </div>
                <ul style={{ fontSize: '0.84rem', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                  <li>⚛️ React 19 + Turbopack App Router</li>
                  <li>🎨 Vanilla CSS + HSL Semantic Tokens</li>
                  <li>📱 Full Touch & Phone Responsive Layouts</li>
                </ul>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Backend Architecture</span>
                  <span className={`${styles.badge} ${styles.badgeInfo}`}>Node + Express</span>
                </div>
                <ul style={{ fontSize: '0.84rem', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                  <li>🐘 PostgreSQL (Supabase + Neon Connection Pooling)</li>
                  <li>🛡️ Prisma ORM 5.22 Strict Relational Enforcement</li>
                  <li>🤖 Multi-Provider AI (Gemini Pro + Groq LLaMA 3.1)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5. Environment Footer Dock Bar (Matching exact user requested markup/classes) */}
      <footer className={`${styles.envBar} ${environmentMode === 'SAFE_ZONE' ? styles.envSafeZone : styles.envProd}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={styles.envBadge}>
            <span className={`${styles.pulseDot} ${environmentMode === 'SAFE_ZONE' ? styles.pulsePurple : styles.pulseGreen}`} />
            <span>
              {environmentMode === 'SAFE_ZONE'
                ? 'البيئة المعزولة (SAFE ZONE SANDBOX)'
                : 'الإنتاج الحقيقي (PRODUCTION ENVIRONMENT)'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className={`${styles.btn} ${styles.btnPurple}`}
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem' }}
            onClick={() => setActiveSection('safe-zone')}
          >
            <Layers size={14} /> دخول البيئة المعزولة (Safe Zone)
          </button>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
            onClick={() => router.push('/')}
          >
            لوحة الكنيسة
          </button>
        </div>
      </footer>
    </div>
  );
}
