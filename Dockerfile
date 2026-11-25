# Cloudflare Containers + optional local/Render Docker runs.
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
RUN npm ci && npm ci --prefix server

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV CLOUD_HOSTED=true
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
