import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  MessageCircle,
  FileDown,
  Mail,
  FileText,
  Ban,
} from "lucide-react";
import {
  PAYMENT_METHODS,
  formatCurrencyBRL,
  formatDateBR,
  onlyDigits,
  paymentMethodLabel,
  round2,
  situacaoBadgeClass,
  situacaoLabel,
  situacaoParcela,
} from "@/lib/cobranca";
import {
  useCancelInstallmentPayment,
  useInstallmentPaymentHistory,
  useLogCollectionAttempt,
  useReceiveInstallmentPayment,
  type CobrancaInstallmentRow,
} from "@/hooks/useCobranca";
import { generateInstallmentReceiptPDF } from "@/components/cobranca/carne-pdf";

interface Props {
  installment: CobrancaInstallmentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCancelPayment: boolean;
  canReceivePayment: boolean;
  organizationName?: string;
}

export function InstallmentDrawer({
  installment,
  open,
  onOpenChange,
  canCancelPayment,
  canReceivePayment,
  organizationName,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<string>("Dinheiro");
  const [partialAmount, setPartialAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [clientRequestId, setClientRequestId] = useState(() => crypto.randomUUID());
  const [cancelTarget, setCancelTarget] = useState<{ id: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const receive = useReceiveInstallmentPayment();
  const cancel = useCancelInstallmentPayment();
  const logAttempt = useLogCollectionAttempt();
  const { data: history = [], isLoading: loadingHistory } = useInstallmentPaymentHistory(
    installment?.id ?? null,
  );

  // Nova client_request_id a cada abertura de parcela — garante que um
  // duplo-clique dentro da MESMA sessão de baixa não gere dois pagamentos,
  // mas uma nova tentativa (outra parcela, ou reabrir depois) tem id novo.
  useEffect(() => {
    if (open) {
      setClientRequestId(crypto.randomUUID());
      setPartialAmount("");
      setNotes("");
      setPaymentMethod("Dinheiro");
    }
  }, [open, installment?.id]);

  if (!installment) return null;

  const customer = installment.orders.customers;
  const address =
    (customer?.customer_addresses ?? []).find((a) => a.is_primary) ?? customer?.customer_addresses?.[0];
  const saldo = round2(installment.amount - installment.amount_paid);
  const situacao = situacaoParcela({
    amount: installment.amount,
    amountPaid: installment.amount_paid,
    dueDate: installment.due_date,
  });
  const whatsappNumber = onlyDigits(customer?.whatsapp || customer?.phone);

  function handleReceive(amount: number | null) {
    if (!installment) return;
    receive.mutate(
      { installmentId: installment.id, paymentMethod, amount, notes: notes || null, clientRequestId },
      {
        onSuccess: () => {
          toast.success("Recebimento registrado com sucesso!");
          setClientRequestId(crypto.randomUUID());
          setPartialAmount("");
          setNotes("");
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  }

  function handleCancelConfirm() {
    if (!cancelTarget) return;
    cancel.mutate(
      { paymentId: cancelTarget.id, installmentId: installment!.id, reason: cancelReason || null },
      {
        onSuccess: () => {
          toast.success("Recebimento cancelado e estornado no Fluxo de Caixa.");
          setCancelTarget(null);
          setCancelReason("");
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  }

  function handleWhatsapp() {
    if (!whatsappNumber) {
      toast.error("Cliente sem WhatsApp/telefone cadastrado.");
      return;
    }
    const message = `Olá ${customer?.name}, tudo bem? Passando para lembrar da parcela ${installment.installment_number}/${installment.orders.installments} da venda ${installment.orders.order_number}, no valor de ${formatCurrencyBRL(saldo)}, com vencimento em ${formatDateBR(installment.due_date)}. Qualquer dúvida estou à disposição!`;
    window.open(`https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
    logAttempt.mutate({ installmentId: installment.id, channel: "whatsapp" });
  }

  function handleGeneratePdf() {
    generateInstallmentReceiptPDF(installment, organizationName);
    logAttempt.mutate({ installmentId: installment.id, channel: "carne_pdf" });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Parcela {installment.installment_number}/{installment.orders.installments} —{" "}
              {customer?.name}
            </SheetTitle>
            <SheetDescription>Venda {installment.orders.order_number}</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-4">
            <section className="space-y-1 text-sm">
              <h3 className="font-semibold text-foreground">Dados do Cliente</h3>
              <p>
                <span className="text-muted-foreground">Nome:</span> {customer?.name ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">CPF/CNPJ:</span> {customer?.cpf_cnpj ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Endereço:</span>{" "}
                {address ? `${address.street ?? ""}, ${address.number ?? ""}${address.complement ? ` — ${address.complement}` : ""}` : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Cidade/Bairro:</span> {address?.city ?? "—"} /{" "}
                {address?.neighborhood ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">WhatsApp:</span>{" "}
                {customer?.whatsapp || customer?.phone || "—"}
              </p>
            </section>

            <Separator />

            <section className="space-y-1 text-sm">
              <h3 className="font-semibold text-foreground">Dados da Venda</h3>
              <p>
                <span className="text-muted-foreground">Nº da venda:</span>{" "}
                {installment.orders.order_number}
              </p>
              <p>
                <span className="text-muted-foreground">Produtos:</span>{" "}
                {(installment.orders.order_items ?? [])
                  .map((it) => `${it.products?.name ?? "Item"} (x${it.quantity})`)
                  .join(", ") || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Valor total:</span>{" "}
                {formatCurrencyBRL(installment.orders.total_amount)}
              </p>
              <p>
                <span className="text-muted-foreground">Qtd. de parcelas:</span>{" "}
                {installment.orders.installments}
              </p>
            </section>

            <Separator />

            <section className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Dados da Parcela</h3>
                <Badge className={situacaoBadgeClass(situacao)}>{situacaoLabel(situacao)}</Badge>
              </div>
              <p>
                <span className="text-muted-foreground">Valor:</span>{" "}
                {formatCurrencyBRL(installment.amount)}
              </p>
              <p>
                <span className="text-muted-foreground">Valor pago:</span>{" "}
                {formatCurrencyBRL(installment.amount_paid)}
              </p>
              <p>
                <span className="text-muted-foreground">Saldo restante:</span>{" "}
                <span className="font-semibold">{formatCurrencyBRL(saldo)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Vencimento:</span>{" "}
                {formatDateBR(installment.due_date)}
              </p>
            </section>

            {saldo > 0 && canReceivePayment && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h3 className="font-semibold text-foreground text-sm">Baixa da Parcela</h3>
                  <Tabs defaultValue="integral">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="integral">Pagamento Integral</TabsTrigger>
                      <TabsTrigger value="parcial">Pagamento Parcial</TabsTrigger>
                    </TabsList>

                    <TabsContent value="integral" className="space-y-3 pt-3">
                      <p className="text-sm">
                        Quitar o saldo total de <strong>{formatCurrencyBRL(saldo)}</strong>.
                      </p>
                      <div className="space-y-1">
                        <Label>Forma de pagamento</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Observação (opcional)</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                      </div>
                      <Button
                        className="w-full"
                        disabled={receive.isPending}
                        onClick={() => handleReceive(null)}
                      >
                        {receive.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Recebimento Integral
                      </Button>
                    </TabsContent>

                    <TabsContent value="parcial" className="space-y-3 pt-3">
                      <div className="space-y-1">
                        <Label>Valor recebido (máx. {formatCurrencyBRL(saldo)})</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={saldo}
                          value={partialAmount}
                          onChange={(e) => setPartialAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Forma de pagamento</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Observação (opcional)</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                      </div>
                      <Button
                        className="w-full"
                        disabled={
                          receive.isPending ||
                          !partialAmount ||
                          Number(partialAmount) <= 0 ||
                          Number(partialAmount) > saldo
                        }
                        onClick={() => handleReceive(Number(partialAmount))}
                      >
                        {receive.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Recebimento Parcial
                      </Button>
                    </TabsContent>
                  </Tabs>
                </section>
              </>
            )}

            <Separator />

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm">Cobrar Cliente</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleWhatsapp}>
                  <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                </Button>
                <Button size="sm" variant="outline" onClick={handleGeneratePdf}>
                  <FileDown className="mr-1.5 h-4 w-4" /> Gerar carnê (PDF)
                </Button>
                <Button size="sm" variant="outline" disabled title="Em breve">
                  <Mail className="mr-1.5 h-4 w-4" /> E-mail (em breve)
                </Button>
                <Button size="sm" variant="outline" disabled title="Em breve">
                  <FileText className="mr-1.5 h-4 w-4" /> Boleto (em breve)
                </Button>
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm">Histórico</h3>
              {loadingHistory ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum recebimento registrado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className={`rounded-md border p-2 text-sm ${h.status === "cancelado" ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {formatCurrencyBRL(h.amount)} — {paymentMethodLabel(h.payment_method)}
                        </span>
                        {h.status === "cancelado" ? (
                          <Badge variant="outline">Cancelado</Badge>
                        ) : (
                          canCancelPayment && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-auto py-0.5 px-2 text-xs text-destructive"
                              onClick={() => setCancelTarget({ id: h.id })}
                            >
                              <Ban className="mr-1 h-3 w-3" /> Cancelar
                            </Button>
                          )
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString("pt-BR")} · {h.created_by_name}
                      </p>
                      {h.notes && <p className="text-xs mt-1">{h.notes}</p>}
                      {h.status === "cancelado" && (
                        <p className="text-xs mt-1 text-muted-foreground">
                          Cancelado por {h.cancelled_by_name}
                          {h.cancellation_reason ? ` — ${h.cancellation_reason}` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar recebimento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso registra um estorno no Fluxo de Caixa e restaura o saldo da parcela. O pagamento não é
            apagado, apenas marcado como cancelado no histórico.
          </p>
          <div className="space-y-1">
            <Label>Motivo (opcional)</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={cancel.isPending} onClick={handleCancelConfirm}>
              {cancel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
