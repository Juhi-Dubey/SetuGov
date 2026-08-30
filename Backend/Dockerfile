FROM node:20-alpine

# Install openssl for Prisma binary engine compatibility
RUN apk add --no-cache openssl

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

# Default command starts development server with hot-reloading
CMD ["npm", "run", "dev"]
