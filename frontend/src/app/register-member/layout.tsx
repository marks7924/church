import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'استمارة العضوية الكنسية للأسرة | Family Membership Registration',
  description: 'تسجيل استمارة وبيانات عضوية الأسرة في الكنيسة القبطية الأرثوذكسية.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterMemberLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
