import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export interface CobrancaInstallmentRow {
  id: string;
  order_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  amount_paid: number;
  payment_date: string | null;
  payment_method: string | null;
  status: string;
  orders: {
    id: string;
    order_number: string;
    order_type: string;
    total_amount: number;
    installments: number;
    status: string;
    created_at: string;
    customer_id: string;
    organization_id: string;
    customers: {
      id: string;
      name: string;
      cpf_cnpj: string | null;
      phone: string | null;
      whatsapp: string | null;
      is_deleted?: boolean;
      customer_addresses: {
        city: string | null;
        neighborhood: string | null;
        street: string | null;
        number: string | null;
        complement: string | null;
        is_primary: boolean | null;
      }[];
    };
    order_items: { quantity: number; products: { name: string } | null }[];
  };
}

// Reaproveita exatamente o truque de escopo por organização já comprovado em
// clientes.tsx:161-174 (installments não tem organization_id própria — o
// escopo é feito via orders!inner).
export function useCobrancaInstallments() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;

  return useQuery({
    queryKey: ["cobranca_installments", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installments")
        .select(
          `*, orders!inner(
            id, order_number, order_type, total_amount, installments, status, created_at, customer_id, organization_id,
            customers(id, name, cpf_cnpj, phone, whatsapp, is_deleted, customer_addresses(city, neighborhood, street, number, complement, is_primary)),
            order_items(quantity, products(name))
          )`,
        )
        .eq("orders.organization_id", orgId!)
        .neq("orders.status", "Cancelado")
        .order("due_date");
      if (error) throw error;
      return (data ?? []) as unknown as CobrancaInstallmentRow[];
    },
  });
}

// KPIs "recebido hoje" / "recebido no mês" não podem vir da própria parcela
// (installments.payment_date só guarda a data do ÚLTIMO pagamento) — vêm do
// histórico real em installment_payments.
export function useCobrancaRecebimentosPeriodo() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;

  return useQuery({
    queryKey: ["cobranca_recebimentos_periodo", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data, error } = await supabase
        .from("installment_payments")
        .select("amount, created_at")
        .eq("organization_id", orgId!)
        .eq("status", "ativo")
        .gte("created_at", startOfMonth);
      if (error) throw error;

      const rows = data ?? [];
      const recebidoHoje = rows
        .filter((r) => r.created_at >= startOfToday)
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const recebidoNoMes = rows.reduce((sum, r) => sum + Number(r.amount), 0);
      return { recebidoHoje, recebidoNoMes };
    },
  });
}

export function useInstallmentPaymentHistory(installmentId: string | null) {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;

  return useQuery({
    queryKey: ["installment_payment_history", installmentId],
    enabled: !!installmentId && !!orgId,
    queryFn: async () => {
      const [{ data: payments, error }, { data: orgProfilesRaw }] = await Promise.all([
        supabase
          .from("installment_payments")
          .select("*")
          .eq("installment_id", installmentId!)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_org_member_profiles" as never, { p_org_id: orgId! } as never),
      ]);
      if (error) throw error;

      const orgProfiles = (orgProfilesRaw ?? []) as unknown as { id: string; full_name: string | null }[];
      const profileById = new Map(orgProfiles.map((p) => [p.id, p.full_name]));

      return (payments ?? []).map((p) => ({
        ...p,
        created_by_name: profileById.get(p.created_by) ?? "—",
        cancelled_by_name: p.cancelled_by ? (profileById.get(p.cancelled_by) ?? "—") : null,
      }));
    },
  });
}

interface ReceivePaymentInput {
  installmentId: string;
  paymentMethod: string;
  amount?: number | null;
  notes?: string | null;
  clientRequestId: string;
}

export function useReceiveInstallmentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReceivePaymentInput) => {
      const { data, error } = await supabase.rpc("fn_receive_installment_payment" as never, {
        p_installment_id: input.installmentId,
        p_payment_method: input.paymentMethod,
        p_amount: input.amount ?? null,
        p_notes: input.notes ?? null,
        p_client_request_id: input.clientRequestId,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["cobranca_installments"] });
      qc.invalidateQueries({ queryKey: ["cobranca_recebimentos_periodo"] });
      qc.invalidateQueries({ queryKey: ["installment_payment_history", input.installmentId] });
      qc.invalidateQueries({ queryKey: ["installments"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["financial_transactions"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

interface CancelPaymentInput {
  paymentId: string;
  installmentId: string;
  reason?: string | null;
}

export function useCancelInstallmentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CancelPaymentInput) => {
      const { data, error } = await supabase.rpc("fn_cancel_installment_payment" as never, {
        p_payment_id: input.paymentId,
        p_reason: input.reason ?? null,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["cobranca_installments"] });
      qc.invalidateQueries({ queryKey: ["cobranca_recebimentos_periodo"] });
      qc.invalidateQueries({ queryKey: ["installment_payment_history", input.installmentId] });
      qc.invalidateQueries({ queryKey: ["installments"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["financial_transactions"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useLogCollectionAttempt() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;

  return useMutation({
    mutationFn: async (input: { installmentId: string; channel: string; notes?: string | null }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("audit_logs").insert({
        organization_id: orgId!,
        user_id: user?.id ?? null,
        action: "tentativa_cobranca",
        entity_type: "installment",
        entity_id: input.installmentId,
        details: { channel: input.channel, notes: input.notes ?? null },
      });
      if (error) throw error;
    },
  });
}
