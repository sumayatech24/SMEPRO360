# ─────────────────────────────────────────────────────────────────
# Stage 1: Build the React / CRA frontend
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./

# legacy-peer-deps needed for CRA dependency resolution
RUN CI=false npm install --legacy-peer-deps

COPY frontend/ ./

# Bake in the relative API URL — frontend and API share the same domain
ENV REACT_APP_API_URL=/api/v1
ENV CI=false
ENV TSC_COMPILE_ON_ERROR=true
ENV DISABLE_ESLINT_PLUGIN=true
ENV ESLINT_NO_DEV_ERRORS=true

RUN npm run build

# ─────────────────────────────────────────────────────────────────
# Stage 2: Python 3.12 FastAPI runtime
#
# • FastAPI handles all /api/v1/* routes
# • React SPA is served from /app/static_frontend at all other paths
# • DB tables are created + seeded by SQLAlchemy on startup
# ─────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runner

WORKDIR /app

# System libs for psycopg2, Pillow, reportlab
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI app
COPY backend/app ./app

# Copy built React frontend
COPY --from=frontend-builder /app/frontend/build ./static_frontend

ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/health" || exit 1

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips="*"
