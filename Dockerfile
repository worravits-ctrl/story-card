# Use Node.js 18 Alpine
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine as production

# Install serve globally
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/dist /app/dist

# Set working directory
WORKDIR /app

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]