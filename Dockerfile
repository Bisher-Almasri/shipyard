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
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build arguments for environment variables
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ARG ORIGIN

# Set environment variables for build
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY
ENV ORIGIN=$ORIGIN

# Build the application
RUN bun run build

# Copy production dependencies and built app to a clean image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/build build
COPY --from=prerelease /usr/src/app/package.json .

# Set user to non-root for security
USER bun

# Expose port (SvelteKit adapter-node typically uses 3000)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["bun", "run", "build/index.js"]
