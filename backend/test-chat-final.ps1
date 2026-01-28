# Teste do Chat usando Supabase Auth
$baseUrl = "http://127.0.0.1:3001/api/v1"

Write-Host ""
Write-Host "Testando endpoint do chat com Supabase Auth..." -ForegroundColor Cyan
Write-Host ""

# Credenciais de teste
$email = "admin@teste.com"
$password = "Admin@123"

Write-Host "1. Login via Supabase..." -ForegroundColor Yellow

$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    # Login para obter JWT do Supabase
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    
    if (-not $loginResponse.data.token) {
        throw "Token nao retornado no login"
    }
    
    $token = $loginResponse.data.token
    Write-Host "   Token obtido: $($token.Substring(0, 30))..." -ForegroundColor Green
    
    # Headers com Bearer token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host ""
    Write-Host "2. Enviando pergunta ao chat..." -ForegroundColor Yellow
    
    # Pergunta de teste
    $chatBody = @{
        query = "Quais sao as diretrizes pedagogicas da instituicao?"
    } | ConvertTo-Json
    
    $chatResponse = Invoke-RestMethod -Uri "$baseUrl/chat/ask" -Method POST -Body $chatBody -Headers $headers -ErrorAction Stop
    
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "RESPOSTA DO ASSISTENTE:" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host $chatResponse.data.answer
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    
    # Fontes
    if ($chatResponse.data.sources) {
        $sourceCount = $chatResponse.data.sources.Count
        Write-Host ""
        Write-Host "DOCUMENTOS CONSULTADOS: $sourceCount" -ForegroundColor Cyan
        
        $index = 1
        foreach ($source in $chatResponse.data.sources) {
            Write-Host "  [$index] $($source.documentTitle)" -ForegroundColor Yellow
            Write-Host "      Similaridade: $([math]::Round($source.similarity * 100, 1))%" -ForegroundColor Gray
            $index++
        }
    }
    
    # Metadados
    Write-Host ""
    Write-Host "INFORMACOES TECNICAS:" -ForegroundColor Cyan
    Write-Host "  Conversa ID: $($chatResponse.data.conversationId)" -ForegroundColor Gray
    Write-Host "  Tokens: $($chatResponse.data.usage.total_tokens)" -ForegroundColor Gray
    Write-Host "  Custo: `$$($chatResponse.data.usage.estimated_cost)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "3. Verificando historico..." -ForegroundColor Yellow
    
    $historyResponse = Invoke-RestMethod -Uri "$baseUrl/chat/history?limit=1" -Method GET -Headers $headers -ErrorAction Stop
    
    if ($historyResponse.data.items.Count -gt 0) {
        Write-Host "   Ultimo chat registrado com sucesso" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "TESTE COMPLETO - SISTEMA FUNCIONANDO!" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "ERRO NO TESTE:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorObj.error) {
            Write-Host "Mensagem: $($errorObj.error)" -ForegroundColor Yellow
        }
        if ($errorObj.details) {
            Write-Host "Detalhes: $($errorObj.details | ConvertTo-Json)" -ForegroundColor Yellow
        }
    }
}
