import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  ShieldCheck,
  History,
  CreditCard,
  FileSignature,
  Search,
  Eye,
  Pencil,
  Trash2,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  FileText,
  Download,
  Share2,
  Plus,
  X,
  Printer,
  Calendar,
  DollarSign,
  Activity,
  Paperclip,
  ChevronRight,
  Info,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  BarChart,
  Bar,
} from "recharts";

export const Route = createFileRoute("/_authenticated/clientes")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      aba: (search.aba as string) || "dashboard",
      id: (search.id as string) || undefined,
      edit: (search.edit as string) || undefined,
    };
  },
  head: () => ({ meta: [{ title: "Clientes · StockFlow" }] }),
  component: ClientesLayout,
});

function ClientesLayout() {
  const { aba = "dashboard", id, edit } = Route.useSearch();
  const router = useRouter();
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const qc = useQueryClient();

  // Queries
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, customer_addresses(*)")
        .eq("organization_id", orgId!)
        .eq("is_deleted", false)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["orders", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(*)), customers(*)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("organization_id", orgId!)
        .eq("status", "ativo")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("active_org_id", orgId!)
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: installments = [], isLoading: isLoadingInstallments } = useQuery({
    queryKey: ["all_installments", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installments")
        .select("*, orders(*, customers(*))")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((i: any) => i.orders?.organization_id === orgId);
    },
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["signatures", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_signatures")
        .select("*, customers(*), orders(*)")
        .order("signed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.customers?.organization_id === orgId);
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit_logs", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Mutação para salvar/editar cliente
  const upsertCustomer = useMutation({
    mutationFn: async ({ customer, address }: { customer: any; address: any }) => {
      let customerId = customer.id;
      const customerPayload = {
        ...customer,
        organization_id: orgId,
        created_by: profile?.id,
      };

      if (customerId) {
        // Update customer
        const { error } = await supabase
          .from("customers")
          .update(customerPayload)
          .eq("id", customerId);
        if (error) throw error;
      } else {
        // Insert customer
        const { data, error } = await supabase
          .from("customers")
          .insert(customerPayload)
          .select("id")
          .single();
        if (error) throw error;
        customerId = data.id;
      }

      // Upsert address
      if (address) {
        const addressPayload = {
          ...address,
          customer_id: customerId,
        };
        // Check if address already exists
        const { data: existingAddress } = await supabase
          .from("customer_addresses")
          .select("id")
          .eq("customer_id", customerId)
          .limit(1);
        if (existingAddress && existingAddress.length > 0) {
          const { error } = await supabase
            .from("customer_addresses")
            .update(addressPayload)
            .eq("id", existingAddress[0].id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("customer_addresses").insert(addressPayload);
          if (error) throw error;
        }
      }

      return customerId;
    },
    onSuccess: (cid) => {
      toast.success(edit ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
      qc.invalidateQueries({ queryKey: ["customers"] });
      router.navigate({ to: "/clientes", search: { aba: "lista" } });
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar cliente: " + err.message);
    },
  });

  // Mutação para exclusão lógica de cliente
  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customers")
        .update({ is_deleted: true, status: "Inativo" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido (exclusão lógica registrada).");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Mutação para registrar novo Pedido/Contrato/Orçamento
  const createOrder = useMutation({
    mutationFn: async ({
      order,
      items,
      installmentsList,
    }: {
      order: any;
      items: any[];
      installmentsList: any[];
    }) => {
      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({
          ...order,
          organization_id: orgId,
          seller_id: profile?.id,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      // Insert items
      const itemsPayload = items.map((item) => ({
        ...item,
        order_id: newOrder.id,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      // Insert installments if needed
      if (installmentsList && installmentsList.length > 0) {
        const insPayload = installmentsList.map((ins) => ({
          ...ins,
          order_id: newOrder.id,
        }));
        const { error: insErr } = await supabase.from("installments").insert(insPayload);
        if (insErr) throw insErr;
      }

      return newOrder;
    },
    onSuccess: (newOrder) => {
      if (newOrder.order_type === "salvo") {
        toast.success(`Cadastro salvo com sucesso! Número: #${newOrder.order_number}`);
      } else {
        toast.success(`Venda registrada com sucesso! Número: #${newOrder.order_number}`);
      }
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["all_installments"] });

      if (newOrder.order_type === "contrato") {
        // Redireciona para assinar
        toast.info("Por favor, colete a assinatura do cliente.");
        router.navigate({
          to: "/clientes",
          search: { aba: "documentos", id: newOrder.customer_id },
        });
      } else {
        router.navigate({ to: "/clientes", search: { aba: "lista" } });
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao registrar venda: " + err.message);
    },
  });

  // Mutação para dar baixa em parcela
  const payInstallment = useMutation({
    mutationFn: async ({
      id,
      paymentMethod,
      paymentDate,
    }: {
      id: string;
      paymentMethod: string;
      paymentDate: string;
    }) => {
      const { error } = await supabase
        .from("installments")
        .update({
          status: "Pago",
          payment_method: paymentMethod,
          payment_date: paymentDate,
          receipt_url: "recibo-" + Math.floor(Math.random() * 900000 + 100000),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento da parcela registrado!");
      qc.invalidateQueries({ queryKey: ["all_installments"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao registrar pagamento: " + err.message);
    },
  });

  // Mutação para editar parcela
  const updateInstallment = useMutation({
    mutationFn: async ({
      id,
      dueDate,
      amount,
      status,
      paymentMethod,
      paymentDate,
    }: {
      id: string;
      dueDate: string;
      amount: number;
      status: string;
      paymentMethod: string | null;
      paymentDate: string | null;
    }) => {
      const { error } = await supabase
        .from("installments")
        .update({
          due_date: dueDate,
          amount,
          status,
          payment_method: paymentMethod,
          payment_date: paymentDate,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parcela atualizada com sucesso!");
      qc.invalidateQueries({ queryKey: ["all_installments"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao editar parcela: " + err.message);
    },
  });

  // Mutação para excluir parcela
  const deleteInstallment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("installments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parcela excluída com sucesso!");
      qc.invalidateQueries({ queryKey: ["all_installments"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir parcela: " + err.message);
    },
  });

  // Mutação para salvar assinatura digital
  const saveSignature = useMutation({
    mutationFn: async (signatureData: any) => {
      const { data, error } = await supabase
        .from("customer_signatures")
        .insert(signatureData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Assinatura digital gravada e vinculada!");
      qc.invalidateQueries({ queryKey: ["signatures"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar assinatura: " + err.message);
    },
  });

  function navegarAba(novaAba: string, extra = {}) {
    router.navigate({
      to: "/clientes",
      search: { aba: novaAba, ...extra },
    });
  }

  // Precalcula dados estatísticos para o dashboard
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const active = customers.filter((c: any) => c.status === "Ativo").length;
    const inadimplentes = customers.filter((c: any) => c.status === "Inadimplente").length;

    // Novos no mês
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newThisMonth = customers.filter(
      (c: any) => new Date(c.created_at) >= startOfMonth,
    ).length;

    // Sem compras recentes (> 60 dias)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const semComprasRecentes = customers.filter((c: any) => {
      const customerOrders = orders.filter(
        (o: any) =>
          o.customer_id === c.id && o.order_type !== "orcamento" && o.status !== "Cancelado",
      );
      if (customerOrders.length === 0) return true;
      const lastOrderDate = new Date(customerOrders[0].created_at);
      return lastOrderDate < sixtyDaysAgo;
    }).length;

    // Produtos mais adquiridos
    const prodCounts: Record<string, { name: string; sku: string; qty: number }> = {};
    orders.forEach((o: any) => {
      if (o.status !== "Cancelado" && o.order_type !== "orcamento") {
        o.order_items?.forEach((item: any) => {
          const pid = item.product_id;
          const qty = Number(item.quantity);
          if (prodCounts[pid]) {
            prodCounts[pid].qty += qty;
          } else {
            prodCounts[pid] = {
              name: item.products?.name || "Desconhecido",
              sku: item.products?.sku || "—",
              qty: qty,
            };
          }
        });
      }
    });
    const mostBoughtProducts = Object.values(prodCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Financeiro
    const approvedOrders = orders.filter(
      (o: any) => o.status !== "Cancelado" && o.order_type !== "orcamento",
    );
    const totalVendido = approvedOrders.reduce(
      (sum: number, o: any) => sum + Number(o.total_amount),
      0,
    );
    const ticketMedio = approvedOrders.length > 0 ? totalVendido / approvedOrders.length : 0;

    const totalRecebido = installments
      .filter((i: any) => i.status === "Pago")
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0);
    const totalAReceber = installments
      .filter((i: any) => i.status === "Pendente" || i.status === "Atrasado")
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0);

    // Maiores compradores
    const buyerAmounts: Record<
      string,
      { name: string; total: number; count: number; doc: string }
    > = {};
    customers.forEach((c: any) => {
      const cOrders = approvedOrders.filter((o: any) => o.customer_id === c.id);
      if (cOrders.length > 0) {
        buyerAmounts[c.id] = {
          name: c.name,
          doc: c.cpf_cnpj,
          total: cOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          count: cOrders.length,
        };
      }
    });
    const topBuyers = Object.values(buyerAmounts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalCustomers,
      active,
      newThisMonth,
      inadimplentes,
      semComprasRecentes,
      mostBoughtProducts,
      ticketMedio,
      totalVendido,
      totalRecebido,
      totalAReceber,
      topBuyers,
    };
  }, [customers, orders, installments]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            Gestão de Clientes & Vendas
          </h1>
          <p className="text-muted-foreground text-sm">
            Controle de cadastro, faturamento, contratos, assinatura digital e histórico.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={aba === "dashboard" ? "default" : "outline"}
            onClick={() => navegarAba("dashboard")}
            className="rounded-full px-4"
          >
            Dashboard
          </Button>
          <Button
            variant={aba === "lista" ? "default" : "outline"}
            onClick={() => navegarAba("lista")}
            className="rounded-full px-4"
          >
            Lista de Clientes
          </Button>
          <Button
            variant={aba === "novo" && !edit ? "default" : "outline"}
            onClick={() => navegarAba("novo")}
            className="rounded-full px-4"
          >
            <UserPlus className="h-4 w-4 mr-1" /> Novo Cliente
          </Button>
          <Button
            variant={aba === "produtos" ? "default" : "outline"}
            onClick={() => navegarAba("produtos")}
            className="rounded-full px-4"
          >
            Produtos Contratados
          </Button>
          <Button
            variant={aba === "historico" ? "default" : "outline"}
            onClick={() => navegarAba("historico")}
            className="rounded-full px-4"
          >
            Histórico Geral
          </Button>
          <Button
            variant={aba === "pagamentos" ? "default" : "outline"}
            onClick={() => navegarAba("pagamentos")}
            className="rounded-full px-4"
          >
            Pagamentos
          </Button>
          <Button
            variant={aba === "documentos" ? "default" : "outline"}
            onClick={() => navegarAba("documentos")}
            className="rounded-full px-4"
          >
            Assinaturas
          </Button>
        </div>
      </div>

      <div className="flex-1">
        {aba === "dashboard" && (isLoadingCustomers || isLoadingOrders) ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Carregando informações do dashboard...
          </div>
        ) : aba === "lista" && isLoadingCustomers ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Carregando lista de clientes...
          </div>
        ) : aba === "pagamentos" && isLoadingInstallments ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Carregando parcelas e pagamentos...
          </div>
        ) : aba === "produtos" && (isLoadingCustomers || isLoadingOrders) ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Carregando produtos contratados...
          </div>
        ) : aba === "historico" && isLoadingOrders ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Carregando histórico de compras...
          </div>
        ) : aba === "perfil" && (isLoadingCustomers || isLoadingOrders || isLoadingInstallments) ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Carregando perfil do cliente...
          </div>
        ) : (
          <>
            {aba === "dashboard" && (
              <ClientesDashboard stats={stats} orders={orders} navegarAba={navegarAba} />
            )}
            {aba === "lista" && (
              <ClientesList
                customers={customers}
                orders={orders}
                installments={installments}
                deleteCustomer={deleteCustomer.mutateAsync}
                navegarAba={navegarAba}
                sellers={sellers}
              />
            )}
            {aba === "novo" && (
              <ClienteForm
                customers={customers}
                id={id || edit}
                upsertCustomer={upsertCustomer.mutateAsync}
                createOrder={createOrder.mutateAsync}
                products={products}
                sellers={sellers}
                isEditMode={!!edit}
                navegarAba={navegarAba}
              />
            )}
            {aba === "perfil" && id && (
              <ClientePerfil
                customerId={id}
                customers={customers}
                orders={orders}
                installments={installments}
                signatures={signatures}
                auditLogs={auditLogs}
                payInstallment={payInstallment.mutateAsync}
                saveSignature={saveSignature.mutateAsync}
                navegarAba={navegarAba}
              />
            )}
            {aba === "produtos" && (
              <ProdutosContratadosList
                orders={orders}
                customers={customers}
                navegarAba={navegarAba}
              />
            )}
            {aba === "historico" && <HistoricoCompras orders={orders} navegarAba={navegarAba} />}
            {aba === "pagamentos" && (
              <PagamentosControle
                installments={installments}
                payInstallment={payInstallment.mutateAsync}
                updateInstallment={updateInstallment.mutateAsync}
                deleteInstallment={deleteInstallment.mutateAsync}
                navegarAba={navegarAba}
              />
            )}
            {aba === "documentos" && (
              <DocumentosList
                signatures={signatures}
                customers={customers}
                orders={orders}
                saveSignature={saveSignature.mutateAsync}
                navegarAba={navegarAba}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// SUBCOMPONENT: ClientesDashboard
// ============================================
function ClientesDashboard({
  stats,
  orders,
  navegarAba,
}: {
  stats: any;
  orders: any[];
  navegarAba: any;
}) {
  // Prepara dados para gráfico mensal (últimos 6 meses)
  const chartData = useMemo(() => {
    const months = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    const now = new Date();
    const data: Record<string, { label: string; valor: number; count: number; rawDate: Date }> = {};

    // Inicializa últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      data[key] = {
        label: `${months[d.getMonth()]}/${String(d.getFullYear()).substring(2)}`,
        valor: 0,
        count: 0,
        rawDate: d,
      };
    }

    // Soma vendas aprovadas nos meses
    orders.forEach((o: any) => {
      if (o.status !== "Cancelado" && o.order_type !== "orcamento") {
        const od = new Date(o.created_at);
        const key = `${od.getFullYear()}-${String(od.getMonth() + 1).padStart(2, "0")}`;
        if (data[key]) {
          data[key].valor += Number(o.total_amount);
          data[key].count += 1;
        }
      }
    });

    return Object.values(data).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  }, [orders]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 Cards de Principais Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm border-l-4 border-l-primary hover:shadow-md transition">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Total de Clientes
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold">{stats.totalCustomers}</span>
              <Users className="h-5 w-5 text-primary opacity-60" />
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <span className="font-medium text-success-foreground">{stats.active} ativos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-success hover:shadow-md transition">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Novos (Mês)
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold">{stats.newThisMonth}</span>
              <UserPlus className="h-5 w-5 text-success opacity-60" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Clientes cadastrados recentemente
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-destructive hover:shadow-md transition">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Inadimplentes
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-destructive">
                {stats.inadimplentes}
              </span>
              <AlertCircle className="h-5 w-5 text-destructive opacity-60" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">Contas com parcelas vencidas</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Sem Compras &gt; 60d
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-amber-600">
                {stats.semComprasRecentes}
              </span>
              <History className="h-5 w-5 text-amber-500 opacity-60" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">Necessitam de reengajamento</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-indigo-500 hover:shadow-md transition">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Ticket Médio
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-extrabold">
                {stats.ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              <DollarSign className="h-5 w-5 text-indigo-500 opacity-60" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">Média por venda aprovada</div>
          </CardContent>
        </Card>
      </div>

      {/* Financeiro consolidado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white shadow">
          <CardContent className="p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase opacity-80">
                Total Faturado (Vendido)
              </span>
              <h3 className="text-2xl font-bold mt-2">
                {stats.totalVendido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </h3>
            </div>
            <div className="text-xs opacity-65 mt-4">
              Consolidação de pedidos e contratos ativos
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white shadow">
          <CardContent className="p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase opacity-80">Total Recebido</span>
              <h3 className="text-2xl font-bold mt-2">
                {stats.totalRecebido.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </h3>
            </div>
            <div className="text-xs opacity-65 mt-4">Valor líquido liquidado</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-900 to-rose-950 text-white shadow">
          <CardContent className="p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase opacity-80">Saldo a Receber</span>
              <h3 className="text-2xl font-bold mt-2">
                {stats.totalAReceber.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </h3>
            </div>
            <div className="text-xs opacity-65 mt-4">Parcelas pendentes ou em atraso</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico + Tops */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Vendas */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              Faturamento Mensal (Últimos 6 Meses)
            </CardTitle>
            <CardDescription>Valores em reais acumulados de vendas finalizadas.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" fontSize={11} stroke="#888888" tickLine={false} />
                <YAxis
                  fontSize={11}
                  stroke="#888888"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${v / 1000}k`}
                />
                <ChartTooltip
                  formatter={(v: any) => [
                    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                    "Faturamento",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* TOP COMPRADORES & PRODUTOS */}
        <div className="flex flex-col gap-6">
          {/* Top Compradores */}
          <Card className="shadow-sm flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Maiores Compradores</CardTitle>
              <CardDescription>Clientes com maior volume acumulado.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-4">
              <div className="space-y-3">
                {stats.topBuyers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Sem registros de vendas.
                  </p>
                ) : (
                  stats.topBuyers.map((tb: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{tb.name}</p>
                        <p className="text-xs text-muted-foreground">{tb.count} pedidos</p>
                      </div>
                      <span className="font-bold text-primary shrink-0">
                        {tb.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Produtos */}
          <Card className="shadow-sm flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Produtos Mais Vendidos</CardTitle>
              <CardDescription>Quantidade de itens contratados.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-4">
              <div className="space-y-3">
                {stats.mostBoughtProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Nenhum produto faturado.
                  </p>
                ) : (
                  stats.mostBoughtProducts.map((mb: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{mb.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {mb.sku}</p>
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-800 border-0 font-bold">
                        {mb.qty} unid.
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUBCOMPONENT: ClientesList (Com filtros e ações)
// ============================================
function ClientesList({
  customers,
  orders,
  installments,
  deleteCustomer,
  navegarAba,
  sellers,
}: {
  customers: any[];
  orders: any[];
  installments: any[];
  deleteCustomer: any;
  navegarAba: any;
  sellers: any[];
}) {
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFin, setFilterFin] = useState("all");
  const [filterSeller, setFilterSeller] = useState("all");

  // Obtém lista de cidades cadastradas para o filtro
  const cities = useMemo(() => {
    const list = new Set<string>();
    customers.forEach((c: any) => {
      c.customer_addresses?.forEach((addr: any) => {
        if (addr.city) list.add(addr.city);
      });
    });
    return Array.from(list).sort();
  }, [customers]);

  // Cálculos consolidados de cada cliente
  const customersData = useMemo(() => {
    return customers.map((c: any) => {
      const addr = c.customer_addresses?.[0] || null;
      const cOrders = orders.filter((o: any) => o.customer_id === c.id && o.status !== "Cancelado");

      const qtdProdutos = cOrders.reduce((sum, o) => {
        if (o.order_type !== "orcamento") {
          return sum + o.order_items?.reduce((s: number, i: any) => s + Number(i.quantity), 0) || 0;
        }
        return sum;
      }, 0);

      const totalComprado = cOrders
        .filter((o) => o.order_type !== "orcamento")
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      const customerInstallments = installments.filter(
        (ins: any) => ins.orders?.customer_id === c.id,
      );
      const saldoPendente = customerInstallments
        .filter((ins: any) => ins.status === "Pendente" || ins.status === "Atrasado")
        .reduce((sum: number, ins: any) => sum + Number(ins.amount), 0);

      const hasAtrasada = customerInstallments.some(
        (ins: any) =>
          ins.status === "Atrasado" ||
          (ins.status === "Pendente" && new Date(ins.due_date) < new Date()),
      );

      // Última compra
      const purchases = cOrders.filter((o) => o.order_type !== "orcamento");
      const ultimaCompra = purchases.length > 0 ? purchases[0].created_at : null;

      // Vendedor do último pedido
      const ultimoVendedorId = cOrders.length > 0 ? cOrders[0].seller_id : null;

      return {
        ...c,
        cidade: addr?.city || "—",
        addressStr: addr ? `${addr.street}, ${addr.number} - ${addr.city}/${addr.state}` : "—",
        qtdProdutos,
        totalComprado,
        saldoPendente,
        hasAtrasada,
        ultimaCompra,
        ultimoVendedorId,
      };
    });
  }, [customers, orders, installments]);

  // Aplica filtros
  const filteredCustomers = useMemo(() => {
    return customersData.filter((c: any) => {
      // Busca texto (nome, cpf, telefone)
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.cpf_cnpj.includes(search) ||
        (c.phone && c.phone.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

      const matchesCity = filterCity === "all" || c.cidade === filterCity;
      const matchesStatus = filterStatus === "all" || c.status === filterStatus;
      const matchesSeller = filterSeller === "all" || c.ultimoVendedorId === filterSeller;

      let matchesFin = true;
      if (filterFin === "adimplente") {
        matchesFin = !c.hasAtrasada && c.status !== "Inadimplente";
      } else if (filterFin === "inadimplente") {
        matchesFin = c.hasAtrasada || c.status === "Inadimplente";
      }

      return matchesSearch && matchesCity && matchesStatus && matchesFin && matchesSeller;
    });
  }, [customersData, search, filterCity, filterStatus, filterFin, filterSeller]);

  function handleExcluir(id: string, name: string) {
    if (
      confirm(
        `Atenção: Tem certeza que deseja remover o cliente "${name}"?\nEsta ação realiza uma exclusão lógica e registra no log de auditoria.`,
      )
    ) {
      deleteCustomer(id);
    }
  }

  return (
    <Card className="shadow-sm animate-fade-in">
      <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-bold">Listagem de Clientes</CardTitle>
          <CardDescription>
            Relação de clientes cadastrados na organização e suas situações financeiras.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {/* Painel de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, doc ou fone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger>
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Cidades</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
              <SelectItem value="Em análise">Em análise</SelectItem>
              <SelectItem value="Bloqueado">Bloqueado</SelectItem>
              <SelectItem value="Inadimplente">Inadimplente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterFin} onValueChange={setFilterFin}>
            <SelectTrigger>
              <SelectValue placeholder="Situação Financeira" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Situações</SelectItem>
              <SelectItem value="adimplente">Adimplente (Em dia)</SelectItem>
              <SelectItem value="inadimplente">Inadimplente (Em atraso)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSeller} onValueChange={setFilterSeller}>
            <SelectTrigger>
              <SelectValue placeholder="Vendedor Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Vendedores</SelectItem>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela de Dados */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>CPF / CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead className="text-center">Produtos</TableHead>
                <TableHead className="text-right">Total Comprado</TableHead>
                <TableHead className="text-right">A Receber</TableHead>
                <TableHead>Última Compra</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    Nenhum cliente encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c: any) => {
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs uppercase shrink-0 border">
                            {c.photo_url ? (
                              <img
                                src={c.photo_url}
                                alt=""
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              c.name.substring(0, 2)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm">{c.name}</p>
                            {c.trade_name && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {c.trade_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{c.cpf_cnpj}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <p>{c.phone || "—"}</p>
                        {c.email && <p className="text-muted-foreground text-[10px]">{c.email}</p>}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]">{c.cidade}</TableCell>
                      <TableCell className="text-center font-medium text-xs">
                        {c.qtdProdutos}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs whitespace-nowrap">
                        {c.totalComprado.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs whitespace-nowrap">
                        <span
                          className={
                            c.saldoPendente > 0
                              ? c.hasAtrasada || c.status === "Inadimplente"
                                ? "text-destructive"
                                : "text-amber-600"
                              : "text-muted-foreground"
                          }
                        >
                          {c.saldoPendente.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {c.ultimaCompra
                          ? new Date(c.ultimaCompra).toLocaleDateString("pt-BR")
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`
                            ${c.status === "Ativo" && "bg-success/15 text-success hover:bg-success/20 border-success/30"}
                            ${c.status === "Inativo" && "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300"}
                            ${c.status === "Em análise" && "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300"}
                            ${c.status === "Bloqueado" && "bg-red-100 text-red-700 hover:bg-red-200 border-red-300"}
                            ${c.status === "Inadimplente" && "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-300"}
                          `}
                          variant="outline"
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Visualizar Perfil"
                            onClick={() => navegarAba("perfil", { id: c.id })}
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Editar Dados"
                            onClick={() => navegarAba("novo", { edit: c.id })}
                            className="h-8 w-8 text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Nova Venda / Contratar"
                            onClick={() => navegarAba("novo", { id: c.id })}
                            className="h-8 w-8 text-success"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Excluir"
                            onClick={() => handleExcluir(c.id, c.name)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// SUBCOMPONENT: ClienteForm (Cadastro + Carrinho)
// ============================================
function ClienteForm({
  customers,
  id,
  upsertCustomer,
  createOrder,
  products,
  sellers,
  isEditMode,
  navegarAba,
}: {
  customers: any[];
  id?: string;
  upsertCustomer: any;
  createOrder: any;
  products: any[];
  sellers: any[];
  isEditMode: boolean;
  navegarAba: any;
}) {
  const isVendaMode = id && !isEditMode; // se passar ID mas não estiver editando, é venda!

  const [activeTab, setActiveTab] = useState(id && !isEditMode ? "cobranca" : "dados");

  // Cadastro States
  const [customerType, setCustomerType] = useState("PF");
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [rgIe, setRgIe] = useState("");
  const [birthOrOpening, setBirthOrOpening] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [status, setStatus] = useState("Ativo");
  const [notes, setNotes] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [profession, setProfession] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from("customer-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("customer-photos")
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setPhotoUrl(publicUrlData.publicUrl);
        toast.success("Foto enviada com sucesso!");
      } else {
        throw new Error("Não foi possível gerar a URL da imagem.");
      }
    } catch (err: any) {
      console.error("Erro no upload:", err);
      toast.error("Erro ao enviar imagem: " + err.message);
    } finally {
      setIsUploading(false);
    }
  }

  // Address States
  const [zipCode, setZipCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [reference, setReference] = useState("");

  // Carrinho States
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [installationFee, setInstallationFee] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [discountType, setDiscountType] = useState("val"); // val ou pct
  const [discountVal, setDiscountVal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [downPayment, setDownPayment] = useState(0);
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  // Load draft on mount (if creating a new client, i.e., no id is provided)
  useEffect(() => {
    if (!id) {
      try {
        const saved = localStorage.getItem("stocksync_cliente_form_draft");
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.activeTab !== undefined) setActiveTab(draft.activeTab);
          if (draft.customerType !== undefined) setCustomerType(draft.customerType);
          if (draft.name !== undefined) setName(draft.name);
          if (draft.tradeName !== undefined) setTradeName(draft.tradeName);
          if (draft.cpfCnpj !== undefined) setCpfCnpj(draft.cpfCnpj);
          if (draft.rgIe !== undefined) setRgIe(draft.rgIe);
          if (draft.birthOrOpening !== undefined) setBirthOrOpening(draft.birthOrOpening);
          if (draft.phone !== undefined) setPhone(draft.phone);
          if (draft.whatsapp !== undefined) setWhatsapp(draft.whatsapp);
          if (draft.email !== undefined) setEmail(draft.email);
          if (draft.photoUrl !== undefined) setPhotoUrl(draft.photoUrl);
          if (draft.status !== undefined) setStatus(draft.status);
          if (draft.notes !== undefined) setNotes(draft.notes);
          if (draft.maritalStatus !== undefined) setMaritalStatus(draft.maritalStatus);
          if (draft.profession !== undefined) setProfession(draft.profession);

          if (draft.zipCode !== undefined) setZipCode(draft.zipCode);
          if (draft.street !== undefined) setStreet(draft.street);
          if (draft.number !== undefined) setNumber(draft.number);
          if (draft.complement !== undefined) setComplement(draft.complement);
          if (draft.neighborhood !== undefined) setNeighborhood(draft.neighborhood);
          if (draft.city !== undefined) setCity(draft.city);
          if (draft.state !== undefined) setState(draft.state);
          if (draft.reference !== undefined) setReference(draft.reference);

          if (draft.cartItems !== undefined) setCartItems(draft.cartItems);
          if (draft.installationFee !== undefined) setInstallationFee(draft.installationFee);
          if (draft.shippingFee !== undefined) setShippingFee(draft.shippingFee);
          if (draft.discountType !== undefined) setDiscountType(draft.discountType);
          if (draft.discountVal !== undefined) setDiscountVal(draft.discountVal);
          if (draft.paymentMethod !== undefined) setPaymentMethod(draft.paymentMethod);
          if (draft.installmentsCount !== undefined) setInstallmentsCount(draft.installmentsCount);
          if (draft.downPayment !== undefined) setDownPayment(draft.downPayment);
          if (draft.firstDueDate !== undefined) setFirstDueDate(draft.firstDueDate);
        }
      } catch (e) {
        console.error("Error loading draft", e);
      }
    }
  }, [id]);

  // Save draft to localStorage on state changes (if creating a new client)
  useEffect(() => {
    if (!id) {
      const draft = {
        activeTab,
        customerType,
        name,
        tradeName,
        cpfCnpj,
        rgIe,
        birthOrOpening,
        phone,
        whatsapp,
        email,
        photoUrl,
        status,
        notes,
        maritalStatus,
        profession,
        zipCode,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        reference,
        cartItems,
        installationFee,
        shippingFee,
        discountType,
        discountVal,
        paymentMethod,
        installmentsCount,
        downPayment,
        firstDueDate,
      };
      localStorage.setItem("stocksync_cliente_form_draft", JSON.stringify(draft));
    }
  }, [
    id,
    activeTab,
    customerType,
    name,
    tradeName,
    cpfCnpj,
    rgIe,
    birthOrOpening,
    phone,
    whatsapp,
    email,
    photoUrl,
    status,
    notes,
    maritalStatus,
    profession,
    zipCode,
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
    reference,
    cartItems,
    installationFee,
    shippingFee,
    discountType,
    discountVal,
    paymentMethod,
    installmentsCount,
    downPayment,
    firstDueDate,
  ]);

  // Se for Venda, preenche dados do cliente pré-existente
  const activeCustomer = useMemo(() => {
    if (id) {
      return customers.find((c: any) => c.id === id);
    }
    return null;
  }, [id, customers]);

  // Carrega dados se for Edição ou se for Venda
  useEffect(() => {
    if (activeCustomer) {
      setName(activeCustomer.name);
      setCustomerType(activeCustomer.customer_type);
      setTradeName(activeCustomer.trade_name || "");
      setCpfCnpj(activeCustomer.cpf_cnpj);
      setRgIe(activeCustomer.rg_state_registration || "");
      setBirthOrOpening(activeCustomer.birth_or_opening_date || "");
      setPhone(activeCustomer.phone || "");
      setWhatsapp(activeCustomer.whatsapp || "");
      setEmail(activeCustomer.email || "");
      setPhotoUrl(activeCustomer.photo_url || "");
      setStatus(activeCustomer.status);
      setNotes(activeCustomer.notes || "");
      setMaritalStatus(activeCustomer.marital_status || "");
      setProfession(activeCustomer.profession || "");

      const addr = activeCustomer.customer_addresses?.[0];
      if (addr) {
        setZipCode(addr.zip_code || "");
        setStreet(addr.street || "");
        setNumber(addr.number || "");
        setComplement(addr.complement || "");
        setNeighborhood(addr.neighborhood || "");
        setCity(addr.city || "");
        setState(addr.state || "");
        setReference(addr.reference || "");
      }
    }
  }, [activeCustomer]);

  // Função para buscar CEP via ViaCEP API
  async function handleBuscarCep() {
    const cleanCep = zipCode.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (data.erro) {
          toast.error("CEP não encontrado.");
        } else {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");
          toast.success("Endereço preenchido!");
        }
      } catch (err) {
        toast.error("Erro ao consultar CEP.");
      }
    }
  }

  // Filtragem de catálogo do carrinho
  const filteredCatalog = useMemo(() => {
    return products.filter((p: any) => {
      const query = searchProduct.toLowerCase();
      return p.name.toLowerCase().includes(query) || (p.sku && p.sku.toLowerCase().includes(query));
    });
  }, [products, searchProduct]);

  // Adicionar item ao carrinho
  function handleAddProduct(prod: any) {
    // verifica se produto já está no carrinho
    const existing = cartItems.find((item) => item.product_id === prod.id);
    if (existing) {
      toast.warning("Este produto já foi adicionado. Altere a quantidade na tabela.");
      return;
    }

    // Alerta de estoque
    if (Number(prod.stock_current) <= 0) {
      toast.info("Atenção: Este produto está sem estoque físico.");
    }

    setCartItems([
      ...cartItems,
      {
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku,
        unit_price: Number(prod.sale_price),
        quantity: 1,
        discount_type: "val",
        discount: 0,
        additional_fee: 0,
        warranty_days: prod.warranty_months ? prod.warranty_months * 30 : 0,
        serial_number: "",
        stock_current: Number(prod.stock_current),
      },
    ]);
    toast.success(`${prod.name} adicionado ao carrinho!`);
  }

  // Modificar quantidade do item
  function handleUpdateItemQty(index: number, val: number) {
    const items = [...cartItems];
    items[index].quantity = val;
    setCartItems(items);
  }

  // Modificar desconto do item
  function handleUpdateItemDiscount(index: number, val: number, type: string) {
    const items = [...cartItems];
    items[index].discount = val;
    items[index].discount_type = type;
    setCartItems(items);
  }

  // Modificar acréscimo do item
  function handleUpdateItemFee(index: number, val: number) {
    const items = [...cartItems];
    items[index].additional_fee = val;
    setCartItems(items);
  }

  // Modificar número de série do item
  function handleUpdateItemSerial(index: number, val: string) {
    const items = [...cartItems];
    items[index].serial_number = val;
    setCartItems(items);
  }

  // Remover do carrinho
  function handleRemoveItem(index: number) {
    setCartItems(cartItems.filter((_, i) => i !== index));
  }

  // Cálculos do Carrinho
  const cartTotals = useMemo(() => {
    let subtotal = 0;

    const itemsWithTotals = cartItems.map((item) => {
      const rawVal = item.unit_price * item.quantity;
      const desc = item.discount_type === "pct" ? rawVal * (item.discount / 100) : item.discount;
      const itemTotal = rawVal - desc + Number(item.additional_fee);
      subtotal += itemTotal;
      return {
        ...item,
        total: itemTotal,
      };
    });

    // Desconto global
    const descGlobal = discountType === "pct" ? subtotal * (discountVal / 100) : discountVal;
    const total = subtotal - descGlobal + Number(installationFee) + Number(shippingFee);

    return {
      items: itemsWithTotals,
      subtotal,
      discountVal: descGlobal,
      total: total > 0 ? total : 0,
    };
  }, [cartItems, installationFee, shippingFee, discountType, discountVal]);

  // Projeção das parcelas
  const projectedInstallments = useMemo(() => {
    const list = [];
    if (installmentsCount <= 0) return [];

    const balance = cartTotals.total - Number(downPayment);
    if (balance <= 0) return [];

    const valuePerInstallment = balance / installmentsCount;
    const baseDate = new Date(firstDueDate + "T00:00:00");

    for (let i = 1; i <= installmentsCount; i++) {
      const dueDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + (i - 1),
        baseDate.getDate(),
      );
      list.push({
        installment_number: i,
        due_date: dueDate.toISOString().split("T")[0],
        amount: Number(valuePerInstallment.toFixed(2)),
        status: "Pendente",
      });
    }

    return list;
  }, [cartTotals.total, installmentsCount, downPayment, firstDueDate]);

  // Validador matemático de CPF
  function isValidCPF(cpf: string): boolean {
    const cleanCPF = cpf.replace(/\D/g, "");
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleanCPF)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

    return true;
  }

  // Validador matemático de CNPJ
  function isValidCNPJ(cnpj: string): boolean {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleanCNPJ)) return false;

    let size = cleanCNPJ.length - 2;
    let numbers = cleanCNPJ.substring(0, size);
    const digits = cleanCNPJ.substring(size);
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    size = size + 1;
    numbers = cleanCNPJ.substring(0, size);
    sum = 0;
    pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
  }

  // Salvar cadastro geral (Aba dados + Aba endereço)
  async function handleSaveCustomerOnly() {
    if (!name || !cpfCnpj) {
      toast.error("Nome e CPF/CNPJ são campos obrigatórios.");
      return;
    }

    // Validação matemática de CPF/CNPJ
    if (customerType === "PF") {
      if (!isValidCPF(cpfCnpj)) {
        toast.error("CPF inválido. Por favor, digite um CPF válido.");
        setActiveTab("dados");
        return;
      }
    } else {
      if (!isValidCNPJ(cpfCnpj)) {
        toast.error("CNPJ inválido. Por favor, digite um CNPJ válido.");
        setActiveTab("dados");
        return;
      }
    }

    const customerObj = {
      id: isEditMode ? id : undefined,
      customer_type: customerType,
      name,
      trade_name: customerType === "PJ" ? tradeName : null,
      cpf_cnpj: cpfCnpj,
      rg_state_registration: rgIe,
      birth_or_opening_date: birthOrOpening || null,
      phone,
      whatsapp,
      email,
      photo_url: photoUrl,
      status,
      notes,
      marital_status: customerType === "PF" ? maritalStatus : null,
      profession: customerType === "PF" ? profession : null,
    };

    const addressObj = {
      zip_code: zipCode,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      reference,
    };

    await upsertCustomer({ customer: customerObj, address: addressObj });
    localStorage.removeItem("stocksync_cliente_form_draft");
  }

  // Finalizar Cobrança (Gerar orçamento, pedido ou contrato)
  async function handleFinalizarVenda(type: "orcamento" | "pedido" | "contrato" | "salvo") {
    if (cartItems.length === 0) {
      toast.error("O carrinho está vazio. Adicione pelo menos um produto.");
      return;
    }

    let customerId = id;

    // Se for um novo cliente cadastrando junto com a venda
    if (!customerId) {
      if (!name || !cpfCnpj) {
        toast.error("Preencha os dados do cliente para prosseguir com a venda.");
        setActiveTab("dados");
        return;
      }

      // Validação matemática de CPF/CNPJ
      if (customerType === "PF") {
        if (!isValidCPF(cpfCnpj)) {
          toast.error("CPF inválido. Por favor, digite um CPF válido.");
          setActiveTab("dados");
          return;
        }
      } else {
        if (!isValidCNPJ(cpfCnpj)) {
          toast.error("CNPJ inválido. Por favor, digite um CNPJ válido.");
          setActiveTab("dados");
          return;
        }
      }

      try {
        const customerObj = {
          customer_type: customerType,
          name,
          trade_name: customerType === "PJ" ? tradeName : null,
          cpf_cnpj: cpfCnpj,
          rg_state_registration: rgIe,
          birth_or_opening_date: birthOrOpening || null,
          phone,
          whatsapp,
          email,
          photo_url: photoUrl,
          status,
          notes,
          marital_status: customerType === "PF" ? maritalStatus : null,
          profession: customerType === "PF" ? profession : null,
        };

        const addressObj = {
          zip_code: zipCode,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          reference,
        };

        customerId = await upsertCustomer({ customer: customerObj, address: addressObj });
      } catch (err: any) {
        toast.error("Falha ao salvar dados do cliente: " + err.message);
        return;
      }
    }

    // Criar objeto do pedido
    const orderObj = {
      customer_id: customerId,
      order_number: "PED-" + Math.floor(Math.random() * 900000 + 100000),
      order_type: type,
      subtotal: cartTotals.subtotal,
      discount: cartTotals.discountVal,
      shipping_fee: shippingFee,
      installation_fee: installationFee,
      total_amount: cartTotals.total,
      payment_method: paymentMethod,
      installments: installmentsCount,
      status: type === "orcamento" ? "Rascunho" : type === "salvo" ? "Salvo" : "Pendente",
      payment_status: "Pendente",
      delivery_date: null,
      notes: notes,
    };

    const itemsObj = cartTotals.items.map((it) => ({
      product_id: it.product_id,
      quantity: it.quantity,
      unit_price: it.unit_price,
      discount: it.discount_type === "pct" ? it.unit_price * (it.discount / 100) : it.discount,
      additional_fee: it.additional_fee,
      total_amount: it.total,
      warranty_days: it.warranty_days,
      serial_number: it.serial_number,
      status: "Ativo",
    }));

    await createOrder({
      order: orderObj,
      items: itemsObj,
      installmentsList: projectedInstallments,
    });
    localStorage.removeItem("stocksync_cliente_form_draft");
  }

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-in">
      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold">
              {isVendaMode
                ? `Lançamento de Venda: ${activeCustomer?.name}`
                : isEditMode
                  ? "Editar Ficha de Cliente"
                  : "Formulário de Cadastro"}
            </CardTitle>
            <CardDescription>
              {isVendaMode
                ? "Preencha o carrinho e condições de faturamento do cliente."
                : "Forneça os dados pessoais, endereço e opcionais de faturamento."}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            onClick={() => navegarAba("lista")}
            className="self-start sm:self-center"
          >
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              {!isVendaMode && <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>}
              {!isVendaMode && <TabsTrigger value="endereco">Endereço</TabsTrigger>}
              <TabsTrigger value="cobranca">Produtos & Carrinho</TabsTrigger>
            </TabsList>

            {/* TAB: DADOS CADASTRAIS */}
            <TabsContent value="dados" className="space-y-4">
              <div className="flex gap-4 items-center bg-muted/30 p-3 rounded-md border max-w-fit">
                <span className="text-sm font-medium text-muted-foreground">Tipo de Cliente:</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={customerType === "PF" ? "default" : "outline"}
                    onClick={() => setCustomerType("PF")}
                    size="sm"
                    className="rounded-full"
                  >
                    Pessoa Física
                  </Button>
                  <Button
                    type="button"
                    variant={customerType === "PJ" ? "default" : "outline"}
                    onClick={() => setCustomerType("PJ")}
                    size="sm"
                    className="rounded-full"
                  >
                    Pessoa Jurídica
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <Label>Nome Completo / Razão Social *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ex: João da Silva ou Minha Empresa LTDA"
                  />
                </div>
                {customerType === "PJ" && (
                  <div className="space-y-1">
                    <Label>Nome Fantasia</Label>
                    <Input
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      placeholder="Ex: Mercadinho Central"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>{customerType === "PF" ? "CPF *" : "CNPJ *"}</Label>
                  <Input
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    required
                    placeholder={customerType === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{customerType === "PF" ? "RG" : "Inscrição Estadual"}</Label>
                  <Input
                    value={rgIe}
                    onChange={(e) => setRgIe(e.target.value)}
                    placeholder="Registro Geral ou IE"
                  />
                </div>
                <div className="space-y-1">
                  <Label>{customerType === "PF" ? "Data de Nascimento" : "Data de Abertura"}</Label>
                  <Input
                    type="date"
                    value={birthOrOpening}
                    onChange={(e) => setBirthOrOpening(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefone Comercial</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-1">
                  <Label>WhatsApp</Label>
                  <Input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(00) 90000-0000"
                  />
                </div>
                <div className="space-y-1">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@exemplo.com"
                  />
                </div>
                {customerType === "PF" && (
                  <>
                    <div className="space-y-1">
                      <Label>Estado Civil</Label>
                      <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                          <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                          <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                          <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                          <SelectItem value="União Estável">União Estável</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Profissão</Label>
                      <Input
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="Ex: Vendedor, Advogado"
                      />
                    </div>
                  </>
                )}
                <div className="md:col-span-2 space-y-1">
                  <Label>Foto / Logomarca (URL)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://exemplo.com/foto.png"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 w-10 shrink-0 relative overflow-hidden"
                      title="Anexar foto"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin opacity-70" />
                      ) : photoUrl ? (
                        <img src={photoUrl} className="h-full w-full object-cover" />
                      ) : (
                        <Paperclip className="h-4 w-4 opacity-70" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Situação do Cliente</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Em análise">Em análise</SelectItem>
                      <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                      <SelectItem value="Inadimplente">Inadimplente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-4 space-y-1">
                  <Label>Observações Internas (Restrito a funcionários)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalhes de crédito, histórico, restrições..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2 border-t">
                <Button variant="outline" type="button" onClick={() => navegarAba("lista")}>
                  Cancelar
                </Button>
                <Button variant="secondary" type="button" onClick={handleSaveCustomerOnly}>
                  Salvar Cadastro
                </Button>
                <Button type="button" onClick={() => setActiveTab("endereco")}>
                  Próximo: Endereço <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </TabsContent>

            {/* TAB: ENDEREÇO */}
            <TabsContent value="endereco" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="00000-000"
                    />
                    <Button type="button" variant="secondary" onClick={handleBuscarCep}>
                      Buscar
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label>Rua</Label>
                  <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Número</Label>
                  <Input
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="123"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Complemento</Label>
                  <Input
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Apto, Bloco, Fundos..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Bairro</Label>
                  <Input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Centro, Aeroporto..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cidade</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Estado (UF)</Label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div className="md:col-span-4 space-y-1">
                  <Label>Ponto de Referência</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ao lado da farmácia..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2 border-t">
                <Button variant="outline" type="button" onClick={() => setActiveTab("dados")}>
                  Voltar
                </Button>
                <Button variant="secondary" type="button" onClick={handleSaveCustomerOnly}>
                  Salvar Cadastro
                </Button>
                <Button type="button" onClick={() => setActiveTab("cobranca")}>
                  Próximo: Produtos & Cobrança <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </TabsContent>

            {/* TAB: COBRANÇA E CARRINHO */}
            <TabsContent value="cobranca" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Lado Esquerdo: Catálogo de Produtos (5 colunas) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-muted/40 p-3 rounded-lg border">
                    <h3 className="font-bold text-sm mb-2">Catálogo de Produtos Disponíveis</h3>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar produto por nome, SKU..."
                        value={searchProduct}
                        onChange={(e) => setSearchProduct(e.target.value)}
                        className="pl-8 text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                    {filteredCatalog.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        Nenhum produto em estoque.
                      </p>
                    ) : (
                      filteredCatalog.map((prod) => {
                        const outOfStock = Number(prod.stock_current) <= 0;
                        return (
                          <div
                            key={prod.id}
                            className="p-3 border rounded-lg bg-card hover:bg-slate-50 transition flex items-center gap-3"
                          >
                            <div className="h-12 w-12 border rounded bg-slate-100 flex items-center justify-center shrink-0 text-xs overflow-hidden">
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                "IMG"
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate text-slate-800">
                                {prod.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  SKU: {prod.sku ?? "—"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  | {prod.categories?.name ?? "Geral"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs font-extrabold text-primary">
                                  {Number(prod.sale_price).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold ${outOfStock ? "text-destructive" : "text-emerald-600"}`}
                                >
                                  Qtd: {prod.stock_current} {prod.unit_id ? "" : "UN"}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddProduct(prod)}
                              className="h-8 rounded"
                            >
                              <Plus className="h-3 w-3 mr-0.5" /> Add
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Lado Direito: Carrinho de Compras (7 colunas) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="p-4 border rounded-lg bg-slate-50/50 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-extrabold text-sm flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-primary" /> Carrinho do Cliente
                      </h3>
                      <Badge className="bg-primary">{cartItems.length} itens</Badge>
                    </div>

                    {/* Tabela do Carrinho */}
                    <div className="border rounded bg-white overflow-hidden text-xs">
                      <Table>
                        <TableHeader className="bg-slate-50 text-[10px]">
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="w-16 text-center">Qtd</TableHead>
                            <TableHead className="text-right">Unitário</TableHead>
                            <TableHead className="text-right">Desc. Item</TableHead>
                            <TableHead className="text-right">Acrésc.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cartItems.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center py-10 text-muted-foreground"
                              >
                                Carrinho vazio. Adicione produtos no painel lateral.
                              </TableCell>
                            </TableRow>
                          ) : (
                            cartItems.map((item, idx) => {
                              const itemTotal =
                                item.unit_price * item.quantity -
                                (item.discount_type === "pct"
                                  ? item.unit_price * item.quantity * (item.discount / 100)
                                  : item.discount) +
                                Number(item.additional_fee);
                              const exceeded = item.quantity > item.stock_current;

                              return (
                                <React.Fragment key={idx}>
                                  <TableRow
                                    className={exceeded ? "bg-red-50/50 hover:bg-red-50" : ""}
                                  >
                                    <TableCell>
                                      <div>
                                        <p className="font-semibold truncate max-w-[150px]">
                                          {item.name}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground font-mono">
                                          SKU: {item.sku ?? "—"}
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col items-center">
                                        <Input
                                          type="number"
                                          value={item.quantity}
                                          onChange={(e) =>
                                            handleUpdateItemQty(idx, Number(e.target.value))
                                          }
                                          min={1}
                                          className="h-7 text-center text-xs p-1 w-14"
                                        />
                                        {exceeded && (
                                          <span className="text-[8px] text-destructive font-semibold mt-0.5">
                                            Estoque: {item.stock_current}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {item.unit_price.toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      })}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1 justify-end">
                                        <Input
                                          type="number"
                                          value={item.discount}
                                          onChange={(e) =>
                                            handleUpdateItemDiscount(
                                              idx,
                                              Number(e.target.value),
                                              item.discount_type,
                                            )
                                          }
                                          className="h-7 text-right text-xs p-1 w-12"
                                        />
                                        <select
                                          value={item.discount_type}
                                          onChange={(e) =>
                                            handleUpdateItemDiscount(
                                              idx,
                                              item.discount,
                                              e.target.value,
                                            )
                                          }
                                          className="h-7 border text-[10px] rounded p-0.5 bg-white"
                                        >
                                          <option value="val">R$</option>
                                          <option value="pct">%</option>
                                        </select>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={item.additional_fee}
                                        onChange={(e) =>
                                          handleUpdateItemFee(idx, Number(e.target.value))
                                        }
                                        className="h-7 text-right text-xs p-1 w-14 ml-auto"
                                      />
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                      {itemTotal.toLocaleString("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      })}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleRemoveItem(idx)}
                                        className="h-6 w-6 text-destructive"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                  {/* Linha extra opcional para Número de Série se aplicável */}
                                  <TableRow className="border-b bg-slate-50/20">
                                    <TableCell colSpan={7} className="py-1 px-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-muted-foreground font-semibold">
                                          Nº Série / Detalhes:
                                        </span>
                                        <Input
                                          placeholder="Ex: NS-4819438"
                                          value={item.serial_number}
                                          onChange={(e) =>
                                            handleUpdateItemSerial(idx, e.target.value)
                                          }
                                          className="h-6 text-[10px] px-2 py-0.5 max-w-[200px]"
                                        />
                                        <span className="text-[9px] text-muted-foreground font-semibold ml-auto">
                                          Garantia contratada (dias):
                                        </span>
                                        <Input
                                          type="number"
                                          placeholder="Ex: 90"
                                          value={item.warranty_days}
                                          onChange={(e) => {
                                            const items = [...cartItems];
                                            items[idx].warranty_days = Number(e.target.value);
                                            setCartItems(items);
                                          }}
                                          className="h-6 text-[10px] px-2 py-0.5 w-16 text-center"
                                        />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </React.Fragment>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Resumo Financeiro */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded border text-xs">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Desconto Geral</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={discountVal}
                            onChange={(e) => setDiscountVal(Number(e.target.value))}
                            className="h-8 text-right"
                          />
                          <select
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value)}
                            className="h-8 border text-xs rounded p-1 bg-white"
                          >
                            <option value="val">R$</option>
                            <option value="pct">%</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">Frete (R$)</Label>
                        <Input
                          type="number"
                          value={shippingFee}
                          onChange={(e) => setShippingFee(Number(e.target.value))}
                          className="h-8 text-right"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">Taxa de Instalação (R$)</Label>
                        <Input
                          type="number"
                          value={installationFee}
                          onChange={(e) => setInstallationFee(Number(e.target.value))}
                          className="h-8 text-right"
                        />
                      </div>

                      <div className="flex flex-col justify-end items-end pr-2">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          VALOR TOTAL
                        </span>
                        <span className="text-xl font-extrabold text-indigo-700">
                          {cartTotals.total.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Formas de pagamento */}
                    <div className="border rounded bg-white p-3 space-y-3 text-xs">
                      <h4 className="font-bold border-b pb-1 text-slate-700">
                        Condição & Forma de Pagamento
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label>Forma de Cobrança</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="Pix">Pix</SelectItem>
                              <SelectItem value="Cartão de débito">Cartão de débito</SelectItem>
                              <SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem>
                              <SelectItem value="Boleto">Boleto</SelectItem>
                              <SelectItem value="Transferência bancária">
                                Transferência bancária
                              </SelectItem>
                              <SelectItem value="Financiamento">Financiamento</SelectItem>
                              <SelectItem value="Crediário próprio">Crediário próprio</SelectItem>
                              <SelectItem value="Pagamento parcelado">
                                Pagamento parcelado
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label>Número de Parcelas</Label>
                          <Select
                            value={String(installmentsCount)}
                            onValueChange={(v) => setInstallmentsCount(Number(v))}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 10, 12, 18, 24, 36].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n}x
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label>Entrada (Sinal)</Label>
                          <Input
                            type="number"
                            value={downPayment}
                            onChange={(e) => setDownPayment(Number(e.target.value))}
                            className="h-8 text-right"
                            max={cartTotals.total}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label>Primeiro Vencimento</Label>
                          <Input
                            type="date"
                            value={firstDueDate}
                            onChange={(e) => setFirstDueDate(e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>

                      {/* Preview de Parcelas */}
                      {projectedInstallments.length > 0 && (
                        <div className="bg-slate-50 p-2 rounded border max-h-[140px] overflow-y-auto space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                            Projeção das Parcelas:
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {downPayment > 0 && (
                              <div className="flex justify-between border-b py-0.5 col-span-2">
                                <span className="font-semibold text-emerald-700">
                                  Entrada (Sinal)
                                </span>
                                <span className="font-bold text-emerald-800">
                                  {downPayment.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </span>
                              </div>
                            )}
                            {projectedInstallments.map((ins, i) => (
                              <div key={i} className="flex justify-between border-b py-0.5">
                                <span>
                                  Parcela {ins.installment_number} / {projectedInstallments.length}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {ins.amount.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}{" "}
                                  (
                                  {new Date(ins.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                                  )
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações de Fechamento de Venda */}
                    <div className="flex flex-wrap gap-2 justify-end border-t pt-3">
                      <Button variant="outline" onClick={() => setActiveTab("dados")}>
                        Voltar
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleFinalizarVenda("salvo")}
                        className="border-green-500 text-green-700 hover:bg-green-50 hover:text-green-800"
                      >
                        💾 Salvar Cadastro
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => handleFinalizarVenda("orcamento")}
                        className="bg-slate-700 text-white hover:bg-slate-800"
                      >
                        Gerar Orçamento
                      </Button>

                      <Button
                        variant="default"
                        onClick={() => handleFinalizarVenda("pedido")}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        Gerar Pedido
                      </Button>

                      <Button
                        variant="default"
                        onClick={() => handleFinalizarVenda("contrato")}
                        className="bg-primary hover:bg-primary-hover"
                      >
                        Gerar Contrato (Assinatura)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// SUBCOMPONENT: ClientePerfil (Visão 360°)
// ============================================
function ClientePerfil({
  customerId,
  customers,
  orders,
  installments,
  signatures,
  auditLogs,
  payInstallment,
  saveSignature,
  navegarAba,
}: {
  customerId: string;
  customers: any[];
  orders: any[];
  installments: any[];
  signatures: any[];
  auditLogs: any[];
  payInstallment: any;
  saveSignature: any;
  navegarAba: any;
}) {
  const [activeTab, setActiveTab] = useState("timeline");

  // Dialog de Baixa de Parcela
  const [payingIns, setPayingIns] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState("Pix");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [openPayModal, setOpenPayModal] = useState(false);

  // Dialog para recibo
  const [receiptToShow, setReceiptToShow] = useState<any | null>(null);

  // Dialog para coletar assinatura pendente
  const [openSignModal, setOpenSignModal] = useState(false);
  const [signingOrder, setSigningOrder] = useState<any | null>(null);

  // Mock de uploads de anexos no state do componente para fins de simulação
  const [anexos, setAnexos] = useState<any[]>([
    { name: "RG_FrenteVerso.pdf", size: "1.2 MB", date: "10/07/2026" },
    { name: "Comprovante_Residencia.jpg", size: "840 KB", date: "10/07/2026" },
  ]);
  const [newAnexoName, setNewAnexoName] = useState("");

  const customer = useMemo(() => {
    return customers.find((c: any) => c.id === customerId);
  }, [customerId, customers]);

  const customerOrders = useMemo(() => {
    return orders.filter((o: any) => o.customer_id === customerId);
  }, [customerId, orders]);

  const customerInstallments = useMemo(() => {
    return installments.filter((ins: any) => ins.orders?.customer_id === customerId);
  }, [customerId, installments]);

  const customerSignatures = useMemo(() => {
    return signatures.filter((sig: any) => sig.customer_id === customerId);
  }, [customerId, signatures]);

  const customerLogs = useMemo(() => {
    return auditLogs.filter((log: any) => log.record_id === customerId);
  }, [customerId, auditLogs]);

  // Lista consolidada de produtos contratados pelo cliente (pedidos não cancelados e não orçamentos)
  const customerProducts = useMemo(() => {
    const list: any[] = [];
    customerOrders.forEach((o: any) => {
      if (o.status !== "Cancelado" && o.order_type !== "orcamento") {
        o.order_items?.forEach((item: any) => {
          list.push({
            id: item.id,
            order_number: o.order_number,
            order_id: o.id,
            date: o.created_at,
            name: item.products?.name || "Desconhecido",
            sku: item.products?.sku || "—",
            type: item.products?.type || "Produto",
            quantity: item.quantity,
            price: item.unit_price,
            discount: item.discount,
            total: item.total_amount,
            warranty_days: item.warranty_days,
            serial_number: item.serial_number,
            status: item.status,
          });
        });
      }
    });
    return list;
  }, [customerOrders]);

  // Cronologia de Atividades
  const timeline = useMemo(() => {
    const list: any[] = [];

    // 1. Criação do cliente
    if (customer) {
      list.push({
        date: customer.created_at,
        icon: UserPlus,
        title: "Cliente Cadastrado",
        description: `Cadastro inicial efetuado com status "${customer.status}".`,
      });
    }

    // 2. Modificações do cadastro (via audit_logs)
    customerLogs.forEach((log: any) => {
      if (log.action === "UPDATE") {
        list.push({
          date: log.created_at,
          icon: Activity,
          title: "Ficha Atualizada",
          description: "Informações cadastrais ou financeiras foram alteradas.",
        });
      }
    });

    // 3. Pedidos / Vendas
    customerOrders.forEach((o: any) => {
      let icon = ShoppingCart;
      let label = "Pedido";
      if (o.order_type === "orcamento") {
        icon = FileText;
        label = "Orçamento";
      } else if (o.order_type === "contrato") {
        icon = FileSignature;
        label = "Contrato";
      } else if (o.order_type === "salvo") {
        icon = FileText;
        label = "Cadastro Salvo";
      }

      list.push({
        date: o.created_at,
        icon,
        title: `${label} #${o.order_number} Gerado`,
        description: `Valor total: ${Number(o.total_amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} | Status: ${o.status}.`,
      });

      if (o.status === "Aprovado" || o.status === "Concluído") {
        list.push({
          date: o.updated_at,
          icon: CheckCircle,
          title: `Venda Aprovada #${o.order_number}`,
          description: "Saída de mercadorias no estoque processada automaticamente.",
        });
      } else if (o.status === "Cancelado") {
        list.push({
          date: o.updated_at,
          icon: X,
          title: `Venda Cancelada #${o.order_number}`,
          description: "Itens estornados e devolvidos ao estoque.",
        });
      }
    });

    // 4. Assinaturas coletadas
    customerSignatures.forEach((sig: any) => {
      list.push({
        date: sig.signed_at,
        icon: FileSignature,
        title: "Contrato Assinado Digitalmente",
        description: `Aceite dos termos via tela de toque/mouse. IP: ${sig.ip_address || "Não informado"} | Dispositivo: ${sig.device_information || "Desconhecido"}.`,
      });
    });

    // 5. Baixa de parcelas
    customerInstallments.forEach((ins: any) => {
      if (ins.status === "Pago" && ins.payment_date) {
        list.push({
          date: ins.payment_date + "T12:00:00", // Simula hora
          icon: CreditCard,
          title: `Parcela #${ins.installment_number} Paga`,
          description: `Valor de ${Number(ins.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} recebido via ${ins.payment_method}.`,
        });
      }
    });

    // Ordena decrescente por data
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customer, customerLogs, customerOrders, customerSignatures, customerInstallments]);

  if (!customer) {
    return (
      <div className="text-center py-20 text-muted-foreground border rounded-lg bg-card shadow-sm">
        Cliente não encontrado.
      </div>
    );
  }

  // Efetua pagamento
  async function handleConfirmPayment() {
    if (!payingIns) return;
    await payInstallment({
      id: payingIns.id,
      paymentMethod: payMethod,
      paymentDate: payDate,
    });
    setOpenPayModal(false);
    // Abre o recibo gerado
    setReceiptToShow({
      ...payingIns,
      payment_method: payMethod,
      payment_date: payDate,
      receipt_number: Math.floor(Math.random() * 90000 + 10000),
    });
  }

  function handleAddMockAnexo(e: React.FormEvent) {
    e.preventDefault();
    if (!newAnexoName) return;
    setAnexos([
      ...anexos,
      {
        name:
          newAnexoName.endsWith(".pdf") || newAnexoName.endsWith(".jpg")
            ? newAnexoName
            : newAnexoName + ".pdf",
        size: "350 KB",
        date: new Date().toLocaleDateString("pt-BR"),
      },
    ]);
    setNewAnexoName("");
    toast.success("Documento anexo adicionado!");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      {/* Coluna Esquerda: Dados Gerais (4 colunas) */}
      <div className="lg:col-span-4 space-y-4">
        <Card className="shadow-sm">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-3xl mx-auto border shadow-inner overflow-hidden">
              {customer.photo_url ? (
                <img src={customer.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                customer.name.substring(0, 2).toUpperCase()
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>
              {customer.trade_name && (
                <p className="text-xs text-muted-foreground">{customer.trade_name}</p>
              )}
              <div className="flex gap-1.5 justify-center mt-2">
                <Badge variant="outline">
                  {customer.customer_type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                </Badge>
                <Badge
                  className={`
                    ${customer.status === "Ativo" && "bg-success/15 text-success border-success/30"}
                    ${customer.status === "Inativo" && "bg-slate-100 text-slate-600 border-slate-300"}
                    ${customer.status === "Em análise" && "bg-amber-100 text-amber-700 border-amber-300"}
                    ${customer.status === "Bloqueado" && "bg-red-100 text-red-700 border-red-300"}
                    ${customer.status === "Inadimplente" && "bg-rose-100 text-rose-700 border-rose-200"}
                  `}
                  variant="outline"
                >
                  {customer.status}
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <FileText className="h-4 w-4 shrink-0 opacity-60" />
                <span>
                  <span className="font-semibold">Doc:</span> {customer.cpf_cnpj}
                </span>
              </div>
              {customer.rg_state_registration && (
                <div className="flex items-center gap-2 text-slate-600">
                  <FileText className="h-4 w-4 shrink-0 opacity-60" />
                  <span>
                    <span className="font-semibold">
                      {customer.customer_type === "PF" ? "RG:" : "IE:"}
                    </span>{" "}
                    {customer.rg_state_registration}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 shrink-0 opacity-60" />
                <span>{customer.phone || "Sem Telefone"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 shrink-0 opacity-60 text-emerald-600" />
                <span>{customer.whatsapp || "Sem WhatsApp"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-4 w-4 shrink-0 opacity-60" />
                <span className="truncate">{customer.email || "Sem E-mail"}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => navegarAba("novo", { edit: customer.id })}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
              <Button
                size="sm"
                variant="default"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navegarAba("novo", { id: customer.id })}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Vender
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Endereço Card */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" /> Endereço Cadastrado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-2">
            {customer.customer_addresses?.length === 0 ? (
              <p className="text-muted-foreground">Nenhum endereço registrado.</p>
            ) : (
              customer.customer_addresses.map((addr: any, i: number) => (
                <div key={i} className="space-y-1 bg-slate-50 p-2.5 rounded border">
                  <p>
                    <span className="font-semibold">Rua:</span> {addr.street}, nº {addr.number}
                  </p>
                  {addr.complement && (
                    <p>
                      <span className="font-semibold">Compl:</span> {addr.complement}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Bairro:</span> {addr.neighborhood}
                  </p>
                  <p>
                    <span className="font-semibold">Cidade:</span> {addr.city} - {addr.state}
                  </p>
                  <p>
                    <span className="font-semibold">CEP:</span> {addr.zip_code}
                  </p>
                  {addr.reference && (
                    <p className="text-muted-foreground text-[10px] mt-1 italic">
                      <span className="font-semibold">Ref:</span> {addr.reference}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coluna Direita: Detalhamento por abas (8 colunas) */}
      <div className="lg:col-span-8">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="timeline" className="text-xs">
                  Linha do Tempo
                </TabsTrigger>
                <TabsTrigger value="produtos" className="text-xs">
                  Produtos Adquiridos
                </TabsTrigger>
                <TabsTrigger value="vendas" className="text-xs">
                  Pedidos e Vendas
                </TabsTrigger>
                <TabsTrigger value="financeiro" className="text-xs">
                  Financeiro / Parcelas
                </TabsTrigger>
                <TabsTrigger value="documentos" className="text-xs">
                  Documentos & Assinaturas
                </TabsTrigger>
              </TabsList>

              {/* TABS CONTENT: TIMELINE */}
              <TabsContent value="timeline" className="space-y-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-indigo-500" /> Timeline de Atividades
                </h3>
                <div className="relative pl-6 border-l border-slate-200 ml-3 space-y-6 py-2">
                  {timeline.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6">
                      Sem atividades registradas para este cliente.
                    </p>
                  ) : (
                    timeline.map((event, i) => {
                      const Icon = event.icon;
                      return (
                        <div key={i} className="relative">
                          {/* Dot/Icon */}
                          <div className="absolute -left-9 top-0.5 bg-white border-2 border-primary/40 h-6 w-6 rounded-full flex items-center justify-center shadow-sm">
                            <Icon className="h-3 w-3 text-primary" />
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {new Date(event.date).toLocaleString("pt-BR")}
                            </span>
                            <h4 className="text-xs font-bold text-slate-800">{event.title}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              {/* TABS CONTENT: PRODUTOS ADQUIRIDOS */}
              <TabsContent value="produtos" className="space-y-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Produtos Vinculados ao
                  Cliente
                </h3>
                <div className="border rounded overflow-hidden text-xs bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                        <TableHead className="text-right">Preço Unitário</TableHead>
                        <TableHead className="text-right">Total Contratado</TableHead>
                        <TableHead>Venc. Garantia</TableHead>
                        <TableHead>Nº Série</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum produto adquirido ou faturado para este cliente.
                          </TableCell>
                        </TableRow>
                      ) : (
                        customerProducts.map((p, i) => {
                          const dateObj = new Date(p.date);
                          if (p.warranty_days) {
                            dateObj.setDate(dateObj.getDate() + p.warranty_days);
                          }
                          const warrantyExpired = p.warranty_days ? new Date() > dateObj : false;

                          return (
                            <TableRow key={i} className="hover:bg-slate-50/50">
                              <TableCell className="font-semibold">{p.name}</TableCell>
                              <TableCell className="capitalize text-[10px]">{p.type}</TableCell>
                              <TableCell className="font-mono text-[10px]">{p.sku}</TableCell>
                              <TableCell className="text-center">{p.quantity}</TableCell>
                              <TableCell className="text-right">
                                {Number(p.price).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {Number(p.total).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </TableCell>
                              <TableCell>
                                {p.warranty_days ? (
                                  <Badge
                                    className={
                                      warrantyExpired
                                        ? "bg-red-50 text-red-600 border-red-200"
                                        : "bg-success/10 text-success border-success/20"
                                    }
                                    variant="outline"
                                  >
                                    {dateObj.toLocaleDateString("pt-BR")}{" "}
                                    {warrantyExpired && "(Expirada)"}
                                  </Badge>
                                ) : (
                                  "Sem Garantia"
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-[10px] text-slate-700">
                                {p.serial_number || "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* TABS CONTENT: PEDIDOS/VENDAS */}
              <TabsContent value="vendas" className="space-y-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-500" /> Pedidos, Orçamentos e Contratos
                </h3>
                <div className="border rounded overflow-hidden text-xs bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Total Geral</TableHead>
                        <TableHead>Forma Pagamento</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Status Pedido</TableHead>
                        <TableHead>Status Pagamento</TableHead>
                        <TableHead>Data Emissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhuma transação registrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        customerOrders.map((o: any) => (
                          <TableRow key={o.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-bold text-primary">
                              #{o.order_number}
                            </TableCell>
                            <TableCell className="capitalize">{o.order_type}</TableCell>
                            <TableCell className="text-right font-bold">
                              {Number(o.total_amount).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </TableCell>
                            <TableCell>{o.payment_method}</TableCell>
                            <TableCell className="text-center">{o.installments}x</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  o.status === "Aprovado" || o.status === "Concluído"
                                    ? "bg-success/15 text-success hover:bg-success/20 border-success/30"
                                    : o.status === "Cancelado"
                                      ? "bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                                }
                                variant="outline"
                              >
                                {o.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  o.payment_status === "Pago"
                                    ? "bg-success/15 text-success border-success/30"
                                    : o.payment_status === "Inadimplente"
                                      ? "bg-red-100 text-red-700 border-red-200"
                                      : "bg-amber-100 text-amber-700 border-amber-200"
                                }
                                variant="outline"
                              >
                                {o.payment_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(o.created_at).toLocaleDateString("pt-BR")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* TABS CONTENT: FINANCEIRO */}
              <TabsContent value="financeiro" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-emerald-500" /> Cronograma Financeiro de
                    Parcelas
                  </h3>
                  <div className="text-right text-xs">
                    <span className="text-muted-foreground mr-2">Total Pendente:</span>
                    <span className="font-extrabold text-destructive">
                      {customerInstallments
                        .filter((i) => i.status !== "Pago" && i.status !== "Cancelado")
                        .reduce((sum, i) => sum + Number(i.amount), 0)
                        .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>

                <div className="border rounded overflow-hidden text-xs bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Nº Parcela</TableHead>
                        <TableHead>Pedido Vinculado</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor Parcela</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Data Recebido</TableHead>
                        <TableHead>Meio Recebido</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerInstallments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum faturamento parcelado pendente.
                          </TableCell>
                        </TableRow>
                      ) : (
                        customerInstallments.map((ins: any) => {
                          const isLate =
                            ins.status === "Pendente" && new Date(ins.due_date) < new Date();
                          return (
                            <TableRow key={ins.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-semibold text-center">
                                {ins.installment_number} / {ins.orders?.installments || 1}
                              </TableCell>
                              <TableCell className="font-bold">
                                #{ins.orders?.order_number}
                              </TableCell>
                              <TableCell className={isLate ? "text-destructive font-bold" : ""}>
                                {new Date(ins.due_date + "T00:00:00").toLocaleDateString("pt-BR")}{" "}
                                {isLate && "(Vencida!)"}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {Number(ins.amount).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    ins.status === "Pago"
                                      ? "bg-success/15 text-success border-success/30"
                                      : isLate || ins.status === "Atrasado"
                                        ? "bg-rose-100 text-rose-700 border-rose-200 font-bold"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                  }
                                  variant="outline"
                                >
                                  {isLate ? "Atrasado" : ins.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {ins.payment_date
                                  ? new Date(ins.payment_date + "T12:00:00").toLocaleDateString(
                                      "pt-BR",
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell>{ins.payment_method || "—"}</TableCell>
                              <TableCell className="text-right">
                                {ins.status !== "Pago" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold"
                                    onClick={() => {
                                      setPayingIns(ins);
                                      setOpenPayModal(true);
                                    }}
                                  >
                                    Dar Baixa
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-[10px] text-slate-500 flex items-center gap-1 ml-auto"
                                    onClick={() => setReceiptToShow(ins)}
                                  >
                                    <Printer className="h-3 w-3" /> Recibo
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* TABS CONTENT: DOCUMENTOS E ASSINATURAS */}
              <TabsContent value="documentos" className="space-y-6">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-3">
                    <FileSignature className="h-4 w-4 text-indigo-500" /> Assinaturas Digitais
                    Coletadas
                  </h3>
                  <div className="border rounded overflow-hidden text-xs bg-white mb-6">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Contrato Vinculado</TableHead>
                          <TableHead>Assinado Em</TableHead>
                          <TableHead>Dispositivo</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>Localização (Lat/Long)</TableHead>
                          <TableHead>Versão</TableHead>
                          <TableHead className="text-center">Assinatura</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerSignatures.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-muted-foreground"
                            >
                              Nenhuma assinatura digital coletada para este cliente.
                            </TableCell>
                          </TableRow>
                        ) : (
                          customerSignatures.map((sig: any) => (
                            <TableRow key={sig.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-bold text-primary">
                                #{sig.orders?.order_number}
                              </TableCell>
                              <TableCell>
                                {new Date(sig.signed_at).toLocaleString("pt-BR")}
                              </TableCell>
                              <TableCell
                                className="truncate max-w-[120px]"
                                title={sig.device_information}
                              >
                                {sig.device_information}
                              </TableCell>
                              <TableCell className="font-mono text-[10px]">
                                {sig.ip_address}
                              </TableCell>
                              <TableCell>
                                {sig.latitude
                                  ? `${Number(sig.latitude).toFixed(4)}, ${Number(sig.longitude).toFixed(4)}`
                                  : "Não compartilhada"}
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                v{sig.contract_version}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="h-10 w-24 border bg-white rounded p-0.5 mx-auto flex items-center justify-center shadow-inner">
                                  <img
                                    src={sig.signature_url}
                                    className="h-full object-contain"
                                    alt="Assinatura"
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Se houver contratos sem assinatura, permite coletar aqui */}
                {customerOrders.filter(
                  (o) =>
                    o.order_type === "contrato" &&
                    !customerSignatures.some((s) => s.order_id === o.id),
                ).length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-xs space-y-3">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="font-bold text-amber-800">Assinaturas Pendentes</h4>
                        <p className="text-amber-700">
                          Existem contratos vinculados a este cliente que ainda não foram assinados
                          digitalmente.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {customerOrders
                        .filter(
                          (o) =>
                            o.order_type === "contrato" &&
                            !customerSignatures.some((s) => s.order_id === o.id),
                        )
                        .map((o: any) => (
                          <Button
                            key={o.id}
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSigningOrder(o);
                              setOpenSignModal(true);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                          >
                            <FileSignature className="h-3.5 w-3.5 mr-1" /> Assinar Contrato #
                            {o.order_number}
                          </Button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Anexos de documentos */}
                <div>
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4 text-indigo-500" /> Anexos de Documentos
                    </h3>
                    <Badge variant="secondary">{anexos.length} arquivos</Badge>
                  </div>

                  <form onSubmit={handleAddMockAnexo} className="flex gap-2 mb-4">
                    <Input
                      placeholder="Nome do documento (Ex: RG.pdf, Contrato_Social.pdf)"
                      value={newAnexoName}
                      onChange={(e) => setNewAnexoName(e.target.value)}
                      className="text-xs h-8 flex-1"
                    />
                    <Button type="submit" size="sm" className="h-8">
                      <Plus className="h-4 w-4 mr-0.5" /> Anexar
                    </Button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {anexos.map((file, i) => (
                      <div
                        key={i}
                        className="p-3 border rounded-lg bg-slate-50 flex items-center justify-between text-xs hover:bg-slate-100/50 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold truncate max-w-[150px]">{file.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {file.size} | Enviado em {file.date}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-primary"
                            onClick={() => toast.success(`Baixando anexo "${file.name}"...`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setAnexos(anexos.filter((_, idx) => idx !== i))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* DIALOG DE CONFIRMAÇÃO DE PAGAMENTO (BAIXA) */}
      <Dialog open={openPayModal} onOpenChange={setOpenPayModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Baixa de Parcela</DialogTitle>
          </DialogHeader>
          {payingIns && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded border space-y-1.5">
                <p>
                  <span className="font-semibold text-muted-foreground">Cliente:</span>{" "}
                  {customer.name}
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Pedido Vinculado:</span> #
                  {payingIns.orders?.order_number}
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Parcela:</span>{" "}
                  {payingIns.installment_number} / {payingIns.orders?.installments || 1} Parcela
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Vencimento:</span>{" "}
                  {new Date(payingIns.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Valor:</span>{" "}
                  <span className="font-bold text-slate-800">
                    {Number(payingIns.amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Forma de Pagamento Utilizada</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Cartão de débito">Cartão de débito</SelectItem>
                      <SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Transferência bancária">Transferência bancária</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPayModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE IMPRESSÃO DE RECIBO */}
      <Dialog
        open={!!receiptToShow}
        onOpenChange={(o) => {
          if (!o) setReceiptToShow(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Printer className="h-5 w-5 text-emerald-600" /> Recibo de Pagamento
            </DialogTitle>
          </DialogHeader>
          {receiptToShow && (
            <div
              className="p-6 border rounded bg-white font-mono text-[11px] text-slate-800 space-y-4 shadow-sm"
              id="recibo-imprimir"
            >
              <div className="text-center border-b pb-3 space-y-1">
                <h2 className="text-base font-bold uppercase tracking-wide">
                  StockFlow Gestão Comercial
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  CNPJ: 00.000.000/0001-00 | Fone: (11) 99999-9999
                </p>
                <p className="text-[10px] text-muted-foreground">
                  E-mail: financeiro@stockflow.com
                </p>
              </div>

              <div className="flex justify-between font-bold text-xs">
                <span>RECIBO Nº {receiptToShow.receipt_number || "948271"}</span>
                <span>
                  VALOR:{" "}
                  {Number(receiptToShow.amount).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>

              <div className="space-y-3 leading-relaxed">
                <p>
                  Recebemos de <span className="font-bold uppercase">{customer.name}</span>,
                  inscrito no CPF/CNPJ <span className="font-bold">{customer.cpf_cnpj}</span>, a
                  importância de{" "}
                  <span className="font-bold">
                    {Number(receiptToShow.amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>{" "}
                  ({numberToWords(Number(receiptToShow.amount))}).
                </p>
                <p>
                  Referente ao pagamento da{" "}
                  <span className="font-bold">{receiptToShow.installment_number}ª parcela</span> do
                  pedido/contrato{" "}
                  <span className="font-bold">#{receiptToShow.orders?.order_number}</span>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div>
                  <span className="font-bold">MEIO DE PAGAMENTO:</span>
                  <p className="uppercase">{receiptToShow.payment_method}</p>
                </div>
                <div>
                  <span className="font-bold">DATA DO RECEBIMENTO:</span>
                  <p>
                    {new Date(receiptToShow.payment_date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="pt-10 text-center space-y-1">
                <div className="border-t border-slate-300 w-2/3 mx-auto pt-1 font-bold">
                  StockFlow Gestão Comercial
                </div>
                <span className="text-[9px] text-muted-foreground block">
                  Comprovante de Transação Eletrônica
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setReceiptToShow(null)}>
              Fechar
            </Button>
            <Button
              onClick={() => window.print()}
              className="bg-slate-800 text-white hover:bg-slate-900"
            >
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE ASSINATURA DIGITAL (SIMULAÇÃO DE TOUCH/MOUSE CANVAS) */}
      <Dialog open={openSignModal} onOpenChange={setOpenSignModal}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto">
          {signingOrder && (
            <SignatureCollector
              customer={customer}
              order={signingOrder}
              onClose={() => {
                setOpenSignModal(false);
                setSigningOrder(null);
              }}
              saveSignature={saveSignature}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// COMPONENT: SignatureCollector (Canvas e Termos)
// ============================================
function SignatureCollector({
  customer,
  order,
  onClose,
  saveSignature,
  prefilledSignature,
}: {
  customer: any;
  order: any;
  onClose: any;
  saveSignature?: any;
  prefilledSignature?: any;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(prefilledSignature ? true : false);
  const [signedResult, setSignedResult] = useState<any | null>(prefilledSignature || null);

  const productTypeMap: Record<string, string> = {
    eletrodomestico: "Eletrodoméstico",
    material: "Material",
    outro: "Outro",
  };

  function getProductTypeLabel(type?: string) {
    return type ? productTypeMap[type] || type : "Outro";
  }

  // Fetch active organization details for the contract
  const { data: organization } = useQuery({
    queryKey: ["active_organization", customer?.organization_id],
    enabled: !!customer?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", customer.organization_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch active organization settings for WhatsApp templates/integration
  const { data: settings } = useQuery({
    queryKey: ["active_organization_settings", customer?.organization_id],
    enabled: !!customer?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", customer.organization_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch seller's profile details
  const { data: sellerProfile } = useQuery({
    queryKey: ["seller_profile", order?.seller_id],
    enabled: !!order?.seller_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", order.seller_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch installments for the order
  const { data: orderInstallments = [] } = useQuery({
    queryKey: ["order_installments", order?.id],
    enabled: !!order?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installments")
        .select("*")
        .eq("order_id", order.id)
        .order("installment_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Calculations for payment terms
  const totalAmount = Number(order.total_amount) || 0;
  const installmentTotal = orderInstallments.reduce(
    (acc: number, ins: any) => acc + Number(ins.amount),
    0,
  );
  const installmentsCount = orderInstallments.length || Number(order.installments) || 1;
  const installmentAmount = orderInstallments[0]
    ? Number(orderInstallments[0].amount)
    : totalAmount / installmentsCount;
  const downPayment = Math.max(0, totalAmount - installmentTotal);
  const financedBalance = installmentTotal || totalAmount;
  const firstDueDate = orderInstallments[0]
    ? new Date(orderInstallments[0].due_date + "T12:00:00").toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  const sellerName = sellerProfile?.full_name || "Representante Legal";
  const addressObj = customer.customer_addresses?.[0];
  const customerAddress = addressObj
    ? `${addressObj.street || ""}, nº ${addressObj.number || ""}${
        addressObj.complement ? `, ${addressObj.complement}` : ""
      }, ${addressObj.neighborhood || ""}, ${addressObj.city || ""} - ${
        addressObj.state || ""
      }, CEP ${addressObj.zip_code || ""}`
    : "Endereço não cadastrado";

  // Inicializa Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
      }
    }
  }, [signedResult]);

  // Funções de desenho
  function getCoordinates(e: any) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Toque
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    // Mouse
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDrawing(e: any) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    e.preventDefault();
  }

  function draw(e: any) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function handleClearCanvas() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  async function handleConfirmSignature() {
    if (!termsAccepted) {
      toast.error("Você deve ler e aceitar os termos do contrato.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureDataURL = canvas.toDataURL("image/png");

    // Coleta metadados
    const device = navigator.userAgent;

    // Simula IP local / obtenção
    const ip = "192.168.1." + Math.floor(Math.random() * 254 + 1);

    // Coleta localização
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          submitData(latitude, longitude);
        },
        () => {
          submitData(null, null); // prossegue mesmo sem permissão de geolocalização
        },
      );
    } else {
      submitData(null, null);
    }

    async function submitData(lat: number | null, lng: number | null) {
      const signatureObj = {
        customer_id: customer.id,
        order_id: order.id,
        signature_url: signatureDataURL,
        signed_at: new Date().toISOString(),
        device_information: device,
        ip_address: ip,
        latitude: lat,
        longitude: lng,
        contract_url: "contrato-gerado-" + order.order_number + ".pdf",
        contract_version: "1.0",
      };

      try {
        const result = await saveSignature(signatureObj);
        setSignedResult(result);
      } catch (err: any) {
        toast.error("Erro ao assinar contrato: " + err.message);
      }
    }
  }

  // Links de simulação
  function handleSendWhatsApp() {
    const phoneNum = customer.whatsapp ? customer.whatsapp.replace(/\D/g, "") : "";
    if (!phoneNum) {
      toast.error("Cliente não possui número de WhatsApp cadastrado!");
      return;
    }

    const isMetaActive = 
      settings?.whatsapp_integration_enabled && 
      (settings as any).whatsapp_integration_type === "meta" && 
      (settings as any).whatsapp_api_token && 
      (settings as any).whatsapp_phone_number_id;

    if (isMetaActive) {
      const token = (settings as any).whatsapp_api_token;
      const phoneId = (settings as any).whatsapp_phone_number_id;
      const templateName = (settings as any).whatsapp_template_name || "hello_world";
      
      toast.info("Enviando contrato via WhatsApp (API Oficial Meta)...");
      
      fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNum,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: "pt_BR",
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: customer.name,
                  },
                  {
                    type: "text",
                    text: order.order_number,
                  },
                  {
                    type: "text",
                    text: `https://stockflow.com/v/contrato-${order.order_number}`,
                  }
                ],
              },
            ],
          },
        }),
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || "Erro desconhecido");
        }
        toast.success("Mensagem enviada com sucesso pelo WhatsApp!");
      })
      .catch((err) => {
        console.error("Erro Meta API:", err);
        toast.error(`Erro na API Oficial: ${err.message}. Abrindo link alternativo...`);
        fallbackLinkSend(phoneNum);
      });
    } else {
      fallbackLinkSend(phoneNum);
    }
  }

  function fallbackLinkSend(phoneNum: string) {
    const templateText = settings?.whatsapp_template || 
      "Olá {nome_cliente}, seu contrato digital #{numero_contrato} do StockFlow foi assinado com sucesso! Visualize o PDF no link: {link_contrato}";
    
    const resolvedText = templateText
      .replace(/{nome_cliente}/g, customer.name)
      .replace(/{numero_contrato}/g, order.order_number)
      .replace(/{valor_total}/g, String(order.total_amount || ""))
      .replace(/{link_contrato}/g, `https://stockflow.com/v/contrato-${order.order_number}`);

    const text = encodeURIComponent(resolvedText);
    window.open(`https://api.whatsapp.com/send?phone=${phoneNum}&text=${text}`, "_blank");
  }

  function handleSendEmail() {
    const subject = encodeURIComponent(
      `Contrato Assinado - Pedido #${order.order_number} - StockFlow`,
    );
    const body = encodeURIComponent(
      `Prezado(a) ${customer.name},\n\nAgradecemos a contratação. Segue em anexo a cópia assinada digitalmente do seu contrato #${order.order_number}.\n\nAtenciosamente,\nEquipe StockFlow.`,
    );
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <div className="space-y-5 py-2 text-xs">
      <style>{`
        @page {
          size: A4;
          margin: 15mm 20mm;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          html, body, [data-radix-portal], div[role="dialog"] {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            width: 100% !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            padding: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-before {
            page-break-before: always !important;
            break-before: always !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <DialogHeader className="no-print">
        <DialogTitle className="flex items-center gap-1.5">
          <FileSignature className="h-5 w-5 text-primary" /> Formalização e Assinatura Digital
        </DialogTitle>
      </DialogHeader>

      {/* Se já estiver assinado, exibe o painel de sucesso no topo */}
      {signedResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3 no-print">
          <div className="flex items-center gap-2 text-emerald-800">
            <Check className="h-5 w-5 bg-emerald-100 rounded-full p-0.5" />
            <span className="font-bold">Contrato Assinado Digitalmente com Sucesso!</span>
          </div>
          <p className="text-[11px] text-emerald-700">
            Protocolo: {signedResult.id} | IP: {signedResult.ip_address} | Data:{" "}
            {new Date(signedResult.signed_at).toLocaleString("pt-BR")}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir Contrato e Promissórias
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-emerald-700 bg-emerald-50"
              onClick={handleSendWhatsApp}
            >
              <Share2 className="h-3.5 w-3.5" /> Enviar WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-indigo-700 bg-indigo-50"
              onClick={handleSendEmail}
            >
              <Mail className="h-3.5 w-3.5" /> Enviar E-mail
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-slate-700 bg-slate-50 ml-auto no-print"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" /> Fechar
            </Button>
          </div>
        </div>
      )}

      {/* Visualização/Impressão do Contrato */}
      <div
        className="border p-6 rounded-lg bg-white overflow-y-auto max-h-[50vh] text-slate-800 space-y-6 print-container"
        id="contrato-imprimir"
        style={{ fontFamily: "serif" }}
      >
        <div className="text-center space-y-1">
          <h1 className="text-sm font-bold uppercase tracking-wider">
            CONTRATO PARTICULAR DE COMPRA E VENDA COM RESERVA DE DOMÍNIO
          </h1>
          <div className="text-[10px] space-y-0.5 text-slate-600">
            <p>
              <strong>Contrato nº:</strong> {order.order_number}
            </p>
            <p>
              <strong>Pedido nº:</strong> {order.order_number}
            </p>
            <p>
              <strong>Data:</strong> {new Date(order.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        <hr />

        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase border-b pb-1">DAS PARTES</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-[11px] uppercase text-indigo-900">VENDEDORA</h3>
              <p>
                <strong>Razão Social:</strong> {organization?.name || "StockFlow Gestão"}
              </p>
              <p>
                <strong>CNPJ:</strong> {organization?.document || "00.000.000/0001-00"}
              </p>
              <p>
                <strong>Endereço:</strong> {organization?.address || "Av. Principal, 1000 - Centro"}
              </p>
              <p>
                <strong>Telefone:</strong> {organization?.phone || "(00) 3000-0000"}
              </p>
              <p>
                <strong>E-mail:</strong> {organization?.email || "contato@stockflow.com"}
              </p>
              <p>
                <strong>Representante Legal:</strong> {sellerName}
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-[11px] uppercase text-indigo-900">COMPRADOR(A)</h3>
              <p>
                <strong>Nome:</strong> {customer.name}
              </p>
              <p>
                <strong>CPF/CNPJ:</strong> {customer.cpf_cnpj}
              </p>
              <p>
                <strong>RG:</strong> {customer.rg_state_registration || "Não informado"}
              </p>
              <p>
                <strong>Estado Civil:</strong> {customer.marital_status || "Não informado"}
              </p>
              <p>
                <strong>Profissão:</strong> {customer.profession || "Não informado"}
              </p>
              <p>
                <strong>Telefone:</strong> {customer.phone || "Não informado"}
              </p>
              <p>
                <strong>WhatsApp:</strong> {customer.whatsapp || "Não informado"}
              </p>
              <p>
                <strong>E-mail:</strong> {customer.email || "Não informado"}
              </p>
              <p>
                <strong>Endereço:</strong> {customerAddress}
              </p>
            </div>
          </div>
        </div>

        <hr />

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase border-b pb-1">
            CLÁUSULA PRIMEIRA – DO OBJETO
          </h2>
          <p>A VENDEDORA vende ao COMPRADOR os seguintes bens:</p>

          <table className="w-full border-collapse border border-slate-300 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-1 text-left">Produto</th>
                <th className="border border-slate-300 p-1 text-left">Tipo</th>
                <th className="border border-slate-300 p-1 text-left">Marca</th>
                <th className="border border-slate-300 p-1 text-left">Modelo</th>
                <th className="border border-slate-300 p-1 text-left">Nº Série</th>
                <th className="border border-slate-300 p-1 text-center">Quantidade</th>
                <th className="border border-slate-300 p-1 text-right">Valor Unitário</th>
                <th className="border border-slate-300 p-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items?.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="border border-slate-300 p-1">
                    {item.products?.name || "Produto"}
                  </td>
                  <td className="border border-slate-300 p-1">
                    {getProductTypeLabel(item.products?.product_type)}
                  </td>
                  <td className="border border-slate-300 p-1">
                    {item.products?.brand || "Genérica"}
                  </td>
                  <td className="border border-slate-300 p-1">
                    {item.products?.model || "Padrão"}
                  </td>
                  <td className="border border-slate-300 p-1">{item.serial_number || "S/N"}</td>
                  <td className="border border-slate-300 p-1 text-center">
                    {Number(item.quantity)}
                  </td>
                  <td className="border border-slate-300 p-1 text-right">
                    {Number(item.unit_price).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="border border-slate-300 p-1 text-right">
                    {Number(item.total_amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="font-bold text-[11px] mt-2">
            Valor Total da Venda:{" "}
            {Number(order.total_amount).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}{" "}
            ({numberToWords(Number(order.total_amount))}), dividido em {installmentsCount} parcelas
            mensais de{" "}
            {installmentAmount.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            .
          </p>
        </div>

        <hr />

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase border-b pb-1">
            CLÁUSULA SEGUNDA – DA FORMA DE PAGAMENTO
          </h2>
          <p>O pagamento será realizado nas seguintes condições:</p>
          <div className="space-y-1 pl-2">
            <p>
              Entrada:{" "}
              <strong>
                {downPayment.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </strong>
            </p>
            <p>
              Saldo financiado:{" "}
              <strong>
                {financedBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </strong>
            </p>
            <p>
              Quantidade de parcelas: <strong>{installmentsCount}</strong>
            </p>
            <p>
              Valor de cada parcela:{" "}
              <strong>
                {installmentAmount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </p>
            <p>
              Primeiro vencimento: <strong>{firstDueDate}</strong>
            </p>
          </div>
          <p className="mt-2 text-[10px]">
            Demais vencimentos ocorrerão mensalmente na mesma data. Em caso de atraso, poderão
            incidir multa, juros e atualização monetária conforme legislação vigente.
          </p>
        </div>

        <hr />

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase border-b pb-1">
            CLÁUSULA TERCEIRA – DA RESERVA DE DOMÍNIO
          </h2>
          <p>
            A propriedade do(s) bem(ns) permanecerá pertencente à VENDEDORA até a quitação integral
            do contrato.
          </p>
          <p>
            Enquanto existir saldo devedor, o COMPRADOR possuirá apenas a posse direta do(s)
            bem(ns).
          </p>
        </div>

        <hr />

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase border-b pb-1">
            CLÁUSULA QUARTA – DA POSSE E CONSERVAÇÃO
          </h2>
          <p>O COMPRADOR compromete-se a:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>conservar adequadamente o(s) produto(s);</li>
            <li>
              não vender, emprestar, alugar ou dar o bem em garantia sem autorização da VENDEDORA;
            </li>
            <li>comunicar qualquer dano, perda, roubo ou furto.</li>
          </ul>
          <p>A VENDEDORA poderá solicitar informações sobre a localização e estado do bem.</p>
        </div>

        <hr />

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase border-b pb-1">
            CLÁUSULA QUINTA – DO INADIMPLEMENTO
          </h2>
          <p>
            O atraso no pagamento de qualquer parcela constituirá automaticamente o COMPRADOR em
            mora.
          </p>
          <p>
            A VENDEDORA poderá cobrar judicial ou extrajudicialmente os valores devidos, considerar
            rescindido o contrato, requerer a restituição do bem, promover a execução das Notas
            Promissórias emitidas e adotar todas as medidas previstas na legislação.
          </p>
        </div>

        <hr />

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase border-b pb-1">
            CLÁUSULA SEXTA – DA GARANTIA
          </h2>
          <p>
            O(s) produto(s) possui(em) garantia conforme especificação do fabricante e/ou da
            VENDEDORA.
          </p>
          <p>
            Não estão cobertos: mau uso, acidentes, instalação inadequada, quedas, violação dos
            lacres e desgaste natural.
          </p>
        </div>

        <hr />

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase border-b pb-1">CLÁUSULA SÉTIMA – DA LGPD</h2>
          <p>
            As partes autorizam o tratamento dos dados pessoais exclusivamente para execução deste
            contrato, emissão de documentos fiscais, cobrança, assistência técnica e cumprimento das
            obrigações legais, nos termos da Lei nº 13.709/2018.
          </p>
        </div>

        <hr />

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase border-b pb-1">
            CLÁUSULA OITAVA – DA ASSINATURA ELETRÔNICA
          </h2>
          <p>
            As partes reconhecem como válida a assinatura eletrônica realizada através do sistema da
            VENDEDORA, possuindo a mesma validade jurídica da assinatura manuscrita.
          </p>
          <p>
            O sistema registrará automaticamente: Data e hora, IP, Dispositivo utilizado,
            Geolocalização (quando autorizada), Hash criptográfico do documento e Usuário
            responsável.
          </p>
        </div>

        <hr />

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase border-b pb-1">
            CLÁUSULA NONA – DAS DISPOSIÇÕES GERAIS
          </h2>
          <p>
            Este contrato obriga as partes e seus sucessores. Qualquer tolerância quanto ao
            descumprimento contratual não implicará renúncia de direitos.
          </p>
        </div>

        <hr />

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase border-b pb-1">CLÁUSULA DÉCIMA – DO FORO</h2>
          <p>
            Fica eleito o foro da Comarca de{" "}
            <strong>
              {customer.customer_addresses?.[0]?.city || "Cidade"} /{" "}
              {customer.customer_addresses?.[0]?.state || "UF"}
            </strong>
            , renunciando as partes a qualquer outro, por mais privilegiado que seja.
          </p>
        </div>

        <hr />

        {/* ASSINATURAS */}
        <div className="space-y-6 pt-4">
          <h2 className="text-xs font-bold uppercase border-b pb-1">ASSINATURAS</h2>

          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="text-center space-y-4">
              <p className="font-bold text-[10px] uppercase">VENDEDORA</p>
              <p>
                Empresa: <strong>{organization?.name || "StockFlow Gestão"}</strong>
              </p>
              <p>
                Representante: <strong>{sellerName}</strong>
              </p>
              <div className="border-b border-slate-400 h-10 w-2/3 mx-auto flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground uppercase">
                  [Assinatura Digital no Sistema]
                </span>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="font-bold text-[10px] uppercase">COMPRADOR</p>
              <p>
                Nome: <strong>{customer.name}</strong>
              </p>
              <p>
                CPF/CNPJ: <strong>{customer.cpf_cnpj}</strong>
              </p>
              <div className="border-b border-slate-400 h-12 w-2/3 mx-auto flex items-center justify-center">
                {signedResult || order.customer_signatures?.[0] ? (
                  <img
                    src={
                      signedResult?.signature_url || order.customer_signatures?.[0]?.signature_url
                    }
                    className="max-h-full object-contain"
                    alt="Assinatura"
                  />
                ) : (
                  <span className="text-[9px] text-muted-foreground uppercase">
                    [Pendente Assinatura]
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6">
            <div className="space-y-1">
              <p className="font-bold text-[10px]">1ª TESTEMUNHA</p>
              <p>Nome: ___________________________________</p>
              <p>CPF: ____________________________________</p>
              <p>Assinatura: _______________________________</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-[10px]">2ª TESTEMUNHA</p>
              <p>Nome: ___________________________________</p>
              <p>CPF: ____________________________________</p>
              <p>Assinatura: _______________________________</p>
            </div>
          </div>
        </div>

        {/* NOTAS PROMISSÓRIAS (REPETE AUTOMATICAMENTE PARA CADA PARCELA) */}
        {orderInstallments.length > 0 && (
          <div className="pt-8 space-y-8 page-break-before">
            <hr className="border-2" />
            <h1 className="text-sm font-bold uppercase tracking-wider text-center">
              ANEXO I – NOTAS PROMISSÓRIAS
            </h1>
            <p className="text-[10px] text-center italic text-slate-500">
              As notas promissórias abaixo integram este contrato e correspondem às parcelas
              pactuadas, podendo ser destacadas e utilizadas individualmente.
            </p>

            {orderInstallments.map((ins: any, idx: number) => {
              const promissoriaNumero = `${ins.installment_number}/${orderInstallments.length}`;
              const dataVencimento = new Date(ins.due_date + "T12:00:00").toLocaleDateString(
                "pt-BR",
              );
              const valorParcela = Number(ins.amount);

              return (
                <div
                  key={ins.id}
                  className="border-2 border-slate-800 p-4 rounded-md space-y-3 bg-slate-50/30 relative print-avoid-break"
                >
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-bold text-[11px]">
                      NOTA PROMISSÓRIA Nº {promissoriaNumero}
                    </span>
                    <span className="font-bold text-[11px]">VENCIMENTO: {dataVencimento}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <p>
                      <strong>Contrato:</strong> {order.order_number}
                    </p>
                    <p>
                      <strong>Pedido:</strong> {order.order_number}
                    </p>
                    <p>
                      <strong>Valor:</strong>{" "}
                      {valorParcela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>

                  <p className="text-[10px] leading-relaxed">
                    No vencimento acima indicado, pagarei, por esta única via de{" "}
                    <strong>NOTA PROMISSÓRIA</strong>, sem qualquer condição, à empresa{" "}
                    <strong>{organization?.name || "StockFlow Gestão"}</strong>, inscrita no CNPJ nº{" "}
                    <strong>{organization?.document || "00.000.000/0001-00"}</strong>, ou à sua
                    ordem, a quantia de{" "}
                    <strong>
                      {valorParcela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}{" "}
                      ({numberToWords(valorParcela)})
                    </strong>
                    , referente à {ins.installment_number}ª parcela do Contrato Particular de Compra
                    e Venda nº {order.order_number}.
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-[9px] pt-2">
                    <div>
                      <h4 className="font-bold uppercase text-[9px]">Emitente</h4>
                      <p>Nome: {customer.name}</p>
                      <p>CPF/CNPJ: {customer.cpf_cnpj}</p>
                      <p>Endereço: {customerAddress}</p>
                      <p>
                        Cidade/UF: {customer.customer_addresses?.[0]?.city || "Cidade"} /{" "}
                        {customer.customer_addresses?.[0]?.state || "UF"}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold uppercase text-[9px]">Avalista (Opcional)</h4>
                      <p>Nome: ___________________________________</p>
                      <p>CPF: ____________________________________</p>
                      <p>Assinatura: _______________________________</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-4 border-t border-dashed">
                    <div className="text-[8px] text-slate-500">
                      <p>Código NP: {ins.id.slice(0, 8).toUpperCase()}</p>
                      <p>
                        Hash: {order.id.slice(0, 10).toUpperCase()}-
                        {ins.id.slice(0, 10).toUpperCase()}
                      </p>
                    </div>
                    <div className="text-center w-1/2 flex flex-col items-center justify-end">
                      <p className="text-[8px] text-slate-500 mb-1">
                        {customer.customer_addresses?.[0]?.city || "Cidade"},{" "}
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      <div className="h-8 w-full flex items-center justify-center mb-1">
                        {(signedResult || order.customer_signatures?.[0]) && (
                          <img
                            src={
                              signedResult?.signature_url ||
                              order.customer_signatures?.[0]?.signature_url
                            }
                            className="max-h-full object-contain"
                            alt="Assinatura Emitente"
                          />
                        )}
                      </div>
                      <div className="border-t border-slate-400 w-4/5 mx-auto pt-0.5">
                        <span className="text-[8px] font-bold block">{customer.name}</span>
                        <span className="text-[7px] text-slate-500 block">
                          Emitente (Assinatura)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Se não estiver assinado, exibe o painel de assinatura no rodapé */}
      {!signedResult && (
        <>
          <div className="space-y-3 flex flex-col no-print">
            <div
              className="flex items-center gap-2 mt-auto pt-2 bg-slate-50/50 p-2 rounded border cursor-pointer hover:bg-slate-100/55 transition-colors select-none"
              onClick={() => setTermsAccepted(!termsAccepted)}
            >
              <Checkbox
                id="terms-accept"
                checked={termsAccepted}
                onCheckedChange={(c) => setTermsAccepted(!!c)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-[11px] font-semibold text-slate-700">
                Li e aceito os termos do contrato digital acima.
              </span>
            </div>
          </div>

          {/* Caixa de Assinatura Canvas */}
          <div className="space-y-2 no-print">
            <Label className="font-bold text-slate-800">
              Assine na área abaixo (Celular/Tablet toque com o dedo, Desktop clique e arraste):
            </Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50 flex justify-center">
              <canvas
                ref={canvasRef}
                width={600}
                height={180}
                className="bg-white cursor-crosshair max-w-full block"
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center border-t pt-4 no-print">
            <Button variant="outline" type="button" onClick={handleClearCanvas}>
              Limpar Assinatura
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmSignature}
                disabled={!termsAccepted}
                className="bg-primary hover:bg-primary-hover font-semibold"
              >
                Confirmar e Assinar Contrato
              </Button>
            </div>
          </DialogFooter>
        </>
      )}
    </div>
  );
}

// ============================================
// SUBCOMPONENT: ProdutosContratadosList
// ============================================
function ProdutosContratadosList({
  orders,
  customers,
  navegarAba,
}: {
  orders: any[];
  customers: any[];
  navegarAba: any;
}) {
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const list: any[] = [];
    orders.forEach((o: any) => {
      if (o.status !== "Cancelado" && o.order_type !== "orcamento") {
        o.order_items?.forEach((item: any) => {
          list.push({
            id: item.id,
            order_number: o.order_number,
            order_id: o.id,
            customer_id: o.customer_id,
            customer_name: o.customers?.name || "Desconhecido",
            date: o.created_at,
            name: item.products?.name || "Desconhecido",
            sku: item.products?.sku || "—",
            quantity: item.quantity,
            price: item.unit_price,
            total: item.total_amount,
            warranty_days: item.warranty_days,
            serial_number: item.serial_number,
            status: item.status,
          });
        });
      }
    });
    return list;
  }, [orders]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const q = search.toLowerCase();
      return (
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.customer_name.toLowerCase().includes(q) ||
        (i.serial_number && i.serial_number.toLowerCase().includes(q))
      );
    });
  }, [items, search]);

  return (
    <Card className="shadow-sm animate-fade-in">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          Relação de Produtos Contratados (Ativos)
        </CardTitle>
        <CardDescription>
          Relação de mercadorias e licenças ativas vinculadas aos clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por produto, cliente ou serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="border rounded overflow-hidden text-xs bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Cliente Vinculado</TableHead>
                <TableHead>Nº Série / Detalhe</TableHead>
                <TableHead className="text-center">Quantidade</TableHead>
                <TableHead className="text-right">Valor Venda</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Data Contratação</TableHead>
                <TableHead>Garantia Expira</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    Nenhum produto contratado localizado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item, i) => {
                  const dObj = new Date(item.date);
                  if (item.warranty_days) {
                    dObj.setDate(dObj.getDate() + item.warranty_days);
                  }
                  const isExpired = item.warranty_days ? new Date() > dObj : false;

                  return (
                    <TableRow key={i} className="hover:bg-slate-50/50">
                      <TableCell className="font-semibold">{item.name}</TableCell>
                      <TableCell className="font-mono text-[10px]">{item.sku}</TableCell>
                      <TableCell
                        className="font-semibold text-primary cursor-pointer hover:underline"
                        onClick={() => navegarAba("perfil", { id: item.customer_id })}
                      >
                        {item.customer_name}
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">
                        {item.serial_number || "—"}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.price).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {Number(item.total).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell>{new Date(item.date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        {item.warranty_days ? (
                          <Badge
                            className={
                              isExpired
                                ? "bg-rose-50 text-rose-600 border-rose-200"
                                : "bg-success/15 text-success border-success/30"
                            }
                            variant="outline"
                          >
                            {dObj.toLocaleDateString("pt-BR")} {isExpired && "(Expirada)"}
                          </Badge>
                        ) : (
                          "Não declarada"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navegarAba("perfil", { id: item.customer_id })}
                          className="h-7 text-xs"
                        >
                          Ver Perfil
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// SUBCOMPONENT: HistoricoCompras
// ============================================
function HistoricoCompras({ orders, navegarAba }: { orders: any[]; navegarAba: any }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase();
      const matchesSearch =
        o.order_number.toLowerCase().includes(q) || o.customers?.name?.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || o.order_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [orders, search, typeFilter]);

  return (
    <Card className="shadow-sm animate-fade-in">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Histórico de Compras e Transações</CardTitle>
        <CardDescription>
          Relação de todos os orçamentos, pedidos de venda e contratos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por número do pedido ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="pedido">Pedidos</SelectItem>
              <SelectItem value="orcamento">Orçamentos</SelectItem>
              <SelectItem value="contrato">Contratos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded overflow-hidden text-xs bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Descontos</TableHead>
                <TableHead className="text-right">Taxas (Frete/Inst.)</TableHead>
                <TableHead className="text-right">Total Geral</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status Venda</TableHead>
                <TableHead>Status Pag.</TableHead>
                <TableHead>Data Emissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                    Nenhuma venda ou transação localizada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o: any) => (
                  <TableRow key={o.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-bold text-primary">#{o.order_number}</TableCell>
                    <TableCell className="capitalize">{o.order_type}</TableCell>
                    <TableCell
                      className="font-semibold text-slate-800 cursor-pointer hover:underline"
                      onClick={() => navegarAba("perfil", { id: o.customer_id })}
                    >
                      {o.customers?.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(o.subtotal).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </TableCell>
                    <TableCell className="text-right text-rose-600">
                      -
                      {Number(o.discount).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(o.shipping_fee + o.installation_fee).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </TableCell>
                    <TableCell className="text-right font-extrabold">
                      {Number(o.total_amount).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </TableCell>
                    <TableCell>{o.payment_method}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          o.status === "Aprovado" || o.status === "Concluído"
                            ? "bg-success/15 text-success hover:bg-success/20 border-success/30"
                            : o.status === "Cancelado"
                              ? "bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                              : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                        }
                        variant="outline"
                      >
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          o.payment_status === "Pago"
                            ? "bg-success/15 text-success border-success/30"
                            : o.payment_status === "Inadimplente"
                              ? "bg-rose-100 text-rose-700 border-rose-200 font-bold"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                        }
                        variant="outline"
                      >
                        {o.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// SUBCOMPONENT: PagamentosControle
// ============================================
function PagamentosControle({
  installments,
  payInstallment,
  navegarAba,
}: {
  installments: any[];
  payInstallment: any;
  navegarAba: any;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [payingIns, setPayingIns] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState("Pix");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [openPayModal, setOpenPayModal] = useState(false);

  const filtered = useMemo(() => {
    return installments.filter((ins) => {
      const q = search.toLowerCase();
      const matchesSearch =
        ins.orders?.order_number?.toLowerCase().includes(q) ||
        ins.orders?.customers?.name?.toLowerCase().includes(q);

      const isLate = ins.status === "Pendente" && new Date(ins.due_date) < new Date();
      let matchesStatus = true;
      if (statusFilter !== "all") {
        if (statusFilter === "Pago") matchesStatus = ins.status === "Pago";
        else if (statusFilter === "Pendente") matchesStatus = ins.status === "Pendente" && !isLate;
        else if (statusFilter === "Atrasado") matchesStatus = ins.status === "Atrasado" || isLate;
      }
      return matchesSearch && matchesStatus;
    });
  }, [installments, search, statusFilter]);

  async function handleConfirmPayment() {
    if (!payingIns) return;
    await payInstallment({
      id: payingIns.id,
      paymentMethod: payMethod,
      paymentDate: payDate,
    });
    setOpenPayModal(false);
  }

  return (
    <Card className="shadow-sm animate-fade-in">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Controle Financeiro de Parcelas</CardTitle>
        <CardDescription>
          Cobrança de crediários, parcelamentos de cartões e boletos de clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por pedido ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as parcelas</SelectItem>
              <SelectItem value="Pago">Pagas</SelectItem>
              <SelectItem value="Pendente">Pendentes em dia</SelectItem>
              <SelectItem value="Atrasado">Em atraso (Vencidas)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded overflow-hidden text-xs bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Pedido / Contrato</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status Cobrança</TableHead>
                <TableHead>Data Pago</TableHead>
                <TableHead>Meio Recebido</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Nenhuma parcela financeira localizada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ins: any) => {
                  const isLate = ins.status === "Pendente" && new Date(ins.due_date) < new Date();
                  return (
                    <TableRow key={ins.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-semibold text-center">
                        {ins.installment_number} / {ins.orders?.installments || 1}
                      </TableCell>
                      <TableCell className="font-bold">#{ins.orders?.order_number}</TableCell>
                      <TableCell
                        className="font-semibold text-primary cursor-pointer hover:underline"
                        onClick={() => navegarAba("perfil", { id: ins.orders?.customer_id })}
                      >
                        {ins.orders?.customers?.name}
                      </TableCell>
                      <TableCell className={isLate ? "text-destructive font-bold" : ""}>
                        {new Date(ins.due_date + "T00:00:00").toLocaleDateString("pt-BR")}{" "}
                        {isLate && "(Vencida!)"}
                      </TableCell>
                      <TableCell className="text-right font-extrabold">
                        {Number(ins.amount).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            ins.status === "Pago"
                              ? "bg-success/15 text-success border-success/30"
                              : isLate || ins.status === "Atrasado"
                                ? "bg-rose-100 text-rose-700 border-rose-200 font-bold"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                          variant="outline"
                        >
                          {isLate ? "Atrasado" : ins.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ins.payment_date
                          ? new Date(ins.payment_date + "T12:00:00").toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>{ins.payment_method || "—"}</TableCell>
                      <TableCell className="text-right">
                        {ins.status !== "Pago" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold"
                            onClick={() => {
                              setPayingIns(ins);
                              setOpenPayModal(true);
                            }}
                          >
                            Dar Baixa
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={openPayModal} onOpenChange={setOpenPayModal}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento</DialogTitle>
          </DialogHeader>
          {payingIns && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 p-3 rounded border space-y-1.5">
                <p>
                  <span className="font-semibold text-muted-foreground">Cliente:</span>{" "}
                  {payingIns.orders?.customers?.name}
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Pedido Vinculado:</span> #
                  {payingIns.orders?.order_number}
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Parcela:</span>{" "}
                  {payingIns.installment_number} / {payingIns.orders?.installments || 1} Parcela
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Vencimento:</span>{" "}
                  {new Date(payingIns.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
                <p>
                  <span className="font-semibold text-muted-foreground">Valor:</span>{" "}
                  <span className="font-bold text-slate-800">
                    {Number(payingIns.amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Forma de Pagamento Utilizada</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Cartão de débito">Cartão de débito</SelectItem>
                      <SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Transferência bancária">Transferência bancária</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPayModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================
// SUBCOMPONENT: DocumentosList
// ============================================
function DocumentosList({
  signatures,
  customers,
  orders,
  saveSignature,
  navegarAba,
}: {
  signatures: any[];
  customers: any[];
  orders: any[];
  saveSignature: any;
  navegarAba: any;
}) {
  const [search, setSearch] = useState("");
  const [openSignModal, setOpenSignModal] = useState(false);
  const [signingOrder, setSigningOrder] = useState<any | null>(null);
  const [signingCustomer, setSigningCustomer] = useState<any | null>(null);
  const [viewingPrefilledSignature, setViewingPrefilledSignature] = useState<any | null>(null);

  const filtered = useMemo(() => {
    return signatures.filter((s) => {
      const q = search.toLowerCase();
      return (
        s.customers?.name?.toLowerCase().includes(q) ||
        s.orders?.order_number?.toLowerCase().includes(q)
      );
    });
  }, [signatures, search]);

  // Contratos pendentes de assinatura (todos os clientes)
  const pendingContracts = useMemo(() => {
    const signedOrderIds = new Set(signatures.map((s: any) => s.order_id));
    return (orders as any[])
      .filter(
        (o: any) =>
          o.order_type === "contrato" && !signedOrderIds.has(o.id) && o.status !== "cancelado",
      )
      .map((o: any) => ({
        ...o,
        customer: customers.find((c: any) => c.id === o.customer_id),
      }))
      .filter((o: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          o.customer?.name?.toLowerCase().includes(q) || o.order_number?.toLowerCase().includes(q)
        );
      });
  }, [orders, signatures, customers, search]);

  function handleOpenSign(order: any) {
    const cust = customers.find((c: any) => c.id === order.customer_id);
    if (!cust) {
      toast.error("Cliente não encontrado para este contrato.");
      return;
    }
    setSigningCustomer(cust);
    setSigningOrder(order);
    setOpenSignModal(true);
  }

  return (
    <Card className="shadow-sm animate-fade-in">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          Arquivo de Assinaturas e Contratos Digitais
        </CardTitle>
        <CardDescription>
          Assine contratos pendentes no tablet/celular e mantenha o repositório de aceites
          coletados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-xs">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* PENDENTES DE ASSINATURA */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Contratos Pendentes de Assinatura
            </h3>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              {pendingContracts.length} pendentes
            </Badge>
          </div>
          <div className="border rounded overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-amber-50">
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingContracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Nenhum contrato aguardando assinatura.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingContracts.map((o: any) => (
                    <TableRow key={o.id} className="hover:bg-amber-50/40">
                      <TableCell className="font-bold text-primary">#{o.order_number}</TableCell>
                      <TableCell
                        className="font-semibold cursor-pointer hover:underline"
                        onClick={() => navegarAba("perfil", { id: o.customer_id })}
                      >
                        {o.customer?.name || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">
                        {o.customer?.cpf_cnpj || "—"}
                      </TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(o.total_amount || 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenSign(o)}
                          className="h-8 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        >
                          <FileSignature className="h-3.5 w-3.5 mr-1" /> Abrir Contrato & Assinar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ASSINADOS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> Contratos Assinados
            </h3>
            <Badge variant="secondary">{filtered.length} registros</Badge>
          </div>
          <div className="border rounded overflow-hidden text-xs bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Contrato Vinculado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Assinado Em</TableHead>
                  <TableHead>Endereço IP</TableHead>
                  <TableHead>Geolocalização</TableHead>
                  <TableHead>Dispositivo Utilizado</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead className="text-center">Assinatura</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      Nenhum contrato assinado localizado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sig: any) => (
                    <TableRow key={sig.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-primary">
                        #{sig.orders?.order_number}
                      </TableCell>
                      <TableCell
                        className="font-semibold text-slate-800 cursor-pointer hover:underline"
                        onClick={() => navegarAba("perfil", { id: sig.customer_id })}
                      >
                        {sig.customers?.name}
                      </TableCell>
                      <TableCell>{new Date(sig.signed_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-mono text-[10px]">{sig.ip_address}</TableCell>
                      <TableCell>
                        {sig.latitude
                          ? `${Number(sig.latitude).toFixed(4)}, ${Number(sig.longitude).toFixed(4)}`
                          : "Não autorizado"}
                      </TableCell>
                      <TableCell className="truncate max-w-[150px]" title={sig.device_information}>
                        {sig.device_information}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold">
                        v{sig.contract_version}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="h-9 w-24 border bg-white rounded p-0.5 mx-auto flex items-center justify-center shadow-inner">
                          <img
                            src={sig.signature_url}
                            className="h-full object-contain"
                            alt="Assinatura"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs flex items-center gap-1 ml-auto"
                          onClick={() => {
                            const fullOrder = orders.find((o) => o.id === sig.order_id);
                            if (fullOrder) {
                              setSigningCustomer(sig.customers);
                              setSigningOrder(fullOrder);
                              setViewingPrefilledSignature(sig);
                              setOpenSignModal(true);
                            } else {
                              toast.error("Pedido não localizado.");
                            }
                          }}
                        >
                          <Printer className="h-3 w-3" /> Imprimir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* DIALOG DE ASSINATURA */}
      <Dialog
        open={openSignModal}
        onOpenChange={(open) => {
          setOpenSignModal(open);
          if (!open) {
            setSigningOrder(null);
            setSigningCustomer(null);
            setViewingPrefilledSignature(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto">
          {signingOrder && signingCustomer && (
            <SignatureCollector
              customer={signingCustomer}
              order={signingOrder}
              onClose={() => {
                setOpenSignModal(false);
                setSigningOrder(null);
                setSigningCustomer(null);
                setViewingPrefilledSignature(null);
              }}
              saveSignature={saveSignature}
              prefilledSignature={viewingPrefilledSignature}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================
// HELPER UTILITY FUNCTIONS
// ============================================

// Transcreve números em extenso simples em português para fins do recibo
function numberToWords(num: number): string {
  const units = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = [
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];
  const tens = [
    "",
    "",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];
  const hundreds = [
    "",
    "cem",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];

  const integerPart = Math.floor(num);
  const centsPart = Math.round((num - integerPart) * 100);

  function getPart(n: number): string {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      return tens[ten] + (unit > 0 ? " e " + units[unit] : "");
    }
    if (n === 100) return "cem";
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      const name = hundred === 1 ? "cento" : hundreds[hundred];
      return name + (rest > 0 ? " e " + getPart(rest) : "");
    }
    return n.toString(); // simples para números muito grandes
  }

  let words = getPart(integerPart) + " reais";
  if (centsPart > 0) {
    words += " e " + getPart(centsPart) + " centavos";
  }
  return words;
}
