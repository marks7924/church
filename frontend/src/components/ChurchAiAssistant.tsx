'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from './ThemeContext';
import { API_URL } from '../config';
import { 
  MessageSquare, X, Send, RotateCcw, Copy, Check, 
  ExternalLink, Sparkles, ChevronDown, Shield, Volume2, VolumeX,
  BookOpen, Calendar, HeartHandshake, Phone, Radio, Users, Compass
} from 'lucide-react';

interface SourceReference {
  title: string;
  url: string;
  type: string;
  verifiedDate?: string;
}

interface ActionPayload {
  actionId: string;
  nameAr?: string;
  nameEn?: string;
  messageAr?: string;
  messageEn?: string;
  redirectUrl?: string;
  data?: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: SourceReference[];
  suggestedQuestions?: string[];
  action?: ActionPayload;
  timestamp: string;
}

export default function ChurchAiAssistant() {
  const { language } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isAr = language === 'ar';
  const isAuthPage = pathname === '/login' || pathname === '/register-member';
  const isDashboardPage = pathname === '/dashboard' || pathname?.startsWith('/dashboard');

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(true);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  
  // Dynamic Route-Aware Suggestions
  const [routeSuggestions, setRouteSuggestions] = useState<string[]>([]);

  // Human Handoff / Support Escalation Modal
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [handoffName, setHandoffName] = useState('');
  const [handoffPhone, setHandoffPhone] = useState('');
  const [handoffCategory, setHandoffCategory] = useState<'GENERAL' | 'PASTORAL' | 'MEMBERSHIP' | 'TECHNICAL'>('GENERAL');
  const [handoffMessage, setHandoffMessage] = useState('');
  const [isSubmittingHandoff, setIsSubmittingHandoff] = useState(false);
  const [handoffSuccessCode, setHandoffSuccessCode] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);

  // Hide AI trigger button whenever the mobile navigation drawer is open
  useEffect(() => {
    const handleDrawerToggle = (e: any) => {
      setIsNavDrawerOpen(!!e?.detail?.open);
    };
    window.addEventListener('church-drawer-toggle', handleDrawerToggle);

    const checkDrawerState = () => {
      if (typeof document !== 'undefined') {
        const hasOpenClass = document.body.classList.contains('mobile-drawer-open');
        const hasDrawer = !!document.querySelector('[class*="mobileDropdownDrawer"]');
        setIsNavDrawerOpen(hasOpenClass || hasDrawer);
      }
    };

    const observer = new MutationObserver(checkDrawerState);
    if (typeof document !== 'undefined' && document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
      checkDrawerState();
    }

    return () => {
      window.removeEventListener('church-drawer-toggle', handleDrawerToggle);
      observer.disconnect();
    };
  }, []);

  // Hide AI trigger button on mobile when scrolling over the footer
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const footer = document.querySelector('footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isNearFooter = entry.isIntersecting;
        setIsFooterVisible(isNearFooter);
        if (typeof document !== 'undefined') {
          document.body.classList.toggle('footer-in-view', isNearFooter);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(footer);
    return () => {
      observer.disconnect();
      if (typeof document !== 'undefined') {
        document.body.classList.remove('footer-in-view');
      }
    };
  }, [pathname]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Play gentle subtle notification tone using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {}
  };

  // Initial welcome message
  const getInitialMessage = (): ChatMessage => ({
    id: 'welcome-msg',
    role: 'assistant',
    text: isAr
      ? 'أهلاً بيك في الكنيسة ❤️\nأنا مساعد الكنيسة الذكي، أقدر أساعدك تعرف مواعيد القداسات والأعياد، وتكتشف العظات والخدمات والرحلات، وتوصل للمعلومات اللي محتاجها بسهولة.'
      : 'Welcome to our church ❤️\nI am your church AI assistant. I can help you find liturgy schedules, feast dates, sermons, ministries, upcoming events, and official church information.',
    suggestedQuestions: isAr
      ? [
          'إمتى القداس يوم الجمعة؟',
          'عايز أحجز موعد اعتراف',
          'ما هي الرحلات والمؤتمرات القادمة؟',
          'أين تقع الكنيسة وأرقام التواصل؟',
          'ما هي حسابات التبرع الرسمية؟',
          'كيفية تسجيل استمارة العضوية؟'
        ]
      : [
          'When is Friday Liturgy?',
          'How can I book confession?',
          'What trips are upcoming?',
          'Where is the church located?',
          'Official donation accounts?',
          'How to register family membership?'
        ],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // Load chat history from localStorage on client mount
  useEffect(() => {
    const saved = localStorage.getItem('church-ai-chat-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch {}
    }
    setMessages([getInitialMessage()]);
  }, [language]);

  // Save history on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('church-ai-chat-history', JSON.stringify(messages.slice(-20)));
    }
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  // Send message to backend
  // Fetch dynamic suggestions whenever route or language changes
  useEffect(() => {
    if (!isOpen) return;
    fetch(`${API_URL}/ai/suggestions?route=${encodeURIComponent(pathname || '/')}&lang=${isAr ? 'ar' : 'en'}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.suggestions)) {
          setRouteSuggestions(data.suggestions);
        }
      })
      .catch(() => {});
  }, [pathname, isAr, isOpen]);

  // Submit human support / handoff escalation
  const handleSubmitHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    setHandoffError(null);
    setHandoffSuccessCode(null);

    if (!handoffName.trim() || !handoffPhone.trim() || !handoffMessage.trim()) {
      setHandoffError(isAr ? 'يرجى ملء جميع الحقول المطلوبة.' : 'Please fill all required fields.');
      return;
    }

    setIsSubmittingHandoff(true);
    try {
      const res = await fetch(`${API_URL}/ai/support-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: handoffName.trim(),
          phone: handoffPhone.trim(),
          category: handoffCategory,
          message: handoffMessage.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHandoffSuccessCode(data.referenceCode);
        setHandoffMessage('');
      } else {
        setHandoffError(data.error || (isAr ? 'فشل إرسال الطلب.' : 'Failed to submit request.'));
      }
    } catch (err) {
      setHandoffError(isAr ? 'تعذر الاتصال بالخادم.' : 'Connection error.');
    } finally {
      setIsSubmittingHandoff(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setErrorMsg(null);
    setInputText('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Build history payload (last 6 messages for multi-turn context)
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.text
      }));

      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          language: isAr ? 'ar' : 'en'
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.errorAr || 'Failed to fetch response.');
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.response || (isAr ? 'عذراً، لم أتمكن من الحصول على الإجابة.' : 'Sorry, could not retrieve answer.'),
        sources: data.sources || [],
        suggestedQuestions: data.suggestedQuestions || [],
        action: data.action || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMessage]);
      playChime();
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(
        isAr
          ? 'تعذر الاتصال بالخادم الآن. يرجى المحاولة مرة أخرى أو مراجعة سكرتارية الكنيسة.'
          : 'Unable to connect right now. Please try again or contact the church secretary.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Copy assistant response
  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear conversation
  const clearChat = () => {
    const initial = [getInitialMessage()];
    setMessages(initial);
    localStorage.removeItem('church-ai-chat-history');
    setErrorMsg(null);
  };

  // Render markdown links and bold formatting safely
  const renderFormattedText = (rawText: string) => {
    // Split text into paragraphs
    const paragraphs = rawText.split('\n');

    return paragraphs.map((para, pIdx) => {
      if (!para.trim()) {
        return <div key={pIdx} style={{ height: '8px' }} />;
      }

      // Check if paragraph is an image markdown: ![alt](url)
      const imgMatch = para.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        const altText = imgMatch[1];
        const imgUrl = imgMatch[2];
        return (
          <div
            key={pIdx}
            style={{
              margin: '8px 0',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              maxWidth: '100%'
            }}
          >
            <img
              src={imgUrl}
              alt={altText || 'صورة توضيحية'}
              loading="lazy"
              style={{
                width: '100%',
                maxHeight: '220px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            {altText && (
              <div
                style={{
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)'
                }}
              >
                {altText}
              </div>
            )}
          </div>
        );
      }

      // Regex to parse [title](url) links
      const parts = [];
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(para)) !== null) {
        if (match.index > lastIndex) {
          parts.push(para.substring(lastIndex, match.index));
        }
        const linkText = match[1];
        const linkUrl = match[2];

        parts.push(
          <button
            key={`link-${pIdx}-${match.index}`}
            onClick={() => {
              if (linkUrl.startsWith('/')) {
                router.push(linkUrl);
                // On mobile, close or minimize assistant when clicking a page link
                if (window.innerWidth < 640) setIsMinimized(true);
              } else {
                window.open(linkUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              margin: '0 3px',
              borderRadius: '6px',
              backgroundColor: 'rgba(226, 183, 20, 0.15)',
              border: '1px solid rgba(226, 183, 20, 0.35)',
              color: 'var(--accent-gold)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              verticalAlign: 'baseline',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(226, 183, 20, 0.25)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(226, 183, 20, 0.15)')}
          >
            {linkText}
            <ExternalLink size={11} style={{ opacity: 0.8 }} />
          </button>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < para.length) {
        parts.push(para.substring(lastIndex));
      }

      // Format bold text **word** within parts
      return (
        <p key={pIdx} style={{ margin: '4px 0', lineHeight: 1.6, wordBreak: 'break-word' }}>
          {parts.map((part, i) => {
            if (typeof part === 'string') {
              const boldRegex = /\*\*([^*]+)\*\*/g;
              const subParts = [];
              let bLast = 0;
              let bMatch;
              while ((bMatch = boldRegex.exec(part)) !== null) {
                if (bMatch.index > bLast) {
                  subParts.push(part.substring(bLast, bMatch.index));
                }
                subParts.push(
                  <strong key={`b-${i}-${bMatch.index}`} style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                    {bMatch[1]}
                  </strong>
                );
                bLast = bMatch.index + bMatch[0].length;
              }
              if (bLast < part.length) {
                subParts.push(part.substring(bLast));
              }
              return <React.Fragment key={i}>{subParts}</React.Fragment>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  if (isDashboardPage) {
    return null;
  }

  return (
    <>
      {/* 1. Floating Action Trigger Button (Bottom corner) */}
      {!isOpen && !isNavDrawerOpen && !isAuthPage && !isFooterVisible && (
        <button
          id="church-ai-trigger-btn"
          className="church-ai-trigger-btn"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label={isAr ? 'فتح مساعد الكنيسة الذكي' : 'Open Church AI Assistant'}
          title={isAr ? 'مساعد الكنيسة الذكي' : 'Church AI Assistant'}
          style={{
            [isAr ? 'left' : 'right']: '24px',
            fontFamily: isAr ? 'var(--font-arabic)' : 'var(--font-english)'
          }}
        >
          <div className="church-ai-trigger-icon">
            <Sparkles size={18} />
            <span className="church-ai-trigger-dot" />
          </div>
          <span className="church-ai-trigger-text">{isAr ? 'مساعد الكنيسة الذكي' : 'Church AI Assistant'}</span>
        </button>
      )}

      {/* 2. Floating Chat Container */}
      {isOpen && (
        <div
          id="church-ai-chat-window"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-chat-title"
          style={{
            position: 'fixed',
            bottom: isMinimized ? '20px' : '24px',
            [isAr ? 'left' : 'right']: '24px',
            zIndex: 10000,
            width: isMinimized ? '320px' : '410px',
            maxWidth: 'calc(100vw - 32px)',
            height: isMinimized ? '58px' : '640px',
            maxHeight: 'calc(100vh - 48px)',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '18px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 25px rgba(226, 183, 20, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: isAr ? 'var(--font-arabic)' : 'var(--font-english)',
            direction: isAr ? 'rtl' : 'ltr'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'rgba(226, 183, 20, 0.08)',
              borderBottom: isMinimized ? 'none' : '1px solid var(--border-color)',
              userSelect: 'none'
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
              onClick={() => setIsMinimized(prev => !prev)}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(226, 183, 20, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold)'
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <h4
                  id="ai-chat-title"
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.2
                  }}
                >
                  {isAr ? 'مساعد كنيسة أبي سيفين' : 'Abu Sefein AI Assistant'}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#2ecc71',
                      display: 'inline-block'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {isAr ? 'معلومات كنسية موثقة' : 'Verified Church Information'}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setIsHandoffModalOpen(true)}
                title={isAr ? 'طلب مساعدة خادم / سكرتارية' : 'Human Help / Servant Support'}
                style={{
                  background: 'rgba(226, 183, 20, 0.15)',
                  border: '1px solid rgba(226, 183, 20, 0.35)',
                  color: 'var(--accent-gold)',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 600
                }}
              >
                <HeartHandshake size={13} />
                <span className="hidden sm:inline">{isAr ? 'مساعدة بشرية' : 'Human Help'}</span>
              </button>

              <button
                onClick={() => setSoundEnabled(prev => !prev)}
                title={soundEnabled ? (isAr ? 'كتم الصوت' : 'Mute sound') : (isAr ? 'تفعيل الصوت' : 'Enable sound')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: soundEnabled ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                onClick={clearChat}
                title={isAr ? 'مسح المحادثة' : 'Clear conversation'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <RotateCcw size={15} />
              </button>

              <button
                onClick={() => setIsMinimized(prev => !prev)}
                title={isMinimized ? (isAr ? 'تكبير' : 'Expand') : (isAr ? 'تصغير' : 'Minimize')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronDown size={17} style={{ transform: isMinimized ? 'rotate(180deg)' : 'none' }} />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title={isAr ? 'إغلاق' : 'Close'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Body (Hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Privacy Notice Banner */}
              {showPrivacyBanner && (
                <div
                  style={{
                    padding: '8px 14px',
                    backgroundColor: 'rgba(226, 183, 20, 0.05)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Shield size={13} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                    <span>
                      {isAr
                        ? 'المساعد للمعلومات العامة فقط. لا تشارك بطاقات بنكية أو أسرار اعتراف.'
                        : 'For public info only. Do not share confidential confessions or banking details.'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPrivacyBanner(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Scrollable Messages Area */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Route Context Banner when starting chat */}
                {messages.length <= 1 && routeSuggestions.length > 0 && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(226, 183, 20, 0.08)',
                      border: '1px solid rgba(226, 183, 20, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                      <Sparkles size={14} />
                      <span>{isAr ? 'أسئلة مقترحة خاصة بهذه الصفحة:' : 'Suggested for this page:'}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {routeSuggestions.slice(0, 4).map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(sug)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '14px',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            textAlign: 'start'
                          }}
                        >
                          📍 {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map(msg => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAssistant ? 'flex-start' : 'flex-end',
                        maxWidth: '90%',
                        alignSelf: isAssistant ? 'flex-start' : 'flex-end'
                      }}
                    >
                      <div
                        style={{
                          padding: '12px 15px',
                          borderRadius: isAssistant ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                          backgroundColor: isAssistant ? 'var(--bg-card)' : 'var(--accent-gold)',
                          color: isAssistant ? 'var(--text-primary)' : '#000',
                          border: isAssistant ? '1px solid var(--border-color)' : 'none',
                          fontSize: '0.9rem',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                          position: 'relative'
                        }}
                      >
                        {renderFormattedText(msg.text)}

                        {/* Interactive Church Action Card */}
                        {isAssistant && msg.action && (
                          <div
                            style={{
                              marginTop: '12px',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(226, 183, 20, 0.12)',
                              border: '1px solid rgba(226, 183, 20, 0.35)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.1rem' }}>
                                {msg.action.actionId.includes('schedule') ? '⛪' : 
                                 msg.action.actionId.includes('clergy') || msg.action.actionId.includes('appointment') ? '✝️' :
                                 msg.action.actionId.includes('trip') || msg.action.actionId.includes('event') ? '🚌' :
                                 msg.action.actionId.includes('donation') ? '💝' :
                                 msg.action.actionId.includes('member') ? '📋' : '⚡'}
                              </span>
                              <strong style={{ fontSize: '0.84rem', color: 'var(--accent-gold)' }}>
                                {isAr ? (msg.action.nameAr || 'إجراء كنسي مباشر') : (msg.action.nameEn || 'Church Action')}
                              </strong>
                            </div>
                            
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {isAr ? (msg.action.messageAr || 'يمكنك تنفيذ الإجراء مباشرة من هنا:') : (msg.action.messageEn || 'You can perform this action directly:')}
                            </p>

                            {msg.action.redirectUrl && (
                              <button
                                onClick={() => {
                                  router.push(msg.action!.redirectUrl!);
                                  if (window.innerWidth < 640) setIsMinimized(true);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '7px 14px',
                                  borderRadius: '8px',
                                  backgroundColor: 'var(--accent-gold)',
                                  color: '#000',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  border: 'none',
                                  cursor: 'pointer',
                                  marginTop: '4px',
                                  boxShadow: '0 2px 8px rgba(226, 183, 20, 0.3)',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <span>{isAr ? 'الانتقال للخدمة' : 'Open Service'}</span>
                                <ExternalLink size={13} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Verified Sources Badges */}
                        {isAssistant && msg.sources && msg.sources.length > 0 && (
                          <div
                            style={{
                              marginTop: '12px',
                              paddingTop: '8px',
                              borderTop: '1px solid var(--border-color)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px'
                            }}
                          >
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', width: '100%' }}>
                              {isAr ? '📌 المصادر الرسمية المعتمدة:' : '📌 Official Verified Sources:'}
                            </span>
                            {msg.sources.map((src, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => router.push(src.url)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(226, 183, 20, 0.1)',
                                  border: '1px solid rgba(226, 183, 20, 0.3)',
                                  color: 'var(--accent-gold)',
                                  fontSize: '0.74rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(226, 183, 20, 0.2)')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(226, 183, 20, 0.1)')}
                              >
                                {src.title}
                                <ExternalLink size={10} />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Copy button & Timestamp */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '6px',
                            fontSize: '0.68rem',
                            color: isAssistant ? 'var(--text-secondary)' : 'rgba(0, 0, 0, 0.6)'
                          }}
                        >
                          <span>{msg.timestamp}</span>
                          {isAssistant && (
                            <button
                              onClick={() => copyToClipboard(msg.id, msg.text)}
                              title={isAr ? 'نسخ الرد' : 'Copy answer'}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: copiedId === msg.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                              {copiedId === msg.id && <span>{isAr ? 'تم النسخ' : 'Copied'}</span>}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Suggested Follow-up Chips */}
                      {isAssistant && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginTop: '8px'
                          }}
                        >
                          {msg.suggestedQuestions.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => handleSendMessage(q)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '14px',
                                backgroundColor: 'rgba(226, 183, 20, 0.08)',
                                border: '1px solid rgba(226, 183, 20, 0.25)',
                                color: 'var(--text-primary)',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                textAlign: 'start'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = 'rgba(226, 183, 20, 0.18)';
                                e.currentTarget.style.borderColor = 'var(--accent-gold)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = 'rgba(226, 183, 20, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(226, 183, 20, 0.25)';
                              }}
                            >
                              💬 {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading / Typing indicator */}
                {isLoading && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      padding: '10px 16px',
                      borderRadius: '16px 16px 16px 4px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-gold)',
                        display: 'inline-block',
                        animation: 'pulse 1s infinite'
                      }}
                    />
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-gold)',
                        display: 'inline-block',
                        animation: 'pulse 1s infinite 0.2s'
                      }}
                    />
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-gold)',
                        display: 'inline-block',
                        animation: 'pulse 1s infinite 0.4s'
                      }}
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginInlineStart: '6px' }}>
                      {isAr ? 'جاري مراجعة سجلات الكنيسة...' : 'Searching church records...'}
                    </span>
                  </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(231, 76, 60, 0.12)',
                      border: '1px solid #e74c3c',
                      color: '#e74c3c',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{errorMsg}</span>
                    <button
                      onClick={() => setErrorMsg(null)}
                      style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderTop: '1px solid var(--border-color)'
                }}
              >
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    position: 'relative'
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder={
                      isAr
                        ? 'اكتب سؤالك هنا (مثل: إمتى قداس الجمعة؟)'
                        : 'Ask your question here (e.g. When is Friday mass?)'
                    }
                    maxLength={1000}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '11px 14px',
                      borderRadius: '24px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      fontFamily: isAr ? 'var(--font-arabic)' : 'var(--font-english)'
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent-gold)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    aria-label={isAr ? 'إرسال السؤال' : 'Send question'}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: inputText.trim() && !isLoading ? 'var(--accent-gold)' : 'var(--border-color)',
                      color: inputText.trim() && !isLoading ? '#000' : 'var(--text-secondary)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: inputText.trim() && !isLoading ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                  >
                    <Send size={17} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Human Handoff / Pastoral Support Modal */}
      {isHandoffModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setIsHandoffModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(226, 183, 20, 0.2)',
              direction: isAr ? 'rtl' : 'ltr',
              fontFamily: isAr ? 'var(--font-arabic)' : 'var(--font-english)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(226, 183, 20, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-gold)'
                  }}
                >
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {isAr ? 'تواصل مع خادم / سكرتارية الكنيسة' : 'Contact Church Servant / Office'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {isAr ? 'مساعدة شخصية ومتابعة من الخدام المعتمدين' : 'Personal assistance from verified church servants'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHandoffModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Sacredness & Confession Warning */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(226, 183, 20, 0.08)',
                border: '1px solid rgba(226, 183, 20, 0.3)',
                fontSize: '0.78rem',
                color: 'var(--text-primary)',
                marginBottom: '16px',
                lineHeight: 1.5
              }}
            >
              <strong style={{ color: 'var(--accent-gold)' }}>⚠️ {isAr ? 'تنبيه طقسي هام:' : 'Important Notice:'} </strong>
              {isAr
                ? 'سر الاعتراف الطقسي مقدس ويتم شفاهاً وشخصياً مع الأب الكاهن في الكنيسة فقط. برجاء عدم كتابة أي خطايا أو أسرار اعتراف في هذه الاستمارة.'
                : 'Sacramental confession is strictly in-person with a priest at church. Please do not submit confidential confession disclosures here.'}
            </div>

            {handoffSuccessCode ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    color: '#2ecc71',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}
                >
                  <Check size={28} />
                </div>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {isAr ? 'تم استلام طلبك بنجاح!' : 'Request Received Successfully!'}
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  {isAr ? 'كود المتابعة المرجعي الخاص بك:' : 'Your Reference Tracking Code:'}
                </p>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '8px 18px',
                    backgroundColor: 'var(--bg-card)',
                    border: '2px dashed var(--accent-gold)',
                    borderRadius: '8px',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    color: 'var(--accent-gold)',
                    marginBottom: '16px'
                  }}
                >
                  {handoffSuccessCode}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {isAr
                    ? 'سيقوم الخادم أو سكرتارية الكنيسة بالتواصل معك عبر الهاتف أو الواتساب لمتابعة طلبك.'
                    : 'A servant or church secretary will reach out to you via phone or WhatsApp.'}
                </p>
                <button
                  onClick={() => {
                    setHandoffSuccessCode(null);
                    setIsHandoffModalOpen(false);
                  }}
                  style={{
                    marginTop: '16px',
                    padding: '9px 24px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#000',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'تم، حسناً' : 'Done'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitHandoff} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {handoffError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(231, 76, 60, 0.15)',
                      border: '1px solid #e74c3c',
                      color: '#e74c3c',
                      fontSize: '0.82rem'
                    }}
                  >
                    {handoffError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>
                    {isAr ? 'الاسم بالكامل *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={handoffName}
                    onChange={e => setHandoffName(e.target.value)}
                    placeholder={isAr ? 'اكتب اسمك الثلاثي' : 'Your full name'}
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>
                    {isAr ? 'رقم الهاتف / الواتساب *' : 'Phone / WhatsApp *'}
                  </label>
                  <input
                    type="tel"
                    value={handoffPhone}
                    onChange={e => setHandoffPhone(e.target.value)}
                    placeholder={isAr ? 'مثال: 01234567890' : 'e.g. +20 123 456 7890'}
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
                      direction: 'ltr',
                      textAlign: isAr ? 'right' : 'left'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>
                    {isAr ? 'قسم الاستفسار' : 'Category'}
                  </label>
                  <select
                    value={handoffCategory}
                    onChange={e => setHandoffCategory(e.target.value as any)}
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
                  >
                    <option value="GENERAL">{isAr ? 'استفسار عام / خدمات الكنيسة' : 'General Inquiry'}</option>
                    <option value="PASTORAL">{isAr ? 'استفسار رعوي / مقابلة مع أبونا' : 'Pastoral Meeting Inquiry'}</option>
                    <option value="MEMBERSHIP">{isAr ? 'شؤون العضوية واستمارة الأسرة' : 'Membership / Family Registry'}</option>
                    <option value="TECHNICAL">{isAr ? 'دعم فني في الموقع والحساب' : 'Technical Support'}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-primary)' }}>
                    {isAr ? 'تفاصيل رسالتك أو استفسارك *' : 'Message Details *'}
                  </label>
                  <textarea
                    rows={4}
                    value={handoffMessage}
                    onChange={e => setHandoffMessage(e.target.value)}
                    placeholder={isAr ? 'اكتب ما تود الاستفسار عنه بموضوعية وسيقوم الخادم بالرد عليك...' : 'Describe your inquiry...'}
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

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={isSubmittingHandoff}
                    style={{
                      flex: 1,
                      padding: '11px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#000',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      border: 'none',
                      cursor: isSubmittingHandoff ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSubmittingHandoff ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال الطلب للخادم' : 'Submit Request')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHandoffModalOpen(false)}
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
            )}
          </div>
        </div>
      )}
    </>
  );
}
