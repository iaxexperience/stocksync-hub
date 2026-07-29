import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Tag,
  Building2,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ruler,
  LogOut,
  Boxes,
  Settings,
  Users,
  UserPlus,
  ShieldCheck,
  History,
  CreditCard,
  FileSignature,
  HelpCircle,
  BookOpen,
  TrendingUp,
  FileBarChart,
  ChevronDown,
  HandCoins,
  ShoppingBag,
  PackageX,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SIDEBAR_GROUPS_STORAGE_KEY = "stockflow_sidebar_open_groups";

const groups = [
  {
    label: "Visão geral",
    items: [
      { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      { title: "Financeiro & Caixa", to: "/financeiro", notSearchAba: "cobranca", icon: TrendingUp },
      { title: "Cobrança", to: "/financeiro", search: { aba: "cobranca" }, icon: HandCoins },
    ],
  },
  {
    label: "Clientes",
    items: [
      { title: "Lista de Clientes", to: "/clientes", search: { aba: "lista" }, icon: Users },
      {
        title: "Novo Cliente",
        to: "/clientes",
        search: { aba: "novo" },
        excludeSearch: { modo: "sacola" },
        icon: UserPlus,
      },
      {
        title: "Sacola",
        to: "/clientes",
        search: { aba: "novo", modo: "sacola" },
        icon: ShoppingBag,
      },
      {
        title: "Produtos Contratados",
        to: "/clientes",
        search: { aba: "produtos" },
        icon: ShieldCheck,
      },
      {
        title: "Histórico de Compras",
        to: "/clientes",
        search: { aba: "historico" },
        icon: History,
      },
      { title: "Pagamentos", to: "/clientes", search: { aba: "pagamentos" }, icon: CreditCard },
      {
        title: "Documentos e Assinaturas",
        to: "/clientes",
        search: { aba: "documentos" },
        icon: FileSignature,
      },
    ],
  },
  {
    label: "Estoque",
    items: [
      { title: "Produtos", to: "/produtos", icon: Package },
      { title: "Controle de Estoque", to: "/estoque", icon: Boxes },
      {
        title: "Entradas",
        to: "/movimentacoes",
        search: { tipo: "entrada" },
        icon: ArrowDownToLine,
      },
      { title: "Saídas", to: "/movimentacoes", search: { tipo: "saida" }, icon: ArrowUpFromLine },
      { title: "Avarias", to: "/avarias", icon: PackageX },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { title: "Categorias", to: "/cadastros/$tipo", params: { tipo: "categorias" }, icon: Tag },
      { title: "Marcas", to: "/cadastros/$tipo", params: { tipo: "marcas" }, icon: Building2 },
      { title: "Unidades", to: "/cadastros/$tipo", params: { tipo: "unidades" }, icon: Ruler },
      {
        title: "Depósitos",
        to: "/cadastros/$tipo",
        params: { tipo: "depositos" },
        icon: Warehouse,
      },
      {
        title: "Fornecedores",
        to: "/cadastros/$tipo",
        params: { tipo: "fornecedores" },
        icon: Truck,
      },
      { title: "Usuários", to: "/usuarios", icon: Users },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { title: "Relatório de Vendas", to: "/relatorios", icon: FileBarChart },
      { title: "Relatório de Estoque", to: "/relatorios-estoque", icon: Boxes },
    ],
  },
  {
    label: "Configurações",
    items: [{ title: "Configurações", to: "/configuracoes", icon: Settings }],
  },
  {
    label: "Suporte",
    items: [{ title: "Ajuda & Portfólio", to: "/ajuda", icon: HelpCircle }],
  },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchParams = useRouterState({ select: (s) => s.location.search }) as any;
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const orgName = (profile as any)?.organizations?.name;

  const { data: orgSettings } = useQuery({
    queryKey: ["organization_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", orgId!)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });
  const logoUrl = orgSettings?.company_logo_url;

  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  function toggleGroup(label: string) {
    setClosedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.full_name || "?")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r-sidebar-border">
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={orgName || "Logo"} className="h-full w-full object-cover" />
            ) : (
              "SF"
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate font-semibold text-sidebar-foreground">
                {orgName || "StockFlow"}
              </div>
              <div className="truncate text-xs text-sidebar-foreground/60">Gestão</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => {
          const isOpen = collapsed || !closedGroups[g.label];
          return (
            <Collapsible key={g.label} open={isOpen} onOpenChange={() => toggleGroup(g.label)}>
              <SidebarGroup>
                {!collapsed && (
                  <CollapsibleTrigger className="flex w-full items-center justify-between">
                    <SidebarGroupLabel className="flex-1 text-left">{g.label}</SidebarGroupLabel>
                    <ChevronDown
                      className={`h-3.5 w-3.5 mr-2 text-sidebar-foreground/50 transition-transform duration-200 ${
                        isOpen ? "" : "-rotate-90"
                      }`}
                    />
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {g.items.map((it: any) => {
                        const active = it.params
                          ? pathname.startsWith(`/cadastros/${it.params.tipo}`)
                          : it.search
                            ? pathname === it.to &&
                              Object.entries(it.search).every(
                                ([k, v]) => (searchParams as any)?.[k] === v,
                              ) &&
                              (!(it as any).excludeSearch ||
                                !Object.entries((it as any).excludeSearch).some(
                                  ([k, v]) => (searchParams as any)?.[k] === v,
                                ))
                            : (it as any).notSearchAba
                              ? pathname === it.to && searchParams.aba !== (it as any).notSearchAba
                              : pathname === it.to;
                        return (
                          <SidebarMenuItem key={it.title}>
                            <SidebarMenuButton asChild isActive={active}>
                              <Link to={it.to} params={it.params} search={it.search}>
                                <it.icon className="h-4 w-4" />
                                {!collapsed && <span>{it.title}</span>}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">
                {profile?.full_name}
              </div>
              <div className="truncate text-xs text-sidebar-foreground/60">
                {(profile as any)?.organizations?.name}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium border border-input bg-background hover:bg-destructive/10 hover:text-destructive text-sidebar-foreground transition-all duration-200"
          title="Sair do Sistema"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
