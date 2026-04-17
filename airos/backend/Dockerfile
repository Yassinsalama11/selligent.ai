FROM node:20-alpine
WORKDIR /app

# Copy the backend package manifest from the repository root and the sibling shared packages.
COPY airos/backend/package*.json ./
COPY packages ./packages

# Install shared local packages first so their dependencies are available to the backend.
WORKDIR /app/packages/db
RUN npm install --production

WORKDIR /app/packages/ai-core
RUN npm install --production

WORKDIR /app/packages/action-sdk
RUN npm install --production

WORKDIR /app/packages/eval
RUN npm install --production

WORKDIR /app
RUN npm install --production

COPY airos/backend ./

EXPOSE 3001
CMD ["node", "src/index.js"]
