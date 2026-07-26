import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn, ArrowLeft } from "lucide-react";
import { z } from "zod";

type Search = { mode?: "login"; next?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: "login",
    next:
      typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
        ? s.next
        : undefined,
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
  const { next } = Route.useSearch();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

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
    if (next) {
      window.location.href = next;
    } else {
      navigate({ to: "/dashboard" });
    }
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
          <div className="text-5xl font-black mb-4 leading-none">Josi & Jo</div>
          <h2 className="text-2xl font-bold leading-tight">
            Sistema de Gestão de Utilidades Domésticas
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
          © {new Date().getFullYear()} Josi & Jo Eletrodomésticos
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
