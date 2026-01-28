/**
 * Script para classificar documentos Excel com metadados de domínio
 * 
 * Este script:
 * 1. Identifica documentos Excel no banco de dados
 * 2. Classifica por tipo de indicador (IDEB, Taxa de Rendimento, etc.)
 * 3. Adiciona metadados: domain, subdomain, keywords, year, education_stage
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { KNOWLEDGE_DOMAINS } from '../src/config/knowledge-domains';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DocumentToClassify {
  id: string;
  name: string;
  document_type: string;
}

/**
 * Classifica documento por padrões no nome
 */
function classifyDocumentByPattern(doc: DocumentToClassify): {
  domain: string;
  subdomain: string;
  keywords: string[];
  year: number | null;
  education_stage: string | null;
} {
  const name = doc.name.toLowerCase();
  
  // Extrair ano (buscar por padrão -YYYY ou ano entre 2000-2030)
  const yearMatch = name.match(/-(\d{4})(?:-|\.)/);
  let year = yearMatch ? parseInt(yearMatch[1]) : null;
  
  // Se não encontrou com padrão específico, buscar anos válidos (2000-2030)
  if (!year) {
    const years = name.match(/\b(20[0-2]\d|2030)\b/g);
    year = years && years.length > 0 ? parseInt(years[years.length - 1]) : null;
  }
  
  // Extrair etapa de ensino
  let education_stage: string | null = null;
  if (name.includes('-ai')) education_stage = 'AI';
  else if (name.includes('-af')) education_stage = 'AF';
  else if (name.includes('-em')) education_stage = 'EM';
  
  // Classificar por tipo
  if (name.includes('ideb')) {
    return {
      domain: 'INDICADORES_EDUCACIONAIS',
      subdomain: 'IDEB',
      keywords: ['ideb', 'índice desenvolvimento educação básica', 'qualidade educação', 'saquarema'],
      year,
      education_stage,
    };
  }
  
  if (name.includes('taxa') && name.includes('rendimento')) {
    return {
      domain: 'INDICADORES_EDUCACIONAIS',
      subdomain: 'TAXA_RENDIMENTO',
      keywords: ['aprovação', 'reprovação', 'abandono', 'fluxo escolar', 'saquarema'],
      year,
      education_stage,
    };
  }
  
  if (name.includes('distorcao') || name.includes('distorção')) {
    return {
      domain: 'INDICADORES_EDUCACIONAIS',
      subdomain: 'DISTORCAO_IDADE_SERIE',
      keywords: ['distorção', 'idade-série', 'defasagem', 'saquarema'],
      year,
      education_stage,
    };
  }
  
  if (name.includes('saeb')) {
    return {
      domain: 'INDICADORES_EDUCACIONAIS',
      subdomain: 'SAEB',
      keywords: ['saeb', 'proficiência', 'aprendizado', 'matemática', 'português', 'saquarema'],
      year,
      education_stage,
    };
  }
  
  if (name.includes('permanencia') || name.includes('permanência')) {
    return {
      domain: 'INDICADORES_EDUCACIONAIS',
      subdomain: 'PERMANENCIA',
      keywords: ['permanência', 'retenção', 'continuidade escolar', 'saquarema'],
      year,
      education_stage,
    };
  }
  
  // Default para documentos não identificados
  return {
    domain: 'INDICADORES_EDUCACIONAIS',
    subdomain: 'OUTROS',
    keywords: ['indicador', 'educação', 'saquarema'],
    year,
    education_stage,
  };
}

/**
 * Atualiza documento no banco com metadados
 */
async function updateDocumentMetadata(
  docId: string,
  metadata: {
    domain: string;
    subdomain: string;
    keywords: string[];
    year: number | null;
    education_stage: string | null;
  }
) {
  const { error } = await supabase
    .from('documents')
    .update({
      domain: metadata.domain,
      subdomain: metadata.subdomain,
      keywords: metadata.keywords,
      metadata_year: metadata.year,
      education_stage: metadata.education_stage,
    })
    .eq('id', docId);
  
  if (error) {
    throw new Error(`Erro ao atualizar documento ${docId}: ${error.message}`);
  }
}

/**
 * Main
 */
async function main() {
  console.log('=== Classificação de Documentos Excel ===\n');
  
  try {
    // 1. Buscar documentos Excel (tipo REPORT)
    console.log('Buscando documentos Excel...');
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, name, document_type')
      .eq('document_type', 'REPORT')
      .or('name.ilike.%ideb%,name.ilike.%taxa%,name.ilike.%distorcao%,name.ilike.%saeb%,name.ilike.%permanencia%');
    
    if (fetchError) {
      throw new Error(`Erro ao buscar documentos: ${fetchError.message}`);
    }
    
    if (!documents || documents.length === 0) {
      console.log('Nenhum documento Excel encontrado.');
      return;
    }
    
    console.log(`Encontrados ${documents.length} documentos para classificar.\n`);
    
    // 2. Classificar e atualizar cada documento
    let classified = 0;
    let errors = 0;
    
    for (const doc of documents) {
      try {
        console.log(`Classificando: ${doc.name}`);
        
        // Classificar por padrões no nome
        const metadata = classifyDocumentByPattern(doc);
        
        console.log(`  → Domínio: ${metadata.domain} > ${metadata.subdomain}`);
        console.log(`  → Ano: ${metadata.year || 'N/A'}`);
        console.log(`  → Etapa: ${metadata.education_stage || 'N/A'}`);
        console.log(`  → Keywords: ${metadata.keywords.slice(0, 3).join(', ')}...`);
        
        // Atualizar no banco
        await updateDocumentMetadata(doc.id, metadata);
        classified++;
        
        console.log(`  ✓ Atualizado com sucesso\n`);
        
      } catch (error) {
        console.error(`  ✗ Erro ao classificar ${doc.name}:`, error);
        errors++;
      }
    }
    
    // 3. Resultado final
    console.log('\n=== Resultado ===');
    console.log(`✓ Classificados: ${classified}`);
    console.log(`✗ Erros: ${errors}`);
    console.log(`Total: ${documents.length}`);
    
    // 4. Verificar distribuição por domínio
    console.log('\n=== Distribuição por Domínio ===');
    const { data: distribution } = await supabase
      .from('documents')
      .select('domain, subdomain')
      .eq('document_type', 'REPORT')
      .not('domain', 'is', null);
    
    if (distribution) {
      const counts: { [key: string]: number } = {};
      distribution.forEach((doc) => {
        const key = `${doc.domain} > ${doc.subdomain}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      
      Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([key, count]) => {
          console.log(`${key}: ${count} documentos`);
        });
    }
    
  } catch (error) {
    console.error('Erro fatal:', error);
    process.exit(1);
  }
}

main();
