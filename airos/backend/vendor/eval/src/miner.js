/**
 * Correction miner — Task 2-C2.
 *
 * Weekly job that collects unexported ReplyCorrections across all tenants
 * and writes a JSONL prompt-tuning dataset to stdout (or a provided write stream).
 *
 * JSONL format (one object per line):
 *   {
 *     "messages": [
 *       { "role": "user",      "content": "<customerMessage>" },
 *       { "role": "assistant", "content": "<correctedReply>" }
 *     ],
 *     "metadata": { "editType": "edit|reject", "tenantId": "<id>", "correctedAt": "<iso>" }
 *   }
 *
 * Only "edit" corrections are included in the fine-tuning set (reject-only
 * records are counted but skipped — they indicate a bad reply with no gold label).
 *
 * Usage (cron / worker):
 *   const { runMiner } = require('@chatorai/eval');
 *   await runMiner({ outputPath: '/tmp/corrections.jsonl' });
 */
const fs = require('fs');
const path = require('path');
const { getPrisma, getPrismaForTenant } = require('@chatorai/db');

/**
 * Mine unexported ReplyCorrections from the US cluster and write JSONL.
 *
 * @param {object} [opts]
 * @param {string} [opts.outputPath]  — file path to write; defaults to process.stdout
 * @param {Date}   [opts.since]       — only corrections after this date (default: 7 days ago)
 * @returns {Promise<{ exported: number, skipped: number }>}
 */
async function runMiner({ outputPath, since } = {}) {
  const cutoff = since || new Date(Date.now() - 7 * 24 * 3600 * 1000);

  // Query US (primary) cluster for all unexported edit corrections
  const prisma = getPrisma();
  const corrections = await prisma.replyCorrection.findMany({
    where: {
      exportedAt: null,
      editType: 'edit',
      correctedReply: { not: null },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: 10000,
  });

  let exported = 0;
  let skipped = 0;

  const out = outputPath
    ? fs.createWriteStream(path.resolve(outputPath), { flags: 'a', encoding: 'utf8' })
    : process.stdout;

  const ids = [];

  for (const c of corrections) {
    if (!c.correctedReply || !c.originalReply) { skipped++; continue; }

    const record = {
      messages: [
        { role: 'user',      content: c.originalReply },   // original bad reply as context
        { role: 'assistant', content: c.correctedReply },
      ],
      metadata: {
        editType: c.editType,
        tenantId: c.tenantId,
        correctedAt: c.createdAt.toISOString(),
      },
    };

    const line = JSON.stringify(record) + '\n';
    if (out !== process.stdout) {
      out.write(line);
    } else {
      process.stdout.write(line);
    }

    ids.push(c.id);
    exported++;
  }

  if (out !== process.stdout) {
    await new Promise((resolve, reject) => out.on('finish', resolve).on('error', reject));
    out.end();
  }

  // Mark as exported
  if (ids.length > 0) {
    await prisma.replyCorrection.updateMany({
      where: { id: { in: ids } },
      data: { exportedAt: new Date() },
    });
  }

  return { exported, skipped };
}

module.exports = { runMiner };
