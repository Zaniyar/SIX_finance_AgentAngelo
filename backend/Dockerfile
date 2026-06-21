FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY tsconfig.json ./
COPY data ./data
COPY opa ./opa
# Install ts-node for runtime compilation (small image, no build step needed)
RUN npm install -g ts-node typescript
# Install OPA binary
RUN apk add --no-cache curl && \
    curl -fsSL https://openpolicyagent.org/downloads/v1.17.1/opa_linux_amd64_static -o /usr/local/bin/opa && \
    chmod +x /usr/local/bin/opa
ENV NODE_ENV=production
ENV API_PORT=3031
EXPOSE 3031
CMD ["ts-node", "--transpile-only", "src/index.ts"]
