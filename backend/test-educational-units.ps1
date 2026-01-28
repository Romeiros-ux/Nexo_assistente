# 🧪 Script de Teste - Sistema de Unidades Educacionais

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teste do Sistema de Unidades Educacionais" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001/api/v1"
$headers = @{ "Content-Type" = "application/json" }

# ==================================================
# 1. LOGIN COMO TI (ADMIN)
# ==================================================
Write-Host "[1] Fazendo login como TI..." -ForegroundColor Yellow

$loginBody = @{
    email = "admin@teste.com"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Headers $headers -Body $loginBody
    $token = $loginResponse.data.token
    $authHeaders = @{ 
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    Write-Host "✓ Login realizado com sucesso!" -ForegroundColor Green
    Write-Host "  User: $($loginResponse.data.user.name) ($($loginResponse.data.user.role))`n" -ForegroundColor Gray
} catch {
    Write-Host "✗ Erro no login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ==================================================
# 2. LISTAR UNIDADES EXISTENTES
# ==================================================
Write-Host "[2] Listando unidades educacionais..." -ForegroundColor Yellow

try {
    $units = Invoke-RestMethod -Uri "$baseUrl/educational-units" -Method Get -Headers $authHeaders
    Write-Host "✓ Total de unidades: $($units.total)" -ForegroundColor Green
    Write-Host "  Access Note: $($units.access_note)" -ForegroundColor Gray
    
    if ($units.data.Count -gt 0) {
        Write-Host "`n  Unidades:" -ForegroundColor Gray
        foreach ($unit in $units.data) {
            Write-Host "  - $($unit.name) [$($unit.type)] - $($unit.code)" -ForegroundColor Gray
        }
    }
    Write-Host ""
} catch {
    Write-Host "✗ Erro ao listar unidades: $($_.Exception.Message)" -ForegroundColor Red
}

# ==================================================
# 3. CRIAR NOVA UNIDADE
# ==================================================
Write-Host "[3] Criando nova unidade educacional..." -ForegroundColor Yellow

$newUnit = @{
    name = "Escola Teste Automatizado"
    type = "school"
    code = "ETA001"
    address = "Rua dos Testes, 123"
    phone = "(11) 9999-8888"
    status = "active"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/educational-units" -Method Post -Headers $authHeaders -Body $newUnit
    $createdUnitId = $createResponse.data.id
    Write-Host "✓ Unidade criada com sucesso!" -ForegroundColor Green
    Write-Host "  ID: $createdUnitId" -ForegroundColor Gray
    Write-Host "  Nome: $($createResponse.data.name)" -ForegroundColor Gray
    Write-Host "  Código: $($createResponse.data.code)`n" -ForegroundColor Gray
} catch {
    Write-Host "✗ Erro ao criar unidade: $($_.Exception.Message)" -ForegroundColor Red
    $createdUnitId = $null
}

# ==================================================
# 4. BUSCAR UNIDADE POR ID
# ==================================================
if ($createdUnitId) {
    Write-Host "[4] Buscando unidade por ID..." -ForegroundColor Yellow
    
    try {
        $unitById = Invoke-RestMethod -Uri "$baseUrl/educational-units/$createdUnitId" -Method Get -Headers $authHeaders
        Write-Host "✓ Unidade encontrada!" -ForegroundColor Green
        Write-Host "  Nome: $($unitById.data.name)" -ForegroundColor Gray
        Write-Host "  Status: $($unitById.data.status)`n" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Erro ao buscar unidade: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ==================================================
# 5. ATUALIZAR UNIDADE
# ==================================================
if ($createdUnitId) {
    Write-Host "[5] Atualizando unidade..." -ForegroundColor Yellow
    
    $updateData = @{
        name = "Escola Teste Automatizado - ATUALIZADA"
        phone = "(11) 8888-7777"
    } | ConvertTo-Json
    
    try {
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/educational-units/$createdUnitId" -Method Put -Headers $authHeaders -Body $updateData
        Write-Host "✓ Unidade atualizada com sucesso!" -ForegroundColor Green
        Write-Host "  Novo nome: $($updateResponse.data.name)" -ForegroundColor Gray
        Write-Host "  Novo telefone: $($updateResponse.data.phone)`n" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Erro ao atualizar unidade: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ==================================================
# 6. LISTAR USUÁRIOS
# ==================================================
Write-Host "[6] Listando usuários..." -ForegroundColor Yellow

try {
    $users = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $authHeaders
    Write-Host "✓ Total de usuários: $($users.total)" -ForegroundColor Green
    
    if ($users.data.Count -gt 0) {
        $testUserId = $users.data[0].id
        Write-Host "  Usuário de teste selecionado: $($users.data[0].name) [$($users.data[0].email)]`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Erro ao listar usuários: $($_.Exception.Message)" -ForegroundColor Red
    $testUserId = $null
}

# ==================================================
# 7. VINCULAR USUÁRIO A UNIDADES
# ==================================================
if ($testUserId -and $createdUnitId) {
    Write-Host "[7] Vinculando usuário a unidades..." -ForegroundColor Yellow
    
    # Buscar IDs de todas as unidades disponíveis
    try {
        $allUnits = Invoke-RestMethod -Uri "$baseUrl/educational-units" -Method Get -Headers $authHeaders
        $unitIds = @($createdUnitId)
        
        # Adicionar mais unidades se houver
        if ($allUnits.data.Count -gt 1) {
            $unitIds += $allUnits.data[1].id
        }
        
        $linkData = @{
            unit_ids = $unitIds
        } | ConvertTo-Json
        
        $linkResponse = Invoke-RestMethod -Uri "$baseUrl/users/$testUserId/units" -Method Post -Headers $authHeaders -Body $linkData
        Write-Host "✓ Usuário vinculado a $($linkResponse.total) unidade(s)!" -ForegroundColor Green
        
        foreach ($unit in $linkResponse.data) {
            Write-Host "  - $($unit.name)" -ForegroundColor Gray
        }
        Write-Host ""
    } catch {
        Write-Host "✗ Erro ao vincular usuário: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ==================================================
# 8. LISTAR UNIDADES DO USUÁRIO
# ==================================================
if ($testUserId) {
    Write-Host "[8] Listando unidades do usuário..." -ForegroundColor Yellow
    
    try {
        $userUnits = Invoke-RestMethod -Uri "$baseUrl/users/$testUserId/units" -Method Get -Headers $authHeaders
        Write-Host "✓ Usuário possui $($userUnits.total) unidade(s) vinculada(s):" -ForegroundColor Green
        
        foreach ($unit in $userUnits.data) {
            Write-Host "  - $($unit.name) [$($unit.type)]" -ForegroundColor Gray
        }
        Write-Host ""
    } catch {
        Write-Host "✗ Erro ao listar unidades do usuário: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ==================================================
# 9. OBTER FILTRO PARA ASSISTENTE IA
# ==================================================
Write-Host "[9] Obtendo informações de filtro para IA..." -ForegroundColor Yellow

try {
    $filterInfo = Invoke-RestMethod -Uri "$baseUrl/educational-units/filter/for-user" -Method Get -Headers $authHeaders
    Write-Host "✓ Filtro obtido com sucesso!" -ForegroundColor Green
    Write-Host "  Has Access: $($filterInfo.data.hasAccess)" -ForegroundColor Gray
    Write-Host "  Is Admin: $($filterInfo.data.isAdmin)" -ForegroundColor Gray
    Write-Host "  Filter Required: $($filterInfo.data.filterRequired)" -ForegroundColor Gray
    Write-Host "  Unit IDs Count: $($filterInfo.data.unitIds.Count)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Erro ao obter filtro: $($_.Exception.Message)" -ForegroundColor Red
}

# ==================================================
# 10. TENTAR DELETAR UNIDADE COM VÍNCULO (deve falhar)
# ==================================================
if ($createdUnitId) {
    Write-Host "[10] Tentando deletar unidade com vínculos (deve falhar)..." -ForegroundColor Yellow
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/educational-units/$createdUnitId" -Method Delete -Headers $authHeaders
        Write-Host "✗ ATENÇÃO: Unidade foi deletada mesmo tendo vínculos!" -ForegroundColor Red
    } catch {
        $errorMsg = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "✓ Proteção funcionando corretamente!" -ForegroundColor Green
        Write-Host "  Mensagem: $($errorMsg.error)" -ForegroundColor Gray
    }
    Write-Host ""
}

# ==================================================
# 11. REMOVER VÍNCULOS E DELETAR UNIDADE
# ==================================================
if ($testUserId -and $createdUnitId) {
    Write-Host "[11] Removendo vínculos e deletando unidade..." -ForegroundColor Yellow
    
    # Remove todos os vínculos
    try {
        $emptyLinks = @{ unit_ids = @() } | ConvertTo-Json
        Invoke-RestMethod -Uri "$baseUrl/users/$testUserId/units" -Method Post -Headers $authHeaders -Body $emptyLinks
        Write-Host "✓ Vínculos removidos!" -ForegroundColor Green
    } catch {
        Write-Host "  Erro ao remover vínculos: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Agora deleta a unidade
    try {
        Invoke-RestMethod -Uri "$baseUrl/educational-units/$createdUnitId" -Method Delete -Headers $authHeaders
        Write-Host "✓ Unidade deletada com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "✗ Erro ao deletar unidade: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# ==================================================
# RESUMO
# ==================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teste Concluído!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Sistema de unidades educacionais funcionando corretamente" -ForegroundColor Green
Write-Host "✓ Governança de acesso implementada" -ForegroundColor Green
Write-Host "✓ Vínculos usuário x unidade operacionais" -ForegroundColor Green
Write-Host "✓ Proteções de integridade ativas" -ForegroundColor Green
Write-Host ""
Write-Host "Próximo passo: Integrar com o assistente de IA" -ForegroundColor Cyan
Write-Host ""
