import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Unit } from "@/types/auth";
import { Plus, RefreshCcw } from "lucide-react";

type AdminUserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  unit_id: string | null;
  unit_name: string | null;
  role: AppRole | null;
  is_active: boolean;
};

const ROLE_LABELS: Record<AppRole, string> = {
  diretor: "Diretor",
  coordenacao: "Coordenação",
  secretaria: "Secretaria",
  ti: "TI",
};

const ROLE_OPTIONS: AppRole[] = ["diretor", "coordenacao", "secretaria", "ti"];

export default function UsersAdmin() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [lastTestUsers, setLastTestUsers] = useState<
    Array<{ email: string; password: string; role: AppRole; userId: string }>
  >([]);

  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    fullName: "",
    password: "",
    role: "diretor" as AppRole,
    unitId: "__none__" as string,
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: unitsData, error: unitsError }, usersRes] = await Promise.all([
        supabase.from("units").select("id, code, name").order("name"),
        supabase.functions.invoke("admin-users", {
          body: { action: "list" },
        }),
      ]);

      if (unitsError) throw unitsError;
      if (usersRes.error) throw usersRes.error;

      setUnits((unitsData || []) as Unit[]);
      setRows((usersRes.data?.users || []) as AdminUserRow[]);
    } catch (e: any) {
      toast({
        title: "Erro ao carregar usuários",
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
      return (
        (r.email || "").toLowerCase().includes(q) ||
        (r.full_name || "").toLowerCase().includes(q) ||
        (r.unit_name || "").toLowerCase().includes(q) ||
        (r.role || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const updateUser = async (user: AdminUserRow, patch: Partial<AdminUserRow>) => {
    try {
      const res = await supabase.functions.invoke("admin-users", {
        body: {
          action: "update",
          userId: user.user_id,
          fullName: patch.full_name ?? user.full_name,
          unitId: patch.unit_id === null ? null : patch.unit_id ?? user.unit_id,
          role: patch.role ?? user.role,
          isActive: patch.is_active ?? user.is_active,
        },
      });
      if (res.error) throw res.error;
      toast({ title: "Usuário atualizado" });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao atualizar", description: e?.message || String(e), variant: "destructive" });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create",
          email: createForm.email,
          password: createForm.password,
          fullName: createForm.fullName,
          role: createForm.role,
          unitId: createForm.unitId === "__none__" ? null : createForm.unitId,
        },
      });
      if (res.error) throw res.error;
      toast({
        title: "Usuário criado",
        description: "O usuário já pode acessar com o email e senha informados.",
      });
      setCreateOpen(false);
      setCreateForm({ email: "", fullName: "", password: "", role: "diretor", unitId: "__none__" });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao criar usuário", description: e?.message || String(e), variant: "destructive" });
    }
  };

  const createTestUsers = async () => {
    try {
      const res = await supabase.functions.invoke("admin-users", {
        body: { action: "create_test_users" },
      });
      if (res.error) throw res.error;
      setLastTestUsers((res.data?.created || []) as any);
      toast({
        title: "Usuários de teste criados",
        description: "As credenciais aparecerão abaixo.",
      });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao criar usuários de teste", description: e?.message || String(e), variant: "destructive" });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full">
        <AdminSidebar />

        <SidebarInset>
          <div className="min-h-[100dvh] bg-background flex flex-col">
            <Header showSidebarTrigger />

            <main className="flex-1 min-h-0 container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">
              Área exclusiva da TI para criar e editar usuários, perfis e unidades.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={fetchAll} disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="secondary" onClick={createTestUsers} disabled={loading}>
              Criar usuários teste
            </Button>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo usuário</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-email">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-name">Nome completo</Label>
                    <Input
                      id="new-name"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Senha</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Perfil</Label>
                      <Select
                        value={createForm.role}
                        onValueChange={(v) => setCreateForm((p) => ({ ...p, role: v as AppRole }))}
                      >
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

                    <div className="space-y-2">
                      <Label>Unidade</Label>
                      <Select value={createForm.unitId} onValueChange={(v) => setCreateForm((p) => ({ ...p, unitId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">(Sem unidade)</SelectItem>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit">Criar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Lista</CardTitle>
            <div className="w-full sm:w-72">
              <Input placeholder="Buscar por nome, email, unidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile: cards */}
            <div className="space-y-3 sm:hidden">
              {loading ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">Carregando...</div>
              ) : filtered.length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
              ) : (
                filtered.map((u) => (
                  <div key={u.user_id} className="rounded-lg border bg-card p-4 shadow-card">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={u.full_name || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRows((prev) => prev.map((p) => (p.user_id === u.user_id ? { ...p, full_name: val } : p)));
                          }}
                          onBlur={() => updateUser(u, { full_name: u.full_name })}
                        />
                        <p className="text-xs text-muted-foreground">{u.email || "—"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Perfil</Label>
                          <Select
                            value={u.role || "diretor"}
                            onValueChange={(v) => {
                              const role = v as AppRole;
                              setRows((prev) => prev.map((p) => (p.user_id === u.user_id ? { ...p, role } : p)));
                              updateUser(u, { role });
                            }}
                          >
                            <SelectTrigger>
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
                        </div>

                        <div className="space-y-2">
                          <Label>Ativo</Label>
                          <div className="flex h-10 items-center justify-between rounded-md border px-3">
                            <span className="text-sm text-muted-foreground">Acesso</span>
                            <Switch
                              checked={u.is_active}
                              onCheckedChange={(checked) => {
                                setRows((prev) => prev.map((p) => (p.user_id === u.user_id ? { ...p, is_active: checked } : p)));
                                updateUser(u, { is_active: checked });
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Unidade</Label>
                        <Select
                          value={u.unit_id ?? "__none__"}
                          onValueChange={(v) => {
                            const unit_id = v === "__none__" ? null : v;
                            const unit_name = unit_id ? units.find((x) => x.id === unit_id)?.name || null : null;
                            setRows((prev) => prev.map((p) => (p.user_id === u.user_id ? { ...p, unit_id, unit_name } : p)));
                            updateUser(u, { unit_id });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">(Sem unidade)</SelectItem>
                            {units.map((un) => (
                              <SelectItem key={un.id} value={un.id}>
                                {un.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop: tabela */}
            <div className="hidden sm:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum usuário encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="min-w-56">
                          <Input
                            value={u.full_name || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRows((prev) => prev.map((p) => (p.user_id === u.user_id ? { ...p, full_name: val } : p)));
                            }}
                            onBlur={() => updateUser(u, { full_name: u.full_name })}
                          />
                        </TableCell>
                        <TableCell className="min-w-56 text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                        <TableCell className="min-w-44">
                          <Select
                            value={u.role || "diretor"}
                            onValueChange={(v) => {
                              const role = v as AppRole;
                              setRows((prev) => prev.map((p) => (p.user_id === u.user_id ? { ...p, role } : p)));
                              updateUser(u, { role });
                            }}
                          >
                            <SelectTrigger>
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
                        <TableCell className="min-w-56">
                          <Select
                            value={u.unit_id ?? "__none__"}
                            onValueChange={(v) => {
                              const unit_id = v === "__none__" ? null : v;
                              const unit_name = unit_id ? units.find((x) => x.id === unit_id)?.name || null : null;
                              setRows((prev) =>
                                prev.map((p) => (p.user_id === u.user_id ? { ...p, unit_id, unit_name } : p))
                              );
                              updateUser(u, { unit_id });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">(Sem unidade)</SelectItem>
                              {units.map((un) => (
                                <SelectItem key={un.id} value={un.id}>
                                  {un.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <Switch
                              checked={u.is_active}
                              onCheckedChange={(checked) => {
                                setRows((prev) => prev.map((p) => (p.user_id === u.user_id ? { ...p, is_active: checked } : p)));
                                updateUser(u, { is_active: checked });
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {lastTestUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Credenciais de teste</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Senha</TableHead>
                      <TableHead>Perfil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lastTestUsers.map((u) => (
                      <TableRow key={u.userId}>
                        <TableCell className="font-mono text-sm">{u.email}</TableCell>
                        <TableCell className="font-mono text-sm">{u.password}</TableCell>
                        <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
