import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, UserX, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
}

interface Member {
  id: string;
  role: string;
  created_at: string;
  user_id: string;
  profiles: Profile | null;
}

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · StockFlow" }] }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form states for creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("vendedor");

  // Fetch users in the active organization
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["org_members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select(
          `
          id,
          role,
          created_at,
          user_id,
          profiles:profiles (
            id,
            full_name,
            email,
            phone,
            is_active
          )
        `,
        )
        .eq("organization_id", orgId!);
      if (error) throw error;
      return (data as unknown as Member[]) ?? [];
    },
  });

  // Mutation to create a new user and add to organization
  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || !email.trim() || !password.trim()) {
        throw new Error("Preencha todos os campos obrigatórios.");
      }
      if (password.length < 6) {
        throw new Error("A senha deve ter no mínimo 6 caracteres.");
      }

      // Call postgres security definer function to create the user
      const { data, error } = await supabase.rpc("create_new_user_by_admin", {
        p_email: email,
        p_password: password,
        p_full_name: fullName,
        p_role: role,
        p_org_id: orgId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      qc.invalidateQueries({ queryKey: ["org_members"] });
      setOpen(false);
      // Reset form fields
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("vendedor");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao criar usuário.");
    },
  });

  // Mutation to update member role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra de acesso do usuário atualizada!");
      qc.invalidateQueries({ queryKey: ["org_members"] });
      setEditOpen(false);
      setEditingMember(null);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao atualizar permissão.");
    },
  });

  // Mutation to remove member from organization
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário removido da organização.");
      qc.invalidateQueries({ queryKey: ["org_members"] });
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao remover usuário.");
    },
  });

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    createUserMutation.mutate();
  }

  function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    updateRoleMutation.mutate({
      memberId: editingMember.id,
      newRole: editingMember.role,
    });
  }

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    gerente: "Gerente",
    vendedor: "Vendedor",
    visualizador: "Visualizador",
  };

  const roleColors: Record<string, string> = {
    admin: "bg-rose-50 text-rose-700 border-rose-200",
    gerente: "bg-blue-50 text-blue-700 border-blue-200",
    vendedor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    visualizador: "bg-slate-50 text-slate-700 border-slate-200",
  };

  // Only allow admin or gerente to see the registration options
  const isAdminOrGerente = profile?.role === "admin" || profile?.role === "gerente";

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
            Usuários do Sistema
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os acessos, cargos e permissões dos funcionários na sua empresa.
          </p>
        </div>
        {isAdminOrGerente && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground border-0">
                <Plus className="mr-1 h-4 w-4" /> Cadastrar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Usuário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="reg-name">Nome Completo *</Label>
                  <Input
                    id="reg-name"
                    placeholder="Ex: João da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-email">E-mail para Login *</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="joao@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-password">Senha de Acesso *</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reg-role">Nível de Permissão *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador (Acesso total)</SelectItem>
                      <SelectItem value="gerente">Gerente (Gestão operacional)</SelectItem>
                      <SelectItem value="vendedor">Vendedor (Realiza vendas/orçamentos)</SelectItem>
                      <SelectItem value="visualizador">Visualizador (Apenas leitura)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Criar e Liberar Acesso
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Nível de Acesso</TableHead>
                  <TableHead>Data de Ingresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Nenhum usuário cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium flex items-center gap-2 py-4">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                          {m.profiles?.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {m.profiles?.full_name || "Sem Nome"}
                          </p>
                          {m.user_id === profile?.id && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              Você
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <span className="flex items-center gap-1.5 text-sm">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {m.profiles?.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${roleColors[m.role] || ""} border font-semibold px-2 py-0.5 rounded-full text-xs`}
                        >
                          {roleLabels[m.role] || m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {new Date(m.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {isAdminOrGerente && m.user_id !== profile?.id && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingMember(m);
                                setEditOpen(true);
                              }}
                              title="Editar Permissão"
                            >
                              <Pencil className="h-4 w-4 text-slate-500" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Tem certeza de que deseja revogar o acesso de ${m.profiles?.full_name}?`,
                                  )
                                ) {
                                  removeMemberMutation.mutate(m.id);
                                }
                              }}
                              title="Remover Usuário"
                            >
                              <UserX className="h-4 w-4 text-rose-500" />
                            </Button>
                          </>
                        )}
                        {(!isAdminOrGerente || m.user_id === profile?.id) && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditingMember(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Nível de Acesso</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <form onSubmit={handleUpdateRole} className="space-y-4 pt-2">
              <div>
                <p className="text-sm text-slate-600">
                  Defina o cargo de <strong>{editingMember.profiles?.full_name}</strong>:
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-role">Nível de Permissão</Label>
                <Select
                  value={editingMember.role}
                  onValueChange={(val) => setEditingMember({ ...editingMember, role: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador (Acesso total)</SelectItem>
                    <SelectItem value="gerente">Gerente (Gestão operacional)</SelectItem>
                    <SelectItem value="vendedor">Vendedor (Realiza vendas/orçamentos)</SelectItem>
                    <SelectItem value="visualizador">Visualizador (Apenas leitura)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Alteração
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
