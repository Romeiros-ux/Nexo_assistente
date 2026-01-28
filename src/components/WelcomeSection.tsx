import React, { forwardRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, AlertTriangle, FileText, Lightbulb, TrendingUp, MapPin } from 'lucide-react';
import Mascot from './Mascot';

interface WelcomeSectionProps {
  onSuggestionClick?: (suggestion: string) => void;
}

const WelcomeSection = forwardRef<HTMLDivElement, WelcomeSectionProps>(({ onSuggestionClick }, ref) => {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const suggestions = [
    {
      icon: BarChart3,
      title: 'Analisar indicadores educacionais',
      subtitle: 'Veja dados, tendências e comparativos',
      query: 'Quero analisar os principais indicadores educacionais do município',
    },
    {
      icon: AlertTriangle,
      title: 'Identificar urgências e carências',
      subtitle: 'Mapeamento automático de prioridades',
      query: 'Quais escolas ou regiões precisam de atenção urgente?',
    },
    {
      icon: Lightbulb,
      title: 'Gerar plano de ação',
      subtitle: 'Sugestões estratégicas personalizadas',
      query: 'Gere um plano de ação para melhorar os resultados educacionais',
    },
    {
      icon: FileText,
      title: 'Consultar documentos oficiais',
      subtitle: 'Baseado nos arquivos institucionais',
      query: 'Quais são as principais diretrizes do último documento oficial?',
    },
    {
      icon: TrendingUp,
      title: 'Projeções e cenários',
      subtitle: 'Análise preditiva e simulações',
      query: 'Faça uma projeção dos indicadores para o próximo semestre',
    },
    {
      icon: MapPin,
      title: 'Análise por região',
      subtitle: 'Dados geográficos e territoriais',
      query: 'Mostre uma análise comparativa por região do município',
    },
  ];

  const handleSuggestionClick = (query: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(query);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'Usuário';

  return (
    <div ref={ref} className="flex flex-col items-center py-6 md:py-10 px-4 animate-fade-in">
      {/* Hero Card with Mascot and First Message */}
      <div className="card-premium-lg p-6 md:p-10 max-w-4xl w-full mb-6">
        <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
          {/* Mascot */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <Mascot size="xl" />
          </div>
          
          {/* AI First Message */}
          <div className="flex-1">
            {/* Greeting */}
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4 animate-fade-in-up">
              {getGreeting()}, {firstName}.
            </h1>
            
            {/* Positioning */}
            <p className="text-base text-muted-foreground leading-relaxed mb-5 animate-fade-in-up stagger-1">
              Sou o assistente de inteligência artificial da Secretaria de Educação. 
              Estou aqui para ajudar você a analisar informações, identificar necessidades, 
              visualizar dados e apoiar decisões estratégicas.
            </p>

            {/* Capabilities */}
            <div className="mb-6 animate-fade-in-up stagger-2">
              <p className="text-sm font-medium text-foreground mb-3">
                Posso ajudar você a:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Analisar indicadores educacionais',
                  'Identificar carências e urgências',
                  'Gerar projeções e planos de ação',
                  'Consultar documentos autorizados',
                  'Apresentar gráficos e infográficos',
                  'Comparar períodos e regiões',
                ].map((capability, index) => (
                  <li 
                    key={index} 
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {capability}
                  </li>
                ))}
              </ul>
            </div>

            {/* Call to Action */}
            <p className="text-lg font-medium text-foreground animate-fade-in-up stagger-3">
              O que você gostaria de analisar agora?
            </p>
          </div>
        </div>
      </div>

      {/* Suggestion Cards */}
      <div className="w-full max-w-4xl">
        <p className="text-xs text-muted-foreground mb-3 px-1 uppercase tracking-wide font-medium">
          Ações sugeridas
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion.query)}
              className="cta-card card-glow text-left group opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.3 + index * 0.06}s`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start gap-3">
                <div className="cta-card-icon flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <suggestion.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm mb-0.5 leading-tight">
                    {suggestion.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {suggestion.subtitle}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

WelcomeSection.displayName = 'WelcomeSection';

export default WelcomeSection;
