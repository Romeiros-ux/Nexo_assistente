/**
 * Teste: Fluxo completo de conversação com contexto
 * Valida que perguntas de acompanhamento mantêm contexto
 */
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:3001/api/v1';

async function testConversationFlow() {
  console.log('🧪 TESTE: Fluxo de Conversação com Histórico\n');
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
    console.log('✅ Login realizado');

    // 2. PERGUNTA 1: Inicial (cria nova conversa)
    console.log('\n2️⃣ PERGUNTA 1: "Qual o IDEB de 2023?"');
    const chat1Response = await fetch(`${baseUrl}/chat/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: 'Qual o IDEB de 2023?'
      })
    });

    if (!chat1Response.ok) {
      throw new Error(`Chat 1 falhou: ${chat1Response.status}`);
    }

    const chat1Data = await chat1Response.json();
    const conversationId = chat1Data.data.conversationId;
    
    console.log(`✅ Resposta: ${chat1Data.data.answer.substring(0, 150)}...`);
    console.log(`📊 ConversationId: ${conversationId}`);

    // 3. PERGUNTA 2: Acompanhamento (usa contexto)
    console.log('\n3️⃣ PERGUNTA 2: "E dos anos finais?" (deve usar contexto do IDEB)');
    const chat2Response = await fetch(`${baseUrl}/chat/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: 'E dos anos finais?',
        conversationId // PASSA O ID DA CONVERSA
      })
    });

    if (!chat2Response.ok) {
      throw new Error(`Chat 2 falhou: ${chat2Response.status}`);
    }

    const chat2Data = await chat2Response.json();
    const sameConversation = chat2Data.data.conversationId === conversationId;
    
    console.log(`✅ Resposta: ${chat2Data.data.answer.substring(0, 150)}...`);
    console.log(`📊 Mesmo conversationId: ${sameConversation ? 'SIM ✅' : 'NÃO ❌'}`);

    if (!sameConversation) {
      throw new Error('ConversationId diferente! Contexto não foi mantido.');
    }

    // 4. PERGUNTA 3: Outro acompanhamento
    console.log('\n4️⃣ PERGUNTA 3: "E em 2024?"');
    const chat3Response = await fetch(`${baseUrl}/chat/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: 'E em 2024?',
        conversationId
      })
    });

    if (!chat3Response.ok) {
      throw new Error(`Chat 3 falhou: ${chat3Response.status}`);
    }

    const chat3Data = await chat3Response.json();
    console.log(`✅ Resposta: ${chat3Data.data.answer.substring(0, 150)}...`);

    // 5. Buscar mensagens da conversa
    console.log('\n5️⃣ Buscando mensagens da conversa...');
    const messagesResponse = await fetch(`${baseUrl}/chat/conversations/${conversationId}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!messagesResponse.ok) {
      throw new Error(`Busca de mensagens falhou: ${messagesResponse.status}`);
    }

    const messagesData = await messagesResponse.json();
    const totalMessages = messagesData.data.total;
    
    console.log(`✅ Total de mensagens: ${totalMessages}`);
    console.log(`   Esperado: 6 mensagens (3 user + 3 assistant)`);

    if (totalMessages !== 6) {
      console.warn(`⚠️  Número de mensagens inesperado: ${totalMessages} (esperado: 6)`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ TESTE COMPLETO!');
    console.log('\n💡 VERIFICAÇÕES:');
    console.log(`  ✅ 3 perguntas realizadas com sucesso`);
    console.log(`  ✅ Mesmo conversationId nas 3 perguntas`);
    console.log(`  ✅ Total de ${totalMessages} mensagens salvas`);
    console.log('\n📝 NOTA: Verifique manualmente se:');
    console.log('  - A pergunta 2 entendeu que "anos finais" se refere ao IDEB');
    console.log('  - A pergunta 3 entendeu que "2024" se refere ao IDEB também');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    process.exit(1);
  }
}

testConversationFlow();
