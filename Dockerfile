# Dockerfile for the Monerva API

# Use an official Node runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if present) to leverage Docker cache
COPY backend/package*.json ./

# Install only production dependencies to keep the image small
RUN npm ci --only=production

# Copy the rest of the application code
COPY backend/ .

# Generate Prisma client (if using Prisma)
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN npx tsc

# Expose the port the app runs on (default is 3000 for Express)
EXPOSE 3000

# Define the command to run the application
CMD ["node", "dist/server.js"]