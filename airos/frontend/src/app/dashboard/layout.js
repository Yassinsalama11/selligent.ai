import DashboardLayout from '@/components/DashboardLayout';

export const metadata = {
  title: 'Dashboard — ChatorAI',
  alternates: {
    canonical: 'https://chatorai.com/dashboard',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
