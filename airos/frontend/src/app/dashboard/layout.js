import DashboardLayout from '@/components/DashboardLayout';

export const metadata = { title: 'Dashboard — Selligent.ai' };

export default function Layout({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
