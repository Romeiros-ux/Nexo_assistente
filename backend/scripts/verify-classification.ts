/**
 * Script para verificar o status da classificação dos documentos
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('=== Verificação de Classificação dos Documentos ===\n');
  
  try {
    // 1. Ver distribuição por domínio
    console.log('📊 Distribuição por Domínio:\n');
    const { data: distribution, error: distError } = await supabase
      .from('documents')
      .select('domain, subdomain')
      .not('domain', 'is', null);
    
    if (distError) {
      console.error('Erro ao buscar distribuição:', distError);
      return;
    }
    
    const counts: { [key: string]: number } = {};
    distribution?.forEach((doc) => {
      const key = `${doc.domain} > ${doc.subdomain}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    
    Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([key, count]) => {
        console.log(`  ${key}: ${count} documentos`);
      });
    
    console.log(`\n  Total classificados: ${distribution?.length || 0}`);
    
    // 2. Ver documentos Excel específicos
    console.log('\n\n📋 Documentos Excel (tipo REPORT):\n');
    const { data: excelDocs, error: excelError } = await supabase
      .from('documents')
      .select('name, domain, subdomain, metadata_year, education_stage, keywords')
      .eq('document_type', 'REPORT')
      .order('subdomain', { ascending: true })
      .order('name', { ascending: true });
    
    if (excelError) {
      console.error('Erro ao buscar documentos Excel:', excelError);
      return;
    }
    
    if (!excelDocs || excelDocs.length === 0) {
      console.log('  Nenhum documento Excel encontrado.');
      return;
    }
    
    let currentSubdomain = '';
    excelDocs.forEach((doc) => {
      if (doc.subdomain !== currentSubdomain) {
        currentSubdomain = doc.subdomain;
        console.log(`\n  ${currentSubdomain || 'SEM CLASSIFICAÇÃO'}:`);
      }
      console.log(`    - ${doc.name}`);
      console.log(`      Ano: ${doc.metadata_year || 'N/A'} | Etapa: ${doc.education_stage || 'N/A'}`);
      if (doc.keywords && doc.keywords.length > 0) {
        console.log(`      Keywords: ${doc.keywords.slice(0, 5).join(', ')}${doc.keywords.length > 5 ? '...' : ''}`);
      }
    });
    
    // 3. Estatísticas por etapa educacional
    console.log('\n\n📚 Documentos por Etapa Educacional:\n');
    const stageStats = excelDocs.reduce((acc, doc) => {
      const stage = doc.education_stage || 'N/A';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    Object.entries(stageStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([stage, count]) => {
        console.log(`  ${stage}: ${count} documentos`);
      });
    
    // 4. Documentos sem classificação
    console.log('\n\n⚠️  Documentos sem classificação:\n');
    const { data: unclassified, error: unclError } = await supabase
      .from('documents')
      .select('name, document_type')
      .is('domain', null)
      .limit(10);
    
    if (unclError) {
      console.error('Erro ao buscar documentos não classificados:', unclError);
    } else if (unclassified && unclassified.length > 0) {
      unclassified.forEach((doc) => {
        console.log(`  - ${doc.name} (${doc.document_type})`);
      });
    } else {
      console.log('  ✅ Todos os documentos estão classificados!');
    }
    
  } catch (error) {
    console.error('Erro fatal:', error);
    process.exit(1);
  }
}

main();
