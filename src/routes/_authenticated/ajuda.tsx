import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Users, Package, Boxes, ArrowDownToLine,
  ArrowUpFromLine, Tag, UserCog, FileSignature, HelpCircle,
  ChevronDown, ChevronRight, Download, MessageCircle, Phone,
  BookOpen, Zap, Shield, TrendingUp, CheckCircle2, Star,
  Settings, Loader2, FileText,
} from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/ajuda")({
  head: () => ({ meta: [{ title: "Ajuda · StockFlow" }] }),
  component: AjudaPage,
});

// ────────────────────────────────────────────────────────────
// DATA
// ────────────────────────────────────────────────────────────

const modules = [
  {
    icon: LayoutDashboard,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    title: "Dashboard",
    desc: "Visão geral em tempo real de toda a operação",
    features: [
      "Cards com KPIs: produtos cadastrados, itens em estoque, valor total, estoque baixo, sem estoque, entradas e saídas do mês",
      "Gráfico de barras: entradas vs saídas nos últimos 6 meses",
      "Gráfico de pizza: top 5 produtos mais movimentados",
      "Central de alertas: lista produtos com estoque abaixo do mínimo",
    ],
  },
  {
    icon: Users,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    title: "Clientes",
    desc: "Cadastro e gestão completa de clientes",
    features: [
      "Cadastro de Pessoa Física (CPF validado) e Pessoa Jurídica (CNPJ)",
      "Dados pessoais: nome, RG, estado civil, profissão, foto",
      "Contatos: telefone, WhatsApp, e-mail",
      "Endereço completo com busca automática por CEP",
      "Histórico de compras e produtos contratados",
      "Controle de pagamentos e parcelas",
      "Documentos e assinatura digital de contratos em tablet",
    ],
  },
  {
    icon: Package,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    title: "Produtos e Materiais",
    desc: "Catálogo completo de produtos para venda",
    features: [
      "Tipos: produto para venda, eletrodoméstico, peça, acessório, material de consumo, equipamento",
      "SKU (código interno) e código de barras",
      "Categoria, marca, unidade de medida e fornecedor",
      "Preço de custo e preço de venda",
      "Estoque atual, mínimo e máximo",
      "Voltagem e potência (eletrodomésticos)",
      "Localização no depósito e número de série",
    ],
  },
  {
    icon: Boxes,
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950/30",
    title: "Controle de Estoque",
    desc: "Posição atual detalhada do inventário",
    features: [
      "Listagem completa com filtro por situação (todos / estoque baixo / sem estoque)",
      "Busca por nome, SKU ou código de barras",
      "Cards de resumo: itens listados, quantidade total, valor total, total de alertas",
      "Indicador visual de situação por produto (Disponível / Baixo / Sem estoque)",
    ],
  },
  {
    icon: ArrowDownToLine,
    color: "text-teal-500",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    title: "Movimentações de Estoque",
    desc: "Rastreamento de entradas, saídas e ajustes",
    features: [
      "Tipos de movimentação: Entrada, Saída, Ajuste (+/-)",
      "Vincula produto, depósito, quantidade e custo unitário",
      "Campo de referência (número de NF, ordem de compra)",
      "Campo de observação para justificativas",
      "Filtro por tipo de movimentação nas abas",
      "Atualização automática do estoque ao registrar",
    ],
  },
  {
    icon: Tag,
    color: "text-pink-500",
    bg: "bg-pink-50 dark:bg-pink-950/30",
    title: "Cadastros Auxiliares",
    desc: "Tabelas de apoio ao sistema",
    features: [
      "Categorias de produtos",
      "Marcas (fabricantes)",
      "Unidades de medida (un, kg, cx, etc.)",
      "Depósitos / armazéns",
      "Fornecedores com dados completos (CNPJ, endereço, contato)",
    ],
  },
  {
    icon: UserCog,
    color: "text-slate-500",
    bg: "bg-slate-50 dark:bg-slate-950/30",
    title: "Usuários",
    desc: "Controle de acesso à plataforma",
    features: [
      "Convite de novos membros por e-mail",
      "Papéis: Administrador e Operador",
      "Ativação e desativação de usuários",
      "Visualização de todos os membros da organização",
    ],
  },
  {
    icon: FileSignature,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    title: "Contratos e Assinaturas",
    desc: "Documentação legal digitalizada",
    features: [
      "Contrato Particular de Compra e Venda com Reserva de Domínio",
      "Preenchimento automático com dados do cliente e da empresa",
      "Assinatura digital com caneta em tablet",
      "Armazenamento seguro no banco de dados",
      "Visualização e reimpressão a qualquer momento",
    ],
  },
];

const faqs = [
  {
    section: "Primeiros passos",
    icon: Zap,
    color: "text-yellow-500",
    items: [
      {
        q: "Como começo a usar o sistema?",
        a: "Acesse o Dashboard pelo menu lateral. Antes de cadastrar produtos, preencha os Cadastros Auxiliares (Categorias, Marcas, Unidades, Depósitos). Depois cadastre seus Produtos e comece a registrar Movimentações.",
      },
      {
        q: "Como cadastro um novo cliente?",
        a: "Vá em Clientes → Novo Cliente no menu. Preencha o nome, CPF (validado automaticamente) e os dados de contato. O CEP preenche o endereço automaticamente. Clique em Salvar Cadastro.",
      },
      {
        q: "Como dou entrada de mercadoria no estoque?",
        a: "Acesse Estoque → Entradas no menu. Clique em 'Nova movimentação', selecione o tipo 'Entrada', escolha o produto, informe a quantidade e custo unitário. Clique em Registrar.",
      },
    ],
  },
  {
    section: "Produtos e Estoque",
    icon: Package,
    color: "text-orange-500",
    items: [
      {
        q: "Como editar o estoque de um produto diretamente?",
        a: "Vá em Produtos, clique no lápis (editar) ao lado do produto. No formulário, altere o campo 'Estoque atual' e salve. Para rastreabilidade, prefira registrar uma Movimentação.",
      },
      {
        q: "Como recebo um alerta de estoque baixo?",
        a: "O sistema alerta automaticamente no Dashboard quando o estoque atual de um produto fica igual ou abaixo do 'Estoque mínimo' cadastrado no produto. Defina o estoque mínimo corretamente em cada produto.",
      },
      {
        q: "Posso cadastrar produtos sem fornecedor?",
        a: "Sim. Fornecedor, categoria, marca e unidade são campos opcionais no cadastro de produto. Apenas o Nome é obrigatório.",
      },
    ],
  },
  {
    section: "Clientes e Contratos",
    icon: FileSignature,
    color: "text-indigo-500",
    items: [
      {
        q: "O CPF é validado de verdade?",
        a: "Sim. O sistema realiza a validação matemática completa dos dois dígitos verificadores do CPF. CPFs inválidos (como 000.000.000-00) são bloqueados no cadastro.",
      },
      {
        q: "Como o cliente assina o contrato digitalmente?",
        a: "Na aba 'Documentos e Assinaturas' do cliente, clique em 'Gerar Contrato'. O documento será exibido com um campo de assinatura. O cliente desenha a assinatura com o dedo ou caneta no tablet.",
      },
      {
        q: "Os dados da empresa aparecem automaticamente no contrato?",
        a: "Sim. O contrato preenche automaticamente os dados da empresa (vendedora) e os dados do cliente cadastrado no sistema.",
      },
    ],
  },
  {
    section: "Acesso e Segurança",
    icon: Shield,
    color: "text-green-500",
    items: [
      {
        q: "Como adiciono um novo usuário ao sistema?",
        a: "Vá em Cadastros → Usuários. Clique em 'Convidar'. Digite o e-mail e escolha o papel (Administrador ou Operador). O usuário receberá um e-mail de convite.",
      },
      {
        q: "Qual a diferença entre Administrador e Operador?",
        a: "Administradores têm acesso total, incluindo gerenciamento de usuários e configurações da organização. Operadores podem gerenciar produtos, estoque, clientes e movimentações.",
      },
      {
        q: "Onde ficam armazenados os dados?",
        a: "Todos os dados são armazenados com segurança no Supabase (PostgreSQL na nuvem), com autenticação segura e backup automático.",
      },
    ],
  },
];

const quickSteps = [
  { step: 1, title: "Configure os cadastros", desc: "Crie suas Categorias, Marcas, Unidades e Depósitos antes de tudo", icon: Settings },
  { step: 2, title: "Cadastre seus produtos", desc: "Adicione todos os eletrodomésticos e produtos com preço e estoque mínimo", icon: Package },
  { step: 3, title: "Dê entrada no estoque", desc: "Registre as entradas de mercadoria para inicializar o inventário", icon: ArrowDownToLine },
  { step: 4, title: "Cadastre clientes", desc: "Adicione clientes com CPF válido, endereço e dados de contato", icon: Users },
  { step: 5, title: "Faça vendas", desc: "Registre saídas de estoque e gere contratos assinados digitalmente", icon: ArrowUpFromLine },
  { step: 6, title: "Monitore o Dashboard", desc: "Acompanhe KPIs, alertas e tendências de movimentação", icon: TrendingUp },
];

// ────────────────────────────────────────────────────────────
// PDF GENERATOR
// ────────────────────────────────────────────────────────────

function generatePortfolioPDF() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 18;
  const contentW = W - margin * 2;

  // ── helpers ──────────────────────────────────────────────
  const hex = (color: string) => color;
  const primary = "#1e3a8a";    // blue-900
  const accent  = "#db2777";    // pink-600
  const light   = "#f1f5f9";    // slate-100
  const dark    = "#1e293b";    // slate-800
  const muted   = "#64748b";    // slate-500

  let y = 0;

  function addPage() {
    doc.addPage();
    y = margin;
    // page border line
    doc.setDrawColor(primary);
    doc.setLineWidth(0.4);
    doc.line(margin, 8, W - margin, 8);
    doc.line(margin, 289, W - margin, 289);
  }

  function checkSpace(needed: number) {
    if (y + needed > 277) addPage();
  }

  function sectionTitle(text: string, color = primary) {
    checkSpace(14);
    doc.setFillColor(color);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin + 4, y + 6.2);
    y += 13;
    doc.setTextColor(dark);
  }

  function bodyText(text: string, indent = 0, size = 9.5, color = dark) {
    doc.setFontSize(size);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, contentW - indent);
    checkSpace(lines.length * 5 + 1);
    doc.text(lines, margin + indent, y);
    y += lines.length * 5 + 1;
  }

  function bullet(text: string) {
    checkSpace(6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(muted);
    doc.text("•", margin + 4, y);
    doc.setTextColor(dark);
    const lines = doc.splitTextToSize(text, contentW - 12);
    doc.text(lines, margin + 9, y);
    y += lines.length * 5;
  }

  function divider(color = light) {
    checkSpace(5);
    doc.setDrawColor(color);
    doc.setLineWidth(0.3);
    doc.line(margin, y, W - margin, y);
    y += 4;
  }

  // ── CAPA ─────────────────────────────────────────────────
  // Header gradient block
  doc.setFillColor(primary);
  doc.rect(0, 0, W, 90, "F");

  // Accent bar
  doc.setFillColor(accent);
  doc.rect(0, 85, W, 8, "F");

  // Logo circle
  doc.setFillColor(255, 255, 255);
  doc.circle(W / 2, 36, 22, "F");
  doc.setTextColor(primary);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("J&J", W / 2, 40, { align: "center" });

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Josi & Jó", W / 2, 70, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Eletrodomésticos", W / 2, 78, { align: "center" });

  // Cover body
  y = 108;
  doc.setTextColor(dark);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Portfólio do Sistema de Gestão", W / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(muted);
  doc.text("StockFlow — ERP Completo para Eletrodomésticos e Enxovais", W / 2, y, { align: "center" });

  y += 14;
  // Tag boxes
  const tags = ["Gestão de Estoque", "Controle de Clientes", "Contratos Digitais", "Dashboard em Tempo Real"];
  const tagW = 42;
  const totalTagW = tags.length * tagW + (tags.length - 1) * 4;
  let tx = (W - totalTagW) / 2;
  tags.forEach(tag => {
    doc.setFillColor(light);
    doc.roundedRect(tx, y, tagW, 8, 2, 2, "F");
    doc.setTextColor(primary);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(tag, tx + tagW / 2, y + 5.2, { align: "center" });
    tx += tagW + 4;
  });

  y += 18;
  divider();

  // About section
  sectionTitle("📋  Sobre a Empresa");
  bodyText(
    "A Josi & Jó Eletrodomésticos é uma empresa especializada na comercialização de eletrodomésticos e enxovais de cama, mesa e banho, com atendimento humanizado e qualidade garantida. Localizada em Tibiri/Santa Rita, Paraíba, a empresa conta com um sistema de gestão moderno e integrado para controlar todo o fluxo de vendas, estoque e clientes."
  );
  y += 3;
  bodyText("📞  (83) 98805-9666     📍  Tibiri/Santa Rita, Paraíba, Brasil", 0, 9, muted);
  y += 6;

  // ── MÓDULOS ──────────────────────────────────────────────
  sectionTitle("🗂️  Módulos do Sistema");

  const moduleData = [
    { name: "Dashboard", desc: "KPIs em tempo real, gráficos de movimentação e alertas de estoque baixo.", features: ["Cards de indicadores", "Gráfico de barras e pizza", "Central de alertas"] },
    { name: "Gestão de Clientes", desc: "Cadastro completo de clientes com validação de CPF/CNPJ e endereço por CEP.", features: ["Dados pessoais e contato", "Validação matemática de CPF", "Busca de endereço por CEP"] },
    { name: "Histórico & Pagamentos", desc: "Rastreamento completo de compras, pagamentos e parcelas por cliente.", features: ["Histórico de compras", "Controle de pagamentos", "Gestão de parcelas"] },
    { name: "Contratos Digitais", desc: "Contrato de compra e venda com reserva de domínio e assinatura digital.", features: ["Preenchimento automático", "Assinatura via tablet", "Armazenamento seguro"] },
    { name: "Produtos & Estoque", desc: "Catálogo completo com SKU, código de barras, preços e controle de estoque.", features: ["SKU e código de barras", "Estoque mín./máx.", "Alertas automáticos"] },
    { name: "Movimentações", desc: "Registro de entradas, saídas e ajustes com rastreabilidade completa.", features: ["Entrada de mercadoria", "Saída por venda", "Ajuste de inventário"] },
    { name: "Cadastros Auxiliares", desc: "Categorias, marcas, unidades, depósitos e fornecedores.", features: ["Categorias e marcas", "Unidades de medida", "Fornecedores (CNPJ)"] },
    { name: "Gestão de Usuários", desc: "Controle de acesso com papéis de Administrador e Operador.", features: ["Convite por e-mail", "Papéis de acesso", "Ativação/desativação"] },
  ];

  moduleData.forEach((mod, i) => {
    checkSpace(32);
    // Module card
    doc.setFillColor(i % 2 === 0 ? "#f8fafc" : "#fff");
    doc.roundedRect(margin, y, contentW, 28, 2, 2, "F");
    doc.setDrawColor("#e2e8f0");
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, 28, 2, 2, "S");

    // Number badge
    doc.setFillColor(primary);
    doc.circle(margin + 6, y + 7, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}`, margin + 6, y + 9.2, { align: "center" });

    // Module name
    doc.setTextColor(dark);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(mod.name, margin + 14, y + 8);

    // Description
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(muted);
    const descLines = doc.splitTextToSize(mod.desc, contentW - 14);
    doc.text(descLines, margin + 14, y + 14);

    // Feature chips
    let cx = margin + 14;
    const chipY = y + 21;
    mod.features.forEach(feat => {
      const fw = doc.getTextWidth(feat) + 6;
      doc.setFillColor("#dbeafe");
      doc.roundedRect(cx, chipY - 3.5, fw, 5.5, 1, 1, "F");
      doc.setTextColor(primary);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(feat, cx + 3, chipY + 0.5);
      cx += fw + 3;
    });

    y += 31;
  });

  // ── DIFERENCIAIS ─────────────────────────────────────────
  addPage();
  sectionTitle("⭐  Diferenciais do Sistema", accent);

  const diffs = [
    { title: "100% na Nuvem", desc: "Acesse de qualquer dispositivo, a qualquer hora, com segurança total de dados." },
    { title: "Validação de CPF/CNPJ", desc: "Algoritmo matemático garante que somente documentos reais sejam cadastrados." },
    { title: "Assinatura Digital", desc: "Contratos assinados diretamente em tablet, sem papel e com validade jurídica." },
    { title: "Alertas em Tempo Real", desc: "Notificações automáticas de estoque baixo para nunca perder uma venda." },
    { title: "Multi-usuário", desc: "Múltiplos colaboradores com controle de acesso por papel (admin/operador)." },
    { title: "Relatórios Visuais", desc: "Gráficos interativos de movimentação e produtos mais vendidos." },
  ];

  diffs.forEach(d => {
    checkSpace(16);
    doc.setFillColor("#eff6ff");
    doc.roundedRect(margin, y, contentW, 13, 2, 2, "F");
    doc.setTextColor(primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`✓  ${d.title}`, margin + 4, y + 5.5);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(muted);
    doc.text(d.desc, margin + 4, y + 10.5);
    y += 16;
  });

  y += 4;

  // ── CONTATO ──────────────────────────────────────────────
  sectionTitle("📞  Informações de Contato", accent);

  doc.setFillColor(primary);
  doc.roundedRect(margin, y, contentW, 32, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Josi & Jó Eletrodomésticos", W / 2, y + 10, { align: "center" });
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text("📱  WhatsApp: (83) 98805-9666", W / 2, y + 18, { align: "center" });
  doc.text("📍  Tibiri/Santa Rita, Paraíba, Brasil", W / 2, y + 24, { align: "center" });

  y += 40;

  // ── FOOTER ───────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(muted);
    doc.text(`Josi & Jó Eletrodomésticos  ·  Sistema StockFlow  ·  Página ${i} de ${pageCount}`, W / 2, 285, { align: "center" });
  }

  doc.save("portfolio-josi-e-jo.pdf");
}

// ────────────────────────────────────────────────────────────
// COMPONENTS
// ────────────────────────────────────────────────────────────

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-sm pr-4">{q}</span>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed border-t bg-muted/10">
          {a}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// PAGE
// ────────────────────────────────────────────────────────────

function AjudaPage() {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      generatePortfolioPDF();
    } finally {
      setTimeout(() => setDownloading(false), 1200);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* ── HERO ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white p-8 md:p-10">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-6 w-6 text-blue-300" />
              <Badge className="bg-blue-700/60 text-blue-100 hover:bg-blue-700/60 border-blue-600/40">Central de Ajuda</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Como podemos ajudar?</h1>
            <p className="text-blue-200 text-sm md:text-base max-w-lg">
              Guia completo do sistema StockFlow — conheça todos os módulos, tire dúvidas e baixe o portfólio da Josi & Jó Eletrodomésticos.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <Button
              size="lg"
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-lg shadow-pink-900/40 border-0"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando PDF…</>
                : <><Download className="h-4 w-4 mr-2" /> Baixar Portfólio PDF</>
              }
            </Button>
            <a
              href="https://wa.me/5583988059666?text=Olá!%20Preciso%20de%20suporte%20no%20sistema."
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg" className="w-full border-white/30 text-white hover:bg-white/10 hover:text-white">
                <MessageCircle className="h-4 w-4 mr-2" /> Suporte via WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* ── QUICK START ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-bold">Guia de Início Rápido</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickSteps.map((s) => (
            <Card key={s.step} className="shadow-card hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-white font-bold text-sm">
                  {s.step}
                </div>
                <div>
                  <div className="font-semibold text-sm mb-0.5">{s.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{s.desc}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── MODULES ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-bold">Módulos do Sistema</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {modules.map((mod) => (
            <Card key={mod.title} className="shadow-card hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className={`grid h-8 w-8 place-items-center rounded-lg ${mod.bg}`}>
                    <mod.icon className={`h-4 w-4 ${mod.color}`} />
                  </div>
                  {mod.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{mod.desc}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5">
                  {mod.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-purple-500" />
          <h2 className="text-xl font-bold">Perguntas Frequentes</h2>
        </div>
        <div className="space-y-6">
          {faqs.map((section) => (
            <div key={section.section}>
              <div className="flex items-center gap-2 mb-2">
                <section.icon className={`h-4 w-4 ${section.color}`} />
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{section.section}</h3>
              </div>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <AccordionItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PORTFOLIO CARD ── */}
      <section>
        <Card className="shadow-card border-2 border-dashed border-pink-200 dark:border-pink-900 bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/20 dark:to-background">
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-pink-600 text-white shadow-lg shadow-pink-500/30">
              <FileText className="h-8 w-8" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold mb-1">Portfólio Completo — Josi & Jó Eletrodomésticos</h3>
              <p className="text-sm text-muted-foreground">
                Documento PDF profissional com apresentação da empresa, todos os módulos do sistema, diferenciais e informações de contato. Ideal para apresentar a clientes e parceiros.
              </p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                {["8 Módulos", "Diferenciais", "Contato", "Formato A4"].map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
            <Button
              size="lg"
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-md border-0 shrink-0"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando…</>
                : <><Download className="h-4 w-4 mr-2" /> Baixar PDF</>
              }
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* ── SUPPORT ── */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Card className="shadow-card bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-green-600 text-white">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-sm mb-0.5">Suporte via WhatsApp</div>
              <div className="text-xs text-muted-foreground mb-2">Tire dúvidas rapidamente</div>
              <a href="https://wa.me/5583988059666?text=Olá!%20Preciso%20de%20suporte%20no%20sistema." target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0 text-xs">
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Abrir WhatsApp
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-700 text-white">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-sm mb-0.5">Telefone / Ligação</div>
              <div className="text-xs text-muted-foreground mb-2">(83) 98805-9666</div>
              <a href="tel:+5583988059666">
                <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white border-0 text-xs">
                  <Phone className="h-3.5 w-3.5 mr-1.5" /> Ligar agora
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── FOOTER INFO ── */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <Star className="h-3.5 w-3.5 text-yellow-400" />
        <span>StockFlow Gestão · Desenvolvido para Josi & Jó Eletrodomésticos · Tibiri/Santa Rita, Paraíba</span>
        <Star className="h-3.5 w-3.5 text-yellow-400" />
      </div>
    </div>
  );
}
