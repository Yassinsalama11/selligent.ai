import React from 'react';
import { SeoPageLayout } from '@/components/seo/SeoPageLayout';

export default function DocPageShell({ children, currentPath }) {
  return (
    <SeoPageLayout pagePath={currentPath} contentClassName="space-y-10">
      {children}
    </SeoPageLayout>
  );
}
