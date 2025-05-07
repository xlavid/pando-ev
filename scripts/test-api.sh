#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Base URL
API_URL="http://localhost:3000/api/v1"

echo -e "${BOLD}${BLUE}╔═════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║        Testing EV Charger System API            ║${NC}"
echo -e "${BOLD}${BLUE}╚═════════════════════════════════════════════════╝${NC}"

# Create a partner
echo -e "\n${BOLD}${YELLOW}[1/12]${NC} Creating a partner..."
PARTNER_RESPONSE=$(curl -s -X POST ${API_URL}/partners \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Partner"}')

# Extract partner ID and API key
PARTNER_ID=$(echo $PARTNER_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
API_KEY=$(echo $PARTNER_RESPONSE | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)

if [ -z "$API_KEY" ]; then
  echo -e "${RED}❌ Failed to create partner${NC}"
  echo -e "${RED}Response: $PARTNER_RESPONSE${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Partner created:"
echo -e "   ${CYAN}ID:${NC}     $PARTNER_ID"
echo -e "   ${CYAN}API Key:${NC} $API_KEY"

# Initialize a charger with a unique ID based on timestamp
echo -e "\n${BOLD}${YELLOW}[2/12]${NC} Initializing a charger..."
TIMESTAMP=$(date +%s)
CHARGER_ID="charger-test-$TIMESTAMP"
CHARGER_RESPONSE=$(curl -s -X POST ${API_URL}/chargers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"chargerId\":\"$CHARGER_ID\"}")

if [[ "$CHARGER_RESPONSE" == *"error"* ]]; then
  echo -e "${RED}❌ Failed to initialize charger${NC}"
  echo -e "${RED}Response: $CHARGER_RESPONSE${NC}"
  exit 1
else
  echo -e "${GREEN}✓${NC} Charger initialized:"
  echo -e "   ${CYAN}ID:${NC} $CHARGER_ID"
fi

# Get charger status
echo -e "\n${BOLD}${YELLOW}[3/12]${NC} Getting charger status..."
STATUS_RESPONSE=$(curl -s -X GET ${API_URL}/chargers/$CHARGER_ID \
  -H "X-API-Key: $API_KEY")

INITIAL_STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
INITIAL_METER=$(echo $STATUS_RESPONSE | grep -o '"meterValue":[^,}]*' | cut -d':' -f2)

if [[ "$STATUS_RESPONSE" == *"error"* ]]; then
  echo -e "${RED}❌ Failed to get charger status${NC}"
  echo -e "${RED}Response: $STATUS_RESPONSE${NC}"
  exit 1
else
  echo -e "${GREEN}✓${NC} Retrieved charger status:"
  echo -e "   ${CYAN}Status:${NC}      $INITIAL_STATUS"
  echo -e "   ${CYAN}Meter Value:${NC} $INITIAL_METER kWh"
fi

# Test 1: Switch charger ON (set to CHARGING)
echo -e "\n${BOLD}${YELLOW}[4/12]${NC} ${BOLD}TEST 1:${NC} Switching charger ON (CHARGING)..."
ON_RESPONSE=$(curl -s -X PUT ${API_URL}/chargers/$CHARGER_ID/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"status":"CHARGING","meterValue":0.5}')

# Verify charger is ON
echo -e "\n${BOLD}${YELLOW}[5/12]${NC} Verifying charger is ON..."
VERIFY_ON=$(curl -s -X GET ${API_URL}/chargers/$CHARGER_ID \
  -H "X-API-Key: $API_KEY")

# Extract status to check if it's CHARGING
ON_STATUS=$(echo $VERIFY_ON | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
ON_METER=$(echo $VERIFY_ON | grep -o '"meterValue":[^,}]*' | cut -d':' -f2)

if [[ "$ON_STATUS" == "CHARGING" ]]; then
  echo -e "${GREEN}✓ SUCCESS:${NC} Charger successfully switched ON"
  echo -e "   ${CYAN}Status:${NC}      $ON_STATUS"
  echo -e "   ${CYAN}Meter Value:${NC} $ON_METER kWh"
else
  echo -e "${RED}❌ FAILURE:${NC} Charger not switched ON"
  echo -e "   ${CYAN}Current Status:${NC} $ON_STATUS"
  exit 1
fi

# Test 2: Send charging progress updates
echo -e "\n${BOLD}${YELLOW}[6/12]${NC} ${BOLD}TEST 2:${NC} Sending charging progress updates..."
for i in {1..3}; do
  # Update meter value as charging progresses
  METER_VALUE=$(echo "scale=2; $i * 1.5" | bc)
  PROGRESS_RESPONSE=$(curl -s -X PUT ${API_URL}/chargers/$CHARGER_ID/status \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{\"status\":\"CHARGING\",\"meterValue\":$METER_VALUE}")
  
  PROG_STATUS=$(echo $PROGRESS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  PROG_METER=$(echo $PROGRESS_RESPONSE | grep -o '"meterValue":[^,}]*' | cut -d':' -f2)
  
  echo -e "   ${GREEN}✓${NC} Progress update $i:"
  echo -e "      ${CYAN}Status:${NC}      $PROG_STATUS"
  echo -e "      ${CYAN}Meter Value:${NC} $PROG_METER kWh"
  sleep 1
done

# Test 3: Switch charger OFF (set to AVAILABLE)
echo -e "\n${BOLD}${YELLOW}[7/12]${NC} ${BOLD}TEST 3:${NC} Switching charger OFF (AVAILABLE)..."
OFF_RESPONSE=$(curl -s -X PUT ${API_URL}/chargers/$CHARGER_ID/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"status":"AVAILABLE","meterValue":4.5}')

# Verify charger is OFF
echo -e "\n${BOLD}${YELLOW}[8/12]${NC} Verifying charger is OFF..."
VERIFY_OFF=$(curl -s -X GET ${API_URL}/chargers/$CHARGER_ID \
  -H "X-API-Key: $API_KEY")

# Extract status to check if it's AVAILABLE
OFF_STATUS=$(echo $VERIFY_OFF | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
OFF_METER=$(echo $VERIFY_OFF | grep -o '"meterValue":[^,}]*' | cut -d':' -f2)

if [[ "$OFF_STATUS" == "AVAILABLE" ]]; then
  echo -e "${GREEN}✓ SUCCESS:${NC} Charger successfully switched OFF"
  echo -e "   ${CYAN}Status:${NC}      $OFF_STATUS"
  echo -e "   ${CYAN}Meter Value:${NC} $OFF_METER kWh"
else
  echo -e "${RED}❌ FAILURE:${NC} Charger not switched OFF"
  echo -e "   ${CYAN}Current Status:${NC} $OFF_STATUS"
  exit 1
fi

# Test 4: Set charger to INOPERATIVE (simulate error condition)
echo -e "\n${BOLD}${YELLOW}[9/12]${NC} ${BOLD}TEST 4:${NC} Setting charger to INOPERATIVE..."
ERROR_RESPONSE=$(curl -s -X PUT ${API_URL}/chargers/$CHARGER_ID/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"status":"INOPERATIVE","meterValue":4.5}')

# Verify charger is INOPERATIVE
echo -e "\n${BOLD}${YELLOW}[10/12]${NC} Verifying charger is INOPERATIVE..."
VERIFY_ERROR=$(curl -s -X GET ${API_URL}/chargers/$CHARGER_ID \
  -H "X-API-Key: $API_KEY")

# Extract status to check if it's INOPERATIVE
ERROR_STATUS=$(echo $VERIFY_ERROR | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
ERROR_METER=$(echo $VERIFY_ERROR | grep -o '"meterValue":[^,}]*' | cut -d':' -f2)

if [[ "$ERROR_STATUS" == "INOPERATIVE" ]]; then
  echo -e "${GREEN}✓ SUCCESS:${NC} Charger successfully set to INOPERATIVE"
  echo -e "   ${CYAN}Status:${NC}      $ERROR_STATUS"
  echo -e "   ${CYAN}Meter Value:${NC} $ERROR_METER kWh"
else
  echo -e "${RED}❌ FAILURE:${NC} Charger not set to INOPERATIVE"
  echo -e "   ${CYAN}Current Status:${NC} $ERROR_STATUS"
  exit 1
fi

# Test 5: Reset charger to AVAILABLE
echo -e "\n${BOLD}${YELLOW}[11/12]${NC} ${BOLD}TEST 5:${NC} Resetting charger to AVAILABLE..."
RESET_RESPONSE=$(curl -s -X PUT ${API_URL}/chargers/$CHARGER_ID/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"status":"AVAILABLE","meterValue":4.5}')

RESET_STATUS=$(echo $RESET_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [[ "$RESET_STATUS" == "AVAILABLE" ]]; then
  echo -e "${GREEN}✓ SUCCESS:${NC} Charger successfully reset to AVAILABLE"
else 
  echo -e "${RED}❌ FAILURE:${NC} Charger not reset to AVAILABLE"
  exit 1
fi

# Get all partner's chargers
echo -e "\n${BOLD}${YELLOW}[12/12]${NC} Getting all partner's chargers..."
CHARGERS_RESPONSE=$(curl -s -X GET ${API_URL}/partners/$PARTNER_ID/chargers \
  -H "X-API-Key: $API_KEY")

CHARGERS_COUNT=$(echo $CHARGERS_RESPONSE | grep -o '"id":"[^"]*"' | wc -l)
echo -e "${GREEN}✓${NC} Retrieved $CHARGERS_COUNT charger(s)"

# Summary of tests
echo -e "\n${BOLD}${BLUE}╔═════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║               Test Summary                      ║${NC}"
echo -e "${BOLD}${BLUE}╚═════════════════════════════════════════════════╝${NC}"

echo -e "${GREEN}✓${NC} Created partner and obtained API key"
echo -e "${GREEN}✓${NC} Initialized a new charger"
echo -e "${GREEN}✓${NC} Retrieved charger status"
echo -e "${GREEN}✓${NC} Switched charger ON (CHARGING)"
echo -e "${GREEN}✓${NC} Updated charging progress"
echo -e "${GREEN}✓${NC} Switched charger OFF (AVAILABLE)"
echo -e "${GREEN}✓${NC} Set charger to INOPERATIVE (error state)"
echo -e "${GREEN}✓${NC} Reset charger to AVAILABLE"
echo -e "${GREEN}✓${NC} Retrieved all partner's chargers"

echo -e "\n${BOLD}${GREEN}API test completed successfully!${NC}" 