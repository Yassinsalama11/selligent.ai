'use strict';

const { PrismaClient } = require('@prisma/client');

const NEW_TABLES = [
  'tenantTokenBudget', 'aiCallLog', 'actionAudit',
  'tenantEncryptionKey', 'retentionPolicy', 'privacyJob',
  'messageEvalScore', 'replyCorrection', 'platformSignal',
  'copilotLog', 'tenantMemory',
];

async function verify() {
  const prisma = new PrismaClient();
  const errors = [];

  for (const model of NEW_TABLES) {
    try {
      await prisma[model].findFirst();
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }

  await prisma.$disconnect();

  if (errors.length > 0) {
    console.error('FAIL — missing tables:\n' + errors.join('\n'));
    process.exit(1);
  }

  console.log('PASS — all 11 new tables verified');
}

verify();
