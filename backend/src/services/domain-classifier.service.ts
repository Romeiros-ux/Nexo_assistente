/**
 * DOMAIN CLASSIFIER SERVICE
 * 
 * Serviço que usa LLM para classificar queries e documentos em domínios
 * educacionais, permitindo roteamento inteligente de buscas.
 */

import OpenAI from 'openai';
import { KNOWLEDGE_DOMAINS } from '../config/knowledge-domains';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export interface QueryClassification {
  domain: string;
  subdomain: string;
  confidence: number; // 0-1
  keywords: string[];
  filters?: {
    year?: number;
    educationStage?: string; // AF, AI, EM
    documentType?: string;
  };
  reasoning: string;
}

export class DomainClassifierService {
  /**
   * Classifica uma query do usuário usando LLM
   */
  static async classifyQuery(query: string): Promise<QueryClassification> {
    const prompt = this.buildClassificationPrompt(query);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em gestão educacional brasileira. 
Analise perguntas sobre educação e classifique-as em domínios específicos.
Responda SEMPRE em JSON válido, sem markdown.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      domain: result.domain || 'INDICADORES_EDUCACIONAIS',
      subdomain: result.subdomain || '',
      confidence: result.confidence || 0.5,
      keywords: result.keywords || [],
      filters: result.filters || {},
      reasoning: result.reasoning || ''
    };
  }

  /**
   * Constrói o prompt para classificação
   */
  private static buildClassificationPrompt(query: string): string {
    // Serializar domínios para o prompt
    const domainsInfo = KNOWLEDGE_DOMAINS.map(domain => ({
      id: domain.id,
      name: domain.name,
      description: domain.description,
      keywords: domain.keywords.slice(0, 10),
      subdomains: domain.subdomains.map(sub => ({
        id: sub.id,
        name: sub.name,
        keywords: sub.keywords.slice(0, 8)
      }))
    }));

    return `Analise a seguinte pergunta sobre educação em Saquarema-RJ e classifique-a:

PERGUNTA: "${query}"

DOMÍNIOS DISPONÍVEIS:
${JSON.stringify(domainsInfo, null, 2)}

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
- "Qual o IDEB de 2023?" → domain: INDICADORES_EDUCACIONAIS, subdomain: IDEB, filters: {year: 2023, documentType: "REPORT"}
- "Taxa de aprovação nos Anos Finais em 2023" → domain: INDICADORES_EDUCACIONAIS, subdomain: TAXA_RENDIMENTO, filters: {educationStage: "AF", year: 2023, documentType: "REPORT"}
- "Quais escolas têm melhor IDEB?" → domain: INDICADORES_EDUCACIONAIS, subdomain: IDEB, filters: {documentType: "OTHER"}
- "Como funciona o IDEB?" → domain: INDICADORES_EDUCACIONAIS, subdomain: IDEB, filters: {documentType: "OTHER"}
- "Qual a lei sobre educação?" → domain: LEGISLACAO, subdomain: LEIS_ORGANICAS
- "Distorção idade-série anos iniciais 2023" → domain: INDICADORES_EDUCACIONAIS, subdomain: DISTORCAO_IDADE_SERIE, filters: {year: 2023, educationStage: "AI", documentType: "REPORT"}
- "Qual o nome do prefeito?" → domain: RECURSOS_HUMANOS, subdomain: SERVIDORES, filters: {documentType: "OTHER"}
- "Quantos professores tem?" → domain: RECURSOS_HUMANOS, subdomain: PROFESSORES, filters: {documentType: "OTHER"}

RETORNE JSON:
{
  "domain": "ID_DO_DOMINIO",
  "subdomain": "ID_DO_SUBDOMINIO",
  "confidence": 0.95,
  "keywords": ["palavra1", "palavra2"],
  "filters": {
    "year": 2023,
    "educationStage": "AF",
    "documentType": "REPORT"
  },
  "reasoning": "Breve explicação da classificação"
}`;
  }

  /**
   * Classifica um documento baseado em nome e conteúdo
   */
  static async classifyDocument(
    documentName: string,
    documentType: string,
    contentSample?: string
  ): Promise<QueryClassification> {
    const prompt = `Classifique este documento educacional:

NOME DO ARQUIVO: ${documentName}
TIPO: ${documentType}
${contentSample ? `CONTEÚDO (AMOSTRA):\n${contentSample.substring(0, 500)}` : ''}

Use a mesma taxonomia de domínios anterior.
Retorne JSON com: domain, subdomain, confidence, keywords, filters (year, educationStage se aplicável)`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em classificação de documentos educacionais. Responda em JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      domain: result.domain || 'INDICADORES_EDUCACIONAIS',
      subdomain: result.subdomain || '',
      confidence: result.confidence || 0.5,
      keywords: result.keywords || [],
      filters: result.filters || {},
      reasoning: result.reasoning || ''
    };
  }

  /**
   * Sugere domínios alternativos se a busca principal falhar
   */
  static suggestAlternativeDomains(primaryDomain: string): string[] {
    const alternatives: Record<string, string[]> = {
      'INDICADORES_EDUCACIONAIS': ['TRANSPARENCIA', 'LEGISLACAO'],
      'LEGISLACAO': ['INDICADORES_EDUCACIONAIS', 'GESTAO_RECURSOS'],
      'GESTAO_RECURSOS': ['LEGISLACAO', 'TRANSPARENCIA'],
      'TRANSPARENCIA': ['INDICADORES_EDUCACIONAIS', 'GESTAO_RECURSOS']
    };

    return alternatives[primaryDomain] || [];
  }

  /**
   * Retorna prioridade de um domínio
   */
  static getDomainPriority(domainId: string): number {
    const domain = KNOWLEDGE_DOMAINS.find(d => d.id === domainId);
    return domain?.priority || 5;
  }
}
