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
echo -e "${BOLD}${BLUE}║     EV Charger API High-Volume Load Testing     ║${NC}"
echo -e "${BOLD}${BLUE}╚═════════════════════════════════════════════════╝${NC}"

# Set up path relative to the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Check if the API is running
echo -e "\n${BOLD}${YELLOW}[1/4]${NC} Checking if the API is running..."

# Get the API container ID
API_CONTAINER=$(docker-compose ps -q api)

if [ -z "$API_CONTAINER" ]; then
    echo -e "${YELLOW}API container is not running. Starting it...${NC}"
    docker-compose up -d
    
    # Wait for API to be ready
    echo -e "${YELLOW}Waiting for API to be ready... (20 seconds)${NC}"
    sleep 20
else
    echo -e "${GREEN}API container is already running.${NC}"
fi

# Check if the database has enough data
echo -e "\n${BOLD}${YELLOW}[2/4]${NC} Checking if database has enough test data..."

# Check charger count
CHARGER_COUNT=$(docker-compose exec -T postgres psql -U postgres -d ev_charger_system -t -c "SELECT COUNT(*) FROM \"Charger\"")
CHARGER_COUNT=$(echo $CHARGER_COUNT | tr -d ' ')

echo -e "${CYAN}Found ${CHARGER_COUNT} chargers in the database.${NC}"

# Check partner count
PARTNER_COUNT=$(docker-compose exec -T postgres psql -U postgres -d ev_charger_system -t -c "SELECT COUNT(*) FROM \"Partner\"")
PARTNER_COUNT=$(echo $PARTNER_COUNT | tr -d ' ')

echo -e "${CYAN}Found ${PARTNER_COUNT} partners in the database.${NC}"

# If not enough data, ask if user wants to generate it
if [ $PARTNER_COUNT -lt 10 ] || [ $CHARGER_COUNT -lt 1000000 ]; then
    echo -e "${YELLOW}The database doesn't have enough test data for a high-volume test.${NC}"
    echo -e "${YELLOW}Ideally, you should have 10 partners with 100,000 chargers each.${NC}"
    echo -e "${YELLOW}Would you like to run the mock data generation script first? [y/N]${NC}"
    read -r generate_data
    
    if [[ $generate_data == "y" || $generate_data == "Y" ]]; then
        echo -e "${CYAN}Running mock data generation script...${NC}"
        "$SCRIPT_DIR/docker-generate-mock-data.sh"
    else
        echo -e "${YELLOW}Proceeding with the current data volume.${NC}"
    fi
fi

# Get the Docker network name
echo -e "\n${BOLD}${YELLOW}[3/4]${NC} Identifying Docker network..."
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
echo -e "\n${BOLD}${YELLOW}[4/4]${NC} Running high-volume k6 load tests..."

# Pass the API URL as an environment variable to k6
echo -e "${CYAN}Setting API URL to: http://${API_IP}:3000${NC}"

echo -e "${CYAN}Starting high-volume load test with k6...${NC}"
echo -e "${YELLOW}This test will simulate extreme traffic with up to 10,000 concurrent users over 6 minutes.${NC}"
echo -e "${YELLOW}Press Ctrl+C to abort the test at any time.${NC}"

docker run --rm -i \
  --network $DOCKER_NETWORK \
  -v "${PROJECT_ROOT}/k6-tests:/k6-tests" \
  -e "API_URL=http://${API_IP}:3000" \
  grafana/k6 run /k6-tests/high-volume-test.js

echo -e "\n${GREEN}${BOLD}✓ High-volume load testing completed!${NC}"
echo -e "${CYAN}Check the results above for performance metrics.${NC}"
echo -e "${CYAN}This test helps verify that your API can handle the required load of:${NC}"
echo -e "${CYAN}- 10 partners with 100,000 chargers each${NC}"
echo -e "${CYAN}- Status updates every second${NC}" 