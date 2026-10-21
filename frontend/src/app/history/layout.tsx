import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تاريخ كنيستنا والأرشيف الكنسي | Our History & Heritage Archive',
  description: 'رحلة تفاعلية في تاريخ وتراث كنيسة الشهيد العظيم أبي سيفين منذ تأسيسها عام 1955، أرشيف الآباء الكهنة، الخط الزمني، الزيارات البابوية والأسقفية، والوثائق التاريخية النادرة.',
  alternates: {
    canonical: '/history',
  },
  openGraph: {
    title: 'تاريخ كنيستنا والأرشيف الكنسي | كنيسة الشهيد العظيم أبي سيفين',
    description: 'استكشف التراث الكنسي الحي، وسيرة الآباء الكهنة الأجلاء والزيارات التاريخية الموثقة منذ عام 1955.',
    url: '/history',
  },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
