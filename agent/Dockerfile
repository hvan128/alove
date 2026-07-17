FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/home/vedi/.local/bin:${PATH}"

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN pip install --no-cache-dir uv==0.11.29 \
    && uv export --frozen --no-dev --no-emit-project -o requirements.txt \
    && uv pip install --system --no-cache -r requirements.txt \
    && useradd --create-home --uid 10001 vedi

COPY agent.py booking_policy.py valsea_stt.py ./

USER vedi

# Cache the small VAD model in the image; a download failure must fail the build.
RUN python -c "from livekit.plugins import silero; silero.VAD.load()"

EXPOSE 8081

CMD ["python", "agent.py", "start"]
