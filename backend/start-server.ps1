# Script para iniciar o servidor backend
# Carrega variaveis de ambiente do .env e inicia o servidor

Write-Host "Iniciando Backend..." -ForegroundColor Cyan

# Mudar para o diretorio do backend
Set-Location $PSScriptRoot

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Iniciar o servidor com npm run dev
Write-Host "Iniciando servidor em modo desenvolvimento..." -ForegroundColor Green
npm run dev
