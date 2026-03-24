FROM node:22-alpine AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

ARG VITE_PUBLIC_API_BASE_URL
ENV VITE_PUBLIC_API_BASE_URL=$VITE_PUBLIC_API_BASE_URL

RUN yarn build

FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=build /app/dist ./dist
COPY server.ts ./

EXPOSE 3000

CMD ["node", "--import", "tsx", "server.ts"]
