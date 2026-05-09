import { FlywheelAuthorityPage } from '@/components/seo/FlywheelAuthorityPage';
import { pricingInsightPages } from '@/lib/pseo/flywheel';

const page = pricingInsightPages['zendesk-pricing-breakdown'];

export const metadata = {
  title: page.title,
  description: page.description,
  alternates: {
    canonical: `https://chatorai.com${page.path}`,
  },
};

export default function ZendeskPricingBreakdownPage() {
  return <FlywheelAuthorityPage page={page} structuredType="Article" />;
}
