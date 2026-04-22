FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist
COPY server.ts ./
COPY og ./og
COPY og-fonts ./og-fonts
COPY public/CNAME ./public/CNAME

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "--import", "tsx", "server.ts"]
