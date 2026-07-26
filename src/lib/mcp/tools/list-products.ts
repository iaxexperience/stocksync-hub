import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "Listar produtos",
  description: "Lista produtos do catálogo com estoque atual. Filtra opcionalmente por busca.",
  inputSchema: {
    search: z.string().optional().describe("Busca por nome ou SKU."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("products")
      .select("id, name, sku, sale_price, cost_price, stock_current, stock_min, ncm")
      .order("name")
      .limit(limit ?? 50);
    if (search && search.trim()) {
      const s = search.trim();
      q = q.or(`name.ilike.%${s}%,sku.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return textResult(data, { count: data?.length ?? 0 });
  },
});
