'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import { 
  Facebook, RefreshCw, PlusCircle, CheckCircle, Archive, AlertTriangle, 
  ExternalLink, Eye, Image as ImageIcon, Video, Trash2, Send, Check
} from 'lucide-react';
import { API_URL } from '../config';

interface FacebookNewsModeratorProps {
  token: string | null;
}

export default function FacebookNewsModerator({ token }: FacebookNewsModeratorProps) {
  const { language } = useTheme();
  const isAr = language === 'ar';

  const [posts, setPosts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'PUBLISHED' | 'ARCHIVED' | 'FAILED'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Manual import modal states
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualMediaUrl, setManualMediaUrl] = useState('');
  const [importing, setImporting] = useState(false);

  // Publishing editor modal states
  const [publishingPost, setPublishingPost] = useState<any | null>(null);
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [originalPermalink, setOriginalPermalink] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Media size warning states
  const [oversizedWarning, setOversizedWarning] = useState<any | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncGroup = async () => {
    if (!token) return;
    setIsSyncing(true);
    setActionMsg(null);

    try {
      const res = await fetch(`${API_URL}/facebook-news/sync-auto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ groupUrl: 'https://www.facebook.com/share/1cKfdQt232/' })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? (data.messageAr || '✓ تمت المزامنة التلقائية مع جروب فيسبوك بنجاح!') : (data.messageEn || '✓ Auto-synced with Facebook church group!'));
        setStatusFilter('PENDING');
        fetchPosts(false);
      } else {
        setActionMsg(data.error || (isAr ? 'فشلت مزامنة الجروب.' : 'Group sync failed.'));
      }
    } catch (err) {
      setActionMsg(isAr ? 'خطأ في الاتصال أثناء المزامنة.' : 'Connection error during sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchPosts = (triggerAutoSyncOnEmpty: boolean = true) => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_URL}/facebook-news/posts?status=${statusFilter}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const loaded = (data && Array.isArray(data.posts)) ? data.posts : (Array.isArray(data) ? data : []);
        setPosts(loaded);
        if (triggerAutoSyncOnEmpty && statusFilter === 'PENDING' && loaded.length === 0) {
          handleSyncGroup();
        }
      })
      .catch(err => console.error('Error fetching Facebook posts:', err))
      .finally(() => setLoading(false));
  };

  const fetchSyncStatus = () => {
    if (!token) return;
    fetch(`${API_URL}/facebook-news/sync-status`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSyncStatus(data))
      .catch(err => console.error('Error fetching sync status:', err));
  };

  useEffect(() => {
    fetchPosts(true);
    fetchSyncStatus();
  }, [token, statusFilter]);

  const handleManualImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setImporting(true);
    setActionMsg(null);

    try {
      const res = await fetch(`${API_URL}/facebook-news/manual-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          permalink: manualUrl.trim(),
          postText: manualText.trim(),
          content: manualText.trim(),
          authorName: manualAuthor.trim() || undefined,
          mediaUrls: manualMediaUrl ? [manualMediaUrl.trim()] : []
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? '✓ تم استيراد المنشور بنجاح إلى قائمة المراجعة!' : '✓ Post successfully imported for review!');
        setShowManualModal(false);
        setManualUrl('');
        setManualText('');
        setManualAuthor('');
        setManualMediaUrl('');
        setStatusFilter('PENDING');
        fetchPosts(false);
      } else {
        setActionMsg(data.error || (isAr ? 'فشل استيراد المنشور.' : 'Import failed.'));
      }
    } catch (err) {
      setActionMsg(isAr ? 'خطأ في الاتصال بالخادم.' : 'Connection error.');
    } finally {
      setImporting(false);
    }
  };

  const openPublishModal = (post: any) => {
    // Check if media is oversized (> 10MB)
    const hasOversized = post.mediaSizes?.some((size: number) => size > 10 * 1024 * 1024) || (post.mediaSizeTotal > 10 * 1024 * 1024) || (post.totalMediaSize > 10 * 1024 * 1024);
    if (hasOversized) {
      setOversizedWarning({
        post,
        sizeMB: ((post.mediaSizeTotal || post.totalMediaSize || 0) / (1024 * 1024)).toFixed(1)
      });
      return;
    }

    proceedToPublish(post, false);
  };

  const proceedToPublish = (post: any, skipOversizedMedia: boolean) => {
    setOversizedWarning(null);
    setPublishingPost(post);
    const text = post.postText || post.content || '';
    const img = typeof post.mediaUrls?.[0] === 'string' ? post.mediaUrls[0] : (post.mediaUrls?.[0]?.url || '');
    setTitleAr(text.slice(0, 60) || (isAr ? 'خبر من كنيسة أبي سيفين' : 'Church News'));
    setTitleEn(text.slice(0, 60) || 'Church News');
    setDescAr(text);
    setDescEn(text);
    setFeaturedImage(skipOversizedMedia ? '' : img);
    setOriginalPermalink(post.permalink || '');
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !publishingPost) return;
    setIsPublishing(true);
    setActionMsg(null);

    try {
      const res = await fetch(`${API_URL}/facebook-news/posts/${publishingPost.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          titleAr,
          titleEn,
          descriptionAr: descAr,
          contentAr: descAr,
          descriptionEn: descEn,
          contentEn: descEn,
          featuredImage,
          featuredImageUrl: featuredImage,
          originalPermalink
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg(isAr ? '✓ تم نشر الخبر رسميًا على موقع الكنيسة مع رابط المصدر الأصلي!' : '✓ News published with verified original Facebook permalink!');
        setPublishingPost(null);
        fetchPosts();
      } else {
        setActionMsg(data.error || (isAr ? 'فشل النشر.' : 'Failed to publish.'));
      }
    } catch (err) {
      setActionMsg(isAr ? 'خطأ في الاتصال.' : 'Connection error.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/facebook-news/posts/${id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== id));
        setActionMsg(isAr ? '✓ تم أرشفة المنشور.' : '✓ Post archived.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Top Bar with Sync Status */}
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
            background: 'rgba(24, 119, 242, 0.15)',
            color: '#1877f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Facebook size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              {isAr ? 'مزامنة وإشراف منشورات فيسبوك الرسمية' : 'Facebook Posts & News Moderation'}
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {syncStatus?.syncMode === 'MANUAL_IMPORT_ACTIVE'
                ? (isAr ? 'وضع الاستيراد اليدوي المعتمد نشط (مجموعة الكنيسة)' : 'Direct manual import fallback active')
                : (isAr ? 'المزامنة التلقائية قيد الاتصال' : 'Auto synchronization active')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncGroup}
            disabled={isSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#1877f2',
              border: 'none',
              color: '#ffffff',
              fontWeight: 800,
              cursor: isSyncing ? 'wait' : 'pointer',
              fontSize: '0.88rem',
              boxShadow: '0 4px 12px rgba(24, 119, 242, 0.3)',
              opacity: isSyncing ? 0.8 : 1
            }}
          >
            <RefreshCw size={16} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isSyncing ? (isAr ? 'جاري جلب المنشورات...' : 'Syncing Posts...') : (isAr ? 'مزامنة منشورات جروب فيسبوك' : 'Sync Group Posts')}</span>
          </button>

          <button
            onClick={() => setShowManualModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <PlusCircle size={15} />
            <span>{isAr ? 'استيراد يدوي' : 'Manual'}</span>
          </button>
          
          <button
            onClick={() => fetchPosts(false)}
            title={isAr ? 'تحديث القائمة' : 'Refresh'}
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

      {/* Moderation Status Tabs - Fully Phone Responsive */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '10px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        maxWidth: '100%'
      }}>
        {(['PENDING', 'PUBLISHED', 'ARCHIVED', 'FAILED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === tab ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
              color: statusFilter === tab ? '#000000' : 'var(--text-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {tab === 'PENDING' && (isAr ? 'بانتظار المراجعة (Pending)' : 'Pending Review')}
            {tab === 'PUBLISHED' && (isAr ? 'تم النشر كأخبار (Published)' : 'Published News')}
            {tab === 'ARCHIVED' && (isAr ? 'الأرشيف (Archived)' : 'Archived')}
            {tab === 'FAILED' && (isAr ? 'عمليات غير مكتملة (Failed)' : 'Failed')}
          </button>
        ))}
      </div>

      {/* Posts Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <div style={{
            width: '28px',
            height: '28px',
            border: '3px solid rgba(226, 183, 20, 0.2)',
            borderTopColor: 'var(--accent-gold)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px auto'
          }} />
          <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
          <p>{isAr ? 'جاري تحميل المنشورات...' : 'Loading posts...'}</p>
        </div>
      ) : posts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {posts.map(post => (
            <div
              key={post.id}
              style={{
                background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                    {post.authorName || (isAr ? 'مجموعة الكنيسة الرسمية' : 'Church Official Group')}
                  </span>
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1877f2', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', textDecoration: 'none' }}
                  >
                    <span>{isAr ? 'المنشور الأصلي' : 'Original FB'}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <p style={{
                  color: '#e4e4e7',
                  fontSize: '0.92rem',
                  lineHeight: 1.6,
                  margin: '0 0 1rem 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {post.postText || post.content || ''}
                </p>

                {/* Media preview */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <img
                      src={typeof post.mediaUrls[0] === 'string' ? post.mediaUrls[0] : (post.mediaUrls[0]?.url || '')}
                      alt="Post preview"
                      style={{
                        width: '100%',
                        height: '160px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                {statusFilter === 'PENDING' && (
                  <>
                    <button
                      onClick={() => openPublishModal(post)}
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
                      <Check size={16} />
                      <span>{isAr ? 'اعتماد ونشر في أخبار الكنيسة' : 'Approve & Publish'}</span>
                    </button>
                    <button
                      onClick={() => handleArchive(post.id)}
                      title={isAr ? 'أرشفة وتخطي المنشور' : 'Archive post'}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      <Archive size={16} />
                    </button>
                  </>
                )}

                {statusFilter === 'PUBLISHED' && post.publishedNews && (
                  <div style={{ fontSize: '0.82rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} />
                    <span>{isAr ? 'منشور كخبر رسمي' : 'Published as News'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <p>{isAr ? 'لا توجد منشورات في هذا القسم حاليًا.' : 'No posts in this section.'}</p>
        </div>
      )}

      {/* Manual Import Modal */}
      {showManualModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
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
            maxWidth: '520px',
            width: '100%',
            direction: isAr ? 'rtl' : 'ltr'
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#ffffff' }}>
              {isAr ? 'استيراد منشور فيسبوك رسمي' : 'Manual Facebook Post Import'}
            </h3>

            <form onSubmit={handleManualImport}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'رابط المنشور الأصلي الكامل على فيسبوك *' : 'Original Facebook Post URL *'}
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.facebook.com/groups/.../posts/..."
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'نص المنشور الكامل *' : 'Post Content *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'اسم الناشر أو الصفحة (اختياري)' : 'Author / Page Name'}
                </label>
                <input
                  type="text"
                  value={manualAuthor}
                  onChange={(e) => setManualAuthor(e.target.value)}
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
                  {isAr ? 'رابط الصورة المرفقة (اختياري)' : 'Media Image URL'}
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={manualMediaUrl}
                  onChange={(e) => setManualMediaUrl(e.target.value)}
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
                  onClick={() => setShowManualModal(false)}
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
                  disabled={importing}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 700,
                    cursor: importing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {importing ? (isAr ? 'جاري الاستيراد...' : 'Importing...') : (isAr ? 'استيراد لقائمة المراجعة' : 'Import for Review')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Oversized Media Warning Modal */}
      {oversizedWarning && (
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
            background: '#1a1810',
            border: '2px solid #e67e22',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
            direction: isAr ? 'rtl' : 'ltr',
            textAlign: 'center'
          }}>
            <AlertTriangle size={48} style={{ color: '#e67e22', margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.8rem 0', color: '#ffffff' }}>
              {isAr ? 'تنبيه حجم الوسائط المتعددة' : 'Media Size Warning'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
              {isAr
                ? `حجم الوسائط المرفقة (${oversizedWarning.sizeMB} ميجابايت) يتجاوز الحد الموصى به (10 ميجابايت). كيف ترغب في المتابعة؟`
                : `Attached media size (${oversizedWarning.sizeMB}MB) exceeds configured threshold (10MB). How would you like to proceed?`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => proceedToPublish(oversizedWarning.post, false)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--accent-gold)',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'متابعة ورفع الوسائط كما هي' : 'Upload media to website storage'}
              </button>

              <button
                onClick={() => proceedToPublish(oversizedWarning.post, true)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'نشر الخبر بدون نسخ الوسائط الكبيرة' : 'Publish news without copying oversized media'}
              </button>

              <button
                onClick={() => setOversizedWarning(null)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'إلغاء النشر' : 'Cancel publication'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publishing Editor Modal */}
      {publishingPost && (
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
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 1.2rem 0', color: '#ffffff' }}>
              {isAr ? 'محرر نشر الخبر مع رابط فيسبوك المعتمد' : 'Publish Facebook News Editor'}
            </h3>

            <form onSubmit={handlePublishSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {isAr ? 'عنوان الخبر (بالعربية) *' : 'News Title (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {isAr ? 'عنوان الخبر (بالإنجليزية)' : 'News Title (English)'}
                  </label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
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
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'نص الخبر (بالعربية) *' : 'Article Body (Arabic) *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={descAr}
                  onChange={(e) => setDescAr(e.target.value)}
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'رابط المنشور الأصلي فيسبوك (إلزامي للتوثيق) *' : 'Verified Original Facebook Permalink *'}
                </label>
                <input
                  type="url"
                  required
                  value={originalPermalink}
                  onChange={(e) => setOriginalPermalink(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(226, 183, 20, 0.4)',
                    color: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {isAr ? 'صورة الغلاف المميزة' : 'Featured Image URL'}
                </label>
                <input
                  type="url"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
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
                  onClick={() => setPublishingPost(null)}
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
                  disabled={isPublishing}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#000000',
                    fontWeight: 700,
                    cursor: isPublishing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isPublishing ? (isAr ? 'جاري النشر...' : 'Publishing...') : (isAr ? 'نشر رسميًا كخبر' : 'Publish Official News')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
