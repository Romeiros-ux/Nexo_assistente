import { useState } from "react";
import { ChatMessage, ResponseSection, DocumentSource } from "@/types/document";

// Simulated AI responses for demo
const generateMockResponse = (query: string, documentNames: string[]): { sections: ResponseSection[]; sources: DocumentSource[] } => {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes("evasão") || lowerQuery.includes("abandono")) {
    return {
      sections: [
        {
          type: "summary",
          title: "📌 Resumo Executivo",
          content: "A análise dos dados de evasão escolar da rede municipal revela uma tendência de redução nos últimos 3 anos, passando de 4,2% em 2021 para 2,8% em 2023. No entanto, 12 escolas ainda apresentam índices acima da média municipal e requerem atenção prioritária.",
        },
        {
          type: "data",
          title: "📊 Dados Extraídos",
          content: "Evolução da taxa de evasão escolar na rede municipal:",
          chartData: [
            { name: "2021", value: 4.2 },
            { name: "2022", value: 3.5 },
            { name: "2023", value: 2.8 },
          ],
        },
        {
          type: "analysis",
          title: "📈 Análise Técnica",
          content: "• Redução de 33% na taxa de evasão em 3 anos\n• Anos finais do Ensino Fundamental concentram 68% dos casos\n• Principais fatores identificados: defasagem idade-série (42%), dificuldades socioeconômicas (35%), baixo engajamento familiar (23%)\n• Escolas da zona rural apresentam índices 40% superiores à média",
        },
        {
          type: "action-plan",
          title: "🛠 Plano de Ação Sugerido",
          content: "1. Implementar programa de busca ativa nas 12 escolas prioritárias\n2. Ampliar oferta de reforço escolar para estudantes com defasagem\n3. Fortalecer articulação com CRAS para suporte às famílias vulneráveis\n4. Criar indicadores de alerta precoce para identificação de risco\n5. Capacitar equipes escolares em estratégias de engajamento",
        },
        {
          type: "risks",
          title: "⚠️ Riscos e Alertas",
          content: "• 3 escolas apresentaram aumento na evasão no último trimestre\n• Dados de frequência incompletos em 5% das unidades\n• Necessário atualizar cadastro de alunos transferidos",
        },
      ],
      sources: documentNames.slice(0, 3).map((name, idx) => ({
        documentId: `${idx + 1}`,
        documentName: name,
        page: Math.floor(Math.random() * 50) + 1,
      })),
    };
  }

  if (lowerQuery.includes("ideb") || lowerQuery.includes("desempenho")) {
    return {
      sections: [
        {
          type: "summary",
          title: "📌 Resumo Executivo",
          content: "O IDEB da rede municipal atingiu 5,8 em 2023, superando a meta projetada de 5,5. Das 45 escolas avaliadas, 32 atingiram ou superaram suas metas individuais. O resultado coloca o município entre os 15% melhores do estado.",
        },
        {
          type: "data",
          title: "📊 Comparativo IDEB por Etapa",
          content: "Resultados IDEB 2023 por segmento:",
          chartData: [
            { name: "Anos Iniciais", value: 6.2 },
            { name: "Anos Finais", value: 5.4 },
            { name: "Meta 2023", value: 5.5 },
            { name: "Média Estado", value: 5.1 },
          ],
        },
        {
          type: "analysis",
          title: "📈 Análise Técnica",
          content: "• Crescimento de 0,4 pontos em relação a 2021\n• Anos Iniciais: desempenho 15% acima da média estadual\n• Anos Finais: 3 escolas abaixo da meta necessitam intervenção\n• Língua Portuguesa apresentou maior evolução (+12%)\n• Matemática requer atenção especial nos anos finais",
        },
        {
          type: "action-plan",
          title: "🛠 Plano de Ação Sugerido",
          content: "1. Fortalecer programa de alfabetização na idade certa\n2. Implementar laboratório de matemática nas escolas prioritárias\n3. Expandir formação continuada em metodologias ativas\n4. Criar rede de tutoria entre escolas de alto e baixo desempenho\n5. Revisar currículo de matemática dos anos finais",
        },
      ],
      sources: documentNames.slice(0, 2).map((name, idx) => ({
        documentId: `${idx + 1}`,
        documentName: name,
        page: Math.floor(Math.random() * 30) + 1,
      })),
    };
  }

  if (lowerQuery.includes("infraestrutura") || lowerQuery.includes("escola")) {
    return {
      sections: [
        {
          type: "summary",
          title: "📌 Resumo Executivo",
          content: "O diagnóstico de infraestrutura identificou que 78% das escolas estão em condições adequadas, 15% necessitam de reformas moderadas e 7% requerem intervenções urgentes. O investimento estimado para adequação total é de R$ 12,5 milhões.",
        },
        {
          type: "data",
          title: "📊 Situação da Infraestrutura",
          content: "Distribuição das escolas por condição:",
          chartData: [
            { name: "Adequada", value: 78 },
            { name: "Reforma Moderada", value: 15 },
            { name: "Urgente", value: 7 },
          ],
        },
        {
          type: "analysis",
          title: "📈 Análise Técnica",
          content: "• 3 escolas com problemas estruturais críticos\n• 45% das unidades sem acessibilidade completa\n• Laboratórios de informática: 60% funcionais\n• Quadras esportivas: 72% em bom estado\n• Bibliotecas: 85% com acervo atualizado",
        },
        {
          type: "action-plan",
          title: "🛠 Plano de Ação Sugerido",
          content: "1. Priorizar reforma das 3 escolas em situação crítica (R$ 3,2M)\n2. Implementar plano de acessibilidade em 2 anos\n3. Renovar laboratórios de informática defasados\n4. Estabelecer cronograma de manutenção preventiva\n5. Buscar parcerias para captação de recursos",
        },
      ],
      sources: documentNames.slice(0, 2).map((name, idx) => ({
        documentId: `${idx + 1}`,
        documentName: name,
        page: Math.floor(Math.random() * 40) + 1,
      })),
    };
  }

  // Default response for unmatched queries
  return {
    sections: [
      {
        type: "summary",
        title: "📌 Resposta",
        content: "Não foi encontrada informação suficiente nos documentos enviados para responder completamente à sua pergunta. Por favor, verifique se os documentos relevantes estão selecionados ou reformule sua consulta com termos mais específicos.",
      },
      {
        type: "sources",
        title: "📚 Documentos Consultados",
        content: `Foram analisados ${documentNames.length} documento(s), mas não foram encontrados dados específicos sobre o tema solicitado.`,
      },
    ],
    sources: documentNames.map((name, idx) => ({
      documentId: `${idx + 1}`,
      documentName: name,
    })),
  };
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string, documentNames: string[]) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Generate mock response
    const { sections, sources } = generateMockResponse(content, documentNames);
    
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      sections,
      sources,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
