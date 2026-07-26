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
  formatCurrencyBRL,
  formatDateBR,
  situacaoBadgeClass,
  situacaoLabel,
  type SituacaoParcela,
} from "@/lib/cobranca";
import type { CobrancaOrderGroup } from "@/hooks/useCobranca";

interface Props {
  rows: CobrancaOrderGroup[];
  onRowClick: (row: CobrancaOrderGroup) => void;
}

export function CobrancaTable({ rows, onRowClick }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "vencimento", desc: false }]);

  const columns = useMemo<ColumnDef<CobrancaOrderGroup>[]>(
    () => [
      {
        id: "cliente",
        header: "Cliente",
        accessorFn: (r) => r.customer?.name ?? "",
        cell: ({ row }) => {
          const c = row.original.customer;
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
        accessorFn: (r) => r.customer?.customer_addresses?.[0]?.city ?? "",
        cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || "—"}</span>,
      },
      {
        id: "bairro",
        header: "Bairro",
        accessorFn: (r) => r.customer?.customer_addresses?.[0]?.neighborhood ?? "",
        cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || "—"}</span>,
      },
      {
        id: "telefone",
        header: "Telefone",
        accessorFn: (r) => r.customer?.whatsapp || r.customer?.phone || "",
        cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || "—"}</span>,
      },
      {
        id: "order_number",
        header: "Nº da Venda",
        accessorFn: (r) => r.order_number,
      },
      {
        id: "data_compra",
        header: "Data da Compra",
        accessorFn: (r) => r.created_at,
        cell: ({ getValue }) => formatDateBR(getValue() as string),
      },
      {
        id: "valor_total",
        header: () => <div className="text-right">Valor Total</div>,
        accessorFn: (r) => r.total_amount,
        cell: ({ getValue }) => (
          <div className="text-right">{formatCurrencyBRL(getValue() as number)}</div>
        ),
      },
      {
        id: "parcelas",
        header: "Parcelas",
        accessorFn: (r) => r.paid_count,
        cell: ({ row }) => `${row.original.paid_count} de ${row.original.installments_count} pagas`,
      },
      {
        id: "valor_pago",
        header: () => <div className="text-right">Valor Pago</div>,
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
        header: "Próximo Vencimento",
        accessorFn: (r) => r.next_due_date ?? "",
        cell: ({ getValue }) => {
          const v = getValue() as string;
          return v ? formatDateBR(v) : "Quitado";
        },
      },
      {
        id: "dias_atraso",
        header: () => <div className="text-right">Dias em Atraso</div>,
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
                  Nenhuma venda parcelada encontrada com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(e) => cell.column.id === "acoes" && e.stopPropagation()}>
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
          {rows.length} venda(s)
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
