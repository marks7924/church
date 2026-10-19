import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'عن الكنيسة والآباء الكهنة | About Our Church',
  description: 'تعرف على تاريخ كنيسة السيدة العذراء والشهيد أبي سيفين القبطية الأرثوذكسية، ورعاة الكنيسة من الآباء الأجلاء والخدمات الروحية.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'عن الكنيسة والآباء الكهنة | كنيسة السيدة العذراء والشهيد أبي سيفين',
    description: 'تاريخ الكنيسة القبطية الأرثوذكسية ورعاتها من الآباء الكهنة ونهجها الروحي.',
    url: '/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
