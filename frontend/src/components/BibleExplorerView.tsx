'use client';

import React, { useState, useEffect } from 'react';
import { 
  Milestone, Users, MapPin, BookOpen, ExternalLink, Search, 
  Sparkles, Clock, Compass, ChevronRight 
} from 'lucide-react';
import { API_URL } from '../config';

interface TimelineEvent {
  id: string;
  slug: string;
  period: string;
  periodNameAr: string;
  periodNameEn: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  orderIndex: number;
  references?: any[];
  people?: string[];
  places?: string[];
}

interface BiblePerson {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  roleAr: string;
  roleEn: string;
  bioAr: string;
  bioEn: string;
  references?: any[];
  relations?: any[];
  events?: string[];
}

interface BiblePlace {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  regionAr?: string;
  references?: any[];
}

interface BibleExplorerViewProps {
  onNavigateToPassage: (bookSlug: string, chapter: number) => void;
}

export default function BibleExplorerView({
  onNavigateToPassage
}: BibleExplorerViewProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'people' | 'places'>('timeline');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [people, setPeople] = useState<BiblePerson[]>([]);
  const [places, setPlaces] = useState<BiblePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/fy/bible/timeline`).then(r => r.json()),
      fetch(`${API_URL}/fy/bible/people`).then(r => r.json()),
      fetch(`${API_URL}/fy/bible/places`).then(r => r.json())
    ])
      .then(([tData, pData, plData]) => {
        setEvents(Array.isArray(tData) ? tData : []);
        setPeople(Array.isArray(pData) ? pData : []);
        setPlaces(Array.isArray(plData) ? plData : []);
      })
      .catch(err => console.error('Error fetching explorer data:', err))
      .finally(() => setLoading(false));
  }, []);

  const periods = [
    { key: 'ALL', nameAr: 'كل العصور' },
    { key: 'PATRIARCHS', nameAr: 'الآباء والبدايات' },
    { key: 'EXODUS', nameAr: 'الخروج والبرية' },
    { key: 'JUDGES', nameAr: 'القضاة' },
    { key: 'KINGDOM', nameAr: 'المملكة والملوك' },
    { key: 'EXILE', nameAr: 'السبي والرجوع' },
    { key: 'GOSPELS', nameAr: 'تجسد المسيح والخدمة' },
    { key: 'CHURCH', nameAr: 'الكنيسة الأولى' }
  ];

  const filteredEvents = events.filter(e => {
    const matchesPeriod = selectedPeriod === 'ALL' || e.period === selectedPeriod;
    const matchesSearch = !searchQuery || 
      e.titleAr.includes(searchQuery) || 
      e.descriptionAr.includes(searchQuery);
    return matchesPeriod && matchesSearch;
  });

  const filteredPeople = people.filter(p =>
    !searchQuery || 
    p.nameAr.includes(searchQuery) || 
    p.roleAr.includes(searchQuery) || 
    p.bioAr.includes(searchQuery)
  );

  const filteredPlaces = places.filter(pl =>
    !searchQuery || 
    pl.nameAr.includes(searchQuery) || 
    pl.descriptionAr.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg md:text-xl text-amber-400 flex items-center gap-2">
            <Compass size={22} /> المستكشف الكتابي التفاعلي
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            رحلة بصرية عبر التاريخ والخط الزمني وأبرز شخصيات وأماكن الكتاب المقدس
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'timeline' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Milestone size={14} /> الخط الزمني ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('people')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'people' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} /> الشخصيات ({people.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('places')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'places' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin size={14} /> الأماكن ({places.length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3.5 top-3 text-slate-400" />
          <input 
            type="text"
            placeholder="ابحث في الأحداث، الشخصيات، أو الأماكن..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        {activeTab === 'timeline' && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {periods.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelectedPeriod(p.key)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                  selectedPeriod === p.key ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {p.nameAr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">
          جاري تحميل بيانات المستكشف الكتابي...
        </div>
      ) : activeTab === 'timeline' ? (
        /* TIMELINE VIEW */
        <div className="relative border-r-2 border-amber-500/30 pr-6 mr-3 space-y-8">
          {filteredEvents.map((event, idx) => (
            <div key={event.id} className="relative group">
              {/* Dot */}
              <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-amber-400 group-hover:scale-125 transition-transform" />

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {event.periodNameAr}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">{event.titleEn}</span>
                </div>

                <h4 className="font-bold text-base md:text-lg text-slate-100">{event.titleAr}</h4>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                  {event.descriptionAr}
                </p>

                {/* Connected References */}
                {event.references && event.references.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-400">الشواهد:</span>
                    {event.references.map((ref: any, rIdx: number) => (
                      <button
                        key={rIdx}
                        type="button"
                        onClick={() => onNavigateToPassage(ref.bookSlug, ref.chapter)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1 transition"
                      >
                        <BookOpen size={12} /> {ref.referenceAr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'people' ? (
        /* PEOPLE PROFILES */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPeople.map((person) => (
            <div 
              key={person.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-base text-amber-300">{person.nameAr}</h4>
                  <span className="text-xs text-slate-500 font-sans">{person.nameEn}</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 border border-slate-700">
                  {person.roleAr}
                </span>
              </div>

              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                {person.bioAr}
              </p>

              {person.references && person.references.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2">
                  {person.references.map((ref: any, rIdx: number) => (
                    <button
                      key={rIdx}
                      type="button"
                      onClick={() => onNavigateToPassage(ref.bookSlug, ref.chapter)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition"
                    >
                      <BookOpen size={12} /> {ref.referenceAr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* PLACES PROFILES */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlaces.map((place) => (
            <div 
              key={place.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-base text-emerald-300">{place.nameAr}</h4>
                  <span className="text-xs text-slate-500 font-sans">{place.nameEn}</span>
                </div>
                {place.regionAr && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-900/50">
                    📍 {place.regionAr}
                  </span>
                )}
              </div>

              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                {place.descriptionAr}
              </p>

              {place.references && place.references.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2">
                  {place.references.map((ref: any, rIdx: number) => (
                    <button
                      key={rIdx}
                      type="button"
                      onClick={() => onNavigateToPassage(ref.bookSlug, ref.chapter)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition"
                    >
                      <BookOpen size={12} /> {ref.referenceAr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
