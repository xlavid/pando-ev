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
echo -e "${BOLD}${BLUE}║          EV Charger Database Reset Tool         ║${NC}"
echo -e "${BOLD}${BLUE}╚═════════════════════════════════════════════════╝${NC}"

# Confirm with the user
echo -e "${RED}${BOLD}WARNING:${NC} This will delete all data in the database but keep the schema intact."
echo -e "Are you sure you want to proceed? ${YELLOW}[y/N]${NC}"
read -r confirmation

if [[ $confirmation != "y" && $confirmation != "Y" ]]; then
  echo -e "${YELLOW}Database reset cancelled.${NC}"
  exit 0
fi

echo -e "\n${BOLD}${YELLOW}[1/3]${NC} Checking PostgreSQL container..."

# Check if PostgreSQL container is running
if ! docker-compose ps postgres | grep -q "Up"; then
  echo -e "${YELLOW}PostgreSQL container is not running. Starting it...${NC}"
  docker-compose up -d postgres
  
  # Wait for PostgreSQL to be ready
  echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
  sleep 10
fi

echo -e "\n${BOLD}${YELLOW}[2/3]${NC} Preparing SQL commands..."

# Create a temporary SQL script
TMP_SQL_FILE=$(mktemp)
cat > "$TMP_SQL_FILE" << EOF
-- Disable foreign key checks
SET session_replication_role = replica;

-- Clear all data from tables
TRUNCATE TABLE "Charger" CASCADE;
TRUNCATE TABLE "Partner" CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = default;

-- Show table counts after truncation
SELECT 'Partner' as table_name, count(*) FROM "Partner"
UNION ALL
SELECT 'Charger' as table_name, count(*) FROM "Charger";
EOF

echo -e "\n${BOLD}${YELLOW}[3/3]${NC} Executing database reset..."

# Execute the SQL script
docker-compose exec -T postgres psql -U postgres -d ev_charger_system -f - < "$TMP_SQL_FILE"
RESULT=$?

# Clean up the temporary file
rm -f "$TMP_SQL_FILE"

if [ $RESULT -eq 0 ]; then
  echo -e "\n${GREEN}${BOLD}✓ Database reset successful!${NC}"
  echo -e "${GREEN}All data has been deleted while preserving the schema.${NC}"
else
  echo -e "\n${RED}❌ Database reset failed!${NC}"
  echo -e "${RED}Please check the error messages above.${NC}"
  exit 1
fi

# Option to recreate sample data
echo -e "\nWould you like to create a sample partner for testing? ${YELLOW}[y/N]${NC}"
read -r create_sample

if [[ $create_sample == "y" || $create_sample == "Y" ]]; then
  echo -e "\n${CYAN}Creating a sample partner...${NC}"
  
  # Create sample data SQL
  SAMPLE_SQL=$(mktemp)
  cat > "$SAMPLE_SQL" << EOF
-- Create a sample partner
INSERT INTO "Partner" ("id", "name", "apiKey", "createdAt", "updatedAt")
VALUES (
  'sample-partner-id',
  'Sample Partner',
  'sample-api-key-for-testing',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Create a sample charger
INSERT INTO "Charger" ("id", "status", "meterValue", "lastUpdate", "createdAt", "updatedAt", "partnerId")
VALUES (
  'sample-charger-001',
  'AVAILABLE',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'sample-partner-id'
);

-- Show the created data
SELECT * FROM "Partner";
SELECT * FROM "Charger";
EOF

  # Execute the sample data SQL
  docker-compose exec -T postgres psql -U postgres -d ev_charger_system -f - < "$SAMPLE_SQL"
  rm -f "$SAMPLE_SQL"
  
  echo -e "\n${GREEN}${BOLD}✓ Sample data created successfully!${NC}"
  echo -e "${CYAN}Partner ID:${NC} sample-partner-id"
  echo -e "${CYAN}API Key:${NC} sample-api-key-for-testing"
  echo -e "${CYAN}Charger ID:${NC} sample-charger-001"
fi

echo -e "\n${BOLD}${GREEN}Database reset process completed!${NC}" 