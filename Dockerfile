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

# Install serve
RUN npm install -g serve

# Copy built application
COPY --from=build /build/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]