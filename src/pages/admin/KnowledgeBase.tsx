/**
 * Knowledge Base Page - REAL INTEGRATION
 * 
 * Gerenciamento de Documentos Institucionais
 * - Upload REAL via document.service
 * - Lista REAL de documentos
 * - Ativação/Desativação/Exclusão (TI apenas)
 * - Download via signed URLs
 * - Filtros por tipo, status e busca
 * 
 * ⚠️ IMPORTANTE: Sem mocks. Tudo real.
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  FileText, 
  Trash2, 
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  FileSpreadsheet,
  File,
  Filter,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import documentService, { 
  Document, 
  DocumentType, 
  DocumentStatus,
  DocumentUploadRequest,
  DocumentUpdateRequest
} from '@/services/document.service';
import { DOCUMENT_DOMAINS, getSubdomainsByDomain, getDomainLabel, getSubdomainLabel } from '@/constants/documentCategories';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getStatusBadge = (status: DocumentStatus) => {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Ativo
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          <Clock className="w-3 h-3 mr-1" />
          Pendente
        </Badge>
      );
    case 'INACTIVE':
      return (
        <Badge variant="secondary">
          <AlertCircle className="w-3 h-3 mr-1" />
          Inativo
        </Badge>
      );
    case 'ARCHIVED':
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Arquivado
        </Badge>
      );
    default:
      return <Badge variant="outline">Desconhecido</Badge>;
  }
};

const getDocumentTypeLabel = (type: DocumentType): string => {
  const labels: Record<DocumentType, string> = {
    NORM: 'Norma',
    LAW: 'Lei',
    RESOLUTION: 'Resolução',
    DIRECTIVE: 'Portaria',
    MANUAL: 'Manual',
    REPORT: 'Relatório',
    OTHER: 'Outro'
  };
  return labels[type];
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) {
    return <File className="w-5 h-5 text-muted-foreground" />;
  }
  if (fileType.includes('pdf')) {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
    return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  }
  return <File className="w-5 h-5 text-muted-foreground" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const isTI = user?.role === 'TI' || user?.role === 'SECRETARIA';
  const isComissao = user?.role === 'COMISSAO';
  const canUpload = isTI || isComissao;
  const canManage = isTI;

  // Debug permissions
  console.log('🔐 Knowledge Base Permissions:', {
    user: user?.name,
    role: user?.role,
    isTI,
    isComissao,
    canUpload,
    canManage
  });

  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  
  // Novo: controle de tipo de upload (arquivo ou URL)
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | 'ALL'>('ALL');
  
  // Upload form
  const [uploadData, setUploadData] = useState<Omit<DocumentUploadRequest, 'file'>>({
    name: '',
    description: '',
    document_type: 'OTHER',
    official_number: '',
    publication_date: '',
    effective_date: '',
    is_public: true,
    requires_authorization: false,
    source_url: '', // Novo campo para URL
    is_url: false, // Novo campo indicador
    // Novos campos de estruturação
    domain: '',
    subdomain: '',
    metadata_year: new Date().getFullYear(),
    unit_name: '',
    unit_id: '',
    document_version: '1.0',
    approved_date: '',
    tags: [], // Novo campo de tags
    authorized_profiles: [] // Novo campo de perfis autorizados
  });

  // Edit form
  const [editData, setEditData] = useState<DocumentUpdateRequest>({});

  // ==========================================
  // CHECK AUTHENTICATION
  // ==========================================
  useEffect(() => {
    console.log('🔍 AuthContext State:', {
      user,
      hasUser: !!user,
      role: user?.role,
      localStorage_token: !!localStorage.getItem('token'),
      localStorage_user: !!localStorage.getItem('user')
    });
    
    if (!user) {
      console.warn('⚠️ Usuário não está autenticado!');
    }
  }, [user]);

  // ==========================================
  // LOAD DOCUMENTS
  // ==========================================
  
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentService.getAll();
      setDocuments(docs || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]); // Garantir array vazio em caso de erro
      toast({
        title: 'Erro ao carregar documentos',
        description: 'Não foi possível carregar a lista de documentos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // ==========================================
  // UPLOAD DOCUMENT
  // ==========================================
  
  const handleUpload = async () => {
    // Validação diferente dependendo do tipo
    if (uploadType === 'file' && !selectedFile) {
      toast({
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, selecione um arquivo para fazer upload',
        variant: 'destructive'
      });
      return;
    }

    if (uploadType === 'url' && !uploadData.source_url) {
      toast({
        title: 'URL não informada',
        description: 'Por favor, cole o endereço do site',
        variant: 'destructive'
      });
      return;
    }

    if (!uploadData.name || !uploadData.document_type) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e o tipo do documento',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploading(true);
      
      await documentService.upload({
        file: uploadType === 'file' ? selectedFile : undefined,
        ...uploadData
      });

      toast({
        title: uploadType === 'url' ? 'Site cadastrado com sucesso!' : 'Upload realizado com sucesso!',
        description: uploadType === 'url' 
          ? 'O site foi cadastrado e está pendente de aprovação.'
          : 'O documento foi enviado e está pendente de aprovação.'
      });

      // Reset form
      setSelectedFile(null);
      setUploadType('file');
      setUploadData({
        name: '',
        description: '',
        document_type: 'OTHER',
        official_number: '',
        publication_date: '',
        effective_date: '',
        is_public: true,
        requires_authorization: false,
        source_url: '',
        is_url: false,
        domain: '',
        subdomain: '',
        metadata_year: new Date().getFullYear(),
        unit_name: '',
        unit_id: '',
        document_version: '1.0',
        approved_date: '',
        tags: [],
        authorized_profiles: []
      });
      setIsUploadDialogOpen(false);

      // Reload list
      await loadDocuments();
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: error.response?.data?.message || 'Não foi possível fazer upload do documento',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  // ==========================================
  // ACTIVATE DOCUMENT
  // ==========================================
  
  const handleActivate = async (id: string) => {
    try {
      await documentService.activate(id);
      toast({
        title: 'Documento ativado',
        description: 'O documento está agora disponível para uso'
      });
      await loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Erro ao ativar',
        description: error.response?.data?.message || 'Não foi possível ativar o documento',
        variant: 'destructive'
      });
    }
  };

  // ==========================================
  // DEACTIVATE DOCUMENT
  // ==========================================
  
  const handleDeactivate = async (id: string) => {
    try {
      await documentService.deactivate(id);
      toast({
        title: 'Documento desativado',
        description: 'O documento não estará mais disponível para uso'
      });
      await loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Erro ao desativar',
        description: error.response?.data?.message || 'Não foi possível desativar o documento',
        variant: 'destructive'
      });
    }
  };

  // ==========================================
  // DELETE DOCUMENT (SOFT)
  // ==========================================
  
  const handleDelete = async (id: string) => {
    try {
      await documentService.delete(id);
      toast({
        title: 'Documento arquivado',
        description: 'O documento foi movido para o arquivo'
      });
      setDeleteDocumentId(null);
      await loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Erro ao arquivar',
        description: error.response?.data?.message || 'Não foi possível arquivar o documento',
        variant: 'destructive'
      });
    }
  };

  // ==========================================
  // DOWNLOAD DOCUMENT
  // ==========================================
  
  const handleDownload = async (id: string) => {
    try {
      await documentService.download(id);
      toast({
        title: 'Download iniciado',
        description: 'O documento será aberto em uma nova aba'
      });
    } catch (error: any) {
      toast({
        title: 'Erro no download',
        description: error.response?.data?.message || 'Não foi possível baixar o documento',
        variant: 'destructive'
      });
    }
  };

  // ==========================================
  // EDIT DOCUMENT
  // ==========================================
  
  const handleOpenEdit = (doc: Document) => {
    setEditingDocument(doc);
    setEditData({
      name: doc.name,
      description: doc.description,
      document_type: doc.document_type,
      official_number: doc.official_number,
      publication_date: doc.publication_date,
      effective_date: doc.effective_date,
      is_public: doc.is_public,
      requires_authorization: doc.requires_authorization,
      domain: doc.domain || '',
      subdomain: doc.subdomain || '',
      metadata_year: doc.metadata_year || new Date().getFullYear(),
      unit_name: doc.unit_name || '',
      unit_id: doc.unit_id || '',
      document_version: doc.document_version || '1.0',
      approved_date: doc.approved_date || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDocument) return;

    try {
      await documentService.update(editingDocument.id, editData);
      toast({
        title: 'Documento atualizado',
        description: 'As informações do documento foram atualizadas com sucesso'
      });
      setIsEditDialogOpen(false);
      setEditingDocument(null);
      setEditData({});
      await loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.response?.data?.message || 'Não foi possível atualizar o documento',
        variant: 'destructive'
      });
    }
  };

  // ==========================================
  // FILTERED DOCUMENTS
  // ==========================================
  
  const filteredDocuments = documents.filter(doc => {
    // Verificação de segurança
    if (!doc) return false;
    
    // Search filter
    const matchesSearch = searchTerm === '' || 
      (doc.name && doc.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Type filter
    const matchesType = filterType === 'ALL' || doc.document_type === filterType;
    
    // Status filter
    const matchesStatus = filterStatus === 'ALL' || doc.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // ==========================================
  // STATS
  // ==========================================
  
  const totalDocuments = documents.length;
  const activeDocuments = documents.filter(d => d.status === 'ACTIVE').length;
  const pendingDocuments = documents.filter(d => d.status === 'PENDING').length;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
            <Database className="w-7 h-7 text-primary" />
            Base de Conhecimento Institucional
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os documentos institucionais que compõem a base de conhecimento.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-premium p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalDocuments}</p>
                <p className="text-sm text-muted-foreground">Total de Documentos</p>
              </div>
            </div>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeDocuments}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingDocuments}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-accent/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">ℹ️ Status dos Documentos:</strong>
            {' '}Documentos com status <strong>ATIVO</strong> estão disponíveis para consulta. 
            Documentos <strong>PENDENTES</strong> aguardam aprovação da TI. 
            Documentos <strong>INATIVOS</strong> ou <strong>ARQUIVADOS</strong> não são utilizados.
          </p>
        </div>

        {/* Filters and Upload Button */}
        <div className="card-premium p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(value) => setFilterType(value as DocumentType | 'ALL')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                <SelectItem value="NORM">Norma</SelectItem>
                <SelectItem value="LAW">Lei</SelectItem>
                <SelectItem value="RESOLUTION">Resolução</SelectItem>
                <SelectItem value="DIRECTIVE">Portaria</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="REPORT">Relatório</SelectItem>
                <SelectItem value="OTHER">Outro</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as DocumentStatus | 'ALL')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="INACTIVE">Inativo</SelectItem>
                <SelectItem value="ARCHIVED">Arquivado</SelectItem>
              </SelectContent>
            </Select>

            {/* Upload Button */}
            {canUpload && (
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="institutional-gradient shrink-0">
                    <Upload className="w-4 h-4 mr-2" />
                    Adicionar Documento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display">Upload de Documento</DialogTitle>
                    <DialogDescription>
                      Envie um documento institucional para a base de conhecimento. 
                      Preencha os campos de categorização para que o assistente de IA encontre o documento nas buscas corretas.
                      Campos com * são obrigatórios.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 mt-4">
                    {/* Tipo de Upload: Arquivo ou URL */}
                    <div className="space-y-2">
                      <Label>Tipo de Documento *</Label>
                      <Select
                        value={uploadType}
                        onValueChange={(value: 'file' | 'url') => {
                          setUploadType(value);
                          setUploadData({ ...uploadData, is_url: value === 'url' });
                          if (value === 'url') setSelectedFile(null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="file">📄 Arquivo (PDF, DOC, Excel, etc.)</SelectItem>
                          <SelectItem value="url">🌐 Link de Site (URL)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Escolha se vai fazer upload de um arquivo ou cadastrar um link de site
                      </p>
                    </div>

                    {/* File Input - Somente se tipo = arquivo */}
                    {uploadType === 'file' && (
                      <div className="space-y-2">
                        <Label>Arquivo *</Label>
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.xlsx,.xls,.md,.txt"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">
                          Formatos aceitos: PDF, DOC, DOCX, Excel, MD, TXT (máx. 50 MB)
                        </p>
                      </div>
                    )}

                    {/* URL Input - Somente se tipo = URL */}
                    {uploadType === 'url' && (
                      <div className="space-y-2">
                        <Label>URL do Site *</Label>
                        <Input
                          type="url"
                          value={uploadData.source_url || ''}
                          onChange={(e) => setUploadData({ ...uploadData, source_url: e.target.value })}
                          placeholder="https://exemplo.com.br/pagina"
                        />
                        <p className="text-xs text-muted-foreground">
                          Cole o endereço completo do site (ex: https://qedu.org.br/municipio/3305505-saquarema)
                        </p>
                      </div>
                    )}

                    {/* Name */}
                    <div className="space-y-2">
                      <Label>Nome do Documento *</Label>
                      <Input
                        value={uploadData.name}
                        onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                        placeholder={uploadType === 'url' ? "Ex: QEdu - Indicadores de Saquarema" : "Ex: Lei Municipal 123/2023"}
                      />
                      <p className="text-xs text-muted-foreground">
                        {uploadType === 'url' 
                          ? "Descreva o conteúdo do site (não apenas o nome do portal)"
                          : "Use o nome oficial completo do documento"}
                      </p>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={uploadData.description}
                        onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                        placeholder="Breve descrição do documento..."
                        rows={3}
                      />
                    </div>

                    {/* Type and Official Number */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select
                          value={uploadData.document_type}
                          onValueChange={(value) => setUploadData({ ...uploadData, document_type: value as DocumentType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NORM">Norma</SelectItem>
                            <SelectItem value="LAW">Lei</SelectItem>
                            <SelectItem value="RESOLUTION">Resolução</SelectItem>
                            <SelectItem value="DIRECTIVE">Portaria</SelectItem>
                            <SelectItem value="MANUAL">Manual</SelectItem>
                            <SelectItem value="REPORT">Relatório</SelectItem>
                            <SelectItem value="OTHER">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Número Oficial</Label>
                        <Input
                          value={uploadData.official_number}
                          onChange={(e) => setUploadData({ ...uploadData, official_number: e.target.value })}
                          placeholder="Ex: 123/2023"
                        />
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data de Publicação</Label>
                        <Input
                          type="date"
                          value={uploadData.publication_date}
                          onChange={(e) => setUploadData({ ...uploadData, publication_date: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Data de Vigência</Label>
                        <Input
                          type="date"
                          value={uploadData.effective_date}
                          onChange={(e) => setUploadData({ ...uploadData, effective_date: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label>Tags (separadas por vírgula)</Label>
                      <Input
                        value={uploadData.tags?.join(', ') || ''}
                        onChange={(e) => setUploadData({ 
                          ...uploadData, 
                          tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                        })}
                        placeholder="Ex: funcionarios, rh, cadastro, folha-pagamento, confidencial"
                      />
                      <p className="text-xs text-muted-foreground">
                        Palavras-chave que ajudam o assistente a encontrar este documento. Separe com vírgulas.
                      </p>
                    </div>

                    {/* Visibility */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Documento Público</Label>
                          <p className="text-xs text-muted-foreground">
                            Permite acesso a todos os usuários autenticados
                          </p>
                        </div>
                        <Switch
                          checked={uploadData.is_public}
                          onCheckedChange={(checked) => setUploadData({ ...uploadData, is_public: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Requer Autorização Especial</Label>
                          <p className="text-xs text-muted-foreground">
                            Somente usuários com permissão específica podem acessar
                          </p>
                        </div>
                        <Switch
                          checked={uploadData.requires_authorization}
                          onCheckedChange={(checked) => setUploadData({ ...uploadData, requires_authorization: checked })}
                        />
                      </div>

                      {/* Perfis Autorizados - Mostrar quando requires_authorization estiver marcado */}
                      {uploadData.requires_authorization && (
                        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                          <Label>Perfis com Acesso</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="profile-ti"
                                checked={uploadData.authorized_profiles?.includes('TI') || false}
                                onChange={(e) => {
                                  const profiles = uploadData.authorized_profiles || [];
                                  setUploadData({
                                    ...uploadData,
                                    authorized_profiles: e.target.checked
                                      ? [...profiles, 'TI']
                                      : profiles.filter(p => p !== 'TI')
                                  });
                                }}
                                className="rounded border-gray-300"
                              />
                              <label htmlFor="profile-ti" className="text-sm">TI - Tecnologia da Informação</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="profile-rh"
                                checked={uploadData.authorized_profiles?.includes('RH') || false}
                                onChange={(e) => {
                                  const profiles = uploadData.authorized_profiles || [];
                                  setUploadData({
                                    ...uploadData,
                                    authorized_profiles: e.target.checked
                                      ? [...profiles, 'RH']
                                      : profiles.filter(p => p !== 'RH')
                                  });
                                }}
                                className="rounded border-gray-300"
                              />
                              <label htmlFor="profile-rh" className="text-sm">RH - Recursos Humanos</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="profile-financeiro"
                                checked={uploadData.authorized_profiles?.includes('FINANCEIRO') || false}
                                onChange={(e) => {
                                  const profiles = uploadData.authorized_profiles || [];
                                  setUploadData({
                                    ...uploadData,
                                    authorized_profiles: e.target.checked
                                      ? [...profiles, 'FINANCEIRO']
                                      : profiles.filter(p => p !== 'FINANCEIRO')
                                  });
                                }}
                                className="rounded border-gray-300"
                              />
                              <label htmlFor="profile-financeiro" className="text-sm">Financeiro</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="profile-gestao"
                                checked={uploadData.authorized_profiles?.includes('GESTAO') || false}
                                onChange={(e) => {
                                  const profiles = uploadData.authorized_profiles || [];
                                  setUploadData({
                                    ...uploadData,
                                    authorized_profiles: e.target.checked
                                      ? [...profiles, 'GESTAO']
                                      : profiles.filter(p => p !== 'GESTAO')
                                  });
                                }}
                                className="rounded border-gray-300"
                              />
                              <label htmlFor="profile-gestao" className="text-sm">Gestão - Diretores e Coordenadores</label>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Selecione os perfis que podem acessar este documento confidencial
                          </p>
                        </div>
                      )}
                    </div>

                    {/* NOVOS CAMPOS DE ESTRUTURAÇÃO */}
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-semibold text-sm">Estruturação da Base de Conhecimento</h4>
                      <p className="text-xs text-muted-foreground">
                        Estes campos ajudam o assistente a encontrar informações mais precisas
                      </p>

                      {/* Domain e Subdomain */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Domínio</Label>
                          <Select
                            value={uploadData.domain}
                            onValueChange={(value) => {
                              setUploadData({ ...uploadData, domain: value, subdomain: '' });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um domínio" />
                            </SelectTrigger>
                            <SelectContent>
                              {DOCUMENT_DOMAINS.map((domain) => (
                                <SelectItem key={domain.value} value={domain.value}>
                                  {domain.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Subdomínio</Label>
                          <Select
                            value={uploadData.subdomain}
                            onValueChange={(value) => setUploadData({ ...uploadData, subdomain: value })}
                            disabled={!uploadData.domain}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um subdomínio" />
                            </SelectTrigger>
                            <SelectContent>
                              {uploadData.domain && getSubdomainsByDomain(uploadData.domain).map((sub) => (
                                <SelectItem key={sub.value} value={sub.value}>
                                  {sub.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Ano e Versão */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ano de Referência</Label>
                          <Input
                            type="number"
                            value={uploadData.metadata_year}
                            onChange={(e) => setUploadData({ ...uploadData, metadata_year: parseInt(e.target.value) })}
                            placeholder="Ex: 2026"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Versão do Documento</Label>
                          <Input
                            value={uploadData.document_version}
                            onChange={(e) => setUploadData({ ...uploadData, document_version: e.target.value })}
                            placeholder="Ex: 1.0, 2.1"
                          />
                        </div>
                      </div>

                      {/* Unidade Escolar */}
                      <div className="space-y-2">
                        <Label>Unidade Escolar</Label>
                        <Input
                          value={uploadData.unit_name}
                          onChange={(e) => setUploadData({ ...uploadData, unit_name: e.target.value })}
                          placeholder="Ex: Escola Municipal Centro, Secretaria de Educação"
                        />
                        <p className="text-xs text-muted-foreground">
                          Deixe em branco se o documento for geral (válido para todas as unidades)
                        </p>
                      </div>

                      {/* Data de Aprovação */}
                      <div className="space-y-2">
                        <Label>Data de Aprovação</Label>
                        <Input
                          type="date"
                          value={uploadData.approved_date}
                          onChange={(e) => setUploadData({ ...uploadData, approved_date: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleUpload} 
                      disabled={uploading || (uploadType === 'file' && !selectedFile) || (uploadType === 'url' && !uploadData.source_url)}
                      className="institutional-gradient"
                    >
                      {uploading ? 'Enviando...' : (uploadType === 'url' ? 'Cadastrar Site' : 'Fazer Upload')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Edit Document Dialog */}
            {(canManage || isComissao) && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Editar Documento</DialogTitle>
                    <DialogDescription>
                      Atualize as informações e categorização do documento para melhorar a precisão das buscas do assistente de IA.
                      Campos com * são obrigatórios.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Title */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Título *</Label>
                      <Input
                        id="edit-title"
                        value={editData.title || ''}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        placeholder="Ex: Lei Municipal 123/2024 - Plano de Educação"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use o nome oficial completo do documento
                      </p>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Descrição</Label>
                      <Textarea
                        id="edit-description"
                        value={editData.description || ''}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        placeholder="Ex: Estabelece diretrizes e metas para a educação municipal no período 2024-2034"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Resuma em 2-3 frases o conteúdo e finalidade do documento
                      </p>
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-type">Tipo *</Label>
                      <Select
                        value={editData.type || ''}
                        onValueChange={(value) => setEditData({ ...editData, type: value })}
                      >
                        <SelectTrigger id="edit-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EDITAL">Edital</SelectItem>
                          <SelectItem value="NORMATIVA">Normativa</SelectItem>
                          <SelectItem value="GUIA">Guia</SelectItem>
                          <SelectItem value="RELATORIO">Relatório</SelectItem>
                          <SelectItem value="FORMULARIO">Formulário</SelectItem>
                          <SelectItem value="OUTROS">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Formato do documento (Edital, Lei, Manual, etc.)
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-tags">Tags (separadas por vírgula)</Label>
                      <Input
                        id="edit-tags"
                        value={(editData.tags || []).join(', ')}
                        onChange={(e) => setEditData({ 
                          ...editData, 
                          tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                        })}
                        placeholder="Ex: matrícula, aluno, documentação, ensino fundamental"
                      />
                      <p className="text-xs text-muted-foreground">
                        Palavras-chave que facilitam a busca pelo assistente. Separe com vírgulas.
                      </p>
                    </div>

                    {/* URL do Site - Se for um link */}
                    {editingDocument?.is_url && (
                      <div className="space-y-2">
                        <Label htmlFor="edit-url">🌐 URL do Site</Label>
                        <Input
                          id="edit-url"
                          type="url"
                          value={editData.source_url || editingDocument?.source_url || ''}
                          onChange={(e) => setEditData({ ...editData, source_url: e.target.value })}
                          placeholder="https://exemplo.com.br/pagina"
                        />
                        <p className="text-xs text-muted-foreground">
                          Endereço completo do site. Este é um documento do tipo LINK.
                        </p>
                      </div>
                    )}

                    {/* Categorization Section */}
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-sm font-semibold mb-2">Categorização do Documento</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        A categorização ajuda o assistente a encontrar o documento certo para cada pergunta.
                      </p>
                      
                      {/* Domain */}
                      <div className="space-y-2 mb-4">
                        <Label htmlFor="edit-domain">Domínio</Label>
                        <Select
                          value={editData.domain || ''}
                          onValueChange={(value) => setEditData({ 
                            ...editData, 
                            domain: value,
                            subdomain: '' // Reset subdomain when domain changes
                          })}
                        >
                          <SelectTrigger id="edit-domain">
                            <SelectValue placeholder="Selecione a área temática principal" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_DOMAINS.map((domain) => (
                              <SelectItem key={domain.value} value={domain.value}>
                                {domain.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Área principal: Regulamentação (leis), Pedagógico (currículos), Calendário, Indicadores, etc.
                        </p>
                      </div>

                      {/* Subdomain (only if domain is selected) */}
                      {editData.domain && (
                        <div className="space-y-2 mb-4">
                          <Label htmlFor="edit-subdomain">Subdomínio</Label>
                          <Select
                            value={editData.subdomain || ''}
                            onValueChange={(value) => setEditData({ ...editData, subdomain: value })}
                          >
                            <SelectTrigger id="edit-subdomain">
                              <SelectValue placeholder="Especifique a subcategoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {getSubdomainsByDomain(editData.domain).map((subdomain) => (
                                <SelectItem key={subdomain.value} value={subdomain.value}>
                                  {subdomain.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Subcategoria específica dentro do domínio escolhido
                          </p>
                        </div>
                      )}

                      {/* Year */}
                      <div className="space-y-2 mb-4">
                        <Label htmlFor="edit-year">Ano de Referência</Label>
                        <Input
                          id="edit-year"
                          type="number"
                          value={editData.metadata_year || ''}
                          onChange={(e) => setEditData({ 
                            ...editData, 
                            metadata_year: e.target.value ? parseInt(e.target.value) : undefined 
                          })}
                          placeholder="Ex: 2024"
                          min="1900"
                          max="2100"
                        />
                        <p className="text-xs text-muted-foreground">
                          Ano a que o documento se refere (Calendário 2024, IDEB 2023, Lei de 2024, etc.)
                        </p>
                      </div>

                      {/* Version */}
                      <div className="space-y-2 mb-4">
                        <Label htmlFor="edit-version">Versão do Documento</Label>
                        <Input
                          id="edit-version"
                          value={editData.document_version || ''}
                          onChange={(e) => setEditData({ ...editData, document_version: e.target.value })}
                          placeholder="Ex: 1.0, 2.1, 3.0"
                        />
                        <p className="text-xs text-muted-foreground">
                          Número da versão/revisão (1.0 = primeira versão, 1.1 = pequena revisão, 2.0 = nova versão)
                        </p>
                      </div>

                      {/* Unit Name */}
                      <div className="space-y-2 mb-4">
                        <Label htmlFor="edit-unit-name">Nome da Unidade Educacional</Label>
                        <Input
                          id="edit-unit-name"
                          value={editData.unit_name || ''}
                          onChange={(e) => setEditData({ ...editData, unit_name: e.target.value })}
                          placeholder="Ex: EMEF João Silva, Creche Municipal Irmã Dulce"
                        />
                        <p className="text-xs text-muted-foreground">
                          ⚠️ Preencha APENAS se for um documento de uma escola específica. Deixe vazio para documentos da rede toda.
                        </p>
                      </div>

                      {/* Approval Date */}
                      <div className="space-y-2 mb-4">
                        <Label htmlFor="edit-approval-date">Data de Aprovação</Label>
                        <Input
                          id="edit-approval-date"
                          type="date"
                          value={editData.approved_date || ''}
                          onChange={(e) => setEditData({ ...editData, approved_date: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Data oficial de aprovação/publicação do documento (Lei, Resolução, etc.)
                        </p>
                      </div>
                    </div>

                    {/* Visibility Controls */}
                    <div className="border-t pt-4 mt-4 space-y-4">
                      <h3 className="text-sm font-semibold mb-3">Visibilidade</h3>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Visível para Escolas</Label>
                          <p className="text-xs text-muted-foreground">
                            Permitir acesso para usuários de unidades educacionais
                          </p>
                        </div>
                        <Switch
                          checked={editData.visible_to_schools || false}
                          onCheckedChange={(checked) =>
                            setEditData({ ...editData, visible_to_schools: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Visível para SME</Label>
                          <p className="text-xs text-muted-foreground">
                            Permitir acesso para usuários da Secretaria
                          </p>
                        </div>
                        <Switch
                          checked={editData.visible_to_sme || false}
                          onCheckedChange={(checked) =>
                            setEditData({ ...editData, visible_to_sme: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Visível para Comunidade</Label>
                          <p className="text-xs text-muted-foreground">
                            Permitir acesso público (transparência)
                          </p>
                        </div>
                        <Switch
                          checked={editData.visible_to_community || false}
                          onCheckedChange={(checked) =>
                            setEditData({ ...editData, visible_to_community: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSaveEdit}
                      className="institutional-gradient"
                    >
                      Salvar Alterações
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="card-premium">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando documentos...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL'
                  ? 'Nenhum documento encontrado com os filtros aplicados'
                  : 'Nenhum documento cadastrado ainda'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="mt-1">
                      {getFileIcon(doc.file_type)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {doc.name}
                          </h3>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {doc.description}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(doc.status)}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium">{getDocumentTypeLabel(doc.document_type)}</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>Upload: {formatDate(doc.uploaded_at)}</span>
                        {doc.official_number && (
                          <span className="font-mono text-xs">#{doc.official_number}</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {/* Download */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(doc.id)}
                        >
                          <Download className="w-3 h-3 mr-2" />
                          Baixar
                        </Button>

                        {/* Edit Button (TI or COMISSAO) */}
                        {(canManage || isComissao) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(doc)}
                          >
                            <Edit className="w-3 h-3 mr-2" />
                            Editar
                          </Button>
                        )}

                        {/* Activate (TI only) */}
                        {canManage && doc.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:border-green-600"
                            onClick={() => handleActivate(doc.id)}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-2" />
                            Ativar
                          </Button>
                        )}

                        {/* Deactivate (TI only) */}
                        {canManage && doc.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-yellow-600 hover:text-yellow-700 hover:border-yellow-600"
                            onClick={() => handleDeactivate(doc.id)}
                          >
                            <AlertCircle className="w-3 h-3 mr-2" />
                            Desativar
                          </Button>
                        )}

                        {/* Delete (TI only) */}
                        {canManage && doc.status !== 'ARCHIVED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:border-red-600"
                            onClick={() => setDeleteDocumentId(doc.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Arquivar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteDocumentId} onOpenChange={() => setDeleteDocumentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar documento?</AlertDialogTitle>
              <AlertDialogDescription>
                O documento será movido para o status ARQUIVADO. 
                O arquivo permanecerá no storage, mas não será mais utilizado.
                Esta ação pode ser revertida pela TI.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDocumentId && handleDelete(deleteDocumentId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default KnowledgeBase;
