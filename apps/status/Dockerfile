FROM node:20-alpine

WORKDIR /app

COPY apps/status ./apps/status

WORKDIR /app/apps/status
RUN npm install
RUN npm run build

EXPOSE 3002

CMD ["npm", "run", "start"]
