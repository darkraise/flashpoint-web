# GitHub Actions Workflows

This directory contains automated workflows for the Flashpoint Web project.

## Workflows

### 1. Docker Build and Push (`docker-build-push.yml`)

Builds and pushes the single Docker image to the container registry.

#### Triggers

- **Version tags** (`v*.*.*`): Builds and pushes the image with version tags and `latest` tag
- **Manual dispatch**: Can be triggered manually from GitHub Actions tab

#### Image Built

- `flashpoint-web` - Single image serving both the REST API (including game
  content) and the React web UI

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

4. **Image will be pushed to**:
   ```
   docker.io/darkraise/flashpoint-web:latest
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

#### Platform Support

Images are built for:
- `linux/amd64` (x86_64) - Standard servers and desktops

**Note:** ARM64 support has been disabled to significantly reduce build times. If you need ARM64 images, you can build them locally or enable multi-platform builds by adding `linux/arm64` to the platforms in the workflow file.

#### Build Caching

The workflow uses GitHub Actions cache to speed up builds:
- Layer cache stored between runs
- Significantly faster builds after the first run
- Cache automatically invalidated when dependencies change

#### Usage Examples

##### Pull and Run the Image

```bash
# Pull the latest image
docker pull darkraise/flashpoint-web:latest

# Or use a specific version
docker pull darkraise/flashpoint-web:1.0.0
```

##### Use in Docker Compose

Update your `docker-compose.yml` to use the pre-built image:

```yaml
services:
  flashpoint-web:
    image: darkraise/flashpoint-web:latest
    # Remove build section
    ports:
      - "80:3100"
    # ... rest of config
```

Then simply run:
```bash
docker compose pull  # Pull the latest image
docker compose up -d # Start the service
```

#### Making Images Public

By default, Docker Hub images are private. To make them public:

1. Go to https://hub.docker.com/repositories
2. Click on the repository (e.g., `flashpoint-web`)
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

Typical build times (optimized for amd64 only):
- First build: 3-5 minutes
- Subsequent builds (with cache): 1-2 minutes
- Frontend and backend build stages run within a single image build

**Optimizations applied:**
- Single platform (amd64) instead of multi-platform
- npm ci with `--prefer-offline` and `--no-audit` flags
- Disabled provenance and SBOM generation
- Latest BuildKit image
- GitHub Actions cache for Docker layers

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
