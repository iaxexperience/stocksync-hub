import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "financial_summary",
  title: "Resumo financeiro",
  description:
    "Resume contas a receber e a pagar em aberto, pagas e vencidas para a organização do usuário.",
  inputSchema: {
    from: z.string().optional().describe("Data inicial YYYY-MM-DD (opcional)."),
    to: z.string().optional().describe("Data final YYYY-MM-DD (opcional)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("financial_transactions")
      .select("id, type, amount, status, due_date, paid_at, description");
    if (from) q = q.gte("due_date", from);
    if (to) q = q.lte("due_date", to);
    const { data, error } = await q.limit(1000);
    if (error) return errorResult(error.message);
    const today = new Date().toISOString().slice(0, 10);
    const summary = { receivable: { open: 0, paid: 0, overdue: 0 }, payable: { open: 0, paid: 0, overdue: 0 } };
    for (const t of data ?? []) {
      const bucket = (t as any).type === "receivable" ? summary.receivable : summary.payable;
      const amt = Number((t as any).amount ?? 0);
      const status = (t as any).status;
      const due = (t as any).due_date as string | null;
      if (status === "paid") bucket.paid += amt;
      else if (due && due < today) bucket.overdue += amt;
      else bucket.open += amt;
    }
    return textResult(summary, summary);
  },
});
