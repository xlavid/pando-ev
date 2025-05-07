# EV Charger System API

A REST API for managing EV chargers, built with Express, TypeScript, Prisma, and PostgreSQL.

## Features

- Partner registration and API key management
- Charger registration and management
- Real-time charger status monitoring
- Secure API authentication via API keys
- API rate limiting
- Input validation
- Comprehensive error handling and logging
- Full Docker containerization for both API and database

## System Architecture

The API is designed to handle:
- 10 partners with 100K chargers each (1M total chargers)
- Status updates every second per charger

## Prerequisites

- Node.js (v14 or higher) - for local development only
- Docker and Docker Compose
- npm or yarn package manager - for local development only

## Docker Quick Start

The fastest way to get up and running with Docker:

```bash
npm run docker:quickstart
```

This script will:
1. Build all Docker images
2. Start all services (API and PostgreSQL)
3. Run tests to verify everything is working

All services run in Docker containers, with no need for local Node.js or PostgreSQL installations.

## Local Development Quick Start

For local development without Docker (requires Node.js and npm):

```bash
npm run quickstart
```

This script will:
1. Install dependencies
2. Start PostgreSQL in Docker
3. Set up the database
4. Start the API server locally
5. Run tests to verify everything is working

When finished, press Ctrl+C to stop the server.

## Docker Setup

The application is fully containerized using Docker Compose:

### Start all services

```bash
npm run docker:start
```

### Build the Docker images

```bash
npm run docker:build
```

### Stop all services

```bash
npm run docker:stop
```

### View logs

```bash
# View all logs
npm run docker:logs:all

# View API logs only
npm run docker:logs:api

# View PostgreSQL logs only
npm run docker:logs
```

## Manual Setup

If you prefer to set up the components individually:

### 1. Clone the repository

```bash
git clone <repository-url>
cd ev-charger-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL with Docker

The project includes a Docker Compose file to run PostgreSQL 17:

```bash
# Start PostgreSQL
npm run docker:up

# Check logs if needed
npm run docker:logs
```

Alternatively, you can use the database setup script:

```bash
npm run db:setup
```

This script will:
1. Start PostgreSQL in Docker
2. Create the database
3. Generate the Prisma client
4. Run initial migrations

### 4. Manual Database Setup (if not using the setup script)

If you didn't use the setup script, you need to:

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations to create the database schema
npm run prisma:migrate
```

### 5. Start the server

```bash
npm run dev
```

The API will be available at http://localhost:3000.

### 6. Test the API

The project includes a test script that exercises all the main API endpoints:

```bash
npm run api:test
```

This script will:
1. Create a test partner
2. Initialize a charger
3. Get the charger status
4. Update the charger status
5. Verify the updated status
6. List all chargers for the partner

### 7. Stopping the database

When you're done, you can stop the PostgreSQL container:

```bash
npm run docker:down
```

## Environment Variables

The Docker environment automatically sets these variables, but for local development create a `.env` file in the root directory with:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/ev_charger_system?schema=public"
PORT=3000
```

## API Documentation

### Authentication

All API requests (except partner creation) require an API key to be included in the `X-API-Key` header:

```
X-API-Key: your-api-key
```

### Partner Endpoints

#### Create Partner

```
POST /api/v1/partners
```

Request body:
```json
{
  "name": "Partner Company Name"
}
```

Response:
```json
{
  "id": "uuid",
  "name": "Partner Company Name",
  "apiKey": "generated-api-key",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

#### List Partners

```
GET /api/v1/partners
```

#### Get Partner

```
GET /api/v1/partners/:partnerId
```

### Charger Endpoints

#### Initialize Charger

```
POST /api/v1/chargers
```

Request body:
```json
{
  "chargerId": "charger-001"
}
```

#### Get Charger Status

```
GET /api/v1/chargers/:chargerId
```

#### Update Charger Status

```
PUT /api/v1/chargers/:chargerId/status
```

Request body:
```json
{
  "status": "CHARGING",
  "meterValue": 10.5
}
```

Possible status values:
- AVAILABLE
- BLOCKED
- CHARGING
- INOPERATIVE
- REMOVED
- RESERVED
- UNKNOWN

#### Get Partner Chargers

```
GET /api/v1/partners/:partnerId/chargers
```

## Scalability and Performance Considerations

- Database connection pooling via Prisma
- Rate limiting to prevent abuse
- Optimized Prisma queries
- Horizontal scalability with Docker Compose
- Multi-stage Docker builds for smaller images
- Docker containerization for consistent deployments

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- 200: OK
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Security Measures

- API Key Authentication
- HTTPS required (in production)
- Security headers via Helmet
- Input validation via Zod
- Rate limiting
- Minimal Docker images to reduce attack surface

## Documentation and Resources

- API Explorer: Available at Prisma Studio (`npm run prisma:studio`)
- Logging: Check container logs with Docker commands
- Database: PostgreSQL 17 running in Docker 