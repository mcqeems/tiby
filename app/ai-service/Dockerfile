# Tiby AI service (FastAPI, Python 3.10) — build context is app/ai-service.
FROM python:3.10-slim
# libglib2.0-0 / libgomp1 are needed by opencv-python-headless and onnxruntime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libglib2.0-0 libgomp1 \
  && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir uv

WORKDIR /app
COPY . .
# uv.lock is committed; the project installs with src/ as the import root.
# NOTE: no --no-dev here — providers/fish.py imports httpx at runtime, and
# this repo keeps httpx in the dev dependency group, so the dev group must
# be installed for the service to boot.
RUN uv sync --frozen

ENV PYTHONPATH=/app/src
EXPOSE 8000
CMD ["/app/.venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
