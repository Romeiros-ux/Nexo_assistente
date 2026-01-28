# ========================================
# Script: Processar documento PENDING
# ========================================
# Configura variáveis de ambiente e executa processamento

Write-Host "`n==> Configurando variáveis de ambiente..." -ForegroundColor Cyan

$env:SUPABASE_URL = "https://edtsrirqtgsjphlmuwui.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHNyaXJxdGdzanBobG11d3VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk1OTA0MywiZXhwIjoyMDgzNTM1MDQzfQ.G2-30m8lUTvtjN3iGqqsMfWSbWvvFcpGsr4SqboZATc"
$env:OPENAI_API_KEY = "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"

Write-Host "✅ Variáveis configuradas" -ForegroundColor Green

Write-Host "`n==> Executando script de processamento..." -ForegroundColor Cyan

npx tsx backend/scripts/force-process-documents.ts

Write-Host "`n✅ Script concluído!" -ForegroundColor Green
