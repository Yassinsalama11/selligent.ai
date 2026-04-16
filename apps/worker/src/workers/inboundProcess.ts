import { repos } from '@chatorai/db';
import { type InboundMessage, InboundMessageSchema } from '@chatorai/shared';

import { aiReplyQueue } from '../lib/queues';
import { buildRealtimeEnvelope, publishRealtimeEvent } from '../lib/realtime';

export async function processInboundMessage(jobData: InboundMessage) {
  const payload = InboundMessageSchema.parse(jobData);
  const customer = await repos.customers.getOrCreate(payload.tenantId, {
    channel: payload.channel,
    channelCustomerId: payload.channelCustomerId,
    name: payload.customer.name,
    phone: payload.customer.phone,
    avatar: payload.customer.avatarUrl,
  });

  if (payload.customer.email) {
    await repos.customers.update(payload.tenantId, customer.id, {
      email: payload.customer.email,
    }).catch(() => null);
  }

  const conversation = payload.conversationId
    ? (await repos.conversations.getById(payload.tenantId, payload.conversationId))
      || (await repos.conversations.getOrCreate(payload.tenantId, customer.id, payload.channel))
    : await repos.conversations.getOrCreate(payload.tenantId, customer.id, payload.channel);

  const message = await repos.messages.save(payload.tenantId, conversation.id, {
    direction: 'inbound',
    type: payload.message.type,
    content: payload.message.content,
    mediaUrl: payload.message.mediaUrl,
    sentBy: payload.message.sentBy,
    metadata: {
      ...payload.message.metadata,
      externalId: payload.message.externalId,
      receivedAt: payload.receivedAt || new Date().toISOString(),
    },
  });

  await publishRealtimeEvent(buildRealtimeEnvelope(
    payload.tenantId,
    'conversations',
    'message:new',
    {
      channel: payload.channel,
      conversation,
      customer,
      message,
    },
  ));

  if (payload.message.type === 'text' && payload.message.content) {
    await aiReplyQueue.add('ai-suggest', {
      tenantId: payload.tenantId,
      conversationId: conversation.id,
      customerId: customer.id,
      lastMessage: payload.message.content,
    });
  }

  return {
    tenantId: payload.tenantId,
    customerId: customer.id,
    conversationId: conversation.id,
    messageId: message.id,
  };
}
