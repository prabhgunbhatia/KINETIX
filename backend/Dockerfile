FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy and make startup script executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port
EXPOSE 8000

# Default command (can be overridden in docker-compose)
# Use startup script to properly handle PORT variable
CMD ["/app/start.sh"]



