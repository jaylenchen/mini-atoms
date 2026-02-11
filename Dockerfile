FROM node:20-bullseye AS builder

WORKDIR /workspace

# Install build dependencies for native Node modules and X11 keymap support
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        git \
        libxkbfile-dev \
        libsecret-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the whole monorepo so npm workspaces (dev-packages, packages, examples, etc.) are available
COPY . .

# Install root dependencies (skip optional native modules like keytar which are not required for the browser demo)
RUN npm install --omit=optional

# Build the browser example in production mode
WORKDIR /workspace/examples/browser
RUN npm run build:production


FROM node:20-slim AS runtime

ENV NODE_ENV=production

# Root directory for the Theia monorepo inside the image
WORKDIR /home/theia/theia

# Copy the built monorepo (including the browser example and required plugins/dependencies)
COPY --from=builder /workspace ./

# Workspace directory that will be mounted as a volume from the host
RUN mkdir -p /home/theia/workspace

EXPOSE 3000

# Run the browser backend using the generated main entrypoint
WORKDIR /home/theia/theia/examples/browser
CMD ["node", "src-gen/backend/main.js", "/home/theia/workspace", "--hostname=0.0.0.0", "--port=3000"]

