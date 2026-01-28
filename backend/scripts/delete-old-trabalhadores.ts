import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('🗑️  Deletando documentos antigos...\n');

  // Deletar todos os documentos de trabalhadores (CASCADE vai deletar chunks e embeddings)
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('name', 'Cadastro de Trabalhadores do Município');

  if (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }

  console.log('✅ Documentos deletados com sucesso!');
  console.log('   Chunks e embeddings também foram removidos (CASCADE)');
}

main();
