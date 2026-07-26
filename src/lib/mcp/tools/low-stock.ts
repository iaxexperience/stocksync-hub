import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "low_stock_products",
  title: "Produtos com estoque baixo",
  description: "Retorna produtos cujo estoque atual está abaixo (ou igual) ao estoque mínimo.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, stock_current, stock_min")
      .order("stock_current", { ascending: true })
      .limit(limit ?? 100);
    if (error) return errorResult(error.message);
    const low = (data ?? []).filter((p) => (p.stock_current ?? 0) <= (p.stock_min ?? 0));
    return textResult(low, { count: low.length });
  },
});
