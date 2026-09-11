@echo off
echo Starting FastAPI High-Performance Backend Server on 0.0.0.0:8000...
cd /d %~dp0backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
