# Stage 1: Build Stage
FROM node:22-bookworm-slim AS build

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy all files from the host to the container
COPY . .

# Install dependencies
RUN npm install --force

# Run the build script defined in package.json
RUN npm run build

# Remove node_modules to prepare for a clean production install
RUN rm -rf node_modules

# Install only production dependencies
RUN npm install --force --omit=dev

# Stage 2: Prune Stage
FROM golang:1.26.1-bookworm AS prune

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the build output and dependencies from the build stage
COPY --from=build /usr/src/app/dist/ /usr/src/app/dist/
COPY --from=build /usr/src/app/node_modules/ /usr/src/app/node_modules/
COPY --from=build /usr/src/app/package*.json /usr/src/app/

# Install node-prune to remove unnecessary files
RUN go install github.com/tj/node-prune@latest

# Run node-prune to remove unnecessary files from node_modules
RUN node-prune

# Stage 3: Production Stage
FROM node:22-bookworm-slim AS production

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the pruned application files from the prune stage
COPY --from=prune /usr/src/app /usr/src/app

# Expose port 3000 to the host
EXPOSE 3000

# Define the command to run the application
CMD ["node", "dist/main"]