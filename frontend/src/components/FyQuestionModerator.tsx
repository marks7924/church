'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import { 
  HelpCircle, CheckCircle, XCircle, EyeOff, Send, Video, Link2, 
  RefreshCw, Archive, Sparkles, ShieldCheck, UserCheck, Eye
} from 'lucide-react';
import { API_URL } from '../config';

interface FyQuestionModeratorProps {
  token: string | null;
}

export default function FyQuestionModerator({ token }: FyQuestionModeratorProps) {
  const { language } = useTheme();
  const isAr = language === 'ar';

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Answering / Publishing modal states
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [answerAr, setAnswerAr] = useState('');
  const [answerEn, setAnswerEn] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [referenceCitation, setReferenceCitation] = useState('');
  const [publishing, setPublishing] = useState(false);

  const fetchSubmissions = () => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_URL}/fy/admin/submissions?status=${statusFilter}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSubmissions(data);
      })
      .catch(err => console.error('Error fetching submissions:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubmissions();
  }, [token, statusFilter]);

  const openAnswerModal = (sub: any) => {
    setSelectedSub(sub);
    setAnswerAr(sub.draftAnswerAr || '');
    setAnswerEn(sub.draftAnswerEn || '');
    setVideoUrl('');
    setReferenceCitation('');
  };

  const handlePublishAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedSub) return;

    if (!answerAr.trim()) {
      alert(isAr ? 'يرجى كتابة نص الإجابة الرعوية بالعربية على الأقل.' : 'Please enter pastoral answer text.');
      return;
    }

    setPublishing(true);
    setActionMsg(null);

    try {
      const res = await fetch(`${API_URL}/fy/admin/submissions/${selectedSub.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          titleAr: selectedSub.questionTitle || selectedSub.title,
          answerAr: answerAr.trim(),
          answerTextAr: answerAr.trim(),
          answerEn: answerEn.trim() || undefined,
          answerTextEn: answerEn.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          mediaUrls: videoUrl.trim() ? [videoUrl.trim()] : [],
          referenceLinks: referenceCitation.trim() ? [referenceCitation.trim()] : []
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? '✓ تم نشر الإجابة رسميًا في بنك الأسئلة مع حماية الخصوصية بالكامل!' : '✓ Question and answer successfully published with strict privacy protection!');
        setSelectedSub(null);
        fetchSubmissions();
      } else {
        setActionMsg(data.error || (isAr ? 'فشل النشر.' : 'Failed to publish.'));
      }
    } catch (err) {
      setActionMsg(isAr ? 'خطأ في الاتصال.' : 'Connection error.');
    } finally {
      setPublishing(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt(isAr ? 'أدخل سبب عدم النشر / الرفض:' : 'Enter rejection reason:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`${API_URL}/fy/admin/submissions/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reason.trim() })
      });

      if (res.ok) {
        setActionMsg(isAr ? '✓ تم رفض السؤال وإشعار العضو.' : '✓ Submission rejected.');
        fetchSubmissions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Top Header */}
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
            background: 'rgba(52, 152, 219, 0.15)',
            color: '#3498db',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HelpCircle size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              {isAr ? 'إشراف ومراجعة أسئلة الإيمان والعقيدة (FY)' : 'FY Questions Pastoral Moderation'}
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {isAr ? 'مراجعة استفسارات الأعضاء وإعداد الإجابات الرعوية وحماية هوية السائلين' : 'Review member questions, draft clergy answers, and enforce anonymity'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchSubmissions}
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

      {/* Moderation Status Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
        {[
          { key: 'PENDING_REVIEW', labelAr: 'بانتظار المراجعة (Pending)', labelEn: 'Pending Review' },
          { key: 'PUBLISHED', labelAr: 'تمت الإجابة والنشر (Published)', labelEn: 'Published' },
          { key: 'REJECTED', labelAr: 'مرفوضة (Rejected)', labelEn: 'Rejected' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === tab.key ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
              color: statusFilter === tab.key ? '#000000' : 'var(--text-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            {isAr ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          {isAr ? 'جاري تحميل الأسئلة...' : 'Loading submissions...'}
        </div>
      ) : submissions.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {submissions.map(sub => (
            <div
              key={sub.id}
              style={{
                background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(52, 152, 219, 0.15)',
                    color: '#3498db'
                  }}>
                    {sub.categorySlug || (isAr ? 'عقيدة وإيمان' : 'Faith')}
                  </span>

                  {sub.isAnonymous ? (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      color: 'var(--accent-gold)',
                      background: 'rgba(226, 183, 20, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      <EyeOff size={12} />
                      <span>{isAr ? 'طلب هوية مجهولة' : 'Anonymous Request'}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {sub.user?.fullName}
                    </span>
                  )}
                </div>

                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
                  {sub.questionTitle || sub.title}
                </h4>

                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  margin: '0 0 1rem 0'
                }}>
                  {sub.questionDetails || sub.content}
                </p>

                {/* Submitter info for clergy only */}
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  background: 'rgba(0,0,0,0.25)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginBottom: '1rem'
                }}>
                  <span>{isAr ? 'المرسل المسجل داخليًا:' : 'Submitter Account:'} </span>
                  <strong style={{ color: '#ffffff' }}>{sub.user?.fullName} ({sub.user?.email})</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                {statusFilter === 'PENDING_REVIEW' && (
                  <>
                    <button
                      onClick={() => openAnswerModal(sub)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px',
                        borderRadius: '6px',
                        background: 'var(--accent-gold)',
                        border: 'none',
                        color: '#000000',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      <Sparkles size={15} />
                      <span>{isAr ? 'صياغة الإجابة ونشرها' : 'Draft Answer & Publish'}</span>
                    </button>

                    <button
                      onClick={() => handleReject(sub.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(231, 76, 60, 0.15)',
                        border: '1px solid #e74c3c',
                        color: '#e74c3c',
                        cursor: 'pointer'
                      }}
                    >
                      <XCircle size={15} />
                    </button>
                  </>
                )}

                {statusFilter === 'PUBLISHED' && (
                  <span style={{ fontSize: '0.82rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} />
                    <span>{isAr ? 'منشور في مكتبة الأسئلة الرسمية' : 'Published in library'}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          {isAr ? 'لا توجد أسئلة في هذا القسم.' : 'No questions in this section.'}
        </div>
      )}

      {/* Answer & Publish Modal */}
      {selectedSub && (
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
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            direction: isAr ? 'rtl' : 'ltr'
          }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#ffffff' }}>
              {isAr ? 'صياغة الإجابة الرعوية واعتماد النشر' : 'Draft Pastoral Answer & Publish'}
            </h3>

            {/* Question Summary */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '1.2rem'
            }}>
              <strong style={{ color: 'var(--accent-gold)', fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
                {selectedSub.questionTitle || selectedSub.title}
              </strong>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#e4e4e7', whiteSpace: 'pre-wrap' }}>
                {selectedSub.questionDetails || selectedSub.content}
              </p>
              
              {selectedSub.isAnonymous && (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <EyeOff size={13} />
                  <span>{isAr ? 'سيتم النشر بهوية مجهولة بالكامل بدون أي ذكر لاسم السائل.' : 'Will be published anonymously with zero identity disclosure.'}</span>
                </div>
              )}
            </div>

            <form onSubmit={handlePublishAnswer}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'نص الإجابة الرعوية (بالعربية) *' : 'Pastoral Answer (Arabic) *'}
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder={isAr ? 'اكتب الشرح الروحي والعقائدي والكنسي...' : 'Write pastoral guidance...'}
                  value={answerAr}
                  onChange={(e) => setAnswerAr(e.target.value)}
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'نص الإجابة (بالإنجليزية - اختياري)' : 'Pastoral Answer (English - Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={answerEn}
                  onChange={(e) => setAnswerEn(e.target.value)}
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'رابط فيديو يوتيوب أو تسجيل توضيحي (اختياري)' : 'Attached Video Link'}
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
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

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'شواهد كتابية ومراجع كنسية (اختياري)' : 'Biblical Reference Citation'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: يوحنا 3:16، رسالة رومية 8:28...' : 'e.g. John 3:16, Romans 8:28'}
                  value={referenceCitation}
                  onChange={(e) => setReferenceCitation(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
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
                  disabled={publishing}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 700,
                    cursor: publishing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {publishing ? (isAr ? 'جاري النشر...' : 'Publishing...') : (isAr ? 'اعتماد ونشر في المكتبة' : 'Approve & Publish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
