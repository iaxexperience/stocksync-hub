import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useMemo, useState } from "react";
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
import { Plus, PackageX, FileDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrencyBRL, formatDateBR } from "@/lib/cobranca";
import { generateAvariasReportPDF } from "@/components/avarias/avarias-pdf";

const REASONS = [
  "Quebrado / danificado",
  "Vencido / fora da validade",
  "Defeito de fábrica",
  "Danificado no transporte",
  "Outro",
];

export const Route = createFileRoute("/_authenticated/avarias")({
  head: () => ({ meta: [{ title: "Avarias · StockFlow" }] }),
  component: Avarias,
});

function Avarias() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const orgName = (profile as any)?.organizations?.name ?? "StockFlow Gestão";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: damages = [], isLoading } = useQuery({
    queryKey: ["product-damages", orgId, startDate, endDate],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("product_damages")
        .select("*, products(name, sku, stock_current)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (startDate) q = q.gte("created_at", `${startDate}T00:00:00`);
      if (endDate) q = q.lte("created_at", `${endDate}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-select-avarias", orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("id,name,sku,cost_price,stock_current")
          .eq("organization_id", orgId!)
          .gt("stock_current", 0)
          .order("name")
      ).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (values: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const product = products.find((p: any) => p.id === values.product_id);
      const finalReason =
        values.reason === "Outro" ? values.custom_reason || "Outro" : values.reason;
      const payload = {
        organization_id: orgId,
        product_id: values.product_id,
        quantity: Number(values.quantity),
        unit_cost: Number(product?.cost_price ?? 0),
        reason: finalReason,
        notes: values.notes || null,
        created_by: userData.user?.id,
      };
      const { error } = await supabase.from("product_damages").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaria registrada e estoque atualizado");
      qc.invalidateQueries({ queryKey: ["product-damages"] });
      qc.invalidateQueries({ queryKey: ["products-select-avarias"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["storefront-products"] });
      setOpen(false);
      setReason(REASONS[0]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_damages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaria excluída e estoque devolvido");
      qc.invalidateQueries({ queryKey: ["product-damages"] });
      qc.invalidateQueries({ queryKey: ["products-select-avarias"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      qc.invalidateQueries({ queryKey: ["storefront-products"] });
    },
    onError: (e: any) =>
      toast.error(
        e.message?.includes("row-level security")
          ? "Apenas admin ou gerente podem excluir uma avaria."
          : e.message,
      ),
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate(Object.fromEntries(fd));
  }

  const totals = useMemo(() => {
    return damages.reduce(
      (acc: { qty: number; cost: number }, d: any) => {
        acc.qty += Number(d.quantity);
        acc.cost += Number(d.quantity) * Number(d.unit_cost);
        return acc;
      },
      { qty: 0, cost: 0 },
    );
  }, [damages]);

  function handlePdf() {
    const filterLabel =
      startDate || endDate
        ? `Período: ${startDate ? formatDateBR(startDate) : "início"} a ${endDate ? formatDateBR(endDate) : "hoje"}`
        : "Todos os registros";
    generateAvariasReportPDF(
      damages.map((d: any) => ({
        created_at: d.created_at,
        product_name: d.products?.name ?? "—",
        quantity: Number(d.quantity),
        reason: d.reason,
        notes: d.notes,
        unit_cost: Number(d.unit_cost),
      })),
      orgName,
      filterLabel,
    );
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Avarias</h1>
          <p className="text-muted-foreground text-sm">
            Dê baixa em produtos avariados e acompanhe o histórico.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePdf}>
            <FileDown className="mr-1 h-4 w-4" /> Gerar PDF
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground border-0">
                <Plus className="mr-1 h-4 w-4" /> Nova avaria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar avaria</DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-3">
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
                          {p.sku ? ` · ${p.sku}` : ""} — estoque: {Number(p.stock_current)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Quantidade avariada *</Label>
                  <Input name="quantity" type="number" step="0.001" min="0.001" required />
                </div>
                <div className="space-y-1">
                  <Label>Motivo *</Label>
                  <Select name="reason" value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {reason === "Outro" && (
                  <div className="space-y-1">
                    <Label>Descreva o motivo *</Label>
                    <Input name="custom_reason" required />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Observações</Label>
                  <Textarea name="notes" placeholder="Detalhes adicionais (opcional)" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={create.isPending}>
                    Dar baixa no estoque
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              {damages.length} registro{damages.length === 1 ? "" : "s"} · Total avariado:{" "}
              <span className="font-semibold text-foreground">
                {totals.qty.toLocaleString("pt-BR")}
              </span>{" "}
              · Custo total:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrencyBRL(totals.cost)}
              </span>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : damages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <PackageX className="mx-auto h-8 w-8 opacity-40 mb-2" />
                      Nenhuma avaria registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  damages.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(d.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {d.products?.name ?? "—"}
                        {d.products?.sku ? (
                          <span className="text-muted-foreground"> · {d.products.sku}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(d.quantity).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.reason}
                        {d.notes ? (
                          <p className="text-xs text-muted-foreground">{d.notes}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyBRL(Number(d.unit_cost))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyBRL(Number(d.quantity) * Number(d.unit_cost))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (
                              confirm(
                                "Excluir esta avaria? O estoque do produto será devolvido.",
                              )
                            ) {
                              remove.mutate(d.id);
                            }
                          }}
                          title="Excluir avaria"
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
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
