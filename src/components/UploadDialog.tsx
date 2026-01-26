import { useState, useCallback } from "react";
import { Upload, FileText, X, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: FileList, options: UploadOptions) => void;
}

interface UploadOptions {
  category: string;
  isOfficial: boolean;
  version: string;
}

const CATEGORIES = [
  "Indicadores Educacionais",
  "Infraestrutura",
  "Recursos Humanos",
  "Financeiro",
  "Normativo",
  "Planos e Projetos",
  "Relatórios",
  "Outros",
];

export function UploadDialog({ open, onOpenChange, onUpload }: UploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [options, setOptions] = useState<UploadOptions>({
    category: "Indicadores Educacionais",
    isOfficial: false,
    version: "1.0",
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
    }
  };

  const handleUpload = async () => {
    if (!files) return;
    setIsUploading(true);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onUpload(files, options);
    setIsUploading(false);
    setFiles(null);
    onOpenChange(false);
  };

  const acceptedTypes = ".pdf,.docx,.xlsx,.csv,.txt";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Enviar Documentos</DialogTitle>
          <DialogDescription>
            Faça upload de documentos para análise. Formatos aceitos: PDF, DOCX, XLSX, CSV, TXT.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
              isDragging 
                ? "border-accent bg-accent/5" 
                : "border-border hover:border-accent/50 hover:bg-secondary/30",
              files && "border-success bg-success/5"
            )}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept={acceptedTypes}
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            
            {files ? (
              <div className="space-y-2">
                <Check className="w-10 h-10 mx-auto text-success" />
                <p className="text-sm font-medium text-success">
                  {files.length} arquivo(s) selecionado(s)
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from(files).map((file, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-xs rounded-full"
                    >
                      <FileText className="w-3 h-3" />
                      {file.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, XLSX, CSV, TXT (máx. 50MB)
                </p>
              </>
            )}
          </div>

          {/* Options */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={options.category}
                  onValueChange={(value) => setOptions(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Versão</Label>
                <Input
                  id="version"
                  value={options.version}
                  onChange={(e) => setOptions(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="official"
                checked={options.isOfficial}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, isOfficial: checked as boolean }))
                }
              />
              <Label htmlFor="official" className="text-sm font-normal cursor-pointer">
                Marcar como documento oficial/vigente
              </Label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!files || isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Enviar Documentos
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
