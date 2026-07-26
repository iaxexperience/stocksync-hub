import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_orders",
  title: "Listar pedidos",
  description: "Lista pedidos recentes, opcionalmente filtrados por status ou cliente.",
  inputSchema: {
    status: z.string().optional().describe("Status do pedido (ex: pendente, pago, cancelado)."),
    customer_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, customer_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("orders")
      .select("id, order_number, total_amount, status, customer_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    if (customer_id) q = q.eq("customer_id", customer_id);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return textResult(data, { count: data?.length ?? 0 });
  },
});
