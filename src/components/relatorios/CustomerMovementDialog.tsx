import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrencyBRL,
  formatDateBR,
  paymentMethodLabel,
  round2,
  situacaoBadgeClass,
  situacaoLabel,
  situacaoParcela,
} from "@/lib/cobranca";
import { ShoppingBag, Receipt, Wallet, AlertTriangle } from "lucide-react";

type Props = {
  customerId: string | null;
  customerName: string;
  onOpenChange: (open: boolean) => void;
};

/**
 * Toda a movimentação de um cliente: compras (com itens e parcelas) e o
 * histórico de recebimentos. Busca só os dados deste cliente, então não
 * esbarra no limite de 1000 linhas por consulta do PostgREST.
 */
export function CustomerMovementDialog({ customerId, customerName, onOpenChange }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer_movement", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select(
          "id, order_number, order_type, status, payment_status, payment_method, subtotal, discount, shipping_fee, installation_fee, total_amount, created_at, notes, order_items(id, quantity, unit_price, total_amount, products(name)), installments(id, installment_number, amount, amount_paid, due_date, status, payment_date, payment_method)",
        )
        .eq("customer_id", customerId!)
        .neq("order_type", "orcamento")
        .order("created_at", { ascending: false });
      if (ordersErr) throw ordersErr;

      const installmentIds = (orders ?? []).flatMap((o: any) =>
        (o.installments ?? []).map((i: any) => i.id),
      );
      let payments: any[] = [];
      if (installmentIds.length > 0) {
        const { data: pays, error: paysErr } = await supabase
          .from("installment_payments")
          .select(
            "id, installment_id, amount, payment_method, payment_date, notes, status, cancellation_reason, created_at",
          )
          .in("installment_id", installmentIds)
          .order("created_at", { ascending: false });
        if (paysErr) throw paysErr;
        payments = pays ?? [];
      }
      return { orders: orders ?? [], payments };
    },
  });

  const view = useMemo(() => {
    if (!data) return null;
    const installmentIndex = new Map<string, { order: any; installment: any }>();
    const orders = data.orders.map((o: any) => {
      const installments = [...(o.installments ?? [])].sort(
        (a: any, b: any) => a.installment_number - b.installment_number,
      );
      for (const i of installments) installmentIndex.set(i.id, { order: o, installment: i });
      const parcelado = round2(installments.reduce((s: number, i: any) => s + Number(i.amount), 0));
      const pago = round2(installments.reduce((s: number, i: any) => s + Number(i.amount_paid), 0));
      const entrada = installments.length > 0 ? round2(Number(o.total_amount) - parcelado) : 0;
      return { ...o, installments, parcelado, pago, saldo: round2(parcelado - pago), entrada };
    });

    const ativos = orders.filter((o: any) => o.status !== "Cancelado");
    const allInst = ativos.flatMap((o: any) => o.installments);
    const today = new Date();
    const abertas = allInst.filter((i: any) => Number(i.amount) - Number(i.amount_paid) > 0.009);
    const vencidas = abertas.filter(
      (i: any) =>
        situacaoParcela({
          amount: Number(i.amount),
          amountPaid: Number(i.amount_paid),
          dueDate: i.due_date,
          referenceDate: today,
        }) === "vencida",
    );
    const proxima = [...abertas].sort((a: any, b: any) => a.due_date.localeCompare(b.due_date))[0];

    const payments = data.payments.map((p: any) => ({
      ...p,
      ...(installmentIndex.get(p.installment_id) ?? {}),
    }));

    return {
      orders,
      payments,
      totalComprado: round2(ativos.reduce((s: number, o: any) => s + Number(o.total_amount), 0)),
      totalPago: round2(ativos.reduce((s: number, o: any) => s + o.pago, 0)),
      saldo: round2(ativos.reduce((s: number, o: any) => s + o.saldo, 0)),
      vencidas: vencidas.length,
      valorVencido: round2(
        vencidas.reduce((s: number, i: any) => s + Number(i.amount) - Number(i.amount_paid), 0),
      ),
      proxima,
    };
  }, [data]);

  return (
    <Dialog open={!!customerId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customerName}</DialogTitle>
          <DialogDescription>Movimentação completa de compras e pagamentos.</DialogDescription>
        </DialogHeader>

        {isLoading && <p className="py-8 text-center text-muted-foreground">Carregando…</p>}
        {error && (
          <p className="py-8 text-center text-destructive">
            Erro ao carregar: {(error as Error).message}
          </p>
        )}

        {view && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryTile icon={ShoppingBag} label="Total comprado" value={formatCurrencyBRL(view.totalComprado)} />
              <SummaryTile icon={Receipt} label="Total pago" value={formatCurrencyBRL(view.totalPago)} tone="text-success" />
              <SummaryTile
                icon={Wallet}
                label="Saldo em aberto"
                value={formatCurrencyBRL(view.saldo)}
                hint={view.proxima ? `Próx. venc.: ${formatDateBR(view.proxima.due_date)}` : undefined}
                tone="text-amber-600"
              />
              <SummaryTile
                icon={AlertTriangle}
                label="Parcelas vencidas"
                value={String(view.vencidas)}
                hint={view.vencidas > 0 ? formatCurrencyBRL(view.valorVencido) : "Em dia"}
                tone={view.vencidas > 0 ? "text-destructive" : "text-success"}
              />
            </div>

            <section className="space-y-4">
              <h3 className="font-semibold">Compras ({view.orders.length})</h3>
              {view.orders.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma compra registrada.</p>
              )}
              {view.orders.map((o: any) => (
                <div key={o.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        {o.order_number}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {formatDateBR(o.created_at)} · {o.payment_method ?? "—"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(o.order_items ?? [])
                          .map((it: any) => `${it.quantity}× ${it.products?.name ?? "Produto"} (${formatCurrencyBRL(Number(it.total_amount))})`)
                          .join(" · ") || "Sem itens"}
                      </div>
                      {o.notes && <div className="text-xs text-muted-foreground mt-1">Obs.: {o.notes}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrencyBRL(Number(o.total_amount))}</div>
                      {o.status === "Cancelado" ? (
                        <Badge variant="destructive">Cancelada</Badge>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Pago {formatCurrencyBRL(o.pago)} · Saldo {formatCurrencyBRL(o.saldo)}
                        </div>
                      )}
                      {Number(o.discount) > 0 && (
                        <div className="text-xs text-muted-foreground">Desconto {formatCurrencyBRL(Number(o.discount))}</div>
                      )}
                      {o.entrada > 0.009 && (
                        <div className="text-xs text-muted-foreground">Entrada {formatCurrencyBRL(o.entrada)}</div>
                      )}
                    </div>
                  </div>

                  {o.installments.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parcela</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-right">Pago</TableHead>
                            <TableHead>Pago em</TableHead>
                            <TableHead>Situação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {o.installments.map((i: any) => {
                            const sit = situacaoParcela({
                              amount: Number(i.amount),
                              amountPaid: Number(i.amount_paid),
                              dueDate: i.due_date,
                            });
                            return (
                              <TableRow key={i.id}>
                                <TableCell>
                                  {i.installment_number}/{o.installments.length}
                                </TableCell>
                                <TableCell>{formatDateBR(i.due_date)}</TableCell>
                                <TableCell className="text-right">{formatCurrencyBRL(Number(i.amount))}</TableCell>
                                <TableCell className="text-right">{formatCurrencyBRL(Number(i.amount_paid))}</TableCell>
                                <TableCell>
                                  {Number(i.amount_paid) > 0 ? formatDateBR(i.payment_date) : "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge className={situacaoBadgeClass(sit)}>{situacaoLabel(sit)}</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700">Esta venda não tem parcelas geradas.</p>
                  )}
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">Histórico de pagamentos ({view.payments.length})</h3>
              {view.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Venda</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Forma</TableHead>
                        <TableHead>Observação</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {view.payments.map((p: any) => {
                        const cancelado = p.status === "cancelado";
                        return (
                          <TableRow key={p.id} className={cancelado ? "opacity-60" : undefined}>
                            <TableCell>{formatDateBR(p.payment_date)}</TableCell>
                            <TableCell>{p.order?.order_number ?? "—"}</TableCell>
                            <TableCell>{p.installment?.installment_number ?? "—"}</TableCell>
                            <TableCell>{paymentMethodLabel(p.payment_method)}</TableCell>
                            <TableCell className="max-w-xs">
                              {cancelado ? (
                                <span className="text-destructive">
                                  Estornado{p.cancellation_reason ? `: ${p.cancellation_reason}` : ""}
                                </span>
                              ) : (
                                p.notes || "—"
                              )}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${cancelado ? "line-through" : ""}`}>
                              {formatCurrencyBRL(Number(p.amount))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "",
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold ${tone}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
