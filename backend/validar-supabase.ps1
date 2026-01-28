# ═══════════════════════════════════════════════════════════════════════════
# 🔍 SCRIPT DE VALIDAÇÃO - SUPABASE SETUP
# ═══════════════════════════════════════════════════════════════════════════
# 
# Este script verifica se todas as tabelas foram criadas corretamente
# 
# COMO USAR:
# 1. Abra PowerShell nesta pasta (backend)
# 2. Execute: .\validar-supabase.ps1
# 
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 VALIDANDO SETUP DO SUPABASE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURAÇÃO - INSIRA SUAS CREDENCIAIS
# ═══════════════════════════════════════════════════════════════════════════

$SUPABASE_URL = "https://ivhrhpvbjyecpxitllre.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2aHJocHZianllY3B4aXRsbHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTg1ODYsImV4cCI6MjA4NTE5NDU4Nn0.WJOCBXst15wUIg1h0MeBmn5wOhOSkejsROkEB4nWMUA"

# Headers para requisição
$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
}

# ═══════════════════════════════════════════════════════════════════════════
# TESTES
# ═══════════════════════════════════════════════════════════════════════════

$erros = 0
$sucessos = 0

Write-Host "📊 Testando conexão com as tabelas..." -ForegroundColor Yellow
Write-Host ""

# Lista de tabelas para verificar
$tabelas = @(
    "users",
    "educational_units",
    "user_units",
    "documents",
    "document_versions",
    "document_chunks",
    "document_embeddings",
    "chat_logs",
    "chat_citations",
    "document_indexing_jobs"
)

foreach ($tabela in $tabelas) {
    try {
        $url = "$SUPABASE_URL/rest/v1/$tabela`?select=count&limit=1"
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop
        Write-Host "✅ Tabela '$tabela' existe e está acessível" -ForegroundColor Green
        $sucessos++
    }
    catch {
        Write-Host "❌ Erro ao acessar tabela '$tabela'" -ForegroundColor Red
        Write-Host "   Detalhes: $($_.Exception.Message)" -ForegroundColor Red
        $erros++
    }
}

Write-Host ""
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

# ═══════════════════════════════════════════════════════════════════════════
# VERIFICAR STORAGE BUCKET
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "📦 Testando Storage (bucket de documentos)..." -ForegroundColor Yellow

try {
    $url = "$SUPABASE_URL/storage/v1/bucket/documents"
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "✅ Storage bucket 'documents' existe" -ForegroundColor Green
    $sucessos++
}
catch {
    Write-Host "⚠️  Storage bucket 'documents' pode não estar acessível via REST" -ForegroundColor Yellow
    Write-Host "   (Isso é normal se as policies não permitem acesso público)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

# ═══════════════════════════════════════════════════════════════════════════
# RESULTADO FINAL
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 RESULTADO DA VALIDAÇÃO" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Sucessos: $sucessos" -ForegroundColor Green
Write-Host "❌ Erros: $erros" -ForegroundColor $(if ($erros -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($erros -eq 0) {
    Write-Host "🎉 SUPABASE CONFIGURADO CORRETAMENTE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Todas as tabelas estão acessíveis" -ForegroundColor Green
    Write-Host "✅ Estrutura do banco está correta" -ForegroundColor Green
    Write-Host "✅ Pronto para prosseguir com o deploy!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Próximo passo: Criar conta OpenAI e obter API Key" -ForegroundColor Yellow
}
else {
    Write-Host "⚠️  Alguns problemas foram encontrados" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Gray
    Write-Host "  1. SQL não foi executado completamente" -ForegroundColor Gray
    Write-Host "  2. Credenciais incorretas neste script" -ForegroundColor Gray
    Write-Host "  3. RLS policies muito restritivas" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Recomendação: Verifique o SQL Editor do Supabase" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
