/**
 * Script para monitorar o status dos uploads
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function monitorarStatus() {
  try {
    console.log('📊 STATUS DOS DOCUMENTOS - DIÁRIO OFICIAL');
    console.log('═'.repeat(60));
    console.log('');

    // Contar por status
    const { data: byStatus, error: statusError } = await supabase
      .from('documents')
      .select('status')
      .eq('domain', 'DIARIO_OFICIAL');

    if (statusError) {
      console.error('❌ Erro:', statusError);
      return;
    }

    const statusCount = {
      PENDING: 0,
      ACTIVE: 0,
      DRAFT: 0,
      ARCHIVED: 0
    };

    byStatus?.forEach(doc => {
      if (doc.status in statusCount) {
        statusCount[doc.status as keyof typeof statusCount]++;
      }
    });

    console.log('📋 Por Status:');
    console.log(`   ⏳ PENDING: ${statusCount.PENDING}`);
    console.log(`   ✅ ACTIVE: ${statusCount.ACTIVE}`);
    console.log(`   📝 DRAFT: ${statusCount.DRAFT}`);
    console.log(`   📦 ARCHIVED: ${statusCount.ARCHIVED}`);
    console.log('');

    // Contar por subdomínio
    const { data: bySubdomain, error: subError } = await supabase
      .from('documents')
      .select('subdomain')
      .eq('domain', 'DIARIO_OFICIAL');

    if (subError) {
      console.error('❌ Erro:', subError);
      return;
    }

    const subdomainCount: Record<string, number> = {};
    bySubdomain?.forEach(doc => {
      const sub = doc.subdomain || 'SEM_SUBDOMINIO';
      subdomainCount[sub] = (subdomainCount[sub] || 0) + 1;
    });

    console.log('📁 Por Subdomínio:');
    Object.entries(subdomainCount).forEach(([sub, count]) => {
      console.log(`   ${sub}: ${count}`);
    });
    console.log('');

    // Total
    const total = byStatus?.length || 0;
    console.log('═'.repeat(60));
    console.log(`📊 TOTAL: ${total} documentos`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

monitorarStatus();
