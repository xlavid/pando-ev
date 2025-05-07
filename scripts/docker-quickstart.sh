#!/bin/bash

echo "===== EV Charger System Docker Quickstart ====="

# Check if Docker is running
docker info > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Function to clean up existing containers and volumes if needed
cleanup_existing() {
  echo "Cleaning up existing containers and volumes..."
  docker-compose down -v
  docker system prune -f
}

# Build the Docker images
echo -e "\n[1/4] Building Docker images..."
cleanup_existing
docker-compose build --no-cache
if [ $? -ne 0 ]; then
  echo "Error: Failed to build Docker images. Please check your Docker installation."
  exit 1
fi

# Start the database first
echo -e "\n[2/4] Starting PostgreSQL..."
docker-compose up -d postgres
if [ $? -ne 0 ]; then
  echo "Error: Failed to start PostgreSQL container. Please check if port 5432 is available."
  exit 1
fi

# Wait for PostgreSQL to be healthy
echo "Waiting for PostgreSQL to be healthy..."
max_attempts=20
attempt=1

while [ $attempt -le $max_attempts ]; do
  echo "Attempt $attempt/$max_attempts..."
  if docker ps | grep ev-charger-postgres | grep -q "(healthy)"; then
    echo "PostgreSQL is healthy!"
    break
  fi
  
  if [ $attempt -eq $max_attempts ]; then
    echo "Error: PostgreSQL failed to become healthy after $max_attempts attempts."
    echo "Check logs with: docker-compose logs postgres"
    exit 1
  fi
  
  echo "PostgreSQL not healthy yet, waiting 5s..."
  sleep 5
  ((attempt++))
done

# Start the API service
echo -e "\n[3/4] Starting API service..."
docker-compose up -d api
if [ $? -ne 0 ]; then
  echo "Error: Failed to start API container. Please check if port 3000 is available."
  exit 1
fi

# Function to check API health with retries
check_api_health() {
  local max_attempts=15
  local wait_time=10
  local attempt=1
  
  echo "Waiting for API to become available (may take up to 2.5 minutes)..."
  
  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt/$max_attempts..."
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
    
    if [[ $HEALTH_RESPONSE == *"\"status\":\"ok\""* ]]; then
      echo "API is healthy!"
      return 0
    fi
    
    # Check if there are Prisma errors in the logs
    if docker-compose logs api | grep -q "PrismaClientInitializationError"; then
      echo "Detected Prisma initialization error in the logs."
      
      # Restart the API container
      echo "Restarting the API container..."
      docker-compose restart api
      sleep 10
      
      # If that didn't work, rebuild and redeploy
      if docker-compose logs --tail=20 api | grep -q "PrismaClientInitializationError"; then
        echo "Still seeing Prisma errors after restart. Rebuilding the container..."
        docker-compose down
        # Make sure the schema has the correct binary targets
        if ! grep -q "binaryTargets" prisma/schema.prisma; then
          echo "Adding missing binary targets to Prisma schema..."
          sed -i.bak 's/provider *= *"prisma-client-js"/provider = "prisma-client-js"\n  binaryTargets = ["native", "debian-openssl-3.0.x", "debian-openssl-1.1.x"]/' prisma/schema.prisma
        fi
        docker-compose build --no-cache api
        docker-compose up -d
        sleep 30
      fi
    fi
    
    echo "API not ready yet, waiting ${wait_time}s..."
    sleep $wait_time
    ((attempt++))
  done
  
  echo "Error: API failed to become healthy after multiple attempts."
  echo "Showing the last 30 lines of logs:"
  docker-compose logs --tail=30 api
  return 1
}

# Check API health
check_api_health
if [ $? -ne 0 ]; then
  exit 1
fi

# Setup API variables
API_HOST="localhost"
API_PORT="3000"
API_URL="http://${API_HOST}:${API_PORT}"
API_V1_URL="${API_URL}/api/v1"

echo -e "\n[4/4] Running API Tests..."
echo "Testing against API at ${API_V1_URL}..."

# Create a partner
echo -e "\n1. Creating a partner..."
PARTNER_RESPONSE=$(curl -s -X POST ${API_V1_URL}/partners \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Partner"}')

# Echo the partner response
echo "Partner response: ${PARTNER_RESPONSE}"

# Extract partner ID and API key
PARTNER_ID=$(echo $PARTNER_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
API_KEY=$(echo $PARTNER_RESPONSE | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)

if [ -z "$API_KEY" ]; then
  echo "Error: Could not extract API key. The API might not be ready."
  echo "Check the container logs with: docker-compose logs api"
  exit 1
fi

echo "Partner created with ID: $PARTNER_ID and API key: $API_KEY"

# Initialize a charger
echo -e "\n2. Initializing a charger..."
CHARGER_ID="charger-test-002"
CHARGER_RESPONSE=$(curl -s -X POST ${API_V1_URL}/chargers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"chargerId\":\"$CHARGER_ID\"}")

echo "Charger response: ${CHARGER_RESPONSE}"

# Get charger status
echo -e "\n3. Getting charger status..."
STATUS_RESPONSE=$(curl -s -X GET ${API_V1_URL}/chargers/$CHARGER_ID \
  -H "X-API-Key: $API_KEY")

echo "Status response: ${STATUS_RESPONSE}"

# Update charger status
echo -e "\n4. Updating charger status to CHARGING..."
UPDATE_RESPONSE=$(curl -s -X PUT ${API_V1_URL}/chargers/$CHARGER_ID/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"status":"CHARGING","meterValue":5.5}')

echo "Update response: ${UPDATE_RESPONSE}"

# Get all partner's chargers
echo -e "\n5. Getting all partner's chargers..."
CHARGERS_RESPONSE=$(curl -s -X GET ${API_V1_URL}/partners/$PARTNER_ID/chargers \
  -H "X-API-Key: $API_KEY")

echo "Chargers response: ${CHARGERS_RESPONSE}"

echo -e "\n===== Docker Quickstart Complete ====="
echo "- All services are running in Docker containers"
echo "- API server is available at http://localhost:3000"
echo "- PostgreSQL is available at localhost:5432"
echo ""
echo "Useful commands:"
echo "- View all logs: docker-compose logs"
echo "- View API logs: docker-compose logs api"
echo "- View Postgres logs: docker-compose logs postgres"
echo "- Stop all containers: docker-compose down"
echo "- Restart all containers: docker-compose restart" 