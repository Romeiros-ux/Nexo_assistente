import { useState } from "react";
import { 
  FileText, 
  Upload, 
  Check, 
  X, 
  FileSpreadsheet, 
  File,
  MoreVertical,
  Trash2,
  Eye,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
 import { useAuth } from "@/contexts/AuthContext";
import { Document } from "@/types/document";
import { cn } from "@/lib/utils";

interface DocumentPanelProps {
  documents: Document[];
  selectedDocuments: string[];
  onSelectDocument: (id: string) => void;
  onUpload: () => void;
}

const getFileIcon = (type: Document['type']) => {
  switch (type) {
    case 'pdf':
      return <FileText className="w-4 h-4 text-destructive" />;
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="w-4 h-4 text-success" />;
    case 'docx':
      return <FileText className="w-4 h-4 text-primary" />;
    default:
      return <File className="w-4 h-4 text-muted-foreground" />;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export function DocumentPanel({ 
  documents, 
  selectedDocuments, 
  onSelectDocument,
  onUpload 
}: DocumentPanelProps) {
   const { userContext } = useAuth();
  const activeCount = documents.filter(d => d.status === 'active').length;

  return (
    <div className="card-elevated h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-serif font-semibold text-foreground">Documentos</h2>
            <p className="text-xs text-muted-foreground">
              {activeCount} ativo{activeCount !== 1 ? 's' : ''} de {documents.length}
            </p>
          </div>
           {userContext?.canUploadDocuments ? (
          <Button onClick={onUpload} size="sm" className="gap-1.5">
            <Upload className="w-4 h-4" />
            Enviar
          </Button>
           ) : (
             <span className="text-xs text-muted-foreground italic">Somente TI</span>
           )}
        </div>
        
        {/* Selection info */}
        {selectedDocuments.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-accent">
            <Check className="w-3 h-3" />
            {selectedDocuments.length} selecionado{selectedDocuments.length !== 1 ? 's' : ''} para consulta
          </div>
        )}
      </div>

      {/* Document List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer hover:bg-secondary/50",
                selectedDocuments.includes(doc.id) && "bg-accent/10 border border-accent/20"
              )}
              onClick={() => onSelectDocument(doc.id)}
            >
              <Checkbox
                checked={selectedDocuments.includes(doc.id)}
                onCheckedChange={() => onSelectDocument(doc.id)}
                className="mt-0.5"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(doc.type)}
                    <span className="text-sm font-medium truncate text-foreground">
                      {doc.name}
                    </span>
                  </div>
                  
                   {userContext?.canUploadDocuments && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Eye className="w-4 h-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-destructive">
                        <Trash2 className="w-4 h-4" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                   )}
                </div>
                
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {doc.isOfficial && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                      Oficial
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      doc.status === 'active' ? "status-active" : "status-inactive"
                    )}
                  >
                    {doc.status === 'active' ? 'Ativo' : doc.status === 'processing' ? 'Processando' : 'Inativo'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    v{doc.version}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>{formatFileSize(doc.size)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(doc.uploadedAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
