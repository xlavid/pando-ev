# EV Charger System API Client Example

Below is a sample TypeScript client for interacting with the EV Charger System API. This client demonstrates how third-party partners can integrate with the API to manage EV chargers.

## TypeScript Client

```typescript
// ev-charger-api-client.ts

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Types for the API client
export enum ChargerStatus {
  AVAILABLE = 'AVAILABLE',
  BLOCKED = 'BLOCKED',
  CHARGING = 'CHARGING',
  INOPERATIVE = 'INOPERATIVE',
  REMOVED = 'REMOVED',
  RESERVED = 'RESERVED',
  UNKNOWN = 'UNKNOWN'
}

export interface Charger {
  id: string;
  status: ChargerStatus;
  meterValue: number;
  lastUpdate: string;
  partnerId: string;
  partner?: {
    id: string;
    name: string;
  };
}

export interface Partner {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChargerStatusUpdate {
  status: ChargerStatus;
  meterValue: number;
}

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  error?: string;
}

export class EVChargerApiClient {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  
  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    
    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleApiError(error)
    );
  }
  
  /**
   * Handle API errors and provide more context
   */
  private handleApiError(error: AxiosError): Promise<never> {
    const status = error.response?.status;
    let message = 'An unknown error occurred';
    
    if (error.response?.data && typeof error.response.data === 'object') {
      message = (error.response.data as any).error || message;
    }
    
    // Provide specific error messages based on status code
    switch (status) {
      case 400:
        message = `Bad request: ${message}`;
        break;
      case 401:
        message = 'Authentication failed: Invalid API key';
        break;
      case 403:
        message = 'Forbidden: You do not have permission to access this resource';
        break;
      case 404:
        message = 'Resource not found';
        break;
      case 429:
        message = 'Rate limit exceeded. Please try again later';
        break;
      case 500:
      case 502:
      case 503:
        message = `Server error: ${message}`;
        break;
    }
    
    return Promise.reject(new Error(message));
  }
  
  /**
   * Initialize a new charger in the system
   */
  public async initializeCharger(chargerId: string): Promise<ApiResponse<Charger>> {
    try {
      const response: AxiosResponse = await this.client.post('/api/v1/chargers', {
        chargerId
      });
      
      return {
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get charger status by ID
   */
  public async getChargerStatus(chargerId: string): Promise<ApiResponse<Charger>> {
    try {
      const response: AxiosResponse = await this.client.get(`/api/v1/chargers/${chargerId}`);
      
      return {
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update charger status
   */
  public async updateChargerStatus(
    chargerId: string, 
    status: ChargerStatus, 
    meterValue: number
  ): Promise<ApiResponse<Charger>> {
    try {
      const response: AxiosResponse = await this.client.put(
        `/api/v1/chargers/${chargerId}/status`,
        {
          status,
          meterValue
        }
      );
      
      return {
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get all chargers for a partner
   */
  public async getPartnerChargers(
    partnerId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ApiResponse<Charger[]>> {
    try {
      const response: AxiosResponse = await this.client.get(
        `/api/v1/partners/${partnerId}/chargers`,
        {
          params: { page, limit }
        }
      );
      
      return {
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get partner information
   */
  public async getPartner(partnerId: string): Promise<ApiResponse<Partner>> {
    try {
      const response: AxiosResponse = await this.client.get(`/api/v1/partners/${partnerId}`);
      
      return {
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Batch update multiple chargers (if supported by the API)
   * This is an example of a more advanced feature that could be added.
   */
  public async batchUpdateChargers(
    updates: Array<{ chargerId: string, status: ChargerStatus, meterValue: number }>
  ): Promise<ApiResponse<{ successful: string[], failed: string[] }>> {
    try {
      // Example of a batch update endpoint that could be implemented
      const response: AxiosResponse = await this.client.post(
        '/api/v1/chargers/batch-update',
        { updates }
      );
      
      return {
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Helper method to implement exponential backoff for retries
   */
  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // If server is overloaded (503), wait and retry
        if (error instanceof Error && 
            error.message.includes('Server error') || 
            error.message.includes('Rate limit')) {
          
          // Exponential backoff: 2^attempt * 100ms + random jitter
          const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // For other errors, don't retry
        throw error;
      }
    }
    
    throw lastError || new Error('Maximum retries exceeded');
  }
}
```

## Usage Example

```typescript
// example-usage.ts

import { EVChargerApiClient, ChargerStatus } from './ev-charger-api-client';

async function main() {
  try {
    // Initialize the client with your API key
    const client = new EVChargerApiClient(
      'https://api.example.com',
      'your-api-key-here'
    );
    
    // Get your partner ID (you should store this)
    const partnerId = 'partner-1';
    
    // Initialize a new charger
    const newCharger = await client.initializeCharger('charger-001');
    console.log('Initialized charger:', newCharger.data);
    
    // Update charger status with retries for reliability
    const updateStatus = await client.retryWithBackoff(() => 
      client.updateChargerStatus(
        'charger-001', 
        ChargerStatus.CHARGING, 
        12.5 // kWh meter reading
      )
    );
    console.log('Updated charger status:', updateStatus.data);
    
    // Get charger status
    const chargerStatus = await client.getChargerStatus('charger-001');
    console.log('Current charger status:', chargerStatus.data);
    
    // List all chargers for your partner
    const allChargers = await client.getPartnerChargers(partnerId);
    console.log(`Found ${allChargers.data.length} chargers`);
    
    // Example of handling different charger statuses
    for (const charger of allChargers.data) {
      switch (charger.status) {
        case ChargerStatus.AVAILABLE:
          console.log(`Charger ${charger.id} is available`);
          break;
        case ChargerStatus.CHARGING:
          console.log(`Charger ${charger.id} is currently charging, meter value: ${charger.meterValue} kWh`);
          break;
        case ChargerStatus.INOPERATIVE:
          console.log(`Charger ${charger.id} needs maintenance`);
          break;
        default:
          console.log(`Charger ${charger.id} status: ${charger.status}`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

## Error Handling Example

```typescript
// error-handling-example.ts

import { EVChargerApiClient, ChargerStatus } from './ev-charger-api-client';

async function safeChargerOperation() {
  const client = new EVChargerApiClient(
    'https://api.example.com',
    'your-api-key-here'
  );
  
  try {
    // Try to update a charger
    const result = await client.updateChargerStatus(
      'charger-001',
      ChargerStatus.AVAILABLE,
      15.5
    );
    
    console.log('Charger updated successfully');
    return result;
  } catch (error) {
    // Handle different types of errors
    if (error.message.includes('not found')) {
      console.error('Charger does not exist, creating a new one...');
      return await client.initializeCharger('charger-001');
    } else if (error.message.includes('permission')) {
      console.error('This charger belongs to another partner');
      // Handle authorization error
    } else if (error.message.includes('Rate limit')) {
      console.error('Rate limit reached, implementing backoff...');
      // Implement backoff strategy
    } else {
      console.error('Unexpected error:', error.message);
    }
    throw error;
  }
}
```

## WebSocket Client Example (Future Extension)

```typescript
// websocket-client-example.ts

import WebSocket from 'ws';
import { EVChargerApiClient, ChargerStatus } from './ev-charger-api-client';

class EVChargerWebSocketClient {
  private ws: WebSocket | null = null;
  private apiClient: EVChargerApiClient;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  
  constructor(wsUrl: string, apiClient: EVChargerApiClient) {
    this.apiClient = apiClient;
    this.connect(wsUrl);
  }
  
  private connect(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connection established');
      this.reconnectAttempts = 0;
      
      // Send authentication message
      this.ws.send(JSON.stringify({
        type: 'auth',
        apiKey: this.apiClient.getApiKey()
      }));
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'charger_status_update':
            console.log(`Charger ${data.chargerId} status updated to ${data.status}`);
            // Handle real-time status update
            break;
          case 'auth_success':
            console.log('Authentication successful');
            // Subscribe to specific chargers
            this.subscribeToChargers(['charger-001', 'charger-002']);
            break;
          default:
            console.log('Received message:', data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      
      // Implement reconnection with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.pow(2, this.reconnectAttempts) * 1000;
        console.log(`Attempting to reconnect in ${delay}ms...`);
        
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(wsUrl);
        }, delay);
      } else {
        console.error('Maximum reconnection attempts reached');
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  public subscribeToChargers(chargerIds: string[]) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        chargerIds
      }));
    } else {
      console.error('WebSocket not connected');
    }
  }
  
  public close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Example usage of WebSocket client
async function webSocketExample() {
  const apiClient = new EVChargerApiClient(
    'https://api.example.com',
    'your-api-key-here'
  );
  
  const wsClient = new EVChargerWebSocketClient(
    'wss://api.example.com/ws',
    apiClient
  );
  
  // The WebSocket client will automatically authenticate and subscribe to chargers
  
  // When done, close the connection
  setTimeout(() => {
    wsClient.close();
  }, 60000); // Close after 1 minute
}
```

This client implementation provides a robust way for partners to integrate with the EV Charger System API, including error handling, retry mechanisms, and WebSocket support for potential real-time updates in future versions. 