# FROM node:20-alpine

# # Install openssl for Prisma binary engine compatibility and curl for healthchecks
# RUN apk add --no-cache openssl curl

# WORKDIR /app

# # Copy package definitions and prisma schema first for caching
# COPY package*.json ./
# COPY prisma ./prisma/

# # Install dependencies and generate Prisma client
# RUN npm install
# RUN npx prisma generate

# # Copy the rest of the application code
# COPY . .

# EXPOSE 5000

# HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
#     CMD curl -f http://localhost:5000/api/v1/health || exit 1

# # # Default command starts development server with hot-reloading
# CMD ["npm", "start"]

FROM node:20-slim

# Prisma requires OpenSSL
RUN apt-get update \
    && apt-get install -y openssl curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files first for Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source
COPY . .

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/api/v1/health || exit 1

# Production server
CMD ["npm", "start"]