FROM oven/bun:1 AS base
WORKDIR /app

# Copy lockfile and package files first for better caching
COPY bun.lock ./
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

FROM base AS dependencies
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY . .

# Build the frontend
RUN cd frontend && bun run build

FROM oven/bun:1-slim AS runtime
WORKDIR /app

# Copy only production dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/backend/node_modules ./backend/node_modules

# Copy application code
COPY --from=build /app/backend/src ./backend/src
COPY --from=build /app/frontend/dist ./frontend/dist

EXPOSE 3000

ENV NODE_ENV=production

CMD ["bun", "run", "backend/src/index.ts"]
