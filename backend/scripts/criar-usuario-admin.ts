/**
 * Script para criar usuário admin para testes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function criarAdmin() {
  try {
    const email = 'admin@educacao.gov.br';
    const senha = 'Admin@123';
    const nome = 'Administrador';

    console.log('🔍 Verificando se usuário já existe...');
    
    const { data: existente } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existente) {
      console.log('✅ Usuário já existe:', existente.email);
      console.log('');
      console.log('📋 Credenciais:');
      console.log(`   Email: ${email}`);
      console.log(`   Senha: ${senha}`);
      return;
    }

    console.log('🔐 Criando hash da senha...');
    const passwordHash = await bcrypt.hash(senha, 10);

    console.log('👤 Criando usuário admin...');
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        name: nome,
        password: passwordHash,
        role: 'TI',
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro:', error);
      return;
    }

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('');
    console.log('📋 Credenciais:');
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${senha}`);
    console.log('');
    console.log('🌐 Acesse: http://localhost:5173/login');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

criarAdmin();
