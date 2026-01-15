#!/bin/bash
# Startup script for Railway deployment
PORT=${PORT:-8000}
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT

