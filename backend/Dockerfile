FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps for asyncpg
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry==1.8.3 && \
    poetry config virtualenvs.create false

# Copy dependency files first for layer caching
COPY pyproject.toml poetry.lock* ./
RUN poetry install --no-interaction --no-ansi --only main --no-root

# Copy application code
COPY . .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python scripts/seed_synthetic_wells.py --if-empty && python scripts/seed_users.py && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
