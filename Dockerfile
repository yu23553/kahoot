# 可选：本地 Docker 构建验证。Render 默认用原生 Node runtime + render.yaml。
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
RUN npm ci && npm ci --prefix server

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV CLOUD_HOSTED=true
ENV PORT=10000
EXPOSE 10000

CMD ["npm", "start"]
