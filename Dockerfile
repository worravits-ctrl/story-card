# Use Node.js 18 Alpine
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install serve globally first
RUN npm install -g serve

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove node_modules to reduce image size (optional)
RUN rm -rf node_modules

# Expose port (Railway will set PORT env variable)
EXPOSE $PORT

# Start with proper Railway port handling
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]