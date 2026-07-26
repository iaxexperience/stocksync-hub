import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_customers",
  title: "Listar clientes",
  description:
    "Lista clientes da organização do usuário autenticado. Filtra opcionalmente por termo de busca (nome, CPF/CNPJ ou e-mail).",
  inputSchema: {
    search: z.string().optional().describe("Termo de busca para nome, CPF/CNPJ ou e-mail."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de resultados (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("customers")
      .select("id, name, cpf_cnpj, customer_type, email, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (search && search.trim()) {
      const s = search.trim();
      q = q.or(`name.ilike.%${s}%,cpf_cnpj.ilike.%${s}%,email.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return textResult(data, { count: data?.length ?? 0 });
  },
});
