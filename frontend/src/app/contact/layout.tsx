import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تواصل مع الكنيسة | Contact Us',
  description: 'أرقام التواصل الرسمية، البريد الإلكتروني، وموقع كنيسة السيدة العذراء والشهيد أبي سيفين القبطية الأرثوذكسية على الخريطة.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'تواصل مع الكنيسة | كنيسة السيدة العذراء والشهيد أبي سيفين',
    description: 'معلومات الاتصال المباشرة وعناوين كنيسة السيدة العذراء والشهيد أبي سيفين.',
    url: '/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
