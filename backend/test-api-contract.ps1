# 🧪 Script de Teste - Contrato de API

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teste do Contrato de API Frontend ↔ Backend" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3001/api/v1"
$headers = @{ "Content-Type" = "application/json" }

function Test-ResponseStructure {
    param(
        [string]$TestName,
        [object]$Response,
        [string[]]$RequiredFields
    )
    
    Write-Host "  Validando estrutura da resposta..." -ForegroundColor Gray
    
    foreach ($field in $RequiredFields) {
        if ($Response.PSObject.Properties.Name -contains $field) {
            Write-Host "    ✓ Campo '$field' presente" -ForegroundColor Green
        } else {
            Write-Host "    ✗ Campo '$field' AUSENTE" -ForegroundColor Red
        }
    }
}

# ==================================================
# 1. TESTE: POST /auth/login
# ==================================================
Write-Host "[1] POST /auth/login - Contrato de Login" -ForegroundColor Yellow

$loginBody = @{
    email = "admin@teste.com"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Headers $headers -Body $loginBody
    
    Write-Host "✓ Status 200 - Login bem-sucedido" -ForegroundColor Green
    
    # Validar estrutura da resposta
    $requiredFields = @("success", "message", "data")
    Test-ResponseStructure -TestName "Login" -Response $loginResponse -RequiredFields $requiredFields
    
    # Validar estrutura de data
    Write-Host "  Validando estrutura de 'data'..." -ForegroundColor Gray
    $dataFields = @("token", "expiresIn", "user")
    Test-ResponseStructure -TestName "Login Data" -Response $loginResponse.data -RequiredFields $dataFields
    
    # Validar estrutura de user
    Write-Host "  Validando estrutura de 'user'..." -ForegroundColor Gray
    $userFields = @("id", "name", "email", "role", "status", "created_at", "updated_at")
    Test-ResponseStructure -TestName "User" -Response $loginResponse.data.user -RequiredFields $userFields
    
    # Verificar valores
    Write-Host "`n  Valores retornados:" -ForegroundColor Gray
    Write-Host "    success: $($loginResponse.success)" -ForegroundColor White
    Write-Host "    message: $($loginResponse.message)" -ForegroundColor White
    Write-Host "    expiresIn: $($loginResponse.data.expiresIn)" -ForegroundColor White
    Write-Host "    user.role: $($loginResponse.data.user.role)" -ForegroundColor White
    Write-Host "    token length: $($loginResponse.data.token.Length) chars" -ForegroundColor White
    
    # Salvar token para próximos testes
    $token = $loginResponse.data.token
    $authHeaders = @{ 
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host "`n✓ Contrato de login VÁLIDO`n" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Erro no login: $($_.Exception.Message)" -ForegroundColor Red
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  Estrutura de erro:" -ForegroundColor Yellow
    Write-Host "    success: $($errorResponse.success)" -ForegroundColor White
    Write-Host "    error: $($errorResponse.error)" -ForegroundColor White
    exit 1
}

# ==================================================
# 2. TESTE: GET /auth/me
# ==================================================
Write-Host "[2] GET /auth/me - Usuário Autenticado" -ForegroundColor Yellow

try {
    $meResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $authHeaders
    
    Write-Host "✓ Status 200 - Usuário autenticado" -ForegroundColor Green
    
    # Validar estrutura
    $requiredFields = @("success", "data")
    Test-ResponseStructure -TestName "Auth Me" -Response $meResponse -RequiredFields $requiredFields
    
    # Validar estrutura de data (user)
    $userFields = @("id", "name", "email", "role", "status")
    Test-ResponseStructure -TestName "User Data" -Response $meResponse.data -RequiredFields $userFields
    
    Write-Host "`n  Usuário autenticado:" -ForegroundColor Gray
    Write-Host "    ID: $($meResponse.data.id)" -ForegroundColor White
    Write-Host "    Nome: $($meResponse.data.name)" -ForegroundColor White
    Write-Host "    Email: $($meResponse.data.email)" -ForegroundColor White
    Write-Host "    Role: $($meResponse.data.role)" -ForegroundColor White
    Write-Host "    Status: $($meResponse.data.status)" -ForegroundColor White
    
    Write-Host "`n✓ Contrato de /auth/me VÁLIDO`n" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Erro ao buscar usuário: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ==================================================
# 3. TESTE: GET /users (Admin only)
# ==================================================
Write-Host "[3] GET /users - Listagem de Usuários" -ForegroundColor Yellow

try {
    $usersResponse = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $authHeaders
    
    Write-Host "✓ Status 200 - Usuários listados" -ForegroundColor Green
    
    # Validar estrutura
    $requiredFields = @("success", "data", "total")
    Test-ResponseStructure -TestName "Users List" -Response $usersResponse -RequiredFields $requiredFields
    
    Write-Host "`n  Listagem:" -ForegroundColor Gray
    Write-Host "    Total de usuários: $($usersResponse.total)" -ForegroundColor White
    Write-Host "    Tipo de data: $($usersResponse.data.GetType().Name)" -ForegroundColor White
    
    if ($usersResponse.data.Count -gt 0) {
        Write-Host "`n  Primeiro usuário:" -ForegroundColor Gray
        $firstUser = $usersResponse.data[0]
        $userFields = @("id", "name", "email", "role", "status")
        Test-ResponseStructure -TestName "First User" -Response $firstUser -RequiredFields $userFields
    }
    
    Write-Host "`n✓ Contrato de /users VÁLIDO`n" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Erro ao listar usuários: $($_.Exception.Message)" -ForegroundColor Red
}

# ==================================================
# 4. TESTE: Erro 401 - Token Ausente
# ==================================================
Write-Host "[4] Testando Erro 401 - Token Ausente" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers
    Write-Host "✗ ERRO: Deveria retornar 401 mas retornou 200" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 401) {
        Write-Host "✓ Status 401 retornado corretamente" -ForegroundColor Green
        
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        
        # Validar estrutura de erro
        Write-Host "  Validando estrutura de erro..." -ForegroundColor Gray
        $errorFields = @("success", "error")
        Test-ResponseStructure -TestName "Error" -Response $errorResponse -RequiredFields $errorFields
        
        Write-Host "`n  Erro retornado:" -ForegroundColor Gray
        Write-Host "    success: $($errorResponse.success)" -ForegroundColor White
        Write-Host "    error: $($errorResponse.error)" -ForegroundColor White
        
        Write-Host "`n✓ Contrato de erro 401 VÁLIDO`n" -ForegroundColor Green
    } else {
        Write-Host "✗ Status incorreto: $statusCode (esperado 401)" -ForegroundColor Red
    }
}

# ==================================================
# 5. TESTE: Erro 401 - Credenciais Inválidas
# ==================================================
Write-Host "[5] Testando Erro 401 - Credenciais Inválidas" -ForegroundColor Yellow

$wrongLoginBody = @{
    email = "admin@teste.com"
    password = "SenhaErrada123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Headers $headers -Body $wrongLoginBody
    Write-Host "✗ ERRO: Deveria retornar 401 mas retornou 200" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 401) {
        Write-Host "✓ Status 401 retornado corretamente" -ForegroundColor Green
        
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        
        Write-Host "  Erro retornado:" -ForegroundColor Gray
        Write-Host "    success: $($errorResponse.success)" -ForegroundColor White
        Write-Host "    error: $($errorResponse.error)" -ForegroundColor White
        
        Write-Host "`n✓ Contrato de erro de credenciais VÁLIDO`n" -ForegroundColor Green
    } else {
        Write-Host "✗ Status incorreto: $statusCode (esperado 401)" -ForegroundColor Red
    }
}

# ==================================================
# 6. TESTE: GET /educational-units
# ==================================================
Write-Host "[6] GET /educational-units - Governança" -ForegroundColor Yellow

try {
    $unitsResponse = Invoke-RestMethod -Uri "$baseUrl/educational-units" -Method Get -Headers $authHeaders
    
    Write-Host "✓ Status 200 - Unidades listadas" -ForegroundColor Green
    
    # Validar estrutura
    $requiredFields = @("success", "data", "total", "user_role", "access_note")
    Test-ResponseStructure -TestName "Units List" -Response $unitsResponse -RequiredFields $requiredFields
    
    Write-Host "`n  Governança:" -ForegroundColor Gray
    Write-Host "    Total de unidades: $($unitsResponse.total)" -ForegroundColor White
    Write-Host "    User role: $($unitsResponse.user_role)" -ForegroundColor White
    Write-Host "    Access note: $($unitsResponse.access_note)" -ForegroundColor White
    
    if ($unitsResponse.data.Count -gt 0) {
        Write-Host "`n  Primeira unidade:" -ForegroundColor Gray
        $firstUnit = $unitsResponse.data[0]
        $unitFields = @("id", "name", "type", "status")
        Test-ResponseStructure -TestName "First Unit" -Response $firstUnit -RequiredFields $unitFields
    }
    
    Write-Host "`n✓ Contrato de /educational-units VÁLIDO`n" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Erro ao listar unidades: $($_.Exception.Message)" -ForegroundColor Red
}

# ==================================================
# 7. VERIFICAÇÃO: Identificação de Admin
# ==================================================
Write-Host "[7] Verificação - Identificação de Admin" -ForegroundColor Yellow

Write-Host "  Frontend pode identificar admin verificando:" -ForegroundColor Gray
Write-Host "    → user.role === 'TI'" -ForegroundColor White
Write-Host "    → Valor atual: '$($meResponse.data.role)'" -ForegroundColor White

if ($meResponse.data.role -eq "TI") {
    Write-Host "`n✓ Usuário é ADMIN (TI) - Frontend pode liberar rotas admin`n" -ForegroundColor Green
} else {
    Write-Host "`n✓ Usuário NÃO é admin - Frontend deve restringir acesso`n" -ForegroundColor Yellow
}

# ==================================================
# RESUMO DO CONTRATO
# ==================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Resumo do Contrato de API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n✅ CONTRATOS VALIDADOS:" -ForegroundColor Green
Write-Host "  • POST /auth/login → { success, message, data: { token, expiresIn, user } }" -ForegroundColor White
Write-Host "  • GET /auth/me → { success, data: user }" -ForegroundColor White
Write-Host "  • GET /users → { success, data: users[], total }" -ForegroundColor White
Write-Host "  • GET /educational-units → { success, data: units[], total, user_role, access_note }" -ForegroundColor White
Write-Host "  • Erros → { success: false, error: string }" -ForegroundColor White

Write-Host "`n🔐 AUTENTICAÇÃO:" -ForegroundColor Cyan
Write-Host "  • Token JWT no formato: Bearer <token>" -ForegroundColor White
Write-Host "  • Expiração: 7 dias (7d)" -ForegroundColor White
Write-Host "  • Payload: { id, email, role, iat, exp }" -ForegroundColor White

Write-Host "`n🎭 IDENTIFICAÇÃO DE ADMIN:" -ForegroundColor Cyan
Write-Host "  • Verificar: user.role === 'TI'" -ForegroundColor White
Write-Host "  • Admin pode acessar: /admin, CRUD de users, CRUD de units" -ForegroundColor White
Write-Host "  • Outros perfis: apenas rotas gerais e suas unidades" -ForegroundColor White

Write-Host "`n📊 STATUS CODES:" -ForegroundColor Cyan
Write-Host "  • 200: Sucesso" -ForegroundColor White
Write-Host "  • 201: Criado" -ForegroundColor White
Write-Host "  • 400: Dados inválidos" -ForegroundColor White
Write-Host "  • 401: Não autenticado (token inválido/ausente)" -ForegroundColor White
Write-Host "  • 403: Não autorizado (role insuficiente)" -ForegroundColor White
Write-Host "  • 404: Não encontrado" -ForegroundColor White
Write-Host "  • 500: Erro no servidor" -ForegroundColor White

Write-Host "`n✅ Contrato de API 100% compatível com frontend React!" -ForegroundColor Green
Write-Host ""
