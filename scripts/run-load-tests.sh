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
echo -e "${BOLD}${BLUE}║          EV Charger API Load Testing            ║${NC}"
echo -e "${BOLD}${BLUE}╚═════════════════════════════════════════════════╝${NC}"

# Set up path relative to the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo -e "${YELLOW}Loading environment variables from .env file...${NC}"
  export $(grep -v '^#' .env | xargs)
fi

# Check if ADMIN_API_KEY is set
if [ -z "$ADMIN_API_KEY" ]; then
  echo -e "${RED}Error: ADMIN_API_KEY environment variable is not set${NC}"
  echo -e "${YELLOW}Please set the ADMIN_API_KEY environment variable or add it to your .env file${NC}"
  exit 1
fi

# Check if the API is running
echo -e "\n${BOLD}${YELLOW}[1/3]${NC} Checking if the API is running..."

# Get the API container ID
API_CONTAINER=$(docker-compose ps -q api)

if [ -z "$API_CONTAINER" ]; then
    echo -e "${YELLOW}API container is not running. Starting it...${NC}"
    docker-compose up -d
    
    # Wait for API to be ready
    echo -e "${YELLOW}Waiting for API to be ready... (20 seconds)${NC}"
    sleep 20
    
    # After starting, get the container ID again
    API_CONTAINER=$(docker-compose ps -q api)
else
    echo -e "${GREEN}API container is already running.${NC}"
fi

# Get the Docker network name
echo -e "\n${BOLD}${YELLOW}[2/3]${NC} Identifying Docker network..."
DOCKER_NETWORK="pando_ev-charger-network"

# Verify the network exists
if ! docker network ls | grep -q "$DOCKER_NETWORK"; then
    echo -e "${RED}❌ Docker network '$DOCKER_NETWORK' not found. Here are available networks:${NC}"
    docker network ls
    exit 1
fi

echo -e "${CYAN}Using Docker network:${NC} $DOCKER_NETWORK"

# Get API service IP address dynamically
API_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $API_CONTAINER)
echo -e "${CYAN}API service IP address:${NC} $API_IP"

# Run k6 load tests
echo -e "\n${BOLD}${YELLOW}[3/3]${NC} Running k6 load tests..."

# Pass the API URL as an environment variable to k6
echo -e "${CYAN}Setting API URL to: http://${API_IP}:3000${NC}"

echo -e "${CYAN}Starting load tests with k6...${NC}"
echo -e "${YELLOW}This test will simulate increasing traffic up to 1000 concurrent users over approximately 2.5 minutes.${NC}"
echo -e "${YELLOW}Press Ctrl+C to abort the test at any time.${NC}"
docker run --rm -i \
  --network $DOCKER_NETWORK \
  -v "${PROJECT_ROOT}/k6-tests:/k6-tests" \
  -e "API_URL=http://${API_IP}:3000" \
  -e "ADMIN_API_KEY=${ADMIN_API_KEY}" \
  grafana/k6 run /k6-tests/charger-api-load-test.js

echo -e "\n${GREEN}${BOLD}✓ Load testing completed!${NC}"
echo -e "${CYAN}Check the results above for performance metrics.${NC}" 