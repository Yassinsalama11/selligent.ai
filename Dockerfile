FROM node:22-bookworm-slim

WORKDIR /app

# Install the backend from the monorepo root so npm resolves the workspace paths
# exactly as declared in the root lockfile and backend package manifests.
COPY package.json package-lock.json ./
COPY packages ./packages
COPY airos/backend ./airos/backend

RUN npm install

EXPOSE 3001

CMD ["node", "airos/backend/src/index.js"]
