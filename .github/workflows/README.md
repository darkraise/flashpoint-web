# GitHub Actions Workflows

This directory contains automated workflows for the Flashpoint Web project.

## Workflows

### 1. Docker Build and Push (`docker-build-push.yml`)

Builds and pushes Docker images for all three services to container registries.

#### Triggers

- **Version tags** (`v*.*.*`): Builds and pushes images with version tags and `latest` tag
- **Manual dispatch**: Can be triggered manually from GitHub Actions tab

#### Services Built

- `flashpoint-backend` - REST API server
- `flashpoint-frontend` - React web UI (Nginx)
- `flashpoint-game-service` - Game content proxy and ZIP server

#### Container Registry

The workflow pushes images to **Docker Hub**.

#### Setup Instructions

##### Docker Hub (Required)

1. **Create Docker Hub account** at https://hub.docker.com

2. **Create access token**:
   - Go to Account Settings → Security → Access Tokens
   - Click "New Access Token"
   - Name: "GitHub Actions"
   - Permissions: Read & Write
   - Copy the token (you won't see it again!)

3. **Add GitHub Secrets**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add two secrets:
     - `DOCKERHUB_USERNAME`: Your Docker Hub username
     - `DOCKERHUB_TOKEN`: The access token from step 2

4. **Images will be pushed to**:
   ```
   docker.io/<dockerhub-username>/flashpoint-backend:latest
   docker.io/<dockerhub-username>/flashpoint-frontend:latest
   docker.io/<dockerhub-username>/flashpoint-game-service:latest
   ```

#### Image Tags

The workflow automatically creates multiple tags when you push a version tag:

| Tag Type | Example | Description |
|----------|---------|-------------|
| `latest` | `latest` | Always created for every version tag |
| Full version | `1.2.3` | Git tag `v1.2.3` → `1.2.3` |
| Major.Minor | `1.2` | Git tag `v1.2.3` → `1.2` |
| Major | `1` | Git tag `v1.2.3` → `1` |

#### Creating a Release

To create a versioned release:

```bash
# Ensure you're on master branch
git checkout master

# Tag the commit
git tag v1.0.0

# Push the tag (this triggers the workflow)
git push origin v1.0.0
```

This will create images tagged as:
- `1.0.0`
- `1.0`
- `1`
- `latest`

#### Multi-Platform Support

Images are built for multiple architectures:
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM 64-bit)

This allows the images to run on:
- Standard x86_64 servers
- ARM-based servers (AWS Graviton, Raspberry Pi 4, Apple Silicon via Docker Desktop)

#### Build Caching

The workflow uses GitHub Actions cache to speed up builds:
- Layer cache stored between runs
- Significantly faster builds after the first run
- Cache automatically invalidated when dependencies change

#### Usage Examples

##### Pull and Run Images

```bash
# Pull latest images
docker pull <dockerhub-username>/flashpoint-backend:latest
docker pull <dockerhub-username>/flashpoint-frontend:latest
docker pull <dockerhub-username>/flashpoint-game-service:latest

# Or use a specific version
docker pull <dockerhub-username>/flashpoint-backend:1.0.0
```

##### Use in Docker Compose

Update your `docker-compose.yml` to use pre-built images:

```yaml
version: '3.8'

services:
  backend:
    image: <dockerhub-username>/flashpoint-backend:latest
    # Remove build section
    ports:
      - "3100:3100"
    # ... rest of config

  frontend:
    image: <dockerhub-username>/flashpoint-frontend:latest
    ports:
      - "80:8080"
    # ... rest of config

  game-service:
    image: <dockerhub-username>/flashpoint-game-service:latest
    ports:
      - "22500:22500"
      - "22501:22501"
    # ... rest of config
```

Then simply run:
```bash
docker-compose pull  # Pull latest images
docker-compose up -d # Start services
```

#### Making Images Public

By default, Docker Hub images are private. To make them public:

1. Go to https://hub.docker.com/repositories
2. Click on the repository (e.g., `flashpoint-backend`)
3. Click "Settings"
4. Change visibility to "Public"

#### Troubleshooting

##### Build Fails

Check the Actions tab for detailed error logs:
```
https://github.com/<username>/<repo>/actions
```

##### Docker Hub Not Pushing

Verify secrets are set correctly:
- Repository → Settings → Secrets and variables → Actions
- Check `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` exist

##### Image Not Found

For private images, authenticate first:
```bash
docker login docker.io
```

#### Performance

Typical build times (with cache):
- First build: 5-10 minutes per service
- Subsequent builds (with cache): 2-4 minutes per service
- Parallel execution: All 3 services build simultaneously

#### Security

- Secrets are never exposed in logs
- Images are scanned for vulnerabilities (optional - can add)
- Multi-stage builds minimize attack surface
- Non-root users in all containers
- Read-only root filesystems where possible

---

### 2. Performance Budget (`performance-budget.yml`)

Frontend performance monitoring workflow.

See the workflow file for details.

---

## Adding New Workflows

To add a new workflow:

1. Create a new YAML file in `.github/workflows/`
2. Use the GitHub Actions syntax
3. Test locally with [act](https://github.com/nektos/act) (optional)
4. Push to trigger the workflow

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
