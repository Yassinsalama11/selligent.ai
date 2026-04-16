FROM node:20-alpine

WORKDIR /app

COPY airos/frontend ./airos/frontend
COPY apps/web ./apps/web

WORKDIR /app/airos/frontend
RUN npm install
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
