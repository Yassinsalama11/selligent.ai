import { streamReply } from '@chatorai/ai-core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '../lib/auth';
import { recordAiCompletion } from '../lib/metrics';

const bodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  lastMessage: z.string().trim().min(1),
  history: z.array(z.object({
    direction: z.enum(['inbound', 'outbound']),
    content: z.string(),
  })).default([]),
  customer: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
  }).default({}),
  provider: z.enum(['anthropic', 'openai']).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(4096).optional(),
  systemPrompt: z.string().optional(),
});

export async function registerAiRoutes(app: FastifyInstance) {
  app.post('/v1/ai/reply', { preHandler: authenticate }, async (request, reply) => {
    const body = bodySchema.parse(request.body);

    reply.hijack();
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-request-id': request.requestId,
    });

    try {
      for await (const chunk of streamReply({
        tenantId: request.user!.tenantId,
        provider: body.provider,
        model: body.model,
        customer: body.customer,
        lastMessage: body.lastMessage,
        history: body.history,
        systemPrompt: body.systemPrompt,
        maxTokens: body.maxTokens,
        temperature: body.temperature,
      })) {
        const event = chunk.type === 'text'
          ? ['event: text', `data: ${JSON.stringify({ delta: chunk.delta })}`]
          : ['event: done', `data: ${JSON.stringify({ text: chunk.text, model: chunk.model, latencyMs: chunk.latencyMs, usage: chunk.usage })}`];

        if (chunk.type === 'done') {
          recordAiCompletion({
            tenantId: request.user!.tenantId,
            provider: body.provider,
            model: chunk.model,
            status: 'success',
            inputTokens: chunk.usage?.inputTokens,
            outputTokens: chunk.usage?.outputTokens,
            latencyMs: chunk.latencyMs,
          });
        }

        reply.raw.write(`${event.join('\n')}\n\n`);
      }
    } catch (error) {
      recordAiCompletion({
        tenantId: request.user!.tenantId,
        provider: body.provider,
        model: body.model,
        status: 'error',
      });
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: (error as Error).message })}\n\n`);
    } finally {
      reply.raw.end();
    }

    return reply;
  });
}
