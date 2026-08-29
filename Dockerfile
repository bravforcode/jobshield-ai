# syntax=docker/dockerfile:1

# ---- Python base (uv) ----
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS py-base
WORKDIR /app
COPY py/pyproject.toml py/uv.lock ./py/
RUN uv sync --frozen --project py --no-install-project
COPY py/ ./py/
RUN uv sync --frozen --project py
# Generate deterministic mock data + artifacts at build time
RUN uv run --project py python -m jobshield.data.mock_data && \
    uv run --project py python -m jobshield.cli.build --mock --out data/artifacts.json

# ---- Bun base (Next.js) ----
FROM oven/bun:1 AS bun-base
WORKDIR /app
COPY package.json bun.lock tsconfig.json biome.json next.config.ts postcss.config.mjs components.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY data/artifacts.json ./data/artifacts.json
RUN bun install --frozen-lockfile
RUN bunx next build --webpack

# ---- Final image ----
FROM oven/bun:1-slim
WORKDIR /app
COPY --from=py-base /app/data/artifacts.json ./data/artifacts.json
COPY --from=py-base /app/data/mock ./data/mock
COPY --from=bun-base /app/.next ./.next
COPY --from=bun-base /app/node_modules ./node_modules
COPY --from=bun-base /app/public ./public
COPY package.json next.config.ts ./
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "start"]
