#!/bin/bash

# Script de Deploy para Render - Nexo Assistente
# Execute este script antes de fazer push para o GitHub

echo "🚀 Preparando deploy para Render..."
echo ""

# Verifica se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# Verifica se .env não está sendo commitado
if git ls-files --error-unmatch .env > /dev/null 2>&1; then
    echo "⚠️  AVISO: O arquivo .env está sendo versionado!"
    echo "   Execute: git rm --cached .env"
    exit 1
fi

# Testa o build
echo "📦 Testando build de produção..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build falhou! Corrija os erros antes de fazer deploy."
    exit 1
fi

echo ""
echo "✅ Build concluído com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. git add ."
echo "   2. git commit -m 'feat: deploy no Render'"
echo "   3. git push origin main"
echo "   4. Acesse render.com e configure o serviço"
echo ""
echo "📖 Consulte CHECKLIST_DEPLOY.md para instruções completas"
