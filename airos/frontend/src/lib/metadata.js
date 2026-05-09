export const SITE_URL = 'https://chatorai.com';

export function buildCanonicalMetadata({ title, description, path }) {
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}${path === '/' ? '' : path}`,
    },
  };
}

export function buildNoIndexMetadata({ title, description, path, follow = false }) {
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}${path === '/' ? '' : path}`,
    },
    robots: {
      index: false,
      follow,
    },
  };
}
