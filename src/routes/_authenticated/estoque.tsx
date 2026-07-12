import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Boxes } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Controle de Estoque · StockFlow" }] }),
  component: Estoque,
});

function Estoque() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "baixo" | "sem">("todos");

  const { data = [], isLoading } = useQuery({
    queryKey: ["estoque", orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("*, categories(name), brands(name), units(abbreviation)")
          .eq("organization_id", orgId!)
          .order("name")
      ).data ?? [],
  });

  const filtered = data.filter((p: any) => {
    if (
      search &&
      !p.name?.toLowerCase().includes(search.toLowerCase()) &&
      !p.sku?.toLowerCase().includes(search.toLowerCase()) &&
      !p.barcode?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    const cur = Number(p.stock_current);
    if (filter === "baixo" && !(cur > 0 && cur <= Number(p.stock_min))) return false;
    if (filter === "sem" && cur > 0) return false;
    return true;
  });

  const totalValor = filtered.reduce(
    (a: number, p: any) => a + Number(p.stock_current) * Number(p.cost_price),
    0,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Controle de Estoque</h1>
        <p className="text-muted-foreground text-sm">Posição atual de estoque por produto.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Itens listados</div>
            <div className="text-2xl font-bold">{filtered.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Qtd. total</div>
            <div className="text-2xl font-bold">
              {filtered
                .reduce((a: number, p: any) => a + Number(p.stock_current), 0)
                .toLocaleString("pt-BR")}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Valor total</div>
            <div className="text-2xl font-bold text-success">
              {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Alertas</div>
            <div className="text-2xl font-bold text-warning">
              {data.filter((p: any) => Number(p.stock_current) <= Number(p.stock_min)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="baixo">Estoque baixo</SelectItem>
                <SelectItem value="sem">Sem estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Mín.</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Custo un.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Boxes className="mx-auto h-10 w-10 opacity-40 mb-2" />
                      Nenhum item.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p: any) => {
                    const cur = Number(p.stock_current);
                    const low = cur > 0 && cur <= Number(p.stock_min);
                    const out = cur <= 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.sku ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{p.categories?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {Number(p.stock_min).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {cur.toLocaleString("pt-BR")}{" "}
                          <span className="text-xs text-muted-foreground">
                            {p.units?.abbreviation ?? ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(p.cost_price).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(cur * Number(p.cost_price)).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </TableCell>
                        <TableCell>
                          {out ? (
                            <Badge variant="destructive">Sem estoque</Badge>
                          ) : low ? (
                            <Badge className="bg-warning text-warning-foreground hover:bg-warning">
                              Baixo
                            </Badge>
                          ) : (
                            <Badge className="bg-success text-success-foreground hover:bg-success">
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
    </div>
  );
}
