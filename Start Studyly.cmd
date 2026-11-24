@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Install Node.js, then try again.
  pause
  exit /b 1
)
node start-studyly.mjs
if errorlevel 1 pause
