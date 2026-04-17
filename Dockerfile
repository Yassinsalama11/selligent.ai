# Root Dockerfile — build context is the repo root.
# Railway detects this file and uses the repo root as context,
# giving the build access to both packages/ and airos/backend/.
FROM node:20-alpine
WORKDIR /app

# ── 1. Copy shared package manifests and install their deps ──────────────────
COPY packages ./packages

WORKDIR /app/packages/db
RUN npm install --production

WORKDIR /app/packages/ai-core
RUN npm install --production

WORKDIR /app/packages/action-sdk
RUN npm install --production

WORKDIR /app/packages/eval
RUN npm install --production

# ── 2. Copy backend and install its deps ─────────────────────────────────────
WORKDIR /app
COPY airos/backend/package*.json ./
RUN npm install --production

COPY airos/backend ./

# ── 3. Run ───────────────────────────────────────────────────────────────────
EXPOSE 3001
CMD ["node", "src/index.js"]
