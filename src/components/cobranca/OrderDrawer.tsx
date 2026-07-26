import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatCurrencyBRL, formatDateBR, situacaoBadgeClass, situacaoLabel, situacaoParcela } from "@/lib/cobranca";
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Venda {group.order_number} — {customer?.name}
          </SheetTitle>
          <SheetDescription>
            {group.paid_count} de {group.installments_count} parcelas pagas
          </SheetDescription>
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
