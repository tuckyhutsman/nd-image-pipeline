# Image Processing Pipeline

Professional batch image processing with high-fidelity resizing and team collaboration.

## Quick Start

```bash
docker-compose up -d
# Wait 30 seconds then visit http://localhost:3000
```

## Features

- Web-based UI for remote team access
- High-fidelity image resizing (Lanczos + gamma correction)
- Multiple output formats from single master image
- Centralized pipeline management
- Real-time job tracking
- Scalable worker architecture

## Documentation

- README.md (this file)
- docker-compose.yml - Full stack configuration
- .env - Environment configuration (copy .env.example)

## First Steps

1. Access http://localhost:3000
2. Go to "Manage Pipelines"
3. Create a test pipeline
4. Submit an image
5. Watch it process!

## Environment

Edit .env for configuration:
- DB_PASSWORD - Change before production
- JWT_SECRET - Change before production
- REACT_APP_API_URL - Your public API URL

## API Endpoints

- GET /api/pipelines - List pipelines
- POST /api/pipelines - Create pipeline
- GET /api/jobs - List jobs
- POST /api/jobs - Submit job

## Troubleshooting

Check logs: `docker-compose logs -f`
Check status: `docker-compose ps`
Restart: `docker-compose restart`
