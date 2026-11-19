@echo off
echo Starting SES Educare Mobile App Build...
cd mobile
node scripts\build_app.js %*
cd ..

