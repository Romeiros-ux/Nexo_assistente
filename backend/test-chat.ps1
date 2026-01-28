# ==========================================
# Script de Teste - Chat Conversacional
# ==========================================
# Testa os endpoints do chat usando PowerShell
# ==========================================

$baseUrl = "http://localhost:3001/api/v1"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHNyaXJxdGdzanBobG11d3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTkwNDMsImV4cCI6MjA4MzUzNTA0M30.rgJWcTQo__blYgrE6492ZO8dS2oM620BevVUrCXc_HI"

# Headers
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

Write-Host "=========================================="
Write-Host "TESTE 1: POST /api/chat/ask"
Write-Host "=========================================="
Write-Host ""

$body = @{
    query = "Qual o horário de funcionamento das escolas?"
    filters = @{
        max_results = 5
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/ask" -Method Post -Headers $headers -Body $body
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message
    }
}

Write-Host ""
Write-Host ""
Write-Host "=========================================="
Write-Host "TESTE 2: GET /api/chat/history"
Write-Host "=========================================="
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/history" -Method Get -Headers $headers
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Histórico:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message
    }
}

Write-Host ""
Write-Host ""
Write-Host "=========================================="
Write-Host "TESTE 3: Pergunta sobre documento inexistente"
Write-Host "=========================================="
Write-Host ""

$body = @{
    query = "Qual é a temperatura média de Marte?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chat/ask" -Method Post -Headers $headers -Body $body
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message
    }
}

Write-Host ""
Write-Host "=========================================="
Write-Host "Testes concluídos!"
Write-Host "=========================================="
