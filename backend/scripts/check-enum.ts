import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkEnum() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'document_type'
      ORDER BY e.enumsortorder
    `
  });
  
  if (error) {
    console.log('Erro:', error);
  } else {
    console.log('Valores do enum document_type:');
    console.log(data);
  }
}

checkEnum();
