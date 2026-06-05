@echo off
set DATABASE_URL=postgresql://postgres:mayank%23123@127.0.0.1:5433/smepro360
set SECRET_KEY=smepro360-super-secret-key-change-in-production-2024
set FIRST_SUPERUSER=admin@smepro360.com
set FIRST_SUPERUSER_PASSWORD=Admin@123456
echo Starting SMEPRO360 Backend API...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
