FROM node:24-alpine AS build
WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Type-check and compile
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run typecheck && npm run build

# ── Runtime image ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY migrations/ ./migrations/

EXPOSE 3000
ENTRYPOINT ["node", "dist/main.js"]
