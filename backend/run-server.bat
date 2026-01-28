@echo off
cd /d "%~dp0"
SET NODE_ENV=development
node dist/server.js
