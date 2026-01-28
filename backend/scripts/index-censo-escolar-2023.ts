/**
 * INDEXAR DADOS DO CENSO ESCOLAR - Matrículas por Etapa
 * 
 * Fonte: http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/censo-escolar
 * 
 * Este script cria um documento estruturado com dados de matrículas por etapa
 * baseado nas informações públicas do QEdu/INEP.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Dados reais do censo escolar 2023 Saquarema (conforme imagem)
const censoDados2023 = {
  municipio: 'Saquarema-RJ',
  codigoIbge: '3305505',
  ano: 2023,
  fonte: 'INEP - Censo Escolar',
  url: 'http://cdn.novo.qedu.org.br/municipio/3305505-saquarema/censo-escolar',
  professores: {
    ensinoMedio: 210,
  },
  matriculas: {
    creche: 2798,
    preEscola: 2517,
    anosIniciais: {
      total: 7045,
      primeiroAno: 1428,
      segundoAno: 1398,
      terceiroAno: 1425,
      quartoAno: 1389,
      quintoAno: 1405,
    },
    anosFinais: {
      total: 5124,
      sextoAno: 1494,
      setimoAno: 1387,
      // Demais anos não visíveis na imagem
    },
    // Ensino Médio - não totalmente visível na imagem fornecida
  },
};

// Gerar documento estruturado
function generateCensoDocument(): string {
  const content: string[] = [];

  content.push('═══════════════════════════════════════════════════════════');
  content.push('CENSO ESCOLAR 2023 - MATRÍCULAS POR ETAPA');
  content.push(`MUNICÍPIO: ${censoDados2023.municipio} (Código IBGE: ${censoDados2023.codigoIbge})`);
  content.push(`ANO DE REFERÊNCIA: ${censoDados2023.ano}`);
  content.push(`FONTE: ${censoDados2023.fonte}`);
  content.push('═══════════════════════════════════════════════════════════');
  content.push('');

  content.push('━━━ RESUMO GERAL DE MATRÍCULAS ━━━\n');
  
  content.push('【 EDUCAÇÃO INFANTIL 】');
  content.push(`Município: ${censoDados2023.municipio}`);
  content.push(`Ano: ${censoDados2023.ano}`);
  content.push(`  • Creche: ${censoDados2023.matriculas.creche.toLocaleString('pt-BR')} matrículas`);
  content.push(`  • Pré-escola: ${censoDados2023.matriculas.preEscola.toLocaleString('pt-BR')} matrículas`);
  content.push(`  • Total Educação Infantil: ${(censoDados2023.matriculas.creche + censoDados2023.matriculas.preEscola).toLocaleString('pt-BR')} matrículas`);
  content.push('');

  content.push('【 ENSINO FUNDAMENTAL - ANOS INICIAIS 】');
  content.push(`Município: ${censoDados2023.municipio}`);
  content.push(`Ano: ${censoDados2023.ano}`);
  content.push(`Etapa: Anos Iniciais (1º ao 5º ano)`);
  content.push(`  • Total Anos Iniciais: ${censoDados2023.matriculas.anosIniciais.total.toLocaleString('pt-BR')} matrículas`);
  content.push(`  • 1º ano: ${censoDados2023.matriculas.anosIniciais.primeiroAno.toLocaleString('pt-BR')} matrículas`);
  content.push(`  • 2º ano: ${censoDados2023.matriculas.anosIniciais.segundoAno.toLocaleString('pt-BR')} matrículas`);
  content.push(`  • 3º ano: ${censoDados2023.matriculas.anosIniciais.terceiroAno.toLocaleString('pt-BR')} matrículas`);
  content.push(`  • 4º ano: ${censoDados2023.matriculas.anosIniciais.quartoAno.toLocaleString('pt-BR')} matrículas`);
  content.push(`  • 5º ano: ${censoDados2023.matriculas.anosIniciais.quintoAno.toLocaleString('pt-BR')} matrículas`);
  content.push('');

  content.push('【 ENSINO FUNDAMENTAL - ANOS FINAIS 】');
  content.push(`Município: ${censoDados2023.municipio}`);
  content.push(`Ano: ${censoDados2023.ano}`);
  content.push(`Etapa: Anos Finais (6º ao 9º ano)`);
  content.push(`  • Total Anos Finais: ${censoDados2023.matriculas.anosFinais.total.toLocaleString('pt-BR')} matrículas`);
  content.push(`  • 6º ano: ${censoDados2023.matriculas.anosFinais.sextoAno.toLocaleString('pt-BR')} matrículas`);
  content.push(`  • 7º ano: ${censoDados2023.matriculas.anosFinais.setimoAno.toLocaleString('pt-BR')} matrículas`);
  content.push('');

  content.push('━━━ DADOS COMPLEMENTARES ━━━\n');
  content.push(`Professores no Ensino Médio: ${censoDados2023.professores.ensinoMedio} professores`);
  content.push('');

  content.push('━━━ ANÁLISE COMPARATIVA ━━━\n');
  const totalEF = censoDados2023.matriculas.anosIniciais.total + censoDados2023.matriculas.anosFinais.total;
  const totalGeral = censoDados2023.matriculas.creche + censoDados2023.matriculas.preEscola + totalEF;
  
  content.push('【 DISTRIBUIÇÃO PERCENTUAL 】');
  content.push(`  • Creche: ${((censoDados2023.matriculas.creche / totalGeral) * 100).toFixed(1)}% do total`);
  content.push(`  • Pré-escola: ${((censoDados2023.matriculas.preEscola / totalGeral) * 100).toFixed(1)}% do total`);
  content.push(`  • Anos Iniciais: ${((censoDados2023.matriculas.anosIniciais.total / totalGeral) * 100).toFixed(1)}% do total`);
  content.push(`  • Anos Finais: ${((censoDados2023.matriculas.anosFinais.total / totalGeral) * 100).toFixed(1)}% do total`);
  content.push(`  • Total contabilizado: ${totalGeral.toLocaleString('pt-BR')} matrículas`);
  content.push('');

  content.push('━━━ METADADOS ━━━\n');
  content.push(`Fonte dos dados: ${censoDados2023.fonte}`);
  content.push(`URL de referência: ${censoDados2023.url}`);
  content.push(`Data de indexação: ${new Date().toISOString().split('T')[0]}`);

  return content.join('\n');
}

// Criar chunks
function createChunks(text: string): string[] {
  const chunks: string[] = [];
  const maxChunkSize = 1800;
  
  const sections = text.split('━━━');
  
  const header = `╔═══════════════════════════════════════════════════════╗
║ CENSO ESCOLAR 2023 - Matrículas por Etapa
║ Município: Saquarema-RJ (IBGE: 3305505)
║ Fonte: INEP/QEdu
╚═══════════════════════════════════════════════════════╝

`;

  let currentChunk = header;
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const sectionText = '━━━' + section;
    
    if ((currentChunk + sectionText).length > maxChunkSize) {
      if (currentChunk.length > header.length + 10) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = header + sectionText;
    } else {
      currentChunk += sectionText;
    }
  }
  
  if (currentChunk.length > header.length + 10) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 100);
}

// Gerar embedding
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

// Deletar documento existente
async function deleteExistingDocument(fileName: string): Promise<void> {
  const { data: docs } = await supabase
    .from('documents')
    .select('id')
    .eq('name', fileName);

  if (docs && docs.length > 0) {
    for (const doc of docs) {
      const { data: versions } = await supabase
        .from('document_versions')
        .select('id')
        .eq('document_id', doc.id);

      if (versions) {
        for (const version of versions) {
          const { data: chunks } = await supabase
            .from('document_chunks')
            .select('id')
            .eq('document_version_id', version.id);

          if (chunks) {
            for (const chunk of chunks) {
              await supabase
                .from('document_embeddings')
                .delete()
                .eq('document_chunk_id', chunk.id);
            }
          }

          await supabase
            .from('document_chunks')
            .delete()
            .eq('document_version_id', version.id);
        }

        await supabase
          .from('document_versions')
          .delete()
          .eq('document_id', doc.id);
      }

      await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);
    }
    log(`🗑️  Documento existente deletado: ${fileName}`, 'yellow');
  }
}

// Main
async function main() {
  log('\n🚀 INDEXANDO DADOS DO CENSO ESCOLAR 2023\n', 'cyan');

  const fileName = 'censo_escolar_saquarema_2023.txt';

  try {
    // 1. Deletar documento existente se houver
    await deleteExistingDocument(fileName);

    // 2. Gerar documento estruturado
    log('📝 Gerando documento estruturado...', 'yellow');
    const documentText = generateCensoDocument();
    log(`   Texto gerado: ${documentText.length.toLocaleString()} caracteres`, 'blue');

    // 3. Criar chunks
    const chunks = createChunks(documentText);
    log(`   📦 Chunks criados: ${chunks.length}`, 'blue');

    // 4. Criar documento no banco
    log('💾 Salvando documento no banco...', 'yellow');
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        name: fileName,
        document_type: 'REPORT',
        file_url: censoDados2023.url,
        status: 'ACTIVE',
        domain: 'INDICADORES_EDUCACIONAIS',
        subdomain: 'MATRICULAS',
        metadata_year: 2023,
        keywords: ['censo escolar', 'matrículas', 'educação infantil', 'ensino fundamental', 'anos iniciais', 'anos finais'],
      })
      .select()
      .single();

    if (docError) throw docError;
    log(`   ✅ Documento criado: ${document.id}`, 'green');

    // 5. Criar versão
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: document.id,
        status: 'PROCESSING',
        extracted_text_length: documentText.length,
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // 6. Processar chunks com embeddings
    log('🔄 Indexando chunks com embeddings...', 'yellow');
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];

      // Criar chunk
      const { data: chunk, error: chunkError } = await supabase
        .from('document_chunks')
        .insert({
          document_version_id: version.id,
          content: chunkContent,
          chunk_index: i,
          metadata: {
            tipo: 'censo_escolar',
            municipio: 'Saquarema-RJ',
            ano: 2023,
            fonte: 'INEP',
          },
        })
        .select()
        .single();

      if (chunkError) throw chunkError;

      // Gerar embedding
      const embedding = await generateEmbedding(chunkContent);

      // Salvar embedding
      const { error: embError } = await supabase
        .from('document_embeddings')
        .insert({
          document_chunk_id: chunk.id,
          embedding,
          model: 'text-embedding-3-large',
          tokens_used: Math.ceil(chunkContent.length / 4),
        });

      if (embError) throw embError;

      log(`   ✅ Chunk ${i + 1}/${chunks.length} indexado`, 'green');
    }

    // 7. Atualizar status da versão
    await supabase
      .from('document_versions')
      .update({
        status: 'COMPLETED',
        indexed: true,
      })
      .eq('id', version.id);

    log('\n✅ DOCUMENTO DO CENSO ESCOLAR INDEXADO COM SUCESSO!', 'green');
    log('\n💡 Agora você pode perguntar: "Quantas matrículas por etapa teve em 2023?"', 'cyan');
    
  } catch (error: any) {
    log(`\n❌ Erro: ${error.message}`, 'red');
    console.error(error);
  }
}

main().catch(console.error);
