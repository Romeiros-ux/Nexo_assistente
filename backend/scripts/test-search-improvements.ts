/**
 * TESTE DAS MELHORIAS NO SISTEMA DE BUSCA
 * 
 * Valida:
 * 1. Classificação inteligente com documentType
 * 2. Re-ranking favorecendo REPORT > OTHER
 * 3. Diversificação de fontes
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface TestCase {
  query: string;
  expectedDocumentType: 'REPORT' | 'OTHER' | null;
  expectedFilters: {
    year?: number;
    educationStage?: string;
  };
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    query: 'Qual o IDEB de Saquarema em 2023?',
    expectedDocumentType: 'REPORT',
    expectedFilters: { year: 2023 },
    description: '✅ Pergunta específica com ano → deve buscar Excel (REPORT)'
  },
  {
    query: 'IDEB dos anos iniciais em 2023',
    expectedDocumentType: 'REPORT',
    expectedFilters: { year: 2023, educationStage: 'AI' },
    description: '✅ Pergunta com ano + etapa → deve buscar Excel (REPORT)'
  },
  {
    query: 'Quais escolas têm melhor IDEB?',
    expectedDocumentType: 'OTHER',
    expectedFilters: {},
    description: '✅ Pergunta geral sobre lista → deve buscar web (OTHER)'
  },
  {
    query: 'Como funciona o cálculo do IDEB?',
    expectedDocumentType: 'OTHER',
    expectedFilters: {},
    description: '✅ Pergunta conceitual → deve buscar web (OTHER)'
  },
  {
    query: 'Comparar IDEB anos iniciais e finais em 2023',
    expectedDocumentType: 'REPORT',
    expectedFilters: { year: 2023 },
    description: '✅ Comparação específica → deve buscar Excel (REPORT)'
  }
];

async function classifyQuery(query: string): Promise<any> {
  const prompt = `Analise a seguinte pergunta sobre educação em Saquarema-RJ e classifique-a:

PERGUNTA: "${query}"

INSTRUÇÕES:
1. Identifique o domínio principal (domain) e subdomínio (subdomain) mais relevantes
2. Extraia ano se mencionado (ex: "2023", "2024")
3. Extraia etapa educacional se mencionada:
   - AF: Anos Finais (6º ao 9º ano)
   - AI: Anos Iniciais (1º ao 5º ano)
   - EM: Ensino Médio
4. Determine palavras-chave importantes
5. Estime confiança (0-1) da classificação
6. IMPORTANTE - Determine o tipo de documento mais adequado:
   - "REPORT": Para perguntas ESPECÍFICAS com ano/etapa definidos, valores exatos, comparações detalhadas
   - "OTHER": Para perguntas GERAIS, visão panorâmica, listas de escolas, contexto geral
   - null: Quando ambos são igualmente relevantes

EXEMPLOS:
- "Qual o IDEB de 2023?" → filters: {year: 2023, documentType: "REPORT"}
- "Quais escolas têm melhor IDEB?" → filters: {documentType: "OTHER"}

RETORNE JSON:
{
  "domain": "INDICADORES_EDUCACIONAIS",
  "subdomain": "IDEB",
  "confidence": 0.95,
  "keywords": ["ideb"],
  "filters": {
    "year": 2023,
    "educationStage": "AI",
    "documentType": "REPORT"
  },
  "reasoning": "Breve explicação"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Você é um especialista em gestão educacional brasileira. Responda em JSON válido.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

async function testSearch(query: string, classification: any) {
  // Gerar embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 1536,
  });

  // Buscar com filtros
  const { data: results, error } = await supabase.rpc('match_chunks_by_domain', {
    query_embedding: embeddingResponse.data[0].embedding,
    match_threshold: 0.03,
    match_count: 8,
    filter_domain: classification.domain,
    filter_subdomain: classification.subdomain,
    filter_document_type: classification.filters?.documentType || null,
    filter_year: classification.filters?.year || null,
    filter_education_stage: classification.filters?.educationStage || null,
  });

  if (error) {
    console.error('❌ Erro na busca:', error);
    return null;
  }

  return results;
}

async function runTests() {
  console.log('🧪 TESTE DAS MELHORIAS NO SISTEMA DE BUSCA\n');
  console.log('=' .repeat(80));

  for (const testCase of TEST_CASES) {
    console.log(`\n📝 TESTE: ${testCase.description}`);
    console.log(`Query: "${testCase.query}"`);
    console.log('-'.repeat(80));

    try {
      // Etapa 1: Classificação
      const classification = await classifyQuery(testCase.query);
      console.log('\n1️⃣ CLASSIFICAÇÃO:');
      console.log(`   Domain: ${classification.domain}`);
      console.log(`   Subdomain: ${classification.subdomain}`);
      console.log(`   Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
      
      if (classification.filters) {
        console.log(`   Filters:`);
        if (classification.filters.year) {
          console.log(`     • year: ${classification.filters.year}`);
        }
        if (classification.filters.educationStage) {
          console.log(`     • educationStage: ${classification.filters.educationStage}`);
        }
        if (classification.filters.documentType) {
          console.log(`     • documentType: ${classification.filters.documentType}`);
        }
      }

      // Verificar se classificação está correta
      const documentTypeMatch = classification.filters?.documentType === testCase.expectedDocumentType;
      const yearMatch = !testCase.expectedFilters.year || classification.filters?.year === testCase.expectedFilters.year;
      const stageMatch = !testCase.expectedFilters.educationStage || classification.filters?.educationStage === testCase.expectedFilters.educationStage;

      if (documentTypeMatch && yearMatch && stageMatch) {
        console.log(`   ✅ Classificação CORRETA!`);
      } else {
        console.log(`   ⚠️  Classificação INESPERADA:`);
        console.log(`      Esperado documentType: ${testCase.expectedDocumentType}`);
        console.log(`      Recebido: ${classification.filters?.documentType || 'null'}`);
      }

      // Etapa 2: Busca
      const results = await testSearch(testCase.query, classification);
      
      if (!results || results.length === 0) {
        console.log('\n2️⃣ BUSCA: ❌ Nenhum resultado encontrado');
        continue;
      }

      console.log(`\n2️⃣ BUSCA: ${results.length} resultados encontrados`);
      
      // Análise de diversificação
      const typeCounts: { [key: string]: number } = {};
      results.forEach((r: any) => {
        const type = r.document_type || 'UNKNOWN';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      console.log(`\n   Distribuição por tipo:`);
      Object.entries(typeCounts).forEach(([type, count]) => {
        const percentage = ((count / results.length) * 100).toFixed(0);
        console.log(`     • ${type}: ${count} (${percentage}%)`);
      });

      // Mostrar top 3 resultados
      console.log(`\n   Top 3 resultados:`);
      results.slice(0, 3).forEach((r: any, idx: number) => {
        console.log(`     ${idx + 1}. [${r.document_type}] ${r.document_name || 'Sem nome'}`);
        console.log(`        Similarity: ${r.similarity.toFixed(3)} | Ano: ${r.metadata_year || 'N/A'} | Etapa: ${r.education_stage || 'N/A'}`);
      });

      // Verificar diversificação
      const maxTypeCount = Math.max(...Object.values(typeCounts));
      const maxTypePercentage = (maxTypeCount / results.length) * 100;
      
      if (maxTypePercentage > 70) {
        console.log(`\n   ⚠️  Pouca diversidade: ${maxTypePercentage.toFixed(0)}% dos resultados são do mesmo tipo`);
      } else {
        console.log(`\n   ✅ Boa diversidade de fontes`);
      }

    } catch (error) {
      console.error(`❌ Erro no teste:`, error);
    }

    console.log('\n' + '='.repeat(80));
  }

  console.log('\n✅ Testes concluídos!\n');
}

runTests().catch(console.error);
