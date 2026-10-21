'use client';

import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import {
  Sparkles, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle2,
  Send, Ban, PlusCircle, Edit3, Trash2, Search, BookOpen,
  HelpCircle, RefreshCw, Layers, ShieldAlert, Award, ArrowRight,
  MessageSquare, Sliders, ChevronDown, ChevronUp, Check, X,
  ExternalLink, Bot, User, Clock, AlertTriangle, Info
} from 'lucide-react';

interface ChatLearnerViewProps {
  token: string | null;
  language: 'ar' | 'en';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  didBotSayIDontKnow?: boolean;
  provider?: string;
  model?: string;
  latencyMs?: number;
  tokensUsed?: number;
  userQuestion?: string; // stored for bot messages to associate feedback
  attachedImage?: {
    url: string;
    captionAr: string;
    captionEn: string;
    titleAr?: string;
    titleEn?: string;
  };
  feedbackGiven?: 'GOOD' | 'MODERATE' | 'BAD';
  feedbackRuleCreated?: string;
}

interface LearnedRule {
  id: string;
  ruleType: 'QA_LEARNED' | 'MANDATORY_INCLUDE' | 'FORBIDDEN_PHRASE' | 'FEEDBACK_LOG';
  titleAr: string;
  contentAr: string;
  status: 'ACTIVE' | 'INACTIVE';
  confidenceScore: number;
  meta: any;
  createdAt: string;
}

export default function ChatLearnerView({ token, language }: ChatLearnerViewProps) {
  const isAr = language === 'ar';

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatLang, setChatLang] = useState<'ar' | 'en'>(language);

  // Active Feedback Form Accordion State
  // messageId -> { type: 'MODERATE' | 'BAD', subOption: 'details' | 'forbidden' | 'correct' | 'dont_know' }
  const [activeFeedbackCard, setActiveFeedbackCard] = useState<{
    messageId: string;
    rating: 'MODERATE' | 'BAD';
    subOption: 'details' | 'forbidden' | 'correct' | 'dont_know';
  } | null>(null);

  // Form Inputs for Training
  const [formDetailContent, setFormDetailContent] = useState('');
  const [formDetailTopic, setFormDetailTopic] = useState('');
  const [formForbiddenPhrase, setFormForbiddenPhrase] = useState('');
  const [formForbiddenScope, setFormForbiddenScope] = useState<'topic' | 'global'>('global');
  const [formForbiddenNote, setFormForbiddenNote] = useState('');
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [actionFeedbackMsg, setActionFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Rules Memory State & Inspector Modal
  const [rules, setRules] = useState<LearnedRule[]>([]);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [ruleTypeFilter, setRuleTypeFilter] = useState<'ALL' | 'QA_LEARNED' | 'MANDATORY_INCLUDE' | 'FORBIDDEN_PHRASE'>('ALL');
  const [ruleSearch, setRuleSearch] = useState('');

  // Editing Rule in Modal
  const [editingRule, setEditingRule] = useState<LearnedRule | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isUpdatingRule, setIsUpdatingRule] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeFeedbackCard]);

  // Load Rules on Mount
  useEffect(() => {
    fetchRules();
  }, [token]);

  const fetchRules = async () => {
    if (!token) return;
    setIsLoadingRules(true);
    try {
      const res = await fetch(`${API_URL}/ai/learner/rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Failed to fetch learned rules:', err);
    } finally {
      setIsLoadingRules(false);
    }
  };

  // Send Admin Chat Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending || !token) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    const userMsgId = 'usr_' + Date.now();
    const newHistory = [...messages, {
      id: userMsgId,
      sender: 'user' as const,
      text: userText,
      timestamp: new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    }];
    setMessages(newHistory);
    setIsSending(true);
    setActionFeedbackMsg(null);

    try {
      // Build history payload for endpoint
      const historyPayload = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch(`${API_URL}/ai/learner/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
          language: chatLang
        })
      });

      if (!res.ok) throw new Error('Chat failed');

      const data = await res.json();
      const botMsgId = 'bot_' + Date.now();

      setMessages(prev => [
        ...prev,
        {
          id: botMsgId,
          sender: 'bot',
          text: data.response,
          timestamp: new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          didBotSayIDontKnow: data.didBotSayIDontKnow,
          provider: data.provider,
          model: data.model,
          latencyMs: data.latencyMs,
          tokensUsed: data.tokensUsed,
          attachedImage: data.attachedImage,
          userQuestion: userText
        }
      ]);

      // If bot said "I don't know", automatically suggest opening the feedback panel for that message!
      if (data.didBotSayIDontKnow) {
        setActiveFeedbackCard({
          messageId: botMsgId,
          rating: 'BAD',
          subOption: 'dont_know'
        });
        setFormCorrectAnswer('');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'bot',
          text: isAr ? 'حدث خطأ أثناء معالجة المحادثة. يرجى المحاولة مرة أخرى.' : 'Error processing training message. Please try again.',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Rating Click
  const handleRatingClick = async (message: ChatMessage, rating: 'GOOD' | 'MODERATE' | 'BAD') => {
    if (!token) return;

    if (rating === 'GOOD') {
      // Direct success approval
      try {
        await fetch(`${API_URL}/ai/learner/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            rating: 'GOOD',
            question: message.userQuestion || '',
            botAnswer: message.text,
            feedbackType: 'RATING_ONLY'
          })
        });

        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, feedbackGiven: 'GOOD' } : m));
        setActiveFeedbackCard(null);
        setActionFeedbackMsg({
          text: isAr ? 'تم اعتماد هذه الإجابة كإجابة نموذجية ممتازة.' : 'Answer approved as high-quality model response.',
          type: 'success'
        });
      } catch (err) {
        console.error('Feedback save error:', err);
      }
      return;
    }

    if (rating === 'MODERATE') {
      setActiveFeedbackCard({
        messageId: message.id,
        rating: 'MODERATE',
        subOption: 'details'
      });
      setFormDetailContent('');
      setFormDetailTopic(message.userQuestion || '');
      setFormForbiddenPhrase('');
      setFormForbiddenNote('');
    } else if (rating === 'BAD') {
      setActiveFeedbackCard({
        messageId: message.id,
        rating: 'BAD',
        subOption: message.didBotSayIDontKnow ? 'dont_know' : 'correct'
      });
      setFormCorrectAnswer('');
      setFormForbiddenPhrase('');
      setFormForbiddenNote('');
    }
  };

  // Submit Feedback / Directives
  const handleSubmitFeedback = async (message: ChatMessage) => {
    if (!token || !activeFeedbackCard) return;

    setIsSubmittingFeedback(true);
    setActionFeedbackMsg(null);

    try {
      const payload: any = {
        rating: activeFeedbackCard.rating,
        question: message.userQuestion || '',
        botAnswer: message.text,
        notes: formNotes
      };

      if (activeFeedbackCard.rating === 'MODERATE') {
        if (activeFeedbackCard.subOption === 'details') {
          if (!formDetailContent.trim()) {
            alert(isAr ? 'يرجى كتابة التفاصيل الإلزامية التي يجب ذكرها.' : 'Please enter the required detail to include.');
            setIsSubmittingFeedback(false);
            return;
          }
          payload.feedbackType = 'ADD_DETAILS';
          payload.requiredContent = formDetailContent.trim();
          payload.question = formDetailTopic.trim() || message.userQuestion || '';
        } else if (activeFeedbackCard.subOption === 'forbidden') {
          if (!formForbiddenPhrase.trim()) {
            alert(isAr ? 'يرجى كتابة الكلمة أو العبارة المحظورة.' : 'Please enter the forbidden phrase.');
            setIsSubmittingFeedback(false);
            return;
          }
          payload.feedbackType = 'FORBID_WORDS';
          payload.forbiddenPhrase = formForbiddenPhrase.trim();
          payload.notes = formForbiddenNote.trim() || (isAr ? 'توجيه إداري ملزم بحظر هذه الكلمة' : 'Admin strict prohibition');
        }
      } else if (activeFeedbackCard.rating === 'BAD') {
        if (activeFeedbackCard.subOption === 'correct' || activeFeedbackCard.subOption === 'dont_know') {
          if (!formCorrectAnswer.trim()) {
            alert(isAr ? 'يرجى كتابة الإجابة الصحيحة المعتمدة.' : 'Please write the correct answer.');
            setIsSubmittingFeedback(false);
            return;
          }
          payload.feedbackType = activeFeedbackCard.subOption === 'dont_know' ? 'TEACH_UNKNOWN' : 'CORRECT_ANSWER';
          payload.correctAnswer = formCorrectAnswer.trim();
        } else if (activeFeedbackCard.subOption === 'forbidden') {
          if (!formForbiddenPhrase.trim()) {
            alert(isAr ? 'يرجى كتابة الكلمة أو العبارة المحظورة.' : 'Please enter the forbidden phrase.');
            setIsSubmittingFeedback(false);
            return;
          }
          payload.feedbackType = 'FORBID_WORDS';
          payload.forbiddenPhrase = formForbiddenPhrase.trim();
          payload.notes = formForbiddenNote.trim() || (isAr ? 'توجيه إداري ملزم بحظر هذه الكلمة' : 'Admin strict prohibition');
        }
      }

      const res = await fetch(`${API_URL}/ai/learner/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Feedback submission failed');

      const data = await res.json();

      setMessages(prev => prev.map(m => m.id === message.id ? {
        ...m,
        feedbackGiven: activeFeedbackCard.rating,
        feedbackRuleCreated: data.rule?.titleAr || 'Rule Saved'
      } : m));

      setActiveFeedbackCard(null);
      setActionFeedbackMsg({
        text: isAr
          ? 'تم حفظ التوجيه التدريبي بنجاح وتلقينه لذاكرة الذكاء الاصطناعي الفورية!'
          : 'Training directive saved and injected into AI live memory!',
        type: 'success'
      });

      // Refresh memory list
      fetchRules();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setActionFeedbackMsg({
        text: isAr ? 'فشل حفظ التوجيه التدريبي.' : 'Failed to save training directive.',
        type: 'error'
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Rule Status Toggle
  const handleToggleRuleStatus = async (rule: LearnedRule) => {
    if (!token) return;
    try {
      const nextStatus = rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const res = await fetch(`${API_URL}/ai/learner/rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, status: nextStatus } : r));
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!token) return;
    const confirmMsg = isAr ? 'هل أنت متأكد من حذف هذه القاعدة من ذاكرة الذكاء الاصطناعي؟' : 'Are you sure you want to delete this rule?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_URL}/ai/learner/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== ruleId));
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  // Edit Rule
  const handleSaveEditRule = async () => {
    if (!token || !editingRule || !editTitle.trim()) return;
    setIsUpdatingRule(true);
    try {
      const res = await fetch(`${API_URL}/ai/learner/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          titleAr: editTitle.trim(),
          contentAr: editContent.trim()
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
        setEditingRule(null);
      }
    } catch (err) {
      console.error('Failed to edit rule:', err);
    } finally {
      setIsUpdatingRule(false);
    }
  };

  // Filtered Rules
  const filteredRules = rules.filter(r => {
    if (ruleTypeFilter !== 'ALL' && r.ruleType !== ruleTypeFilter) return false;
    if (ruleSearch.trim()) {
      const q = ruleSearch.toLowerCase();
      return (r.titleAr || '').toLowerCase().includes(q) || (r.contentAr || '').toLowerCase().includes(q);
    }
    return true;
  });

  const activeRulesCount = rules.filter(r => r.status === 'ACTIVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & Memory Indicator */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '18px 22px',
          borderRadius: '14px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)'
            }}
          >
            <Sparkles size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                {isAr ? 'مدرّب الذكاء الاصطناعي ومراقبة الجودة (Chat Learner)' : 'AI Chat Learner & Quality Trainer'}
              </h3>
              <span
                style={{
                  fontSize: '0.74rem',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(46, 204, 113, 0.15)',
                  color: '#2ecc71',
                  fontWeight: 600
                }}
              >
                Live RAG Injection
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {isAr
                ? 'تحاور مع المساعد الذكي، قيّم الإجابات (ممتاز / متوسط / سيئ)، ولقّنه الإجابات الصحيحة والتفاصيل والعبارات المحظورة فورياً.'
                : 'Chat with AI, rate answers (Good / Moderate / Bad), teach correct answers, mandatory points, and forbid phrases in real-time.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              color: 'var(--accent-gold)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Layers size={16} />
            <span>{isAr ? `ذاكرة القواعد (${activeRulesCount})` : `Active Rules (${activeRulesCount})`}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setActiveFeedbackCard(null);
              setActionFeedbackMsg(null);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '10px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            <span>{isAr ? 'جلسة جديدة' : 'New Session'}</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedbackMsg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: actionFeedbackMsg.type === 'success' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
            border: `1px solid ${actionFeedbackMsg.type === 'success' ? '#2ecc71' : '#e74c3c'}`,
            color: actionFeedbackMsg.type === 'success' ? '#2ecc71' : '#e74c3c',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {actionFeedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{actionFeedbackMsg.text}</span>
        </div>
      )}

      {/* Main Training Chat Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '660px',
          borderRadius: '14px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >
        {/* Chat Messages List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                padding: '20px'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212, 175, 55, 0.12)',
                  color: 'var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px'
                }}
              >
                <Bot size={32} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                {isAr ? 'ابدأ باختبار المساعد وتدريبه' : 'Start testing and training the Assistant'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.84rem', maxWidth: '420px', lineHeight: 1.5 }}>
                {isAr
                  ? 'اكتب أي سؤال تريد التحقق من إجابة الذكاء الاصطناعي عنه. ثم استخدم أزرار التقييم (ممتاز / متوسط / سيئ) لتلقينه وإرشاده.'
                  : 'Ask any question to test AI answers. Use feedback buttons (Good / Moderate / Bad) to teach and tune rules live.'}
              </p>

              {/* Sample Training Queries */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '18px', justifyContent: 'center' }}>
                {[
                  isAr ? 'ما هي مواعيد القداسات؟' : 'What are the liturgy schedules?',
                  isAr ? 'عايز موعد اعتراف مع أبونا مينا' : 'Confession with Fr. Mina',
                  isAr ? 'ما هي الأنشطة المتاحة لخدمة الشباب؟' : 'Youth ministry activities'
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputMessage(sample);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--accent-gold)',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.sender === 'user';
            const isCardActive = activeFeedbackCard?.messageId === m.id;

            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? (isAr ? 'flex-start' : 'flex-end') : (isAr ? 'flex-end' : 'flex-start'),
                  gap: '6px'
                }}
              >
                {/* Bubble Container */}
                <div
                  style={{
                    maxWidth: '82%',
                    minWidth: '220px',
                    padding: '14px 18px',
                    borderRadius: isUser
                      ? (isAr ? '16px 16px 16px 4px' : '16px 16px 4px 16px')
                      : (isAr ? '16px 16px 4px 16px' : '16px 16px 16px 4px'),
                    backgroundColor: isUser ? 'var(--accent-gold)' : 'var(--bg-primary)',
                    color: isUser ? '#1a1a1a' : 'var(--text-primary)',
                    border: isUser ? 'none' : '1px solid var(--border-color)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    position: 'relative'
                  }}
                >
                  {/* Sender & Timestamp */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      opacity: 0.8,
                      marginBottom: '6px',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {isUser ? (isAr ? 'المسؤول (Admin Trainer)' : 'Admin Trainer') : (isAr ? 'المساعد الذكي الكنسي' : 'Church AI')}
                    </span>
                    <span>{m.timestamp}</span>
                  </div>

                  {/* Message Content */}
                  <div style={{ fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {m.text}
                  </div>

                  {/* Attached Image Preview if any */}
                  {m.attachedImage && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <img
                        src={m.attachedImage.url}
                        alt="Attached Priest or Media"
                        style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                      />
                      <div style={{ fontSize: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>{isAr ? m.attachedImage.titleAr : m.attachedImage.titleEn}</div>
                        <div style={{ opacity: 0.8 }}>{isAr ? m.attachedImage.captionAr : m.attachedImage.captionEn}</div>
                      </div>
                    </div>
                  )}

                  {/* AI Metadata Badges */}
                  {!isUser && (
                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {m.provider && (
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                            {m.provider}
                          </span>
                        )}
                        {m.latencyMs && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} /> {m.latencyMs}ms
                          </span>
                        )}
                      </div>

                      {/* Bot "I Don't Know" Alert Banner */}
                      {m.didBotSayIDontKnow && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#e67e22',
                            fontWeight: 600,
                            backgroundColor: 'rgba(230, 126, 34, 0.12)',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}
                        >
                          <AlertCircle size={12} />
                          {isAr ? 'البوت قال: لا أعلم (يحتاج تلقين)' : 'Bot said: I don\'t know'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Rating Action Toolbar for Bot Messages */}
                {!isUser && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 6px'
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {isAr ? 'تقييم الإجابة:' : 'Rate Answer:'}
                    </span>

                    {/* 1. Good Button */}
                    <button
                      type="button"
                      onClick={() => handleRatingClick(m, 'GOOD')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: m.feedbackGiven === 'GOOD' ? '#2ecc71' : 'transparent',
                        color: m.feedbackGiven === 'GOOD' ? '#fff' : '#2ecc71',
                        border: '1px solid #2ecc71',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={isAr ? 'إجابة ممتازة نموذجية' : 'Good Answer'}
                    >
                      <ThumbsUp size={13} />
                      <span>{isAr ? 'ممتاز' : 'Good'}</span>
                    </button>

                    {/* 2. Moderate Button */}
                    <button
                      type="button"
                      onClick={() => handleRatingClick(m, 'MODERATE')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: isCardActive && activeFeedbackCard?.rating === 'MODERATE' ? '#f39c12' : (m.feedbackGiven === 'MODERATE' ? 'rgba(243, 156, 18, 0.2)' : 'transparent'),
                        color: isCardActive && activeFeedbackCard?.rating === 'MODERATE' ? '#fff' : '#f39c12',
                        border: '1px solid #f39c12',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={isAr ? 'إجابة متوسطة تحتاج تفاصيل أو حظر كلمات' : 'Moderate Answer'}
                    >
                      <Info size={13} />
                      <span>{isAr ? 'متوسط' : 'Moderate'}</span>
                    </button>

                    {/* 3. Bad Button */}
                    <button
                      type="button"
                      onClick={() => handleRatingClick(m, 'BAD')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: isCardActive && activeFeedbackCard?.rating === 'BAD' ? '#e74c3c' : (m.feedbackGiven === 'BAD' ? 'rgba(231, 76, 60, 0.2)' : 'transparent'),
                        color: isCardActive && activeFeedbackCard?.rating === 'BAD' ? '#fff' : '#e74c3c',
                        border: '1px solid #e74c3c',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={isAr ? 'إجابة سيئة تحتاج تصحيح أو تلقين' : 'Bad Answer'}
                    >
                      <ThumbsDown size={13} />
                      <span>{isAr ? 'سيئ' : 'Bad'}</span>
                    </button>

                    {/* Rule Saved Badge */}
                    {m.feedbackRuleCreated && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: '#2ecc71',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginRight: '6px'
                        }}
                      >
                        <Check size={12} /> {isAr ? 'تم حفظ التوجيه' : 'Directive Saved'}
                      </span>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* INTERACTIVE TRAINING ACCORDION / CARD                     */}
                {/* ========================================================= */}
                {isCardActive && (
                  <div
                    style={{
                      width: '82%',
                      marginTop: '8px',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      border: `1.5px solid ${activeFeedbackCard.rating === 'MODERATE' ? '#f39c12' : '#e74c3c'}`,
                      boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: activeFeedbackCard.rating === 'MODERATE' ? 'rgba(243, 156, 18, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                            color: activeFeedbackCard.rating === 'MODERATE' ? '#f39c12' : '#e74c3c',
                            fontWeight: 700,
                            fontSize: '0.76rem'
                          }}
                        >
                          {activeFeedbackCard.rating === 'MODERATE' ? (isAr ? 'تعديل إجابة متوسطة' : 'Tune Moderate Answer') : (isAr ? 'تصحيح إجابة سيئة' : 'Fix Bad Answer')}
                        </span>
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {isAr ? 'اختر التوجيه الذي ترغب في تلقينه للروبوت:' : 'Choose the training directive:'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveFeedbackCard(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Sub-Option Selector Tabs */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {activeFeedbackCard.rating === 'MODERATE' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveFeedbackCard(prev => prev ? { ...prev, subOption: 'details' } : null)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: '1px solid #f39c12',
                              backgroundColor: activeFeedbackCard.subOption === 'details' ? '#f39c12' : 'transparent',
                              color: activeFeedbackCard.subOption === 'details' ? '#fff' : '#f39c12'
                            }}
                          >
                            {isAr ? '1. إجابتك جيدة لكن يجب ذكر تفاصيل إضافية...' : '1. Answer is good but must mention details...'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveFeedbackCard(prev => prev ? { ...prev, subOption: 'forbidden' } : null)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: '1px solid #f39c12',
                              backgroundColor: activeFeedbackCard.subOption === 'forbidden' ? '#f39c12' : 'transparent',
                              color: activeFeedbackCard.subOption === 'forbidden' ? '#fff' : '#f39c12'
                            }}
                          >
                            {isAr ? '2. استخدمت كلمة أو عبارة غير مناسبة (حظر)' : '2. You used a bad phrase (Prohibit)'}
                          </button>
                        </>
                      )}

                      {activeFeedbackCard.rating === 'BAD' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveFeedbackCard(prev => prev ? { ...prev, subOption: 'correct' } : null)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: '1px solid #e74c3c',
                              backgroundColor: activeFeedbackCard.subOption === 'correct' ? '#e74c3c' : 'transparent',
                              color: activeFeedbackCard.subOption === 'correct' ? '#fff' : '#e74c3c'
                            }}
                          >
                            {isAr ? '1. إجابتك ليست هكذا بل هي... (تصحيح)' : '1. Not like this, but rather... (Correct)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveFeedbackCard(prev => prev ? { ...prev, subOption: 'forbidden' } : null)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: '1px solid #e74c3c',
                              backgroundColor: activeFeedbackCard.subOption === 'forbidden' ? '#e74c3c' : 'transparent',
                              color: activeFeedbackCard.subOption === 'forbidden' ? '#fff' : '#e74c3c'
                            }}
                          >
                            {isAr ? '2. حظر كلمة أو عبارة غير مناسبة' : '2. Prohibit bad word/phrase'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveFeedbackCard(prev => prev ? { ...prev, subOption: 'dont_know' } : null)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: '1px solid #e67e22',
                              backgroundColor: activeFeedbackCard.subOption === 'dont_know' ? '#e67e22' : 'transparent',
                              color: activeFeedbackCard.subOption === 'dont_know' ? '#fff' : '#e67e22'
                            }}
                          >
                            {isAr ? '3. تلقين إجابة عندما قال "لا أعلم"' : '3. Teach answer when bot said "I don\'t know"'}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Sub-Option 1: Add Details */}
                    {activeFeedbackCard.subOption === 'details' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {isAr
                            ? 'أخبر المساعد: "إجابتك صحيحة لكن ناقصة، وعند السؤال عن هذا الموضوع يجب دائماً أن تذكر النقطة التالية:"'
                            : 'Tell the assistant: "Your answer is good, but you must always mention this point when asked about this topic:"'}
                        </p>
                        <input
                          type="text"
                          value={formDetailTopic}
                          onChange={(e) => setFormDetailTopic(e.target.value)}
                          placeholder={isAr ? 'الموضوع أو السؤال المرتبط (مثال: حجز موعد اعتراف)' : 'Topic / Question trigger'}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.84rem'
                          }}
                        />
                        <textarea
                          rows={3}
                          value={formDetailContent}
                          onChange={(e) => setFormDetailContent(e.target.value)}
                          placeholder={isAr ? 'اكتب التفاصيل الإلزامية التي يجب أن يذكرها الروبوت...' : 'Write the mandatory detail/clarification the bot must mention...'}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.84rem',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                    )}

                    {/* Sub-Option 2: Prohibit Bad Words */}
                    {activeFeedbackCard.subOption === 'forbidden' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            border: '1px solid rgba(231, 76, 60, 0.25)',
                            color: '#e74c3c',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Ban size={15} />
                          <span>
                            {isAr
                              ? 'أمر إداري ملزم ومباشر للذكاء الاصطناعي بحظر الكلمة أو العبارة وعدم تكرارها نهائياً.'
                              : 'Direct strict admin command prohibiting the AI from repeating this phrase.'}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={formForbiddenPhrase}
                          onChange={(e) => setFormForbiddenPhrase(e.target.value)}
                          placeholder={isAr ? 'الكلمة أو العبارة المحظورة تحديداً (مثال: يمكنك الحضور دون تسجيل)' : 'Exact forbidden phrase or word'}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.84rem'
                          }}
                        />
                        <input
                          type="text"
                          value={formForbiddenNote}
                          onChange={(e) => setFormForbiddenNote(e.target.value)}
                          placeholder={isAr ? 'سبب الحظر أو التوجيه البديل (اختياري)' : 'Prohibition reason or alternative directive (optional)'}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.84rem'
                          }}
                        />
                      </div>
                    )}

                    {/* Sub-Option 3: Correct Answer */}
                    {activeFeedbackCard.subOption === 'correct' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {isAr
                            ? 'أخبر المساعد: "إجابتك السابقة غير صحيحة، والإجابة المعتمدة الرسمية هي التالية ولن تجب بغيرها مستقبلاً:"'
                            : 'Tell the assistant: "Your answer was incorrect. The official verified answer is the following and must be used in the future:"'}
                        </p>
                        <textarea
                          rows={4}
                          value={formCorrectAnswer}
                          onChange={(e) => setFormCorrectAnswer(e.target.value)}
                          placeholder={isAr ? 'اكتب الإجابة النموذجية المعتمدة بالتفصيل...' : 'Write the verified correct answer in full detail...'}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.84rem',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                    )}

                    {/* Sub-Option 4: Teach Unknown */}
                    {activeFeedbackCard.subOption === 'dont_know' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(230, 126, 34, 0.12)',
                            border: '1px solid #e67e22',
                            color: '#e67e22',
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <HelpCircle size={16} />
                          <span>
                            {isAr
                              ? 'لقّن المساعد الإجابة الرسمية حتى لا يكرر عبارة "لا أعلم / تواصل مع شخص حقيقي" عند طرح هذا السؤال مجدداً.'
                              : 'Teach the assistant the official answer so it never says "I don\'t know" when asked this again.'}
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={formCorrectAnswer}
                          onChange={(e) => setFormCorrectAnswer(e.target.value)}
                          placeholder={isAr ? 'اكتب الإجابة المعتمدة التي سيتعلمها الروبوت ويجيب بها دائماً...' : 'Enter the church answer the AI will learn and use for this question...'}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.84rem',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveFeedbackCard(null)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'transparent',
                          color: 'var(--text-secondary)',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingFeedback}
                        onClick={() => handleSubmitFeedback(m)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 16px',
                          borderRadius: '8px',
                          backgroundColor: activeFeedbackCard.rating === 'MODERATE' ? '#f39c12' : '#e74c3c',
                          color: '#fff',
                          border: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: isSubmittingFeedback ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Check size={14} />
                        <span>{isSubmittingFeedback ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتلقين الذكاء الاصطناعي' : 'Save & Inject Rule')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: 'var(--bg-primary)',
            borderTop: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setChatLang(prev => prev === 'ar' ? 'en' : 'ar')}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {chatLang === 'ar' ? 'العربية' : 'English'}
            </button>
          </div>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isAr ? 'اكتب رسالة تدريبية للمساعد الذكي...' : 'Type a test message for the AI assistant...'}
            disabled={isSending}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: !inputMessage.trim() || isSending ? 'var(--border-color)' : 'var(--accent-gold)',
              color: !inputMessage.trim() || isSending ? 'var(--text-secondary)' : '#1a1a1a',
              border: 'none',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: !inputMessage.trim() || isSending ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Send size={16} />
            <span>{isSending ? (isAr ? 'جاري الرد...' : 'Sending...') : (isAr ? 'إرسال' : 'Send')}</span>
          </button>
        </form>
      </div>

      {/* ========================================================= */}
      {/* RULES MEMORY INSPECTOR MODAL                              */}
      {/* ========================================================= */}
      {isRulesModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '85vh',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={22} style={{ color: 'var(--accent-gold)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  {isAr ? 'ذاكرة القواعد والتوجيهات الإدارية الملقنة' : 'Learned AI Rules & Directives Memory'}
                </h3>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    color: 'var(--accent-gold)',
                    fontSize: '0.74rem',
                    fontWeight: 600
                  }}
                >
                  {rules.length} {isAr ? 'قاعدة مسجلة' : 'Rules'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRulesModalOpen(false);
                  setEditingRule(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '14px 24px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)'
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { id: 'ALL', labelAr: 'الكل', labelEn: 'All' },
                  { id: 'QA_LEARNED', labelAr: 'إجابات معتمدة', labelEn: 'Learned Q&A' },
                  { id: 'MANDATORY_INCLUDE', labelAr: 'نقاط إلزامية', labelEn: 'Mandatory' },
                  { id: 'FORBIDDEN_PHRASE', labelAr: 'كلمات محظورة', labelEn: 'Forbidden' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRuleTypeFilter(tab.id as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      backgroundColor: ruleTypeFilter === tab.id ? 'var(--accent-gold)' : 'transparent',
                      color: ruleTypeFilter === tab.id ? '#1a1a1a' : 'var(--text-secondary)'
                    }}
                  >
                    {isAr ? tab.labelAr : tab.labelEn}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  value={ruleSearch}
                  onChange={(e) => setRuleSearch(e.target.value)}
                  placeholder={isAr ? 'بحث في القواعد...' : 'Search rules...'}
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem'
                  }}
                />
              </div>
            </div>

            {/* Modal Body / Rules List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {isLoadingRules ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
                  <div>{isAr ? 'جاري تحميل القواعد...' : 'Loading rules...'}</div>
                </div>
              ) : filteredRules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0 }}>{isAr ? 'لا توجد قواعد ملقنة تطابق البحث.' : 'No learned rules match your search.'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredRules.map((r) => {
                    const isQALearned = r.ruleType === 'QA_LEARNED';
                    const isMandatory = r.ruleType === 'MANDATORY_INCLUDE';
                    const isForbidden = r.ruleType === 'FORBIDDEN_PHRASE';

                    return (
                      <div
                        key={r.id}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '14px',
                          opacity: r.status === 'ACTIVE' ? 1 : 0.6
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: isForbidden ? 'rgba(231, 76, 60, 0.15)' : (isMandatory ? 'rgba(243, 156, 18, 0.15)' : 'rgba(46, 204, 113, 0.15)'),
                                color: isForbidden ? '#e74c3c' : (isMandatory ? '#f39c12' : '#2ecc71')
                              }}
                            >
                              {isForbidden ? (isAr ? 'محظور' : 'Forbidden') : (isMandatory ? (isAr ? 'إلزامي' : 'Mandatory') : (isAr ? 'إجابة معتمدة' : 'Verified QA'))}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                              {r.titleAr}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {r.contentAr}
                          </div>

                          <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                            {new Date(r.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleRuleStatus(r)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none',
                              backgroundColor: r.status === 'ACTIVE' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                              color: r.status === 'ACTIVE' ? '#2ecc71' : '#e74c3c'
                            }}
                          >
                            {r.status === 'ACTIVE' ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingRule(r);
                              setEditTitle(r.titleAr);
                              setEditContent(r.contentAr);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title={isAr ? 'تعديل' : 'Edit'}
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRule(r.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#e74c3c',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Edit Rule Sub-Section if selected */}
            {editingRule && (
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--accent-gold)' }}>
                    {isAr ? 'تعديل القاعدة الملقنة' : 'Edit Rule'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingRule(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    <X size={15} />
                  </button>
                </div>

                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={isAr ? 'عنوان القاعدة أو السؤال' : 'Rule Title'}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem'
                  }}
                />

                <textarea
                  rows={3}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder={isAr ? 'محتوى التوجيه أو الإجابة المعتمدة' : 'Rule Content'}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingRule(null)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingRule}
                    onClick={handleSaveEditRule}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#1a1a1a',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isUpdatingRule ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديل' : 'Save Changes')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
