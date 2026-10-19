'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { 
  Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Play, 
  Settings, BarChart3, Database, Shield, ExternalLink, Send, 
  Check, X, Plus, Edit2, Trash2, Image as ImageIcon, Eye, 
  HelpCircle, ToggleLeft, ToggleRight, MessageSquare
} from 'lucide-react';

interface AdminAiManagerProps {
  token: string | null;
  language: 'ar' | 'en';
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

export default function AdminAiManager({ token, language }: AdminAiManagerProps) {
  const isAr = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'faqs' | 'overview' | 'knowledge' | 'analytics' | 'playground'>('faqs');
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [analytics, setAnalytics] = useState<AiAnalytics | null>(null);
  const [faqs, setFaqs] = useState<CustomFaq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit settings form states
  const [formEnabled, setFormEnabled] = useState(true);
  const [formDefaultLang, setFormDefaultLang] = useState('ar');
  const [formEscalationPhone, setFormEscalationPhone] = useState('+20 100 000 0002');
  const [formEscalationEmail, setFormEscalationEmail] = useState('contact@church.org');

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
        setFaqs(fData);
      }
    } catch (err) {
      console.error('Error fetching AI admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

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
          escalationEmail: formEscalationEmail
        })
      });

      if (!res.ok) throw new Error('Failed to update settings');

      setStatusMsg({
        text: isAr ? 'تم حفظ إعدادات المساعد بنجاح.' : 'AI settings saved successfully.',
        type: 'success'
      });
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
          { id: 'faqs', icon: <HelpCircle size={16} />, labelAr: 'الأسئلة السريعة والصور', labelEn: 'Quick Q&A & Media' },
          { id: 'overview', icon: <Settings size={16} />, labelAr: 'المزود المزدوج والإعدادات', labelEn: 'Dual Providers & Config' },
          { id: 'knowledge', icon: <Database size={16} />, labelAr: 'مصادر المعرفة الكنسية', labelEn: 'Grounded Sources' },
          { id: 'analytics', icon: <BarChart3 size={16} />, labelAr: 'الإحصائيات والميزانية', labelEn: 'Usage & Budget' },
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
      {/* TAB 1: QUICK FAQS & MEDIA MANAGER (NEW FEATURE)            */}
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

            {(!analytics?.recentQueries || analytics.recentQueries.length === 0) ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                {isAr ? 'لا توجد سجلات استفسارات حديثة حتى الآن.' : 'No recent queries recorded yet.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analytics.recentQueries.map(q => (
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
    </div>
  );
}
