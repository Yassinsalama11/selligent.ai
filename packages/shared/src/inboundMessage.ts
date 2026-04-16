import { z } from 'zod';

export const ChannelSchema = z.enum([
  'whatsapp',
  'instagram',
  'messenger',
  'livechat',
  'api',
  'stripe',
  'twilio',
]);

export const MessageTypeSchema = z.enum(['text', 'image', 'voice', 'document']);

export const InboundCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  avatarUrl: z.string().trim().url().optional(),
});

export const InboundMessageSchema = z.object({
  tenantId: z.string().uuid(),
  channel: ChannelSchema,
  channelCustomerId: z.string().trim().min(1),
  conversationId: z.string().uuid().optional(),
  customer: InboundCustomerSchema.default({}),
  message: z.object({
    externalId: z.string().trim().min(1).optional(),
    direction: z.literal('inbound').default('inbound'),
    type: MessageTypeSchema.default('text'),
    content: z.string().trim().min(1).optional(),
    mediaUrl: z.string().trim().url().optional(),
    sentBy: z.string().trim().min(1).default('customer'),
    metadata: z.record(z.string(), z.unknown()).default({}),
  }),
  receivedAt: z.string().datetime().optional(),
  raw: z.unknown().optional(),
});

export type InboundMessage = z.infer<typeof InboundMessageSchema>;
