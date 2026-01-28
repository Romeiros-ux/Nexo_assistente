/**
 * Padrão de Categorização de Documentos
 * 
 * Define domínios e subdomínios para estruturação da base de conhecimento
 */

export interface DocumentCategory {
  value: string;
  label: string;
  description: string;
  subdomains: SubdomainOption[];
}

export interface SubdomainOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Domínios principais e seus subdomínios
 */
export const DOCUMENT_DOMAINS: DocumentCategory[] = [
  {
    value: 'REGULAMENTAÇÃO',
    label: 'Regulamentação',
    description: 'Normas, leis e regulamentos institucionais',
    subdomains: [
      { value: 'NORMAS_INTERNAS', label: 'Normas Internas' },
      { value: 'LEGISLACAO_MUNICIPAL', label: 'Legislação Municipal' },
      { value: 'LEGISLACAO_ESTADUAL', label: 'Legislação Estadual' },
      { value: 'LEGISLACAO_FEDERAL', label: 'Legislação Federal' },
      { value: 'REGIMENTO_INTERNO', label: 'Regimento Interno' },
      { value: 'ESTATUTO', label: 'Estatuto' },
      { value: 'PORTARIAS', label: 'Portarias' },
      { value: 'DECRETOS', label: 'Decretos' },
      { value: 'RESOLUCOES', label: 'Resoluções' },
    ],
  },
  {
    value: 'PEDAGOGICO',
    label: 'Pedagógico',
    description: 'Documentos relacionados ao processo educacional',
    subdomains: [
      { value: 'PPP', label: 'Projeto Político Pedagógico' },
      { value: 'PLANOS_ENSINO', label: 'Planos de Ensino' },
      { value: 'CURRICULOS', label: 'Currículos' },
      { value: 'BNCC', label: 'BNCC - Base Nacional Comum Curricular' },
      { value: 'METODOLOGIAS', label: 'Metodologias de Ensino' },
      { value: 'AVALIACOES', label: 'Avaliações' },
      { value: 'PROJETOS_PEDAGOGICOS', label: 'Projetos Pedagógicos' },
    ],
  },
  {
    value: 'CALENDARIO',
    label: 'Calendário',
    description: 'Calendários escolares e programação de eventos',
    subdomains: [
      { value: 'CALENDARIO_ESCOLAR', label: 'Calendário Escolar' },
      { value: 'EVENTOS', label: 'Eventos' },
      { value: 'FERIAS_RECESSO', label: 'Férias e Recesso' },
      { value: 'CRONOGRAMAS', label: 'Cronogramas' },
    ],
  },
  {
    value: 'INDICADORES_EDUCACIONAIS',
    label: 'Indicadores Educacionais',
    description: 'Dados e indicadores de qualidade da educação',
    subdomains: [
      { value: 'IDEB', label: 'IDEB - Índice de Desenvolvimento da Educação Básica' },
      { value: 'CENSO_ESCOLAR', label: 'Censo Escolar' },
      { value: 'MATRICULAS', label: 'Matrículas' },
      { value: 'FREQUENCIA', label: 'Frequência' },
      { value: 'DESEMPENHO', label: 'Desempenho Acadêmico' },
      { value: 'EVASAO', label: 'Evasão Escolar' },
    ],
  },
  {
    value: 'ADMINISTRATIVO',
    label: 'Administrativo',
    description: 'Documentos administrativos e de gestão',
    subdomains: [
      { value: 'ATAS', label: 'Atas de Reunião' },
      { value: 'CIRCULARES', label: 'Circulares' },
      { value: 'MEMORANDOS', label: 'Memorandos' },
      { value: 'COMUNICADOS', label: 'Comunicados' },
      { value: 'CONTRATOS', label: 'Contratos' },
      { value: 'CONVENIOS', label: 'Convênios' },
      { value: 'LICITACOES', label: 'Licitações' },
    ],
  },
  {
    value: 'RECURSOS_HUMANOS',
    label: 'Recursos Humanos',
    description: 'Documentos relacionados a pessoal',
    subdomains: [
      { value: 'SERVIDORES', label: 'Cadastro de Servidores' },
      { value: 'MATRICULAS', label: 'Matrículas e Cargos', description: 'Índice otimizado para consulta de matrículas e cargos' },
      { value: 'CONTAGEM', label: 'Contagem e Estatísticas', description: 'Dados agregados e quantitativos de RH' },
      { value: 'GESTAO_PESSOAL', label: 'Gestão de Pessoal' },
      { value: 'PLANO_CARGOS', label: 'Plano de Cargos e Salários' },
      { value: 'REGIME_TRABALHO', label: 'Regime de Trabalho' },
      { value: 'FORMACAO_CONTINUADA', label: 'Formação Continuada' },
      { value: 'ESTATUTO_SERVIDOR', label: 'Estatuto do Servidor' },
    ],
  },
  {
    value: 'DIARIO_OFICIAL',
    label: 'Diário Oficial',
    description: 'Publicações oficiais (decretos, leis, portarias, contratos)',
    subdomains: [
      { 
        value: 'INDICE_ATOS', 
        label: 'Índice de Atos',
        description: 'Índice rápido para busca por número de ato (decreto, portaria, lei, edital)'
      },
      { 
        value: 'TEXTOS_COMPLETOS', 
        label: 'Textos Completos',
        description: 'Texto integral de decretos, leis, portarias e editais'
      },
      { 
        value: 'CONTRATOS_LICITACOES', 
        label: 'Contratos e Licitações',
        description: 'Extratos de contratos com valores, empresas e CNPJs'
      }
    ]
  },
  {
    value: 'FINANCEIRO',
    label: 'Financeiro',
    description: 'Documentos financeiros e orçamentários',
    subdomains: [
      { value: 'ORCAMENTO', label: 'Orçamento' },
      { value: 'PRESTACAO_CONTAS', label: 'Prestação de Contas' },
      { value: 'RELATORIOS_FINANCEIROS', label: 'Relatórios Financeiros' },
      { value: 'TRANSFERENCIAS', label: 'Transferências de Recursos' },
    ],
  },
  {
    value: 'INFRAESTRUTURA',
    label: 'Infraestrutura',
    description: 'Documentos sobre estrutura física e recursos',
    subdomains: [
      { value: 'PREDIOS', label: 'Prédios e Instalações' },
      { value: 'EQUIPAMENTOS', label: 'Equipamentos' },
      { value: 'MANUTENCAO', label: 'Manutenção' },
      { value: 'PATRIMONIO', label: 'Patrimônio' },
    ],
  },
  {
    value: 'OUTROS',
    label: 'Outros',
    description: 'Documentos que não se encaixam nas categorias acima',
    subdomains: [
      { value: 'DIVERSOS', label: 'Diversos' },
      { value: 'TEMPORARIOS', label: 'Temporários' },
      { value: 'ARQUIVADOS', label: 'Arquivados' },
    ],
  },
];

/**
 * Função auxiliar para obter subdomínios de um domínio específico
 */
export const getSubdomainsByDomain = (domain: string): SubdomainOption[] => {
  const category = DOCUMENT_DOMAINS.find((d) => d.value === domain);
  return category?.subdomains || [];
};

/**
 * Função auxiliar para obter label de um domínio
 */
export const getDomainLabel = (domain: string): string => {
  const category = DOCUMENT_DOMAINS.find((d) => d.value === domain);
  return category?.label || domain;
};

/**
 * Função auxiliar para obter label de um subdomínio
 */
export const getSubdomainLabel = (domain: string, subdomain: string): string => {
  const category = DOCUMENT_DOMAINS.find((d) => d.value === domain);
  const sub = category?.subdomains.find((s) => s.value === subdomain);
  return sub?.label || subdomain;
};
