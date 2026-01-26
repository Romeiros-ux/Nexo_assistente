import { useEffect, useMemo, useState } from "react";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Unit } from "@/types/auth";
type DocumentStatus = "vigente" | "substituido" | "arquivado";
import { FileText, Link2, Paperclip, Plus, RefreshCcw, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { parseCommaList, uploadDocumentFile, invokeIngest } from "@/lib/documentIngestion";

type DocRow = {
  id: string;
  title: string;
  type: string;
  version: string;
  status: DocumentStatus;
  min_role: AppRole;
  unit_id: string | null;
  effective_date: string | null;
  description: string | null;
  source_type?: string | null;
  source_url?: string | null;
  thematic_area?: string | null;
  doc_kind?: string | null;
  reference_year?: number | null;
  attached_files_count?: number | null;
};

const ROLE_LABELS: Record<AppRole, string> = {
  diretor: "Diretor",
  coordenacao: "Coordenação",
  secretaria: "Secretaria",
  ti: "TI",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  vigente: "Vigente",
  substituido: "Substituído",
  arquivado: "Arquivado",
};

const ROLE_OPTIONS: AppRole[] = ["diretor", "coordenacao", "secretaria", "ti"];
const STATUS_OPTIONS: DocumentStatus[] = ["vigente", "substituido", "arquivado"];

export default function DocumentsAdmin() {
  const { toast } = useToast();
  const { userContext } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DocRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"file" | "link">("file");
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createUrl, setCreateUrl] = useState("");
  const [createForm, setCreateForm] = useState({
    title: "",
    type: "",
    version: "1.0",
    status: "vigente" as DocumentStatus,
    min_role: "diretor" as AppRole,
    unitId: "__none__" as string,
    effective_date: "" as string,
    description: "" as string,
    tags_manual: "" as string,
    keywords_manual: "" as string,
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: unitsData, error: unitsError }, { data: docsData, error: docsError }] = await Promise.all([
        supabase.from("units").select("id, code, name").order("name"),
        supabase
          .from("documents")
          .select(
            "id, title, type, version, status, min_role, unit_id, effective_date, description, source_type, source_url, thematic_area, doc_kind, reference_year, attached_files_count",
          )
          .order("updated_at", { ascending: false }),
      ]);

      if (unitsError) throw unitsError;
      if (docsError) throw docsError;

      setUnits((unitsData || []) as Unit[]);
      setRows((docsData || []) as DocRow[]);
    } catch (e: any) {
      toast({
        title: "Erro ao carregar documentos",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const unitName = r.unit_id ? units.find((u) => u.id === r.unit_id)?.name || "" : "";
      return (
        r.title.toLowerCase().includes(q) ||
        (r.type || "").toLowerCase().includes(q) ||
        (r.version || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        unitName.toLowerCase().includes(q)
      );
    });
  }, [rows, search, units]);

  const updateDoc = async (doc: DocRow, patch: Partial<DocRow>) => {
    try {
      const next: DocRow = { ...doc, ...patch };
      const { error } = await supabase
        .from("documents")
        .update({
          title: next.title,
          type: next.type,
          version: next.version,
          status: next.status,
          min_role: next.min_role,
          unit_id: next.unit_id,
          effective_date: next.effective_date,
          description: next.description,
          thematic_area: (next as any).thematic_area ?? null,
          doc_kind: (next as any).doc_kind ?? null,
          reference_year: (next as any).reference_year ?? null,
          source_url: (next as any).source_url ?? null,
        })
        .eq("id", doc.id);
      if (error) throw error;
      toast({ title: "Documento atualizado" });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao atualizar", description: e?.message || String(e), variant: "destructive" });
    }
  };

  const canAccess = userContext?.role === "ti";

  const resetCreate = () => {
    setCreateMode("file");
    setCreateFile(null);
    setCreateUrl("");
    setCreateForm({
      title: "",
      type: "",
      version: "1.0",
      status: "vigente",
      min_role: "diretor",
      unitId: "__none__",
      effective_date: "",
      description: "",
      tags_manual: "",
      keywords_manual: "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAccess) {
      toast({ title: "Acesso negado", description: "Apenas TI pode cadastrar documentos.", variant: "destructive" });
      return;
    }

    try {
      if (createMode === "file" && !createFile) {
        toast({ title: "Selecione um arquivo", variant: "destructive" });
        return;
      }
      if (createMode === "link" && !createUrl.trim()) {
        toast({ title: "Informe a URL", variant: "destructive" });
        return;
      }

      const basePayload: any = {
        title: createForm.title,
        type: createForm.type,
        version: createForm.version,
        status: createForm.status,
        min_role: createForm.min_role,
        unit_id: createForm.unitId === "__none__" ? null : createForm.unitId,
        effective_date: createForm.effective_date ? createForm.effective_date : null,
        description: createForm.description ? createForm.description : null,
        tags_manual: parseCommaList(createForm.tags_manual),
        keywords_manual: parseCommaList(createForm.keywords_manual),
        source_type: createMode,
        source_url: createMode === "link" ? createUrl.trim() : null,
      };

      const { data: inserted, error: insErr } = await supabase
        .from("documents")
        .insert(basePayload)
        .select("id")
        .maybeSingle();
      if (insErr) throw insErr;
      const documentId = inserted?.id;
      if (!documentId) throw new Error("Falha ao obter ID do documento");

      if (createMode === "file") {
        const { bucket, storagePath } = await uploadDocumentFile({ documentId, file: createFile! });
        const { error: upErr } = await supabase
          .from("documents")
          .update({ storage_bucket: bucket, storage_path: storagePath })
          .eq("id", documentId);
        if (upErr) throw upErr;
      }

      toast({ title: "Documento cadastrado", description: "Processando ingestão (extração + classificação)..." });
      await invokeIngest({ kind: createMode, documentId });
      toast({ title: "Ingestão concluída" });

      setCreateOpen(false);
      resetCreate();
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao criar documento", description: e?.message || String(e), variant: "destructive" });
    }
  };

  const handleReprocess = async (doc: DocRow) => {
    try {
      toast({ title: "Reprocessando..." });
      await invokeIngest({ kind: doc.source_type === "link" ? "link" : "file", documentId: doc.id });
      toast({ title: "Reprocessamento concluído" });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao reprocessar", description: e?.message || String(e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Documentos</h1>
            <p className="text-sm text-muted-foreground">Área exclusiva da TI para validar e manter a base de documentos.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={fetchAll} disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>

            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                setCreateOpen(open);
                if (!open) resetCreate();
              }}
            >
              <DialogTrigger asChild>
                <Button disabled={!canAccess} title={!canAccess ? "Apenas TI" : undefined}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo documento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
                <DialogHeader>
                  <DialogTitle>Novo documento</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={createMode === "file" ? "default" : "outline"}
                      onClick={() => setCreateMode("file")}
                      className="flex-1"
                    >
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant={createMode === "link" ? "default" : "outline"}
                      onClick={() => setCreateMode("link")}
                      className="flex-1"
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Link
                    </Button>
                  </div>

                  {createMode === "file" ? (
                    <div className="space-y-2">
                      <Label htmlFor="doc-file">Arquivo</Label>
                      <Input
                        id="doc-file"
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.odt,.ods,.odp,.rtf,.html,.htm,.xml,.json,.md,.markdown"
                        onChange={(e) => setCreateFile(e.target.files?.[0] ?? null)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Aceita PDF, Word, Excel, PowerPoint, LibreOffice, CSV, TXT, HTML, XML, JSON e Markdown.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="doc-url">URL oficial</Label>
                      <Input
                        id="doc-url"
                        value={createUrl}
                        onChange={(e) => setCreateUrl(e.target.value)}
                        placeholder="https://..."
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        O sistema lê a página, extrai texto e baixa automaticamente PDFs e documentos vinculados.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="doc-title">Título</Label>
                    <Input id="doc-title" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} required />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="doc-type">Tipo</Label>
                      <Input id="doc-type" value={createForm.type} onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value }))} placeholder="Ex: Portaria, Relatório, Plano..." required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-version">Versão</Label>
                      <Input id="doc-version" value={createForm.version} onChange={(e) => setCreateForm((p) => ({ ...p, version: e.target.value }))} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={createForm.status} onValueChange={(v) => setCreateForm((p) => ({ ...p, status: v as DocumentStatus }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Perfil mínimo</Label>
                      <Select value={createForm.min_role} onValueChange={(v) => setCreateForm((p) => ({ ...p, min_role: v as AppRole }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Unidade</Label>
                      <Select value={createForm.unitId} onValueChange={(v) => setCreateForm((p) => ({ ...p, unitId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">(Global / sem unidade)</SelectItem>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="doc-effective">Data de vigência</Label>
                      <Input
                        id="doc-effective"
                        type="date"
                        value={createForm.effective_date}
                        onChange={(e) => setCreateForm((p) => ({ ...p, effective_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-desc">Descrição</Label>
                    <Input id="doc-desc" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} placeholder="Opcional" />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="doc-tags">Tags (manual)</Label>
                      <Input
                        id="doc-tags"
                        value={createForm.tags_manual}
                        onChange={(e) => setCreateForm((p) => ({ ...p, tags_manual: e.target.value }))}
                        placeholder="Ex.: avaliação, currículo, transporte"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-keywords">Palavras‑chave (manual)</Label>
                      <Input
                        id="doc-keywords"
                        value={createForm.keywords_manual}
                        onChange={(e) => setCreateForm((p) => ({ ...p, keywords_manual: e.target.value }))}
                        placeholder="Ex.: IDEB, evasão, proficiência"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit" className="gap-2">
                      <Wand2 className="h-4 w-4" />
                      Criar e processar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Lista</CardTitle>
            <div className="w-full sm:w-96">
              <Input placeholder="Buscar por título, tipo, versão, unidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-64">Título</TableHead>
                      <TableHead className="min-w-32">Fonte</TableHead>
                      <TableHead className="min-w-40">Área</TableHead>
                      <TableHead className="min-w-40">Classe</TableHead>
                      <TableHead className="min-w-28">Ano</TableHead>
                      <TableHead className="min-w-28">Versão</TableHead>
                      <TableHead className="min-w-36">Status</TableHead>
                      <TableHead className="min-w-40">Perfil mínimo</TableHead>
                      <TableHead className="min-w-48">Unidade</TableHead>
                      <TableHead className="min-w-32">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                        <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                        Nenhum documento encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((d) => (
                      <TableRow key={d.id}>
                        {/* Título */}
                        <TableCell>
                          <Input
                            value={d.title}
                            onChange={(e) => {
                              const title = e.target.value;
                              setRows((prev) => prev.map((p) => (p.id === d.id ? { ...p, title } : p)));
                            }}
                            onBlur={() => updateDoc(d, { title: d.title })}
                          />
                        </TableCell>
                        {/* Fonte (tipo + anexos) */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {d.source_type === "link" ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                <Link2 className="h-3 w-3" />
                                Link
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                                <FileText className="h-3 w-3" />
                                Arquivo
                              </span>
                            )}
                            {d.source_type === "link" && (d.attached_files_count ?? 0) > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full" title="Arquivos baixados do link">
                                <Paperclip className="h-3 w-3" />
                                {d.attached_files_count}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {/* Área Temática */}
                        <TableCell>
                          <Input
                            value={d.thematic_area ?? ""}
                            onChange={(e) => {
                              const thematic_area = e.target.value;
                              setRows((prev) => prev.map((p) => (p.id === d.id ? { ...p, thematic_area } : p)));
                            }}
                            onBlur={() => updateDoc(d, { thematic_area: d.thematic_area ?? null } as any)}
                            placeholder="(auto)"
                            className="text-sm"
                          />
                        </TableCell>
                        {/* Classe/Tipo documento */}
                        <TableCell>
                          <Input
                            value={d.doc_kind ?? ""}
                            onChange={(e) => {
                              const doc_kind = e.target.value;
                              setRows((prev) => prev.map((p) => (p.id === d.id ? { ...p, doc_kind } : p)));
                            }}
                            onBlur={() => updateDoc(d, { doc_kind: d.doc_kind ?? null } as any)}
                            placeholder="(auto)"
                            className="text-sm"
                          />
                        </TableCell>
                        {/* Ano */}
                        <TableCell>
                          <Input
                            type="number"
                            value={d.reference_year ?? ""}
                            onChange={(e) => {
                              const reference_year = e.target.value ? Number(e.target.value) : null;
                              setRows((prev) => prev.map((p) => (p.id === d.id ? { ...p, reference_year } : p)));
                            }}
                            onBlur={() => updateDoc(d, { reference_year: d.reference_year ?? null } as any)}
                            placeholder="(auto)"
                            className="w-20 text-sm"
                          />
                        </TableCell>
                        {/* Versão */}
                        <TableCell>
                          <Input
                            value={d.version}
                            onChange={(e) => {
                              const version = e.target.value;
                              setRows((prev) => prev.map((p) => (p.id === d.id ? { ...p, version } : p)));
                            }}
                            onBlur={() => updateDoc(d, { version: d.version })}
                            className="w-16 text-sm"
                          />
                        </TableCell>
                        {/* Status */}
                        <TableCell>
                          <Select
                            value={d.status}
                            onValueChange={(v) => {
                              const status = v as DocumentStatus;
                              setRows((prev) => prev.map((p) => (p.id === d.id ? { ...p, status } : p)));
                              updateDoc(d, { status });
                            }}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {/* Perfil mínimo */}
                        <TableCell>
                          <Select
                            value={d.min_role}
                            onValueChange={(v) => {
                              const min_role = v as AppRole;
                              setRows((prev) => prev.map((p) => (p.id === d.id ? { ...p, min_role } : p)));
                              updateDoc(d, { min_role });
                            }}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {/* Unidade */}
                        <TableCell>
                          <Select
                            value={d.unit_id ?? "__none__"}
                            onValueChange={(v) => {
                              const unit_id = v === "__none__" ? null : v;
                              setRows((prev) => prev.map((p) => (p.id === d.id ? { ...p, unit_id } : p)));
                              updateDoc(d, { unit_id });
                            }}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">(Global)</SelectItem>
                              {units.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {/* Ações */}
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleReprocess(d)} title="Reprocessar ingestão">
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
