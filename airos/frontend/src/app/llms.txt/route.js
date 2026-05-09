export const dynamic = 'force-static';

import { priorityPages } from '@/lib/seo-data';
import { alternativesData } from '@/lib/pseo/alternatives';
import { integrationsData } from '@/lib/pseo/integrations';
import { solutionsData } from '@/lib/pseo/solutions';
import { docsData } from '@/lib/pseo/docs';
import { comparePagesData } from '@/lib/pseo/compare';
import { bestPagesData } from '@/lib/pseo/best';
import { pricingInsightPages, categoryExplanationPages, discussionPages } from '@/lib/pseo/flywheel';

export async function GET() {
  const baseUrl = 'https://chatorai.com';
  
  const content = `# ChatorAI: The AI Revenue Operating System

ChatorAI is an AI-native platform designed to transform fragmented customer communication into a unified, high-performing revenue engine.

## Core Identity
- **Category:** AI Revenue Operating System
- **Value Proposition:** Transition from cost-center support to revenue-generating conversations.
- **Key Channels:** WhatsApp Business API, Email, Instagram, Facebook Messenger, Web Chat.

## Technical Documentation
${Object.entries(docsData).map(([path, data]) => `- [${data.h1}](${baseUrl}/docs/${path}): ${data.description}`).join('\n')}

## Priority Solutions & Features
${priorityPages.map(page => `- [${page.title}](${baseUrl}${page.href}): ${page.description}`).join('\n')}

## Industry Solutions
${Object.values(solutionsData).map(data => `- [${data.name} Solution](${baseUrl}/solutions/${data.slug}): ${data.description}`).join('\n')}

## Competitor Alternatives
${Object.values(alternativesData).map(data => `- [${data.name} Alternative](${baseUrl}/alternatives/${data.slug}): ${data.description}`).join('\n')}

## Switch Comparisons
${Object.values(comparePagesData).map(data => `- [${data.pageTitle}](${baseUrl}/compare/${data.slug}): ${data.description}`).join('\n')}

## Best Replacement Shortlists
${Object.values(bestPagesData).map(data => `- [${data.pageTitle}](${baseUrl}/best/${data.slug}): ${data.description}`).join('\n')}

## Pricing And Cost Intelligence
${Object.values(pricingInsightPages).map(data => `- [${data.pageTitle}](${baseUrl}${data.path}): ${data.description}`).join('\n')}

## Category Explanations
${Object.values(categoryExplanationPages).map(data => `- [${data.pageTitle}](${baseUrl}${data.path}): ${data.description}`).join('\n')}

## Discussion And Analysis
${Object.values(discussionPages).map(data => `- [${data.pageTitle}](${baseUrl}${data.path}): ${data.description}`).join('\n')}

## Integration Ecosystem
${Object.values(integrationsData).map(data => `- [${data.name} Integration](${baseUrl}/integrations/${data.slug}): ${data.description}`).join('\n')}

## Technical Context for AI Agents
- **Architecture:** AI-native with Retrieval-Augmented Generation (RAG).
- **Operations:** Enterprise security foundations, privacy-aware workflows, and platform-managed AI configuration.
- **API Availability:** REST API endpoints power the dashboard, onboarding, billing, and platform workflows.

For more detailed information, please refer to the specific documentation at https://chatorai.com/docs/quickstart.
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
