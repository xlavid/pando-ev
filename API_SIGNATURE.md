# EV Charger System API Signature

This document outlines the request and response formats for all endpoints in the EV Charger System API.

## Authentication

Most endpoints (except partner creation) require authentication using an API key provided in the `X-API-Key` header:

```
X-API-Key: your-api-key
```

## Endpoints

### Partner Endpoints

#### 1. Create Partner

Creates a new partner and returns an API key.

- **URL**: `/api/v1/partners`
- **Method**: `POST`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "name": "Partner Company Name"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "id": "uuid",
    "name": "Partner Company Name",
    "apiKey": "generated-api-key",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
  ```
- **Errors**:
  - `400 Bad Request`: Invalid request format
  - `500 Internal Server Error`: Server-side error

#### 2. List Partners

Returns a list of all partners.

- **URL**: `/api/v1/partners`
- **Method**: `GET` 
- **Authentication**: None
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "uuid",
      "name": "Partner Company Name",
      "apiKey": "api-key",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ]
  ```
- **Errors**:
  - `500 Internal Server Error`: Server-side error

#### 3. Get Partner

Returns a specific partner by ID.

- **URL**: `/api/v1/partners/:partnerId`
- **Method**: `GET`
- **Authentication**: None
- **Response**: `200 OK`
  ```json
  {
    "id": "uuid",
    "name": "Partner Company Name",
    "apiKey": "api-key",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
  ```
- **Errors**:
  - `404 Not Found`: Partner with specified ID not found
  - `500 Internal Server Error`: Server-side error

### Charger Endpoints

#### 4. Initialize Charger

Registers a new charger in the system.

- **URL**: `/api/v1/chargers`
- **Method**: `POST`
- **Authentication**: Required (X-API-Key)
- **Request Body**:
  ```json
  {
    "chargerId": "charger-001"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "id": "charger-001",
    "status": "AVAILABLE",
    "meterValue": 0,
    "lastUpdate": "2023-01-01T00:00:00.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "partnerId": "partner-uuid",
    "partner": {
      "id": "partner-uuid",
      "name": "Partner Company Name",
      "apiKey": "api-key",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```
- **Alternate Response**: `200 OK` (if charger already exists)
  ```json
  {
    "id": "charger-001",
    "status": "AVAILABLE",
    "meterValue": 0,
    "lastUpdate": "2023-01-01T00:00:00.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "partnerId": "partner-uuid",
    "partner": {
      "id": "partner-uuid",
      "name": "Partner Company Name",
      "apiKey": "api-key",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Invalid request format
  - `401 Unauthorized`: Missing or invalid API key
  - `409 Conflict`: Charger ID already exists with a different partner
  - `500 Internal Server Error`: Server-side error

#### 5. Get Charger Status

Returns the status of a specific charger.

- **URL**: `/api/v1/chargers/:chargerId`
- **Method**: `GET`
- **Authentication**: Required (X-API-Key)
- **Response**: `200 OK`
  ```json
  {
    "id": "charger-001",
    "status": "AVAILABLE",
    "meterValue": 10.5,
    "lastUpdate": "2023-01-01T00:00:00.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "partnerId": "partner-uuid",
    "partner": {
      "id": "partner-uuid",
      "name": "Partner Company Name",
      "apiKey": "api-key",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```
- **Errors**:
  - `401 Unauthorized`: Missing or invalid API key
  - `404 Not Found`: Charger with specified ID not found
  - `500 Internal Server Error`: Server-side error

#### 6. Update Charger Status

Updates the status and meter value of a charger.

- **URL**: `/api/v1/chargers/:chargerId/status`
- **Method**: `PUT`
- **Authentication**: Required (X-API-Key)
- **Request Body**:
  ```json
  {
    "status": "CHARGING",
    "meterValue": 10.5
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "id": "charger-001",
    "status": "CHARGING",
    "meterValue": 10.5,
    "lastUpdate": "2023-01-01T00:00:00.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "partnerId": "partner-uuid",
    "partner": {
      "id": "partner-uuid",
      "name": "Partner Company Name",
      "apiKey": "api-key",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```
- **Errors**:
  - `400 Bad Request`: Invalid request format or values
  - `401 Unauthorized`: Missing or invalid API key
  - `404 Not Found`: Charger with specified ID not found
  - `500 Internal Server Error`: Server-side error

#### 7. Get Partner Chargers

Returns all chargers for a specific partner.

- **URL**: `/api/v1/partners/:partnerId/chargers`
- **Method**: `GET`
- **Authentication**: Required (X-API-Key)
- **Response**: `200 OK`
  ```json
  [
    {
      "id": "charger-001",
      "status": "AVAILABLE",
      "meterValue": 10.5,
      "lastUpdate": "2023-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "partnerId": "partner-uuid",
      "partner": {
        "id": "partner-uuid",
        "name": "Partner Company Name",
        "apiKey": "api-key",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    }
  ]
  ```
- **Errors**:
  - `401 Unauthorized`: Missing or invalid API key
  - `403 Forbidden`: API key doesn't belong to the specified partner
  - `500 Internal Server Error`: Server-side error

## Charger Status Enum

The charger status field accepts the following values:

- `AVAILABLE`: Charger is available for use
- `BLOCKED`: Charger is physically blocked
- `CHARGING`: Charger is currently in use
- `INOPERATIVE`: Charger is not functioning
- `REMOVED`: Charger has been removed
- `RESERVED`: Charger is reserved
- `UNKNOWN`: Charger status cannot be determined

## Health Check Endpoint

A system health check endpoint is available to verify the API is functioning.

- **URL**: `/health`
- **Method**: `GET`
- **Authentication**: None
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
  ``` 