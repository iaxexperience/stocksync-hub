import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileBarChart,
  CheckCircle2,
  Clock,
  CreditCard,
  Wallet,
  Package,
  Printer,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · StockFlow" }] }),
  component: RelatoriosPage,
});

function classifyPaymentMethod(method: string | null | undefined) {
  if (!method) return "Outro";
  const m = method.toLowerCase();
  if (m.includes("cartão") || m.includes("cartao")) return "Cartão";
  if (
    m.includes("crediário") ||
    m.includes("crediario") ||
    m.includes("financiamento") ||
    m.includes("parcelado")
  )
    return "Crediário";
  return "Outro";
}

function RelatoriosPage() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;

  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["report_orders", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(name), order_items(*, products(name))")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: installments = [], isLoading: isLoadingInstallments } = useQuery({
    queryKey: ["report_installments", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installments")
        .select("*, orders(organization_id)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((i: any) => i.orders?.organization_id === orgId);
    },
  });

  const rows = useMemo(() => {
    return orders
      .filter((o: any) => o.order_type !== "orcamento" && o.status !== "Cancelado")
      .map((o: any) => {
        const orderInstallments = installments.filter((i: any) => i.order_id === o.id);
        const isQuitado =
          orderInstallments.length > 0
            ? orderInstallments.every((i: any) => i.status === "Pago")
            : o.payment_status === "Pago";
        const productNames: string[] = (o.order_items || [])
          .map((it: any) => it.products?.name)
          .filter(Boolean);

        return {
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customers?.name || "—",
          products: productNames,
          date: o.created_at,
          total: o.total_amount,
          paymentMethod: o.payment_method,
          methodCategory: classifyPaymentMethod(o.payment_method),
          installmentsCount: o.installments || 1,
          isQuitado,
          paidCount: orderInstallments.filter((i: any) => i.status === "Pago").length,
        };
      });
  }, [orders, installments]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (
        customerSearch &&
        !r.customer_name.toLowerCase().includes(customerSearch.toLowerCase())
      )
        return false;
      if (
        productSearch &&
        !r.products.some((p) => p.toLowerCase().includes(productSearch.toLowerCase()))
      )
        return false;
      if (startDate && r.date < `${startDate}T00:00:00`) return false;
      if (endDate && r.date > `${endDate}T23:59:59`) return false;
      if (statusFilter === "quitado" && !r.isQuitado) return false;
      if (statusFilter === "aberto" && r.isQuitado) return false;
      if (methodFilter !== "all" && r.methodCategory !== methodFilter) return false;
      return true;
    });
  }, [rows, customerSearch, productSearch, startDate, endDate, statusFilter, methodFilter]);

  const totals = useMemo(() => {
    const totalVendas = filtered.reduce((s, r) => s + Number(r.total || 0), 0);
    const quitados = filtered.filter((r) => r.isQuitado).length;
    const emAberto = filtered.length - quitados;
    return { totalVendas, quitados, emAberto, count: filtered.length };
  }, [filtered]);

  const isLoading = isLoadingOrders || isLoadingInstallments;

  return (
    <div className="space-y-6 text-xs max-w-7xl animate-fade-in print-container">
      <style>{`
        @page { size: A4; margin: 15mm 15mm; }
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="pb-2 border-b flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-indigo-600" /> Relatório de Vendas
          </h1>
          <p className="text-muted-foreground text-sm">
            Consulte vendas por cliente e mercadoria, com situação do parcelamento e forma de
            pagamento (cartão ou crediário).
          </p>
        </div>
        <Button
          variant="outline"
          className="no-print shrink-0 flex items-center gap-1.5"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" /> Imprimir Relatório (PDF)
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Vendas no Filtro
              </span>
              <div className="text-2xl font-extrabold text-slate-800 mt-1">{totals.count}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-full">
              <Package className="h-6 w-6 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Faturamento Total
              </span>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                {totals.totalVendas.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
            <div className="p-2.5 bg-indigo-50 rounded-full">
              <Wallet className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Parcelamentos Quitados
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                {totals.quitados}
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Parcelamentos em Aberto
              </span>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">
                {totals.emAberto}
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-full">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm no-print">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900">Filtros</CardTitle>
          <CardDescription>
            Filtre por período, nome do cliente e mercadoria vendida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do cliente..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Mercadoria</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por produto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Situação do Parcelamento</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Vendas</SelectItem>
                  <SelectItem value="quitado">Quitadas</SelectItem>
                  <SelectItem value="aberto">Em Aberto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data Inicial da Venda</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label>Data Final da Venda</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label>Forma de Pagamento</Label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cartão e Crediário</SelectItem>
                  <SelectItem value="Cartão">Somente Cartão</SelectItem>
                  <SelectItem value="Crediário">Somente Crediário</SelectItem>
                  <SelectItem value="Outro">Outras Formas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900">
            Vendas Encontradas
          </CardTitle>
          <CardDescription>
            Relação de vendas com mercadoria, data, forma de pagamento e situação do
            parcelamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto(s)</TableHead>
                  <TableHead>Data da Venda</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead>Situação do Parcelamento</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Carregando relatório de vendas…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Nenhuma venda encontrada para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-semibold text-slate-800">
                        {r.customer_name}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {r.products.length > 0 ? r.products.join(", ") : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {r.methodCategory === "Cartão" && (
                            <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                          )}
                          {r.methodCategory === "Crediário" && (
                            <Wallet className="h-3.5 w-3.5 text-purple-600" />
                          )}
                          <span>{r.paymentMethod}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            r.isQuitado
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {r.isQuitado
                            ? "Quitado"
                            : `Em aberto (${r.paidCount}/${r.installmentsCount})`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {Number(r.total).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
