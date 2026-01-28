# Script para testar o servidor compilado
Write-Host "Iniciando servidor..." -ForegroundColor Cyan

# Iniciar servidor em background job
$job = Start-Job -ScriptBlock {
    Set-Location "C:\Users\usuario\Documents\GitHub\edu-ia-assistente\backend"
    node dist/server.js
}

Write-Host "Aguardando 5 segundos para o servidor inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "TESTE 1: Health Check" -ForegroundColor Cyan
Write-Host "===========================================`n" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:3001/health" -Method GET -TimeoutSec 10
    Write-Host "✅ SUCESSO!" -ForegroundColor Green
    Write-Host "Resposta:" -ForegroundColor White
    $response | ConvertTo-Json
    
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "TESTE 2: POST /api/v1/chat/ask (sem auth)" -ForegroundColor Cyan
    Write-Host "===========================================`n" -ForegroundColor Cyan
    
    $body = @{ query = "Teste" } | ConvertTo-Json
    $headers = @{ "Content-Type" = "application/json" }
    
    try {
        $chatResponse = Invoke-RestMethod -Uri "http://127.0.0.1:3001/api/v1/chat/ask" -Method Post -Headers $headers -Body $body -TimeoutSec 10
        Write-Host "✅ Resposta recebida (não esperado sem auth)" -ForegroundColor Yellow
        $chatResponse | ConvertTo-Json
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "✅ Erro 401 esperado (sem autenticação)" -ForegroundColor Green
        } else {
            Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n============================================" -ForegroundColor Green
    Write-Host "TESTES CONCLUÍDOS COM SUCESSO!" -ForegroundColor Green
    Write-Host "===========================================`n" -ForegroundColor Green
    
} catch {
    Write-Host "❌ FALHA NO TESTE" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Write-Host "Parando servidor..." -ForegroundColor Yellow
    Stop-Job -Job $job
    Remove-Job -Job $job
}
