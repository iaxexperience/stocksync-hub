import jsPDF from "jspdf";
import { formatCurrencyBRL, formatDateBR } from "@/lib/cobranca";

export interface AvariaReportRow {
  created_at: string;
  product_name: string;
  quantity: number;
  reason: string;
  notes: string | null;
  unit_cost: number;
}

const MARGIN = 14;
const HEADER_HEIGHT = 34;
const FOOTER_HEIGHT = 14;
const ROW_HEIGHT = 8;

const COLS = [
  { key: "data", label: "Data", width: 22, align: "left" as const },
  { key: "produto", label: "Produto", width: 62, align: "left" as const },
  { key: "qtd", label: "Qtd.", width: 16, align: "right" as const },
  { key: "motivo", label: "Motivo", width: 48, align: "left" as const },
  { key: "custoUnit", label: "Custo Unit.", width: 25, align: "right" as const },
  { key: "custoTotal", label: "Custo Total", width: 25, align: "right" as const },
];

/**
 * Relatório de Avarias — lista paginada em PDF com cabeçalho (nome da
 * organização, título, filtro aplicado) e rodapé (página X de Y, data de
 * geração) repetidos em toda página, seguindo o mesmo uso de jsPDF já
 * empregado em carne-pdf.ts.
 */
export function generateAvariasReportPDF(
  rows: AvariaReportRow[],
  organizationName: string,
  filterLabel: string,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = COLS.reduce((sum, c) => sum + c.width, 0);
  const tableLeft = (pageWidth - tableWidth) / 2;
  const generatedAt = new Date().toLocaleString("pt-BR");

  function drawHeader() {
    let y = 16;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(organizationName, pageWidth / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(11);
    doc.text("Relatório de Avarias", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(filterLabel, pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0);
    y += 5;
    doc.setDrawColor(180);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
  }

  function drawColumnHeaders(y: number) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    let x = tableLeft;
    for (const col of COLS) {
      doc.text(col.label, col.align === "right" ? x + col.width : x, y, {
        align: col.align,
      });
      x += col.width;
    }
    doc.setDrawColor(180);
    doc.line(tableLeft, y + 2, tableLeft + tableWidth, y + 2);
    doc.setFont("helvetica", "normal");
  }

  function drawFooter(pageNum: number, totalPages: number) {
    const y = pageHeight - 8;
    doc.setDrawColor(200);
    doc.line(MARGIN, y - 4, pageWidth - MARGIN, y - 4);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${generatedAt}`, MARGIN, y);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - MARGIN, y, { align: "right" });
    doc.setTextColor(0);
  }

  let y = HEADER_HEIGHT + 4;
  drawHeader();
  drawColumnHeaders(y);
  y += 6;

  let totalQuantity = 0;
  let totalCost = 0;

  for (const row of rows) {
    if (y + ROW_HEIGHT > pageHeight - FOOTER_HEIGHT) {
      doc.addPage();
      y = HEADER_HEIGHT + 4;
      drawHeader();
      drawColumnHeaders(y);
      y += 6;
    }

    const cost = row.quantity * row.unit_cost;
    totalQuantity += row.quantity;
    totalCost += cost;

    let x = tableLeft;
    doc.setFontSize(8.5);
    doc.text(formatDateBR(row.created_at), x, y);
    x += COLS[0].width;
    doc.text(doc.splitTextToSize(row.product_name, COLS[1].width - 2)[0] ?? "", x, y);
    x += COLS[1].width;
    doc.text(row.quantity.toLocaleString("pt-BR"), x + COLS[2].width, y, { align: "right" });
    x += COLS[2].width;
    doc.text(doc.splitTextToSize(row.reason, COLS[3].width - 2)[0] ?? "", x, y);
    x += COLS[3].width;
    doc.text(formatCurrencyBRL(row.unit_cost), x + COLS[4].width, y, { align: "right" });
    x += COLS[4].width;
    doc.text(formatCurrencyBRL(cost), x + COLS[5].width, y, { align: "right" });

    y += ROW_HEIGHT;
  }

  if (rows.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Nenhuma avaria registrada com esses filtros.", pageWidth / 2, y + 4, {
      align: "center",
    });
    doc.setTextColor(0);
    y += 10;
  }

  y += 4;
  if (y + 10 > pageHeight - FOOTER_HEIGHT) {
    doc.addPage();
    y = HEADER_HEIGHT + 4;
    drawHeader();
  }
  doc.setDrawColor(180);
  doc.line(tableLeft, y - 4, tableLeft + tableWidth, y - 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Total de itens avariados: ${totalQuantity.toLocaleString("pt-BR")}`, tableLeft, y + 2);
  doc.text(`Custo total: ${formatCurrencyBRL(totalCost)}`, tableLeft + tableWidth, y + 2, {
    align: "right",
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  doc.save(`relatorio-avarias-${new Date().toISOString().slice(0, 10)}.pdf`);
}
