import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { Counter } from 'k6/metrics';

// Custom metrics
const createPartnerErrors = new Counter('create_partner_errors');
const initializeChargerErrors = new Counter('initialize_charger_errors');
const updateStatusErrors = new Counter('update_status_errors');
const getStatusErrors = new Counter('get_status_errors');
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

// Test configuration
export const options = {
  // Base test: 20 virtual users
  vus: 20,

  // Stages for ramping up and down load - reduced duration
  stages: [
    { duration: '10s', target: 250 },   // Quick ramp up to 250 users
    { duration: '20s', target: 500 },   // Ramp up to 500 users over 20 seconds
    { duration: '30s', target: 1000 },  // Ramp up to 1000 users over 30 seconds
    { duration: '1m', target: 1000 },   // Stay at 1000 users for 1 minute only
    { duration: '15s', target: 0 },     // Quick ramp down to 0 users
  ],

  // Thresholds for acceptable performance
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
    'json_parse_errors': ['count<10'], // Fail if we have too many JSON parse errors
  },
};

// Shared state across VUs
const sharedData = {
  baseUrl: 'http://172.18.0.3:3000', // Adjust to your API host
  apiKeys: [],  // Will store API keys for created partners
  chargerIds: [] // Will store created charger IDs
};

// Initialize data on first run
export function setup() {
  console.log('Setting up load test - fetching existing partners...');
  
  // Get the list of all partners instead of creating a new one
  const partnersResponse = http.get(`${sharedData.baseUrl}/api/v1/partners`);
  
  if (partnersResponse.status !== 200) {
    console.error(`Failed to fetch partners: ${partnersResponse.status} - ${partnersResponse.body}`);
    return {};
  }
  
  const parsedBody = safeParseJson(partnersResponse.body);
  if (parsedBody.error) {
    console.error("Failed to parse partners response");
    return {};
  }
  
  const partners = parsedBody.value;
  
  if (partners.length < 1) {
    console.error('No existing partners found. Please create at least one partner before running the test.');
    return { success: false };
  }
  
  // Store all partner API keys and IDs
  const partnerApiKeys = [];
  const partnerIds = [];
  
  for (const partner of partners) {
    partnerApiKeys.push(partner.apiKey);
    partnerIds.push(partner.id);
  }
  
  console.log(`Found ${partnerApiKeys.length} existing partners for testing`);
  
  return {
    success: true,
    partnerApiKeys: partnerApiKeys,
    partnerIds: partnerIds
  };
}

// Main test function
export default function(data) {
  const baseUrl = sharedData.baseUrl;
  
  if (!data.success || !data.partnerApiKeys || data.partnerApiKeys.length === 0) {
    console.log('Setup failed or no partners available. Skipping test.');
    return;
  }
  
  // Randomly select a partner for this test iteration
  const partnerIndex = Math.floor(Math.random() * data.partnerApiKeys.length);
  const apiKey = data.partnerApiKeys[partnerIndex];
  const partnerId = data.partnerIds[partnerIndex];
  
  // Create a unique identifier for this VU's test run
  const testRunId = `${__VU}-${__ITER}-${randomString(4)}`;
  
  // Skip partner creation, since it's rare in a real system
  
  group('Initialize Charger', function() {
    const chargerId = `charger-k6-${testRunId}`;
    
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
    
    // First check HTTP status
    const statusCheck = check(response, {
      'Charger initialized HTTP status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    });
    
    if (!statusCheck) {
      initializeChargerErrors.add(1);
      console.error(`Failed to initialize charger: ${response.status} - ${response.body}`);
      return;
    }
    
    // Then safely parse JSON and check the parsed response
    const parsedBody = safeParseJson(response.body);
    if (parsedBody.error) {
      initializeChargerErrors.add(1);
      return;
    }
    
    const jsonCheck = check(parsedBody.value, {
      'Response has charger data': (obj) => obj.id === chargerId,
    });
    
    if (!jsonCheck) {
      initializeChargerErrors.add(1);
    } else {
      // Store the charger ID for later use
      sharedData.chargerIds.push(chargerId);
    }
  });
  
  sleep(0.5);
  
  // Only continue if we have a charger ID
  if (sharedData.chargerIds.length === 0) return;
  
  // Use the latest created charger for this VU
  const testChargerId = sharedData.chargerIds[sharedData.chargerIds.length - 1];
  
  group('Get Charger Status', function() {
    const response = http.get(
      `${baseUrl}/api/v1/chargers/${testChargerId}`,
      { 
        headers: { 'X-API-Key': apiKey } 
      }
    );
    
    // First check HTTP status
    const statusCheck = check(response, {
      'Get status HTTP status is 200': (r) => r.status === 200,
    });
    
    if (!statusCheck) {
      getStatusErrors.add(1);
      console.error(`Failed to get charger status: ${response.status} - ${response.body}`);
      return;
    }
    
    // Then safely parse JSON and check the parsed response
    const parsedBody = safeParseJson(response.body);
    if (parsedBody.error) {
      getStatusErrors.add(1);
      return;
    }
    
    const jsonCheck = check(parsedBody.value, {
      'Response has status': (obj) => obj.status !== undefined,
      'Response has meterValue': (obj) => obj.meterValue !== undefined,
    });
    
    if (!jsonCheck) {
      getStatusErrors.add(1);
    }
  });
  
  group('Update Charger Status', function() {
    // Randomly select a status
    const statuses = ['AVAILABLE', 'BLOCKED', 'CHARGING', 'INOPERATIVE', 'REMOVED', 'RESERVED', 'UNKNOWN'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const randomMeterValue = Math.floor(Math.random() * 1000) / 10; // Random value between 0 and 100
    
    const response = http.put(
      `${baseUrl}/api/v1/chargers/${testChargerId}/status`,
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
    
    // First check HTTP status
    const statusCheck = check(response, {
      'Update status HTTP status is 200': (r) => r.status === 200,
    });
    
    if (!statusCheck) {
      updateStatusErrors.add(1);
      console.error(`Failed to update charger status: ${response.status} - ${response.body}`);
      return;
    }
    
    // Then safely parse JSON and check the parsed response
    const parsedBody = safeParseJson(response.body);
    if (parsedBody.error) {
      updateStatusErrors.add(1);
      return;
    }
    
    const jsonCheck = check(parsedBody.value, {
      'Status updated correctly': (obj) => obj.status === randomStatus,
      'Meter value updated correctly': (obj) => Math.abs(obj.meterValue - randomMeterValue) < 0.01,
    });
    
    if (!jsonCheck) {
      updateStatusErrors.add(1);
    }
  });
  
  // Final test - get all chargers for the partner
  group('Get Partner Chargers', function() {
    const response = http.get(
      `${baseUrl}/api/v1/partners/${partnerId}/chargers`,
      { 
        headers: { 'X-API-Key': apiKey } 
      }
    );
    
    // Check HTTP status
    const statusCheck = check(response, {
      'Get partner chargers HTTP status is 200': (r) => r.status === 200,
    });
    
    if (!statusCheck) {
      console.error(`Failed to get partner chargers: ${response.status} - ${response.body}`);
      return;
    }
    
    // Then safely parse JSON 
    const parsedBody = safeParseJson(response.body);
    if (!parsedBody.error) {
      check(parsedBody.value, {
        'Response is an array': (obj) => Array.isArray(obj),
      });
    }
  });
  
  // Add random sleep between requests to simulate real user behavior
  sleep(Math.random() * 2 + 1); // Sleep between 1-3 seconds
}

// Cleanup after test
export function teardown(data) {
  console.log('Load test complete');
  console.log(`JSON Parse Errors: ${jsonParseErrors.value}`);
} 