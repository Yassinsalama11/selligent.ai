export const dynamic = 'force-static';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/blog', '/best/', '/careers', '/changelog', '/compare/', '/contact', '/cookies', '/demo', '/docs/', '/features/', '/integrations/', '/alternatives/', '/solutions/', '/press', '/privacy', '/security', '/status', '/terms', '/llms.txt', '/ai-revenue-operating-system'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/login', '/signup', '/reset-password', '/verify-email', '/accept-invite', '/billing', '/settings', '/search'],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Googlebot', 'Google-Extended', 'Bingbot'],
        allow: ['/', '/about', '/blog', '/best/', '/careers', '/changelog', '/compare/', '/contact', '/cookies', '/demo', '/docs/', '/features/', '/integrations/', '/alternatives/', '/solutions/', '/press', '/privacy', '/security', '/status', '/terms', '/llms.txt', '/ai-revenue-operating-system'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/login', '/signup', '/reset-password', '/verify-email', '/accept-invite', '/billing', '/settings', '/search'],
      },
    ],
    sitemap: 'https://chatorai.com/sitemap.xml',
  };
}
