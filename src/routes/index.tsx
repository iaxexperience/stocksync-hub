import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  ShoppingBag,
  Phone,
  Home,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Heart,
  Star,
  HelpCircle,
  Layers,
  ShoppingCart,
  MessageSquare,
  Headphones,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Josi & Jó Eletrodomésticos — Tudo para o seu Lar" },
      {
        name: "description",
        content:
          "Encontre os melhores eletrodomésticos, cama, mesa e banho para equipar e decorar sua casa com qualidade e o melhor atendimento.",
      },
      { property: "og:title", content: "Josi & Jó Eletrodomésticos" },
      {
        property: "og:description",
        content: "Tudo para o seu lar em eletrodomésticos, cama, mesa e banho.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Josi & Jó Eletrodomésticos"
              className="h-14 w-14 rounded-full border-2 border-pink-500 object-cover shadow-sm"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-blue-900 leading-none">Josi & Jó</span>
              <span className="text-xs font-semibold text-pink-600 tracking-wider uppercase">
                Eletrodomésticos
              </span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#inicio" className="hover:text-pink-600 transition-colors">
              Início
            </a>
            <a href="#categorias" className="hover:text-pink-600 transition-colors">
              Categorias
            </a>
            <a href="#diferenciais" className="hover:text-pink-600 transition-colors">
              Diferenciais
            </a>
            <a href="#sobre" className="hover:text-pink-600 transition-colors">
              Quem Somos
            </a>
            <a href="#contato" className="hover:text-pink-600 transition-colors">
              Contato
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthed ? (
              <Button
                asChild
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-full px-5 py-5 transition-all shadow-md"
              >
                <Link to="/dashboard">Painel Administrativo</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="text-slate-700 hover:text-pink-600 font-bold hidden sm:inline-flex"
                >
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button
                  asChild
                  className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-full px-6 py-5 transition-all shadow-md"
                >
                  <Link to="/auth" search={{ mode: "signup" as const }}>
                    Fazer Cadastro
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="inicio"
        className="pt-32 pb-20 bg-gradient-to-br from-blue-900 via-blue-950 to-indigo-900 text-white relative overflow-hidden"
      >
        {/* Decorative subtle ambient lights */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-pink-300">
              <Sparkles className="h-3.5 w-3.5" /> Tudo para o seu Lar · Eletro & Enxovais
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
              O aconchego e a tecnologia que a sua casa merece.
            </h1>
            <p className="text-lg text-slate-200 max-w-2xl font-medium leading-relaxed">
              Na Josi & Jó você encontra o melhor em tecnologia de eletrodomésticos e o carinho dos
              nossos enxovais de cama, mesa e banho. Qualidade garantida e atendimento humanizado.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-full px-8 py-6 shadow-lg shadow-pink-500/20 hover:scale-105 transition-all"
              >
                <a
                  href="https://wa.me/5583988059666?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20os%20produtos."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Phone className="h-5 w-5" /> Falar no WhatsApp
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white rounded-full px-8 py-6"
              >
                <a href="#categorias">Ver Nossos Produtos</a>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex justify-center">
            {/* Visual Frame */}
            <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white/15 bg-white/5 backdrop-blur-md p-3 group">
              <img
                src="/logo.jpg"
                alt="Josi & Jó Logomarca"
                className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-all duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categorias / Showcase */}
      <section id="categorias" className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-sm font-bold text-pink-600 tracking-widest uppercase">
              Nossas Categorias
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-blue-900 tracking-tight">
              O que você encontra aqui
            </h2>
            <p className="text-slate-600 font-medium">
              Produtos selecionados a dedo das melhores marcas para equipar e decorar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Eletrodomésticos */}
            <Card className="overflow-hidden border-0 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 rounded-3xl group flex flex-col justify-between">
              <div>
                <div className="relative overflow-hidden aspect-video">
                  <img
                    src="/eletrodomesticos.png"
                    alt="Eletrodomésticos Josi & Jó"
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-blue-900 text-white font-bold text-xs uppercase px-3 py-1 rounded-full">
                    Tecnologia & Praticidade
                  </div>
                </div>
                <CardContent className="p-8">
                  <h3 className="text-2xl font-extrabold text-blue-900 mb-4 flex items-center gap-2">
                    <Home className="h-6 w-6 text-pink-600" /> Eletrodomésticos
                  </h3>
                  <p className="text-slate-600 mb-6 font-medium leading-relaxed">
                    Equipe sua cozinha e área de serviço com o que há de melhor. Trabalhamos com as
                    marcas mais confiáveis do mercado para garantir durabilidade e eficiência no seu
                    dia a dia.
                  </p>
                  <ul className="grid grid-cols-2 gap-3 text-sm font-semibold text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Refrigeradores
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Máquinas de Lavar
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Micro-ondas
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Fogões & Cooktops
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Fornos Elétricos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Climatizadores
                    </li>
                  </ul>
                </CardContent>
              </div>
            </Card>

            {/* Cama, Mesa e Banho */}
            <Card className="overflow-hidden border-0 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 rounded-3xl group flex flex-col justify-between">
              <div>
                <div className="relative overflow-hidden aspect-video">
                  <img
                    src="/cama_mesa_banho.png"
                    alt="Cama, Mesa e Banho Josi & Jó"
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-pink-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-full">
                    Aconchego & Estilo
                  </div>
                </div>
                <CardContent className="p-8">
                  <h3 className="text-2xl font-extrabold text-blue-900 mb-4 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-pink-600" /> Cama, Mesa & Banho
                  </h3>
                  <p className="text-slate-600 mb-6 font-medium leading-relaxed">
                    Transforme seu lar em um hotel 5 estrelas. Tecidos nobres, toques macios e
                    designs que trazem beleza e elegância para os seus quartos, banheiros e salas de
                    jantar.
                  </p>
                  <ul className="grid grid-cols-2 gap-3 text-sm font-semibold text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pink-500" /> Jogos de Cama
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pink-500" /> Edredons & Colchas
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pink-500" /> Toalhas de Banho
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pink-500" /> Toalhas de Rosto
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pink-500" /> Caminhos de Mesa
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pink-500" /> Jogos Americanos
                    </li>
                  </ul>
                </CardContent>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Diferenciais Section */}
      <section id="diferenciais" className="py-20 bg-blue-900 text-white relative">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-sm font-bold text-pink-300 tracking-widest uppercase">
              Por que nos escolher?
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Nossos Compromissos
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Home,
                title: "Tudo para o seu lar",
                desc: "Do enxoval de alta qualidade ao eletrodoméstico moderno, equipamos sua casa completa.",
              },
              {
                icon: ShieldCheck,
                title: "Qualidade que confia",
                desc: "Apenas marcas líderes e garantia oficial para você comprar com total tranquilidade.",
              },
              {
                icon: ShoppingBag,
                title: "Variedade de marcas",
                desc: "Um catálogo completo com as principais opções do mercado para você escolher.",
              },
              {
                icon: Headphones,
                title: "Atendimento diferenciado",
                desc: "Suporte consultivo e humanizado no WhatsApp para te ajudar a escolher o melhor produto.",
              },
            ].map((d, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 space-y-4"
              >
                <div className="h-12 w-12 rounded-xl bg-pink-600 flex items-center justify-center text-white">
                  <d.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">{d.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre Nós */}
      <section id="sobre" className="py-24">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-sm font-bold text-pink-600 tracking-widest uppercase">
              Quem Somos
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-blue-900 tracking-tight">
              Sua parceira de confiança para transformar sua casa
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              A **Josi & Jó Eletrodomésticos** nasceu com a missão de trazer facilidade, tecnologia
              e aconchego para as famílias brasileiras. Unimos em um único lugar eletrodomésticos de
              ponta e itens de decoração e enxoval refinados para cama, mesa e banho.
            </p>
            <p className="text-slate-600 font-medium leading-relaxed">
              Trabalhamos duro para oferecer um atendimento de excelência, rápida entrega,
              excelentes opções de financiamento e o suporte humanizado que faz com que você se
              sinta em casa.
            </p>
            <div className="pt-2">
              <Button
                asChild
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-full px-8 py-5"
              >
                <a
                  href="https://wa.me/5583988059666?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20os%20produtos."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Falar Conosco
                </a>
              </Button>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="grid grid-cols-2 gap-4">
              <img
                src="/eletrodomesticos.png"
                alt="Cozinha Josi e Jó"
                className="rounded-3xl shadow-md w-full aspect-square object-cover"
              />
              <img
                src="/cama_mesa_banho.png"
                alt="Quarto Josi e Jó"
                className="rounded-3xl shadow-md w-full aspect-square object-cover mt-8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-gradient-to-br from-blue-900 to-indigo-950 text-white text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-4xl px-4 relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Pronto para dar aquele upgrade no seu lar?
          </h2>
          <p className="text-lg text-slate-200 max-w-2xl mx-auto font-medium">
            Fale conosco agora pelo WhatsApp, consulte disponibilidade ou faça seu orçamento sem
            compromisso!
          </p>
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-full px-10 py-6 shadow-lg shadow-pink-600/20 hover:scale-105 transition-all"
            >
              <a
                href="https://wa.me/5583988059666?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20os%20produtos."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Phone className="h-5 w-5" /> Entrar em Contato: (83) 98805-9666
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="border-t border-slate-200 bg-white text-sm text-slate-600">
        <div className="mx-auto max-w-7xl px-4 py-16 grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="Josi & Jó Eletrodomésticos"
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="font-extrabold text-blue-900 text-lg">Josi & Jó</span>
            </div>
            <p className="text-slate-500 font-medium">
              Transformando casas em lares com os melhores eletrodomésticos e enxovais.
            </p>
          </div>
          <div>
            <div className="font-extrabold text-blue-900 mb-4 uppercase tracking-wider text-xs">
              Categorias
            </div>
            <ul className="space-y-2.5 font-semibold">
              <li>
                <a href="#categorias" className="hover:text-pink-600 transition-colors">
                  Eletrodomésticos
                </a>
              </li>
              <li>
                <a href="#categorias" className="hover:text-pink-600 transition-colors">
                  Cama, Mesa & Banho
                </a>
              </li>
              <li>
                <a href="#diferenciais" className="hover:text-pink-600 transition-colors">
                  Nossos Diferenciais
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-extrabold text-blue-900 mb-4 uppercase tracking-wider text-xs">
              Administrativo
            </div>
            <ul className="space-y-2.5 font-semibold">
              <li>
                <Link to="/auth" className="hover:text-pink-600 transition-colors">
                  Acessar Sistema
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-extrabold text-blue-900 mb-4 uppercase tracking-wider text-xs">
              Contato & Endereço
            </div>
            <ul className="space-y-2.5 font-semibold text-slate-600">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-pink-600" /> (83) 98805-9666
              </li>
              <li className="text-slate-500 font-normal">Tibiri/Santa Rita, Paraíba, Brasil</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-medium">
          © {new Date().getFullYear()} Josi & Jó Eletrodomésticos. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
