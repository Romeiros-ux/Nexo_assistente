# Script para testar endpoint do chat
$baseUrl = "http://127.0.0.1:3001/api/v1"

Write-Host ""
Write-Host "PASSO 1: Fazendo login..." -ForegroundColor Cyan

# Login
$loginBody = @{
    email = "admin@teste.com"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.access_token
    
    Write-Host "Login bem-sucedido!" -ForegroundColor Green
    Write-Host "Token obtido" -ForegroundColor Gray
    
    # Headers com token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host ""
    Write-Host "PASSO 2: Testando endpoint do chat..." -ForegroundColor Cyan
    
    # Pergunta ao chat
    $chatBody = @{
        question = "Qual e o calendario escolar de 2024?"
        conversationId = $null
    } | ConvertTo-Json
    
    $chatResponse = Invoke-RestMethod -Uri "$baseUrl/chat/ask" -Method POST -Body $chatBody -Headers $headers
    
    Write-Host ""
    Write-Host "RESPOSTA DO CHAT:" -ForegroundColor Green
    Write-Host "=======================================" -ForegroundColor Gray
    Write-Host $chatResponse.data.answer -ForegroundColor White
    Write-Host "=======================================" -ForegroundColor Gray
    
    if ($chatResponse.data.sources -and $chatResponse.data.sources.Count -gt 0) {
        Write-Host ""
        Write-Host "FONTES CITADAS: $($chatResponse.data.sources.Count)" -ForegroundColor Cyan
        foreach ($source in $chatResponse.data.sources) {
            Write-Host "  - $($source.documentTitle)" -ForegroundColor Yellow
            Write-Host "    Similaridade: $([math]::Round($source.similarity * 100, 1))%" -ForegroundColor Gray
            $preview = $source.content.Substring(0, [Math]::Min(100, $source.content.Length))
            Write-Host "    Trecho: $preview..." -ForegroundColor DarkGray
        }
    } else {
        Write-Host ""
        Write-Host "Nenhuma fonte citada" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "METADADOS:" -ForegroundColor Cyan
    Write-Host "  Conversation ID: $($chatResponse.data.conversationId)" -ForegroundColor Gray
    Write-Host "  Tokens usados: $($chatResponse.data.usage.total_tokens)" -ForegroundColor Gray
    Write-Host "  Custo estimado: $($chatResponse.data.usage.estimated_cost)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "PASSO 3: Verificando logs no banco..." -ForegroundColor Cyan
    
    # Verificar histórico
    $historyResponse = Invoke-RestMethod -Uri "$baseUrl/chat/history?limit=1" -Method GET -Headers $headers
    
    if ($historyResponse.data.items.Count -gt 0) {
        $lastChat = $historyResponse.data.items[0]
        Write-Host "Chat registrado no banco:" -ForegroundColor Green
        Write-Host "  ID: $($lastChat.id)" -ForegroundColor Gray
        Write-Host "  Pergunta: $($lastChat.question)" -ForegroundColor Gray
        Write-Host "  Data: $($lastChat.created_at)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "TESTE COMPLETO - SUCESSO!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "ERRO:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalhes:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
}
