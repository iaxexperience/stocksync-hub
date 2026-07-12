import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn, Info, ArrowLeft } from "lucide-react";
import { z } from "zod";

type Search = { mode?: "login" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: "login",
  }),
  head: () => ({
    meta: [{ title: "Acessar · StockFlow Gestão" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

function AuthPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error("E-mail ou senha incorretos. Verifique seus dados.");
      return;
    }
    toast.success("Bem-vindo(a) de volta!");
    navigate({ to: "/dashboard" });
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    setGoogleLoading(false);
    if (error) {
      toast.error("Erro ao iniciar login com Google: " + error.message);
    }
    // Note: If Google login redirects to dashboard, the _authenticated guard
    // will check if the user has an org_member record. If they don't (pending approval),
    // they will be redirected back to /auth.
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Brand Panel */}
      <div className="hidden md:flex gradient-hero text-primary-foreground p-10 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 backdrop-blur font-bold">
            SF
          </div>
          <span className="font-semibold">StockFlow Gestão</span>
        </Link>
        <div>
          <div className="text-5xl font-black mb-4 leading-none">Josi & Jó</div>
          <h2 className="text-2xl font-bold leading-tight">
            Sistema de Gestão de Eletrodomésticos
          </h2>
          <p className="mt-3 text-white/80 max-w-md text-sm">
             Controle de estoque, clientes, vendas, contratos e muito mais — em um único lugar.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              "Dashboard em Tempo Real",
              "Gestão de Clientes",
              "Controle de Estoque",
              "Contratos Digitais",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-white/80">
                <div className="h-1.5 w-1.5 rounded-full bg-pink-400 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-white/60">
          © {new Date().getFullYear()} Josi & Jó Eletrodomésticos
        </div>
      </div>

      {/* Login Form */}
      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between mb-2">
            {/* Mobile logo */}
            <Link to="/" className="md:hidden flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary text-primary-foreground font-bold">
                SF
              </div>
              <span className="font-semibold text-slate-800">StockFlow</span>
            </Link>
            {/* Spacer for desktop alignment */}
            <div className="hidden md:block" />
            
            <Link
              to="/"
              className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-pink-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Site</span>
            </Link>
          </div>

          <Card className="shadow-lg border">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <LogIn className="h-5 w-5 text-primary" />
                Acessar o Sistema
              </CardTitle>
              <CardDescription>Use as credenciais fornecidas pelo administrador.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email/Password Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPw ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
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
                <Button
                  type="submit"
                  className="w-full gradient-primary text-primary-foreground border-0"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando…
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" /> Entrar
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              {/* Google Login */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Entrar com Google
                </Button>

                {/* Info note */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    O login com Google requer <strong>aprovação do Administrador</strong> antes de
                    liberar o acesso ao sistema. Seu pedido será analisado em breve.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground">
            Não tem acesso? Solicite ao{" "}
            <span className="font-semibold text-foreground">Administrador do Sistema</span> o
            cadastro do seu usuário.
          </p>
        </div>
      </div>
    </div>
  );
}
