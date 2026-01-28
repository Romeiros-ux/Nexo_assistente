import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  Building2, 
  Mail, 
  Shield,
  Search,
  Loader2,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/services/user.service';
import unitService from '@/services/unit.service';
import type { User, EducationalUnit, UserRole } from '@/types/api.types';

// ==========================================
// TIPOS E CONSTANTES
// ==========================================

const ROLE_LABELS: Record<UserRole, string> = {
  'TI': 'TI',
  'SECRETARIA': 'Secretaria',
  'DIRETOR': 'Diretor',
  'COORDENACAO': 'Coordenação',
  'COMISSAO': 'Comissão',
};

const ROLE_COLORS: Record<UserRole, string> = {
  'TI': 'bg-purple-100 text-purple-800',
  'SECRETARIA': 'bg-blue-100 text-blue-800',
  'DIRETOR': 'bg-green-100 text-green-800',
  'COORDENACAO': 'bg-amber-100 text-amber-800',
  'COMISSAO': 'bg-cyan-100 text-cyan-800',
};

const STATUS_LABELS = {
  'ACTIVE': 'Ativo',
  'INACTIVE': 'Inativo',
  'PENDING': 'Pendente',
  'ARCHIVED': 'Arquivado',
};

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  department: string;
  selectedUnits: string[];
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

const UsersProfiles: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados principais
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<EducationalUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de busca e filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Estados de modais
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Estados de formulário
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'DIRETOR',
    phone: '',
    department: '',
    selectedUnits: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // PROTEÇÃO DE ACESSO
  // ==========================================
  useEffect(() => {
    if (user && user.role !== 'TI') {
      toast.error('Acesso negado. Apenas perfil TI pode acessar esta página.');
      navigate('/chat');
    }
  }, [user, navigate]);

  // ==========================================
  // CARREGAMENTO INICIAL
  // ==========================================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [usersData, unitsData] = await Promise.all([
        userService.getAll(),
        unitService.getActiveUnits(),
      ]);

      setUsers(usersData.data || []);
      setUnits(unitsData || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      toast.error(errorMessage);
      // Garantir arrays vazios mesmo em caso de erro
      setUsers([]);
      setUnits([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // HANDLERS - CRIAR USUÁRIO
  // ==========================================
  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Criar usuário
      const newUser = await userService.create({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone || undefined,
        department: formData.department || undefined,
      });

      // 2. Vincular unidades (se selecionadas)
      if (formData.selectedUnits.length > 0) {
        await userService.assignUnitsToUser(newUser.id, formData.selectedUnits);
      }

      toast.success('Usuário criado com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar usuário';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // HANDLERS - EDITAR USUÁRIO
  // ==========================================
  const openEditDialog = async (user: User) => {
    try {
      setIsSubmitting(true);
      
      // Busca usuário com unidades
      const userWithUnits = await userService.getUserWithUnits(user.id);
      
      setUserToEdit(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        phone: user.phone || '',
        department: user.department || '',
        selectedUnits: userWithUnits.units?.map(u => u.id) || [],
      });
      setIsEditDialogOpen(true);
    } catch (err) {
      toast.error('Erro ao carregar dados do usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!userToEdit || !formData.name || !formData.email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Atualizar usuário
      await userService.update(userToEdit.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        phone: formData.phone || undefined,
        department: formData.department || undefined,
      });

      // 2. Atualizar vínculos de unidades
      const userWithUnits = await userService.getUserWithUnits(userToEdit.id);
      const currentUnitIds = userWithUnits.units?.map(u => u.id) || [];

      // Remove vínculos antigos
      for (const unitId of currentUnitIds) {
        if (!formData.selectedUnits?.includes(unitId)) {
          await userService.removeUnitFromUser(userToEdit.id, unitId);
        }
      }

      // Adiciona novos vínculos
      const newUnits = (formData.selectedUnits || []).filter(id => !currentUnitIds.includes(id));
      if (newUnits.length > 0) {
        await userService.assignUnitsToUser(userToEdit.id, newUnits);
      }

      toast.success('Usuário atualizado com sucesso!');
      setIsEditDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar usuário';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // HANDLERS - DELETAR USUÁRIO
  // ==========================================
  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await userService.delete(userToDelete.id);
      toast.success('Usuário excluído com sucesso!');
      setUserToDelete(null);
      loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir usuário';
      toast.error(errorMessage);
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'DIRETOR',
      phone: '',
      department: '',
      selectedUnits: [],
    });
    setUserToEdit(null);
  };

  const toggleUnit = (unitId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedUnits: (prev.selectedUnits || []).includes(unitId)
        ? (prev.selectedUnits || []).filter(id => id !== unitId)
        : [...(prev.selectedUnits || []), unitId],
    }));
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // ==========================================
  // LOADING E ERRO
  // ==========================================
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando usuários...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium mb-2">Erro ao carregar dados</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData}>Tentar novamente</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Usuários e Perfis
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie usuários e suas permissões de acesso
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              <SelectItem value="TI">TI</SelectItem>
              <SelectItem value="SECRETARIA">Secretaria</SelectItem>
              <SelectItem value="DIRETOR">Diretor</SelectItem>
              <SelectItem value="COORDENACAO">Coordenação</SelectItem>
              <SelectItem value="COMISSAO">Comissão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de usuários */}
        <div className="bg-card rounded-lg border">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{user.name}</h3>
                        <Badge className={ROLE_COLORS[user.role]}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                        <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {STATUS_LABELS[user.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </span>
                        {user.phone && (
                          <span>{user.phone}</span>
                        )}
                        {user.department && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {user.department}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                        disabled={isSubmitting}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setUserToDelete(user)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialog - Criar usuário */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário e selecione as unidades de acesso.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nome */}
              <div>
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Maria Silva"
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="maria.silva@educacao.gov.br"
                />
              </div>

              {/* Senha */}
              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              {/* Perfil */}
              <div>
                <Label htmlFor="role">Perfil *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TI">TI</SelectItem>
                    <SelectItem value="SECRETARIA">Secretaria</SelectItem>
                    <SelectItem value="DIRETOR">Diretor</SelectItem>
                    <SelectItem value="COORDENACAO">Coordenação</SelectItem>
                    <SelectItem value="COMISSAO">Comissão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Telefone */}
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* Departamento */}
              <div>
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Ex: Coordenação Pedagógica"
                />
              </div>

              {/* Unidades */}
              <div>
                <Label>Unidades Educacionais</Label>
                <div className="border rounded-md p-4 space-y-2 max-h-[200px] overflow-y-auto">
                  {units.map((unit) => (
                    <div key={unit.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`unit-${unit.id}`}
                        checked={(formData.selectedUnits || []).includes(unit.id)}
                        onCheckedChange={() => toggleUnit(unit.id)}
                      />
                      <label
                        htmlFor={`unit-${unit.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {unit.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Criar Usuário
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog - Editar usuário */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize os dados do usuário e suas unidades de acesso.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nome */}
              <div>
                <Label htmlFor="edit-name">Nome completo *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Perfil */}
              <div>
                <Label htmlFor="edit-role">Perfil *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TI">TI</SelectItem>
                    <SelectItem value="SECRETARIA">Secretaria</SelectItem>
                    <SelectItem value="DIRETOR">Diretor</SelectItem>
                    <SelectItem value="COORDENACAO">Coordenação</SelectItem>
                    <SelectItem value="COMISSAO">Comissão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Telefone */}
              <div>
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* Departamento */}
              <div>
                <Label htmlFor="edit-department">Departamento</Label>
                <Input
                  id="edit-department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              {/* Unidades */}
              <div>
                <Label>Unidades Educacionais</Label>
                <div className="border rounded-md p-4 space-y-2 max-h-[200px] overflow-y-auto">
                  {units.map((unit) => (
                    <div key={unit.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-unit-${unit.id}`}
                        checked={(formData.selectedUnits || []).includes(unit.id)}
                        onCheckedChange={() => toggleUnit(unit.id)}
                      />
                      <label
                        htmlFor={`edit-unit-${unit.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {unit.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog - Confirmar exclusão */}
        <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong>?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default UsersProfiles;
