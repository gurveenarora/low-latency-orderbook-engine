# Production Multi-Stage Dockerfile for C++20 Matching Engine & FastAPI Backend
FROM python:3.11-slim as builder

# Install C++ build tools (g++, cmake, make)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy C++ engine source code and compile shared library (.so for Linux)
COPY cpp_engine/ ./cpp_engine/
RUN cd cpp_engine && g++ -O2 -std=c++20 -shared -fPIC c_api.cpp -o matching_engine.so

# Final lightweight runner image
FROM python:3.11-slim

WORKDIR /app

# Copy compiled C++ shared library and python backend source
COPY --from=builder /app/cpp_engine/matching_engine.so ./cpp_engine/matching_engine.so
COPY backend/ ./backend/

# Copy Linux ctypes bridge update if present
RUN sed -i 's/matching_engine.dll/matching_engine.so/g' backend/cpp_wrapper.py || true

# Install Python requirements
RUN pip install --no-cache-dir -r backend/requirements.txt

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
