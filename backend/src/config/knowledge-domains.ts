/**
 * TAXONOMIA DE DOMÍNIOS DO CONHECIMENTO EDUCACIONAL
 * 
 * Estrutura hierárquica para classificação e roteamento inteligente
 * de documentos e queries do assistente educacional.
 */

export interface Domain {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  subdomains: Subdomain[];
  priority: number; // 1-10, maior = mais prioritário
}

export interface Subdomain {
  id: string;
  name: string;
  keywords: string[];
  documentPatterns: string[]; // Regex ou glob patterns
}

export const KNOWLEDGE_DOMAINS: Domain[] = [
  {
    id: 'INDICADORES_EDUCACIONAIS',
    name: 'Indicadores Educacionais',
    description: 'Métricas e índices de qualidade e desempenho educacional',
    keywords: [
      'indicador', 'índice', 'taxa', 'percentual', 'desempenho',
      'qualidade educacional', 'avaliação', 'resultado'
    ],
    priority: 10,
    subdomains: [
      {
        id: 'IDEB',
        name: 'IDEB - Índice de Desenvolvimento da Educação Básica',
        keywords: [
          'ideb', 'índice de desenvolvimento', 'desenvolvimento da educação',
          'qualidade educação', 'meta ideb', 'nota ideb'
        ],
        documentPatterns: ['ideb_territorios', 'ideb-', 'IDEB']
      },
      {
        id: 'TAXA_RENDIMENTO',
        name: 'Taxa de Rendimento Escolar',
        keywords: [
          'aprovação', 'reprovação', 'abandono', 'fluxo escolar',
          'taxa de aprovação', 'taxa de reprovação', 'evasão',
          'rendimento escolar', 'aprovados', 'reprovados'
        ],
        documentPatterns: ['taxa_rendimento', 'rendimento_escolar', 'fluxo']
      },
      {
        id: 'DISTORCAO_IDADE_SERIE',
        name: 'Distorção Idade-Série',
        keywords: [
          'distorção', 'idade-série', 'defasagem', 'idade série',
          'aluno com idade superior', 'defasagem idade'
        ],
        documentPatterns: ['distorcao_idade_serie', 'distorcao-idade']
      },
      {
        id: 'SAEB',
        name: 'SAEB - Sistema de Avaliação da Educação Básica',
        keywords: [
          'saeb', 'prova brasil', 'proficiência', 'aprendizado',
          'matemática', 'português', 'língua portuguesa',
          'avaliação nacional', 'desempenho alunos'
        ],
        documentPatterns: ['saeb', 'prova_brasil', 'proficiencia']
      },
      {
        id: 'PERMANENCIA',
        name: 'Taxa de Permanência',
        keywords: [
          'permanência', 'retenção', 'continuidade escolar'
        ],
        documentPatterns: ['permanencias', 'permanencia']
      },
      {
        id: 'MATRICULAS',
        name: 'Matrículas e Censo Escolar',
        keywords: [
          'matrícula', 'matrículas', 'censo escolar', 'número de alunos',
          'alunos matriculados', 'vagas'
        ],
        documentPatterns: ['matriculas', 'censo_escolar']
      }
    ]
  },
  {
    id: 'LEGISLACAO',
    name: 'Legislação e Normas',
    description: 'Leis, decretos, portarias e normas municipais sobre educação',
    keywords: [
      'lei', 'decreto', 'portaria', 'resolução', 'normativa',
      'legislação', 'norma', 'regulamento', 'diário oficial'
    ],
    priority: 7,
    subdomains: [
      {
        id: 'LEIS_ORGANICAS',
        name: 'Leis Orgânicas',
        keywords: ['lei orgânica', 'LO-', 'lei municipal'],
        documentPatterns: ['LO-', 'lei-organica']
      },
      {
        id: 'LEIS_COMPLEMENTARES',
        name: 'Leis Complementares',
        keywords: ['lei complementar', 'LC-'],
        documentPatterns: ['LC-', 'lei-complementar']
      },
      {
        id: 'DECRETOS',
        name: 'Decretos Municipais',
        keywords: ['decreto', 'D.O.S.', 'diário oficial'],
        documentPatterns: ['decreto', 'D.O.S.', 'diario-oficial']
      },
      {
        id: 'PLANOS',
        name: 'Planos Municipais',
        keywords: [
          'plano municipal', 'PME', 'plano de educação',
          'plano plurianual', 'PPA'
        ],
        documentPatterns: ['plano-municipal', 'PME', 'PPA']
      },
      {
        id: 'DIRETRIZES',
        name: 'Diretrizes e Orientações',
        keywords: ['diretriz', 'orientação', 'instrução normativa'],
        documentPatterns: ['diretriz', 'orientacao']
      }
    ]
  },
  {
    id: 'GESTAO_RECURSOS',
    name: 'Gestão de Recursos',
    description: 'Orçamento, finanças e recursos destinados à educação',
    keywords: [
      'orçamento', 'receita', 'despesa', 'financeiro',
      'verba', 'recurso', 'investimento', 'gasto'
    ],
    priority: 6,
    subdomains: [
      {
        id: 'ORCAMENTO',
        name: 'Orçamento Municipal',
        keywords: [
          'orçamento', 'LOA', 'lei orçamentária', 'receita', 'despesa',
          'anexo orçamento', 'receitas correntes'
        ],
        documentPatterns: ['orcamento', 'LOA', 'receita', 'anexo']
      },
      {
        id: 'FUNDEB',
        name: 'FUNDEB e Fundos Educacionais',
        keywords: ['fundeb', 'fundo educação', 'fundo especial'],
        documentPatterns: ['fundeb', 'fundo']
      },
      {
        id: 'CONTRATOS',
        name: 'Contratos e Licitações',
        keywords: ['contrato', 'licitação', 'pregão', 'convênio'],
        documentPatterns: ['contrato', 'licitacao']
      }
    ]
  },
  {
    id: 'INFRAESTRUTURA',
    name: 'Infraestrutura Escolar',
    description: 'Dados sobre escolas, instalações e recursos físicos',
    keywords: [
      'escola', 'unidade escolar', 'prédio', 'instalação',
      'infraestrutura', 'biblioteca', 'laboratório'
    ],
    priority: 5,
    subdomains: [
      {
        id: 'ESCOLAS',
        name: 'Cadastro de Escolas',
        keywords: ['escola', 'unidade escolar', 'INEP', 'código escola'],
        documentPatterns: ['escolas', 'cadastro_escola', 'inep']
      },
      {
        id: 'RECURSOS_FISICOS',
        name: 'Recursos Físicos',
        keywords: ['biblioteca', 'laboratório', 'quadra', 'sala', 'equipamento'],
        documentPatterns: ['infraestrutura', 'recursos']
      }
    ]
  },
  {
    id: 'RECURSOS_HUMANOS',
    name: 'Recursos Humanos',
    description: 'Professores, funcionários e gestão de pessoal',
    keywords: [
      'professor', 'docente', 'funcionário', 'servidor',
      'concurso', 'contratação', 'formação', 'capacitação',
      'trabalhador', 'servidores municipais', 'funcionários públicos',
      'secretário', 'secretária', 'cadastro de trabalhadores',
      'prefeito', 'vice-prefeito', 'cargo', 'nome do prefeito'
    ],
    priority: 5,
    subdomains: [
      {
        id: 'SERVIDORES',
        name: 'Servidores e Funcionários Municipais',
        keywords: [
          'servidor', 'funcionário', 'trabalhador', 'cadastro',
          'secretário', 'secretária', 'cargo', 'matrícula',
          'secretaria de educação', 'divisão', 'lotação',
          'prefeito', 'vice-prefeito', 'vereador', 'gestor público'
        ],
        documentPatterns: ['cadastro', 'trabalhadores', 'servidores', 'funcionarios']
      },
      {
        id: 'MATRICULAS',
        name: 'Matrículas e Cargos',
        keywords: [
          'matrícula', 'matricula', 'cargo', 'prefeito', 'vice-prefeito',
          'secretário', 'secretária', 'vereador', 'qual cargo',
          'qual matrícula', 'quem é o prefeito', 'nome do prefeito'
        ],
        documentPatterns: ['matricula', 'cargo', 'indice']
      },
      {
        id: 'CONTAGEM',
        name: 'Contagem e Estatísticas',
        keywords: [
          'quantos', 'quantas', 'quantidade', 'total', 'numero',
          'contagem', 'estatistica', 'agregado'
        ],
        documentPatterns: ['quantidade', 'contagem', 'estatistica']
      },
      {
        id: 'PROFESSORES',
        name: 'Corpo Docente',
        keywords: ['professor', 'docente', 'educador', 'formação docente'],
        documentPatterns: ['professores', 'docentes']
      },
      {
        id: 'CONCURSOS',
        name: 'Concursos e Seleções',
        keywords: ['concurso', 'seleção', 'edital', 'processo seletivo'],
        documentPatterns: ['concurso', 'edital']
      }
    ]
  },
  {
    id: 'DIARIO_OFICIAL',
    name: 'Diário Oficial de Saquarema',
    description: 'Publicações oficiais: decretos, leis, portarias, editais, contratos',
    keywords: [
      'diário oficial', 'D.O.S', 'D.O.S.', 'decreto', 'portaria', 'lei',
      'edital', 'publicação oficial', 'ato administrativo', 'extrato',
      'contrato', 'licitação', 'ata de registro', 'pregão', 'termo aditivo'
    ],
    priority: 8,
    subdomains: [
      {
        id: 'INDICE_ATOS',
        name: 'Índice de Atos Administrativos',
        keywords: [
          'decreto', 'portaria', 'lei', 'edital', 'número', 'qual ato',
          'decreto número', 'portaria número', 'lei número', 'edital número',
          'ato administrativo', 'qual decreto', 'qual portaria'
        ],
        documentPatterns: ['indice', 'atos', 'indice-atos']
      },
      {
        id: 'TEXTOS_COMPLETOS',
        name: 'Textos Completos de Publicações',
        keywords: [
          'texto completo', 'ler', 'conteúdo', 'íntegra', 'o que diz',
          'quero ler', 'mostrar', 'exibir', 'teor', 'ver decreto',
          'ver portaria', 'ver lei', 'leia', 'leitura'
        ],
        documentPatterns: ['textos', 'completos', 'textos-completos']
      },
      {
        id: 'CONTRATOS_LICITACOES',
        name: 'Contratos e Licitações',
        keywords: [
          'contrato', 'licitação', 'pregão', 'ata de registro', 'valor',
          'empresa', 'vencedor', 'contratada', 'contratante', 'licitante',
          'valor do contrato', 'termo aditivo', 'extrato', 'cnpj',
          'quem venceu', 'empresa contratada', 'objeto do contrato'
        ],
        documentPatterns: ['contratos', 'licitacoes', 'contratos-licitacoes']
      }
    ]
  },
  {
    id: 'TRANSPARENCIA',
    name: 'Transparência e Dados Públicos',
    description: 'Portal da transparência e dados abertos',
    keywords: [
      'transparência', 'portal transparência', 'dados abertos',
      'prestação contas', 'dados públicos'
    ],
    priority: 4,
    subdomains: [
      {
        id: 'PORTAL_TRANSPARENCIA',
        name: 'Portal da Transparência',
        keywords: ['portal transparência', 'transparência municipal'],
        documentPatterns: ['portal-transparencia', 'transparencia']
      },
      {
        id: 'QEDU',
        name: 'QEdu - Dados Educacionais',
        keywords: ['qedu', 'plataforma qedu'],
        documentPatterns: ['qedu', 'www.qedu']
      }
    ]
  }
];

/**
 * Encontra domínio por ID
 */
export function findDomainById(domainId: string): Domain | undefined {
  return KNOWLEDGE_DOMAINS.find(d => d.id === domainId);
}

/**
 * Encontra subdomínio por ID
 */
export function findSubdomainById(domainId: string, subdomainId: string): Subdomain | undefined {
  const domain = findDomainById(domainId);
  return domain?.subdomains.find(s => s.id === subdomainId);
}

/**
 * Classifica um documento baseado em nome e padrões
 */
export function classifyDocumentByPattern(
  documentName: string,
  documentType: string
): { domain: string; subdomain: string } | null {
  
  // Priorizar REPORT (Excel) para indicadores
  if (documentType === 'REPORT') {
    for (const domain of KNOWLEDGE_DOMAINS) {
      if (domain.id === 'INDICADORES_EDUCACIONAIS') {
        for (const subdomain of domain.subdomains) {
          for (const pattern of subdomain.documentPatterns) {
            if (documentName.toLowerCase().includes(pattern.toLowerCase())) {
              return {
                domain: domain.id,
                subdomain: subdomain.id
              };
            }
          }
        }
      }
    }
  }

  // Buscar em todos os domínios
  for (const domain of KNOWLEDGE_DOMAINS) {
    for (const subdomain of domain.subdomains) {
      for (const pattern of subdomain.documentPatterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(documentName)) {
          return {
            domain: domain.id,
            subdomain: subdomain.id
          };
        }
      }
    }
  }

  return null;
}

/**
 * Retorna keywords de um domínio
 */
export function getDomainKeywords(domainId: string): string[] {
  const domain = findDomainById(domainId);
  if (!domain) return [];

  const keywords = [...domain.keywords];
  
  // Adicionar keywords dos subdomínios
  for (const subdomain of domain.subdomains) {
    keywords.push(...subdomain.keywords);
  }

  return [...new Set(keywords)]; // Remove duplicatas
}
