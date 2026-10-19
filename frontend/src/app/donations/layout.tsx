import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'التبرعات والعطاء الكنسي | Church Donations',
  description: 'الحسابات البنكية الرسمية ووسائل التبرع الآمنة لدعم مشروعات كنيسة السيدة العذراء والشهيد أبي سيفين القبطية الأرثوذكسية وخدمة إخوة الرب.',
  alternates: {
    canonical: '/donations',
  },
  openGraph: {
    title: 'التبرعات والعطاء الكنسي | كنيسة السيدة العذراء والشهيد أبي سيفين',
    description: 'الحسابات البنكية الرسمية ووسائل المساندة والعطاء لخدمات الكنيسة.',
    url: '/donations',
  },
};

export default function DonationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
