import React from 'react';
import { StructuredData } from '@/components/seo/StructuredData';
import {
  buildBrandNode,
  buildJsonLdGraph,
  buildOfferNode,
  buildOrganizationNode,
  buildProductNode,
  buildSoftwareApplicationNode,
  buildWebsiteNode,
} from '@/lib/site-schema';

export const GlobalSchema = () => {
  const graph = buildJsonLdGraph([
    buildOrganizationNode(),
    buildBrandNode(),
    buildOfferNode(),
    buildWebsiteNode(),
    buildSoftwareApplicationNode(),
    buildProductNode(),
  ]);

  return <StructuredData id="global-entity-graph" data={graph} />;
};
