import { useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package as PackageIcon,
} from "lucide-react";
import {
  formatCurrencyBRL,
  formatDateBR,
  round2,
  situacaoBadgeClass,
  situacaoLabel,
  worseSituacao,
  type SituacaoParcela,
} from "@/lib/cobranca";
import type { CobrancaOrderGroup } from "@/hooks/useCobranca";

interface Props {
  rows: CobrancaOrderGroup[];
  onRowClick: (row: CobrancaOrderGroup) => void;
}

// Linha da tabela: uma venda, ou (quando o cliente tem mais de uma venda no
// filtro) o cliente com os totais somados e as vendas como sub-linhas.
type Linha = CobrancaOrderGroup & { salesCount?: number; subRows?: Linha[] };

// "2x Fruteira grande, 1x Rede" — produtos da venda (ou de todas as vendas do
// cliente, na linha agrupada).
export function produtosDaVenda(g: CobrancaOrderGroup): string {
  const orders = new Map(g.installments.map((i) => [i.order_id, i.orders]));
  return Array.from(orders.values())
    .flatMap((o) => o.order_items ?? [])
    .map((it) => `${it.quantity}x ${it.products?.name ?? "Produto removido"}`)
    .join(", ");
}

function groupByCustomer(rows: CobrancaOrderGroup[]): Linha[] {
  const byCustomer = new Map<string, CobrancaOrderGroup[]>();
  for (const r of rows) {
    const key = r.customer?.id ?? `venda:${r.order_id}`;
    const list = byCustomer.get(key);
    if (list) list.push(r);
    else byCustomer.set(key, [r]);
  }

  const result: Linha[] = [];
  for (const [key, orders] of byCustomer) {
    if (orders.length === 1) {
      result.push(orders[0]);
      continue;
    }
    const sorted = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
    let nextDue: string | null = null;
    let situacao: SituacaoParcela = "quitada";
    for (const o of sorted) {
      situacao = worseSituacao(situacao, o.situacao);
      if (o.next_due_date && (!nextDue || o.next_due_date < nextDue)) nextDue = o.next_due_date;
    }
    result.push({
      order_id: `cliente:${key}`,
      order_number: `${sorted.length} vendas`,
      created_at: sorted[0].created_at,
      total_amount: round2(sorted.reduce((s, o) => s + Number(o.total_amount || 0), 0)),
      installments_count: sorted.reduce((s, o) => s + Number(o.installments_count || 0), 0),
      paid_count: sorted.reduce((s, o) => s + o.paid_count, 0),
      total_paid: round2(sorted.reduce((s, o) => s + o.total_paid, 0)),
      total_saldo: round2(sorted.reduce((s, o) => s + o.total_saldo, 0)),
      next_due_date: nextDue,
      max_dias_atraso: Math.max(...sorted.map((o) => o.max_dias_atraso)),
      situacao,
      customer: sorted[0].customer,
      installments: sorted.flatMap((o) => o.installments),
      salesCount: sorted.length,
      subRows: sorted,
    });
  }
  return result;
}

// Célula compacta — reduz padding/fonte pra caber todas as colunas sem
// precisar de barra de rolagem horizontal na maioria das telas.
const CELL = "px-1.5 py-1.5 text-xs";

export function CobrancaTable({ rows, onRowClick }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "vencimento", desc: false }]);

  const data = useMemo(() => groupByCustomer(rows), [rows]);

  const columns = useMemo<ColumnDef<Linha>[]>(
    () => [
      {
        id: "cliente",
        header: "Cliente",
        accessorFn: (r) => r.customer?.name ?? "",
        cell: ({ row }) => {
          const c = row.original.customer;
          if (row.depth > 0) {
            return <span className="pl-5 text-muted-foreground">↳ venda</span>;
          }
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              {row.getCanExpand() &&
                (row.getIsExpanded() ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                ))}
              <span className="font-medium truncate">{c?.name ?? "—"}</span>
              {c?.is_deleted && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  Inativo
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "local",
        header: "Cidade/Bairro",
        accessorFn: (r) => {
          const addr = r.customer?.customer_addresses?.[0];
          return `${addr?.city ?? ""} ${addr?.neighborhood ?? ""}`.trim();
        },
        cell: ({ row }) => {
          const addr = row.original.customer?.customer_addresses?.[0];
          return (
            <span className="truncate block max-w-[9rem]">
              {addr?.city || "—"}/{addr?.neighborhood || "—"}
            </span>
          );
        },
      },
      {
        id: "telefone",
        header: "Telefone",
        accessorFn: (r) => r.customer?.whatsapp || r.customer?.phone || "",
        cell: ({ getValue }) => <span>{(getValue() as string) || "—"}</span>,
      },
      {
        id: "order_number",
        header: "Nº Venda",
        accessorFn: (r) => r.order_number,
      },
      {
        id: "produtos",
        header: "Produto(s)",
        accessorFn: (r) => produtosDaVenda(r),
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return (
            <span className="block max-w-[12rem] truncate" title={v}>
              {v || "—"}
            </span>
          );
        },
      },
      {
        id: "data_compra",
        header: "Compra",
        accessorFn: (r) => r.created_at,
        cell: ({ getValue }) => formatDateBR(getValue() as string),
      },
      {
        id: "valor_total",
        header: () => <div className="text-right">Total</div>,
        accessorFn: (r) => r.total_amount,
        cell: ({ getValue }) => (
          <div className="text-right">{formatCurrencyBRL(getValue() as number)}</div>
        ),
      },
      {
        id: "parcelas",
        header: "Parcelas",
        accessorFn: (r) => r.paid_count,
        cell: ({ row }) => `${row.original.paid_count}/${row.original.installments_count} pagas`,
      },
      {
        id: "valor_pago",
        header: () => <div className="text-right">Pago</div>,
        accessorFn: (r) => r.total_paid,
        cell: ({ getValue }) => (
          <div className="text-right">{formatCurrencyBRL(getValue() as number)}</div>
        ),
      },
      {
        id: "saldo",
        header: () => <div className="text-right">Saldo</div>,
        accessorFn: (r) => r.total_saldo,
        cell: ({ getValue }) => (
          <div className="text-right font-medium">{formatCurrencyBRL(getValue() as number)}</div>
        ),
      },
      {
        id: "vencimento",
        header: "Vencimento",
        accessorFn: (r) => r.next_due_date ?? "",
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return v ? formatDateBR(v) : "Quitado";
        },
      },
      {
        id: "dias_atraso",
        header: () => <div className="text-right">Atraso</div>,
        accessorFn: (r) => r.max_dias_atraso,
        cell: ({ getValue }) => {
          const dias = getValue() as number;
          return (
            <div className="text-right">
              {dias > 0 ? <span className="text-destructive font-medium">{dias}</span> : "—"}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (r) => r.situacao,
        cell: ({ getValue }) => {
          const situacao = getValue() as SituacaoParcela;
          return (
            <Badge className={`${situacaoBadgeClass(situacao)} text-[10px] px-1.5 py-0`}>
              {situacaoLabel(situacao)}
            </Badge>
          );
        },
      },
      {
        id: "acoes",
        header: () => <div className="text-right">Ação</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={() => (row.getCanExpand() ? row.toggleExpanded() : onRowClick(row.original))}
            >
              {row.getCanExpand() ? (row.getIsExpanded() ? "Fechar" : "Abrir") : "Ver"}
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getSubRows: (r) => r.subRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // As vendas de um cliente ficam na mesma página que ele.
    paginateExpandedRows: false,
    autoResetExpanded: false,
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className={`${CELL} h-8 whitespace-nowrap`}>
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="flex items-center gap-1 select-none"
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!header.column.getCanSort()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  <PackageIcon className="mx-auto h-10 w-10 opacity-40 mb-2" />
                  Nenhuma venda parcelada encontrada com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`cursor-pointer ${row.getCanExpand() ? "bg-muted/40 font-medium" : ""} ${row.depth > 0 ? "bg-muted/10" : ""}`}
                  onClick={() => (row.getCanExpand() ? row.toggleExpanded() : onRowClick(row.original))}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={CELL}
                      onClick={(e) => cell.column.id === "acoes" && e.stopPropagation()}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)} —{" "}
          {data.length} cliente(s) · {rows.length} venda(s)
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
