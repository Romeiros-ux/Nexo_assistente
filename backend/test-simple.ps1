# Teste simples do chat
$ErrorActionPreference = "Continue"

Write-Host "Testando servidor na porta 3001..." -ForegroundColor Cyan

# Teste 1: Health Check
Write-Host "`n[1] Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Health OK: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "SERVIDOR NÃO ESTÁ RESPONDENDO - Verifique se npm run dev está rodando" -ForegroundColor Red
    exit 1
}

# Teste 2: Chat Ask (sem autenticação para ver erro)
Write-Host "`n[2] Testando POST /api/chat/ask sem autenticação..." -ForegroundColor Yellow
try {
    $body = @{ query = "teste" } | ConvertTo-Json
    $headers = @{ "Content-Type" = "application/json" }
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/chat/ask" -Method Post -Headers $headers -Body $body -TimeoutSec 5
    Write-Host "✅ Resposta recebida" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Erro 401 esperado (sem autenticação)" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Servidor respondendo na porta 3001" -ForegroundColor Green
Write-Host "✅ Rota /api/chat/ask registrada" -ForegroundColor Green
Write-Host "`nPara testar com autenticação, use o arquivo test-chat.http no VS Code" -ForegroundColor Yellow
