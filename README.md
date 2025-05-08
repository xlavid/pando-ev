# EV Charger System API

A high-performance REST API for managing EV chargers, built with Express, TypeScript, Prisma, and PostgreSQL, designed to handle high-volume concurrent requests from multiple partner integrations.

## Project Summary

This project implements a comprehensive REST API for ABC's EV charging solution that enables third-party partners to integrate with the system. The implementation addresses the following key requirements:

1. **Remote Charger Control**: Partners can remotely switch chargers on/off by updating their status through the API
2. **Real-time Status Monitoring**: Access to real-time charger status (AVAILABLE, BLOCKED, CHARGING, etc.) with timestamps and meter values
3. **Scalability**: Architecture designed to support 10 partners with 100K chargers each (1M total) with status updates every second
4. **Performance**: Optimized with caching, connection pooling, and query optimization to handle high-volume requests
5. **Security**: API key-based authentication and partner-specific authorization
6. **Documentation**: Complete API documentation with examples, client library, and AWS architecture design

The system achieves these goals through a modern, containerized application architecture with optimized database access patterns and robust error handling.

## QuickStart with Docker

The easiest way to get the EV Charger System up and running is using the provided quickstart script:

```bash
# Clone the repository
git clone <repository-url>
cd ev-charger-system

# Create a .env file with your credentials
touch .env
echo "POSTGRES_USER=postgres" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" >> .env
echo "ADMIN_API_KEY=$(openssl rand -hex 16)" >> .env

# Run the quickstart script
chmod +x ./scripts/docker-quickstart.sh
./scripts/docker-quickstart.sh
```

The quickstart script will:
1. Check if Docker is running
2. Clean up any existing containers and volumes
3. Load environment variables from your .env file
4. Build Docker images
5. Start PostgreSQL and wait for it to be healthy
6. Start the API service and wait for it to be available
7. Run basic API tests to verify functionality
8. Display useful Docker commands for monitoring and management

Once running, the API will be available at:
- API: http://localhost:3000
- Database: localhost:5432

### Prerequisites
- Docker and Docker Compose
- Node.js 14+ (for local development only)

### Load Testing (Optional)

To test the performance of the API under high load:

```bash
# Optional: Generate mock data (10 partners with 1M chargers) for realistic load testing
# Note: Ensure your PostgreSQL credentials are properly set in your .env file
chmod +x ./scripts/docker-generate-mock-data.sh
./scripts/docker-generate-mock-data.sh

# Run the load tests
chmod +x ./scripts/run-load-tests.sh
./scripts/run-load-tests.sh
```

The load test will simulate high traffic with up to 1000 concurrent users and provide detailed metrics on system performance. The optional mock data generation creates a realistic dataset of 10 partners with 100,000 chargers each (1 million total).

## System Overview

This system provides a robust API for third-party partners to integrate with ABC's EV charging solution, allowing partners to:

1. Remotely switch on/off chargers (via status updates)
2. Access real-time status of chargers
3. Manage large-scale charger networks efficiently

The system is designed to handle 10 partners with 100K chargers each (1M total), with status updates every second per charger.

## Architecture Highlights

![AWS Architecture](./AWS_Arch.png)

- **REST API**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: API key-based authentication
- **Caching**: In-memory cache for charger status with configurable TTL (5 seconds)
- **Containerization**: Full Docker support for consistent deployment
- **Performance**: Optimized for high-throughput with connection pooling and timeouts

## Scalability Features

The system is designed to handle:
- 10 partners with 100K chargers each (1M total chargers)
- Status updates every second per charger
- High volume concurrent requests

Key optimizations include:
- Database connection pooling with retry logic
- Response caching with 5-second TTL
- Query pattern optimization to reduce database load
- Timeout handling with graceful degradation
- Optimized PostgreSQL configuration
- Database indexing for fast lookups

## API Endpoints

### Partner Management
- `POST /api/v1/partners` - Create a new partner (requires admin authentication)
- `GET /api/v1/partners` - List all partners (requires admin authentication)
- `GET /api/v1/partners/:partnerId` - Get partner details (requires admin authentication)

### Charger Management
- `POST /api/v1/chargers` - Initialize a new charger
- `GET /api/v1/chargers/:chargerId` - Get charger status
- `PUT /api/v1/chargers/:chargerId/status` - Update charger status
- `GET /api/v1/partners/:partnerId/chargers` - Get all chargers for a partner

## Authentication and Authorization

### Partner Authentication
All charger-related API requests require a partner API key to be included in the `X-API-Key` header:

```
X-API-Key: your-api-key
```

Partner authorization ensures that:
- Each partner can only access and modify their own chargers
- Appropriate error responses (403) are returned for unauthorized access attempts
- All API keys are validated on each request

### Admin Authentication
All partner management endpoints require an admin API key to be included in the `X-Admin-API-Key` header:

```
X-Admin-API-Key: your-admin-api-key
```

The admin API key should be set as an environment variable in the `.env` file:
```
ADMIN_API_KEY=your_secure_admin_api_key
```

**Security Note:** 
- Never hardcode the admin API key in your application or scripts
- Keep your `.env` file out of version control (it's included in `.gitignore`)
- For production, use secure environment variable management systems (such as AWS Secrets Manager, Kubernetes Secrets, etc.)
- Regularly rotate your admin API key following security best practices

This means that creating, listing, and retrieving partner details all require admin authentication, ensuring that partner management functions are restricted to authorized administrators only.

## Error Handling and Logging

The system includes comprehensive error handling:
- Structured error responses with appropriate HTTP status codes
- Detailed logging with request IDs for traceability
- Timeout handling with 503 responses and retry suggestions
- Request validation with Zod schema

## Performance Considerations

- **Database Connection Pooling**: Optimized Prisma client with connection pooling (up to 50 connections)
- **Caching**: In-memory cache for charger status with 5-second TTL
- **Query Optimization**: Selective field retrieval and optimized database queries
- **Timeout Handling**: All database operations have configurable timeouts with graceful fallbacks
- **PostgreSQL Tuning**: Optimized settings for high-throughput scenarios

## Security Features

- **API Key Authentication**: All endpoints require valid API keys
- **Authorization**: Partners can only access their own chargers
- **Admin Authentication**: Separate admin API key for partner management
- **Input Validation**: Comprehensive validation using Zod schema
- **Security Headers**: Helmet middleware for HTTP security headers
- **Error Handling**: Structured error responses without exposing internals

## Advanced Setup Options

### Manual Docker Setup

If you prefer to set up the system manually:

```bash
# Create .env file with required variables
touch .env
echo "POSTGRES_USER=postgres" >> .env
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" >> .env
echo "ADMIN_API_KEY=$(openssl rand -hex 16)" >> .env

# Build and start the services
docker-compose build
docker-compose up -d

# Wait for services to be healthy
# You can check the logs with:
docker-compose logs -f
```

## Environment Setup

The EV Charger System requires certain environment variables to be configured properly:

1. **PostgreSQL Credentials**: Used for database connections (`POSTGRES_USER` and `POSTGRES_PASSWORD`)
2. **Admin API Key**: Required for partner management operations (`ADMIN_API_KEY`)

Both sets of credentials are essential for the system to function properly.

### Setting Up Environment Variables

1. **Create a .env file**:
   ```bash
   # Create a .env file in the project root
   touch .env
   ```

2. **Add required variables to the .env file**:
   ```
   # Database connection string (for local development)
   DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/ev_charger_system?schema=public"
   
   # PostgreSQL credentials
   POSTGRES_USER="postgres"
   POSTGRES_PASSWORD="your_secure_password"
   
   # Admin API key - use a strong random value for production environments
   ADMIN_API_KEY="your_secure_generated_key"
   ```

3. **For Docker**:
   The `docker-compose.yml` file is configured to use environment variables from your host machine or .env file. Make sure the `ADMIN_API_KEY` is set before running `docker-compose up`.

4. **Generate a secure API key**:
   You can generate a secure random key using:
   ```bash
   # Using OpenSSL (recommended for production)
   openssl rand -hex 16
   
   # Or using Node.js
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```

### Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `POSTGRES_USER` | PostgreSQL username | Yes | postgres |
| `POSTGRES_PASSWORD` | PostgreSQL password | Yes | - |
| `ADMIN_API_KEY` | Secret key for admin API endpoints | Yes | - |
| `NODE_ENV` | Environment (development/production) | No | development |
| `LOG_LEVEL` | Logging verbosity | No | info |
| `DATABASE_CONNECTION_LIMIT` | Max DB connections | No | 50 |
| `DATABASE_CONNECTION_TIMEOUT` | DB timeout (seconds) | No | 30 |

### Security Notes

- Never commit your `.env` file to version control
- Use different API keys for development and production
- In production environments, consider using a secrets management service
- Rotate your admin API key regularly
- In Kubernetes environments, use Kubernetes Secrets

## API Examples

### Create Partner (Admin Only)

```bash
curl -X POST http://localhost:3000/api/v1/partners \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: $ADMIN_API_KEY" \
  -d '{"name": "Partner Company Name"}'
```

Response:
```json
{
  "id": "12345-uuid",
  "name": "Partner Company Name",
  "apiKey": "generated-api-key"
}
```

### Initialize Charger

```bash
curl -X POST http://localhost:3000/api/v1/chargers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"chargerId": "charger-001"}'
```

Response:
```json
{
  "id": "charger-001",
  "status": "AVAILABLE",
  "meterValue": 0,
  "lastUpdate": "2023-05-15T10:30:00Z",
  "partnerId": "12345-uuid",
  "partner": {
    "id": "12345-uuid",
    "name": "Partner Company Name"
  }
}
```

### Update Charger Status

```bash
curl -X PUT http://localhost:3000/api/v1/chargers/charger-001/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"status": "CHARGING", "meterValue": 10.5}'
```

Response:
```json
{
  "id": "charger-001",
  "status": "CHARGING",
  "meterValue": 10.5,
  "lastUpdate": "2023-05-15T10:35:00Z",
  "partnerId": "12345-uuid",
  "partner": {
    "id": "12345-uuid",
    "name": "Partner Company Name"
  }
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

### Get Charger Status

```bash
curl -X GET http://localhost:3000/api/v1/chargers/charger-001 \
  -H "X-API-Key: your-api-key"
```

Response:
```json
{
  "id": "charger-001",
  "status": "CHARGING",
  "meterValue": 10.5,
  "lastUpdate": "2023-05-15T10:35:00Z",
  "partnerId": "12345-uuid",
  "partner": {
    "id": "12345-uuid",
    "name": "Partner Company Name"
  }
}
```

### List All Partners (Admin Only)

```bash
curl -X GET http://localhost:3000/api/v1/partners \
  -H "X-Admin-API-Key: $ADMIN_API_KEY"
```

Response:
```json
[
  {
    "id": "12345-uuid",
    "name": "Partner Company Name",
    "apiKey": "partner-api-key-1",
    "createdAt": "2023-05-15T10:30:00Z",
    "updatedAt": "2023-05-15T10:30:00Z"
  },
  {
    "id": "67890-uuid",
    "name": "Another Partner",
    "apiKey": "partner-api-key-2",
    "createdAt": "2023-05-15T11:20:00Z",
    "updatedAt": "2023-05-15T11:20:00Z"
  }
]
```

## AWS Architecture Design

For production deployment, this system can be deployed on AWS with the following components:

1. **API Gateway**: Front all API requests with rate limiting, caching, and authorization
2. **Elastic Load Balancer**: Distribute traffic across multiple API instances
3. **ECS/EKS**: Run containerized API services with auto-scaling capabilities
4. **RDS PostgreSQL**: Managed database service with read replicas for scaling reads
5. **ElastiCache Redis**: Distributed caching for charger status
6. **CloudWatch**: Monitoring and alerting
7. **X-Ray**: Distributed tracing for performance analysis

See the [AWS Architecture documentation](AWS_ARCHITECTURE.md) for detailed deployment guidance.

## API Client Library

For third-party partners looking to integrate with our system, we provide a TypeScript client library that handles authentication, error handling, and retry logic. See the [API Client Example](API_CLIENT_EXAMPLE.md) for details.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 