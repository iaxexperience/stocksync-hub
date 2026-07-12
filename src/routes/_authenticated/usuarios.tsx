import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, UserX, Loader2, Mail, Eye, EyeOff,
  ShieldCheck, Keyboard, Users, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// ── Types ──────────────────────────────────────────────────────────────────
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

// pending_google_users simulated via a local table (or organization_members with status='pending')
interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  provider: "google" | "email";
}

// ── Role config ────────────────────────────────────────────────────────────
const ROLES = [
  {
    value: "admin",
    label: "Administrador Geral",
    desc: "Acesso total ao sistema: clientes, estoque, produtos, movimentações, usuários e configurações.",
    icon: ShieldCheck,
    color: "bg-rose-50 text-rose-700 border-rose-200",
    iconColor: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    value: "digitador",
    label: "Digitador",
    desc: "Acesso restrito ao cadastro de produtos e consulta de estoque. Sem acesso a clientes, financeiro ou usuários.",
    icon: Keyboard,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    iconColor: "text-blue-600",
    bg: "bg-blue-50",
  },
];

const roleMap = Object.fromEntries(ROLES.map((r) => [r.value, r]));

function getRoleInfo(role: string) {
  return roleMap[role] ?? {
    label: role,
    color: "bg-slate-50 text-slate-700 border-slate-200",
    icon: Users,
    iconColor: "text-slate-500",
    bg: "bg-slate-50",
    desc: "",
  };
}

// ── Route ──────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · StockFlow" }] }),
  component: UsuariosPage,
});

// ── Component ──────────────────────────────────────────────────────────────
function UsuariosPage() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const qc = useQueryClient();

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form state — new user
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("digitador");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Fetch members ────────────────────────────────────────────────────────
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["org_members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          id, role, created_at, user_id,
          profiles:profiles ( id, full_name, email, phone, is_active )
        `)
        .eq("organization_id", orgId!);
      if (error) throw error;
      return (data as unknown as Member[]) ?? [];
    },
  });

  // ── Fetch pending Google approvals ───────────────────────────────────────
  const { data: pendingUsers = [] } = useQuery<PendingUser[]>({
    queryKey: ["pending_users", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      // Pending users = organization_members with role = 'pendente'
      const { data, error } = await supabase
        .from("organization_members")
        .select(`id, created_at, profiles:profiles ( full_name, email )`)
        .eq("organization_id", orgId!)
        .eq("role", "pendente");
      if (error) return [];
      return (data ?? []).map((d: any) => ({
        id: d.id,
        full_name: d.profiles?.full_name ?? "—",
        email: d.profiles?.email ?? "—",
        created_at: d.created_at,
        provider: "google" as const,
      }));
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || !email.trim() || !password.trim()) {
        throw new Error("Preencha todos os campos obrigatórios.");
      }
      if (password.length < 8) {
        throw new Error("A senha deve ter no mínimo 8 caracteres.");
      }
      if (password !== confirmPassword) {
        throw new Error("As senhas não conferem.");
      }
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
      toast.success("Usuário criado e acesso liberado com sucesso!");
      qc.invalidateQueries({ queryKey: ["org_members"] });
      setOpen(false);
      resetForm();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao criar usuário.");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel de acesso atualizado!");
      qc.invalidateQueries({ queryKey: ["org_members"] });
      setEditOpen(false);
      setEditingMember(null);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao atualizar permissão.");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso do usuário revogado.");
      qc.invalidateQueries({ queryKey: ["org_members"] });
      qc.invalidateQueries({ queryKey: ["pending_users"] });
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao remover usuário.");
    },
  });

  const approvePendingMutation = useMutation({
    mutationFn: async ({ memberId, approvedRole }: { memberId: string; approvedRole: string }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: approvedRole })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário aprovado e acesso liberado!");
      qc.invalidateQueries({ queryKey: ["org_members"] });
      qc.invalidateQueries({ queryKey: ["pending_users"] });
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao aprovar usuário.");
    },
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function resetForm() {
    setFullName(""); setEmail(""); setPassword(""); setConfirmPassword("");
    setRole("digitador"); setShowPw(false); setShowConfirm(false);
  }

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    createUserMutation.mutate();
  }

  function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    updateRoleMutation.mutate({ memberId: editingMember.id, newRole: editingMember.role });
  }

  const isAdmin = profile?.role === "admin";
  const activeMembers = members.filter((m) => m.role !== "pendente");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">Usuários do Sistema</h1>
          <p className="text-muted-foreground text-sm">
            Cadastre e gerencie os acessos dos funcionários. Somente o Administrador Geral pode criar usuários.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground border-0">
                <Plus className="mr-1 h-4 w-4" /> Cadastrar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Novo Usuário
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateUser} className="space-y-4 pt-1">
                {/* Name */}
                <div className="space-y-1">
                  <Label htmlFor="reg-name">Nome Completo *</Label>
                  <Input
                    id="reg-name"
                    placeholder="Ex: Maria da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label htmlFor="reg-email">E-mail para Login *</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="maria@loja.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <Label htmlFor="reg-role">Papel do Usuário *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{r.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Role description */}
                  {role && getRoleInfo(role).desc && (
                    <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1.5">
                      {getRoleInfo(role).desc}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <Label htmlFor="reg-password">Senha de Acesso * <span className="text-muted-foreground text-xs">(mín. 8 caracteres)</span></Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <Label htmlFor="reg-confirm">Confirmação de Senha *</Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className={`pr-10 ${confirmPassword && confirmPassword !== password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs text-destructive">As senhas não conferem.</p>
                  )}
                  {confirmPassword && confirmPassword === password && password.length >= 8 && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Senhas conferem
                    </p>
                  )}
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending || (!!confirmPassword && confirmPassword !== password)}
                    className="gradient-primary text-primary-foreground border-0"
                  >
                    {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar e Liberar Acesso
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {/* Role Info Cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {ROLES.map((r) => (
          <Card key={r.value} className="shadow-card border">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${r.bg}`}>
                <r.icon className={`h-4 w-4 ${r.iconColor}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">{r.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Google Users */}
      {pendingUsers.length > 0 && (
        <Card className="shadow-card border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-800">
              <Clock className="h-4 w-4" />
              Aguardando Aprovação do Administrador ({pendingUsers.length})
            </CardTitle>
            <CardDescription className="text-amber-700">
              Estes usuários entraram via Google e aguardam aprovação para acessar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-amber-100">
              {pendingUsers.map((u) => (
                <PendingApprovalRow
                  key={u.id}
                  user={u}
                  onApprove={(approvedRole) => approvePendingMutation.mutate({ memberId: u.id, approvedRole })}
                  onReject={() => {
                    if (confirm(`Recusar acesso de ${u.full_name}?`)) removeMemberMutation.mutate(u.id);
                  }}
                  isLoading={approvePendingMutation.isPending || removeMemberMutation.isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members Table */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Ingresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando usuários…
                    </TableCell>
                  </TableRow>
                ) : activeMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Users className="mx-auto h-10 w-10 opacity-30 mb-2" />
                      Nenhum usuário cadastrado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeMembers.map((m) => {
                    const ri = getRoleInfo(m.role);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${ri.bg}`}>
                              <span className={ri.iconColor}>
                                {m.profiles?.full_name?.[0]?.toUpperCase() || "?"}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm leading-tight">
                                {m.profiles?.full_name || "Sem Nome"}
                              </p>
                              {m.user_id === profile?.id && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                                  Você
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          <span className="flex items-center gap-1.5 text-sm">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {m.profiles?.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${ri.color} border font-semibold px-2 py-0.5 rounded-full text-xs flex items-center gap-1 w-fit`}
                          >
                            <ri.icon className="h-3 w-3" />
                            {ri.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(m.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {isAdmin && m.user_id !== profile?.id ? (
                            <>
                              <Button
                                size="icon" variant="ghost"
                                onClick={() => { setEditingMember(m); setEditOpen(true); }}
                                title="Alterar papel"
                              >
                                <Pencil className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button
                                size="icon" variant="ghost"
                                onClick={() => {
                                  if (confirm(`Revogar acesso de ${m.profiles?.full_name}?`))
                                    removeMemberMutation.mutate(m.id);
                                }}
                                title="Revogar acesso"
                              >
                                <UserX className="h-4 w-4 text-rose-500" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingMember(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Papel de Acesso</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <form onSubmit={handleUpdateRole} className="space-y-4 pt-2">
              <p className="text-sm text-slate-600">
                Alterar o papel de <strong>{editingMember.profiles?.full_name}</strong>:
              </p>
              <div className="space-y-1">
                <Label>Papel *</Label>
                <Select
                  value={editingMember.role}
                  onValueChange={(val) => setEditingMember({ ...editingMember, role: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingMember.role && getRoleInfo(editingMember.role).desc && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                    {getRoleInfo(editingMember.role).desc}
                  </p>
                )}
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

// ── Pending Approval Row ───────────────────────────────────────────────────
function PendingApprovalRow({
  user,
  onApprove,
  onReject,
  isLoading,
}: {
  user: PendingUser;
  onApprove: (role: string) => void;
  onReject: () => void;
  isLoading: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState("digitador");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 shrink-0">
          {user.full_name[0]?.toUpperCase() || "G"}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{user.full_name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3" /> {user.email}
            <span className="ml-1 bg-amber-200 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-medium">
              Google
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 bg-green-600 hover:bg-green-700 text-white border-0 text-xs"
          onClick={() => onApprove(selectedRole)}
          disabled={isLoading}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-destructive hover:bg-destructive/10 text-xs"
          onClick={onReject}
          disabled={isLoading}
        >
          <XCircle className="h-3.5 w-3.5 mr-1" /> Recusar
        </Button>
      </div>
    </div>
  );
}
