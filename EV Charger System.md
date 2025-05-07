System Design Interview Question

Background:
You are tasked with designing a new public REST API that will allow third-party partners
to integrate with ABC's EV charging solution. Partner’s app can provide their user EV
charging service. Your API should support the following key features:

1. Remotely switch on/off a charger.

2. Access real-time status of chargers (AVAILABLE, BLOCKED, CHARGING,
INOPERATIVE, REMOVED, RESERVED, UNKNOWN), timestamp of the last
update (useful for tracking changes and ensuring data freshness), and last
recorded meter value, in kilowatt-hours (kWh), indicating the total energy
consumed through this charger, often used for billing purposes.

Assumption:
1. 10 partners, each with 100K chargers, totaling 1M chargers.
2. Status update every second per charger.
3. ABC has internal APIs for the above features.

Outcome:
1. System architecture diagram using AWS
2. API Endpoint/Path
3. Authentication and authorization mechanisms
4. API signature (input/output)
5. Scalability and performance considerations
6. Error handling and logging
7. Security measures
8. Rate limiting and throttling
9. Versioning strategy
10. Documentation and developer experience
11. Sample client code to call the API.