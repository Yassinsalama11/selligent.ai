import AdminLayout from '@/components/AdminLayout';

export const metadata = {
  title: 'Admin — ChatorAI',
  alternates: {
    canonical: 'https://chatorai.com/admin',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }) {
  return <AdminLayout>{children}</AdminLayout>;
}
