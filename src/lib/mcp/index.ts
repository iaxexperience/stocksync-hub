import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCustomersTool from "./tools/list-customers";
import getCustomerTool from "./tools/get-customer";
import listProductsTool from "./tools/list-products";
import lowStockTool from "./tools/low-stock";
import listOrdersTool from "./tools/list-orders";
import getOrderTool from "./tools/get-order";
import financialSummaryTool from "./tools/financial-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "stockflow-mcp",
  title: "StockFlow Gestão",
  version: "0.1.0",
  instructions:
    "Ferramentas para o sistema StockFlow Gestão (Josi & Jo): consulta de clientes, produtos, estoque, pedidos e financeiro da empresa do usuário autenticado. Todas as leituras respeitam a RLS por organização.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listCustomersTool,
    getCustomerTool,
    listProductsTool,
    lowStockTool,
    listOrdersTool,
    getOrderTool,
    financialSummaryTool,
  ],
});
