FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_BASE must be set at build time — import.meta.env is resolved by Vite
ENV NODE_ENV=production
ENV VITE_API_BASE=https://agentangelo.finance
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY server-node.mjs ./server-node.mjs
ENV NODE_ENV=production
ENV PORT=3030
ENV HOST=0.0.0.0
EXPOSE 3030
CMD ["node", "server-node.mjs"]
