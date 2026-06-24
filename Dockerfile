FROM node:22.22.0-alpine3.23 AS build

RUN apk upgrade --no-cache
RUN apk add --no-cache build-base python3
RUN corepack enable pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:22.22.0-alpine3.23

RUN apk upgrade --no-cache

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY server/ ./server/
COPY shared/ ./shared/
COPY --from=build /app/build ./build/

ENV APP_CONFIG_DIR=/config
ENV NODE_ENV=production
ENV PORT=3001

RUN mkdir -p /config && chown node:node /config && chown -R node:node /app

EXPOSE 3001
USER node

CMD ["node_modules/.bin/tsx", "--tsconfig", "server/tsconfig.json", "server/index.ts"]