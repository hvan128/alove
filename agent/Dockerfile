FROM python:3.11-slim

WORKDIR /app

# Resolve exactly the dependency graph reviewed in source control.
COPY pyproject.toml uv.lock ./

RUN pip install --no-cache-dir uv==0.11.17 && \
    uv export --frozen --no-dev --no-emit-project -o requirements.txt && \
    uv pip install --system --no-cache -r requirements.txt

# Download the Silero VAD model at build time so cold starts don't fetch it.
RUN python -c "from livekit.plugins import silero; silero.VAD.load()"

# Copy mọi module Python thay vì liệt kê tay: danh sách thủ công đã hai lần lệch
# khi có module mới, image build xong vẫn thiếu file và worker chết lúc khởi động.
COPY *.py ./
COPY sounds ./sounds

CMD ["python", "agent.py", "start"]
