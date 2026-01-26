import { 
  FileText, 
  BarChart3, 
  Lightbulb, 
  AlertTriangle,
  BookOpen,
  TrendingUp
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatMessage, ResponseSection } from "@/types/document";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import ReactMarkdown from "react-markdown";
import logoImage from "@/assets/logo.png";

interface ResponseDisplayProps {
  message: ChatMessage;
}

const CHART_COLORS = [
  'hsl(175, 50%, 40%)',
  'hsl(210, 60%, 35%)',
  'hsl(40, 90%, 50%)',
  'hsl(0, 70%, 50%)',
  'hsl(280, 50%, 50%)',
];

const getSectionIcon = (type: ResponseSection['type']) => {
  switch (type) {
    case 'summary':
      return <FileText className="w-4 h-4" />;
    case 'data':
      return <BarChart3 className="w-4 h-4" />;
    case 'analysis':
      return <TrendingUp className="w-4 h-4" />;
    case 'action-plan':
      return <Lightbulb className="w-4 h-4" />;
    case 'risks':
      return <AlertTriangle className="w-4 h-4" />;
    case 'sources':
      return <BookOpen className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getSectionColor = (type: ResponseSection['type']) => {
  switch (type) {
    case 'summary':
      return 'text-primary border-primary/20 bg-primary/5';
    case 'data':
      return 'text-accent border-accent/20 bg-accent/5';
    case 'analysis':
      return 'text-primary border-primary/20 bg-primary/5';
    case 'action-plan':
      return 'text-success border-success/20 bg-success/5';
    case 'risks':
      return 'text-warning border-warning/20 bg-warning/5';
    case 'sources':
      return 'text-muted-foreground border-border bg-muted/30';
    default:
      return 'text-foreground border-border bg-card';
  }
};

export function ResponseDisplay({ message }: ResponseDisplayProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message with structured response
  if (message.sections && message.sections.length > 0) {
    return (
      <div className="mb-6 animate-slide-up">
        <div className="flex items-center gap-2 mb-3">
          <img 
            src={logoImage} 
            alt="Nexo" 
            className="w-8 h-8 object-contain"
          />
          <span className="text-xs text-muted-foreground">
            Resposta gerada com base em {message.sources?.length || 0} documento(s)
          </span>
        </div>

        <div className="space-y-4 ml-10">
          {message.sections.map((section, index) => (
            <Card 
              key={index} 
              className={`response-section ${getSectionColor(section.type)} animate-slide-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                {getSectionIcon(section.type)}
                <h3 className="font-serif font-semibold text-sm">{section.title}</h3>
              </div>
              
              {/* Content */}
              <div className="text-sm text-foreground/90 prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>

              {/* Chart if available */}
              {section.chartData && section.chartData.length > 0 && (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {section.type === 'data' && section.chartData.length <= 5 ? (
                      <PieChart>
                        <Pie
                          data={section.chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {section.chartData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    ) : (
                      <BarChart data={section.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(175, 50%, 40%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          ))}

          {/* Source references */}
          {message.sources && message.sources.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {message.sources.map((source, idx) => (
                <Badge key={idx} variant="outline" className="source-badge">
                  <FileText className="w-3 h-3" />
                  {source.documentName}
                  {source.page && <span className="text-muted-foreground">p. {source.page}</span>}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Simple text response
  return (
    <div className="mb-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <img 
          src={logoImage} 
          alt="Nexo" 
          className="w-8 h-8 object-contain shrink-0"
        />
        <div className="bg-secondary rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
          <div className="text-sm text-foreground prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
