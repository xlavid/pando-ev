#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}╔═════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║   Generating EV Charger Mock Data (Docker)      ║${NC}"
echo -e "${BOLD}${BLUE}╚═════════════════════════════════════════════════╝${NC}"

# Load environment variables from .env file
if [ -f .env ]; then
  echo -e "${CYAN}Loading environment variables from .env file...${NC}"
  set -a # automatically export all variables
  source .env
  set +a
else
  echo -e "${YELLOW}No .env file found. Using default values.${NC}"
fi

# Verify PostgreSQL credentials are available
if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
  echo -e "${YELLOW}PostgreSQL credentials not found in environment variables.${NC}"
  echo -e "${YELLOW}Using default values: postgres/password${NC}"
  POSTGRES_USER="postgres"
  POSTGRES_PASSWORD="password"
fi

echo -e "${YELLOW}WARNING: This script will generate 10 partners with 100,000 chargers each (1 million total).${NC}"
echo -e "${YELLOW}This process will take a significant amount of time and database resources.${NC}"
echo -e "Do you want to proceed? ${BOLD}[y/N]${NC}"
read -r confirmation

if [[ $confirmation != "y" && $confirmation != "Y" ]]; then
  echo -e "${YELLOW}Mock data generation cancelled.${NC}"
  exit 0
fi

# Set up path relative to the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker to continue.${NC}"
    exit 1
fi

echo -e "\n${BOLD}${YELLOW}[1/5]${NC} Ensuring PostgreSQL container is running..."
# Check if PostgreSQL container is running
if ! docker-compose ps postgres | grep -q "Up"; then
    echo -e "${YELLOW}PostgreSQL container is not running. Starting it...${NC}"
    docker-compose up -d postgres
    
    # Wait for database to be ready
    echo -e "${YELLOW}Waiting for PostgreSQL to be ready... (30 seconds)${NC}"
    sleep 30
fi

echo -e "\n${BOLD}${YELLOW}[2/5]${NC} Optimizing database settings for bulk insertion..."
# Optimize PostgreSQL settings for bulk data inserts
echo -e "${CYAN}Adjusting PostgreSQL settings for optimal bulk insert performance...${NC}"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM SET max_connections = '200';"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM SET shared_buffers = '1GB';"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM SET work_mem = '64MB';"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM SET maintenance_work_mem = '256MB';"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM SET synchronous_commit = 'off';"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM SET checkpoint_timeout = '30min';"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM SET statement_timeout = '0';"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM SET idle_in_transaction_session_timeout = '0';"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM SET wal_writer_delay = '10000ms';"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM SET max_wal_size = '4GB';"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "SELECT pg_reload_conf();"
echo -e "${GREEN}PostgreSQL settings optimized for bulk insertions${NC}"

# Create temporary transaction settings
echo -e "${CYAN}Creating batch processing SQL function...${NC}"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d ev_charger_system -c "
SET synchronous_commit TO OFF;
SET work_mem TO '64MB';
SET maintenance_work_mem TO '256MB';
"

echo -e "\n${BOLD}${YELLOW}[3/5]${NC} Finding Docker network..."
# Get Docker network name and verify using compose network list
DOCKER_NETWORK=$(docker network ls --filter name=ev-charger-network --format "{{.Name}}")

# If not found, try with project name prefix
if [ -z "$DOCKER_NETWORK" ]; then
    PROJECT_NAME=$(basename "$(pwd)")
    DOCKER_NETWORK="${PROJECT_NAME}_ev-charger-network"
fi

# Verify the network exists
if ! docker network ls | grep -q "$DOCKER_NETWORK"; then
    echo -e "${YELLOW}Network '$DOCKER_NETWORK' not found, checking available networks:${NC}"
    docker network ls
    # Try to use the default bridge network as fallback
    DOCKER_NETWORK="bridge"
    echo -e "${YELLOW}Using default bridge network instead.${NC}"
fi

echo -e "${CYAN}Using Docker network:${NC} $DOCKER_NETWORK"

echo -e "\n${BOLD}${YELLOW}[4/5]${NC} Creating temporary directory for Prisma setup..."
# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo -e "${CYAN}Using temporary directory:${NC} $TEMP_DIR"

# Make sure we have the correct script path
SCRIPT_PATH="$SCRIPT_DIR/mock-data.js"
SCHEMA_PATH="$(pwd)/prisma/schema.prisma"

# Check if schema exists
if [ ! -f "$SCHEMA_PATH" ]; then
    echo -e "${RED}❌ Prisma schema not found at $SCHEMA_PATH${NC}"
    echo -e "${YELLOW}Searching for schema.prisma file...${NC}"
    FOUND_SCHEMA=$(find "$(pwd)" -name "schema.prisma" -print -quit)
    
    if [ -n "$FOUND_SCHEMA" ]; then
        echo -e "${GREEN}Found schema at: $FOUND_SCHEMA${NC}"
        SCHEMA_PATH="$FOUND_SCHEMA"
    else
        echo -e "${RED}❌ Could not find schema.prisma anywhere in the project.${NC}"
        exit 1
    fi
fi

# Copy our script and schema
echo -e "${CYAN}Copying mock-data.js script to temp directory...${NC}"
cp "$SCRIPT_PATH" "$TEMP_DIR/mock-data.js"

echo -e "${CYAN}Setting up Prisma directory structure...${NC}"
mkdir -p "$TEMP_DIR/prisma"
cp "$SCHEMA_PATH" "$TEMP_DIR/prisma/schema.prisma"

# Verify files were copied correctly
if [ ! -f "$TEMP_DIR/prisma/schema.prisma" ]; then
    echo -e "${RED}❌ Failed to copy schema.prisma to temp directory.${NC}"
    ls -la "$TEMP_DIR/prisma"
    exit 1
fi

echo -e "${GREEN}✓ Files copied successfully:${NC}"
ls -la "$TEMP_DIR"
ls -la "$TEMP_DIR/prisma"

# Create temporary package.json
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "mock-data-generator",
  "version": "1.0.0",
  "description": "Generate mock data for EV Charger System",
  "main": "mock-data.js",
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "prisma": "^5.22.0"
  }
}
EOF

echo -e "\n${BOLD}${YELLOW}[5/5]${NC} Running optimized mock data generator in Docker..."
echo -e "${YELLOW}This process should be much faster with bulk SQL insertions...${NC}"
echo -e "${CYAN}Using PostgreSQL credentials: ${POSTGRES_USER}/${POSTGRES_PASSWORD}${NC}"

# Run the mock data generator in Docker with increased memory allocation
docker run --rm -i \
  --network $DOCKER_NETWORK \
  -v "$TEMP_DIR:/app" \
  -e POSTGRES_USER="$POSTGRES_USER" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/ev_charger_system?schema=public" \
  -e NODE_OPTIONS="--max-old-space-size=4096" \
  -e PRISMA_SCHEMA_PATH="/app/prisma/schema.prisma" \
  --memory=4g \
  -w /app \
  node:lts \
  sh -c "
    echo 'Installing dependencies...' && \
    npm install && \
    echo 'Verifying Prisma schema...' && \
    ls -la /app/prisma && \
    echo 'Generating Prisma client...' && \
    npx prisma generate --schema=/app/prisma/schema.prisma && \
    echo 'Starting data generation...' && \
    node /app/mock-data.js
  "

RESULT=$?

# Clean up temporary directory
rm -rf "$TEMP_DIR"

# Reset PostgreSQL settings
echo -e "${CYAN}Resetting PostgreSQL to normal settings...${NC}"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM RESET synchronous_commit;"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM RESET work_mem;"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM RESET maintenance_work_mem;"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM RESET checkpoint_timeout;"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM RESET wal_writer_delay;"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "ALTER SYSTEM RESET max_wal_size;"
docker-compose exec -T postgres psql -U "$POSTGRES_USER" -c "SELECT pg_reload_conf();"

if [ $RESULT -eq 0 ]; then
    echo -e "\n${GREEN}${BOLD}✓ Mock data generation completed successfully!${NC}"
    echo -e "${GREEN}Created 10 partners with 100,000 chargers each (1 million total).${NC}"
    echo -e "${GREEN}Generation was optimized using bulk SQL inserts.${NC}"
else
    echo -e "\n${RED}❌ Mock data generation failed!${NC}"
    exit 1
fi 