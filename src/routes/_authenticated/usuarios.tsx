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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  UserX,
  Loader2,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Keyboard,
  Users,
  CheckCircle2,
  XCircle,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────────────
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

// ── Role config ──────────────────────────────────────────────────────────
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
    value: "estoquista",
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
  return (
    roleMap[role] ?? {
      label: role,
      color: "bg-slate-50 text-slate-700 border-slate-200",
      icon: Users,
      iconColor: "text-slate-500",
      bg: "bg-slate-50",
      desc: "",
    }
  );
}

// ── Route ────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · StockFlow" }] }),
  component: UsuariosPage,
});

// ── Page ─────────────────────────────────────────────────────────────────
function UsuariosPage() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const qc = useQueryClient();

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("estoquista");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // ── Fetch members ───────────────────────────────────────────────────────
  // NOTE: organization_members.user_id references auth.users, not public.profiles,
  // so PostgREST cannot embed profiles via a foreign-key join. Fetch separately
  // and merge client-side instead.
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["org_members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: memberRows, error: memberErr } = await supabase
        .from("organization_members")
        .select("id, role, created_at, user_id")
        .eq("organization_id", orgId!);
      if (memberErr) throw memberErr;
      if (!memberRows || memberRows.length === 0) return [];

      const userIds = memberRows.map((m) => m.user_id);
      const { data: profileRows, error: profileErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, is_active")
        .in("id", userIds);
      if (profileErr) throw profileErr;

      const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));
      return memberRows.map((m) => ({
        ...m,
        profiles: profileMap.get(m.user_id) ?? null,
      })) as unknown as Member[];
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
        p_org_id: orgId!,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Usuário criado e acesso liberado com sucesso!");
      qc.invalidateQueries({ queryKey: ["org_members"] });
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
        .update({ role: newRole as any })
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
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao remover usuário.");
    },
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function resetForm() {
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRole("estoquista");
    setShowPw(false);
    setShowConfirm(false);
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
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsDontMatch = password && confirmPassword && password !== confirmPassword;
  const activeMembers = members.filter((m) => m.role !== "pendente");

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Usuários do Sistema</h1>
        <p className="text-muted-foreground text-sm">
          Cadastre e gerencie os acessos dos funcionários. Somente o Administrador Geral pode criar
          usuários.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* ── LEFT: Registration Form ── */}
        {isAdmin && (
          <Card className="shadow-card lg:col-span-2 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                Cadastrar Novo Usuário
              </CardTitle>
              <CardDescription>
                Preencha os dados e clique em cadastrar para liberar o acesso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                {/* Nome */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="reg-name"
                    placeholder="Ex: Maria da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">
                    E-mail para Login <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="maria@loja.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Papel */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-role">
                    Papel do Usuário <span className="text-destructive">*</span>
                  </Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger id="reg-role">
                      <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div className="flex items-center gap-2">
                            <r.icon className={`h-3.5 w-3.5 ${r.iconColor}`} />
                            <span>{r.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Role description */}
                  {role && (
                    <p className="text-xs text-muted-foreground bg-muted/40 rounded px-2.5 py-1.5 leading-relaxed">
                      {getRoleInfo(role).desc}
                    </p>
                  )}
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">
                    Senha <span className="text-destructive">*</span>
                    <span className="text-muted-foreground font-normal text-xs ml-1">
                      (mín. 8 caracteres)
                    </span>
                  </Label>
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      title={showPw ? "Ocultar senha" : "Visualizar senha"}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {password.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            password.length >= i * 3
                              ? password.length >= 12
                                ? "bg-green-500"
                                : password.length >= 8
                                  ? "bg-yellow-400"
                                  : "bg-orange-400"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-confirm">
                    Confirmar Senha <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className={`pr-10 ${
                        passwordsDontMatch
                          ? "border-destructive focus-visible:ring-destructive"
                          : passwordsMatch
                            ? "border-green-500 focus-visible:ring-green-500"
                            : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      title={showConfirm ? "Ocultar senha" : "Visualizar senha"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordsDontMatch && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> As senhas não conferem
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Senhas conferem
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={resetForm}
                    disabled={createUserMutation.isPending}
                  >
                    Limpar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gradient-primary text-primary-foreground border-0"
                    disabled={createUserMutation.isPending || !!passwordsDontMatch}
                  >
                    {createUserMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cadastrando…
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" /> Cadastrar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── RIGHT: List + Pending ── */}
        <div className={`space-y-4 ${isAdmin ? "lg:col-span-3" : "lg:col-span-5"}`}>
          {/* Members table */}
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
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Carregando…
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
                                <div
                                  className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${ri.bg}`}
                                >
                                  <span className={ri.iconColor}>
                                    {m.profiles?.full_name?.[0]?.toUpperCase() || "?"}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">
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
                            <TableCell className="text-sm text-slate-600">
                              <span className="flex items-center gap-1.5">
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
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingMember(m);
                                      setEditOpen(true);
                                    }}
                                    title="Alterar papel"
                                  >
                                    <Pencil className="h-4 w-4 text-slate-500" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
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
        </div>
      </div>

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
            <DialogTitle>Alterar Papel de Acesso</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <form onSubmit={handleUpdateRole} className="space-y-4 pt-2">
              <p className="text-sm text-slate-600">
                Alterar o papel de <strong>{editingMember.profiles?.full_name}</strong>:
              </p>
              <div className="space-y-1.5">
                <Label>Papel *</Label>
                <Select
                  value={editingMember.role}
                  onValueChange={(val) => setEditingMember({ ...editingMember, role: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex items-center gap-2">
                          <r.icon className={`h-3.5 w-3.5 ${r.iconColor}`} />
                          {r.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingMember.role && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                    {getRoleInfo(editingMember.role).desc}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
