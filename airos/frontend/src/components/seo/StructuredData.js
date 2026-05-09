import React from 'react';
import Script from 'next/script';

export function StructuredData({ id, data }) {
  if (!data) return null;

  return (
    <Script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
