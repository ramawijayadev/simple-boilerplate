#!/bin/sh
set -e

echo "🐳 Starting production entrypoint..."

# Wait for PostgreSQL to be ready
wait_for_db() {
  echo "⏳ Waiting for database to be ready..."
  
  # Extract host and port from DATABASE_URL
  # DATABASE_URL format: postgresql://user:pass@host:port/db?schema=public
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's/.*@([^:]+):.*/\1/')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's/.*:([0-9]+)\/.*/\1/')
  
  # Default to 5432 if port extraction fails
  DB_PORT=${DB_PORT:-5432}
  
  MAX_RETRIES=30
  RETRY_COUNT=0
  
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U postgres > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo "❌ Database not ready after $MAX_RETRIES attempts. Exiting."
      exit 1
    fi
    echo "  Database not ready (attempt $RETRY_COUNT/$MAX_RETRIES), waiting..."
    sleep 2
  done
  
  echo "✅ Database is ready!"
}

# Run migrations
run_migrations() {
  echo "🔄 Running database migrations..."
  npx prisma migrate deploy
  echo "✅ Migrations complete!"
}

# Run seeds (idempotent)
run_seeds() {
  echo "🌱 Running database seeds..."
  node dist/seed.js
  echo "✅ Seeding complete!"
}

# Main execution
wait_for_db
run_migrations
run_seeds

echo "🚀 Starting application..."
exec node dist/server.js
