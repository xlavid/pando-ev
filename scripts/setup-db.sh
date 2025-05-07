#!/bin/bash

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Start PostgreSQL in Docker
echo "Starting PostgreSQL in Docker..."
docker-compose up -d postgres

# Wait for PostgreSQL to start
echo "Waiting for PostgreSQL to start..."
sleep 5

# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://postgres:password@localhost:5432/ev_charger_system?schema=public"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

echo "Database setup complete!" 