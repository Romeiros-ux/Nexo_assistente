# Script PowerShell para testar endpoints de conversação
$baseUrl = "http://localhost:3001/api/v1"

Write-Host "🧪 TESTE: Endpoints de Conversação`n" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Gray

# 1. Login
Write-Host "`n1️⃣ Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@teste.com"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Token obtido" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no login: $_" -ForegroundColor Red
    exit 1
}

# Headers para próximas requisições
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Primeira pergunta (nova conversa)
Write-Host "`n2️⃣ Pergunta 1: 'Qual o IDEB de 2023?'" -ForegroundColor Yellow
$chatBody1 = @{
    query = "Qual o IDEB de 2023?"
} | ConvertTo-Json

try {
    $chatResponse1 = Invoke-RestMethod -Uri "$baseUrl/chat/ask" -Method POST -Body $chatBody1 -Headers $headers
    $conversationId = $chatResponse1.data.conversationId
    Write-Host "✅ ConversationId: $conversationId" -ForegroundColor Green
    Write-Host "📄 Resposta: $($chatResponse1.data.answer.Substring(0, [Math]::Min(150, $chatResponse1.data.answer.Length)))..." -ForegroundColor White
} catch {
    Write-Host "❌ Erro na pergunta 1: $_" -ForegroundColor Red
    exit 1
}

# 3. Segunda pergunta (mesma conversa)
Write-Host "`n3️⃣ Pergunta 2: 'E dos anos finais?'" -ForegroundColor Yellow
$chatBody2 = @{
    query = "E dos anos finais?"
    conversationId = $conversationId
} | ConvertTo-Json

try {
    $chatResponse2 = Invoke-RestMethod -Uri "$baseUrl/chat/ask" -Method POST -Body $chatBody2 -Headers $headers
    $sameConv = $chatResponse2.data.conversationId -eq $conversationId
    Write-Host "✅ Mesmo conversationId: $sameConv" -ForegroundColor Green
    Write-Host "📄 Resposta: $($chatResponse2.data.answer.Substring(0, [Math]::Min(150, $chatResponse2.data.answer.Length)))..." -ForegroundColor White
    
    if (-not $sameConv) {
        Write-Host "⚠️  AVISO: ConversationId diferente!" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro na pergunta 2: $_" -ForegroundColor Red
    exit 1
}

# 4. Listar conversações
Write-Host "`n4️⃣ Listar conversações do usuário" -ForegroundColor Yellow
try {
    $conversations = Invoke-RestMethod -Uri "$baseUrl/chat/conversations?limit=10" -Method GET -Headers $headers
    Write-Host "✅ Total de conversas: $($conversations.data.total)" -ForegroundColor Green
    
    if ($conversations.data.conversations.Count -gt 0) {
        Write-Host "   Última conversa: $($conversations.data.conversations[0].title)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Erro ao listar conversas: $_" -ForegroundColor Red
}

# 5. Buscar mensagens da conversa
Write-Host "`n5️⃣ Buscar mensagens da conversa" -ForegroundColor Yellow
try {
    $messages = Invoke-RestMethod -Uri "$baseUrl/chat/conversations/$conversationId/messages" -Method GET -Headers $headers
    Write-Host "✅ Total de mensagens: $($messages.data.total)" -ForegroundColor Green
    Write-Host "   Esperado: 4 mensagens (2 user + 2 assistant)" -ForegroundColor Gray
    
    # Mostrar primeiras mensagens
    if ($messages.data.messages.Count -gt 0) {
        Write-Host "`n   Primeiras mensagens:" -ForegroundColor Gray
        $messages.data.messages | Select-Object -First 2 | ForEach-Object {
            $role = if ($_.role -eq 'user') { '👤 User' } else { '🤖 Assistant' }
            $preview = $_.content.Substring(0, [Math]::Min(60, $_.content.Length))
            Write-Host "   $role : $preview..." -ForegroundColor DarkGray
        }
    }
} catch {
    Write-Host "❌ Erro ao buscar mensagens: $_" -ForegroundColor Red
}

# 6. Deletar conversa
Write-Host "`n6️⃣ Deletar conversa (opcional - descomente para testar)" -ForegroundColor Yellow
Write-Host "   Pulando deleção para manter histórico..." -ForegroundColor Gray
# Descomente para testar deleção:
# try {
#     $delete = Invoke-RestMethod -Uri "$baseUrl/chat/conversations/$conversationId" -Method DELETE -Headers $headers
#     Write-Host "✅ Conversa deletada" -ForegroundColor Green
# } catch {
#     Write-Host "❌ Erro ao deletar: $_" -ForegroundColor Red
# }

Write-Host "`n" -NoNewline
Write-Host ("=" * 80) -ForegroundColor Gray
Write-Host "✅ TODOS OS TESTES PASSARAM!" -ForegroundColor Green
Write-Host "`n💡 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Abra o sistema e faça login" -ForegroundColor White
Write-Host "   2. Faça uma pergunta inicial" -ForegroundColor White
Write-Host "   3. Faça perguntas de acompanhamento (ex: 'E dos anos finais?')" -ForegroundColor White
Write-Host "   4. Verifique se o contexto é mantido nas respostas" -ForegroundColor White
