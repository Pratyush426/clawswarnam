FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create backend directory and copy source code there
# This ensures that 'from backend.xxx' imports work correctly
RUN mkdir -p /app/backend
COPY . /app/backend/

# Set PYTHONPATH to /app so 'backend' is recognized as a package
ENV PYTHONPATH=/app

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
