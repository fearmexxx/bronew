FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Expose port
EXPOSE 3001

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Run as non-root user
USER node

CMD ["node", "server.js"]
