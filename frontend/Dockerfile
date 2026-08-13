FROM node:26-alpine AS build

WORKDIR /app

# node:26-alpine no longer bundles Corepack — it was unbundled from Node 25.
RUN npm install -g corepack@latest && corepack enable

# pnpm-workspace.yaml carries the `overrides` block; without it the lockfile
# check fails with ERR_PNPM_LOCKFILE_CONFIG_MISMATCH.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:26-alpine

WORKDIR /app

# node:26-alpine no longer bundles Corepack — it was unbundled from Node 25.
RUN npm install -g corepack@latest && corepack enable

# pnpm-workspace.yaml carries the `overrides` block; without it the lockfile
# check fails with ERR_PNPM_LOCKFILE_CONFIG_MISMATCH.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist
COPY server.ts ./
COPY og ./og
COPY og-fonts ./og-fonts
COPY public/CNAME ./public/CNAME

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "--import", "tsx", "server.ts"]
