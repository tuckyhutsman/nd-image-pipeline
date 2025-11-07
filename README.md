# Image Processing Pipeline

Professional batch image processing with high-fidelity resizing and team collaboration.

## Quick Start

```bash
docker-compose up -d
# Wait 30 seconds then visit http://localhost:3000
```

## Features

- 🎨 **Smart Slider Controls** - Color-coded hints for quality vs compression
- 📦 **Batch Processing** - Process multiple files with custom names
- 🔧 **Pipeline Editor** - Visual pipeline creation with 7 operation types
- 🎯 **Real-time Tracking** - Watch jobs process live
- 🚀 **High-fidelity Processing** - Lanczos resampling with gamma correction
- 👥 **Team Collaboration** - Web-based UI for remote access

## 📚 Documentation

Comprehensive documentation is organized in the **[docs/](docs/)** directory:

- **[docs/INDEX.md](docs/INDEX.md)** - 📚 Master documentation index (START HERE)
- **[docs/guides/QUICK_START.md](docs/guides/QUICK_START.md)** - ⚡ Quick start guide
- **[docs/deployment/DEPLOYMENT_READY.md](docs/deployment/DEPLOYMENT_READY.md)** - 🚀 Deployment reference
- **[docs/features/](docs/features/)** - 🎨 Feature documentation
- **[docs/troubleshooting/](docs/troubleshooting/)** - 🔧 Issue resolution guides

### Documentation Categories

- **Architecture** - System design and technical architecture
- **Deployment** - Deployment guides and scripts
- **Features** - Detailed feature documentation
- **Guides** - User and developer guides
- **Planning** - Feature plans and roadmaps
- **Progress** - Development status reports
- **Testing** - Testing plans and results
- **Troubleshooting** - Issue fixes and resolutions

## First Steps

1. Access http://localhost:3000
2. Go to "Manage Pipelines"
3. Create a test pipeline (see [Pipeline Editor Guide](docs/features/PIPELINE_EDITOR_GUIDE.md))
4. Submit an image (see [Quick Start](docs/guides/QUICK_START.md))
5. Watch it process!

## Technology Stack

- **Frontend**: React, CSS Grid, Axios
- **Backend**: Node.js, Express, Bull Queue
- **Database**: PostgreSQL
- **Queue**: Redis
- **Worker**: Sharp (image processing)
- **Deployment**: Docker Compose

## Environment Configuration

Edit `.env` for configuration (copy from `.env.example`):
- `DB_PASSWORD` - Change before production
- `JWT_SECRET` - Change before production
- `REACT_APP_API_URL` - Your public API URL

## API Endpoints

- `GET /api/pipelines` - List pipelines
- `POST /api/pipelines` - Create pipeline
- `GET /api/jobs` - List jobs
- `POST /api/jobs/batch` - Submit batch
- `GET /api/batches/:id` - Get batch details
- `DELETE /api/batches/:id` - Delete batch

Full API reference: [docs/guides/API_CLIENT_REFERENCE.md](docs/guides/API_CLIENT_REFERENCE.md)

## Project Status

- ✅ **Sprint 1 Complete**: Batch deletion and management
- ✅ **Sprint 2 Complete**: Custom batch naming and file size tracking
- 🔄 **Sprint 3 In Progress**: Pipeline archive system
- 📋 **Sprint 4 Planned**: Dark mode

See [docs/progress/SPRINT_STATUS.md](docs/progress/SPRINT_STATUS.md) for current status.

## Troubleshooting

```bash
# Check logs
docker-compose logs -f

# Check status
docker-compose ps

# Restart services
docker-compose restart

# Full rebuild
docker-compose down
docker-compose up -d --build
```

For detailed troubleshooting: [docs/troubleshooting/](docs/troubleshooting/)

## Development

```bash
# Start development environment
docker-compose up -d

# Watch logs
docker-compose logs -f web worker api

# Access database
docker-compose exec db psql -U pipeline_user -d pipeline_db

# Run tests
cd frontend && npm test
```

## Deployment

See [docs/deployment/DEPLOYMENT_READY.md](docs/deployment/DEPLOYMENT_READY.md) for production deployment instructions.

Quick deploy:
```bash
./docs/deployment/deploy_slider_system.sh
```

## Contributing

1. Read [docs/INDEX.md](docs/INDEX.md) for project overview
2. Check [docs/architecture/ARCHITECTURE_DIAGRAMS.md](docs/architecture/ARCHITECTURE_DIAGRAMS.md) for system design
3. Follow coding standards in existing components
4. Test thoroughly before submitting
5. Update documentation for new features

## Support

- 📖 **Documentation**: [docs/INDEX.md](docs/INDEX.md)
- 🐛 **Issues**: [docs/troubleshooting/](docs/troubleshooting/)
- 📊 **Status**: [docs/progress/SPRINT_STATUS.md](docs/progress/SPRINT_STATUS.md)

---

**Version**: 1.0.0  
**Last Updated**: November 7, 2025  
**Status**: Production - Active Development
