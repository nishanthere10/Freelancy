# ==============================================================================
# Production Dockerfile for Freelance OS Python AI Microservice
# Optimized for Render & Container Platforms with uv and Python 3.13
# ==============================================================================

FROM python:3.13-slim AS runner

WORKDIR /app

# Environment configuration
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0

# Install curl for container health check probe
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv binary from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency definition and README for package build
COPY pyproject.toml README.md ./
RUN uv pip install --system --no-cache .

# Copy application source code and ingestion scripts
COPY app/ ./app/
COPY scripts/ ./scripts/

# Create non-root app user for container security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose default port
EXPOSE 8000

# Native container health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Execute Uvicorn with dynamic port binding and graceful shutdown drain
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --timeout-graceful-shutdown 15"]
