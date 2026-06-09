# ── Stage 1: Build React client ───────────────────────────────────────────────
FROM node:20 AS client-build

WORKDIR /app

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

# Copy the built React app from Stage 1
COPY --from=client-build /app/client/dist ./client/dist

USER node

CMD ["node", "src/index.js"]
