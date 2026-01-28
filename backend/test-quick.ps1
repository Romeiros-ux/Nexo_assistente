$baseUrl = "http://127.0.0.1:3001/api/v1"

Write-Host "1. Login..." -ForegroundColor Cyan
$loginBody = @{
    email = "admin@teste.com"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token

Write-Host "2. Fazendo pergunta..." -ForegroundColor Cyan
$chatBody = @{
    query = "Quais sao as normas da instituicao?"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $chatResponse = Invoke-RestMethod -Uri "$baseUrl/chat/ask" -Method POST -Body $chatBody -Headers $headers -TimeoutSec 30
    
    Write-Host ""
    Write-Host "SUCESSO!" -ForegroundColor Green
    Write-Host "Resposta:" -ForegroundColor Yellow
    Write-Host $chatResponse.data.answer
    
    if ($chatResponse.data.sources) {
        Write-Host ""
        Write-Host "Fontes: $($chatResponse.data.sources.Count)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host ""
    Write-Host "ERRO:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    if ($_.ErrorDetails.Message) {
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 5
    }
}
