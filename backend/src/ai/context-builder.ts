/**
 * Context Builder - Assistente Institucional Inteligente
 * 
 * IMPORTANTE: Este módulo NÃO infere, NÃO decide, NÃO interpreta dados.
 * Ele apenas FORMATA informações em texto estruturado.
 * 
 * O que ele faz:
 * - RECEBE dados do usuário (perfil, unidades, histórico)
 * - FORMATA esses dados em texto legível
 * - MONTA templates pré-definidos com os dados
 * - RETORNA strings formatadas
 * 
 * O que ele NÃO faz:
 * - NÃO analisa o conteúdo das mensagens
 * - NÃO decide qual contexto é relevante
 * - NÃO interpreta as regras de governança
 * - NÃO faz julgamentos sobre acesso
 * 
 * Todas as funções aqui são operações mecânicas de:
 * receber dados → aplicar template → retornar string
 */

import { UserRole } from '../types/user.types';
import { EducationalUnit } from '../types/unit.types';

export interface UserContext {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  units: EducationalUnit[];
  hasGlobalAccess: boolean;
}

export interface AIContext {
  userContext: UserContext;
  governanceRules: string;
  accessScope: string;
  conversationHistory?: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * Constrói o contexto de governança para o assistente
 * 
 * Esta função apenas FORMATA regras de governança em texto.
 * Ela NÃO decide se o usuário pode acessar algo - isso já foi
 * decidido pelo AuthGuard antes de chegar aqui.
 * 
 * Operação mecânica:
 * 1. Recebe dados do usuário (role, units, hasGlobalAccess)
 * 2. Seleciona template apropriado (if/else simples)
 * 3. Preenche template com dados
 * 4. Retorna string formatada
 * 
 * NÃO há lógica de decisão aqui - apenas formatação de texto.
 */
export function buildGovernanceContext(userContext: UserContext): string {
  const { role, units, hasGlobalAccess } = userContext;

  if (hasGlobalAccess) {
    return `
🔐 CONTEXTO DE ACESSO DO USUÁRIO

Perfil: ${role} (Administrador)
Escopo de Acesso: GLOBAL - Pode acessar dados de todas as unidades educacionais
Unidades no Sistema: ${units.length > 0 ? units.length : 'Todas'}

IMPORTANTE: Este usuário tem visão completa do sistema. Pode solicitar análises consolidadas ou específicas de qualquer unidade.
`;
  }

  if (units.length === 0) {
    return `
🔐 CONTEXTO DE ACESSO DO USUÁRIO

Perfil: ${role}
Escopo de Acesso: RESTRITO - Nenhuma unidade educacional vinculada

⚠️ ATENÇÃO: Este usuário não possui unidades vinculadas. Informe que é necessário:
1. Contatar o administrador (TI)
2. Solicitar vinculação às unidades sob sua responsabilidade

Você NÃO pode fornecer análises de dados específicos até que haja vinculação.
`;
  }

  const unitsList = units.map((u) => `- ${u.name} (${u.type})`).join('\n');

  return `
🔐 CONTEXTO DE ACESSO DO USUÁRIO

Perfil: ${role}
Escopo de Acesso: RESTRITO às seguintes unidades educacionais:

${unitsList}

Total de unidades vinculadas: ${units.length}

IMPORTANTE: 
- Você DEVE limitar TODAS as análises e consultas APENAS a estas unidades
- NÃO forneça dados de outras unidades
- NÃO compare com unidades fora deste escopo
- Se o usuário solicitar dados de outras unidades, informe educadamente sobre a limitação de acesso
`;
}

/**
 * Constrói o contexto completo para o assistente
 * 
 * Esta função apenas COMBINA strings pré-formatadas.
 * 
 * Operação mecânica:
 * 1. Chama buildGovernanceContext() para obter string de governança
 * 2. Adiciona dados do usuário (nome, email, role)
 * 3. Se houver histórico, formata últimas 5 mensagens
 * 4. CONCATENA tudo em uma única string
 * 
 * É uma operação puramente mecânica de "juntar textos".
 * NÃO decide o que incluir além das regras fixas (últimas 5 mensagens).
 */
export function buildAIContext(
  userContext: UserContext,
  conversationHistory?: ConversationMessage[]
): string {
  const governanceContext = buildGovernanceContext(userContext);

  let context = `
${governanceContext}

👤 INFORMAÇÕES DO USUÁRIO ATUAL

Nome: ${userContext.name}
Email: ${userContext.email}
Perfil Institucional: ${userContext.role}
`;

  if (conversationHistory && conversationHistory.length > 0) {
    context += `\n📜 HISTÓRICO DA CONVERSA\n\n`;
    context += conversationHistory
      .slice(-5) // Últimas 5 mensagens
      .map((msg) => {
        const timestamp = msg.timestamp.toLocaleString('pt-BR');
        return `[${timestamp}] ${msg.role.toUpperCase()}: ${msg.content}`;
      })
      .join('\n\n');
  }

  return context;
}

/**
 * Formata as unidades para exibição no contexto
 */
export function formatUnitsForContext(units: EducationalUnit[]): string {
  if (units.length === 0) {
    return 'Nenhuma unidade vinculada';
  }

  const groupedByType = units.reduce((acc, unit) => {
    if (!acc[unit.type]) {
      acc[unit.type] = [];
    }
    acc[unit.type].push(unit);
    return acc;
  }, {} as Record<string, EducationalUnit[]>);

  let formatted = '';

  Object.entries(groupedByType).forEach(([type, unitsOfType]) => {
    const typeLabel = {
      school: 'Escolas',
      center: 'Centros',
      department: 'Departamentos',
    }[type] || type;

    formatted += `\n${typeLabel} (${unitsOfType.length}):\n`;
    unitsOfType.forEach((unit) => {
      formatted += `  • ${unit.name}${unit.code ? ` [${unit.code}]` : ''}\n`;
    });
  });

  return formatted;
}

/**
 * Verifica se o usuário pode acessar uma unidade específica
 */
export function canAccessUnit(
  userContext: UserContext,
  unitId: string
): boolean {
  // Admin tem acesso global
  if (userContext.hasGlobalAccess) {
    return true;
  }

  // Verifica se a unidade está na lista do usuário
  return userContext.units.some((unit) => unit.id === unitId);
}

/**
 * Filtra lista de unidades baseado no acesso do usuário
 */
export function filterUnitsByAccess(
  userContext: UserContext,
  units: EducationalUnit[]
): EducationalUnit[] {
  // Admin vê tudo
  if (userContext.hasGlobalAccess) {
    return units;
  }

  // Filtra apenas unidades do usuário
  const userUnitIds = userContext.units.map((u) => u.id);
  return units.filter((unit) => userUnitIds.includes(unit.id));
}
