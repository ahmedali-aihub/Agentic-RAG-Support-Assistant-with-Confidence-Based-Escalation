# Torch and sentence-transformers make the image large no matter what; the
# split below only keeps rebuilds fast when application code changes without
# touching requirements.txt.
FROM python:3.11-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts

# Baked into the image so a fresh container can answer immediately rather than
# requiring a separate ingestion step before first use.
COPY data/raw ./data/raw
RUN python -m app.ingestion.build_index

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
