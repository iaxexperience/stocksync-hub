# Geração de PDF do Contrato Assinado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a customer signs a contract digitally, automatically render the existing contract HTML into a real multi-page PDF, upload it to Supabase Storage, and use that real URL everywhere the code currently uses a fake placeholder string.

**Architecture:** A new standalone helper module (`src/lib/contract-pdf.ts`) captures `div#contrato-imprimir` with `html2canvas-pro` (Tailwind 4 uses `oklch()` colors, which break the vanilla `html2canvas`), slices the resulting image across A4 pages with `jsPDF`, and uploads the blob to a new public Supabase Storage bucket. `SignatureCollector` in `src/routes/_authenticated/clientes.tsx` calls this helper right after a signature is saved, tracks a `pdfStatus` state machine (`idle → generating → ready|error`), and surfaces a download button / retry button. `DocumentosList`'s broken "Imprimir" button (which just calls the browser's global `window.print()`, unrelated to the row it's on) is replaced with a "Baixar PDF" link to the real stored file.

**Tech Stack:** React 19, TanStack Router/Query, Supabase (Postgres + Storage), `jspdf`, `html2canvas-pro`.

## Global Constraints

- No test runner exists in this repo (no vitest/jest/bun test configured, no existing `*.test.*` files) — this plan uses manual browser verification steps instead of automated tests, matching how the rest of this codebase (e.g. `docs/superpowers/plans/2026-07-11-clientes.md`) was verified.
- Follow existing code style in `clientes.tsx`: single-dependency `useEffect` arrays (see the existing canvas-init effect at the top of `SignatureCollector`), inline async handlers, no new abstractions beyond what's needed.
- Do not modify contract wording/clauses — already correct (confirmed against user-supplied reference template).
- Out of scope: QR code generation for promissory notes, pre-signature blank PDF, any other `window.print()` usage in the file.

---

### Task 1: Install PDF dependencies and create the Storage bucket migration

**Files:**
- Modify: `package.json` (via `npm install`)
- Create: `supabase/migrations/20260713000000_create_customer_contracts_bucket.sql`

- [ ] **Step 1: Install the libraries**

Run:
```bash
npm install jspdf html2canvas-pro
```
Expected: `package.json` and `package-lock.json` gain `jspdf` and `html2canvas-pro` entries; no errors.

- [ ] **Step 2: Create the bucket migration**

Create `supabase/migrations/20260713000000_create_customer_contracts_bucket.sql` with this exact content (mirrors the existing `supabase/migrations/20260712020000_create_customer_photos_bucket.sql` pattern, just for a new bucket):

```sql
-- Migration: Create customer-contracts bucket and enable policies

-- 1. Create a public bucket for generated contract PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-contracts', 'customer-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies for public reading
CREATE POLICY "Allow public read access to customer contracts"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-contracts');

-- 3. Policies for authenticated users to upload/update/delete
CREATE POLICY "Allow authenticated upload access to customer contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'customer-contracts');

CREATE POLICY "Allow authenticated update access to customer contracts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'customer-contracts');

CREATE POLICY "Allow authenticated delete access to customer contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'customer-contracts');
```

- [ ] **Step 3: Apply the migration**

Run:
```bash
npx supabase db push
```
Expected: output confirms the new migration was applied to project `fyvatfnpdoqowjckhtkb`. If `db push` fails because the CLI isn't linked/authenticated, open the Supabase SQL editor for this project and paste the migration's SQL directly, then confirm success there instead.

- [ ] **Step 4: Verify the bucket exists**

In the Supabase Dashboard → Storage, confirm a bucket named `customer-contracts` exists and is marked Public.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json supabase/migrations/20260713000000_create_customer_contracts_bucket.sql
git commit -m "chore: add jspdf/html2canvas-pro and customer-contracts storage bucket"
```

---

### Task 2: PDF generation + upload helper module

**Files:**
- Create: `src/lib/contract-pdf.ts`

**Interfaces:**
- Produces: `generateContractPdf(elementId: string): Promise<Blob>` — renders the DOM element with the given id to a multi-page A4 PDF and returns it as a `Blob`. Throws if the element isn't found or if rendering fails.
- Produces: `uploadContractPdf(organizationId: string, orderNumber: string, pdfBlob: Blob): Promise<string>` — uploads the blob to the `customer-contracts` bucket at `{organizationId}/{orderNumber}.pdf` (overwriting any previous version for that order) and returns the public URL. Throws on upload failure.
- Consumes: `supabase` from `@/integrations/supabase/client` (already used throughout the codebase).

- [ ] **Step 1: Create the helper module**

Create `src/lib/contract-pdf.ts`:

```ts
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { supabase } from "@/integrations/supabase/client";

const CONTRACTS_BUCKET = "customer-contracts";

export async function generateContractPdf(elementId: string): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento #${elementId} não encontrado para gerar o PDF.`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidthMm = pageWidth;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

  let heightLeftMm = imgHeightMm;
  let positionMm = 0;

  pdf.addImage(imgData, "PNG", 0, positionMm, imgWidthMm, imgHeightMm);
  heightLeftMm -= pageHeight;

  while (heightLeftMm > 0) {
    positionMm = heightLeftMm - imgHeightMm;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, positionMm, imgWidthMm, imgHeightMm);
    heightLeftMm -= pageHeight;
  }

  return pdf.output("blob");
}

export async function uploadContractPdf(
  organizationId: string,
  orderNumber: string,
  pdfBlob: Blob,
): Promise<string> {
  const path = `${organizationId}/${orderNumber}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(path, pdfBlob, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(CONTRACTS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 2: Type-check the new file**

Run:
```bash
npx tsc --noEmit
```
Expected: no new errors referencing `src/lib/contract-pdf.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/contract-pdf.ts
git commit -m "feat: add contract PDF generation and upload helper"
```

---

### Task 3: Wire real PDF generation into the signature flow

**Files:**
- Modify: `src/routes/_authenticated/clientes.tsx:69` (imports)
- Modify: `src/routes/_authenticated/clientes.tsx:3852-3855` (SignatureCollector state)
- Modify: `src/routes/_authenticated/clientes.tsx:4037-4058` (submitData / fake contract_url)
- Modify: `src/routes/_authenticated/clientes.tsx:4060-4077` (handleSendWhatsApp / handleSendEmail)
- Modify: `src/routes/_authenticated/clientes.tsx:4115-4152` (success panel JSX)

**Interfaces:**
- Consumes: `generateContractPdf`, `uploadContractPdf` from `src/lib/contract-pdf.ts` (Task 2).

- [ ] **Step 1: Import the helper module**

In `src/routes/_authenticated/clientes.tsx`, find this line (currently line 69):

```tsx
import { toast } from "sonner";
```

Add the new import immediately after it:

```tsx
import { toast } from "sonner";
import { generateContractPdf, uploadContractPdf } from "@/lib/contract-pdf";
```

- [ ] **Step 2: Add PDF status state**

Find this block inside `SignatureCollector` (currently lines 3852-3855):

```tsx
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signedResult, setSignedResult] = useState<any | null>(null);
```

Replace with:

```tsx
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signedResult, setSignedResult] = useState<any | null>(null);
  const [pdfStatus, setPdfStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
```

- [ ] **Step 3: Stop writing a fake contract_url on signature save, and add the PDF generation function**

Find this block (currently lines 4037-4059 — note this includes the closing brace of `handleConfirmSignature` itself on the last line):

```tsx
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
        const result = await saveSignature.mutateAsync(signatureObj);
        setSignedResult(result);
      } catch (err: any) {
        toast.error("Erro ao assinar contrato: " + err.message);
      }
    }
  }
```

Replace with (this closes `handleConfirmSignature` after `submitData`, then declares `generateAndUploadContractPdf` as its own top-level function in `SignatureCollector`, a sibling of `handleConfirmSignature` — not nested inside it — so the effect in Step 4 and the retry button in Step 6 can both call it):

```tsx
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
        contract_url: null,
        contract_version: "1.0",
      };

      try {
        const result = await saveSignature.mutateAsync(signatureObj);
        setSignedResult(result);
      } catch (err: any) {
        toast.error("Erro ao assinar contrato: " + err.message);
      }
    }
  }

  async function generateAndUploadContractPdf(signatureId: string) {
    setPdfStatus("generating");
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const pdfBlob = await generateContractPdf("contrato-imprimir");
      const publicUrl = await uploadContractPdf(
        customer.organization_id,
        order.order_number,
        pdfBlob,
      );
      const { error } = await supabase
        .from("customer_signatures")
        .update({ contract_url: publicUrl })
        .eq("id", signatureId);
      if (error) throw error;
      setSignedResult((prev: any) => (prev ? { ...prev, contract_url: publicUrl } : prev));
      setPdfStatus("ready");
    } catch (err: any) {
      console.error("Erro ao gerar PDF do contrato:", err);
      setPdfStatus("error");
    }
  }
```

- [ ] **Step 4: Trigger PDF generation once a signature is saved**

Find the existing canvas-init effect near the top of `SignatureCollector`:

```tsx
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
```

Immediately after it, add a new effect:

```tsx
  useEffect(() => {
    if (signedResult && !signedResult.contract_url && pdfStatus === "idle") {
      generateAndUploadContractPdf(signedResult.id);
    }
  }, [signedResult]);
```

- [ ] **Step 5: Use the real contract URL in WhatsApp/e-mail messages**

Find (currently lines 4060-4077):

```tsx
  // Links de simulação
  function handleSendWhatsApp() {
    const text = encodeURIComponent(
      `Olá ${customer.name}, seu contrato digital #${order.order_number} do StockFlow foi assinado com sucesso! Visualize o PDF no link: https://stockflow.com/v/contrato-${order.order_number}`,
    );
    const phoneNum = customer.whatsapp ? customer.whatsapp.replace(/\D/g, "") : "";
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
```

Replace with:

```tsx
  // Links de simulação
  function handleSendWhatsApp() {
    const linkText = signedResult?.contract_url
      ? `Visualize o PDF no link: ${signedResult.contract_url}`
      : "O PDF do contrato está sendo gerado e será enviado em breve.";
    const text = encodeURIComponent(
      `Olá ${customer.name}, seu contrato digital #${order.order_number} do StockFlow foi assinado com sucesso! ${linkText}`,
    );
    const phoneNum = customer.whatsapp ? customer.whatsapp.replace(/\D/g, "") : "";
    window.open(`https://api.whatsapp.com/send?phone=${phoneNum}&text=${text}`, "_blank");
  }

  function handleSendEmail() {
    const subject = encodeURIComponent(
      `Contrato Assinado - Pedido #${order.order_number} - StockFlow`,
    );
    const linkText = signedResult?.contract_url
      ? `Baixe o PDF assinado em: ${signedResult.contract_url}`
      : "O PDF assinado está sendo gerado e será enviado em breve.";
    const body = encodeURIComponent(
      `Prezado(a) ${customer.name},\n\nAgradecemos a contratação. ${linkText}\n\nAtenciosamente,\nEquipe StockFlow.`,
    );
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`, "_blank");
  }
```

- [ ] **Step 6: Show PDF status and a download button in the success panel**

Find (currently lines 4115-4152):

```tsx
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
          </div>
        </div>
      )}
```

Replace with:

```tsx
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
          {pdfStatus === "generating" && (
            <p className="text-[11px] text-emerald-700 flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando PDF do contrato assinado…
            </p>
          )}
          {pdfStatus === "error" && (
            <div className="text-[11px] text-destructive flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>PDF não pôde ser gerado.</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-[11px] text-destructive underline"
                onClick={() => generateAndUploadContractPdf(signedResult.id)}
              >
                Tentar novamente
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {signedResult.contract_url && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-emerald-700 bg-emerald-50"
                onClick={() => window.open(signedResult.contract_url, "_blank")}
              >
                <Download className="h-3.5 w-3.5" /> Baixar PDF
              </Button>
            )}
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
          </div>
        </div>
      )}
```

- [ ] **Step 7: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no new errors in `src/routes/_authenticated/clientes.tsx`.

- [ ] **Step 8: Manual verification**

Run:
```bash
npm run dev
```
In the browser: open `/clientes`, go to a customer with a pending contract order (or create one), open the signature dialog, accept the terms, draw a signature, confirm. Expected:
- "Contrato Assinado Digitalmente com Sucesso!" panel appears immediately.
- "Gerando PDF do contrato assinado…" appears briefly.
- A "Baixar PDF" button appears; clicking it opens a real PDF in a new tab showing the full contract (all clauses, the product table, the signature image in the "COMPRADOR" box, and one promissory note per installment).
- In the Supabase Dashboard → Storage → `customer-contracts`, confirm a file `{organization_id}/{order_number}.pdf` was created.
- In the Supabase Dashboard → Table Editor → `customer_signatures`, confirm the new row's `contract_url` is the real Storage URL (not the old `"contrato-gerado-...pdf"` placeholder).

- [ ] **Step 9: Commit**

```bash
git add src/routes/_authenticated/clientes.tsx
git commit -m "feat(clientes): generate and store a real signed contract PDF"
```

---

### Task 4: Replace the broken "Imprimir" button in the documents archive

**Files:**
- Modify: `src/routes/_authenticated/clientes.tsx:5374-5383` (`DocumentosList` row actions)

- [ ] **Step 1: Replace the button**

Find (currently lines 5374-5383):

```tsx
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex items-center gap-1 ml-auto"
                        onClick={() => window.print()}
                      >
                        <Printer className="h-3 w-3" /> Imprimir
                      </Button>
                    </TableCell>
```

Replace with:

```tsx
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex items-center gap-1 ml-auto"
                        disabled={!sig.contract_url}
                        title={sig.contract_url ? undefined : "PDF não disponível para este contrato"}
                        onClick={() => sig.contract_url && window.open(sig.contract_url, "_blank")}
                      >
                        <Download className="h-3 w-3" /> Baixar PDF
                      </Button>
                    </TableCell>
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, open `/clientes`, go to the "Assinaturas" tab. Expected:
- The contract signed in Task 3's verification shows a working "Baixar PDF" button (opens the real PDF).
- Any older signature rows (signed before this change, with the fake placeholder URL) show a disabled "Baixar PDF" button with the "PDF não disponível" tooltip.

- [ ] **Step 4: Commit**

```bash
git add src/routes/_authenticated/clientes.tsx
git commit -m "fix(clientes): replace broken print button with real PDF download in documents archive"
```
