import { FlywheelAuthorityPage } from '@/components/seo/FlywheelAuthorityPage';
import { categoryExplanationPages } from '@/lib/pseo/flywheel';

const page = categoryExplanationPages['what-is-ai-revenue-system'];

export const metadata = {
  title: page.title,
  description: page.description,
  alternates: {
    canonical: `https://chatorai.com${page.path}`,
  },
};

export default function WhatIsAiRevenueSystemPage() {
  return <FlywheelAuthorityPage page={page} structuredType="Article" />;
}
