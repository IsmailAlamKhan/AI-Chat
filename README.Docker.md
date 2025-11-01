# Docker Setup Guide

This guide explains how to run the Ollama UI using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose V2+
- (Optional) Ollama installed on host or separate container

## Quick Start

### 1. Development Mode (with hot reload)

```bash
# Copy environment variables
cp .env.example .env

# Start Supabase services
npx supabase start

# Copy the Supabase keys from the output to .env file

# Start development server
docker-compose -f docker-compose.dev.yml up
```

Visit `http://localhost:3000`

### 2. Production Mode

```bash
# Copy environment variables
cp .env.example .env

# Edit .env and fill in the required values

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
POSTGRES_PASSWORD=your-postgres-password

# JWT Secret (32+ characters)
JWT_SECRET=your-jwt-secret

# Supabase Keys
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these values by running:
```bash
npx supabase start
```

## Services

The Docker Compose setup includes:

- **app** (port 3000) - Next.js application
- **supabase-db** (port 54322) - PostgreSQL database
- **supabase-auth** (port 54324) - Authentication service
- **supabase-rest** (port 54321) - REST API
- **supabase-realtime** (port 54323) - Realtime subscriptions
- **supabase-storage** (port 54325) - File storage
- **supabase-inbucket** (port 54326) - Email testing

## Connecting to Ollama

### Option 1: Ollama on Host Machine

If Ollama is running on your host:

```bash
# Mac/Linux
http://host.docker.internal:11434

# Linux (alternative)
http://172.17.0.1:11434
```

### Option 2: Ollama in Docker

Add to `docker-compose.yml`:

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    networks:
      - ollama-network
    restart: unless-stopped

volumes:
  ollama-data:
```

Then use `http://ollama:11434` as the Ollama host URL in settings.

## Database Migrations

Migrations are automatically applied from `supabase/migrations/` when Supabase starts.

To run migrations manually:

```bash
# Enter the database container
docker exec -it supabase-db psql -U postgres

# Or use Supabase CLI
npx supabase db push
```

## Useful Commands

```bash
# View logs
docker-compose logs -f app

# Restart a service
docker-compose restart app

# Rebuild after code changes (production)
docker-compose up -d --build

# Clean up everything
docker-compose down -v

# Execute command in container
docker exec -it ollama-ui sh
```

## Troubleshooting

### Port Conflicts

If ports are already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Change left side only
```

### Database Connection Issues

1. Ensure Supabase services are running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs supabase-db
   ```

3. Verify environment variables are set correctly

### Build Issues

```bash
# Clear Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache
```

## Production Deployment

For production deployment:

1. Use a proper PostgreSQL instance (not the development one)
2. Set up proper SSL certificates
3. Configure a reverse proxy (Nginx/Traefik)
4. Use environment-specific `.env` files
5. Enable proper monitoring and logging

## Performance Tuning

### Node.js Memory

Adjust in `docker-compose.yml`:

```yaml
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
```

### Database Connections

Modify in Supabase DB environment:

```yaml
environment:
  - POSTGRES_MAX_CONNECTIONS=100
```

## Backup and Restore

### Backup Database

```bash
docker exec supabase-db pg_dump -U postgres > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker exec -i supabase-db psql -U postgres
```

## Support

For issues, check:
- Docker logs: `docker-compose logs`
- Next.js build logs
- Supabase documentation: https://supabase.com/docs

