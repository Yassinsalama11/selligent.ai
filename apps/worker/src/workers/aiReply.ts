import { streamReply } from '@chatorai/ai-core';
import { repos } from '@chatorai/db';
import { z } from 'zod';

import { buildRealtimeEnvelope, publishRealtimeEvent } from '../lib/realtime';

const aiReplyJobSchema = z.object({
  tenantId: z.string().uuid(),
  conversationId: z.string().uuid(),
  customerId: z.string().uuid(),
  lastMessage: z.string().trim().min(1),
});

export async function processAiReply(jobData: unknown) {
  const payload = aiReplyJobSchema.parse(jobData);
  const [customer, history] = await Promise.all([
    repos.customers.getById(payload.tenantId, payload.customerId),
    repos.messages.list(payload.tenantId, payload.conversationId, { limit: 6 }),
  ]);

  let text = '';
  for await (const chunk of streamReply({
    tenantId: payload.tenantId,
    customer: customer || undefined,
    lastMessage: payload.lastMessage,
    history: history.map((message: any) => ({
      direction: message.direction as 'inbound' | 'outbound',
      content: message.content || '',
    })),
  })) {
    if (chunk.type === 'text') {
      text += chunk.delta;
    }
  }

  if (text.trim()) {
    await publishRealtimeEvent(buildRealtimeEnvelope(
      payload.tenantId,
      'conversations',
      'ai:suggestion',
      {
        conversationId: payload.conversationId,
        suggestedReply: text.trim(),
      },
    ));
  }

  return {
    conversationId: payload.conversationId,
    suggestedReply: text.trim(),
  };
}
