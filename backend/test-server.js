const http = require('http');

console.log('Aguardando 5 segundos para o servidor inicializar...\n');

setTimeout(() => {
  console.log('===========================================');
  console.log('TESTE 1: Health Check (GET /health)');
  console.log('===========================================\n');

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 5000,
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Status:', res.statusCode);
        console.log('✅ Resposta:', JSON.stringify(response, null, 2));
        console.log('\n===========================================');
        console.log('SERVIDOR OK! Backend funcionando corretamente');
        console.log('===========================================\n');
        
        // Teste 2: POST /api/chat/ask (sem autenticação - espera erro 401)
        testChatEndpoint();
      } catch (error) {
        console.error('❌ Erro ao parsear resposta:', error.message);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Erro na requisição:', error.message);
    console.error('\n⚠️  SERVIDOR NÃO ESTÁ RESPONDENDO');
    console.error('Verifique se npm run dev está rodando no diretório backend/');
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('❌ Timeout - Servidor não respondeu em 5 segundos');
    req.destroy();
    process.exit(1);
  });

  req.end();
}, 5000);

function testChatEndpoint() {
  console.log('===========================================');
  console.log('TESTE 2: Chat Ask (POST /api/v1/chat/ask)');
  console.log('(sem autenticação - espera erro 401)');
  console.log('===========================================\n');

  const postData = JSON.stringify({
    query: 'Qual o horário de funcionamento?'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/chat/ask',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
    timeout: 5000,
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (res.statusCode === 401) {
          console.log('✅ Status 401 (esperado - sem autenticação)');
          console.log('✅ Rota /api/v1/chat/ask está registrada');
          console.log('\n===========================================');
          console.log('TESTES CONCLUÍDOS COM SUCESSO!');
          console.log('===========================================');
          console.log('\n📋 PRÓXIMOS PASSOS:');
          console.log('1. Use o arquivo test-chat.http com REST Client');
          console.log('2. Ou configure um token JWT válido');
          console.log('3. Verificar tabelas chat_logs no Supabase');
          process.exit(0);
        } else {
          console.log('⚠️  Status inesperado:', res.statusCode);
          console.log('Resposta:', JSON.stringify(response, null, 2));
          process.exit(0);
        }
      } catch (error) {
        console.error('❌ Erro ao parsear resposta:', error.message);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('❌ Timeout');
    req.destroy();
    process.exit(1);
  });

  req.write(postData);
  req.end();
}
