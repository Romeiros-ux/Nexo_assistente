/**
 * Prompt Orchestrator - Assistente Institucional Inteligente
 * 
 * IMPORTANTE: Este módulo é um SELETOR e COMBINADOR de prompts.
 * Ele NÃO infere, NÃO decide, NÃO cria conclusões próprias.
 * 
 * Responsabilidades:
 * 1. SELECIONAR o tipo de prompt funcional baseado em palavras-chave
 * 2. COLETAR informações do perfil do usuário
 * 3. BUSCAR histórico de conversação
 * 4. COMBINAR todos os prompts em uma estrutura hierárquica
 * 5. ENTREGAR o prompt completo para a IA processar
 * 
 * O que ele NÃO faz:
 * - NÃO interpreta a intenção do usuário
 * - NÃO gera respostas
 * - NÃO toma decisões sobre o conteúdo
 * - NÃO adiciona informações além dos prompts definidos
 * 
 * Orquestra a composição do prompt final baseado em:
 * - System prompt (personalidade base)
 * - Profile prompt (governança por perfil)
 * - Functional prompt (tipo detectado por palavras-chave)
 * - User context (dados do usuário e unidades)
 * - Conversation history (últimas mensagens)
 */

import { SYSTEM_PROMPT } from './system-prompt';
import {
  detectPromptType,
  getFunctionalPrompt,
  PromptType,
} from './functional-prompts';
import { buildAIContext, UserContext, ConversationMessage } from './context-builder';
import { getProfilePrompt } from './profile-prompt';

export interface OrchestratedPrompt {
  systemPrompt: string;
  profilePrompt: string;
  functionalPrompt: string;
  userContext: string;
  detectedType: PromptType;
  fullPrompt: string;
}

/**
 * Orquestra a criação do prompt completo para o assistente
 * 
 * FLUXO (apenas seleção e combinação):
 * 1. SELECIONA o prompt de perfil apropriado (via função getProfilePrompt)
 * 2. DETECTA o tipo de pergunta (via função detectPromptType - baseada em keywords)
 * 3. SELECIONA o prompt funcional correspondente (via função getFunctionalPrompt)
 * 4. COLETA o contexto do usuário (via função buildAIContext)
 * 5. COMBINA tudo em um único prompt estruturado
 * 
 * NÃO há lógica de decisão ou inferência aqui.
 * Todas as decisões são feitas por funções especializadas que seguem regras fixas.
 * 
 * @param userQuery - Pergunta do usuário (usada apenas para detectar tipo)
 * @param userContext - Dados do usuário logado
 * @param conversationHistory - Histórico de mensagens anteriores
 * @returns Objeto com todos os prompts separados e o prompt final combinado
 */
export function orchestratePrompt(
  userQuery: string,
  userContext: UserContext,
  conversationHistory?: ConversationMessage[]
): OrchestratedPrompt {
  // 1. Obtém o prompt de perfil (PRIMEIRO - camada de governança)
  const profilePrompt = getProfilePrompt(userContext.role);

  // 2. Detecta o tipo de prompt baseado na query
  const detectedType = detectPromptType(userQuery);

  // 3. Obtém o prompt funcional apropriado
  const functionalPrompt = getFunctionalPrompt(detectedType);

  // 4. Constrói o contexto do usuário
  const contextString = buildAIContext(userContext, conversationHistory);

  // 5. Compõe o prompt final (ordem hierárquica)
  const fullPrompt = `
${SYSTEM_PROMPT}

${profilePrompt}

${contextString}

${functionalPrompt}

═══════════════════════════════════════════════════════════

📝 PERGUNTA DO USUÁRIO:

${userQuery}

═══════════════════════════════════════════════════════════

Agora responda seguindo rigorosamente, NA ORDEM:
1. O system prompt (comportamento geral institucional)
2. O profile prompt (governança baseada no perfil ${userContext.role})
3. O contexto do usuário (unidades vinculadas e histórico)
4. O template do prompt funcional (${detectedType})
5. A estrutura de resposta apropriada

LEMBRE-SE:
• Adapte linguagem e profundidade ao perfil ${userContext.role}
• Respeite as restrições de acesso do perfil
• Se a solicitação extrapolar o escopo, informe educadamente

Comece sua resposta diretamente com o conteúdo solicitado.
`;

  return {
    systemPrompt: SYSTEM_PROMPT,
    profilePrompt,
    functionalPrompt,
    userContext: contextString,
    detectedType,
    fullPrompt,
  };
}

/**
 * Valida se a resposta do assistente está seguindo o formato esperado
 */
export function validateResponse(
  response: string,
  expectedType: PromptType
): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Verifica se tem estrutura de seções (##)
  if (!response.includes('##')) {
    issues.push('Resposta não segue estrutura de seções esperada');
  }

  // Validações específicas por tipo
  switch (expectedType) {
    case PromptType.ANALYTICAL:
      if (!response.includes('Contextualização')) {
        issues.push('Falta seção: Contextualização');
      }
      if (!response.includes('Leitura dos Dados')) {
        issues.push('Falta seção: Leitura dos Dados');
      }
      if (!response.includes('Síntese Executiva')) {
        issues.push('Falta seção: Síntese Executiva');
      }
      break;

    case PromptType.ACTION_PLAN:
      if (!response.includes('Objetivo do Plano')) {
        issues.push('Falta seção: Objetivo do Plano');
      }
      if (!response.includes('Estratégias Propostas')) {
        issues.push('Falta seção: Estratégias Propostas');
      }
      break;

    case PromptType.URGENCY:
      if (!response.includes('Situação Identificada')) {
        issues.push('Falta seção: Situação Identificada');
      }
      if (!response.includes('Grau de Criticidade')) {
        issues.push('Falta seção: Grau de Criticidade');
      }
      break;
  }

  // Verifica se não está inventando dados (palavras de alerta)
  const alertWords = [
    'imagino que',
    'provavelmente',
    'talvez',
    'suponho',
    'acho que',
    'possivelmente',
  ];

  alertWords.forEach((word) => {
    if (response.toLowerCase().includes(word)) {
      issues.push(`Resposta contém palavra de incerteza: "${word}"`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Adiciona mensagem ao histórico da conversa
 */
export function addToConversationHistory(
  history: ConversationMessage[],
  role: 'user' | 'assistant',
  content: string
): ConversationMessage[] {
  const newMessage: ConversationMessage = {
    role,
    content,
    timestamp: new Date(),
  };

  return [...history, newMessage];
}

/**
 * Limpa histórico mantendo apenas mensagens recentes
 */
export function pruneConversationHistory(
  history: ConversationMessage[],
  maxMessages: number = 10
): ConversationMessage[] {
  if (history.length <= maxMessages) {
    return history;
  }

  return history.slice(-maxMessages);
}
