/**
 * Teste de integração: Chat com metadata enriquecida
 */
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:3001/api/v1';

async function testChatIntegration() {
  console.log('🧪 TESTE: Integração Chat com Metadata Enriquecida\n');
  console.log('='.repeat(80));

  try {
    // 1. Login
    console.log('\n1️⃣ Realizando login...');
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@teste.com',
        password: 'Admin@123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login falhou: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('✅ Login realizado com sucesso');

    // 2. Fazer pergunta sobre IDEB
    console.log('\n2️⃣ Enviando pergunta: "Qual o IDEB de 2023 dos anos iniciais?"');
    const chatResponse = await fetch(`${baseUrl}/chat/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: 'Qual o IDEB de 2023 dos anos iniciais?'
      })
    });

    if (!chatResponse.ok) {
      const errorData = await chatResponse.json();
      throw new Error(`Chat falhou: ${chatResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const chatData = await chatResponse.json();

    console.log('✅ Resposta recebida');
    console.log('\n📊 RESPOSTA DO ASSISTENTE:');
    console.log('-'.repeat(80));
    console.log(chatData.data.answer);
    console.log('-'.repeat(80));

    console.log('\n📚 FONTES UTILIZADAS:', chatData.data.sources?.length || 0);
    if (chatData.data.sources && chatData.data.sources.length > 0) {
      chatData.data.sources.slice(0, 3).forEach((source, idx) => {
        console.log(`  ${idx + 1}. ${source.document_name} (${(source.similarity * 100).toFixed(1)}%)`);
      });
    }

    console.log('\n💰 USO:');
    console.log(`  - Tokens totais: ${chatData.data.usage?.total_tokens || 'N/A'}`);
    console.log(`  - Custo estimado: $${chatData.data.usage?.estimated_cost?.toFixed(6) || 'N/A'}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ TESTE DE INTEGRAÇÃO COMPLETO!');
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('  1. Verificar se metadata aparece nos logs do backend (ano, etapa, categoria)');
    console.log('  2. Confirmar que resposta menciona ano e etapa específicos');
    console.log('  3. Prosseguir para PASSO 1.6 (git commit)');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    process.exit(1);
  }
}

testChatIntegration();
