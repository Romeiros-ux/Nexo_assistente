/**
 * FASE 3 - Prompt Mestre Institucional
 * Versão: 1.0
 * Data: Janeiro 2026
 * 
 * Este é o prompt fundamental que define o comportamento do Assistente
 * Institucional. Todas as respostas DEVEM seguir estas regras.
 * 
 * NUNCA modifique este arquivo sem:
 * 1. Incrementar a versão
 * 2. Documentar as mudanças
 * 3. Testar com múltiplos perfis
 * 4. Validar auditoria
 */

// ===================================
// VERSÃO E CONTROLE
// ===================================

export const PROMPT_VERSION = '1.0';
export const PROMPT_LAST_UPDATE = '2026-01-10';
export const PROMPT_LANGUAGE = 'pt-BR';

// ===================================
// CONFIGURAÇÕES DO MODELO
// ===================================

export const MODEL_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.3,        // Baixa = respostas mais determinísticas e conservadoras
  max_tokens: 800,         // Limite para respostas concisas
  top_p: 0.9,              // Amostragem mais focada
  frequency_penalty: 0.2,  // Reduz repetições
  presence_penalty: 0.1,   // Incentiva diversidade moderada
} as const;

// ===================================
// PROMPT DO SISTEMA (IDENTIDADE)
// ===================================

export const SYSTEM_PROMPT = `Você é o Assistente Institucional Inteligente, um sistema oficial desenvolvido para apoiar a gestão educacional municipal.

## IDENTIDADE E PROPÓSITO

Você é especializado em:
- Normas e regimentos educacionais
- Documentos administrativos municipais
- Calendários e procedimentos escolares
- Políticas públicas de educação

Seu papel é fornecer informações PRECISAS, AUDITÁVEIS e baseadas EXCLUSIVAMENTE em documentos oficiais.

## REGRAS ABSOLUTAS (NUNCA VIOLE)

### 🚫 PROIBIÇÕES ESTRITAS:

1. **CONHECIMENTO EXTERNO PROIBIDO**
   - NUNCA use conhecimento geral ou informações da internet
   - NUNCA complete informações com "suposições razoáveis"
   - NUNCA faça inferências além do que está escrito nos documentos
   - Se não está nos chunks fornecidos, você NÃO SABE

2. **RESPOSTAS SEM FONTE SÃO INVÁLIDAS**
   - Toda informação DEVE ter origem em um chunk fornecido
   - Se nenhum chunk responde, diga: "Não encontrei informações sobre isso nos documentos disponíveis"
   - NUNCA invente ou aproxime respostas

3. **GOVERNANÇA É OBRIGATÓRIA**
   - Os documentos fornecidos JÁ foram filtrados por perfil do usuário
   - NUNCA mencione documentos de outras unidades
   - NUNCA sugira que há mais informações restritas

### ✅ COMPORTAMENTOS OBRIGATÓRIOS:

1. **CITAÇÃO DE FONTES**
   - Toda resposta DEVE citar explicitamente os documentos usados
   - Formato: "[Nome do Documento, Tipo]"
   - Exemplo: "[Regimento Escolar 2026, Normativo]"

2. **LINGUAGEM INSTITUCIONAL**
   - Tom formal, claro e objetivo
   - Sem gírias, sem coloquialismos
   - Português correto e técnico quando apropriado

3. **TRANSPARÊNCIA**
   - Se houver ambiguidade, explicite
   - Se houver múltiplas interpretações, mencione todas
   - Se a informação for parcial, diga

4. **CONCISÃO COM COMPLETUDE**
   - Respostas diretas e objetivas
   - Máximo 3-4 parágrafos
   - Inclua detalhes relevantes, omita o supérfluo

## ESTRUTURA DA RESPOSTA

### Formato padrão:

1. **Resposta direta:** Primeiro parágrafo responde objetivamente
2. **Contextualização:** Se necessário, adicione contexto relevante
3. **Citações:** Sempre ao final, listadas claramente

### Exemplo de resposta ideal:

"A matrícula escolar deve ser realizada entre 15 e 30 de janeiro de cada ano, conforme estabelecido no cronograma oficial. Os documentos necessários incluem certidão de nascimento, comprovante de residência e cartão de vacinação atualizado.

Casos especiais (transferências ou matrículas fora do prazo) devem ser analisados individualmente pela direção da unidade escolar.

**Fontes consultadas:**
- [Calendário Letivo 2026, Normativo]
- [Manual de Matrícula, Procedimento]"

## TRATAMENTO DE CASOS ESPECIAIS

### Quando NÃO há informação:
"Não encontrei informações sobre [tema] nos documentos institucionais disponíveis. Para esclarecimentos, recomendo consultar diretamente a Secretaria de Educação ou o setor responsável."

### Quando há informação parcial:
"Com base nos documentos disponíveis, posso confirmar que [informação encontrada]. No entanto, não há detalhes sobre [aspecto não encontrado] nos documentos consultados."

### Quando há conflito entre documentos:
"Identifiquei informações divergentes: [Documento A] estabelece [X], enquanto [Documento B] indica [Y]. Recomendo verificar qual documento está mais atualizado ou consultar a gestão responsável."

## CLASSIFICAÇÃO DE URGÊNCIA (OPCIONAL)

Se detectar situações críticas, adicione ao final:
"⚠️ Nota: Esta situação pode requerer atenção prioritária."

Situações críticas incluem:
- Prazos vencidos ou próximos
- Não conformidades normativas
- Riscos identificados

## AUDITORIA E COMPLIANCE

Lembre-se: TODAS as suas respostas são registradas e auditáveis.
- user_id do solicitante é registrado
- Documentos citados são armazenados
- Tokens e custos são monitorados

Nunca comprometa a integridade institucional.

---

**Versão:** ${PROMPT_VERSION}  
**Idioma:** ${PROMPT_LANGUAGE}  
**Última atualização:** ${PROMPT_LAST_UPDATE}`;

// ===================================
// TEMPLATE DE PROMPT DINÂMICO
// ===================================

export interface ChatContext {
  user_profile: 'DIRETOR' | 'COMISSAO' | 'SECRETARIA' | 'TI';
  unit_name?: string;
  query: string;
  chunks: Array<{
    content: string;
    source: {
      document_name: string;
      document_type: string;
    };
    similarity: number;
    metadata?: {
      year?: number;
      education_stage?: string;
      domain?: string;
      subdomain?: string;
    };
  }>;
  conversationHistory?: Array<{  // NOVO: Histórico da conversa
    role: 'user' | 'assistant';
    content: string;
  }>;
}

/**
 * Monta o prompt completo para o LLM
 * Combina: System Prompt + Contexto + Pergunta do usuário
 */
export function buildChatPrompt(context: ChatContext): string {
  const { user_profile, unit_name, query, chunks, conversationHistory } = context;

  // Contexto de governança
  let governanceContext = '';
  if (user_profile === 'DIRETOR' && unit_name) {
    governanceContext = `\n**Contexto do usuário:** Diretor(a) da ${unit_name}`;
  } else if (user_profile === 'COMISSAO') {
    governanceContext = `\n**Contexto do usuário:** Membro da Comissão de Acompanhamento (acesso a todas as unidades)`;
  } else if (user_profile === 'SECRETARIA') {
    governanceContext = `\n**Contexto do usuário:** Secretaria de Educação (acesso total)`;
  } else if (user_profile === 'TI') {
    governanceContext = `\n**Contexto do usuário:** Administrador TI (acesso técnico total)`;
  }

  // Construir contexto dos chunks
  let chunksContext = '';
  
  if (chunks.length === 0) {
    chunksContext = 'NENHUM documento relevante foi encontrado. Você DEVE responder que não há informações disponíveis.';
  } else {
    chunksContext = 'DOCUMENTOS ENCONTRADOS (use APENAS estas informações):\n\n';
    
    // Detectar se são dados tabulares (CSV/Excel)
    const hasTabularData = chunks.some(chunk => 
      chunk.source.document_type.includes('CSV') || 
      chunk.source.document_type.includes('EXCEL') ||
      chunk.content.includes('\t') || 
      (chunk.content.match(/\n/g) || []).length > 3
    );
    
    if (hasTabularData && chunks.length > 100) {
      chunksContext += '⚠️ ATENÇÃO: DADOS TABULARES PARA CONTAGEM/AGREGAÇÃO\n';
      chunksContext += `📊 Total de registros fornecidos: ${chunks.length} chunks\n`;
      chunksContext += '🎯 INSTRUÇÕES CRÍTICAS:\n';
      chunksContext += '   • Conte CADA LINHA ÚNICA (não conte headers repetidos)\n';
      chunksContext += '   • Use nome completo como identificador único\n';
      chunksContext += '   • Se estiver contando profissionais/funcionários, conte apenas registros distintos\n';
      chunksContext += '   • ATENÇÃO: Esta é uma amostra dos dados mais relevantes\n';
      chunksContext += '   • Se a contagem parecer incompleta, informe que é baseada nos registros mais relevantes encontrados\n';
      chunksContext += '   • Para relatórios oficiais, reporte o número EXATO que você contou\n\n';
    }
    
    chunks.forEach((chunk, index) => {
      chunksContext += `--- DOCUMENTO ${index + 1} ---\n`;
      chunksContext += `Fonte: ${chunk.source.document_name} (${chunk.source.document_type})\n`;
      
      // Metadata enriquecida
      if (chunk.metadata?.year) {
        chunksContext += `📅 Ano: ${chunk.metadata.year}\n`;
      }
      if (chunk.metadata?.education_stage) {
        const stageLabels: Record<string, string> = {
          'AI': 'Anos Iniciais (1º-5º ano)',
          'AF': 'Anos Finais (6º-9º ano)',
          'EM': 'Ensino Médio',
          'EI': 'Educação Infantil'
        };
        const stageLabel = stageLabels[chunk.metadata.education_stage] || chunk.metadata.education_stage;
        chunksContext += `🎓 Etapa: ${stageLabel}\n`;
      }
      if (chunk.metadata?.subdomain) {
        chunksContext += `📊 Categoria: ${chunk.metadata.subdomain}\n`;
      }
      
      chunksContext += `🎯 Relevância: ${(chunk.similarity * 100).toFixed(1)}%\n`;
      chunksContext += `\nConteúdo:\n${chunk.content}\n\n`;
    });
  }

  // NOVO: Contexto de histórico da conversa
  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    historyContext = '\n\n--- HISTÓRICO DA CONVERSA ---\n';
    historyContext += 'Mensagens anteriores nesta sessão:\n\n';
    
    conversationHistory.forEach((msg) => {
      const speaker = msg.role === 'user' ? '👤 Usuário' : '🤖 Assistente';
      historyContext += `${speaker}: ${msg.content}\n\n`;
    });
    
    historyContext += '---\n';
    historyContext += '⚠️ Use este histórico para entender referências como "e dos anos finais?", "e em 2024?", "e a outra escola?"\n';
  }

  // Prompt completo
  return `${governanceContext}
${historyContext}
${chunksContext}

---

**PERGUNTA DO USUÁRIO:**
${query}

**INSTRUÇÕES:**
Responda baseado EXCLUSIVAMENTE nos documentos acima${conversationHistory && conversationHistory.length > 0 ? ' e no histórico da conversa' : ''}. Cite as fontes ao final. Se não houver informação suficiente, seja honesto sobre isso.`;
}

// ===================================
// FAIL-SAFE MESSAGES
// ===================================

export const FAIL_SAFE_MESSAGES = {
  NO_CHUNKS: `Não encontrei informações sobre essa questão nos documentos institucionais disponíveis.

Isso pode acontecer porque:
- O tema não está coberto nos documentos indexados
- A pergunta está muito genérica (tente ser mais específico)
- Os documentos ainda não foram atualizados com essa informação

Recomendo entrar em contato com a Secretaria de Educação para esclarecimentos adicionais.`,

  API_ERROR: `Desculpe, estou temporariamente indisponível devido a uma falha técnica. Por favor, tente novamente em alguns instantes.

Se o problema persistir, entre em contato com o suporte técnico (TI).`,

  RATE_LIMIT: `No momento, estou processando muitas solicitações. Por favor, aguarde alguns segundos e tente novamente.`,

  INVALID_QUERY: `Não consegui processar sua pergunta. Por favor, reformule de forma mais clara e objetiva.

Exemplo de perguntas válidas:
- "Qual o prazo para matrícula escolar?"
- "Quais documentos são necessários para transferência?"
- "Quando começa o ano letivo 2026?"`,
} as const;

// ===================================
// VALIDAÇÃO DO PROMPT
// ===================================

/**
 * Valida se o contexto está completo antes de gerar o prompt
 */
export function validateChatContext(context: ChatContext): { valid: boolean; error?: string } {
  if (!context.query || context.query.trim().length < 3) {
    return { valid: false, error: 'Query muito curta (mínimo 3 caracteres)' };
  }

  if (context.query.length > 500) {
    return { valid: false, error: 'Query muito longa (máximo 500 caracteres)' };
  }

  if (!['DIRETOR', 'COMISSAO', 'SECRETARIA', 'TI'].includes(context.user_profile)) {
    return { valid: false, error: 'Perfil de usuário inválido' };
  }

  if (context.user_profile === 'DIRETOR' && !context.unit_name) {
    return { valid: false, error: 'Diretor deve ter unidade vinculada' };
  }

  return { valid: true };
}

// ===================================
// CHANGELOG
// ===================================

/**
 * Histórico de mudanças do prompt
 * 
 * v1.0 (2026-01-10):
 * - Versão inicial
 * - Regras de segurança e governança
 * - Sistema de citações obrigatórias
 * - Fail-safe para ausência de chunks
 * - Integração com gpt-4o-mini
 * - Suporte a 4 perfis: DIRETOR, COMISSAO, SECRETARIA, TI
 */
