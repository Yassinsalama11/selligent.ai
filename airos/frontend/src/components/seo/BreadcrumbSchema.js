import React from 'react';
import { StructuredData } from '@/components/seo/StructuredData';
import { buildBreadcrumbNode } from '@/lib/site-schema';

export const BreadcrumbSchema = ({ items, pagePath = '/' }) => {
  return (
    <StructuredData
      id={`breadcrumb-schema-${pagePath.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}`}
      data={buildBreadcrumbNode(items, pagePath)}
    />
  );
};
