FROM node:20-alpine

WORKDIR /app

COPY packages ./packages
COPY apps/api ./apps/api

WORKDIR /app/packages/shared
RUN npm install

WORKDIR /app/packages/db
RUN npm install

WORKDIR /app/packages/ai-core
RUN npm install

WORKDIR /app/packages/channels
RUN npm install

WORKDIR /app/apps/api
RUN npm install

EXPOSE 4000

CMD ["npm", "run", "start"]
