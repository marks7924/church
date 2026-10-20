'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import { 
  Mail, Send, Inbox, Archive, AlertCircle, CheckCircle, Search, 
  User, RefreshCw, PlusCircle, ArrowLeft, ArrowRight, CornerDownLeft, ShieldCheck, Clock
} from 'lucide-react';
import { API_URL } from '../config';

interface AdminEmailCenterProps {
  token: string | null;
}

export default function AdminEmailCenter({ token }: AdminEmailCenterProps) {
  const { language } = useTheme();
  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [activeFolder, setActiveFolder] = useState<'INBOX' | 'SENT' | 'FAILED'>('INBOX');
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [providerStatus, setProviderStatus] = useState<any>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Compose Modal states
  const [showComposeModal, setShowComposeModal] = useState<boolean>(false);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState<string>('');
  const [recipientResults, setRecipientResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [externalEmail, setExternalEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  // Reply state
  const [replyBody, setReplyBody] = useState<string>('');
  const [replying, setReplying] = useState<boolean>(false);

  const fetchConversations = () => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_URL}/email-center/conversations?folder=${activeFolder}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setConversations(data);
        } else if (data && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
        }
      })
      .catch(err => console.error('Error fetching email conversations:', err))
      .finally(() => setLoading(false));
  };

  const fetchProviderStatus = () => {
    if (!token) return;
    fetch(`${API_URL}/email-center/provider-status`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setProviderStatus(data))
      .catch(err => console.error('Error fetching provider status:', err));
  };

  useEffect(() => {
    fetchConversations();
    fetchProviderStatus();
  }, [token, activeFolder]);

  // Fetch thread messages when a conversation is selected
  useEffect(() => {
    if (!token || !selectedConversation) return;

    fetch(`${API_URL}/email-center/conversations/${selectedConversation.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(err => console.error('Error fetching thread messages:', err));
  }, [token, selectedConversation]);

  // Smart Recipient Search Query
  useEffect(() => {
    if (!token || !recipientSearchQuery || recipientSearchQuery.length < 2) {
      setRecipientResults([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`${API_URL}/email-center/recipients?search=${encodeURIComponent(recipientSearchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setRecipientResults(data);
        })
        .catch(err => console.error('Error searching recipients:', err));
    }, 250);

    return () => clearTimeout(timer);
  }, [token, recipientSearchQuery]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const toEmail = selectedRecipient ? selectedRecipient.email : externalEmail.trim();
    if (!toEmail || !subject.trim() || !bodyText.trim()) {
      alert(isAr ? 'يرجى ملء جميع الحقول المطلوبة واختيار المستلم.' : 'Please fill all required fields.');
      return;
    }

    setSending(true);
    setActionMsg(null);

    try {
      const res = await fetch(`${API_URL}/email-center/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientEmail: toEmail,
          recipientUserId: selectedRecipient?.id || undefined,
          subject: subject.trim(),
          bodyText: bodyText.trim(),
          bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #111;">${bodyText.replace(/\n/g, '<br/>')}</div>`
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? '✓ تم إرسال البريد الإلكتروني بنجاح عبر مزود الخدمة!' : '✓ Email sent successfully via transactional provider!');
        setShowComposeModal(false);
        setSubject('');
        setBodyText('');
        setSelectedRecipient(null);
        setExternalEmail('');
        setRecipientSearchQuery('');
        fetchConversations();
      } else {
        setActionMsg((isAr ? (data.errorAr || data.error) : data.error) || (isAr ? 'فشل إرسال البريد.' : 'Failed to send email.'));
      }
    } catch (err) {
      setActionMsg(isAr ? 'خطأ في الاتصال بالخادم.' : 'Connection error.');
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedConversation || !replyBody.trim()) return;

    setReplying(true);
    setActionMsg(null);

    try {
      const res = await fetch(`${API_URL}/email-center/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          recipientEmail: selectedConversation.primaryEmail,
          subject: selectedConversation.subject.startsWith('Re:') ? selectedConversation.subject : `Re: ${selectedConversation.subject}`,
          bodyText: replyBody.trim(),
          bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #111;">${replyBody.replace(/\n/g, '<br/>')}</div>`
        })
      });

      const data = await res.json();
      if (res.ok) {
        setReplyBody('');
        // Refresh messages in thread
        fetch(`${API_URL}/email-center/conversations/${selectedConversation.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(d => { if (Array.isArray(d)) setMessages(d); });
        setActionMsg(isAr ? '✓ تم إرسال الرد بنجاح!' : '✓ Reply sent successfully!');
      } else {
        setActionMsg(data.error || (isAr ? 'فشل إرسال الرد.' : 'Failed to send reply.'));
      }
    } catch (err) {
      setActionMsg(isAr ? 'خطأ في الاتصال.' : 'Connection error.');
    } finally {
      setReplying(false);
    }
  };

  return (
    <div style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Provider Status Indicator */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '1.25rem',
        marginBottom: '1.8rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(46, 204, 113, 0.15)',
            color: '#2ecc71',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Mail size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              {isAr ? 'مركز البريد الإلكتروني الرسمي للكنيسة' : 'Official Church Admin Email Center'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span>{isAr ? 'مزود الخدمة:' : 'Provider:'} <strong style={{ color: 'var(--accent-gold)' }}>{providerStatus?.outboundProvider || 'Brevo SMTP'}</strong></span>
              <span>•</span>
              <span>{isAr ? 'حالة الاستقبال:' : 'Inbound Route:'} <strong style={{ color: '#2ecc71' }}>{providerStatus?.inboundStatus || 'Webhooks Active'}</strong></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowComposeModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '8px',
              background: 'var(--accent-gold)',
              border: 'none',
              color: '#000000',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <PlusCircle size={16} />
            <span>{isAr ? 'إنشاء رسالة جديدة' : 'Compose Email'}</span>
          </button>
          
          <button
            onClick={fetchConversations}
            title={isAr ? 'تحديث' : 'Refresh'}
            style={{
              padding: '9px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {actionMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(226, 183, 20, 0.12)',
          border: '1px solid var(--accent-gold)',
          color: 'var(--accent-gold)',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '1.5rem'
        }}>
          {actionMsg}
        </div>
      )}

      {/* Main Email Layout: Sidebar Folders + Thread Viewer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {/* Left Column: Folders & Conversation List */}
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
            <button
              onClick={() => { setActiveFolder('INBOX'); setSelectedConversation(null); }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeFolder === 'INBOX' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
                color: activeFolder === 'INBOX' ? '#000000' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {isAr ? 'الوارد (Inbox)' : 'Inbox'}
            </button>
            <button
              onClick={() => { setActiveFolder('SENT'); setSelectedConversation(null); }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeFolder === 'SENT' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
                color: activeFolder === 'SENT' ? '#000000' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {isAr ? 'الصادر (Sent)' : 'Sent'}
            </button>
            <button
              onClick={() => { setActiveFolder('FAILED'); setSelectedConversation(null); }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeFolder === 'FAILED' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
                color: activeFolder === 'FAILED' ? '#000000' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {isAr ? 'غير مكتمل (Failed)' : 'Failed'}
            </button>
          </div>

          {/* Conversations List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '650px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                {isAr ? 'جاري تحميل المحادثات...' : 'Loading conversations...'}
              </div>
            ) : conversations.length > 0 ? (
              conversations.map(conv => {
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(226, 183, 20, 0.12)' : 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                      border: `1px solid ${isSelected ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>
                        {conv.primaryName || conv.primaryEmail}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(conv.lastMessageAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '4px' }}>
                      {conv.subject}
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {conv.snippet || conv.primaryEmail}
                    </p>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                {isAr ? 'لا توجد محادثات في هذا المجلد.' : 'No conversations in this folder.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Thread Messages & Reply Box */}
        <div style={{
          background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '500px'
        }}>
          {selectedConversation ? (
            <div>
              {/* Thread Header */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff' }}>
                  {selectedConversation.subject}
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>{isAr ? 'المشارك:' : 'Participant:'} </span>
                  <strong style={{ color: 'var(--accent-gold)' }}>
                    {selectedConversation.primaryName ? `${selectedConversation.primaryName} (${selectedConversation.primaryEmail})` : selectedConversation.primaryEmail}
                  </strong>
                </div>
              </div>

              {/* Messages Flow */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto', marginBottom: '1.5rem', paddingInlineEnd: '6px' }}>
                {messages.map(msg => {
                  const isOutbound = msg.direction === 'OUTBOUND';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: isOutbound ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: isOutbound ? 'rgba(226, 183, 20, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                        border: `1px solid ${isOutbound ? 'rgba(226, 183, 20, 0.35)' : 'rgba(255, 255, 255, 0.12)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 700, color: isOutbound ? 'var(--accent-gold)' : '#3498db' }}>
                          {isOutbound ? (isAr ? 'الكنيسة (صادر)' : 'Church (Outbound)') : (msg.fromName || msg.fromEmail)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOutbound && (
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: msg.deliveryStatus === 'DELIVERED' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255,255,255,0.1)',
                              color: msg.deliveryStatus === 'DELIVERED' ? '#2ecc71' : 'var(--text-secondary)'
                            }}>
                              {msg.deliveryStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.92rem', color: '#ffffff', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {msg.bodyText}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                <textarea
                  rows={3}
                  required
                  placeholder={isAr ? 'اكتب ردك الرعوي هنا وسيتم إرساله للبريد الإلكتروني مع حفظ التسلسل...' : 'Type your reply here...'}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    marginBottom: '8px'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={replying}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: 'var(--accent-gold)',
                      border: 'none',
                      color: '#000000',
                      fontWeight: 700,
                      cursor: replying ? 'not-allowed' : 'pointer',
                      fontSize: '0.88rem'
                    }}
                  >
                    <Send size={15} />
                    <span>{replying ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال الرد' : 'Send Reply')}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)' }}>
              <Mail size={48} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                {isAr ? 'اختر محادثة من القائمة لعرض تفاصيلها والرد عليها.' : 'Select a conversation to view thread and reply.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal with Smart Recipient Autocomplete */}
      {showComposeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#16161d',
            border: '1px solid var(--accent-gold)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '580px',
            width: '100%',
            direction: isAr ? 'rtl' : 'ltr'
          }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 1.2rem 0', color: '#ffffff' }}>
              {isAr ? 'إنشاء وإرسال بريد إلكتروني رسمي' : 'Compose Official Church Email'}
            </h3>

            <form onSubmit={handleSendEmail}>
              {/* Recipient Search / Select */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'البحث الذكي عن عضو مسجل، أو كتابة بريد خارجي *' : 'Smart Search Registered Member or Enter External Email *'}
                </label>

                {selectedRecipient ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(226, 183, 20, 0.15)',
                    border: '1px solid var(--accent-gold)'
                  }}>
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>{selectedRecipient.fullName}</strong>
                      <span style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', marginInlineStart: '8px' }}>
                        ({selectedRecipient.email})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedRecipient(null); setRecipientSearchQuery(''); }}
                      style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={isAr ? 'اكتب اسم العضو، بريده، أو رقمه القومي...' : 'Type member name, email, or external email...'}
                      value={recipientSearchQuery}
                      onChange={(e) => {
                        setRecipientSearchQuery(e.target.value);
                        setExternalEmail(e.target.value);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#ffffff',
                        fontSize: '0.92rem',
                        boxSizing: 'border-box'
                      }}
                    />

                    {/* Autocomplete Dropdown */}
                    {recipientResults.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '105%',
                        left: 0,
                        right: 0,
                        background: '#1a1a24',
                        border: '1px solid var(--accent-gold)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 10
                      }}>
                        {recipientResults.map(r => (
                          <div
                            key={r.id}
                            onClick={() => {
                              setSelectedRecipient(r);
                              setRecipientResults([]);
                            }}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid rgba(255,255,255,0.06)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <strong style={{ color: '#ffffff', fontSize: '0.88rem' }}>{r.fullName}</strong>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.email}</div>
                            </div>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(46, 204, 113, 0.15)',
                              color: '#2ecc71'
                            }}>
                              {r.role || 'MEMBER'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'موضوع الرسالة *' : 'Subject *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: بخصوص موعد اللقاء الرعوي...' : 'e.g. Pastoral Meeting Confirmation...'}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'نص الرسالة *' : 'Message Body *'}
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder={isAr ? 'اكتب الرسالة الرسمية هنا...' : 'Write your email content here...'}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 700,
                    cursor: sending ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={16} />
                  <span>{sending ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال الآن' : 'Send Email')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
