'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from './ThemeContext';
import { API_URL } from '../config';
import { 
  X, Send, RotateCcw, Copy, Check, 
  ExternalLink, Sparkles, ChevronDown, Shield, Volume2, VolumeX,
  HeartHandshake, Calendar, Users, Phone, MapPin, ArrowUpRight,
  CheckCircle2, Clock
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

interface PriestOption {
  id: string;
  nameAr: string;
  nameEn: string;
  titleAr: string;
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

  // Priests list for in-chat booking
  const [priestsList, setPriestsList] = useState<PriestOption[]>([
    { id: '1', nameAr: 'سيدنا الأنبا اثناسيوس', nameEn: 'Bishop Anba Athanasius', titleAr: 'الأنبا' },
    { id: '2', nameAr: 'القمص مينا عزت', nameEn: 'Fr. Mina Ezzat', titleAr: 'القمص' },
    { id: '3', nameAr: 'القمص فيلوباتير عزمي', nameEn: 'Fr. Philopateer Azmy', titleAr: 'القمص' },
    { id: '4', nameAr: 'القس يوحنا جون', nameEn: 'Fr. Yohanna John', titleAr: 'القس' },
    { id: '5', nameAr: 'القس كاراس عزيز', nameEn: 'Fr. Karas Aziz', titleAr: 'القس' }
  ]);

  // In-chat Interactive Action States
  const [bookingForm, setBookingForm] = useState({
    priestName: 'القمص مينا عزت',
    fullName: '',
    phone: '',
    date: 'الجمعة القادمة',
    timeSlot: 'بعد القداس الإلهي',
    notes: '',
    isSubmitting: false,
    successRef: null as string | null,
    error: null as string | null
  });

  const [membershipForm, setMembershipForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    familyCount: '4',
    isSubmitting: false,
    successRef: null as string | null,
    error: null as string | null
  });

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

  // Load user data if logged in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('church-user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          if (userObj?.fullName) {
            setBookingForm(prev => ({ ...prev, fullName: userObj.fullName, phone: userObj.phone || '' }));
            setMembershipForm(prev => ({ ...prev, fullName: userObj.fullName, phone: userObj.phone || '' }));
            setHandoffName(userObj.fullName);
            setHandoffPhone(userObj.phone || '');
          }
        }
      } catch {}
    }
  }, []);

  // Fetch real priests from server
  useEffect(() => {
    fetch(`${API_URL}/bookings/priests`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((p: any) => ({
            id: p.id,
            nameAr: `${p.titleAr || ''} ${p.nameAr}`.trim(),
            nameEn: `${p.titleEn || ''} ${p.nameEn}`.trim(),
            titleAr: p.titleAr || 'أبونا'
          }));
          setPriestsList(formatted);
          if (formatted[0]) {
            setBookingForm(prev => ({ ...prev, priestName: formatted[0].nameAr }));
          }
        }
      })
      .catch(() => {});
  }, []);

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
      ? 'سلام ونعمة يا فادي ❤️\nأنا مساعد كنيسة الشهيد العظيم أبي سيفين، وموجود هنا لمساعدتك في كل استفساراتك.\nتقدر تسألني عن مواعيد القداسات، حجز موعد اعتراف مع الآباء، استمارة العضوية، أو رحلات الكنيسة، ونقدر نتمم الإجراء سوا مباشرة.'
      : 'Peace and grace ❤️\nWelcome to Church of St. Abu Sefein. I am your church assistant. You can ask me about liturgy times, booking confession appointments, family membership, or church events.',
    suggestedQuestions: isAr
      ? [
          '⛪ إمتى قداس يوم الجمعة؟',
          '✝️ عايز أحجز موعد اعتراف مع أبونا',
          '📋 استمارة العضوية الكنسية للأسرة',
          '🚌 ما هي رحلات الكنيسة المتاحة؟',
          '📍 أين تقع الكنيسة ومواعيد المزار؟'
        ]
      : [
          '⛪ When is Friday Liturgy?',
          '✝️ Book confession with Father',
          '📋 Family membership registration',
          '🚌 Upcoming church trips',
          '📍 Church location and shrine hours'
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
  }, [messages, isOpen, isMinimized, isLoading, bookingForm.successRef, membershipForm.successRef]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

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

  // Handle in-chat appointment booking submission
  const handleExecuteAppointmentBooking = async () => {
    setBookingForm(prev => ({ ...prev, isSubmitting: true, error: null }));

    if (!bookingForm.phone.trim()) {
      setBookingForm(prev => ({
        ...prev,
        isSubmitting: false,
        error: isAr ? 'يرجى إدخال رقم الهاتف للتواصل.' : 'Please enter contact phone.'
      }));
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('church-token') : null;
      const res = await fetch(`${API_URL}/ai/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          actionId: 'book_appointment',
          params: {
            priestName: bookingForm.priestName,
            fullName: bookingForm.fullName || (isAr ? 'مقدم الطلب' : 'Applicant'),
            phone: bookingForm.phone.trim(),
            date: bookingForm.date,
            timeSlot: bookingForm.timeSlot,
            notes: bookingForm.notes.trim()
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const refCode = data.data?.referenceCode || `REQ-${new Date().getFullYear()}-CONF`;
        setBookingForm(prev => ({ ...prev, isSubmitting: false, successRef: refCode }));

        // Add confirmation message to chat
        const confirmMsg: ChatMessage = {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          text: isAr
            ? `تم تسجيل طلب الموعد بنجاح يا فادي! ✨\nتم إرسال طلبك إلى ${bookingForm.priestName}.\nرقم المتابعة المرجعي الخاص بك: **#${refCode}**.\nسيقوم الأب الكاهن أو سكرتارية الكنيسة بالتواصل معك هاتفياً على الرقم (${bookingForm.phone}) لتأكيد الموعد النهائي.`
            : `Appointment request submitted successfully! ✨\nYour request has been forwarded to ${bookingForm.priestName}.\nYour tracking reference code: **#${refCode}**.\nThe church office will contact you at (${bookingForm.phone}) to confirm.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, confirmMsg]);
        playChime();
      } else {
        setBookingForm(prev => ({
          ...prev,
          isSubmitting: false,
          error: data.messageAr || data.error || (isAr ? 'فشل تسجيل الموعد.' : 'Failed to book.')
        }));
      }
    } catch {
      setBookingForm(prev => ({
        ...prev,
        isSubmitting: false,
        error: isAr ? 'تعذر الاتصال بالخادم.' : 'Connection error.'
      }));
    }
  };

  // Handle in-chat family membership submission
  const handleExecuteMembershipSubmission = async () => {
    setMembershipForm(prev => ({ ...prev, isSubmitting: true, error: null }));

    if (!membershipForm.fullName.trim() || !membershipForm.phone.trim()) {
      setMembershipForm(prev => ({
        ...prev,
        isSubmitting: false,
        error: isAr ? 'يرجى كتابة اسم رب الأسرة ورقم الهاتف.' : 'Please enter family head name and phone.'
      }));
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('church-token') : null;
      const res = await fetch(`${API_URL}/ai/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          actionId: 'register_membership',
          params: {
            fullName: membershipForm.fullName.trim(),
            phone: membershipForm.phone.trim(),
            address: membershipForm.address.trim(),
            familyCount: membershipForm.familyCount
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const refCode = data.data?.referenceCode || `REQ-${new Date().getFullYear()}-MEM`;
        setMembershipForm(prev => ({ ...prev, isSubmitting: false, successRef: refCode }));

        const confirmMsg: ChatMessage = {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          text: isAr
            ? `تم تسجيل بيانات الأسرة المبدئية بنجاح! ✨\nرقم الطلب المرجعي: **#${refCode}**.\nستقوم لجنة العضوية والافتقاد بمراجعة الطلب والتواصل معكم، ويمكنك في أي وقت فتح الاستمارة الكاملة لتعبئة باقي التفاصيل.`
            : `Preliminary family details registered successfully! ✨\nReference tracking code: **#${refCode}**.\nThe church membership committee will follow up with you.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, confirmMsg]);
        playChime();
      } else {
        setMembershipForm(prev => ({
          ...prev,
          isSubmitting: false,
          error: data.messageAr || data.error || (isAr ? 'فشل تسجيل الطلب.' : 'Submission failed.')
        }));
      }
    } catch {
      setMembershipForm(prev => ({
        ...prev,
        isSubmitting: false,
        error: isAr ? 'تعذر الاتصال بالخادم.' : 'Connection error.'
      }));
    }
  };

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
          name: handoffName.trim(),
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
        setHandoffError(data.errorAr || data.error || (isAr ? 'فشل إرسال الطلب.' : 'Failed to submit request.'));
      }
    } catch {
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
    setBookingForm(prev => ({ ...prev, successRef: null, error: null }));
    setMembershipForm(prev => ({ ...prev, successRef: null, error: null }));
  };

  // Clean, elegant markdown and inline link rendering
  const renderFormattedText = (rawText: string) => {
    const paragraphs = rawText.split('\n');

    return paragraphs.map((para, pIdx) => {
      const trimmed = para.trim();
      if (!trimmed) {
        return <div key={pIdx} style={{ height: '6px' }} />;
      }

      // Check if paragraph is an image markdown: ![alt](url)
      const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
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
              border: '1px solid rgba(226, 183, 20, 0.25)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
                  backgroundColor: 'rgba(0, 0, 0, 0.4)'
                }}
              >
                {altText}
              </div>
            )}
          </div>
        );
      }

      // Check if paragraph is a bullet point: - or • or *
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
      const cleanPara = isBullet ? trimmed.replace(/^[-•*]\s+/, '') : trimmed;

      // Parse inline markdown links [title](url) as natural inline links
      const parts = [];
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(cleanPara)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanPara.substring(lastIndex, match.index));
        }
        const linkText = match[1];
        const linkUrl = match[2];

        parts.push(
          <a
            key={`link-${pIdx}-${match.index}`}
            href={linkUrl}
            onClick={(e) => {
              if (linkUrl.startsWith('/')) {
                e.preventDefault();
                router.push(linkUrl);
                if (window.innerWidth < 640) setIsMinimized(true);
              }
            }}
            target={linkUrl.startsWith('/') ? '_self' : '_blank'}
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent-gold, #e2b714)',
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              margin: '0 2px'
            }}
          >
            <span>{linkText}</span>
            <ArrowUpRight size={12} style={{ display: 'inline', verticalAlign: 'middle', opacity: 0.85 }} />
          </a>
        );
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < cleanPara.length) {
        parts.push(cleanPara.substring(lastIndex));
      }

      // Parse bold **text** within text parts
      const renderedParts = parts.map((part, i) => {
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
              <strong key={`b-${i}-${bMatch.index}`} style={{ color: 'var(--accent-gold, #e2b714)', fontWeight: 700 }}>
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
      });

      return (
        <div
          key={pIdx}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: isBullet ? '8px' : '0',
            margin: '3px 0',
            lineHeight: 1.65,
            fontSize: '0.9rem',
            wordBreak: 'break-word'
          }}
        >
          {isBullet && (
            <span
              style={{
                color: 'var(--accent-gold, #e2b714)',
                fontSize: '1rem',
                lineHeight: 1.6,
                userSelect: 'none'
              }}
            >
              •
            </span>
          )}
          <div style={{ flex: 1 }}>{renderedParts}</div>
        </div>
      );
    });
  };

  if (isDashboardPage) {
    return null;
  }

  return (
    <>
      {/* 1. Floating Action Trigger Button */}
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
            fontFamily: isAr ? 'var(--font-arabic)' : 'var(--font-english)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(226, 183, 20, 0.25)'
          }}
        >
          <div className="church-ai-trigger-icon">
            <Sparkles size={18} />
            <span className="church-ai-trigger-dot" />
          </div>
          <span className="church-ai-trigger-text">{isAr ? 'مساعد الكنيسة الذكي' : 'Church Assistant'}</span>
        </button>
      )}

      {/* 2. Floating High-End Chat Window */}
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
            width: isMinimized ? '320px' : '420px',
            maxWidth: 'calc(100vw - 32px)',
            height: isMinimized ? '58px' : '650px',
            maxHeight: 'calc(100vh - 48px)',
            backgroundColor: 'rgba(18, 22, 28, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '22px',
            border: '1px solid rgba(226, 183, 20, 0.3)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(226, 183, 20, 0.15)',
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
              background: 'linear-gradient(180deg, rgba(226, 183, 20, 0.14) 0%, rgba(226, 183, 20, 0.04) 100%)',
              borderBottom: isMinimized ? 'none' : '1px solid rgba(226, 183, 20, 0.2)',
              userSelect: 'none'
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
              onClick={() => setIsMinimized(prev => !prev)}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(226, 183, 20, 0.2)',
                  border: '1px solid rgba(226, 183, 20, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold, #e2b714)'
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <h4
                  id="ai-chat-title"
                  style={{
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    color: '#fff',
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
                      display: 'inline-block',
                      boxShadow: '0 0 6px #2ecc71'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {isAr ? 'متصل للخدمة والرعاية' : 'Online for pastoral help'}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Action Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setIsHandoffModalOpen(true)}
                title={isAr ? 'طلب مساعدة خادم / سكرتارية' : 'Human Help / Servant Support'}
                style={{
                  background: 'rgba(226, 183, 20, 0.15)',
                  border: '1px solid rgba(226, 183, 20, 0.4)',
                  color: 'var(--accent-gold, #e2b714)',
                  cursor: 'pointer',
                  padding: '5px 9px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                <HeartHandshake size={14} />
                <span className="hidden sm:inline">{isAr ? 'مساعدة' : 'Help'}</span>
              </button>

              <button
                onClick={() => setSoundEnabled(prev => !prev)}
                title={soundEnabled ? (isAr ? 'كتم الصوت' : 'Mute sound') : (isAr ? 'تفعيل الصوت' : 'Enable sound')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: soundEnabled ? 'var(--accent-gold)' : 'rgba(255,255,255,0.6)',
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
                title={isAr ? 'بدء محادثة جديدة' : 'New conversation'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
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
                  color: 'rgba(255,255,255,0.6)',
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
                  color: 'rgba(255,255,255,0.6)',
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
              {/* Subtle Elegant Privacy Notice */}
              {showPrivacyBanner && (
                <div
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'rgba(226, 183, 20, 0.08)',
                    borderBottom: '1px solid rgba(226, 183, 20, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: 'rgba(255, 255, 255, 0.75)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={12} style={{ color: 'var(--accent-gold, #e2b714)', flexShrink: 0 }} />
                    <span>
                      {isAr
                        ? 'المساعد مخصص للمعلومات والخدمات العامة. سر الاعتراف مقدس وشخصي بالكنيسة.'
                        : 'For public info & church services. Confession is sacred and strictly in-person.'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPrivacyBanner(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    <X size={11} />
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
                  gap: '14px'
                }}
              >
                {messages.map(msg => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAssistant ? 'flex-start' : 'flex-end',
                        maxWidth: '92%',
                        alignSelf: isAssistant ? 'flex-start' : 'flex-end'
                      }}
                    >
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: isAssistant ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                          backgroundColor: isAssistant ? 'rgba(28, 33, 40, 0.95)' : 'linear-gradient(135deg, #d4af37 0%, #b8972e 100%)',
                          background: isAssistant ? 'rgba(28, 33, 40, 0.95)' : 'linear-gradient(135deg, #d4af37 0%, #c49e28 100%)',
                          color: isAssistant ? '#e6edf3' : '#111',
                          border: isAssistant ? '1px solid rgba(226, 183, 20, 0.22)' : 'none',
                          fontSize: '0.9rem',
                          boxShadow: isAssistant ? '0 4px 16px rgba(0, 0, 0, 0.25)' : '0 4px 12px rgba(226, 183, 20, 0.3)',
                          position: 'relative'
                        }}
                      >
                        {renderFormattedText(msg.text)}

                        {/* 1. Interactive Priest Appointment Booking Card */}
                        {isAssistant && msg.action && msg.action.actionId === 'book_appointment' && (
                          <div
                            style={{
                              marginTop: '12px',
                              padding: '14px',
                              borderRadius: '14px',
                              backgroundColor: 'rgba(18, 22, 28, 0.95)',
                              border: '1px solid rgba(226, 183, 20, 0.4)',
                              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                              <span style={{ fontSize: '1.2rem' }}>✝️</span>
                              <div>
                                <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-gold, #e2b714)' }}>
                                  {isAr ? 'حجز موعد اعتراف أو لقاء رعوي' : 'Book Confession Appointment'}
                                </h5>
                                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                                  {isAr ? 'تسجيل مباشر لدى سكرتارية الكنيسة' : 'Direct booking with church secretary'}
                                </span>
                              </div>
                            </div>

                            {bookingForm.successRef ? (
                              <div
                                style={{
                                  padding: '10px',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(46, 204, 113, 0.15)',
                                  border: '1px solid #2ecc71',
                                  textAlign: 'center'
                                }}
                              >
                                <CheckCircle2 size={24} style={{ color: '#2ecc71', margin: '0 auto 6px' }} />
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                                  {isAr ? 'تم تأكيد طلبك بنجاح!' : 'Request Confirmed!'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#2ecc71', marginTop: '2px' }}>
                                  #{bookingForm.successRef}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {bookingForm.error && (
                                  <div style={{ color: '#e74c3c', fontSize: '0.74rem' }}>{bookingForm.error}</div>
                                )}

                                <div>
                                  <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '3px' }}>
                                    {isAr ? 'اختر الأب الكاهن:' : 'Select Priest:'}
                                  </label>
                                  <select
                                    value={bookingForm.priestName}
                                    onChange={e => setBookingForm(prev => ({ ...prev, priestName: e.target.value }))}
                                    style={{
                                      width: '100%',
                                      padding: '7px 10px',
                                      borderRadius: '8px',
                                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                      border: '1px solid rgba(226, 183, 20, 0.3)',
                                      color: '#fff',
                                      fontSize: '0.82rem',
                                      outline: 'none'
                                    }}
                                  >
                                    {priestsList.map(p => (
                                      <option key={p.id} value={p.nameAr} style={{ background: '#1c2128', color: '#fff' }}>
                                        {isAr ? p.nameAr : p.nameEn}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '3px' }}>
                                      {isAr ? 'الاسم بالكامل:' : 'Your Name:'}
                                    </label>
                                    <input
                                      type="text"
                                      value={bookingForm.fullName}
                                      onChange={e => setBookingForm(prev => ({ ...prev, fullName: e.target.value }))}
                                      placeholder={isAr ? 'اسمك الثلاثي' : 'Full Name'}
                                      style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(226, 183, 20, 0.3)',
                                        color: '#fff',
                                        fontSize: '0.82rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '3px' }}>
                                      {isAr ? 'رقم الهاتف *:' : 'Phone *:'}
                                    </label>
                                    <input
                                      type="tel"
                                      value={bookingForm.phone}
                                      onChange={e => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                                      placeholder="01234567890"
                                      style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(226, 183, 20, 0.3)',
                                        color: '#fff',
                                        fontSize: '0.82rem',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        direction: 'ltr',
                                        textAlign: isAr ? 'right' : 'left'
                                      }}
                                    />
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '3px' }}>
                                      {isAr ? 'اليوم المفضل:' : 'Preferred Day:'}
                                    </label>
                                    <input
                                      type="text"
                                      value={bookingForm.date}
                                      onChange={e => setBookingForm(prev => ({ ...prev, date: e.target.value }))}
                                      placeholder={isAr ? 'الجمعة / الأحد' : 'Day / Date'}
                                      style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(226, 183, 20, 0.3)',
                                        color: '#fff',
                                        fontSize: '0.82rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  </div>
                                </div>

                                <button
                                  onClick={handleExecuteAppointmentBooking}
                                  disabled={bookingForm.isSubmitting}
                                  style={{
                                    marginTop: '6px',
                                    padding: '9px 14px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--accent-gold, #e2b714)',
                                    color: '#000',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    border: 'none',
                                    cursor: bookingForm.isSubmitting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(226, 183, 20, 0.3)'
                                  }}
                                >
                                  {bookingForm.isSubmitting ? (
                                    <span>{isAr ? 'جاري تأكيد الحجز...' : 'Booking...'}</span>
                                  ) : (
                                    <>
                                      <span>{isAr ? 'تأكيد وإرسال طلب الموعد' : 'Confirm & Submit Booking'}</span>
                                      <Check size={14} />
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. Interactive Family Membership Quick Card */}
                        {isAssistant && msg.action && msg.action.actionId === 'register_membership' && (
                          <div
                            style={{
                              marginTop: '12px',
                              padding: '14px',
                              borderRadius: '14px',
                              backgroundColor: 'rgba(18, 22, 28, 0.95)',
                              border: '1px solid rgba(226, 183, 20, 0.4)',
                              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                              <span style={{ fontSize: '1.2rem' }}>📋</span>
                              <div>
                                <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-gold, #e2b714)' }}>
                                  {isAr ? 'استمارة عضوية الأسرة الكنسية' : 'Family Membership Registration'}
                                </h5>
                                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                                  {isAr ? 'تسجيل بيانات الأسرة المبدئية مباشرة' : 'Direct family profile submission'}
                                </span>
                              </div>
                            </div>

                            {membershipForm.successRef ? (
                              <div
                                style={{
                                  padding: '10px',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(46, 204, 113, 0.15)',
                                  border: '1px solid #2ecc71',
                                  textAlign: 'center'
                                }}
                              >
                                <CheckCircle2 size={24} style={{ color: '#2ecc71', margin: '0 auto 6px' }} />
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                                  {isAr ? 'تم تسجيل بيانات الأسرة بنجاح!' : 'Family Details Registered!'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#2ecc71', marginTop: '2px' }}>
                                  #{membershipForm.successRef}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {membershipForm.error && (
                                  <div style={{ color: '#e74c3c', fontSize: '0.74rem' }}>{membershipForm.error}</div>
                                )}

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '3px' }}>
                                      {isAr ? 'اسم رب الأسرة *:' : 'Family Head Name *:'}
                                    </label>
                                    <input
                                      type="text"
                                      value={membershipForm.fullName}
                                      onChange={e => setMembershipForm(prev => ({ ...prev, fullName: e.target.value }))}
                                      placeholder={isAr ? 'الاسم الثلاثي' : 'Full Name'}
                                      style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(226, 183, 20, 0.3)',
                                        color: '#fff',
                                        fontSize: '0.82rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '3px' }}>
                                      {isAr ? 'رقم الهاتف *:' : 'Phone *:'}
                                    </label>
                                    <input
                                      type="tel"
                                      value={membershipForm.phone}
                                      onChange={e => setMembershipForm(prev => ({ ...prev, phone: e.target.value }))}
                                      placeholder="01234567890"
                                      style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(226, 183, 20, 0.3)',
                                        color: '#fff',
                                        fontSize: '0.82rem',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        direction: 'ltr',
                                        textAlign: isAr ? 'right' : 'left'
                                      }}
                                    />
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <div style={{ flex: 2 }}>
                                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '3px' }}>
                                      {isAr ? 'العنوان / المنطقة:' : 'Address / Area:'}
                                    </label>
                                    <input
                                      type="text"
                                      value={membershipForm.address}
                                      onChange={e => setMembershipForm(prev => ({ ...prev, address: e.target.value }))}
                                      placeholder={isAr ? 'حدائق القبة' : 'Area / Street'}
                                      style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(226, 183, 20, 0.3)',
                                        color: '#fff',
                                        fontSize: '0.82rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '3px' }}>
                                      {isAr ? 'عدد الأفراد:' : 'Members:'}
                                    </label>
                                    <input
                                      type="number"
                                      value={membershipForm.familyCount}
                                      onChange={e => setMembershipForm(prev => ({ ...prev, familyCount: e.target.value }))}
                                      min={1}
                                      max={20}
                                      style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(226, 183, 20, 0.3)',
                                        color: '#fff',
                                        fontSize: '0.82rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                  <button
                                    onClick={handleExecuteMembershipSubmission}
                                    disabled={membershipForm.isSubmitting}
                                    style={{
                                      flex: 1,
                                      padding: '9px 12px',
                                      borderRadius: '8px',
                                      backgroundColor: 'var(--accent-gold, #e2b714)',
                                      color: '#000',
                                      fontWeight: 700,
                                      fontSize: '0.82rem',
                                      border: 'none',
                                      cursor: membershipForm.isSubmitting ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <span>{isAr ? 'إرسال بيانات الأسرة' : 'Submit Family Info'}</span>
                                    <Check size={13} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      router.push('/register-member');
                                      if (window.innerWidth < 640) setIsMinimized(true);
                                    }}
                                    style={{
                                      padding: '9px 12px',
                                      borderRadius: '8px',
                                      backgroundColor: 'transparent',
                                      border: '1px solid rgba(226, 183, 20, 0.4)',
                                      color: 'var(--accent-gold, #e2b714)',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {isAr ? 'الاستمارة الكاملة' : 'Full Form'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. General Action Link (Schedule / Trips / Donations) */}
                        {isAssistant && msg.action && msg.action.redirectUrl && msg.action.actionId !== 'book_appointment' && msg.action.actionId !== 'register_membership' && (
                          <div style={{ marginTop: '10px' }}>
                            <button
                              onClick={() => {
                                router.push(msg.action!.redirectUrl!);
                                if (window.innerWidth < 640) setIsMinimized(true);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(226, 183, 20, 0.15)',
                                border: '1px solid rgba(226, 183, 20, 0.35)',
                                color: 'var(--accent-gold, #e2b714)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <span>{isAr ? (msg.action.nameAr || 'فتح الخدمة الكنسية') : (msg.action.nameEn || 'Open Church Service')}</span>
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        )}

                        {/* Verified Sources Chips */}
                        {isAssistant && msg.sources && msg.sources.length > 0 && (
                          <div
                            style={{
                              marginTop: '10px',
                              paddingTop: '8px',
                              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '5px'
                            }}
                          >
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', width: '100%' }}>
                              {isAr ? '📌 المصادر الرسمية:' : '📌 Verified Sources:'}
                            </span>
                            {msg.sources.map((src, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => router.push(src.url)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  backgroundColor: 'rgba(226, 183, 20, 0.08)',
                                  border: '1px solid rgba(226, 183, 20, 0.2)',
                                  color: 'var(--accent-gold, #e2b714)',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {src.title}
                                <ArrowUpRight size={10} />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Message Footer: Timestamp and Copy */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '6px',
                            fontSize: '0.66rem',
                            color: isAssistant ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.5)'
                          }}
                        >
                          <span>{msg.timestamp}</span>
                          {isAssistant && (
                            <button
                              onClick={() => copyToClipboard(msg.id, msg.text)}
                              title={isAr ? 'نسخ الرد' : 'Copy'}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: copiedId === msg.id ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.45)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                              {copiedId === msg.id && <span>{isAr ? 'تم النسخ' : 'Copied'}</span>}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Loading Indicator */}
                {isLoading && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      padding: '10px 16px',
                      borderRadius: '18px 18px 18px 4px',
                      backgroundColor: 'rgba(28, 33, 40, 0.95)',
                      border: '1px solid rgba(226, 183, 20, 0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-gold, #e2b714)',
                        display: 'inline-block',
                        animation: 'pulse 1s infinite'
                      }}
                    />
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-gold, #e2b714)',
                        display: 'inline-block',
                        animation: 'pulse 1s infinite 0.2s'
                      }}
                    />
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-gold, #e2b714)',
                        display: 'inline-block',
                        animation: 'pulse 1s infinite 0.4s'
                      }}
                    />
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)', marginInlineStart: '6px' }}>
                      {isAr ? 'جاري تحضير الرد الكنسي...' : 'Consulting church records...'}
                    </span>
                  </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(231, 76, 60, 0.15)',
                      border: '1px solid #e74c3c',
                      color: '#e74c3c',
                      fontSize: '0.8rem',
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
                      <X size={13} />
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestions Horizontal Scroll Bar */}
              {((messages[messages.length - 1]?.suggestedQuestions && messages[messages.length - 1]?.suggestedQuestions!.length > 0) || routeSuggestions.length > 0) && (
                <div
                  style={{
                    padding: '6px 14px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {(messages[messages.length - 1]?.suggestedQuestions || routeSuggestions).slice(0, 5).map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => handleSendMessage(q)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: '16px',
                        backgroundColor: 'rgba(226, 183, 20, 0.1)',
                        border: '1px solid rgba(226, 183, 20, 0.28)',
                        color: '#fff',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(226, 183, 20, 0.22)';
                        e.currentTarget.style.borderColor = 'var(--accent-gold)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(226, 183, 20, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(226, 183, 20, 0.28)';
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(15, 18, 23, 0.98)',
                  borderTop: '1px solid rgba(226, 183, 20, 0.18)'
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
                        ? 'اكتب استفسارك هنا (مثل: إمتى قداس الجمعة أو حجز موعد اعتراف)...'
                        : 'Ask your question here (e.g. When is Friday mass?)...'
                    }
                    maxLength={1000}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '11px 16px',
                      borderRadius: '24px',
                      backgroundColor: 'rgba(28, 33, 40, 0.9)',
                      border: '1px solid rgba(226, 183, 20, 0.25)',
                      color: '#fff',
                      fontSize: '0.88rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      fontFamily: isAr ? 'var(--font-arabic)' : 'var(--font-english)'
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent-gold, #e2b714)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(226, 183, 20, 0.25)')}
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    aria-label={isAr ? 'إرسال السؤال' : 'Send question'}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: inputText.trim() && !isLoading ? 'var(--accent-gold, #e2b714)' : 'rgba(255, 255, 255, 0.1)',
                      color: inputText.trim() && !isLoading ? '#000' : 'rgba(255, 255, 255, 0.4)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: inputText.trim() && !isLoading ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                      boxShadow: inputText.trim() && !isLoading ? '0 4px 12px rgba(226, 183, 20, 0.35)' : 'none'
                    }}
                  >
                    <Send size={18} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
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
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(5px)',
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
              backgroundColor: 'rgba(22, 27, 34, 0.98)',
              borderRadius: '20px',
              border: '1px solid rgba(226, 183, 20, 0.35)',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(226, 183, 20, 0.2)',
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
                    backgroundColor: 'rgba(226, 183, 20, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-gold, #e2b714)'
                  }}
                >
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                    {isAr ? 'تواصل مع خادم / سكرتارية الكنيسة' : 'Contact Church Servant / Office'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)' }}>
                    {isAr ? 'مساعدة شخصية ومتابعة من الخدام المعتمدين' : 'Assistance from church servants'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHandoffModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sacredness & Confession Warning */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(226, 183, 20, 0.08)',
                border: '1px solid rgba(226, 183, 20, 0.25)',
                fontSize: '0.78rem',
                color: '#fff',
                marginBottom: '16px',
                lineHeight: 1.5
              }}
            >
              <strong style={{ color: 'var(--accent-gold, #e2b714)' }}>⚠️ {isAr ? 'تنبيه طقسي هام:' : 'Notice:'} </strong>
              {isAr
                ? 'سر الاعتراف مقدس ويتم شفاهاً وشخصياً فقط مع الأب الكاهن في الكنيسة. برجاء عدم كتابة أسرار اعتراف في هذه الاستمارة.'
                : 'Sacramental confession is strictly in-person with a priest. Please do not submit confession details here.'}
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
                <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#fff' }}>
                  {isAr ? 'تم استلام طلبك بنجاح!' : 'Request Received!'}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
                  {isAr ? 'كود المتابعة المرجعي الخاص بك:' : 'Tracking Reference Code:'}
                </p>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '8px 18px',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: '2px dashed var(--accent-gold, #e2b714)',
                    borderRadius: '8px',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    color: 'var(--accent-gold, #e2b714)',
                    marginBottom: '16px'
                  }}
                >
                  {handoffSuccessCode}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
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
                    backgroundColor: 'var(--accent-gold, #e2b714)',
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
                      fontSize: '0.8rem'
                    }}
                  >
                    {handoffError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: '#fff' }}>
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
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(226, 183, 20, 0.25)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: '#fff' }}>
                    {isAr ? 'رقم الهاتف / الواتساب *' : 'Phone / WhatsApp *'}
                  </label>
                  <input
                    type="tel"
                    value={handoffPhone}
                    onChange={e => setHandoffPhone(e.target.value)}
                    placeholder="01234567890"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(226, 183, 20, 0.25)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      direction: 'ltr',
                      textAlign: isAr ? 'right' : 'left'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: '#fff' }}>
                    {isAr ? 'قسم الاستفسار' : 'Category'}
                  </label>
                  <select
                    value={handoffCategory}
                    onChange={e => setHandoffCategory(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(226, 183, 20, 0.25)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="GENERAL" style={{ background: '#1c2128' }}>{isAr ? 'استفسار عام / خدمات الكنيسة' : 'General Inquiry'}</option>
                    <option value="PASTORAL" style={{ background: '#1c2128' }}>{isAr ? 'استفسار رعوي / مقابلة مع أبونا' : 'Pastoral Meeting'}</option>
                    <option value="MEMBERSHIP" style={{ background: '#1c2128' }}>{isAr ? 'شؤون العضوية واستمارة الأسرة' : 'Membership / Family'}</option>
                    <option value="TECHNICAL" style={{ background: '#1c2128' }}>{isAr ? 'دعم فني في الموقع والحساب' : 'Technical Support'}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px', color: '#fff' }}>
                    {isAr ? 'تفاصيل رسالتك أو استفسارك *' : 'Message *'}
                  </label>
                  <textarea
                    rows={3}
                    value={handoffMessage}
                    onChange={e => setHandoffMessage(e.target.value)}
                    placeholder={isAr ? 'اكتب ما تود الاستفسار عنه...' : 'Describe your inquiry...'}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(226, 183, 20, 0.25)',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="submit"
                    disabled={isSubmittingHandoff}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--accent-gold, #e2b714)',
                      color: '#000',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: 'none',
                      cursor: isSubmittingHandoff ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSubmittingHandoff ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال الطلب' : 'Submit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHandoffModalOpen(false)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.7)',
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
