FROM node:18-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
WORKDIR /app/backend/src
EXPOSE 5000
CMD ["node", "../server.js"]