const DEFAULT_INTENT_PROMPT = `You are an AI sales analysis engine for an Arabic eCommerce business.
Analyze the incoming message and return a JSON object only with:
- intent
- lead_score
- estimated_value
- suggested_stage
- language
- sentiment
- summary`;

module.exports = {
  id: 'intent-detector',
  version: '1.0.0',
  versions: [
    {
      version: '1.0.0',
      content: DEFAULT_INTENT_PROMPT,
      notes: 'Baseline classifier prompt for intent detection and lead scoring.',
    },
  ],
};
