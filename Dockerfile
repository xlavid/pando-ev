FROM node:lts-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma/

# Copy tsconfig and source code
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma client with proper binary targets
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:lts-slim AS production

WORKDIR /app

# Install curl for health checks and OpenSSL for Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy prisma schema and migrations
COPY prisma ./prisma/

# Generate Prisma client in the production image
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Create startup script
RUN echo '#!/bin/bash\n\
echo "Running database migrations..."\n\
npx prisma migrate deploy\n\
echo "Starting application..."\n\
node dist/index.js\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose the API port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run startup script
CMD ["/app/start.sh"] 