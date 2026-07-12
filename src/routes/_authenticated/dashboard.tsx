import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import {
  Package,
  Boxes,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  PackageX,
  Bell,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · StockFlow Gestão" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [{ data: products }, { data: moves }] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,stock_current,stock_min,cost_price")
          .eq("organization_id", orgId!),
        supabase
          .from("stock_movements")
          .select("id,movement_type,quantity,unit_cost,created_at,product_id")
          .eq("organization_id", orgId!)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      const prods = products ?? [];
      const mvs = moves ?? [];
      const total = prods.length;
      const totalQty = prods.reduce((a, p) => a + Number(p.stock_current ?? 0), 0);
      const totalValue = prods.reduce(
        (a, p) => a + Number(p.stock_current ?? 0) * Number(p.cost_price ?? 0),
        0,
      );
      const low = prods.filter(
        (p) =>
          Number(p.stock_current ?? 0) > 0 &&
          Number(p.stock_current ?? 0) <= Number(p.stock_min ?? 0),
      ).length;
      const out = prods.filter((p) => Number(p.stock_current ?? 0) <= 0).length;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthMoves = mvs.filter((m) => new Date(m.created_at) >= monthStart);
      const entriesMonth = monthMoves
        .filter((m) => m.movement_type === "entrada")
        .reduce((a, m) => a + Number(m.quantity), 0);
      const exitsMonth = monthMoves
        .filter((m) => m.movement_type === "saida")
        .reduce((a, m) => a + Number(m.quantity), 0);

      // Series last 6 months
      const series = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const label = d.toLocaleDateString("pt-BR", { month: "short" });
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const inSet = mvs.filter((m) => {
          const t = new Date(m.created_at);
          return t >= d && t < next;
        });
        return {
          mes: label,
          entradas: inSet
            .filter((m) => m.movement_type === "entrada")
            .reduce((a, m) => a + Number(m.quantity), 0),
          saidas: inSet
            .filter((m) => m.movement_type === "saida")
            .reduce((a, m) => a + Number(m.quantity), 0),
        };
      });

      // Top movidos
      const byProd = new Map<string, number>();
      mvs.forEach((m) =>
        byProd.set(m.product_id, (byProd.get(m.product_id) ?? 0) + Number(m.quantity)),
      );
      const top = [...byProd.entries()]
        .map(([id, q]) => ({ id, q, name: prods.find((p) => p.id === id)?.name ?? "—" }))
        .sort((a, b) => b.q - a.q)
        .slice(0, 5);

      return {
        total,
        totalQty,
        totalValue,
        low,
        out,
        entriesMonth,
        exitsMonth,
        series,
        top,
        alerts: prods.filter((p) => Number(p.stock_current) <= Number(p.stock_min)).slice(0, 8),
      };
    },
  });

  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards = [
    { l: "Produtos cadastrados", v: stats?.total ?? 0, i: Package, color: "text-info" },
    {
      l: "Itens em estoque",
      v: stats?.totalQty.toLocaleString("pt-BR") ?? 0,
      i: Boxes,
      color: "text-primary",
    },
    { l: "Valor do estoque", v: brl(stats?.totalValue ?? 0), i: DollarSign, color: "text-success" },
    { l: "Estoque baixo", v: stats?.low ?? 0, i: AlertTriangle, color: "text-warning" },
    { l: "Sem estoque", v: stats?.out ?? 0, i: PackageX, color: "text-destructive" },
    {
      l: "Entradas no mês",
      v: stats?.entriesMonth.toLocaleString("pt-BR") ?? 0,
      i: ArrowDownToLine,
      color: "text-success",
    },
    {
      l: "Saídas no mês",
      v: stats?.exitsMonth.toLocaleString("pt-BR") ?? 0,
      i: ArrowUpFromLine,
      color: "text-destructive",
    },
    { l: "Resultado (mock)", v: brl(0), i: TrendingUp, color: "text-primary" },
  ];

  const PIE_COLORS = [
    "hsl(215 60% 45%)",
    "hsl(155 55% 45%)",
    "hsl(45 90% 55%)",
    "hsl(0 70% 55%)",
    "hsl(260 55% 55%)",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral em tempo real da sua operação.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.l} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground truncate">{c.l}</div>
                  <div className="mt-1 text-xl md:text-2xl font-bold truncate">{c.v}</div>
                </div>
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg bg-secondary ${c.color}`}
                >
                  <c.i className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle>Entradas vs Saídas · últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="entradas"
                  name="Entradas"
                  fill="oklch(0.62 0.15 155)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="saidas"
                  name="Saídas"
                  fill="oklch(0.58 0.22 27)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Produtos mais movimentados</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {stats && stats.top.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.top} dataKey="q" nameKey="name" outerRadius={90}>
                    {stats.top.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">
                Sem movimentações ainda.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-warning" /> Central de alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats && stats.alerts.length > 0 ? (
            <ul className="divide-y">
              {stats.alerts.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Estoque atual {Number(p.stock_current).toLocaleString("pt-BR")} · mínimo{" "}
                      {Number(p.stock_min).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold rounded-full px-2.5 py-1 ${Number(p.stock_current) <= 0 ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning"}`}
                  >
                    {Number(p.stock_current) <= 0 ? "Sem estoque" : "Baixo"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Nenhum alerta no momento. 🎉
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
