import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Printer } from "lucide-react";
import {
  formatCurrencyBRL,
  formatDateBR,
  paymentMethodLabel,
  situacaoBadgeClass,
  situacaoLabel,
  situacaoParcela,
} from "@/lib/cobranca";
import type { CobrancaOrderGroup } from "@/hooks/useCobranca";
import { InstallmentPanel } from "@/components/cobranca/InstallmentPanel";

interface Props {
  group: CobrancaOrderGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCancelPayment: boolean;
  canReceivePayment: boolean;
  organizationName?: string;
}

export function OrderDrawer({
  group,
  open,
  onOpenChange,
  canCancelPayment,
  canReceivePayment,
  organizationName,
}: Props) {
  if (!group) return null;

  const customer = group.customer;
  const address = customer?.customer_addresses?.[0];

  function handlePrint() {
    document.body.setAttribute("data-print-target", "drawer");
    window.print();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto order-drawer-print-container">
        <style>{`
          @page { size: A4; margin: 15mm; }
          @media print {
            html, body, main {
              position: static !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              background: white !important;
            }
            body * { visibility: hidden !important; }
            body[data-print-target="drawer"] .order-drawer-print-container,
            body[data-print-target="drawer"] .order-drawer-print-container * {
              visibility: visible !important;
            }
            /* position: fixed tira o container do fluxo normal do layout —
               sem isso, a barra lateral/cabeçalho do sistema (invisíveis mas
               ainda ocupando espaço) empurravam o conteúdo pra baixo e a 1ª
               folha saía em branco. */
            body[data-print-target="drawer"] .order-drawer-print-container {
              position: fixed !important;
              inset: 0 !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            table.print-only { display: table !important; }
          }
        `}</style>

        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle>
                Venda {group.order_number} — {customer?.name}
              </SheetTitle>
              <SheetDescription>
                {group.paid_count} de {group.installments_count} parcelas pagas
              </SheetDescription>
            </div>
            <Button variant="outline" size="sm" className="no-print shrink-0" onClick={handlePrint}>
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir / PDF
            </Button>
          </div>
        </SheetHeader>

        {/* Cabeçalho só de impressão — resumo cliente/venda + tabela completa de parcelas. */}
        <div className="print-only hidden mt-4">
          <h1 className="text-lg font-bold">{organizationName || "StockFlow Gestão"}</h1>
          <p className="text-sm text-muted-foreground mb-3">
            Venda {group.order_number} — {customer?.name}
          </p>
          <div className="text-xs space-y-0.5 mb-4">
            <p>
              <strong>Cliente:</strong> {customer?.name ?? "—"} · <strong>CPF/CNPJ:</strong>{" "}
              {customer?.cpf_cnpj ?? "—"}
            </p>
            <p>
              <strong>Endereço:</strong>{" "}
              {address
                ? `${address.street ?? ""}, ${address.number ?? ""} — ${address.neighborhood ?? ""}, ${address.city ?? ""}`
                : "—"}{" "}
              · <strong>WhatsApp:</strong> {customer?.whatsapp || customer?.phone || "—"}
            </p>
            <p>
              <strong>Valor total:</strong> {formatCurrencyBRL(group.total_amount)} ·{" "}
              <strong>Pago:</strong> {formatCurrencyBRL(group.total_paid)} ·{" "}
              <strong>Saldo devedor:</strong> {formatCurrencyBRL(group.total_saldo)}
            </p>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-1 pr-2">Parcela</th>
                <th className="text-left py-1 pr-2">Vencimento</th>
                <th className="text-right py-1 pr-2">Valor</th>
                <th className="text-right py-1 pr-2">Pago</th>
                <th className="text-right py-1 pr-2">Saldo</th>
                <th className="text-left py-1 pr-2">Data Pgto</th>
                <th className="text-left py-1 pr-2">Forma</th>
                <th className="text-left py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {group.installments.map((ins) => {
                const situacao = situacaoParcela({
                  amount: ins.amount,
                  amountPaid: ins.amount_paid,
                  dueDate: ins.due_date,
                });
                return (
                  <tr key={ins.id} className="border-b">
                    <td className="py-1 pr-2">
                      {ins.installment_number}/{group.installments_count}
                    </td>
                    <td className="py-1 pr-2">{formatDateBR(ins.due_date)}</td>
                    <td className="text-right py-1 pr-2">{formatCurrencyBRL(ins.amount)}</td>
                    <td className="text-right py-1 pr-2">{formatCurrencyBRL(ins.amount_paid)}</td>
                    <td className="text-right py-1 pr-2">
                      {formatCurrencyBRL(ins.amount - ins.amount_paid)}
                    </td>
                    <td className="py-1 pr-2">{ins.payment_date ? formatDateBR(ins.payment_date) : "—"}</td>
                    <td className="py-1 pr-2">{paymentMethodLabel(ins.payment_method)}</td>
                    <td className="py-1">{situacaoLabel(situacao)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-6 mt-4 no-print">
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
              {address
                ? `${address.street ?? ""}, ${address.number ?? ""}${address.complement ? ` — ${address.complement}` : ""}`
                : "—"}
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
              <span className="text-muted-foreground">Nº da venda:</span> {group.order_number}
            </p>
            <p>
              <span className="text-muted-foreground">Produtos:</span>{" "}
              {(group.installments[0]?.orders.order_items ?? [])
                .map((it) => `${it.products?.name ?? "Item"} (x${it.quantity})`)
                .join(", ") || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Valor total:</span>{" "}
              {formatCurrencyBRL(group.total_amount)}
            </p>
            <p>
              <span className="text-muted-foreground">Qtd. de parcelas:</span> {group.installments_count} (
              {group.paid_count} pagas)
            </p>
            <p>
              <span className="text-muted-foreground">Saldo total devedor:</span>{" "}
              <span className="font-semibold">{formatCurrencyBRL(group.total_saldo)}</span>
            </p>
          </section>

          <Separator />

          <section className="space-y-1">
            <h3 className="font-semibold text-foreground text-sm mb-2">Parcelas</h3>
            <Accordion type="single" collapsible className="w-full">
              {group.installments.map((ins) => {
                const situacao = situacaoParcela({
                  amount: ins.amount,
                  amountPaid: ins.amount_paid,
                  dueDate: ins.due_date,
                });
                return (
                  <AccordionItem key={ins.id} value={ins.id}>
                    <AccordionTrigger>
                      <div className="flex flex-1 items-center justify-between pr-2 text-sm">
                        <span>
                          Parcela {ins.installment_number}/{group.installments_count} —{" "}
                          {formatDateBR(ins.due_date)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{formatCurrencyBRL(ins.amount)}</span>
                          <Badge className={situacaoBadgeClass(situacao)}>{situacaoLabel(situacao)}</Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <InstallmentPanel
                        installment={ins}
                        canCancelPayment={canCancelPayment}
                        canReceivePayment={canReceivePayment}
                        organizationName={organizationName}
                      />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
