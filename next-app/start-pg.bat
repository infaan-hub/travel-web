@echo off
cd /d E:\travel-web\next-app
echo Starting PostgreSQL...
call npm run db:local
timeout /t 5 > NUL