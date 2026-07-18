FROM python:3.11-slim

WORKDIR /app

# Install from the committed lock for reproducible builds. Export the frozen,
# hash-pinned deps and install them system-wide (the project itself is just the
# scripts copied below, so exclude it from the export).
COPY pyproject.toml uv.lock ./

RUN pip install --no-cache-dir uv && \
    uv export --frozen --no-dev --no-emit-project -o requirements.txt && \
    uv pip install --system --no-cache -r requirements.txt

# Download the Silero VAD model at build time so cold starts don't fetch it.
RUN python -c "from livekit.plugins import silero; silero.VAD.load()" || true

COPY agent.py turn_rules.py valsea_stt.py ./

CMD ["python", "agent.py", "start"]
