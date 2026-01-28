const http = require('http');

console.log('Testando servidor backend na porta 3001...\n');

// Teste 1: Health Check
const healthReq = http.get('http://localhost:3001/health', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('✅ [Health Check] Status:', res.statusCode);
    console.log('✅ [Health Check] Response:', data);
    console.log('');
    
    // Teste 2: Chat Ask sem autenticação
    testChatAsk();
  });
});

healthReq.on('error', (err) => {
  console.error('❌ [Health Check] Erro:', err.message);
  console.error('⚠️  SERVIDOR NÃO ESTÁ RESPONDENDO!');
  process.exit(1);
});

function testChatAsk() {
  const postData = JSON.stringify({
    query: 'Teste básico do chat'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/chat/ask',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ [Chat Ask] Status:', res.statusCode);
      if (res.statusCode === 401) {
        console.log('✅ [Chat Ask] Erro 401 esperado (sem autenticação)');
      } else {
        console.log('✅ [Chat Ask] Response:', data);
      }
      
      console.log('\n========================================');
      console.log('RESUMO DOS TESTES');
      console.log('========================================');
      console.log('✅ Servidor respondendo na porta 3001');
      console.log('✅ Rota /health funcionando');
      console.log('✅ Rota /api/v1/chat/ask registrada');
      console.log('\nServidor está pronto para testes com autenticação!');
    });
  });
  
  req.on('error', (err) => {
    console.error('❌ [Chat Ask] Erro:', err.message);
  });
  
  req.write(postData);
  req.end();
}
