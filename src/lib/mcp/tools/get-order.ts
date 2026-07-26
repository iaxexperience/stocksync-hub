import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_order",
  title: "Obter pedido",
  description: "Retorna um pedido com itens, cliente e parcelas.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, subtotal, discount, shipping_fee, total_amount, status, created_at, customers(id, name, cpf_cnpj), order_items(id, quantity, unit_price, total_amount, products(id, name, sku)), installments(id, number, due_date, amount, status)",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Pedido não encontrado.");
    return textResult(data);
  },
});
