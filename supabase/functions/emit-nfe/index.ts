// Emite uma NF-e (Nota Fiscal Eletrônica de Mercadoria) para um pedido, via
// gateway Focus NFe. Roda em ambiente de HOMOLOGAÇÃO por padrão (sandbox, sem
// valor fiscal) — só muda para produção se a secret FOCUS_NFE_ENV=producao
// estiver setada, o que só deve acontecer depois que a empresa tiver
// certificado digital A1 e cadastro concluído na Focus NFe.
//
// Autenticação com a Focus NFe: HTTP Basic Auth com o token da empresa como
// usuário e senha em branco (padrão deles, não é uma escolha nossa).
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
    const environment = Deno.env.get("FOCUS_NFE_ENV") === "producao" ? "producao" : "homologacao";

    if (!focusToken) {
      return json(
        { error: "FOCUS_NFE_TOKEN não configurado. Defina essa secret na function antes de emitir." },
        500,
      );
    }

    // Cliente com o JWT de quem chamou: respeita RLS, então só quem é membro
    // da organização dona do pedido consegue sequer carregar os dados dele.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: order, error: orderErr } = await userClient
      .from("orders")
      .select(
        "id, order_number, organization_id, total_amount, subtotal, shipping_fee, discount, customer_id, " +
          "customers(name, cpf_cnpj, customer_type, email, phone, customer_addresses(*)), " +
          "order_items(id, quantity, unit_price, total_amount, product_id, products(id, name, sku, ncm))",
      )
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return json({ error: "Pedido não encontrado ou sem permissão de acesso." }, 404);
    }

    const { data: org, error: orgErr } = await userClient
      .from("organizations")
      .select("*")
      .eq("id", order.organization_id)
      .single();

    if (orgErr || !org) return json({ error: "Organização não encontrada." }, 404);

    // ── Validações fiscais mínimas ──────────────────────────────────────
    const missingOrgFields: string[] = [];
    if (!org.document) missingOrgFields.push("CNPJ");
    if (!org.state_registration) missingOrgFields.push("Inscrição Estadual");
    if (!org.tax_regime) missingOrgFields.push("Regime Tributário");
    if (!org.address_street) missingOrgFields.push("Logradouro");
    if (!org.address_number) missingOrgFields.push("Número do endereço");
    if (!org.address_neighborhood) missingOrgFields.push("Bairro");
    if (!org.address_city) missingOrgFields.push("Cidade");
    if (!org.address_state) missingOrgFields.push("UF");
    if (!org.address_zipcode) missingOrgFields.push("CEP");
    if (missingOrgFields.length > 0) {
      return json(
        {
          error: `Preencha os dados fiscais da empresa em Configurações → Dados Fiscais antes de emitir: ${missingOrgFields.join(", ")}.`,
        },
        422,
      );
    }

    const customer = order.customers as any;
    if (!customer) return json({ error: "Pedido sem cliente vinculado." }, 422);

    const addresses = customer.customer_addresses ?? [];
    const address = addresses.find((a: any) => a.is_primary) ?? addresses[0];
    if (!address) {
      return json(
        { error: "Cliente sem endereço cadastrado — obrigatório para emissão de NF-e." },
        422,
      );
    }

    const items = order.order_items ?? [];
    if (items.length === 0) return json({ error: "Pedido sem itens." }, 422);

    const itemsWithoutNcm = items.filter((it: any) => !it.products?.ncm);
    if (itemsWithoutNcm.length > 0) {
      const names = itemsWithoutNcm
        .map((it: any) => it.products?.name ?? `item sem produto vinculado (${it.id})`)
        .join(", ");
      return json(
        { error: `Preencha o NCM dos produtos em Produtos antes de emitir: ${names}.` },
        422,
      );
    }

    // ── Monta payload da Focus NFe ───────────────────────────────────────
    const cpfCnpj = (customer.cpf_cnpj ?? "").replace(/\D/g, "");
    const isCnpjDestinatario = cpfCnpj.length === 14;
    const cfop = org.address_state === address.state ? "5102" : "6102";
    // CSOSN 102 cobre a maioria dos casos de revenda no Simples Nacional; CST
    // "40" (isenta) é só um placeholder para Regime Normal — REVISAR COM O
    // CONTADOR antes de emitir em produção, tributação real varia por produto.
    const isSimplesNacional = org.tax_regime === 1 || org.tax_regime === 2;
    const ref = `pedido-${order.order_number}-${String(order.id).slice(0, 8)}`;

    const payload: Record<string, unknown> = {
      natureza_operacao: "Venda de mercadoria",
      data_emissao: new Date().toISOString(),
      tipo_documento: 1,
      finalidade_emissao: 1,

      cnpj_emitente: org.document.replace(/\D/g, ""),
      nome_emitente: org.name,
      inscricao_estadual_emitente: org.state_registration,
      regime_tributario_emitente: org.tax_regime,
      logradouro_emitente: org.address_street,
      numero_emitente: org.address_number,
      bairro_emitente: org.address_neighborhood,
      municipio_emitente: org.address_city,
      uf_emitente: org.address_state,
      cep_emitente: (org.address_zipcode ?? "").replace(/\D/g, ""),

      nome_destinatario: customer.name,
      [isCnpjDestinatario ? "cnpj_destinatario" : "cpf_destinatario"]: cpfCnpj,
      indicador_ie_destinatario: 9, // não contribuinte — ajustar se o cliente for contribuinte de ICMS
      logradouro_destinatario: address.street ?? "",
      numero_destinatario: address.number ?? "S/N",
      bairro_destinatario: address.neighborhood ?? "",
      municipio_destinatario: address.city ?? "",
      uf_destinatario: address.state ?? "",
      cep_destinatario: (address.zip_code ?? "").replace(/\D/g, ""),
      telefone_destinatario: (customer.phone ?? "").replace(/\D/g, ""),
      ...(customer.email ? { email_destinatario: customer.email } : {}),

      valor_frete: Number(order.shipping_fee ?? 0),
      valor_desconto: Number(order.discount ?? 0),
      valor_produtos: Number(order.subtotal ?? 0),
      valor_total: Number(order.total_amount ?? 0),

      items: items.map((it: any, idx: number) => ({
        numero_item: idx + 1,
        codigo_produto: it.products?.sku || it.product_id,
        descricao: it.products?.name ?? "Produto",
        codigo_ncm: it.products.ncm,
        cfop,
        quantidade_comercial: Number(it.quantity),
        valor_unitario_comercial: Number(it.unit_price),
        unidade_comercial: "UN",
        valor_bruto: Number(it.total_amount),
        quantidade_tributavel: Number(it.quantity),
        valor_unitario_tributavel: Number(it.unit_price),
        unidade_tributavel: "UN",
        icms_origem: "0",
        icms_situacao_tributaria: isSimplesNacional ? "102" : "40",
        pis_situacao_tributaria: "07",
        cofins_situacao_tributaria: "07",
      })),
    };

    const baseUrl = FOCUS_NFE_BASE_URL[environment];
    const authB64 = btoa(`${focusToken}:`);
    const focusRes = await fetch(`${baseUrl}/v2/nfe?ref=${encodeURIComponent(ref)}`, {
      method: "POST",
      headers: { Authorization: `Basic ${authB64}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const focusData = await focusRes.json().catch(() => ({}) as Record<string, unknown>);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: saved, error: saveErr } = await serviceClient
      .from("fiscal_invoices")
      .upsert(
        {
          organization_id: order.organization_id,
          order_id: order.id,
          environment,
          ref,
          status:
            (focusData as any).status ?? (focusRes.ok ? "processando_autorizacao" : "erro_autorizacao"),
          numero: (focusData as any).numero ?? null,
          serie: (focusData as any).serie ?? null,
          chave_acesso: (focusData as any).chave_nfe ?? null,
          motivo_status:
            (focusData as any).mensagem_sefaz ??
            (focusData as any).mensagem ??
            ((focusData as any).erros ? JSON.stringify((focusData as any).erros) : null),
          xml_url: (focusData as any).caminho_xml_nota_fiscal ?? null,
          danfe_url: (focusData as any).caminho_danfe ?? null,
          raw_response: focusData,
        },
        { onConflict: "order_id" },
      )
      .select()
      .single();

    if (saveErr) {
      return json({ error: `Nota enviada, mas falhou ao salvar o status: ${saveErr.message}` }, 500);
    }

    return json(saved, focusRes.ok ? 200 : 502);
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
