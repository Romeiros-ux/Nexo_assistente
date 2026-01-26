# Script de Deploy para Render - Nexo Assistente
# Execute este script antes de fazer push para o GitHub

Write-Host "🚀 Preparando deploy para Render..." -ForegroundColor Cyan
Write-Host ""

# Verifica se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Verifica se .env não está sendo commitado
$envTracked = git ls-files --error-unmatch .env 2>$null
if ($envTracked) {
    Write-Host "⚠️  AVISO: O arquivo .env está sendo versionado!" -ForegroundColor Yellow
    Write-Host "   Execute: git rm --cached .env" -ForegroundColor Yellow
    exit 1
}

# Testa o build
Write-Host "📦 Testando build de produção..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build falhou! Corrija os erros antes de fazer deploy." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. git add ."
Write-Host "   2. git commit -m 'feat: deploy no Render'"
Write-Host "   3. git push origin main"
Write-Host "   4. Acesse render.com e configure o serviço"
Write-Host ""
Write-Host "📖 Consulte CHECKLIST_DEPLOY.md para instruções completas" -ForegroundColor Yellow
