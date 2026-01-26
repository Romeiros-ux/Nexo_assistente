export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt';
  size: number;
  uploadedAt: Date;
  status: 'active' | 'inactive' | 'processing';
  version: string;
  isOfficial: boolean;
  category: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
  sections?: ResponseSection[];
}

export interface DocumentSource {
  documentId: string;
  documentName: string;
  page?: number;
  excerpt?: string;
}

export interface ResponseSection {
  type: 'summary' | 'data' | 'analysis' | 'action-plan' | 'risks' | 'sources' | 'references';
  title: string;
  content: string;
  chartData?: ChartDataPoint[];
}

export interface ChartDataPoint {
  name: string;
  value: number;
  category?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'administrador' | 'tecnico_pedagogico' | 'gestor_escolar' | 'analista_dados';
  email: string;
}

export interface QueryLog {
  id: string;
  userId: string;
  query: string;
  documentsUsed: string[];
  timestamp: Date;
  responseTime: number;
}
