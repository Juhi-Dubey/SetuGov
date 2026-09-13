FROM node:20-alpine

# Install openssl for Prisma binary engine compatibility and curl for healthchecks
RUN apk add --no-cache openssl curl

WORKDIR /app

# Copy package definitions and prisma schema first for caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Default command starts development server with hot-reloading
CMD ["npm", "run", "dev"]
