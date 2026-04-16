export const QUEUE_NAMES = {
  inboundProcess: 'inbound.process',
  outboundSend: 'outbound.send',
  aiReply: 'ai.reply',
  evalRun: 'eval.run',
} as const;

export const REALTIME_CHANNEL = 'realtime:tenant';

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
