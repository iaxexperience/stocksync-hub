import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Package, Boxes, TrendingUp, TrendingDown, Wallet, ShieldCheck,
  BarChart3, Bell, Truck, Users, ArrowRight, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StockFlow Gestão — Controle de estoque, compras e financeiro" },
      { name: "description", content: "SaaS completo para gestão de estoque, materiais, eletrodomésticos, fornecedores, contas a pagar e receber. Comece agora, sem cartão." },
      { property: "og:title", content: "StockFlow Gestão" },
      { property: "og:description", content: "Controle completo do seu estoque, pagamentos e recebimentos em um único sistema." },
    ],
  }),
  component: Landing,
});

const beneficios = [
  { icon: Boxes, title: "Controle de estoque", desc: "Entradas, saídas, transferências, reservas e saldo disponível em tempo real." },
  { icon: Wallet, title: "Gestão financeira", desc: "Contas a pagar, a receber, despesas, receitas e fluxo de caixa unificados." },
  { icon: Truck, title: "Fornecedores e compras", desc: "Cadastro, cotações, ordens de compra e histórico completo de negociações." },
  { icon: Bell, title: "Alertas inteligentes", desc: "Estoque baixo, produtos sem movimentação e contas próximas do vencimento." },
  { icon: BarChart3, title: "Relatórios gerenciais", desc: "Visualize resultados, desempenho e movimentações com gráficos claros." },
  { icon: ShieldCheck, title: "Segurança e permissões", desc: "Controle multiempresa com papéis por cargo, setor e responsabilidade." },
];

const modulos = [
  "Dashboard", "Produtos", "Materiais", "Eletrodomésticos", "Categorias", "Marcas",
  "Fornecedores", "Clientes", "Compras", "Vendas", "Entradas", "Saídas",
  "Transferências", "Inventário", "Contas a pagar", "Contas a receber",
  "Fluxo de caixa", "Relatórios", "Usuários", "Configurações",
];

function Landing() {
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary text-primary-foreground font-bold">SF</div>
            <span className="font-semibold text-foreground">StockFlow <span className="text-muted-foreground font-normal">Gestão</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#inicio" className="hover:text-foreground">Início</a>
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#beneficios" className="hover:text-foreground">Benefícios</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
            <a href="#contato" className="hover:text-foreground">Contato</a>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthed ? (
              <Button asChild><Link to="/dashboard">Ir ao painel</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth">Entrar</Link></Button>
                <Button asChild><Link to="/auth" search={{ mode: "signup" } as any}>Começar agora</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="inicio" className="pt-28 pb-20 gradient-hero text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              <CheckCircle2 className="h-3.5 w-3.5" /> Multiempresa · Seguro · Em tempo real
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              Controle completo do seu estoque, pagamentos e recebimentos em um único sistema.
            </h1>
            <p className="mt-5 text-lg text-white/85 max-w-xl">
              Gerencie entradas, saídas, fornecedores, vendas, despesas, contas a receber e indicadores financeiros com segurança, agilidade e informações em tempo real.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link to="/auth" search={{ mode: "signup" } as any}>Começar agora <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <a href="#recursos">Conhecer recursos</a>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20 p-4 shadow-elegant">
              <div className="rounded-xl bg-card text-card-foreground p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold">Dashboard · Visão geral</div>
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-destructive"></span>
                    <span className="h-2 w-2 rounded-full bg-warning"></span>
                    <span className="h-2 w-2 rounded-full bg-success"></span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: "Produtos", v: "1.284", i: Package, c: "text-info" },
                    { l: "Estoque", v: "R$ 342k", i: Boxes, c: "text-primary" },
                    { l: "A receber", v: "R$ 87k", i: TrendingUp, c: "text-success" },
                    { l: "A pagar", v: "R$ 54k", i: TrendingDown, c: "text-destructive" },
                  ].map((k) => (
                    <div key={k.l} className="rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{k.l}</span>
                        <k.i className={`h-4 w-4 ${k.c}`} />
                      </div>
                      <div className="mt-1 text-lg font-bold">{k.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-32 rounded-lg bg-gradient-to-t from-primary/15 to-transparent flex items-end gap-1 p-2">
                  {[40, 55, 30, 70, 60, 85, 65, 90, 75, 95, 70, 88].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold">Benefícios que geram resultado</h2>
            <p className="mt-3 text-muted-foreground">Tudo em um só lugar para operar com clareza e tomar decisões melhores.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {beneficios.map((b) => (
              <div key={b.title} className="group rounded-2xl border bg-card p-6 shadow-card hover:shadow-elegant transition-all">
                <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary text-primary-foreground">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-lg">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-20 bg-secondary/40 border-y">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold">Recursos do sistema</h2>
            <p className="mt-3 text-muted-foreground">Módulos cobrindo estoque, compras, vendas, financeiro e administração.</p>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {modulos.map((m) => (
              <span key={m} className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-card">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />{m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="planos" className="py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold">Tenha controle financeiro e operacional da sua empresa em tempo real.</h2>
          <p className="mt-4 text-lg text-muted-foreground">Comece agora, sem cartão de crédito.</p>
          <div className="mt-8">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground border-0">
              <Link to="/auth" search={{ mode: "signup" } as any}>Criar minha conta <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="border-t bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-12 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary text-primary-foreground font-bold text-xs">SF</div>
              <span className="font-semibold">StockFlow Gestão</span>
            </div>
            <p className="mt-3 text-muted-foreground">Plataforma completa para gestão de estoque e financeiro.</p>
          </div>
          <div>
            <div className="font-semibold mb-3">Produto</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#recursos" className="hover:text-foreground">Recursos</a></li>
              <li><a href="#beneficios" className="hover:text-foreground">Benefícios</a></li>
              <li><a href="#planos" className="hover:text-foreground">Planos</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">Institucional</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Política de privacidade</a></li>
              <li><a href="#" className="hover:text-foreground">Termos de uso</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">Contato</div>
            <ul className="space-y-2 text-muted-foreground">
              <li>contato@stockflow.app</li>
              <li>+55 (11) 4000-0000</li>
            </ul>
          </div>
        </div>
        <div className="border-t py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} StockFlow Gestão. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
