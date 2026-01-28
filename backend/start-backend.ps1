# Script para iniciar o backend
Write-Host "Parando todos os processos Node.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "Mudando para o diretório backend..." -ForegroundColor Yellow
Set-Location -Path "C:\Users\usuario\Documents\GitHub\edu-ia-assistente\backend"

Write-Host "Iniciando servidor backend..." -ForegroundColor Green
npm run dev
