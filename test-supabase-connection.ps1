# Script PowerShell para testar conexão com Supabase
# Execute: .\test-supabase-connection.ps1

Write-Host "=== Teste de Conexao com Supabase ===" -ForegroundColor Cyan
Write-Host ""

# Carregar variaveis do arquivo .env
if (Test-Path .env) {
    Write-Host "Carregando variaveis do arquivo .env..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
            Write-Host "  OK $name carregado" -ForegroundColor Green
        }
    }
    Write-Host ""
} else {
    Write-Host "Arquivo .env nao encontrado!" -ForegroundColor Red
    exit 1
}

# Configuracoes do Supabase
$supabaseUrl = $env:VITE_SUPABASE_URL
$supabaseAnonKey = $env:VITE_SUPABASE_ANON_KEY

Write-Host "URL do Supabase: $supabaseUrl" -ForegroundColor Cyan
Write-Host ""

# Testar conexao com a API REST do Supabase
Write-Host "Testando conexao com a API REST..." -ForegroundColor Yellow

try {
    $headers = @{
        "apikey" = $supabaseAnonKey
        "Authorization" = "Bearer $supabaseAnonKey"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/" -Headers $headers -Method Get
    
    Write-Host "OK Conexao bem-sucedida com o Supabase!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Detalhes da resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 3
    
} catch {
    Write-Host "Erro ao conectar com o Supabase:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Detalhes do erro:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Teste Concluido ===" -ForegroundColor Cyan
