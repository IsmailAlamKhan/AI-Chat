# Docker Setup for Ollama UI

This guide explains how to run the Ollama UI application using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Supabase CLI installed (`npm install -g supabase`)
- `.env.local` file configured

## Quick Start

### Step 1: Start Supabase Locally

First, start Supabase on your host machine:

```bash
npx supabase start
```

This will start Supabase services and show you the connection details. Keep note of the **anon key**.

### Step 2: Set Environment Variable

Create a `.env` file in the project root with your Supabase anon key:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

You can find this key in the output of `npx supabase start` or in your Supabase dashboard.

### Step 3: Build and Run with Docker

```bash
# Build and start the app
docker-compose up --build
```

The app will be available at **http://localhost:3000**

## Architecture

This Docker setup uses:
- **Next.js app in Docker**: The application runs in a containerized environment
- **Supabase on host**: Supabase runs locally on your machine using `npx supabase start`
- **host.docker.internal**: Docker uses this special DNS name to connect to services on your host machine

## Common Commands

### Start in foreground (see logs)
```bash
docker-compose up
```

### Start in background
```bash
docker-compose up -d
```

### Stop the app
```bash
docker-compose down
```

### Rebuild after code changes
```bash
docker-compose up --build
```

### View logs
```bash
docker-compose logs -f app
```

### Stop Supabase (when done)
```bash
npx supabase stop
```

## Environment Variables

The docker-compose.yml uses these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Automatically set to `http://host.docker.internal:54321` (local Supabase)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Read from your `.env` file
- `NODE_ENV`: Set to `production`

## Configuration for Different Supabase Setups

### Using Local Supabase (Default)

The default configuration connects to local Supabase running on your host machine.

1. Start Supabase: `npx supabase start`
2. Run Docker: `docker-compose up --build`

### Using Hosted Supabase (Production)

To use a hosted Supabase instance, update `docker-compose.yml`:

```yaml
environment:
  - NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
```

Then add the production anon key to your `.env` file.

## Troubleshooting

### Cannot connect to Supabase

**Problem**: App shows "Failed to connect to Supabase"

**Solutions**:
1. Make sure Supabase is running: `npx supabase status`
2. Verify the anon key is correct in your `.env` file
3. Check if `host.docker.internal` resolves:
   ```bash
   docker-compose exec app ping host.docker.internal
   ```

### Port already in use

**Problem**: `Error: Port 3000 is already in use`

**Solutions**:
1. Stop any running Next.js dev server
2. Change the port in docker-compose.yml:
   ```yaml
   ports:
     - "3001:3000"  # Map host port 3001 to container port 3000
   ```

### Build fails

**Problem**: Docker build fails

**Solutions**:
1. Clean Docker cache:
   ```bash
   docker-compose down
   docker system prune -a
   ```
2. Rebuild from scratch:
   ```bash
   docker-compose build --no-cache
   docker-compose up
   ```

### Slow build times

**Problem**: Docker builds take too long

**Solution**: The Dockerfile uses multi-stage builds and the `.dockerignore` file to optimize build times. Make sure `.dockerignore` is in place.

## Development Workflow

For active development, we recommend:

1. **Without Docker** (faster):
   ```bash
   npx supabase start
   npm run dev
   ```

2. **With Docker** (production-like):
   ```bash
   npx supabase start
   docker-compose up --build
   ```

## Production Deployment

For production deployment to services like AWS, GCP, or Azure:

1. Build the Docker image:
   ```bash
   docker build -t ollama-ui:latest .
   ```

2. Push to your container registry:
   ```bash
   docker tag ollama-ui:latest your-registry/ollama-ui:latest
   docker push your-registry/ollama-ui:latest
   ```

3. Set environment variables in your hosting platform:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your production Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your production anon key

4. Deploy the container

## Notes

- The app uses Next.js standalone output for optimized Docker images
- Supabase data persists on your host machine in `./supabase/.branches/`
- The Docker image is optimized for production with a minimal footprint
- For development, running locally without Docker is faster due to hot-reload

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify Supabase is running: `npx supabase status`
3. Ensure all environment variables are set correctly
4. Try rebuilding: `docker-compose up --build --force-recreate`
