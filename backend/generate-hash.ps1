# Script para gerar hash bcrypt de uma senha
# Útil para criar senhas manualmente no banco

param(
    [Parameter(Mandatory=$false)]
    [string]$Password
)

if (!$Password) {
    $Password = Read-Host "Digite a senha para gerar o hash" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    )
}

Write-Host ""
Write-Host "Gerando hash bcrypt..." -ForegroundColor Yellow
Write-Host ""

# Cria um script Node.js temporário
$nodeScript = @"
const bcrypt = require('bcrypt');
const password = process.argv[2];
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
"@

$nodeScript | Out-File -FilePath "temp-hash.js" -Encoding utf8

# Executa o script
try {
    $hash = node temp-hash.js $Password
    Write-Host "Hash gerado:" -ForegroundColor Green
    Write-Host $hash -ForegroundColor White
    Write-Host ""
    Write-Host "Use este hash no banco de dados na coluna 'password'" -ForegroundColor Cyan
} catch {
    Write-Host "Erro ao gerar hash. Certifique-se de que o Node.js e bcrypt estão instalados." -ForegroundColor Red
    Write-Host "Execute: npm install" -ForegroundColor Yellow
} finally {
    Remove-Item "temp-hash.js" -ErrorAction SilentlyContinue
}
