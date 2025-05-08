# EV Charger System API

A high-performance REST API for managing EV chargers, built with Express, TypeScript, Prisma, and PostgreSQL, designed to handle high-volume concurrent requests from multiple partner integrations.

## System Overview

This system provides a robust API for third-party partners to integrate with ABC's EV charging solution, allowing partners to:

1. Remotely switch on/off chargers (via status updates)
2. Access real-time status of chargers
3. Manage large-scale charger networks efficiently

The system is designed to handle 10 partners with 100K chargers each (1M total), with status updates every second per charger.

## Architecture Highlights

![System Architecture](https://via.placeholder.com/800x600?text=EV+Charger+System+Architecture) 

- **REST API**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: API key-based authentication
- **Caching**: In-memory cache for charger status with configurable TTL
- **Containerization**: Full Docker support for consistent deployment
- **Monitoring**: Prometheus metrics and health check endpoints

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
- `POST /api/v1/partners` - Create a new partner
- `GET /api/v1/partners` - List all partners
- `GET /api/v1/partners/:partnerId` - Get partner details

### Charger Management
- `POST /api/v1/chargers` - Initialize a new charger
- `GET /api/v1/chargers/:chargerId` - Get charger status
- `PUT /api/v1/chargers/:chargerId/status` - Update charger status
- `GET /api/v1/partners/:partnerId/chargers` - Get all chargers for a partner

## Authentication and Authorization

All API requests (except partner creation) require an API key to be included in the `X-API-Key` header:

```
X-API-Key: your-api-key
```

Authorization ensures that:
- Each partner can only access and modify their own chargers
- Appropriate error responses (403) are returned for unauthorized access attempts
- All API keys are validated on each request

## Error Handling and Logging

The system includes comprehensive error handling:
- Structured error responses with appropriate HTTP status codes
- Detailed logging with request IDs for traceability
- Timeout handling with 503 responses and retry suggestions
- JSON validation errors with specific feedback

## Performance Considerations

- **Database Connection Pooling**: Optimized Prisma client with connection pooling (up to 50 connections) and retry logic
- **Caching**: In-memory cache for charger status with 5-second TTL
- **Query Optimization**: Selective field retrieval and optimized queries
- **Timeout Handling**: All database operations have configurable timeouts with graceful fallbacks
- **PostgreSQL Tuning**: Optimized settings for high-throughput scenarios

## Security Features

- **API Key Authentication**: All endpoints require valid API keys
- **Authorization**: Partners can only access their own chargers
- **Input Validation**: Comprehensive validation using Zod schema
- **Security Headers**: Helmet middleware for HTTP security headers
- **Error Handling**: Structured error responses without exposing internals

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 14+ (for local development only)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd ev-charger-system

# Start with Docker Compose
docker-compose up -d
```

### Run Load Tests

```bash
# Run the load tests
./scripts/run-load-tests.sh
```

## API Examples

### Create Partner

```bash
curl -X POST http://localhost:3000/api/v1/partners \
  -H "Content-Type: application/json" \
  -d '{"name": "Partner Company Name"}'
```

### Initialize Charger

```bash
curl -X POST http://localhost:3000/api/v1/chargers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"chargerId": "charger-001"}'
```

### Update Charger Status

```bash
curl -X PUT http://localhost:3000/api/v1/chargers/charger-001/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"status": "CHARGING", "meterValue": 10.5}'
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

## AWS Architecture Considerations

For production deployment on AWS, the following architecture would be recommended:

1. **API Gateway**: Front all API requests with API Gateway for rate limiting, caching, and authorization
2. **Elastic Load Balancer**: Distribute traffic across multiple API instances
3. **ECS/EKS**: Run containerized API services with auto-scaling capabilities
4. **RDS PostgreSQL**: Managed database service with read replicas for scaling reads
5. **ElastiCache Redis**: Distributed caching for charger status
6. **CloudWatch**: Monitoring and alerting
7. **X-Ray**: Distributed tracing for performance analysis
8. **S3**: Store logs and analytics data
9. **Lambda**: Serverless functions for auxiliary processing

## Future Improvements

- Distributed caching with Redis
- Enhanced metrics collection
- Horizontal scaling with load balancing
- Content Delivery Network (CDN) integration
- GraphQL API for more flexible queries
- WebSocket support for real-time updates

## License

This project is licensed under the MIT License - see the LICENSE file for details. 