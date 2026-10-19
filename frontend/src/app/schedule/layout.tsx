import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'مواعيد القداسات والصلوات | Liturgy Schedules',
  description: 'تعرف على المواعيد الأسبوعية للقداسات الإلهية، صلوات العشية، والتسبحة، ومواعيد الأعياد والمناسبات الكنسية في كنيسة الشهيد العظيم أبي سيفين.',
  alternates: {
    canonical: '/schedule',
  },
  openGraph: {
    title: 'مواعيد القداسات والصلوات الإلهية | كنيسة الشهيد العظيم أبي سيفين',
    description: 'جدول مواعيد القداسات الأسبوعية والمناسبات الكنسية القبطية والصلوات الإلهية.',
    url: '/schedule',
  },
};

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
