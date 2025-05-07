#!/bin/bash

echo "===== Initializing Database in Docker ====="

# Check if Docker is running
docker info > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Start PostgreSQL if not already running
if ! docker ps | grep -q ev-charger-postgres; then
  echo "Starting PostgreSQL container..."
  docker-compose up -d postgres
  if [ $? -ne 0 ]; then
    echo "Error: Failed to start PostgreSQL container."
    exit 1
  fi
else
  echo "PostgreSQL container is already running."
fi

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
max_attempts=20  # Increased from 10 to 20
attempt=1

while [ $attempt -le $max_attempts ]; do
  echo "Attempt $attempt/$max_attempts..."
  if docker exec ev-charger-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "PostgreSQL is ready!"
    # Give it a bit more time to fully initialize
    echo "Waiting an additional 5 seconds to ensure full initialization..."
    sleep 5
    break
  fi
  
  if [ $attempt -eq $max_attempts ]; then
    echo "Error: PostgreSQL failed to become ready after $max_attempts attempts."
    exit 1
  fi
  
  echo "PostgreSQL not ready yet, waiting 5s..."
  sleep 5
  ((attempt++))
done

# Create a function to run Prisma commands with retries
run_prisma_command() {
  local command=$1
  local max_retries=3
  local retry=0
  local success=false
  
  while [ $retry -lt $max_retries ] && [ "$success" = false ]; do
    if [ $retry -gt 0 ]; then
      echo "Retrying ($retry/$max_retries)..."
    fi
    
    if docker ps | grep -q ev-charger-api; then
      echo "Running '$command' through API container..."
      if docker exec ev-charger-api npx $command; then
        success=true
      else
        echo "Command failed, waiting before retry..."
        sleep 5
        retry=$((retry+1))
      fi
    else
      echo "API container not running. Using temporary container..."
      if docker-compose run --rm api npx $command; then
        success=true
      else
        echo "Command failed, waiting before retry..."
        sleep 5
        retry=$((retry+1))
      fi
    fi
  done
  
  if [ "$success" = false ]; then
    echo "Failed to run '$command' after $max_retries retries."
    return 1
  fi
  
  return 0
}

# Run database migrations
echo "Running Prisma database migrations..."
run_prisma_command "prisma migrate deploy"

if [ $? -ne 0 ]; then
  echo "Error: Failed to run database migrations."
  exit 1
fi

echo "===== Database Initialization Complete =====" 