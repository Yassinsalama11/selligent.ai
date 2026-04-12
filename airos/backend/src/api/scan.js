const express  = require('express');
const OpenAI   = require('openai');
const router   = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── POST /api/scan/brand ─────────────────────────────────────────────────── */
router.post('/brand', async (req, res) => {
  const { website, instagram, facebook, whatsapp, company } = req.body;

  if (!website && !instagram && !facebook) {
    return res.json({
      companyName:  company || '',
      description:  '',
      industry:     '',
      country:      '',
      language:     'Arabic + English',
      products:     '',
      tone:         'Professional & friendly',
      socialLinks:  { whatsapp: whatsapp || '' },
    });
  }

  try {
    // Fetch website content
    let websiteText = '';
    if (website) {
      try {
        const response = await fetch(website, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SelligentBot/1.0)' },
          signal: AbortSignal.timeout(8000),
        });
        const html = await response.text();
        // Extract readable text — strip HTML tags
        websiteText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 4000); // Limit for AI
      } catch (err) {
        console.log('Could not fetch website:', err.message);
      }
    }

    const prompt = `
You are an AI that analyzes a business's online presence and extracts key information.

Business name: ${company || 'Unknown'}
Website URL: ${website || 'Not provided'}
Instagram: ${instagram || 'Not provided'}
Facebook: ${facebook || 'Not provided'}
WhatsApp: ${whatsapp || 'Not provided'}

Website content (first 4000 chars):
${websiteText || 'Could not fetch website content'}

Based on the above, extract and return a JSON object with these fields:
- companyName: the actual company/brand name
- description: a 1-2 sentence description of what the business does
- industry: the business industry (eCommerce, Fashion, Food, Electronics, Healthcare, etc.)
- country: the country or region the business operates in
- language: the language(s) they communicate in (Arabic, English, Arabic + English, etc.)
- products: main products or services offered (comma separated, max 5)
- tone: the brand communication tone (Professional & friendly, Casual & fun, Formal, Direct & concise, Warm & personal)

Return ONLY valid JSON, no markdown, no explanation.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    let result;
    try {
      result = JSON.parse(completion.choices[0].message.content.trim());
    } catch {
      result = {
        companyName: company || '',
        description: '',
        industry: 'eCommerce',
        country: 'MENA Region',
        language: 'Arabic + English',
        products: '',
        tone: 'Professional & friendly',
      };
    }

    res.json(result);
  } catch (err) {
    console.error('AI scan error:', err.message);
    res.status(500).json({ error: 'AI scan failed', details: err.message });
  }
});

module.exports = router;
