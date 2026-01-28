/**
 * TEST CHAT QUERY - Testar query diretamente no endpoint do chat
 */

import axios from 'axios';

async function testQuery(question: string) {
  console.log(`\n🔍 TESTANDO: "${question}"\n`);

  try {
    const response = await axios.post('http://localhost:3001/api/v1/chat/ask', {
      question,
      conversationId: null,
    }, {
      headers: {
        'Authorization': 'Bearer mock-token-for-testing',
        'Content-Type': 'application/json',
      },
    });

    const { answer, sources } = response.data;

    console.log('💬 RESPOSTA:');
    console.log(answer);
    console.log('\n📚 FONTES:');
    
    if (sources && sources.length > 0) {
      sources.forEach((source: any, idx: number) => {
        const icon = source.document_type === 'REPORT' ? '📊' : 
                     source.document_type === 'LAW' ? '📜' : '📄';
        console.log(`${idx + 1}. ${icon} ${source.document_name}`);
        console.log(`   Tipo: ${source.document_type} | Relevância: ${(source.similarity * 100).toFixed(1)}%`);
      });
    } else {
      console.log('   Nenhuma fonte encontrada');
    }

    // Análise de sucesso
    console.log('\n📈 ANÁLISE:');
    const reportSources = sources.filter((s: any) => s.document_type === 'REPORT');
    const lawSources = sources.filter((s: any) => s.document_type === 'LAW');
    
    console.log(`   Fontes REPORT (Excel): ${reportSources.length}`);
    console.log(`   Fontes LAW: ${lawSources.length}`);
    
    if (reportSources.length > 0) {
      console.log('\n✅ SUCESSO! Dados Excel encontrados na resposta!\n');
      
      // Mostrar quais arquivos Excel foram usados
      const excelFiles = reportSources.map((s: any) => s.document_name);
      console.log('📊 Arquivos Excel usados:');
      excelFiles.forEach((file: string) => console.log(`   - ${file}`));
    } else {
      console.log('\n❌ PROBLEMA! Nenhum dado Excel foi usado na resposta.\n');
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error: any) {
    if (error.response) {
      console.error('❌ Erro HTTP:', error.response.status);
      console.error('Mensagem:', error.response.data);
    } else {
      console.error('❌ Erro:', error.message);
    }
  }
}

async function main() {
  console.log('\n🚀 TESTE DO CHAT COM DADOS EXCEL MELHORADOS\n');
  console.log('Testando queries educacionais para verificar se os dados Excel');
  console.log('reindexados com contexto melhorado estão sendo retornados.\n');
  console.log('='.repeat(80));

  // Testar com dados que já foram indexados
  await testQuery('Qual é o IDEB de Saquarema em 2023?');
  await testQuery('Qual é a distorção idade-série em Saquarema?');
  await testQuery('Mostre dados do SAEB de Saquarema 2023');

  console.log('✅ TESTES CONCLUÍDOS!\n');
}

main().catch(console.error);
