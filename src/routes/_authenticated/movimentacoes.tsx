import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowDownToLine, ArrowUpFromLine, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Search = { tipo?: "entrada" | "saida" | "ajuste" | "todos" };

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tipo: (["entrada", "saida", "ajuste", "todos"].includes(s.tipo as string)
      ? s.tipo
      : "todos") as any,
  }),
  head: () => ({ meta: [{ title: "Movimentações · StockFlow" }] }),
  component: Movimentacoes,
});

function Movimentacoes() {
  const { tipo } = Route.useSearch();
  const nav = Route.useNavigate();
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: moves = [], isLoading } = useQuery({
    queryKey: ["movimentacoes", orgId, tipo],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("stock_movements")
        .select("*, products(name, sku), warehouses(name)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (tipo && tipo !== "todos") q = q.eq("movement_type", tipo);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-select", orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("id,name,sku,cost_price")
          .eq("organization_id", orgId!)
          .order("name")
      ).data ?? [],
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses-select", orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (await supabase.from("warehouses").select("id,name").eq("organization_id", orgId!)).data ??
      [],
  });

  const create = useMutation({
    mutationFn: async (values: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const payload: any = {
        organization_id: orgId,
        product_id: values.product_id,
        warehouse_id: values.warehouse_id === "none" ? null : values.warehouse_id,
        movement_type: values.movement_type,
        quantity: Number(values.quantity),
        unit_cost: Number(values.unit_cost || 0),
        reason: values.reason || null,
        reference: values.reference || null,
        created_by: userData.user?.id,
      };
      const { error } = await supabase.from("stock_movements").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimentação registrada");
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate(Object.fromEntries(fd));
  }

  const iconFor = (t: string) =>
    t === "entrada" ? (
      <ArrowDownToLine className="h-3.5 w-3.5" />
    ) : t === "saida" ? (
      <ArrowUpFromLine className="h-3.5 w-3.5" />
    ) : (
      <Settings2 className="h-3.5 w-3.5" />
    );
  const labelFor = (t: string) =>
    t === "entrada"
      ? "Entrada"
      : t === "saida"
        ? "Saída"
        : t === "ajuste"
          ? "Ajuste"
          : "Transferência";
  const colorFor = (t: string) =>
    t === "entrada"
      ? "bg-success text-success-foreground hover:bg-success"
      : t === "saida"
        ? "bg-destructive text-destructive-foreground hover:bg-destructive"
        : "bg-warning text-warning-foreground hover:bg-warning";

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Movimentações</h1>
          <p className="text-muted-foreground text-sm">Entradas, saídas e ajustes de estoque.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground border-0">
              <Plus className="mr-1 h-4 w-4" /> Nova movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova movimentação</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select
                  name="movement_type"
                  defaultValue={tipo === "todos" || !tipo ? "entrada" : tipo}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="ajuste">Ajuste (+/-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Produto *</Label>
                <Select name="product_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.sku ? ` · ${p.sku}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Quantidade *</Label>
                  <Input name="quantity" type="number" step="0.001" required />
                </div>
                <div className="space-y-1">
                  <Label>Custo unitário</Label>
                  <Input name="unit_cost" type="number" step="0.01" defaultValue={0} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Depósito</Label>
                <Select name="warehouse_id" defaultValue="none">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {warehouses.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Referência (NF, OC…)</Label>
                <Input name="reference" />
              </div>
              <div className="space-y-1">
                <Label>Observação</Label>
                <Textarea name="reason" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  Registrar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs value={tipo ?? "todos"} onValueChange={(v) => nav({ search: { tipo: v as any } })}>
        <TabsList>
          <TabsTrigger value="todos">Todas</TabsTrigger>
          <TabsTrigger value="entrada">Entradas</TabsTrigger>
          <TabsTrigger value="saida">Saídas</TabsTrigger>
          <TabsTrigger value="ajuste">Ajustes</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Custo un.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : moves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Nenhuma movimentação registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  moves.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge className={colorFor(m.movement_type)}>
                          {iconFor(m.movement_type)}
                          <span className="ml-1">{labelFor(m.movement_type)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{m.products?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{m.warehouses?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.reference ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(m.quantity).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(m.unit_cost).toLocaleString("pt-BR", {
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
