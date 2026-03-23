# Spec: Dockerization for Gemini Observability Dashboard (OTLP Collector)

## 1. Goal
Provide a production-ready, minimal Docker image for the Gemini Observability Dashboard that functions as a persistent OTLP collector and dashboard UI.

## 2. Architecture
- **Base Image**: `node:20-alpine` (minimal, secure).
- **Multi-Stage Build**:
  - `deps`: Install build tools (`python3`, `make`, `g++`, `libc6-compat`) and `node_modules`.
  - `builder`: Build Next.js application in standalone mode and generate the Prisma client.
  - `runner`: Production runtime containing only the standalone build, the Prisma schema/migrations, and required runtime libraries (`libc6-compat`).
- **Data Persistence**: Uses a Docker volume mounted to `/app/data` for the SQLite database.

## 3. Configuration
- **Port**: `4318` (Default OTLP port).
- **Environment Variables**:
  - `PORT=4318`
  - `DATABASE_URL="file:/app/data/dev.db"`
  - `NODE_ENV=production`
- **Volume**: `-v ./data:/app/data`

## 4. Automatic Initialization (Entrypoint)
A `docker-entrypoint.sh` script will:
1. Ensure `/app/data` exists and has correct permissions.
2. Run `npx prisma migrate deploy` to apply any pending database migrations.
3. Start the Next.js server using `node server.js` (leveraging the standalone output).

## 5. Security & Optimization
- **Non-root User**: Run the application as the `nextjs` user.
- **Standalone Build**: Set `output: 'standalone'` in `next.config.ts`.
- **Minimal Runtime**: The `runner` stage will not include dev dependencies or the full source code.
- **Layer Caching**: Order commands to maximize Docker layer reuse.

