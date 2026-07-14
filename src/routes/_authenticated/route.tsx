import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useProfile } from "@/hooks/useProfile";
import { Clock, LogOut, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const queryClient = useQueryClient();

  const [showWarnDialog, setShowWarnDialog] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Troca obrigatória de senha (primeiro login / forçado pelo administrador)
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const mustChangePassword = !!profile?.must_change_password;

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("As senhas não conferem.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
      if (authErr) throw authErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", profile!.id);
      if (profileErr) throw profileErr;

      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmNewPassword("");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error("Erro ao trocar senha: " + err.message);
    } finally {
      setIsChangingPassword(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  // Query settings to read the inactivity duration & action
  const { data: settings } = useQuery({
    queryKey: ["organization_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", orgId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!settings || settings.inactivity_action === "disabled") return;

    const timeoutMs = (settings.inactivity_timeout_minutes || 15) * 60 * 1000;
    const warnThresholdMs = 60 * 1000; // 60s countdown warning

    let warnTimer: ReturnType<typeof setTimeout> | null = null;
    let logoutTimer: ReturnType<typeof setTimeout> | null = null;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;

    const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    };

    const resetTimer = () => {
      setShowWarnDialog(false);
      setCountdown(60);

      if (warnTimer) clearTimeout(warnTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      if (countdownInterval) clearInterval(countdownInterval);

      if (settings.inactivity_action === "warn") {
        const warnDelay = Math.max(0, timeoutMs - warnThresholdMs);
        warnTimer = setTimeout(() => {
          setShowWarnDialog(true);
          let count = 60;
          countdownInterval = setInterval(() => {
            count -= 1;
            setCountdown(count);
            if (count <= 0) {
              if (countdownInterval) clearInterval(countdownInterval);
              handleLogout();
            }
          }, 1000);
        }, warnDelay);

        logoutTimer = setTimeout(() => {
          handleLogout();
        }, timeoutMs);
      } else {
        // Direct logout
        logoutTimer = setTimeout(() => {
          handleLogout();
        }, timeoutMs);
      }
    };

    const activityEvents = ["mousedown", "keydown", "touchstart", "mousemove", "click", "scroll"];
    const handleActivity = () => {
      // Only reset the timer if the warning dialog is not currently showing.
      // If warning dialog is showing, they must click the action button to reset.
      if (!showWarnDialog) {
        resetTimer();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (warnTimer) clearTimeout(warnTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [settings, showWarnDialog]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card/50 backdrop-blur px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="text-sm font-medium text-muted-foreground">StockFlow Gestão</div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
              title="Sair do Sistema"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>

      {/* WARNING DIALOG FOR INACTIVITY */}
      <AlertDialog open={showWarnDialog}>
        <AlertDialogContent className="text-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold flex items-center gap-1.5 text-amber-600">
              <Clock className="h-5 w-5 animate-pulse" />
              Sessão Expirando por Inatividade
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Você está inativo há algum tempo. Por segurança, sua sessão será encerrada
              automaticamente em{" "}
              <strong className="text-amber-600 font-bold">{countdown} segundos</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              onClick={() => {
                setShowWarnDialog(false);
                setCountdown(60);
              }}
            >
              Continuar Conectado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* TROCA OBRIGATÓRIA DE SENHA (primeiro login / forçado pelo administrador) */}
      <AlertDialog open={mustChangePassword}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              Troca de senha obrigatória
            </AlertDialogTitle>
            <AlertDialogDescription>
              Por segurança, você precisa definir uma nova senha antes de continuar
              utilizando o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-new-password"
                type={showNewPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                required
              />
            </div>
            <AlertDialogFooter>
              <Button
                type="submit"
                disabled={isChangingPassword}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Nova Senha"
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
