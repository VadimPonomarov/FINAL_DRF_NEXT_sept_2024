FROM python:3.12-slim

LABEL maintainer="ME <pvs.versia@gmail.com>"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    UV_NO_CACHE=1

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

COPY . .

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
