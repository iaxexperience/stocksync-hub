import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CobrancaPanel } from "@/components/cobranca/CobrancaPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PlusCircle,
  Clock,
  Calendar,
  Search,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  validateSearch: (search: Record<string, unknown>) => {
    return { aba: (search.aba as string) || "fluxo" };
  },
  head: () => ({ meta: [{ title: "Financeiro & Caixa · StockFlow" }] }),
  component: Financeiro,
});

const CATEGORY_LABELS: Record<string, string> = {
  recebimento_parcela: "Recebimento de parcela",
  estorno_recebimento: "Estorno de recebimento",
};

function categoryLabel(category: string | null | undefined): string {
  if (!category) return "—";
  return CATEGORY_LABELS[category] ?? category;
}

interface CashSession {
  id: string;
  opening_balance: number;
  additions: number;
  withdrawals: number;
  opened_at: string;
  opened_by_profile: { full_name: string | null } | null;
}

function Financeiro() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const router = useRouter();
  const { aba: activeTab } = Route.useSearch();
  const setActiveTab = (v: string) => router.navigate({ to: "/financeiro", search: { aba: v } });

  // Local State: Cash Flow Tab
  const [txTypeFilter, setTxTypeFilter] = useState<"todos" | "receita" | "despesa">("todos");
  const [txSearch, setTxSearch] = useState("");
  const [openAddTxModal, setOpenAddTxModal] = useState(false);
  const [newTx, setNewTx] = useState({
    type: "despesa" as "receita" | "despesa",
    amount: "",
    description: "",
    category: "outros",
    payment_method: "Pix",
    date: new Date().toISOString().split("T")[0],
  });

  // Local State: Sales Statement Tab
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Local State: Cash Drawer
  const [openAdjustmentModal, setOpenAdjustmentModal] = useState<"suprimento" | "sangria" | null>(
    null,
  );
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [openCloseSessionModal, setOpenCloseSessionModal] = useState(false);
  const [actualClosingBalance, setActualClosingBalance] = useState("");
  const [openingBalanceInput, setOpeningBalanceInput] = useState("");
  const [openingNotesInput, setOpeningNotesInput] = useState("");

  // Queries
  // 1. Transactions List
  const { data: transactions = [], isLoading: isLoadingTx } = useQuery({
    queryKey: ["financial_transactions", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("organization_id", orgId!)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // 2. Active Cash Register Session
  // NOTE: cash_register_sessions.opened_by references auth.users, not public.profiles,
  // so PostgREST cannot embed the profile via a foreign-key join. Fetch separately.
  const { data: activeSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ["active_cash_session", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: session, error } = await supabase
        .from("cash_register_sessions")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("status", "aberto")
        .maybeSingle();
      if (error) throw error;
      if (!session) return null;

      // profiles RLS only allows reading your own row, so the operator who
      // opened this session (possibly someone else) must come through the
      // get_org_member_profiles RPC instead of a direct .from("profiles") select.
      const { data: orgProfilesRaw } = await supabase.rpc("get_org_member_profiles" as never, {
        p_org_id: orgId!,
      } as never);
      const orgProfiles = (orgProfilesRaw ?? []) as unknown as { id: string; full_name: string | null }[];
      const openedByProfile = orgProfiles.find((p) => p.id === session.opened_by) ?? null;

      return {
        ...session,
        opened_by_profile: openedByProfile,
      } as unknown as CashSession;
    },
  });

  // 3. Sales ledger for period
  const { data: periodSales = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ["period_sales", orgId, startDate, endDate],
    enabled: !!orgId && !!startDate && !!endDate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(name)")
        .eq("organization_id", orgId!)
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // 4. Inflows in cash during active session (payment_method = 'Dinheiro'),
  //    descontando estornos de recebimento de parcela lançados como despesa
  //    (ver módulo Cobrança) para o saldo esperado do caixa bater certinho.
  const { data: sessionCashInflows = 0 } = useQuery({
    queryKey: ["session_cash_inflows", activeSession?.opened_at],
    enabled: !!activeSession,
    queryFn: async () => {
      const [{ data: receitas, error: errReceitas }, { data: estornos, error: errEstornos }] =
        await Promise.all([
          supabase
            .from("financial_transactions")
            .select("amount")
            .eq("organization_id", orgId!)
            .eq("type", "receita")
            .eq("payment_method", "Dinheiro")
            .gte("created_at", activeSession!.opened_at),
          supabase
            .from("financial_transactions")
            .select("amount")
            .eq("organization_id", orgId!)
            .eq("type", "despesa")
            .eq("category", "estorno_recebimento")
            .eq("payment_method", "Dinheiro")
            .gte("created_at", activeSession!.opened_at),
        ]);
      if (errReceitas) throw errReceitas;
      if (errEstornos) throw errEstornos;
      const totalReceitas = (receitas ?? []).reduce((sum, tx) => sum + Number(tx.amount), 0);
      const totalEstornos = (estornos ?? []).reduce((sum, tx) => sum + Number(tx.amount), 0);
      return totalReceitas - totalEstornos;
    },
  });

  // Mutations
  // 1. Add Transaction
  const addTransactionMutation = useMutation({
    mutationFn: async (txData: typeof newTx) => {
      const { error } = await supabase.from("financial_transactions").insert({
        organization_id: orgId!,
        type: txData.type,
        amount: Number(txData.amount),
        description: txData.description,
        category: txData.category,
        payment_method: txData.payment_method,
        date: txData.date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transação financeira registrada com sucesso!");
      setOpenAddTxModal(false);
      setNewTx({
        type: "despesa",
        amount: "",
        description: "",
        category: "outros",
        payment_method: "Pix",
        date: new Date().toISOString().split("T")[0],
      });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions", orgId] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao registrar transação: " + err.message);
    },
  });

  // 2. Open Cash Session
  const openSessionMutation = useMutation({
    mutationFn: async (openingData: { balance: number; notes: string }) => {
      const { error } = await supabase.from("cash_register_sessions").insert({
        organization_id: orgId!,
        opened_by: profile!.id,
        status: "aberto",
        opening_balance: openingData.balance,
        notes: openingData.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caixa aberto com sucesso!");
      setOpeningBalanceInput("");
      setOpeningNotesInput("");
      queryClient.invalidateQueries({ queryKey: ["active_cash_session", orgId] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao abrir caixa: " + err.message);
    },
  });

  // 3. Make Session Adjustment (Suprimento / Sangria)
  const adjustSessionMutation = useMutation({
    mutationFn: async (adj: { type: "suprimento" | "sangria"; amount: number; notes: string }) => {
      const field = adj.type === "suprimento" ? "additions" : "withdrawals";
      const currentVal = Number((activeSession as any)[field] || 0);

      // A) Update active session statistics
      const { error: sessionErr } = await supabase
        .from("cash_register_sessions")
        .update({
          [field]: currentVal + adj.amount,
        } as any)
        .eq("id", activeSession!.id);
      if (sessionErr) throw sessionErr;

      // B) Log adjustment as a financial transaction
      const { error: txErr } = await supabase.from("financial_transactions").insert({
        organization_id: orgId!,
        type: adj.type === "suprimento" ? "receita" : "despesa",
        amount: adj.amount,
        description: `${adj.type === "suprimento" ? "Suprimento de caixa" : "Sangria de caixa"}: ${adj.notes}`,
        category: adj.type,
        payment_method: "Dinheiro",
        date: new Date().toISOString().split("T")[0],
      });
      if (txErr) throw txErr;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.type === "suprimento" ? "Suprimento adicionado!" : "Sangria realizada!",
      );
      setAdjustmentAmount("");
      setAdjustmentNotes("");
      setOpenAdjustmentModal(null);
      queryClient.invalidateQueries({ queryKey: ["active_cash_session", orgId] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions", orgId] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao processar ajuste: " + err.message);
    },
  });

  // 4. Close Cash Session
  const closeSessionMutation = useMutation({
    mutationFn: async (closingData: { actual: number; expected: number }) => {
      const { error } = await supabase
        .from("cash_register_sessions")
        .update({
          status: "fechado",
          closed_by: profile!.id,
          closed_at: new Date().toISOString(),
          closing_balance: closingData.actual,
          expected_balance: closingData.expected,
        })
        .eq("id", activeSession!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caixa fechado com sucesso!");
      setOpenCloseSessionModal(false);
      setActualClosingBalance("");
      queryClient.invalidateQueries({ queryKey: ["active_cash_session", orgId] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao fechar caixa: " + err.message);
    },
  });

  // Derived Values - Cash Flow Tab
  const totals = useMemo(() => {
    let receita = 0;
    let despesa = 0;
    transactions.forEach((tx) => {
      if (tx.type === "receita") receita += Number(tx.amount);
      else despesa += Number(tx.amount);
    });
    return { receita, despesa, net: receita - despesa };
  }, [transactions]);

  const filteredTx = useMemo(() => {
    return transactions.filter((tx) => {
      if (txTypeFilter !== "todos" && tx.type !== txTypeFilter) return false;
      if (
        txSearch &&
        !tx.description?.toLowerCase().includes(txSearch.toLowerCase()) &&
        !tx.category?.toLowerCase().includes(txSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [transactions, txTypeFilter, txSearch]);

  // Derived Values - Cash Session Tab
  const expectedClosingBalance = useMemo(() => {
    if (!activeSession) return 0;
    const start = Number(activeSession.opening_balance || 0);
    const adds = Number(activeSession.additions || 0);
    const subs = Number(activeSession.withdrawals || 0);
    // Calculated as: Initial cash + Cash Sales/Receipts + additions - withdrawals
    return start + sessionCashInflows + adds - subs;
  }, [activeSession, sessionCashInflows]);

  // Derived Values - Sales Period Tab
  const salesTotals = useMemo(() => {
    const totalSales = periodSales.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const count = periodSales.length;
    const avgTicket = count > 0 ? totalSales / count : 0;
    return { totalSales, count, avgTicket };
  }, [periodSales]);

  return (
    <div className="space-y-6 text-xs max-w-6xl animate-fade-in">
      <header className="flex justify-between items-center pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financeiro & Caixa</h1>
          <p className="text-muted-foreground text-sm">
            Demonstrativos de fluxo de caixa, controle de abertura/fechamento e relatórios de
            vendas.
          </p>
        </div>
        {activeTab === "fluxo" && (
          <Button
            onClick={() => setOpenAddTxModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
          >
            <PlusCircle className="h-4 w-4" /> Lanzar Movimento
          </Button>
        )}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="fluxo" className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            Fluxo de Caixa
          </TabsTrigger>
          <TabsTrigger value="caixa" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Abertura & Fechamento de Caixa
          </TabsTrigger>
          <TabsTrigger value="extrato" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Extrato de Vendas
          </TabsTrigger>
          <TabsTrigger value="cobranca" className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Cobrança
          </TabsTrigger>
        </TabsList>

        {/* ========================================================
            TAB 1: FLUXO DE CAIXA
            ======================================================== */}
        <TabsContent value="fluxo" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Receitas Totais
                  </span>
                  <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {totals.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-full">
                  <ArrowUpRight className="h-6 w-6 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Despesas Totais
                  </span>
                  <div className="text-2xl font-extrabold text-rose-600 mt-1">
                    {totals.despesa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-full">
                  <ArrowDownLeft className="h-6 w-6 text-rose-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Saldo Líquido
                  </span>
                  <div
                    className={`text-2xl font-extrabold mt-1 ${totals.net >= 0 ? "text-indigo-600" : "text-amber-600"}`}
                  >
                    {totals.net.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
                <div
                  className={`p-2.5 rounded-full ${totals.net >= 0 ? "bg-indigo-50" : "bg-amber-50"}`}
                >
                  <DollarSign
                    className={`h-6 w-6 ${totals.net >= 0 ? "text-indigo-600" : "text-amber-600"}`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Extrato Geral de Caixa
              </CardTitle>
              <CardDescription>Movimentação consolidada de receitas e despesas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por descrição ou categoria…"
                    className="pl-9 h-9"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={txTypeFilter}
                  onValueChange={(val) => setTxTypeFilter(val as "todos" | "receita" | "despesa")}
                >
                  <SelectTrigger className="w-full sm:w-48 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Lançamentos</SelectItem>
                    <SelectItem value="receita">Apenas Receitas (Entradas)</SelectItem>
                    <SelectItem value="despesa">Apenas Despesas (Saídas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border overflow-x-auto bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTx ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          Carregando transações…
                        </TableCell>
                      </TableRow>
                    ) : filteredTx.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          Nenhuma transação encontrada no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTx.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800">
                            {tx.description}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`capitalize ${tx.category === "estorno_recebimento" ? "border-destructive text-destructive" : ""}`}
                            >
                              {categoryLabel(tx.category)}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.payment_method}</TableCell>
                          <TableCell
                            className={`text-right font-bold ${tx.type === "receita" ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {tx.type === "receita" ? "+" : "-"}
                            {Number(tx.amount).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================
            TAB 2: ABERTURA E FECHAMENTO DE CAIXA
            ======================================================== */}
        <TabsContent value="caixa" className="space-y-6">
          {isLoadingSession ? (
            <div className="text-center py-12 text-muted-foreground flex justify-center items-center gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              Verificando sessões de caixa…
            </div>
          ) : !activeSession ? (
            // CAIXA FECHADO
            <Card className="shadow-sm max-w-xl mx-auto border-amber-200">
              <CardHeader className="pb-3 bg-amber-50/50 border-b border-amber-100">
                <CardTitle className="text-base font-bold text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />O Caixa do Sistema está FECHADO
                </CardTitle>
                <CardDescription className="text-amber-700/80">
                  Para começar a operar, registrar suprimentos, sangrias ou vendas físicas, inicie o
                  caixa do dia.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="opening-bal">Fundo de Troco (Saldo Inicial em Dinheiro)</Label>
                  <Input
                    id="opening-bal"
                    type="number"
                    placeholder="R$ 0,00"
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening-notes">Observações do Turno</Label>
                  <Textarea
                    id="opening-notes"
                    placeholder="Ex: Turno da manhã, troco em moedas..."
                    rows={2}
                    value={openingNotesInput}
                    onChange={(e) => setOpeningNotesInput(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() =>
                    openSessionMutation.mutate({
                      balance: Number(openingBalanceInput || 0),
                      notes: openingNotesInput,
                    })
                  }
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  disabled={openSessionMutation.isPending}
                >
                  {openSessionMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  )}
                  Iniciar Sessão e Abrir Caixa
                </Button>
              </CardContent>
            </Card>
          ) : (
            // CAIXA ABERTO
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-sm border-emerald-200 bg-emerald-50/10">
                  <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 flex flex-row items-center justify-between py-3">
                    <div>
                      <CardTitle className="text-base font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        Caixa Ativo (Aberto)
                      </CardTitle>
                      <CardDescription className="text-emerald-700/80">
                        Sessão de caixa ativa para lançamentos de entrada e saída.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block">Operador Responsável</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {activeSession.opened_by_profile?.full_name || "Operador"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block">Iniciado em</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {new Date(activeSession.opened_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block">Fundo de Troco Inicial</span>
                      <span className="text-sm font-bold text-slate-800">
                        {Number(activeSession.opening_balance).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                    <div className="space-y-1 border-t pt-2">
                      <span className="text-slate-500 font-bold block">Aportes (Suprimentos)</span>
                      <span className="text-sm font-bold text-emerald-600">
                        +
                        {Number(activeSession.additions).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                    <div className="space-y-1 border-t pt-2">
                      <span className="text-slate-500 font-bold block">Retiradas (Sangrias)</span>
                      <span className="text-sm font-bold text-rose-600">
                        -
                        {Number(activeSession.withdrawals).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                    <div className="space-y-1 border-t pt-2">
                      <span className="text-slate-500 font-bold block">
                        Vendas Dinheiro no Turno
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        +
                        {sessionCashInflows.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setOpenAdjustmentModal("suprimento")}
                    variant="outline"
                    className="flex-1 h-12 text-slate-700 bg-white border-slate-300 font-bold hover:bg-slate-50"
                  >
                    <ArrowUpRight className="h-4 w-4 text-emerald-600 mr-1.5" />
                    Registrar Suprimento (Aporte)
                  </Button>
                  <Button
                    onClick={() => setOpenAdjustmentModal("sangria")}
                    variant="outline"
                    className="flex-1 h-12 text-slate-700 bg-white border-slate-300 font-bold hover:bg-slate-50"
                  >
                    <ArrowDownLeft className="h-4 w-4 text-rose-600 mr-1.5" />
                    Registrar Sangria (Retirada)
                  </Button>
                </div>
              </div>

              {/* BARRA LATERAL FECHAMENTO */}
              <div className="space-y-6">
                <Card className="shadow-sm border-indigo-200">
                  <CardHeader className="pb-3 bg-indigo-50/50">
                    <CardTitle className="text-base font-bold text-indigo-900">
                      Saldo Estimado do Caixa
                    </CardTitle>
                    <CardDescription>
                      Total físico esperado atualmente na gaveta em dinheiro.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="text-3xl font-extrabold text-indigo-600 text-center py-2 bg-indigo-50/30 rounded-lg">
                      {expectedClosingBalance.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </div>
                    <Button
                      onClick={() => setOpenCloseSessionModal(true)}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-10"
                    >
                      Fechar Caixa do Turno
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ========================================================
            TAB 3: EXTRATO DE VENDAS
            ======================================================== */}
        <TabsContent value="extrato" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Faturamento Período
                  </span>
                  <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                    {salesTotals.totalSales.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>
                <div className="p-2.5 bg-indigo-50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Vendas Concluídas
                  </span>
                  <div className="text-2xl font-extrabold text-slate-800 mt-1">
                    {salesTotals.count}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-full">
                  <Coins className="h-6 w-6 text-slate-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Ticket Médio
                  </span>
                  <div className="text-2xl font-extrabold text-slate-800 mt-1">
                    {salesTotals.avgTicket.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-full">
                  <DollarSign className="h-6 w-6 text-slate-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Extrato e Vendas Realizadas
              </CardTitle>
              <CardDescription>
                Consulte e extraia os relatórios de contratos firmados no período selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                <div className="space-y-1">
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data de Fim</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Parcelas</TableHead>
                      <TableHead>Situação Pgto.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingSales ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          Processando extratos de faturamento…
                        </TableCell>
                      </TableRow>
                    ) : periodSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          Nenhum faturamento de venda encontrado no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      periodSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-semibold text-slate-800">
                            #{sale.order_number}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>{sale.customers?.name || "—"}</TableCell>
                          <TableCell className="text-right">{sale.installments || 1}x</TableCell>
                          <TableCell>
                            <Badge
                              variant={sale.payment_status === "Pago" ? "default" : "secondary"}
                              className={
                                sale.payment_status === "Pago"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : ""
                              }
                            >
                              {sale.payment_status === "Pago" ? "Quitado" : "Aberto"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900">
                            {Number(sale.total_amount).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================
            TAB 4: COBRANÇA
            ======================================================== */}
        <TabsContent value="cobranca" className="space-y-6">
          <CobrancaPanel />
        </TabsContent>
      </Tabs>

      {/* ========================================================
          MODAIS E DIALOGS
          ======================================================== */}

      {/* DIALOG: LANÇAMENTO MANUAL (RECEITA / DESPESA) */}
      <Dialog open={openAddTxModal} onOpenChange={setOpenAddTxModal}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle>Lançar Movimento de Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo de Lançamento</Label>
                <Select
                  value={newTx.type}
                  onValueChange={(val) =>
                    setNewTx({ ...newTx, type: val as "receita" | "despesa" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Entrada (Receita)</SelectItem>
                    <SelectItem value="despesa">Saída (Despesa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select
                  value={newTx.category}
                  onValueChange={(val) => setNewTx({ ...newTx, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {newTx.type === "receita" ? (
                      <>
                        <SelectItem value="venda">Venda</SelectItem>
                        <SelectItem value="outros">Outras Receitas</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="fornecedores">Fornecedores</SelectItem>
                        <SelectItem value="salário">Salários / Folha</SelectItem>
                        <SelectItem value="aluguel">Aluguel / Despesas Fixas</SelectItem>
                        <SelectItem value="impostos">Impostos</SelectItem>
                        <SelectItem value="outros">Outras Despesas</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={newTx.payment_method}
                  onValueChange={(val) => setNewTx({ ...newTx, payment_method: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem>
                    <SelectItem value="Cartão de débito">Cartão de débito</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Transferência bancária">Transferência bancária</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Data do Lançamento</Label>
              <Input
                type="date"
                value={newTx.date}
                onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>Descrição / Histórico</Label>
              <Input
                placeholder="Ex: Compra de embalagens de papelão..."
                value={newTx.description}
                onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddTxModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addTransactionMutation.mutate(newTx)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              disabled={addTransactionMutation.isPending || !newTx.amount || !newTx.description}
            >
              {addTransactionMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              Confirmar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: AJUSTE DE CAIXA (SUPRIMENTO / SANGRIA) */}
      <Dialog
        open={openAdjustmentModal !== null}
        onOpenChange={(open) => {
          if (!open) setOpenAdjustmentModal(null);
        }}
      >
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="capitalize">
              Lançar {openAdjustmentModal === "suprimento" ? "Aporte" : "Retirada"} (
              {openAdjustmentModal})
            </DialogTitle>
            <DialogDescription>
              Insira o movimento de ajuste no caixa físico da gaveta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Valor da Operação (R$)</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Motivo / Observações</Label>
              <Textarea
                placeholder="Descreva a finalidade..."
                rows={2}
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdjustmentModal(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (openAdjustmentModal) {
                  adjustSessionMutation.mutate({
                    type: openAdjustmentModal,
                    amount: Number(adjustmentAmount),
                    notes: adjustmentNotes,
                  });
                }
              }}
              className={
                openAdjustmentModal === "suprimento"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  : "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              }
              disabled={adjustSessionMutation.isPending || !adjustmentAmount}
            >
              {adjustSessionMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              Confirmar Operação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: FECHAR CAIXA */}
      <Dialog open={openCloseSessionModal} onOpenChange={setOpenCloseSessionModal}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle>Fechar Caixa do Turno</DialogTitle>
            <DialogDescription>
              Informe o valor físico total de dinheiro contado atualmente na gaveta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-4 rounded-md border space-y-2">
              <div className="flex justify-between border-b pb-1.5 text-slate-500 font-bold">
                <span>Saldo Inicial:</span>
                <span className="text-slate-800">
                  {Number(activeSession?.opening_balance || 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5 text-slate-500 font-bold">
                <span>Vendas em Dinheiro:</span>
                <span className="text-slate-800">
                  +
                  {sessionCashInflows.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5 text-slate-500 font-bold">
                <span>Aportes/Retiradas:</span>
                <span className="text-slate-800">
                  +
                  {Number(
                    (activeSession?.additions || 0) - (activeSession?.withdrawals || 0),
                  ).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-indigo-900 pt-1">
                <span>Saldo Esperado em Caixa:</span>
                <span>
                  {expectedClosingBalance.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="actual-bal">Saldo Físico Contado na Gaveta</Label>
              <Input
                id="actual-bal"
                type="number"
                placeholder="R$ 0,00"
                value={actualClosingBalance}
                onChange={(e) => setActualClosingBalance(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCloseSessionModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                closeSessionMutation.mutate({
                  actual: Number(actualClosingBalance || 0),
                  expected: expectedClosingBalance,
                });
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              disabled={closeSessionMutation.isPending || !actualClosingBalance}
            >
              {closeSessionMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              Fechar Caixa e Emitir Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
