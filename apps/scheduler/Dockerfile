FROM node:20-alpine

WORKDIR /app

COPY airos/backend ./airos/backend
COPY packages ./packages
COPY apps/scheduler ./apps/scheduler

WORKDIR /app/airos/backend
RUN npm install

WORKDIR /app/apps/scheduler

CMD ["npm", "run", "start"]
