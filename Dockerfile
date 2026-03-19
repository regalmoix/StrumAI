FROM node:22-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim AS backend
WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/ backend/
COPY scripts/ scripts/
COPY data/ data/

RUN uv run python -m scripts.load_data

COPY --from=frontend-build /build/dist frontend/dist

ENV STRUM_ENVIRONMENT=production \
    STRUM_FRONTEND_DIST=/app/frontend/dist \
    STRUM_DB_PATH=/app/data/strumai.db \
    STRUM_CORS_ORIGINS='[]' \
    STRUM_LOG_LEVEL=INFO

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uv", "run", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
