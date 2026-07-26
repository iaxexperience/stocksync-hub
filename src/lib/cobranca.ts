// Helpers puros do módulo Cobrança — sem I/O, fáceis de testar isoladamente.

export type SituacaoParcela = "quitada" | "vencida" | "vence_em_breve" | "parcial" | "a_vencer";

export const PAYMENT_METHODS = [
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Pix", label: "PIX" },
  { value: "Cartão de débito", label: "Débito" },
  { value: "Cartão de crédito", label: "Crédito" },
  { value: "Transferência bancária", label: "Transferência" },
  { value: "Boleto", label: "Boleto" },
  { value: "Cheque", label: "Cheque" },
  { value: "Outros", label: "Outros" },
] as const;

export function paymentMethodLabel(value: string | null | undefined): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value ?? "—";
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function diasEmAtraso(dueDate: string, saldo: number, referenceDate = new Date()): number {
  if (saldo <= 0) return 0;
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(referenceDate);
  const diffMs = today.getTime() - due.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

export function diasParaVencer(dueDate: string, referenceDate = new Date()): number {
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(referenceDate);
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function situacaoParcela(params: {
  amount: number;
  amountPaid: number;
  dueDate: string;
  referenceDate?: Date;
}): SituacaoParcela {
  const { amount, amountPaid, dueDate, referenceDate = new Date() } = params;
  const saldo = round2(amount - amountPaid);

  if (saldo <= 0) return "quitada";

  const atraso = diasEmAtraso(dueDate, saldo, referenceDate);
  if (atraso > 0) return "vencida";

  const paraVencer = diasParaVencer(dueDate, referenceDate);
  if (paraVencer <= 5) return "vence_em_breve";

  if (amountPaid > 0) return "parcial";

  return "a_vencer";
}

/**
 * Cor da linha por urgência — nunca pinta de vermelho uma parcela já quitada
 * (mesmo se foi paga com atraso). Sobreposição (ex.: vencida + parcial) é
 * resolvida priorizando a urgência; a composição (parcial) é mostrada à
 * parte, num badge, não disputando o canal de cor da linha.
 */
export function situacaoRowClass(situacao: SituacaoParcela): string {
  switch (situacao) {
    case "quitada":
      return "bg-success/10 hover:bg-success/15";
    case "vencida":
      return "bg-destructive/10 hover:bg-destructive/15";
    case "vence_em_breve":
      return "bg-warning/10 hover:bg-warning/15";
    case "parcial":
      return "bg-info/10 hover:bg-info/15";
    default:
      return "";
  }
}

export function situacaoLabel(situacao: SituacaoParcela): string {
  switch (situacao) {
    case "quitada":
      return "Quitada";
    case "vencida":
      return "Vencida";
    case "vence_em_breve":
      return "Vence em breve";
    case "parcial":
      return "Parcialmente paga";
    default:
      return "A vencer";
  }
}

export function situacaoBadgeClass(situacao: SituacaoParcela): string {
  switch (situacao) {
    case "quitada":
      return "bg-success text-success-foreground hover:bg-success";
    case "vencida":
      return "bg-destructive text-destructive-foreground hover:bg-destructive";
    case "vence_em_breve":
      return "bg-warning text-warning-foreground hover:bg-warning";
    case "parcial":
      return "bg-info text-info-foreground hover:bg-info";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted";
  }
}

export function atrasoBucket(dias: number): "1-30" | "31-60" | "61-90" | "90+" | null {
  if (dias <= 0) return null;
  if (dias <= 30) return "1-30";
  if (dias <= 60) return "31-60";
  if (dias <= 90) return "61-90";
  return "90+";
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrencyBRL(value: number): string {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
  return d.toLocaleDateString("pt-BR");
}

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}
