import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Printer } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import {
  groupInstallmentsByOrder,
  useCobrancaInstallments,
  useCobrancaRecebimentosPeriodo,
  type CobrancaOrderGroup,
} from "@/hooks/useCobranca";
import { CobrancaTable } from "@/components/cobranca/CobrancaTable";
import { OrderDrawer } from "@/components/cobranca/OrderDrawer";
import {
  PAYMENT_METHODS,
  atrasoBucket,
  formatCurrencyBRL,
  formatDateBR,
  onlyDigits,
  paymentMethodLabel,
  round2,
  situacaoLabel,
  situacaoParcela,
} from "@/lib/cobranca";

const SITUACAO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "a_vencer", label: "A vencer" },
  { value: "vencida", label: "Vencidas" },
  { value: "parcial", label: "Parcialmente pagas" },
  { value: "quitada", label: "Quitadas" },
];

const ATRASO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "1-30", label: "1 a 30 dias" },
  { value: "31-60", label: "31 a 60 dias" },
  { value: "61-90", label: "61 a 90 dias" },
  { value: "90+", label: "Mais de 90 dias" },
];

const RECEIVE_ROLES = ["admin", "gerente", "financeiro", "vendedor"];
const CANCEL_ROLES = ["admin", "gerente", "financeiro"];

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" | "warning" }) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "success"
        ? "text-success"
        : tone === "warning"
          ? "text-warning"
          : "text-foreground";
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold mt-1 ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function CobrancaPanel() {
  const { data: profile } = useProfile();
  const role = profile?.role as string | undefined;
  const canReceivePayment = !role || RECEIVE_ROLES.includes(role);
  const canCancelPayment = !!role && CANCEL_ROLES.includes(role);

  const { data: installments = [], isLoading, error, isError } = useCobrancaInstallments();
  const { data: periodo } = useCobrancaRecebimentosPeriodo();

  const [clienteSearch, setClienteSearch] = useState("");
  const [localizacaoSearch, setLocalizacaoSearch] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [situacaoFiltro, setSituacaoFiltro] = useState("todos");
  const [atrasoFiltro, setAtrasoFiltro] = useState("todos");
  const [formaRecebimento, setFormaRecebimento] = useState("todos");

  // Guarda só o id da venda selecionada — o objeto do grupo em si é
  // recalculado a cada render a partir dos dados vivos (abaixo), pra nunca
  // ficar "congelado" no valor de quando o drawer foi aberto (senão, depois
  // de uma baixa parcial, o drawer continuaria mostrando o saldo antigo até
  // fechar e abrir de novo).
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // KPIs continuam calculados por PARCELA (não por venda) — "Parcelas
  // vencidas"/"a vencer" contam parcelas individuais, não vendas.
  const enriched = useMemo(
    () =>
      installments.map((row) => {
        const saldo = round2(row.amount - row.amount_paid);
        return {
          row,
          saldo,
          situacao: situacaoParcela({ amount: row.amount, amountPaid: row.amount_paid, dueDate: row.due_date }),
        };
      }),
    [installments],
  );

  const kpis = useMemo(() => {
    let totalAReceber = 0;
    let vencidas = 0;
    let aVencer = 0;
    let valorEmAtraso = 0;
    let valorParcial = 0;
    const clientesInadimplentes = new Set<string>();

    for (const { row, saldo, situacao } of enriched) {
      if (saldo > 0) totalAReceber += saldo;
      if (situacao === "vencida") {
        vencidas++;
        valorEmAtraso += saldo;
        if (row.orders.customer_id) clientesInadimplentes.add(row.orders.customer_id);
      }
      if (situacao === "a_vencer" || situacao === "vence_em_breve") aVencer++;
      if (situacao === "parcial") valorParcial += row.amount_paid;
    }

    return {
      totalAReceber,
      vencidas,
      aVencer,
      valorEmAtraso,
      valorParcial,
      clientesInadimplentes: clientesInadimplentes.size,
    };
  }, [enriched]);

  // Tabela: 1 linha por venda — evita repetir cliente/telefone/etc. a cada
  // parcela da mesma venda. Filtros são aplicados no nível da venda
  // (agregado), mantendo todas as parcelas dentro do grupo intactas para o
  // drawer (senão perderíamos parcelas "fora do filtro" que o usuário
  // precisa ver ao abrir a venda).
  const groups = useMemo(() => groupInstallmentsByOrder(installments), [installments]);

  const filteredGroups = useMemo(() => {
    const clienteQ = clienteSearch.trim().toLowerCase();
    const clienteDigits = onlyDigits(clienteSearch);
    const localQ = localizacaoSearch.trim().toLowerCase();

    return groups.filter((g) => {
      if (clienteQ) {
        const c = g.customer;
        const matchesText = c?.name?.toLowerCase().includes(clienteQ);
        const matchesDigits =
          clienteDigits.length >= 3 &&
          (onlyDigits(c?.cpf_cnpj).includes(clienteDigits) ||
            onlyDigits(c?.phone).includes(clienteDigits) ||
            onlyDigits(c?.whatsapp).includes(clienteDigits));
        if (!matchesText && !matchesDigits) return false;
      }
      if (localQ) {
        const addr = g.customer?.customer_addresses?.[0];
        const matches =
          addr?.city?.toLowerCase().includes(localQ) || addr?.neighborhood?.toLowerCase().includes(localQ);
        if (!matches) return false;
      }
      if (dataInicial && g.created_at < `${dataInicial}T00:00:00`) return false;
      if (dataFinal && g.created_at > `${dataFinal}T23:59:59`) return false;
      if (situacaoFiltro !== "todos" && g.situacao !== situacaoFiltro) return false;
      if (atrasoFiltro !== "todos" && atrasoBucket(g.max_dias_atraso) !== atrasoFiltro) return false;
      if (formaRecebimento !== "todos" && !g.installments.some((i) => i.payment_method === formaRecebimento))
        return false;
      return true;
    });
  }, [
    groups,
    clienteSearch,
    localizacaoSearch,
    dataInicial,
    dataFinal,
    situacaoFiltro,
    atrasoFiltro,
    formaRecebimento,
  ]);

  // Deriva o grupo aberto no drawer a partir do array vivo (não filtrado,
  // pra continuar mostrando a venda mesmo que ela deixe de bater com o
  // filtro depois de uma baixa) — sempre reflete o último refetch.
  const selectedGroup = useMemo(
    () => (selectedOrderId ? (groups.find((g) => g.order_id === selectedOrderId) ?? null) : null),
    [groups, selectedOrderId],
  );

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (clienteSearch.trim()) parts.push(`Cliente: "${clienteSearch.trim()}"`);
    if (localizacaoSearch.trim()) parts.push(`Localização: "${localizacaoSearch.trim()}"`);
    if (dataInicial) parts.push(`Compra de ${formatDateBR(dataInicial)}`);
    if (dataFinal) parts.push(`até ${formatDateBR(dataFinal)}`);
    if (situacaoFiltro !== "todos")
      parts.push(`Situação: ${SITUACAO_OPTIONS.find((o) => o.value === situacaoFiltro)?.label}`);
    if (atrasoFiltro !== "todos")
      parts.push(`Atraso: ${ATRASO_OPTIONS.find((o) => o.value === atrasoFiltro)?.label}`);
    if (formaRecebimento !== "todos")
      parts.push(`Recebimento: ${paymentMethodLabel(formaRecebimento)}`);
    return parts.length > 0 ? parts.join(" · ") : "Todas as vendas parceladas, sem filtro aplicado";
  }, [clienteSearch, localizacaoSearch, dataInicial, dataFinal, situacaoFiltro, atrasoFiltro, formaRecebimento]);

  const generatedAt = useMemo(
    () => new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
    [],
  );

  return (
    <div className="space-y-6 cobranca-print-container">
      <style>{`
        @page { size: A4 landscape; margin: 12mm; }
        @media print {
          html, body, main {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          /* Cada botão de imprimir marca body[data-print-target] antes de
             chamar window.print(), pra só a área certa aparecer — evita que
             o painel e o drawer de uma venda se misturem na impressão. */
          body * { visibility: hidden !important; }
          body[data-print-target="painel"] .cobranca-print-container,
          body[data-print-target="painel"] .cobranca-print-container * {
            visibility: visible !important;
          }
          .cobranca-print-container {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          table.print-only { display: table !important; }
        }
      `}</style>

      <div className="print-only hidden pb-3 mb-2 border-b">
        <h1 className="text-xl font-bold">
          {(profile as any)?.organizations?.name || "StockFlow Gestão"} — Relatório de Cobrança
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Filtros: {filterSummary}</p>
        <p className="text-xs text-muted-foreground">Gerado em {generatedAt}</p>
      </div>

      <div className="flex items-center justify-between no-print">
        <div />
        <Button
          variant="outline"
          onClick={() => {
            document.body.setAttribute("data-print-target", "painel");
            window.print();
          }}
        >
          <Printer className="mr-1.5 h-4 w-4" /> Imprimir / PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        <KpiCard label="Total a receber" value={formatCurrencyBRL(kpis.totalAReceber)} />
        <KpiCard label="Recebido hoje" value={formatCurrencyBRL(periodo?.recebidoHoje ?? 0)} tone="success" />
        <KpiCard label="Recebido no mês" value={formatCurrencyBRL(periodo?.recebidoNoMes ?? 0)} tone="success" />
        <KpiCard label="Parcelas vencidas" value={String(kpis.vencidas)} tone="danger" />
        <KpiCard label="Parcelas a vencer" value={String(kpis.aVencer)} tone="warning" />
        <KpiCard label="Clientes inadimplentes" value={String(kpis.clientesInadimplentes)} tone="danger" />
        <KpiCard label="Valor em atraso" value={formatCurrencyBRL(kpis.valorEmAtraso)} tone="danger" />
        <KpiCard label="Valor parcialmente recebido" value={formatCurrencyBRL(kpis.valorParcial)} />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 no-print">
            <div className="space-y-1">
              <Label>Cliente (nome, CPF ou telefone)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={clienteSearch}
                  onChange={(e) => setClienteSearch(e.target.value)}
                  placeholder="Buscar cliente…"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Localização (cidade ou bairro)</Label>
              <Input value={localizacaoSearch} onChange={(e) => setLocalizacaoSearch(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Compra — data inicial</Label>
              <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Compra — data final</Label>
              <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Situação</Label>
              <Select value={situacaoFiltro} onValueChange={setSituacaoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITUACAO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Dias em atraso</Label>
              <Select value={atrasoFiltro} onValueChange={setAtrasoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATRASO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Forma de recebimento</Label>
              <Select value={formaRecebimento} onValueChange={setFormaRecebimento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isError ? (
            <p className="text-center py-8 text-destructive">
              Erro ao carregar parcelas: {(error as any)?.message ?? "erro desconhecido"}
            </p>
          ) : isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando…</p>
          ) : (
            <>
              {/* Tabela interativa (paginada) — some na impressão, pois só mostraria a página atual. */}
              <div className="no-print">
                <CobrancaTable
                  rows={filteredGroups}
                  onRowClick={(group) => {
                    setSelectedOrderId(group.order_id);
                    setDrawerOpen(true);
                  }}
                />
              </div>

              {/* Versão simples e completa (todas as vendas filtradas, sem paginação) só para impressão/PDF. */}
              <table className="print-only hidden w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-left py-1 pr-2">Cliente</th>
                    <th className="text-left py-1 pr-2">Cidade/Bairro</th>
                    <th className="text-left py-1 pr-2">Telefone</th>
                    <th className="text-left py-1 pr-2">Nº Venda</th>
                    <th className="text-left py-1 pr-2">Data Compra</th>
                    <th className="text-right py-1 pr-2">Valor Total</th>
                    <th className="text-left py-1 pr-2">Parcelas</th>
                    <th className="text-right py-1 pr-2">Pago</th>
                    <th className="text-right py-1 pr-2">Saldo</th>
                    <th className="text-left py-1 pr-2">Próx. Vencimento</th>
                    <th className="text-left py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((g) => {
                    const addr = g.customer?.customer_addresses?.[0];
                    return (
                      <tr key={g.order_id} className="border-b">
                        <td className="py-1 pr-2">{g.customer?.name ?? "—"}</td>
                        <td className="py-1 pr-2">
                          {addr?.city ?? "—"}/{addr?.neighborhood ?? "—"}
                        </td>
                        <td className="py-1 pr-2">{g.customer?.whatsapp || g.customer?.phone || "—"}</td>
                        <td className="py-1 pr-2">{g.order_number}</td>
                        <td className="py-1 pr-2">{formatDateBR(g.created_at)}</td>
                        <td className="text-right py-1 pr-2">{formatCurrencyBRL(g.total_amount)}</td>
                        <td className="py-1 pr-2">
                          {g.paid_count} de {g.installments_count}
                        </td>
                        <td className="text-right py-1 pr-2">{formatCurrencyBRL(g.total_paid)}</td>
                        <td className="text-right py-1 pr-2">{formatCurrencyBRL(g.total_saldo)}</td>
                        <td className="py-1 pr-2">
                          {g.next_due_date ? formatDateBR(g.next_due_date) : "Quitado"}
                        </td>
                        <td className="py-1">{situacaoLabel(g.situacao)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>

      <p className="print-only hidden mt-4 pt-2 border-t text-[10px] text-muted-foreground">
        {(profile as any)?.organizations?.name || "StockFlow Gestão"} · Relatório de Cobrança gerado em{" "}
        {generatedAt} · {filteredGroups.length} venda(s) no filtro
      </p>

      <OrderDrawer
        group={selectedGroup}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        canCancelPayment={canCancelPayment}
        canReceivePayment={canReceivePayment}
        organizationName={(profile as any)?.organizations?.name}
      />
    </div>
  );
}
