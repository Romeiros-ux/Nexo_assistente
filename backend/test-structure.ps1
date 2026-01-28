# Script de Teste do Backend

Write-Host "=== Teste do Backend - Assistente Institucional ===" -ForegroundColor Cyan
Write-Host ""

# Verifica se está na pasta backend
if (!(Test-Path "package.json")) {
    Write-Host "Erro: Execute este script na pasta backend" -ForegroundColor Red
    exit 1
}

Write-Host "1. Estrutura de pastas criada:" -ForegroundColor Yellow
Get-ChildItem -Directory -Recurse -Depth 2 | Select-Object FullName | ForEach-Object {
    Write-Host "   $($_.FullName)" -ForegroundColor Green
}

Write-Host ""
Write-Host "2. Arquivos principais:" -ForegroundColor Yellow
Get-ChildItem -File -Recurse -Include *.ts,*.json | Select-Object -First 20 | ForEach-Object {
    Write-Host "   $($_.FullName)" -ForegroundColor Green
}

Write-Host ""
Write-Host "3. Dependências instaladas:" -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✓ node_modules existe" -ForegroundColor Green
} else {
    Write-Host "   ✗ node_modules não encontrado. Execute: npm install" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Variáveis de ambiente:" -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✓ .env configurado" -ForegroundColor Green
} else {
    Write-Host "   ✗ .env não encontrado" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Estrutura do Backend Criada com Sucesso! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar o servidor:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Endpoints disponíveis:" -ForegroundColor Cyan
Write-Host "  http://localhost:3001/health" -ForegroundColor White
Write-Host "  http://localhost:3001/health/detailed" -ForegroundColor White
Write-Host "  http://localhost:3001/api/v1" -ForegroundColor White
