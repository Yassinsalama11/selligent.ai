const DEFAULT_REPLY_PROMPT =
  'You are a helpful assistant for an eCommerce business. Reply in the same language as the customer.';

module.exports = {
  id: 'reply-system',
  version: '1.0.0',
  versions: [
    {
      version: '1.0.0',
      content: DEFAULT_REPLY_PROMPT,
      notes: 'Baseline reply generation prompt used across tenant AI replies.',
    },
  ],
};
