# Script para testar os endpoints de autenticação

Write-Host "=== Teste de Autenticação ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001/api/v1"

# 1. Teste de Login
Write-Host "1. Testando LOGIN..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@teste.com"
        password = "Admin@123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"

    Write-Host "   ✓ Login bem-sucedido!" -ForegroundColor Green
    Write-Host "   Token: $($loginResponse.token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host "   Usuário: $($loginResponse.user.name) ($($loginResponse.user.email))" -ForegroundColor Gray
    Write-Host "   Role: $($loginResponse.user.role)" -ForegroundColor Gray
    Write-Host ""

    $token = $loginResponse.token

    # 2. Teste de /auth/me
    Write-Host "2. Testando GET /auth/me..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $meResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" `
        -Method Get `
        -Headers $headers

    Write-Host "   ✓ Dados do usuário autenticado:" -ForegroundColor Green
    Write-Host "   Nome: $($meResponse.user.name)" -ForegroundColor Gray
    Write-Host "   Email: $($meResponse.user.email)" -ForegroundColor Gray
    Write-Host "   Role: $($meResponse.user.role)" -ForegroundColor Gray
    Write-Host ""

    # 3. Teste de listar usuários
    Write-Host "3. Testando GET /users..." -ForegroundColor Yellow
    $usersResponse = Invoke-RestMethod -Uri "$baseUrl/users" `
        -Method Get `
        -Headers $headers

    Write-Host "   ✓ Total de usuários: $($usersResponse.total)" -ForegroundColor Green
    Write-Host ""

    # 4. Teste de criar usuário
    Write-Host "4. Testando POST /users (criar usuário)..." -ForegroundColor Yellow
    $newUserBody = @{
        name = "Usuário Teste"
        email = "teste@exemplo.com"
        password = "Teste@123"
        role = "Coordenação"
        status = "active"
    } | ConvertTo-Json

    try {
        $createResponse = Invoke-RestMethod -Uri "$baseUrl/users" `
            -Method Post `
            -Body $newUserBody `
            -ContentType "application/json" `
            -Headers $headers

        Write-Host "   ✓ Usuário criado com sucesso!" -ForegroundColor Green
        Write-Host "   ID: $($createResponse.data.id)" -ForegroundColor Gray
        Write-Host "   Nome: $($createResponse.data.name)" -ForegroundColor Gray
        Write-Host ""

        $newUserId = $createResponse.data.id

        # 5. Teste de deletar usuário
        Write-Host "5. Testando DELETE /users/$newUserId..." -ForegroundColor Yellow
        $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/users/$newUserId" `
            -Method Delete `
            -Headers $headers

        Write-Host "   ✓ Usuário deletado com sucesso!" -ForegroundColor Green
        Write-Host ""

    } catch {
        Write-Host "   ⚠ Erro ao criar/deletar usuário: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host ""
    }

    Write-Host "=== Testes Concluídos ===" -ForegroundColor Green

} catch {
    Write-Host "   ✗ Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Detalhes:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
}
