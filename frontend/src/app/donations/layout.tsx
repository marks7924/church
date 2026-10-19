import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'التبرعات والعطاء الكنسي | Church Donations',
  description: 'الحسابات البنكية الرسمية ووسائل التبرع الآمنة لدعم مشروعات كنيسة الشهيد العظيم أبي سيفين القبطية الأرثوذكسية وخدمة إخوة الرب.',
  alternates: {
    canonical: '/donations',
  },
  openGraph: {
    title: 'التبرعات والعطاء الكنسي | كنيسة الشهيد العظيم أبي سيفين',
    description: 'الحسابات البنكية الرسمية ووسائل المساندة والعطاء لخدمات الكنيسة.',
    url: '/donations',
  },
};

export default function DonationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
