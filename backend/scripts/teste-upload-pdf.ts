import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { obterTokenAdmin } from './auth-helper';

const API_URL = 'http://127.0.0.1:3001/api/v1';
const DOWNLOADS_PATH = path.join(__dirname, 'downloads');

async function testeUpload() {
  // 1. Login
  console.log('🔐 Fazendo login...');
  const auth = await obterTokenAdmin();
  
  if (!auth.success || !auth.token) {
    console.log(`❌ Erro na autenticação: ${auth.error}`);
    return;
  }
  
  console.log('✅ Login OK\n');
  
  // 2. Preparar FormData
  const pdfPath = path.join(DOWNLOADS_PATH, 'D.O.S._1784-7_assinado.pdf');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(pdfPath));
  formData.append('name', 'Teste Diário Oficial');
  formData.append('description', 'Teste de upload');
  formData.append('tags', JSON.stringify(['teste']));
  formData.append('domain', 'DIARIO_OFICIAL');
  formData.append('subdomain', 'TEXTOS_COMPLETOS');
  formData.append('document_type', 'OTHER');
  
  // 3. Upload
  try {
    console.log('📤 Enviando arquivo...');
    const response = await axios.post(`${API_URL}/documents/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${auth.token}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log('✅ Sucesso!');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error: any) {
    console.log('❌ Erro!');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    console.log('Error:', error.response?.data?.error);
    console.log('Full:', JSON.stringify(error.response?.data, null, 2));
  }
}

testeUpload();
