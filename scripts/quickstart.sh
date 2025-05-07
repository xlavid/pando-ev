#!/bin/bash

echo "===== EV Charger System Quickstart ====="

# Install dependencies
echo -e "\n[1/4] Installing dependencies..."
npm install

# Start PostgreSQL in Docker
echo -e "\n[2/4] Starting PostgreSQL in Docker..."
docker-compose up -d postgres

# Wait for PostgreSQL to start
echo "Waiting for PostgreSQL to start..."
sleep 5

# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://postgres:password@localhost:5432/ev_charger_system?schema=public"

# Generate Prisma client and run migrations
echo -e "\n[3/4] Setting up database schema..."
npx prisma generate
npx prisma migrate dev --name init

# Start the server in the background
echo -e "\n[4/4] Starting the API server..."
npm run dev &
SERVER_PID=$!

# Wait for the server to start
echo "Waiting for server to start..."
sleep 5

# Run the API test
echo -e "\n===== Running API Tests ====="
./scripts/test-api.sh

echo -e "\n===== Quickstart Complete ====="
echo "- PostgreSQL is running in Docker"
echo "- API server is running on http://localhost:3000"
echo "- Press Ctrl+C to stop the server"

# Wait for user to press Ctrl+C
wait $SERVER_PID 