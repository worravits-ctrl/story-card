# Build stage
FROM node:18-alpine AS build
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage  
FROM node:18-alpine AS production
WORKDIR /app

# Install only sirv-cli for production
RUN npm install -g sirv-cli

# Copy built application
COPY --from=build /build/dist ./dist

EXPOSE 3000
CMD ["sirv", "dist", "--port", "3000", "--host", "0.0.0.0", "--single"]