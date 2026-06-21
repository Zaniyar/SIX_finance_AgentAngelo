FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY tsconfig.json ./
RUN npx tsc --outDir dist --skipLibCheck || true

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
COPY data ./data
COPY opa ./opa
# Install OPA binary
RUN apk add --no-cache curl && \
    curl -fsSL https://openpolicyagent.org/downloads/v1.17.1/opa_linux_amd64_static -o /usr/local/bin/opa && \
    chmod +x /usr/local/bin/opa
ENV NODE_ENV=production
ENV API_PORT=3031
EXPOSE 3031
CMD ["node", "dist/index.js"]
