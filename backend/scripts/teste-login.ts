import axios from 'axios';

async function testeLogin() {
  try {
    console.log('Testando login...');
    const response = await axios.post('http://127.0.0.1:3001/api/v1/auth/login', {
      email: 'admin@educacao.gov.br',
      password: 'Admin@123'
    });
    
    console.log('✅ Sucesso!');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Erro!');
    console.log('Status:', error.response?.status);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testeLogin();
