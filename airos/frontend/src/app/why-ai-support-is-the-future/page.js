import { FlywheelAuthorityPage } from '@/components/seo/FlywheelAuthorityPage';
import { discussionPages } from '@/lib/pseo/flywheel';

const page = discussionPages['why-ai-support-is-the-future'];

export const metadata = {
  title: page.title,
  description: page.description,
  alternates: {
    canonical: `https://chatorai.com${page.path}`,
  },
};

export default function WhyAiSupportIsTheFuturePage() {
  return <FlywheelAuthorityPage page={page} structuredType="Article" />;
}
