# ========================================
# Script: Testar endpoint de reprocessamento
# ========================================

Write-Host "`n==> PASSO 3: Obtendo token..." -ForegroundColor Yellow

$loginResponse = Invoke-RestMethod `
  -Uri "http://localhost:3001/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"ti@educacao.gov.br","password":"senha_super_secreta_ti_2024"}'

$token = $loginResponse.token
Write-Host "✅ Token obtido: $token" -ForegroundColor Green

# ========================================

Write-Host "`n==> PASSO 4: Chamando /reindex..." -ForegroundColor Yellow

$documentId = "b9e820ca-8a50-4591-b071-7abfa5a58242"

$reindexResponse = Invoke-RestMethod `
  -Uri "http://localhost:3001/api/v1/documents/$documentId/reindex" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  }

Write-Host "✅ Resposta:" -ForegroundColor Green
$reindexResponse | ConvertTo-Json -Depth 10

Write-Host "`n⏱️  Aguarde 30-60 segundos e verifique os logs do backend!" -ForegroundColor Cyan
Write-Host "O documento será processado em background.`n" -ForegroundColor Cyan
