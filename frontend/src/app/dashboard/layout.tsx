import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'لوحة التحكم الكنسية | Church Dashboard',
  description: 'لوحة التحكم الإدارية والرعوية لكنيسة السيدة العذراء والشهيد أبي سيفين.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
