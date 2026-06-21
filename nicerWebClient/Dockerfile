FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build for production (no HTTPS plugin needed — nginx handles TLS)
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
ENV NODE_ENV=production
ENV PORT=3030
EXPOSE 3030
CMD ["node", "dist/server/server.js"]
