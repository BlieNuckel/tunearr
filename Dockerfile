FROM node:22-alpine AS build

WORKDIR /build-temp
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY --from=build /build-temp/build ./build/

ENV APP_CONFIG_DIR=/config
RUN mkdir -p /config && chown node:node /config

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

USER node

CMD ["npx", "tsx", "server/index.ts"]