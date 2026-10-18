'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { 
  Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Play, 
  Settings, BarChart3, Database, Shield, ExternalLink, Clock, Send, Check, X
} from 'lucide-react';

interface AdminAiManagerProps {
  token: string | null;
  language: 'ar' | 'en';
}

interface AiSettings {
  provider: string;
  model: string;
  hasApiKey: boolean;
  maskedApiKey: string | null;
  maxTokens: number;
  timeoutMs: number;
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
}

export default function AdminAiManager({ token, language }: AdminAiManagerProps) {
  const isAr = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'knowledge' | 'analytics' | 'playground'>('overview');
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [analytics, setAnalytics] = useState<AiAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit settings form
  const [formEnabled, setFormEnabled] = useState(true);
  const [formDefaultLang, setFormDefaultLang] = useState('ar');
  const [formEscalationPhone, setFormEscalationPhone] = useState('+20 100 000 0002');
  const [formEscalationEmail, setFormEscalationEmail] = useState('contact@church.org');

  // Reindex knowledge state
  const [isReindexing, setIsReindexing] = useState(false);

  // Playground states
  const [testQuery, setTestQuery] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Fetch AI settings and analytics
  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [settingsRes, analyticsRes] = await Promise.all([
        fetch(`${API_URL}/ai/admin/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/ai/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        })
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

  // Reindex / Refresh knowledge base
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

  // Run test in playground
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Status Message */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Sparkles size={22} />
            {isAr ? 'إدارة المساعد الذكي الكنسي (AI Assistant)' : 'Church AI Assistant Administration'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
            {isAr
              ? 'مراقبة المحادثات، إعدادات النموذج، التحقق من مصادر المعرفة واختبار الإجابات المعتمدة.'
              : 'Monitor queries, configure LLM provider, verify grounded knowledge sources and test answers.'}
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(226, 183, 20, 0.1)',
            border: '1px solid rgba(226, 183, 20, 0.3)',
            color: 'var(--accent-gold)',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          {isAr ? 'تحديث البيانات' : 'Refresh'}
        </button>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: statusMsg.type === 'success' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
            border: `1px solid ${statusMsg.type === 'success' ? '#2ecc71' : '#e74c3c'}`,
            color: statusMsg.type === 'success' ? '#2ecc71' : '#e74c3c',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {statusMsg.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Sub Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '8px',
          overflowX: 'auto'
        }}
      >
        <button
          onClick={() => setActiveSubTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: activeSubTab === 'overview' ? 'var(--accent-gold)' : 'transparent',
            color: activeSubTab === 'overview' ? '#000' : 'var(--text-secondary)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Settings size={15} />
          {isAr ? 'الإعدادات العامة' : 'General Settings'}
        </button>

        <button
          onClick={() => setActiveSubTab('knowledge')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: activeSubTab === 'knowledge' ? 'var(--accent-gold)' : 'transparent',
            color: activeSubTab === 'knowledge' ? '#000' : 'var(--text-secondary)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Database size={15} />
          {isAr ? 'مصادر المعرفة الكنسية' : 'Knowledge Sources'}
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: activeSubTab === 'analytics' ? 'var(--accent-gold)' : 'transparent',
            color: activeSubTab === 'analytics' ? '#000' : 'var(--text-secondary)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <BarChart3 size={15} />
          {isAr ? 'إحصائيات الاستخدام' : 'Usage Analytics'}
        </button>

        <button
          onClick={() => setActiveSubTab('playground')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: activeSubTab === 'playground' ? 'var(--accent-gold)' : 'transparent',
            color: activeSubTab === 'playground' ? '#000' : 'var(--text-secondary)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Play size={15} />
          {isAr ? 'ميدان التجربة (Playground)' : 'Testing Playground'}
        </button>
      </div>

      {/* 1. Overview & General Settings Tab */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Card: Provider & Health Status */}
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} style={{ color: 'var(--accent-gold)' }} />
              {isAr ? 'حالة محرك الذكاء الاصطناعي' : 'AI Engine & Provider Status'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'مزود الخدمة (Provider):' : 'Provider:'}</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{settings?.provider?.toUpperCase() || 'GROQ / OPENAI'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'النموذج النشط (Model):' : 'Model:'}</span>
                <span style={{ fontWeight: 600 }}>{settings?.model || 'llama-3.3-70b-versatile'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'مفتاح API الخارجي:' : 'API Key Status:'}</span>
                <span style={{ color: settings?.hasApiKey ? '#2ecc71' : '#e67e22', fontWeight: 600 }}>
                  {settings?.hasApiKey 
                    ? `مُهيأ (${settings.maskedApiKey})` 
                    : (isAr ? 'غير مدخل (يعمل بالمحرك المحلي المعتمد 100%)' : 'Not set (Local RAG engine active)')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
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
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
              {isAr ? 'خيارات التشغيل والتحكم' : 'Assistant Operational Settings'}
            </h3>

            {/* Enable toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>
                  {isAr ? 'تفعيل المساعد لزوار الموقع' : 'Enable Assistant for Website Visitors'}
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {isAr ? 'عند التعطيل، يختفي الزر العائم عن العامة' : 'When disabled, floating widget is hidden'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={formEnabled}
                onChange={e => setFormEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
              />
            </div>

            {/* Default language */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'اللغة الافتراضية للترحيب:' : 'Default Welcome Language:'}
              </label>
              <select
                value={formDefaultLang}
                onChange={e => setFormDefaultLang(e.target.value)}
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
                <option value="ar">العربية (Arabic - Modern & Egyptian)</option>
                <option value="en">English (Ecclesiastical Terms)</option>
              </select>
            </div>

            {/* Escalation phone */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'هاتف الطوارئ والاستفسارات الكنسية:' : 'Escalation Emergency/Secretary Phone:'}
              </label>
              <input
                type="text"
                value={formEscalationPhone}
                onChange={e => setFormEscalationPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
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
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'البريد الإلكتروني المعتمد للإحالة:' : 'Escalation Contact Email:'}
              </label>
              <input
                type="email"
                value={formEscalationEmail}
                onChange={e => setFormEscalationEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
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
                marginTop: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save Changes')}
            </button>
          </form>
        </div>
      )}

      {/* 2. Knowledge Management Tab */}
      {activeSubTab === 'knowledge' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '18px',
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: isReindexing ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={15} className={isReindexing ? 'animate-spin' : ''} />
              {isReindexing
                ? (isAr ? 'جاري الفهرسة والتحديث...' : 'Reindexing & Syncing...')
                : (isAr ? 'تحديث وإعادة فهرسة المعرفة الآن' : 'Reindex & Refresh Knowledge')}
            </button>
          </div>

          {/* Knowledge Sources Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'جدول القداسات الإلهية' : 'Mass Schedules'}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {analytics?.knowledgeBase.massSchedules ?? '—'}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <CheckCircle2 size={12} /> {isAr ? 'نشط ومفهرس' : 'Active & Indexed'}
              </span>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'دليل الآباء والاعترافات' : 'Clergy & Confessions'}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {analytics?.knowledgeBase.priests ?? '—'}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <CheckCircle2 size={12} /> {isAr ? 'نشط ومفهرس' : 'Active & Indexed'}
              </span>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'مكتبة العظات والتعليم' : 'Sermon Library'}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {analytics?.knowledgeBase.sermons ?? '—'}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <CheckCircle2 size={12} /> {isAr ? 'نشط ومفهرس' : 'Active & Indexed'}
              </span>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'الرحلات والمناسبات' : 'Trips & Events'}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {analytics?.knowledgeBase.eventsAndTrips ?? '—'}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <CheckCircle2 size={12} /> {isAr ? 'نشط ومفهرس' : 'Active & Indexed'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Analytics Tab */}
      {activeSubTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{isAr ? 'إجمالي الأسئلة المعالجة' : 'Total Queries Processed'}</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {analytics?.totalQueries ?? 0}
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{isAr ? 'متوسط سرعة الإجابة' : 'Avg Latency'}</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                {analytics?.avgLatencyMs ? `${analytics.avgLatencyMs} ms` : '—'}
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{isAr ? 'نسبة رضا المستخدمين' : 'Satisfaction Rate'}</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2ecc71', marginTop: '4px' }}>
                {analytics?.feedback.satisfactionRate ?? 100}%
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{isAr ? 'الرموز المستهلكة (Tokens)' : 'Tokens Consumed'}</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {analytics?.estimatedTokens ?? 0}
              </div>
            </div>
          </div>

          {/* Recent Queries Table */}
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              overflowX: 'auto'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, marginBottom: '12px' }}>
              {isAr ? 'سجل الاستفسارات الأخيرة (خصوصية تامة بدون بيانات شخصية)' : 'Recent Diagnostic Queries (Privacy-Preserved)'}
            </h3>

            {(!analytics?.recentQueries || analytics.recentQueries.length === 0) ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {isAr ? 'لا توجد سجلات استفسارات حديثة حتى الآن.' : 'No recent queries recorded yet.'}
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'start' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 8px' }}>{isAr ? 'المستخدم' : 'User'}</th>
                    <th style={{ padding: '10px 8px' }}>{isAr ? 'السؤال' : 'Query'}</th>
                    <th style={{ padding: '10px 8px' }}>{isAr ? 'زمن المعالجة' : 'Latency'}</th>
                    <th style={{ padding: '10px 8px' }}>{isAr ? 'التاريخ والوقت' : 'Timestamp'}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentQueries.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '10px 8px', color: 'var(--accent-gold)' }}>{q.user}</td>
                      <td style={{ padding: '10px 8px', maxWidth: '300px', wordBreak: 'break-word' }}>{q.query}</td>
                      <td style={{ padding: '10px 8px' }}>{q.latencyMs} ms</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                        {new Date(q.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 4. Safe Testing Playground Tab */}
      {activeSubTab === 'playground' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={17} style={{ color: 'var(--accent-gold)' }} />
              {isAr ? 'ميدان اختبار وتدقيق إجابات المساعد' : 'AI Testing & Validation Playground'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
              {isAr
                ? 'اختبر دقة الإجابات والمصادر المسترجعة مباشرة من قاعدة بيانات الكنيسة قبل اعتمادها.'
                : 'Test answer accuracy, database sources retrieval and latency in an isolated environment.'}
            </p>

            {/* Quick Prompts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                {isAr ? 'أسئلة سريعة للتجربة:' : 'Quick test questions:'}
              </span>
              {[
                isAr ? 'إمتى القداس يوم الجمعة؟' : 'When is Friday liturgy?',
                isAr ? 'عايز أحجز موعد اعتراف' : 'How to book confession?',
                isAr ? 'ما هي رحلات ومؤتمرات الكنيسة؟' : 'What trips are upcoming?',
                isAr ? 'عايز عظة عن الصبر في التجربة' : 'Find sermons about prayer',
                isAr ? 'ما هي حسابات التبرع الرسمية؟' : 'Official bank accounts for donation'
              ].map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setTestQuery(qp);
                    handleRunTest(qp);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(226, 183, 20, 0.08)',
                    border: '1px solid rgba(226, 183, 20, 0.25)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
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
              style={{ display: 'flex', gap: '10px', marginTop: '8px' }}
            >
              <input
                type="text"
                value={testQuery}
                onChange={e => setTestQuery(e.target.value)}
                placeholder={isAr ? 'اكتب سؤال الاختبار هنا...' : 'Type test prompt here...'}
                disabled={isTesting}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!testQuery.trim() || isTesting}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#000',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: !testQuery.trim() || isTesting ? 'not-allowed' : 'pointer'
                }}
              >
                <Play size={16} />
                {isTesting ? (isAr ? 'جاري الفحص...' : 'Running...') : (isAr ? 'تشغيل الاختبار' : 'Run Test')}
              </button>
            </form>
          </div>

          {/* Playground Result Display */}
          {testResult && (
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--accent-gold)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                  {isAr ? 'نتيجة الاختبار المعتمدة:' : 'Test Execution Result:'}
                </span>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>⏱️ {testResult.latencyMs} ms</span>
                  <span>🪙 {testResult.tokensUsed} tokens</span>
                  <span>⚙️ {testResult.provider || 'local-rag'}</span>
                </div>
              </div>

              {/* Answer content */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  fontSize: '0.92rem',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-primary)'
                }}
              >
                {testResult.response}
              </div>

              {/* Retrieved sources */}
              {testResult.sources && testResult.sources.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    {isAr ? 'المصادر الكنسية المسترجعة من قاعدة البيانات:' : 'Grounded Database Sources Retrieved:'}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {testResult.sources.map((s: any, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(226, 183, 20, 0.1)',
                          border: '1px solid rgba(226, 183, 20, 0.3)',
                          color: 'var(--accent-gold)',
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {s.title} ({s.url})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
