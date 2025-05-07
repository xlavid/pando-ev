import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const chargerFetchCount = new Counter('charger_fetch_count');
const statusUpdateCount = new Counter('status_update_count');
const statusUpdateTrend = new Trend('status_update_duration');
const jsonParseErrors = new Counter('json_parse_errors');

// Helper function to safely parse JSON
function safeParseJson(str) {
  try {
    return {
      value: JSON.parse(str),
      error: null
    };
  } catch (err) {
    jsonParseErrors.add(1);
    console.error(`Error parsing JSON: ${err.message}`);
    console.log(`Problematic JSON string: ${str.substring(0, 100)}...`);
    return {
      value: null,
      error: err
    };
  }
}

// Test configuration - high volume test
export const options = {
  // A moderate number of VUs making many requests
  vus: 50,
  
  // Ramping stages for realistic load simulation
  stages: [
    { duration: '30s', target: 500 },    // Ramp up to 500 users
    { duration: '1m', target: 2500 },    // Ramp up to 2,500 users
    { duration: '1m', target: 5000 },    // Ramp up to 5,000 users
    { duration: '1m', target: 10000 },   // Ramp up to 10,000 users for peak load
    { duration: '2m', target: 10000 },   // Stay at peak for 2 minutes 
    { duration: '30s', target: 0 },      // Ramp down to 0
  ],

  // Set request timeout to 10s to prevent very long hanging requests
  timeout: '10s',

  // Thresholds for acceptable performance under high load
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% of requests should be below 1.5 seconds under high load
    http_req_failed: ['rate<0.10'],    // Less than 10% of requests should fail under high load
    'status_update_duration': ['p(95)<2000'], // 95% of status updates should be under 2 seconds
    'json_parse_errors': ['count<10'], // Fail if we have too many JSON parse errors
  },
};

// Environment variables
const baseUrl = __ENV.API_URL || 'http://api:3000'; // Use environment variable or default to service name

// Use these pre-generated values from your mock data
const PARTNER_COUNT = 10;
const CHARGER_COUNT_PER_PARTNER = 100000; // Up to 100k chargers per partner

// Helper function to get a random number between min and max
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pre-generated API keys - these will be populated in setup
let partnerApiKeys = [];
let partnerIds = [];

// Setup function to get API keys for existing partners
export function setup() {
  console.log('Setting up high volume test - fetching partner data...');
  console.log('Note: This test focuses on charger status operations, not partner creation');
  console.log(`Using API URL: ${baseUrl}`);
  
  // Get the list of all partners
  const partnersResponse = http.get(`${baseUrl}/api/v1/partners`);
  
  if (partnersResponse.status !== 200) {
    console.error(`Failed to fetch partners: ${partnersResponse.status} - ${partnersResponse.body}`);
    console.error(`API URL used: ${baseUrl}/api/v1/partners`);
    return { success: false };
  }
  
  const parsedBody = safeParseJson(partnersResponse.body);
  if (parsedBody.error) {
    console.error("Failed to parse partners response");
    return { success: false };
  }
  
  const partners = parsedBody.value;
  
  if (partners.length < 1) {
    console.error('No partners found. Please run the mock data generation first.');
    return { success: false };
  }
  
  // Store the partner API keys and IDs
  for (const partner of partners) {
    partnerApiKeys.push(partner.apiKey);
    partnerIds.push(partner.id);
  }
  
  console.log(`Found ${partnerApiKeys.length} partners for testing`);
  console.log('Ready to run high-volume test on charger operations (status updates, queries)');
  
  return { 
    success: true,
    partnerCount: partnerApiKeys.length
  };
}

// Main test function
export default function(data) {
  if (!data.success || partnerApiKeys.length === 0) {
    console.log('Setup failed or no partners available. Skipping test.');
    return;
  }
  
  // Randomly select a partner for this test iteration
  const partnerIndex = getRandomInt(0, partnerApiKeys.length - 1);
  const apiKey = partnerApiKeys[partnerIndex];
  const partnerId = partnerIds[partnerIndex];
  
  // Realistic delay between user actions - shorter for high volume
  sleep(Math.random() * 0.5);
  
  // Determine operation based on adjusted probability distribution:
  // - 1% initialize charger
  // - 70% query charger
  // - 29% update charger status
  const operation = Math.random() * 100;
  
  // 1% chance: Initialize a new charger
  if (operation < 1) {
    group('Initialize Charger', function() {
      // Generate a unique charger ID
      const chargerId = `charger-high-vol-${__VU}-${__ITER}-${getRandomInt(1000, 9999)}`;
      
      const response = http.post(
        `${baseUrl}/api/v1/chargers`,
        JSON.stringify({ chargerId: chargerId }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          } 
        }
      );
      
      check(response, {
        'Charger initialize status is 201': (r) => r.status === 201 || r.status === 200,
      });
    });
  }
  // 70% chance: Get a random charger's status
  else if (operation < 71) {
    group('Get Random Charger Status', function() {
      // Generate a random charger ID based on the pattern used in mock data
      const mockPartnerIndex = (partnerIndex % 10) + 1; // Get a number between 1-10
      const randomNumber = getRandomInt(0, 99999); // 0-99999
      const randomChargerId = `charger-${mockPartnerIndex}-${randomNumber}`;
      
      const response = http.get(
        `${baseUrl}/api/v1/chargers/${randomChargerId}`,
        { headers: { 'X-API-Key': apiKey } }
      );
      
      const statusCheck = check(response, {
        'Get charger status HTTP status is 200': (r) => r.status === 200,
      });
      
      if (!statusCheck) return;
      
      const parsedBody = safeParseJson(response.body);
      if (parsedBody.error) return;
      
      check(parsedBody.value, {
        'Response has status field': (obj) => obj.status !== undefined
      });
      
      chargerFetchCount.add(1);
    });
  } 
  // 29% chance: Update a random charger's status
  else {
    group('Update Random Charger Status', function() {
      // Generate a random charger ID based on the pattern used in mock data
      const mockPartnerIndex = (partnerIndex % 10) + 1; // Get a number between 1-10
      const randomNumber = getRandomInt(0, 99999); // 0-99999
      const randomChargerId = `charger-${mockPartnerIndex}-${randomNumber}`;
      
      // Randomly select a status
      const statuses = ['AVAILABLE', 'BLOCKED', 'CHARGING', 'INOPERATIVE', 'REMOVED', 'RESERVED', 'UNKNOWN'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const randomMeterValue = Math.floor(Math.random() * 1000) / 10; // Random value between 0 and 100
      
      const startTime = new Date();
      
      const response = http.put(
        `${baseUrl}/api/v1/chargers/${randomChargerId}/status`,
        JSON.stringify({ 
          status: randomStatus,
          meterValue: randomMeterValue
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          } 
        }
      );
      
      const endTime = new Date();
      statusUpdateTrend.add(endTime - startTime);
      
      const statusCheck = check(response, {
        'Update charger status HTTP status is 200': (r) => r.status === 200,
      });
      
      if (!statusCheck) return;
      
      const parsedBody = safeParseJson(response.body);
      if (parsedBody.error) return;
      
      check(parsedBody.value, {
        'Status updated correctly': (obj) => obj.status === randomStatus
      });
      
      statusUpdateCount.add(1);
    });
  }
  
  // Get partner chargers list (low probability - only 2% of the time)
  if (Math.random() < 0.02) {
    group('List Partner Chargers', function() {
      const response = http.get(
        `${baseUrl}/api/v1/partners/${partnerId}/chargers`,
        { headers: { 'X-API-Key': apiKey } }
      );
      
      const statusCheck = check(response, {
        'List chargers HTTP status is 200': (r) => r.status === 200,
      });
      
      if (!statusCheck) return;
      
      const parsedBody = safeParseJson(response.body);
      if (parsedBody.error) return;
      
      check(parsedBody.value, {
        'Response is an array': (obj) => Array.isArray(obj)
      });
    });
  }
  
  // Add a random pause between operations to simulate real user behavior
  // Use shorter pauses for high volume testing 
  sleep(Math.random() * 1 + 0.3); // Sleep between 0.3-1.3 seconds
}

// Teardown function
export function teardown(data) {
  console.log('High volume test completed');
  console.log(`Performed ${chargerFetchCount.name}: ${chargerFetchCount.value} operations`);
  console.log(`Performed ${statusUpdateCount.name}: ${statusUpdateCount.value} operations`);
  console.log(`JSON Parse Errors: ${jsonParseErrors.value}`);
} 