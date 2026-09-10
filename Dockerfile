# Full God's Eye View runtime: Vite serves the browser app and its
# server-side /api proxy middleware from the same process.
FROM node:24-bookworm-slim

WORKDIR /app

# Install dependencies in a cache-friendly layer. The repository's prepare
# hook configures local Git hooks, which are not needed inside the image.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

ENV NODE_ENV=development \
    HOST=0.0.0.0 \
    PORT=4173

EXPOSE 4173

# Vite's middleware is intentional: it provides the server-side API brokers
# used by the browser in addition to serving the frontend.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4173/').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"
