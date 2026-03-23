# Spec: Dockerization for Gemini Observability Dashboard (OTLP Collector)

## 1. Goal
Provide a production-ready, minimal Docker image for the Gemini Observability Dashboard that functions as a persistent OTLP collector and dashboard UI.

## 2. Architecture
- **Base Image**: `node:20-alpine` (minimal, secure).
- **Multi-Stage Build**:
  - `deps`: Install build tools (`python3`, `make`, `g++`, `libc6-compat`) and `node_modules`.
  - `builder`: Build Next.js application and Prisma client.
  - `runner`: Production runtime with only necessary files and environment.
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
2. Run `npx prisma db push` to synchronize the SQLite schema.
3. Start the Next.js server using `npm start`.

## 5. Security & Optimization
- **Non-root User**: Run the application as the `nextjs` user.
- **Standalone Build**: Utilize Next.js `output: 'standalone'` for minimal image size.
- **Layer Caching**: Order commands to maximize Docker layer reuse.
