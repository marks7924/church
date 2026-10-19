import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الخدمات والأنشطة الكنسية | Church Ministries',
  description: 'تعرف على كافة الأسر والخدمات والأنشطة الرعوية في كنيسة السيدة العذراء والشهيد أبي سيفين، من مدارس الأحد، خدمة الشباب، الرعاية الاجتماعية والخدمات الطبية.',
  alternates: {
    canonical: '/ministries',
  },
  openGraph: {
    title: 'الخدمات والأنشطة الكنسية | كنيسة السيدة العذراء والشهيد أبي سيفين',
    description: 'دليل الأنشطة والخدمات الرعوية والتعليمية للأسر والشباب والأطفال.',
    url: '/ministries',
  },
};

export default function MinistriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
