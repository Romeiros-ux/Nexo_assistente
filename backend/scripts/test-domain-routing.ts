/**
 * Script de teste para validar o roteamento por domínio
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestQuery {
  query: string;
  expectedDomain: string;
  expectedSubdomain: string;
}

const testQueries: TestQuery[] = [
  {
    query: "Qual é a taxa de aprovação em Saquarema em 2023?",
    expectedDomain: "INDICADORES_EDUCACIONAIS",
    expectedSubdomain: "TAXA_RENDIMENTO"
  },
  {
    query: "Qual é o IDEB de Saquarema em 2023?",
    expectedDomain: "INDICADORES_EDUCACIONAIS",
    expectedSubdomain: "IDEB"
  },
  {
    query: "Quais são as leis sobre educação em Saquarema?",
    expectedDomain: "LEGISLACAO",
    expectedSubdomain: "LEIS_ORGANICAS"
  }
];

async function classifyQuery(query: string) {
  console.log(`\n🔍 Testando: "${query}"\n`);
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em gestão educacional brasileira.
Analise a pergunta e classifique em um domínio de conhecimento.

Domínios disponíveis:

1. INDICADORES_EDUCACIONAIS
   - IDEB: Índice de Desenvolvimento da Educação Básica
   - TAXA_RENDIMENTO: Taxa de Aprovação, Reprovação, Abandono
   - DISTORCAO_IDADE_SERIE: Distorção Idade-Série
   - SAEB: Avaliação da Educação Básica
   - PERMANENCIA: Taxa de Permanência

2. LEGISLACAO
   - LEIS_ORGANICAS: Leis orgânicas municipais
   - LEIS_COMPLEMENTARES: Leis complementares
   - DECRETOS: Decretos municipais
   - PLANOS: Planos educacionais

3. GESTAO_RECURSOS
   - ORCAMENTO: Orçamento e finanças
   - FUNDEB: Fundo de Desenvolvimento da Educação
   - CONTRATOS: Contratos e licitações

Retorne a classificação em JSON com: domain, subdomain, confidence (0-1), reasoning`
        },
        {
          role: 'user',
          content: `Classifique esta pergunta: "${query}"`
        }
      ]
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Não foi possível extrair JSON da resposta');
    }

    const classification = JSON.parse(jsonMatch[0]);
    
    console.log(`✅ Classificação:`);
    console.log(`   Domain: ${classification.domain}`);
    console.log(`   Subdomain: ${classification.subdomain}`);
    console.log(`   Confiança: ${(classification.confidence * 100).toFixed(0)}%`);
    console.log(`   Raciocínio: ${classification.reasoning}`);
    
    return classification;
    
  } catch (error) {
    console.error(`❌ Erro na classificação:`, error);
    return null;
  }
}

async function searchDocuments(domain: string, subdomain: string) {
  console.log(`\n📚 Buscando documentos em: ${domain} > ${subdomain}`);
  
  const { data, error } = await supabase
    .from('documents')
    .select('name, document_type, metadata_year, education_stage')
    .eq('domain', domain)
    .eq('subdomain', subdomain)
    .order('name');
  
  if (error) {
    console.error('❌ Erro ao buscar documentos:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️  Nenhum documento encontrado neste domínio.');
    return;
  }
  
  console.log(`\n   Encontrados ${data.length} documentos:`);
  data.forEach((doc) => {
    console.log(`   - ${doc.name}`);
    console.log(`     Tipo: ${doc.document_type} | Ano: ${doc.metadata_year || 'N/A'} | Etapa: ${doc.education_stage || 'N/A'}`);
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     TESTE DE ROTEAMENTO POR DOMÍNIO - SISTEMA IA      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  for (const test of testQueries) {
    console.log('\n' + '─'.repeat(60));
    
    const classification = await classifyQuery(test.query);
    
    if (classification) {
      // Verificar se a classificação está correta
      const isCorrectDomain = classification.domain === test.expectedDomain;
      const isCorrectSubdomain = classification.subdomain === test.expectedSubdomain;
      
      console.log(`\n🎯 Validação:`);
      console.log(`   Domain esperado: ${test.expectedDomain} ${isCorrectDomain ? '✅' : '❌'}`);
      console.log(`   Subdomain esperado: ${test.expectedSubdomain} ${isCorrectSubdomain ? '✅' : '❌'}`);
      
      // Buscar documentos neste domínio
      await searchDocuments(classification.domain, classification.subdomain);
    }
    
    // Aguardar 2 segundos entre queries para não bater rate limit
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ TESTES CONCLUÍDOS!');
  console.log('═'.repeat(60));
}

main();
