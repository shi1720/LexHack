FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/cli/package.json packages/cli/package.json
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 ANNEX_FIXTURES=/app ANNEX_DB=/tmp/annex/annex.db ANNEX_PUBLIC_DEMO=1
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 8080
CMD ["sh", "-c", "cd apps/web && ../../node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT:-8080}"]
