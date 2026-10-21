'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { 
  Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Play, 
  Settings, BarChart3, Database, Shield, ExternalLink, Send, 
  Check, X, Plus, Edit2, Trash2, Image as ImageIcon, Eye, 
  HelpCircle, ToggleLeft, ToggleRight, MessageSquare, Search,
  Clock, ArrowUpRight, CheckCircle, FileText, Activity, AlertCircle,
  HeartHandshake, BookOpen, Layers, Zap, UserCheck
} from 'lucide-react';
import ChatLearnerView from './ChatLearnerView';

interface AdminAiManagerProps {
  token: string | null;
  language: 'ar' | 'en';
  initialSubTab?: 'chat-learner' | 'admin-chat' | 'knowledge' | 'chat-logs' | 'evaluation-lab' | 'provider-health' | 'faqs' | 'overview' | 'playground' | 'analytics';
}

interface CustomFaq {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  imageUrl?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
}

interface AiSettings {
  primaryProvider: string;
  primaryModel: string;
  hasGeminiKey: boolean;
  maskedGeminiKey: string | null;
  fallbackProvider: string;
  fallbackModel: string;
  hasGroqKey: boolean;
  maskedGroqKey: string | null;
  maxTokens: number;
  timeoutMs: number;
  dailyBudgetLimitUSD: number;
  budgetStatus: {
    day: string;
    totalTokensToday: number;
    totalQueriesToday: number;
    estimatedCostTodayUSD: number;
    dailyBudgetLimitUSD: number;
    isExceeded: boolean;
  };
  enabled: boolean;
  defaultLanguage: string;
  escalationPhone: string;
  escalationEmail: string;
  churchNameAr: string;
  churchNameEn: string;
}

interface AiAnalytics {
  totalQueries: number;
  avgLatencyMs: number;
  estimatedTokens: number;
  feedback: {
    positive: number;
    negative: number;
    satisfactionRate: number;
  };
  recentQueries: Array<{
    id: string;
    user: string;
    query: string;
    latencyMs: number;
    provider: string;
    createdAt: string;
  }>;
  knowledgeBase: {
    massSchedules: number;
    priests: number;
    sermons: number;
    eventsAndTrips: number;
    status: string;
    lastSync: string;
  };
  budgetStatus?: {
    day: string;
    totalTokensToday: number;
    estimatedCostTodayUSD: number;
    dailyBudgetLimitUSD: number;
    isExceeded: boolean;
  };
}

export default function AdminAiManager({ token, language, initialSubTab }: AdminAiManagerProps) {
  const isAr = language === 'ar';

  type SubTabType = 'chat-learner' | 'admin-chat' | 'knowledge' | 'chat-logs' | 'support-requests' | 'evaluation-lab' | 'provider-health' | 'faqs' | 'overview' | 'playground' | 'analytics';
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>(initialSubTab || 'chat-learner');
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [analytics, setAnalytics] = useState<AiAnalytics | null>(null);
  const [faqs, setFaqs] = useState<CustomFaq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Support Requests states
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [supportFilter, setSupportFilter] = useState('ALL');
  const [supportSearch, setSupportSearch] = useState('');
  const [isLoadingSupport, setIsLoadingSupport] = useState(false);

  // AI Knowledge Chat states
  const [adminConversations, setAdminConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [adminMsgInput, setAdminMsgInput] = useState('');
  const [isAdminSending, setIsAdminSending] = useState(false);
  const [isExtractingCandidate, setIsExtractingCandidate] = useState(false);
  const [extractedFeedback, setExtractedFeedback] = useState<string | null>(null);

  // Knowledge Items Pipeline states
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([]);
  const [knowledgeFilter, setKnowledgeFilter] = useState('ALL');
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [kTitleAr, setKTitleAr] = useState('');
  const [kTitleEn, setKTitleEn] = useState('');
  const [kContentAr, setKContentAr] = useState('');
  const [kContentEn, setKContentEn] = useState('');
  const [kCategory, setKCategory] = useState('GENERAL');
  const [kStatus, setKStatus] = useState('APPROVED');

  // Evaluation Lab states
  const [evalCases, setEvalCases] = useState<any[]>([]);
  const [evalCategory, setEvalCategory] = useState('ALL');
  const [isRunningEval, setIsRunningEval] = useState(false);
  const [evalSummary, setEvalSummary] = useState<any | null>(null);

  // Provider Health states
  const [providerHealth, setProviderHealth] = useState<any | null>(null);

  // Chat Logs states
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [selectedLogConv, setSelectedLogConv] = useState<any | null>(null);

  // Edit settings form states
  const [formEnabled, setFormEnabled] = useState(true);
  const [formDefaultLang, setFormDefaultLang] = useState('ar');
  const [formEscalationPhone, setFormEscalationPhone] = useState('+20 100 000 0002');
  const [formEscalationEmail, setFormEscalationEmail] = useState('contact@church.org');
  const [formGeminiKey, setFormGeminiKey] = useState('');
  const [formGroqKey, setFormGroqKey] = useState('');
  const [formOpenaiKey, setFormOpenaiKey] = useState('');
  const [formPrimaryProvider, setFormPrimaryProvider] = useState('gemini');
  const [formFallbackProvider, setFormFallbackProvider] = useState('groq');

  // FAQ modal & form states
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqQuestionAr, setFaqQuestionAr] = useState('');
  const [faqQuestionEn, setFaqQuestionEn] = useState('');
  const [faqAnswerAr, setFaqAnswerAr] = useState('');
  const [faqAnswerEn, setFaqAnswerEn] = useState('');
  const [faqImageUrl, setFaqImageUrl] = useState('');
  const [faqCategory, setFaqCategory] = useState('عام');
  const [faqIsActive, setFaqIsActive] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Reindex state
  const [isReindexing, setIsReindexing] = useState(false);

  // Playground states
  const [testQuery, setTestQuery] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Load all data
  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [settingsRes, analyticsRes, faqsRes] = await Promise.all([
        fetch(`${API_URL}/ai/admin/settings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/ai/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/ai/admin/faqs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setSettings(sData);
        setFormEnabled(sData.enabled);
        setFormDefaultLang(sData.defaultLanguage || 'ar');
        setFormEscalationPhone(sData.escalationPhone || '');
        setFormEscalationEmail(sData.escalationEmail || '');
      }

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData);
      }

      if (faqsRes.ok) {
        const fData = await faqsRes.json();
        setFaqs(Array.isArray(fData) ? fData : (Array.isArray(fData?.faqs) ? fData.faqs : []));
      } else {
        setFaqs([]);
      }
    } catch (err) {
      console.error('Error fetching AI admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Admin Conversations
  const fetchAdminConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/ai/admin/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const convList = Array.isArray(data) ? data : (Array.isArray(data?.conversations) ? data.conversations : []);
        setAdminConversations(convList);
        if (convList.length > 0 && !activeConvId) {
          loadConversationDetails(convList[0].id);
        }
      } else {
        setAdminConversations([]);
      }
    } catch (e) {
      setAdminConversations([]);
    }
  };

  const loadConversationDetails = async (id: string) => {
    if (!token || !id) return;
    setActiveConvId(id);
    try {
      const res = await fetch(`${API_URL}/ai/admin/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConv(data);
      }
    } catch (e) {}
  };

  const handleCreateNewConversation = async () => {
    if (!token) return;
    const title = prompt(isAr ? 'أدخل عنوان المحادثة التدريبية:' : 'Enter conversation title:');
    if (!title || !title.trim()) return;

    try {
      const res = await fetch(`${API_URL}/ai/admin/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: title.trim() })
      });
      if (res.ok) {
        const newConv = await res.json();
        setAdminConversations(prev => [newConv, ...prev]);
        loadConversationDetails(newConv.id);
      }
    } catch (e) {}
  };

  const handleSendAdminMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || !activeConvId || !adminMsgInput.trim() || isAdminSending) return;

    const content = adminMsgInput.trim();
    setAdminMsgInput('');
    setIsAdminSending(true);

    try {
      const res = await fetch(`${API_URL}/ai/admin/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          language: isAr ? 'ar' : 'en'
        })
      });

      if (res.ok) {
        const result = await res.json();
        setActiveConv((prev: any) => ({
          ...prev,
          messages: [...(prev?.messages || []), result.userMessage, result.aiMessage]
        }));
      }
    } catch (e) {
      alert(isAr ? 'تعذر إرسال الرسالة.' : 'Failed to send message.');
    } finally {
      setIsAdminSending(false);
    }
  };

  const handleExtractKnowledge = async (messageId: string) => {
    if (!token || !activeConvId) return;
    setIsExtractingCandidate(true);
    setExtractedFeedback(null);

    try {
      const res = await fetch(`${API_URL}/ai/admin/conversations/${activeConvId}/extract-knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ messageId })
      });

      if (res.ok) {
        const candidate = await res.json();
        setExtractedFeedback(
          isAr 
            ? `✓ تم استخراج مرشح المعرفة بنجاح: "${candidate.titleAr}" وحفظه كمسودة للمراجعة والاعتماد!`
            : `✓ Knowledge candidate extracted: "${candidate.titleEn || candidate.titleAr}" (Saved as Draft)!`
        );
        fetchKnowledgeItems();
        setTimeout(() => setExtractedFeedback(null), 6000);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to extract knowledge.');
      }
    } catch (e) {
      alert(isAr ? 'حدث خطأ أثناء الاستخراج.' : 'Error extracting candidate.');
    } finally {
      setIsExtractingCandidate(false);
    }
  };

  // Knowledge Items Management
  const fetchKnowledgeItems = async (status = knowledgeFilter) => {
    if (!token) return;
    try {
      const url = status === 'ALL'
        ? `${API_URL}/ai/admin/knowledge`
        : `${API_URL}/ai/admin/knowledge?status=${status}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setKnowledgeItems(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
      } else {
        setKnowledgeItems([]);
      }
    } catch (e) {
      setKnowledgeItems([]);
    }
  };

  const handlePublishKnowledge = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/ai/admin/knowledge/${id}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchKnowledgeItems();
        setStatusMsg({
          text: isAr ? '✓ تم اعتماد ونشر السجل المعرفي وتحديث فهرس الـ RAG فورياً!' : '✓ Knowledge record published & RAG refreshed!',
          type: 'success'
        });
      }
    } catch (e) {}
  };

  const handleUnpublishKnowledge = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/ai/admin/knowledge/${id}/unpublish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchKnowledgeItems();
        setStatusMsg({
          text: isAr ? '✓ تم إلغاء نشر السجل وحجبه عن المساعد العام.' : '✓ Knowledge record unpublished.',
          type: 'success'
        });
      }
    } catch (e) {}
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (!token) return;
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا السجل المعرفي نهائياً؟' : 'Delete this knowledge record?')) return;
    try {
      const res = await fetch(`${API_URL}/ai/admin/knowledge/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchKnowledgeItems();
      }
    } catch (e) {}
  };

  const handleSaveKnowledgeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!kTitleAr.trim() || !kContentAr.trim()) {
      alert(isAr ? 'العنوان والمحتوى باللغة العربية مطلوبان.' : 'Arabic title and content are required.');
      return;
    }

    try {
      const method = editingKnowledgeId ? 'PUT' : 'POST';
      const url = editingKnowledgeId 
        ? `${API_URL}/ai/admin/knowledge/${editingKnowledgeId}`
        : `${API_URL}/ai/admin/knowledge`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          titleAr: kTitleAr.trim(),
          titleEn: kTitleEn.trim() || kTitleAr.trim(),
          contentAr: kContentAr.trim(),
          contentEn: kContentEn.trim() || kContentAr.trim(),
          category: kCategory,
          status: kStatus
        })
      });

      if (res.ok) {
        setIsKnowledgeModalOpen(false);
        setEditingKnowledgeId(null);
        setKTitleAr('');
        setKTitleEn('');
        setKContentAr('');
        setKContentEn('');
        fetchKnowledgeItems();
        setStatusMsg({
          text: isAr ? '✓ تم حفظ السجل المعرفي بنجاح!' : '✓ Knowledge record saved!',
          type: 'success'
        });
      }
    } catch (e) {
      alert(isAr ? 'فشل حفظ السجل.' : 'Failed to save knowledge record.');
    }
  };

  // Evaluation Lab
  const fetchEvaluationCases = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/ai/admin/evaluations`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEvalCases(Array.isArray(data) ? data : (Array.isArray(data?.cases) ? data.cases : []));
      } else {
        setEvalCases([]);
      }
    } catch (e) {
      setEvalCases([]);
    }
  };

  const handleRunEvaluation = async () => {
    if (!token || isRunningEval) return;
    setIsRunningEval(true);
    setEvalSummary(null);

    try {
      const res = await fetch(`${API_URL}/ai/admin/evaluations/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: evalCategory,
          language: isAr ? 'ar' : 'en'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEvalSummary(data);
        fetchEvaluationCases();
      }
    } catch (e) {
      alert(isAr ? 'فشل تشغيل مختبر التقييم.' : 'Failed to run evaluation.');
    } finally {
      setIsRunningEval(false);
    }
  };

  // Provider Health
  const fetchProviderHealth = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/ai/admin/providers/health`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProviderHealth(data);
      }
    } catch (e) {}
  };

  // Fetch Support Requests
  const fetchSupportRequests = async () => {
    if (!token) return;
    setIsLoadingSupport(true);
    try {
      const query = new URLSearchParams();
      if (supportFilter !== 'ALL') query.set('status', supportFilter);
      if (supportSearch.trim()) query.set('search', supportSearch.trim());

      const res = await fetch(`${API_URL}/ai/admin/support-requests?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupportRequests(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching support requests:', e);
    } finally {
      setIsLoadingSupport(false);
    }
  };

  const handleUpdateSupportStatus = async (id: string, newStatus: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/ai/admin/support-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setSupportRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        setStatusMsg({
          text: isAr ? 'تم تحديث حالة الطلب بنجاح.' : 'Request status updated successfully.',
          type: 'success'
        });
      }
    } catch (e) {
      console.error('Error updating support request:', e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAdminConversations();
    fetchKnowledgeItems();
    fetchEvaluationCases();
    fetchProviderHealth();
    fetchSupportRequests();
  }, [token]);

  useEffect(() => {
    if (activeSubTab === 'support-requests') {
      fetchSupportRequests();
    }
  }, [supportFilter, activeSubTab]);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`${API_URL}/ai/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: formEnabled,
          defaultLanguage: formDefaultLang,
          escalationPhone: formEscalationPhone,
          escalationEmail: formEscalationEmail,
          geminiApiKey: formGeminiKey ? formGeminiKey : undefined,
          groqApiKey: formGroqKey ? formGroqKey : undefined,
          openaiApiKey: formOpenaiKey ? formOpenaiKey : undefined,
          primaryProvider: formPrimaryProvider,
          fallbackProvider: formFallbackProvider
        })
      });

      if (!res.ok) throw new Error('Failed to update settings');

      setStatusMsg({
        text: isAr ? 'تم حفظ إعدادات ومفاتيح المساعد بنجاح.' : 'AI settings and keys saved successfully.',
        type: 'success'
      });
      setFormGeminiKey('');
      setFormGroqKey('');
      setFormOpenaiKey('');
      fetchData();
    } catch (err) {
      setStatusMsg({
        text: isAr ? 'فشل حفظ الإعدادات.' : 'Failed to save settings.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reindex Knowledge Base
  const handleReindex = async () => {
    if (!token) return;
    setIsReindexing(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_URL}/ai/admin/reindex`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Reindex failed');
      setStatusMsg({
        text: isAr ? 'تم تحديث وفهرسة قاعدة البيانات الكنسية بنجاح!' : 'Church knowledge base refreshed successfully!',
        type: 'success'
      });
      fetchData();
    } catch (err) {
      setStatusMsg({
        text: isAr ? 'فشل تحديث الفهرس.' : 'Failed to refresh knowledge base.',
        type: 'error'
      });
    } finally {
      setIsReindexing(false);
    }
  };

  // Open FAQ Modal for Create / Edit
  const openFaqModal = (faq?: CustomFaq) => {
    if (faq) {
      setEditingFaqId(faq.id);
      setFaqQuestionAr(faq.questionAr);
      setFaqQuestionEn(faq.questionEn || '');
      setFaqAnswerAr(faq.answerAr);
      setFaqAnswerEn(faq.answerEn || '');
      setFaqImageUrl(faq.imageUrl || '');
      setFaqCategory(faq.category || 'عام');
      setFaqIsActive(faq.isActive);
    } else {
      setEditingFaqId(null);
      setFaqQuestionAr('');
      setFaqQuestionEn('');
      setFaqAnswerAr('');
      setFaqAnswerEn('');
      setFaqImageUrl('');
      setFaqCategory('عام');
      setFaqIsActive(true);
    }
    setIsFaqModalOpen(true);
  };

  // Save or Update FAQ
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !faqQuestionAr.trim() || !faqAnswerAr.trim()) return;

    setIsSaving(true);
    setStatusMsg(null);

    const payload = {
      questionAr: faqQuestionAr.trim(),
      questionEn: faqQuestionEn.trim() || faqQuestionAr.trim(),
      answerAr: faqAnswerAr.trim(),
      answerEn: faqAnswerEn.trim() || faqAnswerAr.trim(),
      imageUrl: faqImageUrl.trim() || undefined,
      category: faqCategory.trim() || 'عام',
      isActive: faqIsActive
    };

    try {
      const url = editingFaqId ? `${API_URL}/ai/admin/faqs/${editingFaqId}` : `${API_URL}/ai/admin/faqs`;
      const method = editingFaqId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save FAQ');

      setStatusMsg({
        text: isAr
          ? (editingFaqId ? 'تم تحديث السؤال بنجاح.' : 'تمت إضافة السؤال السريع بنجاح!')
          : (editingFaqId ? 'FAQ updated successfully.' : 'Quick FAQ added successfully!'),
        type: 'success'
      });

      setIsFaqModalOpen(false);
      fetchData();
    } catch (err) {
      setStatusMsg({
        text: isAr ? 'فشل حفظ السؤال السريع.' : 'Failed to save FAQ.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle FAQ Active State
  const handleToggleFaqActive = async (faq: CustomFaq) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/ai/admin/faqs/${faq.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !faq.isActive })
      });
      if (res.ok) {
        setFaqs(prev => prev.map(f => (f.id === faq.id ? { ...f, isActive: !f.isActive } : f)));
      }
    } catch (err) {
      console.error('Error toggling FAQ:', err);
    }
  };

  // Delete FAQ
  const handleDeleteFaq = async (id: string) => {
    if (!token) return;
    const confirmMsg = isAr ? 'هل أنت متأكد من حذف هذا السؤال السريع؟' : 'Are you sure you want to delete this FAQ?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_URL}/ai/admin/faqs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFaqs(prev => prev.filter(f => f.id !== id));
        setStatusMsg({
          text: isAr ? 'تم حذف السؤال بنجاح.' : 'FAQ deleted successfully.',
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Error deleting FAQ:', err);
    }
  };

  // Run Test in Playground
  const handleRunTest = async (queryText?: string) => {
    const q = (queryText || testQuery).trim();
    if (!q || !token) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`${API_URL}/ai/admin/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          query: q,
          language: isAr ? 'ar' : 'en'
        })
      });

      if (!res.ok) throw new Error('Test request failed');
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        response: isAr ? 'حدث خطأ أثناء إجراء الاختبار.' : 'Error executing test query.',
        latencyMs: 0,
        tokensUsed: 0
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-ai-subtabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 10px;
          padding-top: 2px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          touch-action: pan-x;
        }
        .admin-ai-subtabs::-webkit-scrollbar {
          display: none;
        }
        .admin-ai-subtab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          min-height: 40px;
          transition: all 0.2s ease;
          user-select: none;
        }
        .admin-ai-subtab-btn:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #ffffff;
        }
        .admin-ai-subtab-btn-active {
          background: var(--accent-gold) !important;
          color: #000000 !important;
          border-color: var(--accent-gold) !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 14px rgba(226, 183, 20, 0.25);
        }
        @media (max-width: 768px) {
          .admin-ai-subtabs {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: visible !important;
            white-space: normal !important;
            padding-bottom: 6px;
          }
          .admin-ai-subtab-btn {
            width: 100% !important;
            min-width: 0 !important;
            padding: 8px 6px !important;
            font-size: 0.74rem !important;
            text-align: center !important;
            white-space: normal !important;
            word-break: break-word !important;
            line-height: 1.25 !important;
            min-height: 44px !important;
            display: flex !important;
            align-items: center !important;
            justifyContent: center !important;
            box-sizing: border-box !important;
            flex-shrink: 1 !important;
          }
          .admin-ai-subtab-btn:last-child {
            grid-column: span 2 !important;
          }
          .admin-chat-grid-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />

      {/* 1. Header Bar (Fully Mobile Responsive) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h2
            style={{
              fontSize: '1.25rem',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: 0,
              lineHeight: 1.3
            }}
          >
            <Sparkles size={22} style={{ flexShrink: 0 }} />
            <span>{isAr ? 'إدارة المساعد الذكي الكنسي' : 'Church AI Assistant'}</span>
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              marginTop: '4px',
              margin: 0,
              lineHeight: 1.4
            }}
          >
            {isAr
              ? 'إدارة الأسئلة السريعة والصور، ومراقبة الـ RAG والمزود المزدوج'
              : 'Manage Quick Q&A, media, RAG sources, and dual AI providers'}
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(226, 183, 20, 0.12)',
            border: '1px solid rgba(226, 183, 20, 0.35)',
            color: 'var(--accent-gold)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '42px',
            touchAction: 'manipulation'
          }}
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>{isAr ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {/* Status Feedback Banner */}
      {statusMsg && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: statusMsg.type === 'success' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
            border: `1px solid ${statusMsg.type === 'success' ? '#2ecc71' : '#e74c3c'}`,
            color: statusMsg.type === 'success' ? '#2ecc71' : '#e74c3c',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {statusMsg.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 2. Sub-Tabs Navigation (Fully responsive on Mobile and Desktop) */}
      <div className="admin-ai-subtabs">
        {[
          { id: 'chat-learner', icon: <Sparkles size={16} />, labelAr: 'مدرّب الذكاء ومراقبة الجودة (Learner)', labelEn: 'Chat Learner & QA Engine' },
          { id: 'admin-chat', icon: <MessageSquare size={16} />, labelAr: 'محادثة وتدريب المعرفة', labelEn: 'AI Knowledge Chat' },
          { id: 'knowledge', icon: <Database size={16} />, labelAr: 'مصادر المعرفة وسجلات الـ RAG', labelEn: 'Knowledge Pipeline' },
          { id: 'chat-logs', icon: <FileText size={16} />, labelAr: 'سجلات المحادثات والمنشأ', labelEn: 'Chat Logs & Provenance' },
          { id: 'support-requests', icon: <HeartHandshake size={16} />, labelAr: 'طلبات المساعدة والرعاية', labelEn: 'Support Requests' },
          { id: 'evaluation-lab', icon: <Shield size={16} />, labelAr: 'مختبر التقييم الآلي', labelEn: 'Evaluation Lab' },
          { id: 'provider-health', icon: <BarChart3 size={16} />, labelAr: 'صحة المزودين والميزانية', labelEn: 'Provider Health' },
          { id: 'faqs', icon: <HelpCircle size={16} />, labelAr: 'الأسئلة السريعة والصور', labelEn: 'Quick Q&A & Media' },
          { id: 'overview', icon: <Settings size={16} />, labelAr: 'المزود المزدوج والإعدادات', labelEn: 'Dual Providers & Config' },
          { id: 'playground', icon: <Play size={16} />, labelAr: 'ميدان التجربة (Playground)', labelEn: 'Playground' }
        ].map(tab => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-ai-subtab-btn ${isActive ? 'admin-ai-subtab-btn-active' : ''}`}
              onClick={() => setActiveSubTab(tab.id as any)}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
              <span>{isAr ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* SUBTAB: CHAT LEARNER & QUALITY TRAINER (USER MASTER GOAL) */}
      {/* ========================================================= */}
      {activeSubTab === 'chat-learner' && (
        <ChatLearnerView token={token} language={language} />
      )}

      {/* ========================================================= */}
      {/* SUBTAB: AI KNOWLEDGE CHAT (NEW MASTER FEATURE)            */}
      {/* ========================================================= */}
      {activeSubTab === 'admin-chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {extractedFeedback && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(46, 204, 113, 0.15)',
                border: '1px solid #2ecc71',
                color: '#2ecc71',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle size={18} />
              <span>{extractedFeedback}</span>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 320px) 1fr',
              gap: '16px',
              minHeight: '600px',
              borderRadius: '14px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden'
            }}
            className="admin-chat-grid-container"
          >
            {/* Sidebar: Conversation List */}
            <div
              style={{
                borderInlineEnd: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'rgba(0, 0, 0, 0.1)'
              }}
            >
              <div
                style={{
                  padding: '14px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={18} style={{ color: 'var(--accent-gold)' }} />
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {isAr ? 'محادثات المعرفة' : 'Knowledge Chats'}
                  </strong>
                </div>
                <button
                  onClick={handleCreateNewConversation}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#000',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                  <span>{isAr ? 'جديدة' : 'New'}</span>
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(!Array.isArray(adminConversations) || adminConversations.length === 0) ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '20px 0' }}>
                    {isAr ? 'لا توجد محادثات سابقة. انقر فوق "جديدة" للبدء.' : 'No conversations. Click "New" to start.'}
                  </p>
                ) : (
                  (Array.isArray(adminConversations) ? adminConversations : []).map(c => {
                    const isSelected = activeConvId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => loadConversationDetails(c.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? 'rgba(226, 183, 20, 0.15)' : 'transparent',
                          border: isSelected ? '1px solid var(--accent-gold)' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <strong style={{ fontSize: '0.84rem', color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)', display: 'block' }}>
                          {c.title}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                          <span>{c._count?.messages || c.messages?.length || 0} {isAr ? 'رسائل' : 'msgs'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Transcript Area */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {activeConv ? (
                <>
                  {/* Active Header */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: 'rgba(226, 183, 20, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {activeConv.title}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {isAr ? 'محادثة خاصة للإدارة والتدريب الكنسي • محفوظة في قاعدة البيانات' : 'Private admin knowledge chat • Persisted in DB'}
                      </span>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {(!Array.isArray(activeConv?.messages) || activeConv.messages.length === 0) ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 'auto' }}>
                        {isAr ? 'اكتب معلوماتك الكنسية أو ناقش السياسات مع المساعد ليتم استخراج المعرفة منها.' : 'Start chatting to teach and extract church knowledge.'}
                      </p>
                    ) : (
                      (Array.isArray(activeConv?.messages) ? activeConv.messages : []).map((m: any) => {
                        const isAdmin = m.senderType === 'ADMIN';
                        return (
                          <div
                            key={m.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isAdmin ? 'flex-start' : 'flex-end',
                              maxWidth: '85%',
                              alignSelf: isAdmin ? 'flex-start' : 'flex-end'
                            }}
                          >
                            <div
                              style={{
                                padding: '12px 16px',
                                borderRadius: isAdmin ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                                backgroundColor: isAdmin ? 'var(--bg-card)' : 'rgba(226, 183, 20, 0.12)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                fontSize: '0.88rem',
                                lineHeight: 1.5
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: 600, color: isAdmin ? 'var(--accent-gold)' : '#2ecc71' }}>
                                  {isAdmin ? (isAr ? '👤 المسؤول (Admin)' : '👤 Administrator') : (isAr ? '🤖 مساعد الكنيسة (AI)' : '🤖 Church AI')}
                                </span>
                                <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>

                              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.content}</p>

                              {/* Knowledge Extraction Button */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                  {m.provider ? `⚡ ${m.provider} (${m.tokensUsed || 0} tokens)` : ''}
                                </span>

                                <button
                                  onClick={() => handleExtractKnowledge(m.id)}
                                  disabled={isExtractingCandidate}
                                  title={isAr ? 'استخراج هذه المعلومة كمرشح معرفة معتمد للمساعد العام' : 'Extract this as knowledge candidate'}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(226, 183, 20, 0.18)',
                                    border: '1px solid var(--accent-gold)',
                                    color: 'var(--accent-gold)',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Sparkles size={11} />
                                  <span>{isAr ? 'استخراج كمرشح معرفة' : 'Extract Knowledge'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input Bar */}
                  <form
                    onSubmit={handleSendAdminMessage}
                    style={{
                      padding: '12px 14px',
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      gap: '8px',
                      backgroundColor: 'var(--bg-secondary)'
                    }}
                  >
                    <input
                      type="text"
                      value={adminMsgInput}
                      onChange={e => setAdminMsgInput(e.target.value)}
                      placeholder={isAr ? 'اكتب للمساعد الكنسي (مثال: مواعيد مدارس الأحد تم تعديلها لتصبح...)' : 'Type message to teach church assistant...'}
                      disabled={isAdminSending}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!adminMsgInput.trim() || isAdminSending}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--accent-gold)',
                        color: '#000',
                        fontWeight: 700,
                        border: 'none',
                        cursor: adminMsgInput.trim() && !isAdminSending ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Send size={15} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
                      <span>{isAr ? 'إرسال' : 'Send'}</span>
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ margin: 'auto', textAlign: 'center', padding: '40px' }}>
                  <MessageSquare size={36} style={{ color: 'var(--accent-gold)', opacity: 0.5, marginBottom: '10px' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {isAr ? 'اختر محادثة من القائمة أو أنشئ محادثة جديدة للبدء.' : 'Select a conversation or create a new one to begin.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB: CHAT LOGS & PROVENANCE                            */}
      {/* ========================================================= */}
      {activeSubTab === 'chat-logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: 'var(--accent-gold)' }} />
                {isAr ? 'سجلات محادثات الإدارة والمنشأ المعرفي (Chat Logs)' : 'Admin Chat Logs & Provenance'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {isAr ? 'مراجعة وتدقيق كامل المحادثات الإدارية والمصادر المستخرجة منها.' : 'Audit complete admin chat transcripts and trace derived knowledge.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
              <Search size={16} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={logSearchQuery}
                onChange={e => setLogSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث في السجلات...' : 'Search logs...'}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Conversations Table */}
          <div style={{ borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0, 0, 0, 0.1)', textAlign: isAr ? 'right' : 'left' }}>
                  <th style={{ padding: '12px' }}>{isAr ? 'عنوان المحادثة' : 'Title'}</th>
                  <th style={{ padding: '12px' }}>{isAr ? 'عدد الرسائل' : 'Messages'}</th>
                  <th style={{ padding: '12px' }}>{isAr ? 'تاريخ الإنشاء' : 'Created'}</th>
                  <th style={{ padding: '12px' }}>{isAr ? 'الحالة' : 'Status'}</th>
                  <th style={{ padding: '12px' }}>{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(adminConversations) ? adminConversations : [])
                  .filter(c => !logSearchQuery || (c.title && c.title.toLowerCase().includes(logSearchQuery.toLowerCase())))
                  .map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.title}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        {c._count?.messages || c.messages?.length || 0}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', fontSize: '0.72rem', fontWeight: 700 }}>
                          {c.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => {
                            setActiveSubTab('admin-chat');
                            loadConversationDetails(c.id);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(226, 183, 20, 0.15)',
                            border: '1px solid var(--accent-gold)',
                            color: 'var(--accent-gold)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? 'عرض المحادثة' : 'Open'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB: SUPPORT REQUESTS & PASTORAL CARE TICKETS          */}
      {/* ========================================================= */}
      {activeSubTab === 'support-requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header & Controls */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HeartHandshake size={18} style={{ color: 'var(--accent-gold)' }} />
                {isAr ? 'طلبات المساعدة والرعاية الكنسية (Support Requests)' : 'Pastoral & Support Requests'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {isAr
                  ? 'هنا تصل جميع طلبات التواصل والرعاية والمساعدة التي يرسلها الأعضاء أو الزوار عبر المساعد الذكي مع أرقام المتابعة المرجعية.'
                  : 'Manage all help, pastoral care, and support requests submitted by visitors and members through the AI.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={supportSearch}
                onChange={e => setSupportSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchSupportRequests()}
                placeholder={isAr ? 'بحث بالاسم، الهاتف، أو رقم المرجع...' : 'Search by name, phone, or #REQ...'}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  minWidth: '220px'
                }}
              />

              <select
                value={supportFilter}
                onChange={e => setSupportFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem'
                }}
              >
                <option value="ALL">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="PENDING">{isAr ? '⏳ قيد الانتظار (Pending)' : 'Pending'}</option>
                <option value="IN_PROGRESS">{isAr ? '🔄 قيد المتابعة (In Progress)' : 'In Progress'}</option>
                <option value="RESOLVED">{isAr ? '✅ تم الحل والتواصل (Resolved)' : 'Resolved'}</option>
                <option value="CANCELLED">{isAr ? '❌ ملغي (Cancelled)' : 'Cancelled'}</option>
              </select>

              <button
                onClick={fetchSupportRequests}
                disabled={isLoadingSupport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(226, 183, 20, 0.15)',
                  border: '1px solid rgba(226, 183, 20, 0.35)',
                  color: 'var(--accent-gold)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} className={isLoadingSupport ? 'animate-spin' : ''} />
                <span>{isAr ? 'تحديث' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Requests List */}
          {isLoadingSupport ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block' }} />
              <span>{isAr ? 'جاري تحميل طلبات الدعم والرعاية...' : 'Loading support requests...'}</span>
            </div>
          ) : supportRequests.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <HeartHandshake size={36} style={{ color: 'var(--accent-gold)', opacity: 0.7, margin: '0 auto 10px', display: 'block' }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {isAr ? 'لا توجد طلبات مساعدة مسجلة تطابق معايير البحث.' : 'No support requests found.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {supportRequests.map((req: any) => {
                const isProgress = req.status === 'IN_PROGRESS';
                const isResolved = req.status === 'RESOLVED';
                const isCancelled = req.status === 'CANCELLED';

                const statusBg = isResolved ? 'rgba(46, 204, 113, 0.15)' : isProgress ? 'rgba(52, 152, 219, 0.15)' : isCancelled ? 'rgba(231, 76, 60, 0.15)' : 'rgba(243, 156, 18, 0.15)';
                const statusColor = isResolved ? '#2ecc71' : isProgress ? '#3498db' : isCancelled ? '#e74c3c' : '#f39c12';
                const statusText = isResolved ? (isAr ? 'تم الحل والتواصل' : 'Resolved') : isProgress ? (isAr ? 'قيد المتابعة' : 'In Progress') : isCancelled ? (isAr ? 'ملغي' : 'Cancelled') : (isAr ? 'قيد الانتظار' : 'Pending');

                return (
                  <div
                    key={req.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Top Row: Ref code, applicant, status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(226, 183, 20, 0.15)',
                            border: '1px solid rgba(226, 183, 20, 0.35)',
                            color: 'var(--accent-gold)',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            letterSpacing: '0.5px'
                          }}
                        >
                          #{req.referenceCode}
                        </span>

                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {req.name}
                        </span>

                        <a
                          href={`tel:${req.phone}`}
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--accent-gold)',
                            textDecoration: 'none',
                            backgroundColor: 'var(--bg-card)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          📞 {req.phone}
                        </a>

                        {req.email && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            ✉️ {req.email}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            backgroundColor: statusBg,
                            color: statusColor,
                            fontSize: '0.76rem',
                            fontWeight: 700
                          }}
                        >
                          {statusText}
                        </span>

                        <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          {new Date(req.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Message content */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.88rem',
                        lineHeight: 1.5,
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {req.message}
                    </div>

                    {/* Bottom Row: Category badge & Status quick actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {isAr ? 'التصنيف:' : 'Category:'} <strong>{req.category || 'عام (GENERAL)'}</strong>
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {isAr ? 'تغيير الحالة:' : 'Set Status:'}
                        </span>

                        <button
                          onClick={() => handleUpdateSupportStatus(req.id, 'IN_PROGRESS')}
                          disabled={req.status === 'IN_PROGRESS'}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #3498db',
                            backgroundColor: req.status === 'IN_PROGRESS' ? '#3498db' : 'transparent',
                            color: req.status === 'IN_PROGRESS' ? '#fff' : '#3498db',
                            fontSize: '0.74rem',
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? 'قيد المتابعة' : 'In Progress'}
                        </button>

                        <button
                          onClick={() => handleUpdateSupportStatus(req.id, 'RESOLVED')}
                          disabled={req.status === 'RESOLVED'}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #2ecc71',
                            backgroundColor: req.status === 'RESOLVED' ? '#2ecc71' : 'transparent',
                            color: req.status === 'RESOLVED' ? '#fff' : '#2ecc71',
                            fontSize: '0.74rem',
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? 'تم الحل والتواصل' : 'Resolved'}
                        </button>

                        <button
                          onClick={() => handleUpdateSupportStatus(req.id, 'CANCELLED')}
                          disabled={req.status === 'CANCELLED'}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #e74c3c',
                            backgroundColor: req.status === 'CANCELLED' ? '#e74c3c' : 'transparent',
                            color: req.status === 'CANCELLED' ? '#fff' : '#e74c3c',
                            fontSize: '0.74rem',
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB: AI EVALUATION LAB                                 */}
      {/* ========================================================= */}
      {activeSubTab === 'evaluation-lab' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} style={{ color: 'var(--accent-gold)' }} />
                {isAr ? 'مختبر التقييم الآلي وفحص الأمان الكنسي (Evaluation Lab)' : 'AI Evaluation & Safety Lab'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {isAr ? 'اختبار جودة الإجابات، طقس الاعتراف، مقاومة الاختراق، واللهجة المصرية.' : 'Test answer quality, sacrament privacy, injection defense, and Egyptian Arabic.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={evalCategory}
                onChange={e => setEvalCategory(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              >
                <option value="ALL">{isAr ? 'كل الفئات' : 'All Categories'}</option>
                <option value="SCHEDULE">{isAr ? 'القداسات' : 'Schedules'}</option>
                <option value="CLERGY">{isAr ? 'الكهنة' : 'Clergy'}</option>
                <option value="SACRAMENT">{isAr ? 'سر الاعتراف' : 'Sacraments'}</option>
                <option value="SECURITY">{isAr ? 'الأمان والاختراق' : 'Security'}</option>
                <option value="EVENTS">{isAr ? 'الرحلات' : 'Events'}</option>
                <option value="BILINGUAL_EGY">{isAr ? 'اللهجة المصرية' : 'Egyptian Arabic'}</option>
                <option value="DONATIONS">{isAr ? 'التبرعات' : 'Donations'}</option>
              </select>

              <button
                onClick={handleRunEvaluation}
                disabled={isRunningEval}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  border: 'none',
                  cursor: isRunningEval ? 'not-allowed' : 'pointer'
                }}
              >
                <Play size={14} className={isRunningEval ? 'animate-spin' : ''} />
                <span>{isRunningEval ? (isAr ? 'جاري الفحص...' : 'Running...') : (isAr ? 'تشغيل حزمة الاختبار' : 'Run Suite')}</span>
              </button>
            </div>
          </div>

          {/* Evaluation Results Summary Card */}
          {evalSummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'نسبة النجاح' : 'Pass Rate'}</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: evalSummary.passRate >= 80 ? '#2ecc71' : '#e74c3c', marginTop: '4px' }}>
                  {evalSummary.passRate}%
                </div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'الحالات الناجحة' : 'Passed'}</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {evalSummary.passed} / {evalSummary.total}
                </div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'متوسط السرعة' : 'Avg Latency'}</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                  {evalSummary.avgLatencyMs} ms
                </div>
              </div>
            </div>
          )}

          {/* Evaluation Cases List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(Array.isArray(evalCases) ? evalCases : []).map((c: any) => (
              <div
                key={c.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(226, 183, 20, 0.15)', color: 'var(--accent-gold)', fontSize: '0.72rem', fontWeight: 700 }}>
                      {c.category}
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.title}</strong>
                  </div>
                  {c.lastPassed !== null && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: c.lastPassed ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                        color: c.lastPassed ? '#2ecc71' : '#e74c3c',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {c.lastPassed ? '✓ PASS' : '✗ FAIL'} ({c.lastScore}%)
                    </span>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  💬 <strong>{isAr ? 'السؤال التجريبي:' : 'Prompt:'}</strong> {isAr ? c.promptAr : c.promptEn}
                </p>

                {c.lastActualOutput && (
                  <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <strong>{isAr ? 'آخر إجابة من المساعد:' : 'Last AI Output:'} </strong>
                    <span>{c.lastActualOutput}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB: PROVIDER HEALTH & COST INTELLIGENCE               */}
      {/* ========================================================= */}
      {activeSubTab === 'provider-health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: 'var(--accent-gold)' }} />
              {isAr ? 'صحة المزودين والتحويل التلقائي والميزانية' : 'AI Provider Health, Failover & Budget'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {isAr ? 'مراقبة 4 مزودي ذكاء اصطناعي (Gemini, Groq, OpenAI, DeepSeek) مع الحوكمة المالية وحظر تجاوز الميزانية.' : 'Real-time observability across 4 providers with budget enforcement and circuit breaker metrics.'}
            </p>
          </div>

          {/* 4 Providers Status Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {(providerHealth?.providers || [
              { name: 'gemini', status: 'HEALTHY', requests: 12, successes: 12, failures: 0, successRate: 100, avgLatencyMs: 380 },
              { name: 'groq', status: 'HEALTHY', requests: 8, successes: 8, failures: 0, successRate: 100, avgLatencyMs: 240 },
              { name: 'openai', status: 'STANDBY', requests: 0, successes: 0, failures: 0, successRate: 100, avgLatencyMs: 0 },
              { name: 'deepseek', status: 'STANDBY', requests: 0, successes: 0, failures: 0, successRate: 100, avgLatencyMs: 0 }
            ]).map((p: any) => (
              <div
                key={p.name}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
                    {p.name}
                  </strong>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: p.status === 'HEALTHY' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                      color: p.status === 'HEALTHY' ? '#2ecc71' : '#e74c3c',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}
                  >
                    {p.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>{isAr ? 'الطلبات:' : 'Requests:'} <strong style={{ color: 'var(--text-primary)' }}>{p.requests}</strong></div>
                  <div>{isAr ? 'النجاح:' : 'Success Rate:'} <strong style={{ color: '#2ecc71' }}>{p.successRate}%</strong></div>
                  <div>{isAr ? 'متوسط السرعة:' : 'Avg Latency:'} <strong style={{ color: 'var(--accent-gold)' }}>{p.avgLatencyMs} ms</strong></div>
                </div>
              </div>
            ))}
          </div>

          {/* Failovers & Budget */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'التحويلات التلقائية اليوم (Failovers)' : 'Failovers Today'}</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {providerHealth?.failoversToday ?? 0}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                {isAr ? 'يتم التبديل التلقائي إذا تجاوز المزود المهلة أو فشل الاتصال.' : 'Automatic fallback engages when primary provider times out.'}
              </p>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'الحد الأقصى للإنفاق اليومي' : 'Daily Spending Limit'}</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2ecc71', marginTop: '4px' }}>
                ${settings?.dailyBudgetLimitUSD ?? 10.00} USD
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                {isAr ? 'يتم حظر الطلبات الخارجية فور الوصول للحد لحماية التكاليف والاعتماد على الـ RAG المحلي.' : 'Hard ceiling prevents cloud cost overruns; falls back to local church engine.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: QUICK FAQS & MEDIA MANAGER                         */}
      {/* ========================================================= */}
      {activeSubTab === 'faqs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top action card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={18} style={{ color: 'var(--accent-gold)' }} />
                {isAr ? 'الأسئلة السريعة والإجابات المعتمدة مع الصور' : 'Quick Q&A & Media Knowledge'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', margin: 0 }}>
                {isAr
                  ? 'أضف أسئلة متكررة وإجابات رسمية محددة، ويمكنك تضمين روابط صور توضيحية تظهر للمستخدم مباشرة بالشات.'
                  : 'Add frequent questions with verified answers and optional images that render inside the chat bubble.'}
              </p>
            </div>

            <button
              onClick={() => openFaqModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                minHeight: '42px',
                touchAction: 'manipulation'
              }}
            >
              <Plus size={16} />
              <span>{isAr ? 'إضافة سؤال جديد +' : 'Add New FAQ +'}</span>
            </button>
          </div>

          {/* FAQs List Cards (Mobile Optimized) */}
          {faqs.length === 0 ? (
            <div
              style={{
                padding: '30px 20px',
                textAlign: 'center',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-secondary)'
              }}
            >
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {isAr ? 'لا توجد أسئلة سريعة مضافة بعد. اضغط "إضافة سؤال جديد" للبدء.' : 'No FAQs added yet. Click "Add New FAQ" to create one.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
              {faqs.map(faq => (
                <div
                  key={faq.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative'
                  }}
                >
                  {/* Category & Status Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(226, 183, 20, 0.15)',
                        color: 'var(--accent-gold)',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}
                    >
                      {faq.category || 'عام'}
                    </span>

                    <button
                      onClick={() => handleToggleFaqActive(faq)}
                      title={faq.isActive ? (isAr ? 'مفعل (اضغط للتعطيل)' : 'Active') : (isAr ? 'معطل (اضغط للتفعيل)' : 'Inactive')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: faq.isActive ? '#2ecc71' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem'
                      }}
                    >
                      {faq.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      <span>{faq.isActive ? (isAr ? 'مفعل' : 'Active') : (isAr ? 'معطل' : 'Off')}</span>
                    </button>
                  </div>

                  {/* Question */}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: 700 }}>
                      ❓ {isAr ? faq.questionAr : faq.questionEn}
                    </h4>
                    {faq.questionEn && isAr && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                        {faq.questionEn}
                      </span>
                    )}
                  </div>

                  {/* Answer */}
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      backgroundColor: 'var(--bg-card)',
                      padding: '10px',
                      borderRadius: '8px'
                    }}
                  >
                    {isAr ? faq.answerAr : faq.answerEn}
                  </div>

                  {/* Optional Image Thumbnail Preview */}
                  {faq.imageUrl && (
                    <div
                      style={{
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        maxHeight: '140px',
                        position: 'relative'
                      }}
                    >
                      <img
                        src={faq.imageUrl}
                        alt="FAQ"
                        style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          [isAr ? 'left' : 'right']: '4px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          fontSize: '0.65rem'
                        }}
                      >
                        📷 {isAr ? 'صورة مرفقة' : 'Media'}
                      </span>
                    </div>
                  )}

                  {/* Action buttons (Edit & Delete) */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => openFaqModal(faq)}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(226, 183, 20, 0.1)',
                        border: '1px solid rgba(226, 183, 20, 0.3)',
                        color: 'var(--accent-gold)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        minHeight: '36px'
                      }}
                    >
                      <Edit2 size={13} />
                      <span>{isAr ? 'تعديل' : 'Edit'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteFaq(faq.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        border: '1px solid rgba(231, 76, 60, 0.3)',
                        color: '#e74c3c',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        minHeight: '36px'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: OVERVIEW & DUAL PROVIDER CONFIGURATION             */}
      {/* ========================================================= */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Card: Dual Providers & Budget Governance */}
          <div
            style={{
              padding: '18px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} style={{ color: 'var(--accent-gold)' }} />
              {isAr ? 'المزود المزدوج وإدارة الميزانية' : 'Dual Providers & Budget Governance'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              {/* Primary Provider: Gemini */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                    ⭐ {isAr ? 'المزود الأساسي: Google Gemini' : 'Primary: Google Gemini'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: settings?.hasGeminiKey ? '#2ecc71' : '#e67e22', fontWeight: 600 }}>
                    {settings?.hasGeminiKey ? (settings.maskedGeminiKey || 'مفعل') : (isAr ? 'مفتاح غير مدخل' : 'Key missing')}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {isAr ? 'النموذج:' : 'Model:'} <strong>{settings?.primaryModel || 'gemini-1.5-flash'}</strong>
                </div>
              </div>

              {/* Fallback Provider: Groq */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    🔄 {isAr ? 'المزود الاحتياطي: Groq (Failover)' : 'Fallback: Groq (Failover)'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: settings?.hasGroqKey ? '#2ecc71' : '#e67e22', fontWeight: 600 }}>
                    {settings?.hasGroqKey ? (settings.maskedGroqKey || 'مفعل') : (isAr ? 'اختياري (غير مدخل)' : 'Optional (Not set)')}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {isAr ? 'النموذج:' : 'Model:'} <strong>{settings?.fallbackModel || 'llama-3.1-8b-instant'}</strong>
                </div>
              </div>

              {/* Shared Daily Budget Control */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'حد الميزانية اليومية المشتركة:' : 'Shared Daily Budget Limit:'}</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>${settings?.dailyBudgetLimitUSD?.toFixed(2) || '10.00'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'الاستهلاك المقدر اليوم:' : 'Estimated Today:'}</span>
                  <span style={{ color: settings?.budgetStatus?.isExceeded ? '#e74c3c' : '#2ecc71', fontWeight: 600 }}>
                    ${settings?.budgetStatus?.estimatedCostTodayUSD?.toFixed(4) || '0.0000'} ({settings?.budgetStatus?.totalTokensToday || 0} tokens)
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'أقصى حد للرموز (Max Tokens):' : 'Max Output Tokens:'}</span>
                <span>{settings?.maxTokens || 1024} tokens</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'مهلة الطلب القصوى:' : 'Request Timeout:'}</span>
                <span>{((settings?.timeoutMs || 25000) / 1000)} ثانية</span>
              </div>
            </div>
          </div>

          {/* Form: Configurable Settings */}
          <form
            onSubmit={handleSaveSettings}
            style={{
              padding: '18px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
              {isAr ? 'خيارات التشغيل والتحكم' : 'Assistant Operational Settings'}
            </h3>

            {/* Enable toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.88rem', display: 'block' }}>
                  {isAr ? 'تفعيل المساعد لزوار الموقع' : 'Enable Assistant for Website Visitors'}
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {isAr ? 'عند التعطيل، يختفي الزر العائم عن العامة' : 'When disabled, floating widget is hidden'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={formEnabled}
                onChange={e => setFormEnabled(e.target.checked)}
                style={{ width: '22px', height: '22px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
              />
            </div>

            {/* Default language */}
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'اللغة الافتراضية للترحيب:' : 'Default Welcome Language:'}
              </label>
              <select
                value={formDefaultLang}
                onChange={e => setFormDefaultLang(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="ar">العربية (Arabic - Modern & Egyptian)</option>
                <option value="en">English (Ecclesiastical Terms)</option>
              </select>
            </div>

            {/* Escalation phone */}
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'هاتف الطوارئ والاستفسارات الكنسية:' : 'Escalation Emergency/Secretary Phone:'}
              </label>
              <input
                type="text"
                value={formEscalationPhone}
                onChange={e => setFormEscalationPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Escalation email */}
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'البريد الإلكتروني المعتمد للإحالة:' : 'Escalation Contact Email:'}
              </label>
              <input
                type="email"
                value={formEscalationEmail}
                onChange={e => setFormEscalationEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={16} />
                {isAr ? 'تفعيل الذكاء الاصطناعي التوليدي الحواري (مثل ChatGPT)' : 'Generative LLM Engine Configuration'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {isAr
                  ? 'عند إدخال مفتاح Gemini أو Groq، سيتفاعل المساعد مع المستخدمين بأسلوب حواري ذكي وفهم كامل للأسئلة العشوائية بناءً على معلومات الكنيسة المعتمدة، بدلاً من مجرد الردود الجافة.'
                  : 'Providing an API key enables real-time conversational understanding like ChatGPT grounded in church knowledge.'}
              </p>
            </div>

            {/* Primary Provider Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'المزود الأساسي:' : 'Primary Provider:'}
                </label>
                <select
                  value={formPrimaryProvider}
                  onChange={e => setFormPrimaryProvider(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="gemini">Google Gemini (موصى به)</option>
                  <option value="groq">Groq LLaMA 3.1 (فائق السرعة)</option>
                  <option value="openai">OpenAI GPT-4o-mini</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'المزود الاحتياطي (Failover):' : 'Fallback Provider:'}
                </label>
                <select
                  value={formFallbackProvider}
                  onChange={e => setFormFallbackProvider(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="groq">Groq LLaMA 3.1 (احتياطي سريع)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
            </div>

            {/* Google Gemini API Key */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {isAr ? 'مفتاح Google Gemini API Key:' : 'Google Gemini API Key:'}
                </label>
                {settings?.hasGeminiKey && (
                  <span style={{ fontSize: '0.72rem', color: '#2ecc71', fontWeight: 600 }}>
                    ✓ {isAr ? `مسجل (${settings.maskedGeminiKey})` : `Configured (${settings.maskedGeminiKey})`}
                  </span>
                )}
              </div>
              <input
                type="password"
                value={formGeminiKey}
                onChange={e => setFormGeminiKey(e.target.value)}
                placeholder={settings?.hasGeminiKey ? (isAr ? 'اتركه فارغاً للاحتفاظ بالمفتاح الحالي، أو الصق مفتاحاً جديداً' : 'Leave blank to keep current key') : 'AIzaSy...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Groq API Key */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {isAr ? 'مفتاح Groq API Key (بديل مجاني وسريع):' : 'Groq API Key (Fast & Free):'}
                </label>
                {settings?.hasGroqKey && (
                  <span style={{ fontSize: '0.72rem', color: '#2ecc71', fontWeight: 600 }}>
                    ✓ {isAr ? `مسجل (${settings.maskedGroqKey})` : `Configured (${settings.maskedGroqKey})`}
                  </span>
                )}
              </div>
              <input
                type="password"
                value={formGroqKey}
                onChange={e => setFormGroqKey(e.target.value)}
                placeholder={settings?.hasGroqKey ? (isAr ? 'اتركه فارغاً للاحتفاظ بالمفتاح الحالي، أو الصق مفتاحاً جديداً' : 'Leave blank to keep current key') : 'gsk_...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                marginTop: '6px',
                padding: '12px 18px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                minHeight: '44px'
              }}
            >
              {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save Changes')}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: GROUNDED KNOWLEDGE SOURCES                        */}
      {/* ========================================================= */}
      {activeSubTab === 'knowledge' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
                {isAr ? 'مستودع المعرفة وقواعد البيانات المعتمدة' : 'Authorized Grounded Knowledge Base'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', margin: 0 }}>
                {isAr
                  ? 'المساعد يعتمد فقط على الجداول الموثقة في قاعدة البيانات، ولا يخمن أو يخترع معلومات.'
                  : 'The assistant strictly references verified database records and never invents unverified data.'}
              </p>
            </div>

            <button
              onClick={handleReindex}
              disabled={isReindexing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isReindexing ? 'not-allowed' : 'pointer',
                minHeight: '42px',
                touchAction: 'manipulation'
              }}
            >
              <RefreshCw size={15} className={isReindexing ? 'animate-spin' : ''} />
              <span>{isReindexing ? (isAr ? 'جاري الفهرسة...' : 'Reindexing...') : (isAr ? 'تحديث وإعادة فهرسة المعرفة' : 'Reindex Knowledge')}</span>
            </button>
          </div>

          {/* Sources Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'القداسات الإلهية' : 'Mass Schedules'}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {analytics?.knowledgeBase.massSchedules ?? '—'}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                <CheckCircle2 size={11} /> {isAr ? 'مفهرس' : 'Indexed'}
              </span>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'الآباء والاعترافات' : 'Clergy Directory'}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {analytics?.knowledgeBase.priests ?? '—'}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                <CheckCircle2 size={11} /> {isAr ? 'مفهرس' : 'Indexed'}
              </span>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'مكتبة العظات' : 'Sermon Library'}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {analytics?.knowledgeBase.sermons ?? '—'}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                <CheckCircle2 size={11} /> {isAr ? 'مفهرس' : 'Indexed'}
              </span>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'الرحلات والمناسبات' : 'Trips & Events'}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {analytics?.knowledgeBase.eventsAndTrips ?? '—'}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                <CheckCircle2 size={11} /> {isAr ? 'مفهرس' : 'Indexed'}
              </span>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'الأسئلة السريعة (FAQ)' : 'Custom FAQs'}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {faqs.length}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                <CheckCircle2 size={11} /> {isAr ? 'محدث' : 'Synced'}
              </span>
            </div>
          </div>

          {/* Knowledge Items Pipeline Section */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={18} style={{ color: 'var(--accent-gold)' }} />
                  <span>{isAr ? 'سجلات المعرفة الكنسية المخصصة (Knowledge Records)' : 'Curated Church Knowledge Records'}</span>
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {isAr ? 'المعرفة المستخرجة من محادثات الإدارة والمعتمدة لنظام الاسترجاع العام (RAG).' : 'Verified facts extracted from admin conversations or created manually.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['ALL', 'PUBLISHED', 'APPROVED', 'DRAFT'].map(st => (
                    <button
                      key={st}
                      onClick={() => {
                        setKnowledgeFilter(st);
                        fetchKnowledgeItems(st);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: knowledgeFilter === st ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                        backgroundColor: knowledgeFilter === st ? 'rgba(226, 183, 20, 0.2)' : 'var(--bg-card)',
                        color: knowledgeFilter === st ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setEditingKnowledgeId(null);
                    setKTitleAr('');
                    setKTitleEn('');
                    setKContentAr('');
                    setKContentEn('');
                    setIsKnowledgeModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#000',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                  <span>{isAr ? 'إضافة سجل' : 'Add Item'}</span>
                </button>
              </div>
            </div>

            {/* Knowledge Items Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)', textAlign: isAr ? 'right' : 'left' }}>
                    <th style={{ padding: '10px' }}>{isAr ? 'العنوان' : 'Title'}</th>
                    <th style={{ padding: '10px' }}>{isAr ? 'الفئة' : 'Category'}</th>
                    <th style={{ padding: '10px' }}>{isAr ? 'الحالة' : 'Status'}</th>
                    <th style={{ padding: '10px' }}>{isAr ? 'المصدر' : 'Source'}</th>
                    <th style={{ padding: '10px' }}>{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(!Array.isArray(knowledgeItems) || knowledgeItems.length === 0) ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {isAr ? 'لا توجد سجلات معرفية في هذا الفلتر.' : 'No knowledge records found.'}
                      </td>
                    </tr>
                  ) : (
                    (Array.isArray(knowledgeItems) ? knowledgeItems : []).map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px' }}>
                          <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{item.titleAr}</strong>
                          {item.titleEn && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.titleEn}</span>}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(226, 183, 20, 0.1)', color: 'var(--accent-gold)', fontSize: '0.72rem' }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor:
                                item.status === 'PUBLISHED' ? 'rgba(46, 204, 113, 0.15)' :
                                item.status === 'APPROVED' ? 'rgba(52, 152, 219, 0.15)' :
                                'rgba(241, 196, 15, 0.15)',
                              color:
                                item.status === 'PUBLISHED' ? '#2ecc71' :
                                item.status === 'APPROVED' ? '#3498db' :
                                '#f1c40f',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          {item.sourceConversationId ? (
                            <span style={{ color: 'var(--accent-gold)', cursor: 'pointer' }} onClick={() => {
                              setActiveSubTab('admin-chat');
                              loadConversationDetails(item.sourceConversationId);
                            }}>
                              💬 {isAr ? 'مستخرج من محادثة' : 'From Chat'}
                            </span>
                          ) : (
                            <span>✍️ {isAr ? 'يدوي' : 'Manual'}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {item.status !== 'PUBLISHED' ? (
                              <button
                                onClick={() => handlePublishKnowledge(item.id)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#2ecc71',
                                  color: '#000',
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                {isAr ? 'اعتماد ونشر' : 'Publish'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnpublishKnowledge(item.id)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(231, 76, 60, 0.15)',
                                  color: '#e74c3c',
                                  border: '1px solid #e74c3c',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {isAr ? 'إلغاء النشر' : 'Unpublish'}
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteKnowledge(item.id)}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: USAGE ANALYTICS & RECENT LOGS                      */}
      {/* ========================================================= */}
      {activeSubTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'الأسئلة المعالجة' : 'Total Queries'}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {analytics?.totalQueries ?? 0}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'متوسط السرعة' : 'Avg Latency'}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {analytics?.avgLatencyMs ? `${analytics.avgLatencyMs} ms` : '—'}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'نسبة الرضا' : 'Satisfaction'}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2ecc71', marginTop: '4px' }}>
                {analytics?.feedback.satisfactionRate ?? 100}%
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isAr ? 'الرموز المستهلكة' : 'Tokens Used'}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {analytics?.estimatedTokens ?? 0}
              </div>
            </div>
          </div>

          {/* Recent Queries - Card Based on Phone, Table on Desktop */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <h3 style={{ fontSize: '0.98rem', color: 'var(--text-primary)', margin: 0, marginBottom: '12px' }}>
              {isAr ? 'سجل الاستفسارات الأخيرة (مع الحفاظ الكامل على الخصوصية)' : 'Recent Diagnostic Queries'}
            </h3>

            {(!Array.isArray(analytics?.recentQueries) || analytics.recentQueries.length === 0) ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                {isAr ? 'لا توجد سجلات استفسارات حديثة حتى الآن.' : 'No recent queries recorded yet.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(Array.isArray(analytics?.recentQueries) ? analytics.recentQueries : []).map(q => (
                  <div
                    key={q.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{q.user}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        ⏱️ {q.latencyMs} ms ({q.provider || 'RAG'})
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: 1.4 }}>
                      {q.query}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', alignSelf: 'flex-end' }}>
                      {new Date(q.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: TESTING PLAYGROUND                                */}
      {/* ========================================================= */}
      {activeSubTab === 'playground' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={16} style={{ color: 'var(--accent-gold)' }} />
              {isAr ? 'ميدان اختبار وتدقيق إجابات المساعد' : 'AI Testing & Validation Playground'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
              {isAr
                ? 'اختبر سرعة ودقة الإجابات المسترجعة من قاعدة البيانات أو الأسئلة السريعة المفهرسة.'
                : 'Test prompt accuracy, database sources and custom FAQs in a safe environment.'}
            </p>

            {/* Quick Prompts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                isAr ? 'إمتى القداس يوم الجمعة؟' : 'When is Friday liturgy?',
                isAr ? 'عايز أحجز موعد اعتراف' : 'How to book confession?',
                isAr ? 'ما هي مواعيد زيارة مزار الشهيد العظيم أبي سيفين؟' : 'Visiting hours for shrine?',
                isAr ? 'ما هي رحلات ومؤتمرات الكنيسة؟' : 'What trips are upcoming?',
                isAr ? 'ما هي حسابات التبرع الرسمية؟' : 'Official bank accounts'
              ].map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setTestQuery(qp);
                    handleRunTest(qp);
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(226, 183, 20, 0.08)',
                    border: '1px solid rgba(226, 183, 20, 0.25)',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    touchAction: 'manipulation'
                  }}
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleRunTest();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <input
                type="text"
                value={testQuery}
                onChange={e => setTestQuery(e.target.value)}
                placeholder={isAr ? 'اكتب سؤال الاختبار هنا...' : 'Type test query here...'}
                disabled={isTesting}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="submit"
                disabled={!testQuery.trim() || isTesting}
                style={{
                  padding: '12px 18px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#000',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: !testQuery.trim() || isTesting ? 'not-allowed' : 'pointer',
                  minHeight: '44px'
                }}
              >
                <Play size={15} />
                <span>{isTesting ? (isAr ? 'جاري الفحص...' : 'Testing...') : (isAr ? 'تشغيل الاختبار' : 'Run Test')}</span>
              </button>
            </form>
          </div>

          {/* Test Execution Result */}
          {testResult && (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--accent-gold)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
                  {isAr ? 'النتيجة المعتمدة:' : 'Execution Result:'}
                </span>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  <span>⏱️ {testResult.latencyMs} ms</span>
                  <span>🪙 {testResult.tokensUsed} tok</span>
                  <span>⚙️ {testResult.provider || 'local-rag'}</span>
                </div>
              </div>

              {/* Answer content */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-primary)'
                }}
              >
                {testResult.response}
              </div>

              {/* Retrieved sources */}
              {testResult.sources && testResult.sources.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    {isAr ? 'المصادر المسترجعة:' : 'Retrieved Sources:'}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {testResult.sources.map((s: any, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(226, 183, 20, 0.1)',
                          border: '1px solid rgba(226, 183, 20, 0.3)',
                          color: 'var(--accent-gold)',
                          fontSize: '0.74rem'
                        }}
                      >
                        {s.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT QUICK FAQ WITH IMAGE                     */}
      {/* ========================================================= */}
      {isFaqModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onClick={() => setIsFaqModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--accent-gold)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxSizing: 'border-box',
              position: 'relative',
              direction: isAr ? 'rtl' : 'ltr'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={20} />
                {editingFaqId
                  ? (isAr ? 'تعديل السؤال السريع' : 'Edit Quick FAQ')
                  : (isAr ? 'إضافة سؤال سريع جديد مع صورة' : 'Add New Quick FAQ with Image')}
              </h3>
              <button
                onClick={() => setIsFaqModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Category */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'التصنيف / القسم:' : 'Category:'}
                </label>
                <select
                  value={faqCategory}
                  onChange={e => setFaqCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="عام">عام / General</option>
                  <option value="مزارات وبركات">مزارات وبركات / Shrines</option>
                  <option value="مواعيد وصلوات">مواعيد وصلوات / Liturgy & Prayers</option>
                  <option value="مباني وقاعات">مباني وقاعات / Halls & Buildings</option>
                  <option value="خدمات وأنشطة">خدمات وأنشطة / Ministries</option>
                  <option value="رحلات ومؤتمرات">رحلات ومؤتمرات / Trips</option>
                </select>
              </div>

              {/* Question (Arabic) */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'نص السؤال بالعربية (إلزامي):' : 'Question in Arabic (Required):'}
                </label>
                <input
                  type="text"
                  required
                  value={faqQuestionAr}
                  onChange={e => setFaqQuestionAr(e.target.value)}
                  placeholder={isAr ? 'مثال: أين يقع مزار الشهيد أبي سيفين؟' : 'e.g. Where is St. Abu Sefein shrine?'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Question (English) */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'نص السؤال بالإنجليزية (اختياري):' : 'Question in English (Optional):'}
                </label>
                <input
                  type="text"
                  value={faqQuestionEn}
                  onChange={e => setFaqQuestionEn(e.target.value)}
                  placeholder="e.g. Where is the shrine located?"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Answer (Arabic) */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'نص الإجابة المعتمدة بالعربية (إلزامي):' : 'Answer in Arabic (Required):'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={faqAnswerAr}
                  onChange={e => setFaqAnswerAr(e.target.value)}
                  placeholder={isAr ? 'اكتب الإجابة الدقيقة التي سيعتمدها المساعد...' : 'Type verified answer...'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Answer (English) */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'نص الإجابة بالإنجليزية (اختياري):' : 'Answer in English (Optional):'}
                </label>
                <textarea
                  rows={2}
                  value={faqAnswerEn}
                  onChange={e => setFaqAnswerEn(e.target.value)}
                  placeholder="Type English answer..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Image URL with live preview */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'رابط الصورة التوضيحية (اختياري):' : 'Optional Image URL:'}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    value={faqImageUrl}
                    onChange={e => setFaqImageUrl(e.target.value)}
                    placeholder="https://..."
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {faqImageUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(faqImageUrl)}
                      title={isAr ? 'معاينة الصورة' : 'Preview image'}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(226, 183, 20, 0.15)',
                        border: '1px solid rgba(226, 183, 20, 0.3)',
                        color: 'var(--accent-gold)',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={16} />
                    </button>
                  )}
                </div>

                {/* Live Image Thumbnail in form */}
                {faqImageUrl && (
                  <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', maxHeight: '120px', border: '1px solid var(--border-color)' }}>
                    <img
                      src={faqImageUrl}
                      alt="Preview"
                      style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{isAr ? 'حالة التفعيل بالشات:' : 'Active in Chat:'}</span>
                <input
                  type="checkbox"
                  checked={faqIsActive}
                  onChange={e => setFaqIsActive(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                />
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#000',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    minHeight: '44px'
                  }}
                >
                  {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ السؤال السريع' : 'Save FAQ')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    minHeight: '44px'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Large Image Preview Lightbox */}
      {previewImageUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 200000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPreviewImageUrl(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={previewImageUrl} alt="Full preview" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '10px', objectFit: 'contain' }} />
            <button
              onClick={() => setPreviewImageUrl(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Knowledge Item Create / Edit Modal */}
      {isKnowledgeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setIsKnowledgeModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              direction: isAr ? 'rtl' : 'ltr'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} style={{ color: 'var(--accent-gold)' }} />
                <span>{editingKnowledgeId ? (isAr ? 'تعديل السجل المعرفي' : 'Edit Knowledge Record') : (isAr ? 'إضافة سجل معرفي جديد' : 'New Knowledge Record')}</span>
              </h3>
              <button onClick={() => setIsKnowledgeModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveKnowledgeItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  {isAr ? 'العنوان بالعربية *' : 'Arabic Title *'}
                </label>
                <input
                  type="text"
                  value={kTitleAr}
                  onChange={e => setKTitleAr(e.target.value)}
                  placeholder={isAr ? 'مثال: مواعيد مزار الشهيد أبي سيفين' : 'Arabic title...'}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  {isAr ? 'العنوان بالإنجليزية (اختياري)' : 'English Title (Optional)'}
                </label>
                <input
                  type="text"
                  value={kTitleEn}
                  onChange={e => setKTitleEn(e.target.value)}
                  placeholder="e.g. Abu Sefein Shrine Visiting Hours"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  {isAr ? 'المحتوى والحقائق الكنسية المعتمدة (بالعربية) *' : 'Knowledge Content (Arabic) *'}
                </label>
                <textarea
                  rows={4}
                  value={kContentAr}
                  onChange={e => setKContentAr(e.target.value)}
                  placeholder={isAr ? 'اكتب الحقائق الكنسية بدقة لاعتمادها في استرجاع الذكاء الاصطناعي...' : 'Verified church content in Arabic...'}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  {isAr ? 'المحتوى بالإنجليزية (اختياري)' : 'Knowledge Content (English)'}
                </label>
                <textarea
                  rows={3}
                  value={kContentEn}
                  onChange={e => setKContentEn(e.target.value)}
                  placeholder="Verified church content in English..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    {isAr ? 'الفئة الكنسية' : 'Category'}
                  </label>
                  <select
                    value={kCategory}
                    onChange={e => setKCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="GENERAL">{isAr ? 'عام' : 'General'}</option>
                    <option value="SCHEDULE">{isAr ? 'مواعيد وطقس' : 'Schedules'}</option>
                    <option value="CLERGY">{isAr ? 'كهنة وخدمات' : 'Clergy'}</option>
                    <option value="SERMON">{isAr ? 'عظات وتعاليم' : 'Sermons'}</option>
                    <option value="EVENT">{isAr ? 'مناسبات ورحلات' : 'Events & Trips'}</option>
                    <option value="DONATION">{isAr ? 'تبرعات وحسابات' : 'Donations'}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    {isAr ? 'الحالة' : 'Status'}
                  </label>
                  <select
                    value={kStatus}
                    onChange={e => setKStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="APPROVED">{isAr ? 'معتمد (APPROVED)' : 'Approved'}</option>
                    <option value="PUBLISHED">{isAr ? 'منشور للعامة (PUBLISHED)' : 'Published'}</option>
                    <option value="DRAFT">{isAr ? 'مسودة (DRAFT)' : 'Draft'}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'حفظ السجل المعرفي' : 'Save Knowledge Record'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsKnowledgeModalOpen(false)}
                  style={{
                    padding: '11px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
