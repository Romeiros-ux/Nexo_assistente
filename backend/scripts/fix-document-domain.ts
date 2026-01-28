import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('🔧 Corrigindo domínio do documento...\n');

  // Atualizar o documento mais recente
  const { error } = await supabase
    .from('documents')
    .update({
      domain: 'RECURSOS_HUMANOS',
      subdomain: 'SERVIDORES',
    })
    .eq('name', 'Cadastro de Trabalhadores do Município');

  if (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }

  console.log('✅ Documento atualizado com sucesso!');
  console.log('   Domain: RECURSOS_HUMANOS');
  console.log('   Subdomain: SERVIDORES');
}

main();
