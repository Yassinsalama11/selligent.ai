FROM node:20-alpine

WORKDIR /app

COPY packages ./packages
COPY apps/worker ./apps/worker

WORKDIR /app/packages/shared
RUN npm install

WORKDIR /app/packages/db
RUN npm install

WORKDIR /app/packages/ai-core
RUN npm install

WORKDIR /app/apps/worker
RUN npm install

CMD ["npm", "run", "start"]
