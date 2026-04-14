import DashboardLayout from '@/components/DashboardLayout';

export const metadata = { title: 'Dashboard — ChatOrAI' };

export default function Layout({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
