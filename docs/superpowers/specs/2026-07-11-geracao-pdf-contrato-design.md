# Geração de PDF do Contrato Assinado — Design Spec

**Data:** 2026-07-11

---

## Problema

O fluxo de assinatura digital em `src/routes/_authenticated/clientes.tsx` (`SignatureCollector`) já renderiza o contrato completo em HTML (`div#contrato-imprimir`), com todas as 10 cláusulas, dados das partes, tabela de produtos e notas promissórias — e já captura a assinatura do cliente em canvas. Porém, ao confirmar a assinatura, o campo `contract_url` recebe apenas uma string falsa (`"contrato-gerado-" + order_number + ".pdf"`), sem nenhum arquivo real gerado. O único jeito de obter um PDF hoje é o cliente/vendedor clicar em "Imprimir" e usar manualmente o "Salvar como PDF" do navegador.

Objetivo: gerar automaticamente um PDF real do contrato assinado (com a imagem da assinatura já embutida), salvá-lo no Supabase Storage e usar essa URL real em todo lugar que hoje usa a string falsa.

## Modelo de contrato

Confirmado com o usuário: o HTML já existente em `clientes.tsx` (linhas ~4155–4628) já corresponde ao modelo de contrato desejado, cláusula por cláusula (Partes, Objeto, Forma de Pagamento, Reserva de Domínio, Posse e Conservação, Inadimplemento, Garantia, LGPD, Assinatura Eletrônica, Disposições Gerais, Foro, Assinaturas, Anexo I — Notas Promissórias). **Nenhuma reescrita de texto contratual é necessária.**

Fora de escopo: geração de QR Code de validação nas notas promissórias (mencionado no modelo de referência, mas é uma feature nova e independente da geração de PDF).

## Decisões técnicas

1. **Momento da geração:** o PDF é gerado **depois** que o cliente confirma a assinatura (não antes, não como contrato em branco).
2. **Armazenamento:** Supabase Storage, bucket público `customer-contracts` (mesmo padrão de políticas do bucket `customer-photos` já existente), path `{organization_id}/{order_number}.pdf`.
3. **Motor de renderização:** `html2canvas-pro` (fork compatível com `oklch()`, já que o Tailwind 4 do projeto define toda a paleta de cores com essa função de cor, o que quebra o `html2canvas` original) + `jsPDF` para paginação A4. Reaproveita o HTML já existente — sem duplicar o layout do contrato em código jsPDF puro.

## Fluxo

1. Cliente assina no canvas → `handleConfirmSignature` salva a linha em `customer_signatures` (assinatura, IP, geo, device, `contract_url: null`) como já ocorre hoje → `signedResult` é setado, o que já faz a imagem da assinatura aparecer dentro do `#contrato-imprimir`.
2. Um `useEffect` disparado por `signedResult` (quando `contract_url` ainda não está definido) aguarda o próximo frame (garante que o DOM já pintou a imagem da assinatura) e roda:
   a. `html2canvasPro(document.getElementById('contrato-imprimir'))` → canvas.
   b. Fatiamento do canvas em páginas A4 (técnica padrão de slicing por altura) → `jsPDF` com uma página por fatia.
   c. `blob` do PDF é enviado para `customer-contracts/{organization_id}/{order_number}.pdf` via `supabase.storage.from('customer-contracts').upload(...)`.
   d. `supabase.from('customer_signatures').update({ contract_url: publicUrl }).eq('id', signedResult.id)`.
   e. Estado local `signedResult` é atualizado com o novo `contract_url`; query `["signatures"]` é invalidada.
3. Enquanto o passo 2 roda, o painel de sucesso mostra "Gerando PDF…". Ao concluir, mostra o botão **Baixar PDF** (abre `contract_url` em nova aba).
4. **Falha:** se `html2canvas-pro`, o `jsPDF` ou o upload falharem, a assinatura já salva permanece intacta (nada é perdido) — o painel mostra "PDF não pôde ser gerado" com botão **Tentar novamente**, que reexecuta o passo 2.
5. Mensagens de WhatsApp/E-mail (`handleSendWhatsApp`, `handleSendEmail`) passam a usar o `contract_url` real (quando disponível) em vez do link fictício `https://stockflow.com/v/contrato-{order_number}`.

## Ajuste correlato: `DocumentosList`

O botão "Imprimir" de cada linha da tabela de assinaturas hoje só dispara `window.print()` da página atual (não imprime o contrato daquela linha específica — bug preexistente, não introduzido por esta mudança). Será substituído por **Baixar PDF**, que abre `sig.contract_url` em nova aba. Para assinaturas antigas (sem PDF real, só a string falsa), o botão aparece desabilitado com tooltip "PDF não disponível para este contrato".

## Migração de banco

Nova migration `supabase/migrations/<timestamp>_create_customer_contracts_bucket.sql`, espelhando `20260712020000_create_customer_photos_bucket.sql`:

- `INSERT INTO storage.buckets (id, name, public) VALUES ('customer-contracts', 'customer-contracts', true)`
- Policies: leitura pública, insert/update/delete para `authenticated`.

## Dependências novas

```bash
npm install jspdf html2canvas-pro
```

## Fora de escopo

- Geração de PDF antes da assinatura (contrato em branco para assinatura manuscrita).
- QR Code de validação nas notas promissórias.
- Reescrita do texto/cláusulas do contrato (já está correto).
- Correção de outros usos soltos de `window.print()` no arquivo que não sejam o botão de "Imprimir" da tabela de documentos.
