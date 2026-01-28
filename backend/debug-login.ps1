$baseUrl = "http://127.0.0.1:3001/api/v1"

$loginBody = @{
    email = "admin@teste.com"
    password = "Admin@123"
} | ConvertTo-Json

Write-Host "Fazendo login..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    Write-Host ""
    Write-Host "Resposta completa:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host ""
    Write-Host "Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host $_.ErrorDetails.Message
    }
}
