# Script para configurar o banco de dados no Supabase
# Execute este script para criar as tabelas e seed inicial

Write-Host "=== Configuração do Banco de Dados ===" -ForegroundColor Cyan
Write-Host ""

# Verifica se o arquivo .env existe
if (!(Test-Path ".env")) {
    Write-Host "Erro: Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "Crie o arquivo .env com as credenciais do Supabase" -ForegroundColor Yellow
    exit 1
}

# Carrega variáveis do .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

$supabaseUrl = $env:SUPABASE_URL
$supabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (!$supabaseUrl -or !$supabaseKey) {
    Write-Host "Erro: Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas!" -ForegroundColor Red
    exit 1
}

Write-Host "URL do Supabase: $supabaseUrl" -ForegroundColor Green
Write-Host ""

# Lê o arquivo SQL
$sqlFile = ".\database\schema.sql"
if (!(Test-Path $sqlFile)) {
    Write-Host "Erro: Arquivo schema.sql não encontrado em .\database\" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $sqlFile -Raw

Write-Host "Instruções para executar o schema SQL:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse o Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Selecione seu projeto" -ForegroundColor White
Write-Host "3. Vá em 'SQL Editor' no menu lateral" -ForegroundColor White
Write-Host "4. Clique em 'New Query'" -ForegroundColor White
Write-Host "5. Cole o conteúdo do arquivo: database\schema.sql" -ForegroundColor White
Write-Host "6. Execute a query (Ctrl + Enter ou botão 'Run')" -ForegroundColor White
Write-Host ""
Write-Host "Ou use a Supabase CLI:" -ForegroundColor Yellow
Write-Host "  supabase db push --project-ref seu-projeto" -ForegroundColor White
Write-Host ""

Write-Host "=== Informações do Usuário Admin ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Após executar o schema, você terá um usuário admin:" -ForegroundColor Green
Write-Host "  Email: admin@teste.com" -ForegroundColor White
Write-Host "  Senha: Admin@123" -ForegroundColor White
Write-Host "  Role: TI" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE: Altere a senha no primeiro login!" -ForegroundColor Yellow
Write-Host ""

# Gera hash bcrypt para Admin@123
Write-Host "Para gerar um novo hash de senha, use:" -ForegroundColor Cyan
Write-Host "  POST /api/v1/users" -ForegroundColor White
Write-Host "  com a senha desejada no body" -ForegroundColor White
Write-Host ""
