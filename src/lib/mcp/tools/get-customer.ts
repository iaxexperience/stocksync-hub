import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_customer",
  title: "Obter cliente",
  description: "Retorna um cliente com endereços e últimos pedidos.",
  inputSchema: {
    id: z.string().uuid().describe("ID do cliente."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("customers")
      .select(
        "id, name, cpf_cnpj, customer_type, email, phone, created_at, customer_addresses(*), orders(id, order_number, total_amount, status, created_at)",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Cliente não encontrado.");
    return textResult(data);
  },
});
