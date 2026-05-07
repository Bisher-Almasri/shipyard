# Use Bun base image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install dependencies into a temporary directory
# This will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install production dependencies only
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy dependencies from temp directory
# Then copy all project files and build
FROM node:22-slim AS prerelease
WORKDIR /usr/src/app
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build arguments for environment variables
ARG PUBLIC_HC_OAUTH_CLIENT_ID
ARG PUBLIC_HC_OAUTH_REDIRECT_URL
ARG PRIVATE_HC_OAUTH_CLIENT_SECRET
ARG PUBLIC_HACKATIME_CLIENT_UID
ARG PUBLIC_HACKATIME_OAUTH_REDIRECT_URL
ARG PRIVATE_HACKATIME_CLIENT_SECRET
ARG PRIVATE_HC_CDN_API_KEY
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ARG ORIGIN

# Set environment variables for build
ENV PUBLIC_HC_OAUTH_CLIENT_ID=$PUBLIC_HC_OAUTH_CLIENT_ID
ENV PUBLIC_HC_OAUTH_REDIRECT_URL=$PUBLIC_HC_OAUTH_REDIRECT_URL
ENV PRIVATE_HC_OAUTH_CLIENT_SECRET=$PRIVATE_HC_OAUTH_CLIENT_SECRET
ENV PUBLIC_HACKATIME_CLIENT_UID=$PUBLIC_HACKATIME_CLIENT_UID
ENV PUBLIC_HACKATIME_OAUTH_REDIRECT_URL=$PUBLIC_HACKATIME_OAUTH_REDIRECT_URL
ENV PRIVATE_HACKATIME_CLIENT_SECRET=$PRIVATE_HACKATIME_CLIENT_SECRET
ENV PRIVATE_HC_CDN_API_KEY=$PRIVATE_HC_CDN_API_KEY
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY
ENV ORIGIN=$ORIGIN

# Build the application with Node instead of Bun to avoid Bun-specific
# production build crashes in Linux deployment environments.
RUN node node_modules/vite/bin/vite.js build

# Copy production dependencies and built app to a clean image
FROM node:22-slim AS release
WORKDIR /usr/src/app
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/build build
COPY --from=prerelease /usr/src/app/package.json .

# Set user to non-root for security
USER node

# Expose port (SvelteKit adapter-node typically uses 3000)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "build/index.js"]