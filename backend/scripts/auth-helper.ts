/**
 * Helper para autenticação automática
 */

import axios from 'axios';

const API_URL = 'http://127.0.0.1:3001/api/v1';

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}

/**
 * Faz login e retorna o token
 */
export async function obterToken(email: string, password: string): Promise<AuthResult> {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });

    if (response.status === 200 && response.data.data?.token) {
      return {
        success: true,
        token: response.data.data.token,
        user: response.data.data.user
      };
    }

    return {
      success: false,
      error: 'Token não encontrado na resposta'
    };

  } catch (error: any) {
    console.log(`   ❌ Falha: ${error.response?.data?.message || error.message}`);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * Faz login com credenciais do admin padrão
 */
export async function obterTokenAdmin(): Promise<AuthResult> {
  // Tentar credenciais padrão
  const credenciais = [
    { email: 'admin@educacao.gov.br', password: 'Admin@123' },
    { email: 'admin@saquarema.rj.gov.br', password: 'admin123' },
    { email: 'admin@exemplo.com', password: 'admin123' },
    { email: 'ti@saquarema.rj.gov.br', password: 'admin123' }
  ];

  for (const cred of credenciais) {
    console.log(`🔐 Tentando login: ${cred.email}...`);
    const result = await obterToken(cred.email, cred.password);
    
    if (result.success) {
      console.log(`✅ Login realizado com sucesso!`);
      console.log(`👤 Usuário: ${result.user?.name || 'Admin'}\n`);
      return result;
    }
  }

  return {
    success: false,
    error: 'Nenhuma credencial válida encontrada. Configure as credenciais manualmente.'
  };
}
