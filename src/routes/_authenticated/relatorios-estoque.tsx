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
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings2,
  Scale,
  Wallet,
  Printer,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios-estoque")({
  head: () => ({ meta: [{ title: "Relatório de Estoque · StockFlow" }] }),
  component: RelatorioEstoquePage,
});

function movementLabel(t: string) {
  return t === "entrada" ? "Entrada" : t === "saida" ? "Saída" : "Ajuste";
}
function movementColor(t: string) {
  return t === "entrada"
    ? "bg-success/15 text-success border-success/30"
    : t === "saida"
      ? "bg-rose-100 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
}
function movementIcon(t: string) {
  if (t === "entrada") return <ArrowDownToLine className="h-3.5 w-3.5" />;
  if (t === "saida") return <ArrowUpFromLine className="h-3.5 w-3.5" />;
  return <Settings2 className="h-3.5 w-3.5" />;
}

function RelatorioEstoquePage() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;

  const [productSearch, setProductSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");
  const [stockSituationFilter, setStockSituationFilter] = useState("all");

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["report_stock_products", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name), units(abbreviation)")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: movements = [], isLoading: isLoadingMovements } = useQuery({
    queryKey: ["report_stock_movements", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, products(name, sku), warehouses(name)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredMovements = useMemo(() => {
    return movements.filter((m: any) => {
      if (
        productSearch &&
        !m.products?.name?.toLowerCase().includes(productSearch.toLowerCase()) &&
        !m.products?.sku?.toLowerCase().includes(productSearch.toLowerCase())
      )
        return false;
      if (startDate && m.created_at < `${startDate}T00:00:00`) return false;
      if (endDate && m.created_at > `${endDate}T23:59:59`) return false;
      if (movementTypeFilter !== "all" && m.movement_type !== movementTypeFilter) return false;
      return true;
    });
  }, [movements, productSearch, startDate, endDate, movementTypeFilter]);

  // Totais de entrada/saída por produto dentro do período selecionado (independe do filtro de tipo)
  const productTotals = useMemo(() => {
    const map = new Map<string, { entradas: number; saidas: number }>();
    movements.forEach((m: any) => {
      if (startDate && m.created_at < `${startDate}T00:00:00`) return;
      if (endDate && m.created_at > `${endDate}T23:59:59`) return;
      const cur = map.get(m.product_id) || { entradas: 0, saidas: 0 };
      if (m.movement_type === "entrada") cur.entradas += Number(m.quantity);
      else if (m.movement_type === "saida") cur.saidas += Number(m.quantity);
      map.set(m.product_id, cur);
    });
    return map;
  }, [movements, startDate, endDate]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (
        productSearch &&
        !p.name?.toLowerCase().includes(productSearch.toLowerCase()) &&
        !p.sku?.toLowerCase().includes(productSearch.toLowerCase())
      )
        return false;
      const cur = Number(p.stock_current);
      const low = cur > 0 && cur <= Number(p.stock_min);
      const out = cur <= 0;
      if (stockSituationFilter === "baixo" && !low) return false;
      if (stockSituationFilter === "sem" && !out) return false;
      if (stockSituationFilter === "disponivel" && (low || out)) return false;
      return true;
    });
  }, [products, productSearch, stockSituationFilter]);

  const summary = useMemo(() => {
    let totalEntradasQtd = 0;
    let totalSaidasQtd = 0;
    let totalEntradasValor = 0;
    let totalSaidasValor = 0;
    filteredMovements.forEach((m: any) => {
      const qty = Number(m.quantity);
      const val = qty * Number(m.unit_cost || 0);
      if (m.movement_type === "entrada") {
        totalEntradasQtd += qty;
        totalEntradasValor += val;
      } else if (m.movement_type === "saida") {
        totalSaidasQtd += qty;
        totalSaidasValor += val;
      }
    });
    const valorEstoqueAtual = products.reduce(
      (s: number, p: any) => s + Number(p.stock_current) * Number(p.cost_price),
      0,
    );
    return {
      totalEntradasQtd,
      totalSaidasQtd,
      totalEntradasValor,
      totalSaidasValor,
      valorEstoqueAtual,
    };
  }, [filteredMovements, products]);

  const isLoading = isLoadingProducts || isLoadingMovements;

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
            <Boxes className="h-6 w-6 text-indigo-600" /> Relatório de Controle de Estoque
          </h1>
          <p className="text-muted-foreground text-sm">
            Entradas, saídas e quantitativo atual em estoque dos produtos.
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
                Entradas no Período
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                {summary.totalEntradasQtd.toLocaleString("pt-BR")}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {summary.totalEntradasValor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-full">
              <ArrowDownToLine className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Saídas no Período
              </span>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">
                {summary.totalSaidasQtd.toLocaleString("pt-BR")}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {summary.totalSaidasValor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-full">
              <ArrowUpFromLine className="h-6 w-6 text-rose-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Saldo do Período
              </span>
              <div
                className={`text-2xl font-extrabold mt-1 ${
                  summary.totalEntradasQtd - summary.totalSaidasQtd >= 0
                    ? "text-indigo-600"
                    : "text-amber-600"
                }`}
              >
                {(summary.totalEntradasQtd - summary.totalSaidasQtd).toLocaleString("pt-BR")}
              </div>
            </div>
            <div className="p-2.5 bg-indigo-50 rounded-full">
              <Scale className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Valor Total em Estoque
              </span>
              <div className="text-2xl font-extrabold text-slate-800 mt-1">
                {summary.valorEstoqueAtual.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-full">
              <Wallet className="h-6 w-6 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm no-print">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900">Filtros</CardTitle>
          <CardDescription>
            Filtre por produto, período de movimentação, tipo e situação de estoque.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Produto ou SKU</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar mercadoria..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tipo de Movimentação</Label>
              <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Entradas e Saídas</SelectItem>
                  <SelectItem value="entrada">Somente Entradas</SelectItem>
                  <SelectItem value="saida">Somente Saídas</SelectItem>
                  <SelectItem value="ajuste">Somente Ajustes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Situação do Estoque</Label>
              <Select value={stockSituationFilter} onValueChange={setStockSituationFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Situações</SelectItem>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="baixo">Estoque Baixo</SelectItem>
                  <SelectItem value="sem">Sem Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data Inicial da Movimentação</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label>Data Final da Movimentação</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900">
            Quantitativo Atual em Estoque
          </CardTitle>
          <CardDescription>
            Estoque atual por produto, com entradas e saídas somadas no período filtrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Entradas (período)</TableHead>
                  <TableHead className="text-right">Saídas (período)</TableHead>
                  <TableHead className="text-right">Estoque Mín.</TableHead>
                  <TableHead className="text-right">Estoque Atual</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      Carregando quantitativo de estoque…
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhum produto encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p: any) => {
                    const cur = Number(p.stock_current);
                    const low = cur > 0 && cur <= Number(p.stock_min);
                    const out = cur <= 0;
                    const totals = productTotals.get(p.id) || { entradas: 0, saidas: 0 };
                    return (
                      <TableRow key={p.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-slate-800">{p.name}</TableCell>
                        <TableCell className="font-mono text-[10px]">{p.sku ?? "—"}</TableCell>
                        <TableCell>{p.categories?.name ?? "—"}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                          +{totals.entradas.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-rose-600">
                          -{totals.saidas.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(p.stock_min).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {cur.toLocaleString("pt-BR")}{" "}
                          <span className="text-[10px] text-muted-foreground">
                            {p.units?.abbreviation ?? ""}
                          </span>
                        </TableCell>
                        <TableCell>
                          {out ? (
                            <Badge
                              variant="outline"
                              className="bg-rose-100 text-rose-700 border-rose-200"
                            >
                              Sem estoque
                            </Badge>
                          ) : low ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200"
                            >
                              Baixo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-success/15 text-success border-success/30"
                            >
                              Disponível
                            </Badge>
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

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900">
            Movimentações Detalhadas
          </CardTitle>
          <CardDescription>
            Entradas e saídas registradas de acordo com os filtros selecionados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      Carregando movimentações…
                    </TableCell>
                  </TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Nenhuma movimentação encontrada para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m: any) => (
                    <TableRow key={m.id} className="hover:bg-slate-50/50">
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={movementColor(m.movement_type)}>
                          {movementIcon(m.movement_type)}
                          <span className="ml-1">{movementLabel(m.movement_type)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        {m.products?.name ?? "—"}
                      </TableCell>
                      <TableCell>{m.warehouses?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.reference ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(m.quantity).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(m.unit_cost || 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {(Number(m.quantity) * Number(m.unit_cost || 0)).toLocaleString("pt-BR", {
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
