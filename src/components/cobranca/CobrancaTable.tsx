import { useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
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
import { ArrowUpDown, ChevronLeft, ChevronRight, Package as PackageIcon } from "lucide-react";
import {
  diasEmAtraso,
  formatCurrencyBRL,
  formatDateBR,
  situacaoBadgeClass,
  situacaoLabel,
  situacaoParcela,
  situacaoRowClass,
  round2,
} from "@/lib/cobranca";
import type { CobrancaInstallmentRow } from "@/hooks/useCobranca";

interface Props {
  rows: CobrancaInstallmentRow[];
  onRowClick: (row: CobrancaInstallmentRow) => void;
}

export function CobrancaTable({ rows, onRowClick }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "due_date", desc: false }]);

  const columns = useMemo<ColumnDef<CobrancaInstallmentRow>[]>(
    () => [
      {
        id: "cliente",
        header: "Cliente",
        accessorFn: (r) => r.orders.customers?.name ?? "",
        cell: ({ row }) => {
          const c = row.original.orders.customers;
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{c?.name ?? "—"}</span>
              {c?.is_deleted && (
                <Badge variant="outline" className="text-xs">
                  Inativo
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "cidade",
        header: "Cidade",
        accessorFn: (r) => {
          const addr = r.orders.customers?.customer_addresses ?? [];
          return addr[0]?.city ?? "";
        },
        cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || "—"}</span>,
      },
      {
        id: "bairro",
        header: "Bairro",
        accessorFn: (r) => {
          const addr = r.orders.customers?.customer_addresses ?? [];
          return addr[0]?.neighborhood ?? "";
        },
        cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || "—"}</span>,
      },
      {
        id: "telefone",
        header: "Telefone",
        accessorFn: (r) => r.orders.customers?.whatsapp || r.orders.customers?.phone || "",
        cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || "—"}</span>,
      },
      {
        id: "order_number",
        header: "Nº da Venda",
        accessorFn: (r) => r.orders.order_number,
      },
      {
        id: "data_compra",
        header: "Data da Compra",
        accessorFn: (r) => r.orders.created_at,
        cell: ({ getValue }) => formatDateBR(getValue() as string),
      },
      {
        id: "valor_total",
        header: () => <div className="text-right">Valor Total</div>,
        accessorFn: (r) => r.orders.total_amount,
        cell: ({ getValue }) => (
          <div className="text-right">{formatCurrencyBRL(getValue() as number)}</div>
        ),
      },
      {
        id: "parcela",
        header: "Parcela",
        accessorFn: (r) => r.installment_number,
        cell: ({ row }) => `${row.original.installment_number}/${row.original.orders.installments}`,
      },
      {
        id: "valor_parcela",
        header: () => <div className="text-right">Valor da Parcela</div>,
        accessorFn: (r) => r.amount,
        cell: ({ getValue }) => (
          <div className="text-right">{formatCurrencyBRL(getValue() as number)}</div>
        ),
      },
      {
        id: "valor_pago",
        header: () => <div className="text-right">Valor Pago</div>,
        accessorFn: (r) => r.amount_paid,
        cell: ({ getValue }) => (
          <div className="text-right">{formatCurrencyBRL(getValue() as number)}</div>
        ),
      },
      {
        id: "saldo",
        header: () => <div className="text-right">Saldo</div>,
        accessorFn: (r) => round2(r.amount - r.amount_paid),
        cell: ({ getValue }) => (
          <div className="text-right font-medium">{formatCurrencyBRL(getValue() as number)}</div>
        ),
      },
      {
        id: "vencimento",
        header: "Vencimento",
        accessorFn: (r) => r.due_date,
        cell: ({ getValue }) => formatDateBR(getValue() as string),
      },
      {
        id: "dias_atraso",
        header: () => <div className="text-right">Dias em Atraso</div>,
        accessorFn: (r) => diasEmAtraso(r.due_date, round2(r.amount - r.amount_paid)),
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
        accessorFn: (r) => situacaoParcela({ amount: r.amount, amountPaid: r.amount_paid, dueDate: r.due_date }),
        cell: ({ getValue }) => {
          const situacao = getValue() as ReturnType<typeof situacaoParcela>;
          return <Badge className={situacaoBadgeClass(situacao)}>{situacaoLabel(situacao)}</Badge>;
        },
      },
      {
        id: "acoes",
        header: () => <div className="text-right">Ações</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button size="sm" variant="outline" onClick={() => onRowClick(row.original)}>
              Ver / Receber
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="flex items-center gap-1 select-none"
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!header.column.getCanSort()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && <ArrowUpDown className="h-3 w-3 opacity-50" />}
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
                  Nenhuma parcela encontrada com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const situacao = situacaoParcela({
                  amount: row.original.amount,
                  amountPaid: row.original.amount_paid,
                  dueDate: row.original.due_date,
                });
                return (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer ${situacaoRowClass(situacao)}`}
                    onClick={() => onRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} onClick={(e) => cell.column.id === "acoes" && e.stopPropagation()}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)} —{" "}
          {rows.length} parcela(s)
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
