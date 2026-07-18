FROM python:3.11-slim

WORKDIR /app

# Resolve exactly the dependency graph reviewed in source control.
COPY pyproject.toml uv.lock ./

RUN pip install --no-cache-dir uv==0.11.17 && \
    uv export --frozen --no-dev --no-emit-project -o requirements.txt && \
    uv pip install --system --no-cache -r requirements.txt

# Download the Silero VAD model at build time so cold starts don't fetch it.
RUN python -c "from livekit.plugins import silero; silero.VAD.load()"

COPY agent.py booking_helpers.py speech_text.py turn_rules.py valsea_stt.py ./
COPY sounds ./sounds

CMD ["python", "agent.py", "start"]
