'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle2, Circle, Flame, ArrowRight, RotateCcw, 
  BookOpen, Sparkles, Clock, Check, ChevronDown, ChevronUp 
} from 'lucide-react';
import { API_URL } from '../config';

interface PlanSummary {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  estimatedDays: number;
  totalSessions: number;
  userProgress?: {
    status: string;
    completedDays: number[];
    lastReadAt?: string;
  } | null;
}

interface BibleReadingPlansViewProps {
  token: string | null;
  onNavigateToPassage: (bookSlug: string, chapter: number) => void;
}

export default function BibleReadingPlansView({
  token,
  onNavigateToPassage
}: BibleReadingPlansViewProps) {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string | null>(null);
  const [activePlanDetail, setActivePlanDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/fy/bible/plans`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [token]);

  const loadPlanDetail = async (slug: string) => {
    setSelectedPlanSlug(slug);
    setLoadingDetail(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/fy/bible/plans/${slug}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setActivePlanDetail(data);
      }
    } catch (err) {
      console.error('Error fetching plan details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleJoinPlan = async (slug: string) => {
    if (!token) {
      alert('يرجى تسجيل الدخول لبدء ومتابعة خطط القراءة.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/fy/bible/plans/${slug}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchPlans();
        await loadPlanDetail(slug);
      }
    } catch (err) {
      console.error('Error joining plan:', err);
    }
  };

  const handleToggleSession = async (slug: string, dayNumber: number) => {
    if (!token) {
      alert('يرجى تسجيل الدخول لتسجيل تقدم القراءة.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/fy/bible/plans/${slug}/complete-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dayNumber })
      });
      if (res.ok) {
        await loadPlanDetail(slug);
        await fetchPlans();
      }
    } catch (err) {
      console.error('Error updating plan session:', err);
    }
  };

  const handleRestartPlan = async (slug: string) => {
    if (!window.confirm('هل تريد إعادة بدء هذه الخطة من اليوم الأول؟')) return;
    try {
      const res = await fetch(`${API_URL}/fy/bible/plans/${slug}/restart`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await loadPlanDetail(slug);
        await fetchPlans();
      }
    } catch (err) {
      console.error('Error restarting plan:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg md:text-xl text-amber-400 flex items-center gap-2">
            <Calendar size={22} /> خطط ورحلات القراءة الموجهة
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            خطط منهجية ميسرة تساعدك على قراءة ودراسة أسفار الكتاب المقدس بانتظام وتتبع تقدمك اليومي
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const completedCount = plan.userProgress?.completedDays?.length || 0;
          const percentage = plan.estimatedDays > 0 
            ? Math.min(100, Math.round((completedCount / plan.estimatedDays) * 100))
            : 0;
          const isStarted = Boolean(plan.userProgress);

          return (
            <div 
              key={plan.id}
              className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                selectedPlanSlug === plan.slug
                  ? 'bg-amber-950/20 border-amber-500/50 shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    ⏱️ {plan.estimatedDays} يوماً
                  </span>
                  {isStarted && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Flame size={14} /> {percentage}%
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-base text-slate-100 mb-1.5">{plan.titleAr}</h4>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                  {plan.descriptionAr}
                </p>

                {/* Progress bar if started */}
                {isStarted && (
                  <div className="space-y-1.5 mb-4">
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>أنجزت {completedCount} من {plan.estimatedDays} يوماً</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex gap-2">
                {!isStarted ? (
                  <button
                    type="button"
                    onClick={() => handleJoinPlan(plan.slug)}
                    className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
                  >
                    بدء الخطة الآن
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => loadPlanDetail(plan.slug)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    <span>متابعة القراءة</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan Details & Sessions Drawer / Panel */}
      {selectedPlanSlug && activePlanDetail && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 animate-in fade-in duration-200 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-amber-400">تفاصيل الخطة وجلسات القراءة</span>
              <h3 className="font-bold text-xl text-slate-100">{activePlanDetail.titleAr}</h3>
              <p className="text-xs text-slate-400 mt-1">{activePlanDetail.descriptionAr}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRestartPlan(activePlanDetail.slug)}
                className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition"
                title="إعادة بدء الخطة من البداية"
              >
                <RotateCcw size={14} /> إعادة البدء
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlanSlug(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Sessions List */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-300">أيام وجلسات القراءة:</h4>
            {activePlanDetail.sessions?.map((sess: any) => {
              const isCompleted = activePlanDetail.userProgress?.completedDays?.includes(sess.dayNumber);

              return (
                <div 
                  key={sess.id}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCompleted 
                      ? 'bg-emerald-950/20 border-emerald-500/30' 
                      : 'bg-slate-800/40 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleSession(activePlanDetail.slug, sess.dayNumber)}
                      className={`mt-0.5 p-1 rounded-full transition ${
                        isCompleted ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={22} fill="currentColor" className="text-emerald-900" /> : <Circle size={22} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-400">اليوم {sess.dayNumber}:</span>
                        <h5 className="font-bold text-sm text-slate-100">{sess.titleAr}</h5>
                      </div>
                      {sess.reflectionQuestionAr && (
                        <p className="text-xs text-slate-400 mt-1">
                          💡 {sess.reflectionQuestionAr}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reading links */}
                  <div className="flex items-center gap-2 pr-8 sm:pr-0">
                    {sess.references && sess.references.length > 0 && sess.references.map((ref: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onNavigateToPassage(ref.bookSlug, ref.chapter)}
                        className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition"
                      >
                        <BookOpen size={13} /> {ref.referenceAr || `${ref.bookSlug} ${ref.chapter}`}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
