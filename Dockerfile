FROM node:22-alpine AS build

WORKDIR /build-temp
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine

ENV APP_DATA_DIR=/var/lib/music-requester

WORKDIR ${APP_DATA_DIR}

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY --from=build /build-temp/build ./build/

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npx", "tsx", "server/index.ts"]