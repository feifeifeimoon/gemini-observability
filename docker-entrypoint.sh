#!/bin/sh
set -e

# Handle volume permissions for SQLite
echo "Ensuring volume permissions..."
mkdir -p /app/data
chown -R nextjs:nodejs /app/data

# Run migrations as nextjs user using local Prisma CLI
if [ -f "/app/prisma/schema.prisma" ]; then
  echo "Running database migrations..."
  su-exec nextjs node node_modules/prisma/build/index.js migrate deploy
fi

echo "Starting application..."
exec su-exec nextjs node server.js
