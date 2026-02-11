## Theia Browser Demo Docker Deployment

This document explains how to build and run the **Theia browser example** in a single Docker container for demo purposes.

The Dockerfile is located in the repository root and uses a multi-stage build:

- **Builder stage**: installs monorepo dependencies and runs `npm run build:production` in `examples/browser`.
- **Runtime stage**: copies the built monorepo, exposes port `3000`, and starts the browser backend using the generated `src-gen/backend/main.js`.

### 1. Local build

Make sure Docker is installed and the Docker daemon is running.

From the repository root:

```bash
docker build -t theia-demo:latest .
```

### 2. Local run & workspace persistence

Create a host directory for the workspace and run the container:

```bash
mkdir -p ./theia-workspace

docker run --rm -it \
  -p 3000:3000 \
  -v "$(pwd)/theia-workspace:/home/theia/workspace" \
  theia-demo:latest
```

Then open `http://localhost:3000` in your browser. Files created in the IDE will be stored under `./theia-workspace` on the host.

To run in the background:

```bash
docker run -d \
  --name theia-demo \
  -p 3000:3000 \
  -v "$(pwd)/theia-workspace:/home/theia/workspace" \
  theia-demo:latest
```

### 3. Push image to a registry

Replace `<registry>/<repo>:tag` with your own image reference (for example, `docker.io/yourname/theia-demo:latest`):

```bash
docker tag theia-demo:latest <registry>/<repo>:tag
docker login
docker push <registry>/<repo>:tag
```

### 4. Deploy on a cloud server (single container)

On your Linux cloud host (with Docker installed):

```bash
docker pull <registry>/<repo>:tag
sudo mkdir -p /opt/theia-workspace

docker run -d \
  --name theia-demo \
  -p 80:3000 \
  -v /opt/theia-workspace:/home/theia/workspace \
  <registry>/<repo>:tag
```

Expose port `80` (or the port you mapped) in your cloud provider’s firewall / security groups, then access:

```text
http://<your-domain-or-ip>/
```

