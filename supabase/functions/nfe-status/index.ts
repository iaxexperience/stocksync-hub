// Consulta o status atual de uma NF-e já emitida na Focus NFe e atualiza o
// registro em fiscal_invoices. Emissão é assíncrona (a Sefaz processa em fila),
// então esta function existe para o front-end fazer polling até sair de
// "processando_autorizacao".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOCUS_NFE_BASE_URL: Record<string, string> = {
  homologacao: "https://homologacao.focusnfe.com.br",
  producao: "https://api.focusnfe.com.br",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) return json({ error: "order_id é obrigatório." }, 400);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const focusToken = Deno.env.get("FOCUS_NFE_TOKEN");
    if (!focusToken) return json({ error: "FOCUS_NFE_TOKEN não configurado." }, 500);

    // Cliente com o JWT de quem chamou, só para confirmar que ele tem acesso
    // (via RLS) a essa nota antes de consultarmos/atualizarmos qualquer coisa.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: invoice, error: invoiceErr } = await userClient
      .from("fiscal_invoices")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (invoiceErr || !invoice) {
      return json({ error: "Nota fiscal não encontrada para este pedido." }, 404);
    }

    const baseUrl = FOCUS_NFE_BASE_URL[invoice.environment] ?? FOCUS_NFE_BASE_URL.homologacao;
    const authB64 = btoa(`${focusToken}:`);
    const focusRes = await fetch(`${baseUrl}/v2/nfe/${encodeURIComponent(invoice.ref)}?completa=1`, {
      headers: { Authorization: `Basic ${authB64}` },
    });
    const focusData = await focusRes.json().catch(() => ({}) as Record<string, unknown>);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: updated, error: updateErr } = await serviceClient
      .from("fiscal_invoices")
      .update({
        status: (focusData as any).status ?? invoice.status,
        numero: (focusData as any).numero ?? invoice.numero,
        serie: (focusData as any).serie ?? invoice.serie,
        chave_acesso: (focusData as any).chave_nfe ?? invoice.chave_acesso,
        protocolo: (focusData as any).protocolo ?? invoice.protocolo,
        motivo_status:
          (focusData as any).mensagem_sefaz ??
          (focusData as any).mensagem ??
          ((focusData as any).erros ? JSON.stringify((focusData as any).erros) : invoice.motivo_status),
        xml_url: (focusData as any).caminho_xml_nota_fiscal ?? invoice.xml_url,
        danfe_url: (focusData as any).caminho_danfe ?? invoice.danfe_url,
        raw_response: focusData,
      })
      .eq("order_id", order_id)
      .select()
      .single();

    if (updateErr) return json({ error: updateErr.message }, 500);
    return json(updated, focusRes.ok ? 200 : 502);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Erro desconhecido." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
