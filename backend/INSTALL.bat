@echo off
echo ========================================
echo  LMS Backend Installation Script
echo ========================================
echo.

echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Creating public folders...
if not exist "public" mkdir public
if not exist "public\certificates" mkdir public\certificates
if not exist "public\marksheets" mkdir public\marksheets
if not exist "public\receipts" mkdir public\receipts

echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Update .env file with your credentials
echo 2. Run: npm run dev
echo 3. Test at: http://localhost:5000/api/health
echo.
pause
