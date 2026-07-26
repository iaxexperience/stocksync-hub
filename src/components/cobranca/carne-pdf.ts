import jsPDF from "jspdf";
import { formatCurrencyBRL, formatDateBR, paymentMethodLabel } from "@/lib/cobranca";
import type { CobrancaInstallmentRow } from "@/hooks/useCobranca";

/**
 * Gera um carnê/2ª via simples (sem necessidade de nenhuma integração
 * externa de boleto) para a parcela selecionada — mesmo padrão de uso do
 * jsPDF já empregado em clientes.tsx para contratos.
 */
export function generateInstallmentReceiptPDF(row: CobrancaInstallmentRow, organizationName?: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const MARGIN = 20;
  let y = 25;

  const customer = row.orders.customers;
  const address = (customer?.customer_addresses ?? []).find((a) => a.is_primary) ?? customer?.customer_addresses?.[0];
  const saldo = Number(row.amount) - Number(row.amount_paid);

  doc.setFontSize(16);
  doc.text(organizationName || "StockFlow Gestão", W / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(12);
  doc.text("Carnê / 2ª via de parcela", W / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(10);
  const line = (label: string, value: string) => {
    doc.text(label, MARGIN, y);
    doc.text(value, MARGIN + 55, y);
    y += 7;
  };

  line("Cliente:", customer?.name ?? "—");
  line("CPF/CNPJ:", customer?.cpf_cnpj ?? "—");
  if (address) {
    line("Endereço:", `${address.street ?? ""}, ${address.number ?? ""} — ${address.neighborhood ?? ""}, ${address.city ?? ""}`);
  }
  y += 3;
  line("Venda nº:", row.orders.order_number);
  line("Data da compra:", formatDateBR(row.orders.created_at));
  line("Valor total da venda:", formatCurrencyBRL(row.orders.total_amount));
  y += 3;

  doc.setFontSize(12);
  doc.text(`Parcela ${row.installment_number}/${row.orders.installments}`, MARGIN, y);
  y += 8;
  doc.setFontSize(10);
  line("Valor da parcela:", formatCurrencyBRL(row.amount));
  line("Valor já pago:", formatCurrencyBRL(row.amount_paid));
  line("Saldo restante:", formatCurrencyBRL(saldo));
  line("Vencimento:", formatDateBR(row.due_date));
  if (row.payment_method) line("Última forma de pagamento:", paymentMethodLabel(row.payment_method));

  y += 10;
  doc.setDrawColor(150);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 8;
  doc.setFontSize(9);
  doc.text("Documento gerado pelo sistema — não substitui recibo fiscal.", MARGIN, y);

  doc.save(`carne-${row.orders.order_number}-parcela-${row.installment_number}.pdf`);
}
