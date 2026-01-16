# Flashpoint Game Service - Production Dockerfile
FROM node:20-alpine

# Install dependencies for node-stream-zip (native modules)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source files
RUN npm prune --production && \
    rm -rf src tsconfig.json

# Create non-root user
RUN addgroup -g 1001 -S flashpoint && \
    adduser -S flashpoint -u 1001

# Change ownership
RUN chown -R flashpoint:flashpoint /app

# Switch to non-root user
USER flashpoint

# Expose ports
EXPOSE 22500 22501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
  CMD node -e "require('http').get('http://localhost:22500/', (res) => { process.exit(res.statusCode < 500 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the service
CMD ["node", "dist/index.js"]
