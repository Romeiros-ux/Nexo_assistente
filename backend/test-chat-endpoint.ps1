# Script para testar endpoint do chat
$baseUrl = "http://127.0.0.1:3001/api/v1"

Write-Host "`n🔐 PASSO 1: Fazendo login..." -ForegroundColor Cyan

# Login
$loginBody = @{
    email = "admin@educacao.gov.br"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.access_token
    
    Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
    
    # Headers com token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host "`n💬 PASSO 2: Testando endpoint do chat..." -ForegroundColor Cyan
    
    # Pergunta ao chat
    $chatBody = @{
        question = "Qual é o calendário escolar de 2024?"
        conversationId = $null
    } | ConvertTo-Json
    
    $chatResponse = Invoke-RestMethod -Uri "$baseUrl/chat/ask" -Method POST -Body $chatBody -Headers $headers
    
    Write-Host "`n✅ RESPOSTA DO CHAT:" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════" -ForegroundColor Gray
    Write-Host $chatResponse.data.answer -ForegroundColor White
    Write-Host "═══════════════════════════════════════" -ForegroundColor Gray
    
    if ($chatResponse.data.sources -and $chatResponse.data.sources.Count -gt 0) {
        Write-Host "`n📚 FONTES CITADAS ($($chatResponse.data.sources.Count)):" -ForegroundColor Cyan
        foreach ($source in $chatResponse.data.sources) {
            Write-Host "  • $($source.documentTitle)" -ForegroundColor Yellow
            Write-Host "    Similaridade: $([math]::Round($source.similarity * 100, 1))%" -ForegroundColor Gray
            Write-Host "    Trecho: $($source.content.Substring(0, [Math]::Min(100, $source.content.Length)))..." -ForegroundColor DarkGray
        }
    } else {
        Write-Host "`n⚠️ Nenhuma fonte citada" -ForegroundColor Yellow
    }
    
    Write-Host "`n📊 METADADOS:" -ForegroundColor Cyan
    Write-Host "  Conversation ID: $($chatResponse.data.conversationId)" -ForegroundColor Gray
    Write-Host "  Tokens usados: $($chatResponse.data.usage.total_tokens)" -ForegroundColor Gray
    Write-Host "  Custo estimado: `$$($chatResponse.data.usage.estimated_cost)" -ForegroundColor Gray
    
    Write-Host "`n🔍 PASSO 3: Verificando logs no banco..." -ForegroundColor Cyan
    
    # Verificar histórico
    $historyResponse = Invoke-RestMethod -Uri "$baseUrl/chat/history?limit=1" -Method GET -Headers $headers
    
    if ($historyResponse.data.items.Count -gt 0) {
        $lastChat = $historyResponse.data.items[0]
        Write-Host "✅ Chat registrado no banco:" -ForegroundColor Green
        Write-Host "  ID: $($lastChat.id)" -ForegroundColor Gray
        Write-Host "  Pergunta: $($lastChat.question)" -ForegroundColor Gray
        Write-Host "  Data: $($lastChat.created_at)" -ForegroundColor Gray
    }
    
    Write-Host "`n✅ TESTE COMPLETO - TUDO FUNCIONANDO!" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ ERRO:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nDetalhes:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
}
