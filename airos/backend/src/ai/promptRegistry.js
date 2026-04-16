const crypto = require('crypto');

const {
  upsertPromptVersion,
  listPromptVersions,
  getPromptVersion,
  getTenantPromptPins,
  setTenantPromptPin,
} = require('../db/queries/prompts');

const promptDefinitions = [
  require('./prompts/reply-system'),
  require('./prompts/intent-detector'),
];

function hashPrompt(content) {
  return crypto.createHash('sha256').update(String(content || '')).digest('hex');
}

function compareSemver(left, right) {
  const leftParts = String(left || '0.0.0').split('.').map((value) => Number.parseInt(value, 10) || 0);
  const rightParts = String(right || '0.0.0').split('.').map((value) => Number.parseInt(value, 10) || 0);
  const size = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < size; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) return delta;
  }

  return 0;
}

function sortVersionsDescending(versions = []) {
  return [...versions].sort((left, right) => compareSemver(right.version, left.version));
}

function getPromptDefinition(promptId) {
  return promptDefinitions.find((entry) => entry.id === promptId) || null;
}

async function syncPromptDefinitions(tenantId, promptId = null) {
  const definitions = promptId
    ? promptDefinitions.filter((entry) => entry.id === promptId)
    : promptDefinitions;

  for (const definition of definitions) {
    for (const versionEntry of definition.versions || []) {
      await upsertPromptVersion(
        tenantId,
        definition.id,
        versionEntry.version,
        hashPrompt(versionEntry.content),
        versionEntry.content
      );
    }
  }
}

async function listPrompts(tenantId) {
  await syncPromptDefinitions(tenantId);

  const [versions, pins] = await Promise.all([
    listPromptVersions(tenantId),
    getTenantPromptPins(tenantId),
  ]);

  const pinsByPromptId = Object.fromEntries(
    pins.map((entry) => [entry.prompt_id, entry.version])
  );

  return promptDefinitions.map((definition) => {
    const promptVersions = sortVersionsDescending(
      versions
        .filter((entry) => entry.id === definition.id)
        .map((entry) => ({
          version: entry.version,
          promptHash: entry.prompt_hash,
          content: entry.content,
          createdAt: entry.created_at,
        }))
    );

    const pinnedVersion = pinsByPromptId[definition.id] || definition.version;

    return {
      id: definition.id,
      version: definition.version,
      pinnedVersion,
      versions: promptVersions,
    };
  });
}

async function rollbackPrompt(tenantId, promptId, version) {
  await syncPromptDefinitions(tenantId, promptId);

  const prompt = await getPromptVersion(tenantId, promptId, version);
  if (!prompt) {
    const err = new Error(`Prompt version not found for ${promptId}@${version}`);
    err.status = 404;
    throw err;
  }

  await setTenantPromptPin(tenantId, promptId, version);

  const prompts = await listPrompts(tenantId);
  return prompts.find((entry) => entry.id === promptId) || null;
}

async function resolvePromptContent(tenantId, promptId, fallbackContent) {
  const definition = getPromptDefinition(promptId);
  if (!tenantId) {
    return definition?.versions?.find((entry) => entry.version === definition.version)?.content
      || fallbackContent;
  }

  await syncPromptDefinitions(tenantId, promptId);

  const [pins, versions] = await Promise.all([
    getTenantPromptPins(tenantId),
    listPromptVersions(tenantId),
  ]);

  const pinnedVersion = pins.find((entry) => entry.prompt_id === promptId)?.version;
  if (!pinnedVersion && fallbackContent) {
    return fallbackContent;
  }

  const promptVersions = versions.filter((entry) => entry.id === promptId);
  const activeVersion = pinnedVersion || definition?.version;
  const activePrompt = promptVersions.find((entry) => entry.version === activeVersion);

  return activePrompt?.content
    || definition?.versions?.find((entry) => entry.version === definition?.version)?.content
    || fallbackContent;
}

module.exports = {
  compareSemver,
  listPrompts,
  rollbackPrompt,
  resolvePromptContent,
  syncPromptDefinitions,
};
