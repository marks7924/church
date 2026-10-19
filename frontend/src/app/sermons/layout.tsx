import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'العظات والكلمات الروحية | Sermons & Spiritual Teachings',
  description: 'مكتبة العظات والكلمات الروحية لآباء كنيسة السيدة العذراء والشهيد أبي سيفين القبطية الأرثوذكسية، مع إمكانية الاستماع والمشاهدة.',
  alternates: {
    canonical: '/sermons',
  },
  openGraph: {
    title: 'العظات والكلمات الروحية | كنيسة السيدة العذراء والشهيد أبي سيفين',
    description: 'مكتبة العظات والدروس الروحية والتأملات الإنجيلية لآباء الكنيسة.',
    url: '/sermons',
  },
};

export default function SermonsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
