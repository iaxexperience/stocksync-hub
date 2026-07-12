# Módulo de Clientes — Design Spec

**Data:** 2026-07-11  
**Abordagem:** Implementação sequencial (schema → lista → cadastro → carrinho → assinatura → dashboard)

---

## Stack

- TanStack Start + React 19, TanStack Router (file-based), React Query
- shadcn/ui + Tailwind CSS 4
- Supabase (PostgreSQL + Auth + RLS)
- React Hook Form + Zod
- signature_pad (assinatura digital)
- jsPDF + html2canvas (geração de PDF)

---

## Navegação (AppSidebar.tsx)

Novo grupo **Clientes** no menu lateral:

- Lista de Clientes → `/clientes`
- Novo Cliente → `/clientes/novo`
- Produtos Contratados → `/clientes/produtos`
- Histórico de Compras → `/clientes/pedidos`
- Pagamentos → `/clientes/pagamentos`
- Documentos e Assinaturas → `/clientes/documentos`

---

## Rotas (src/routes/_authenticated/clientes/)

| Arquivo              | Descrição                                         |
| -------------------- | ------------------------------------------------- |
| `route.tsx`          | Layout do módulo (tabs de navegação interna)      |
| `index.tsx`          | Lista de clientes + dashboard de indicadores      |
| `novo.tsx`           | Formulário de cadastro (dados + endereço)         |
| `$id.tsx`            | Perfil completo do cliente                        |
| `$id.editar.tsx`     | Edição dos dados cadastrais                       |
| `$id.pedido.tsx`     | Carrinho + geração de pedido/orçamento/contrato   |
| `$id.assinatura.tsx` | Assinatura digital (otimizado para tablet/mobile) |
| `pedidos.tsx`        | Histórico de compras (todos os clientes)          |
| `pagamentos.tsx`     | Parcelas e pagamentos (todos os clientes)         |
| `documentos.tsx`     | Contratos e assinaturas (todos os clientes)       |

---

## Schema do Banco de Dados

### Tabelas novas

#### customers

```sql
id uuid PK, organization_id uuid FK, customer_type enum(pessoa_fisica, pessoa_juridica),
name text NOT NULL, trade_name text, cpf_cnpj text, rg_state_registration text,
birth_or_opening_date date, phone text, whatsapp text, email text, photo_url text,
status enum(ativo, inativo, em_analise, bloqueado, inadimplente) DEFAULT 'ativo',
notes text, deleted_at timestamptz, created_by uuid FK, created_at timestamptz, updated_at timestamptz
```

#### customer_addresses

```sql
id uuid PK, customer_id uuid FK → customers, zip_code text, street text, number text,
complement text, neighborhood text, city text, state char(2), reference text,
is_primary boolean DEFAULT true, created_at timestamptz
```

#### orders

```sql
id uuid PK, organization_id uuid FK, customer_id uuid FK → customers,
seller_id uuid FK → profiles, order_number text UNIQUE,
order_type enum(pedido, orcamento, contrato) DEFAULT 'pedido',
subtotal numeric(14,2), discount numeric(14,2) DEFAULT 0,
shipping_fee numeric(14,2) DEFAULT 0, installation_fee numeric(14,2) DEFAULT 0,
total_amount numeric(14,2),
payment_method text, installments_count int DEFAULT 1, first_due_date date,
status enum(rascunho, confirmado, cancelado, entregue) DEFAULT 'rascunho',
payment_status enum(pendente, parcial, pago, vencido) DEFAULT 'pendente',
delivery_date date, notes text, created_at timestamptz, updated_at timestamptz
```

#### order_items

```sql
id uuid PK, order_id uuid FK → orders, product_id uuid FK → products,
quantity numeric(14,3) NOT NULL, unit_price numeric(14,2) NOT NULL,
discount numeric(14,2) DEFAULT 0, additional_fee numeric(14,2) DEFAULT 0,
total_amount numeric(14,2), warranty_days int, serial_number text,
status text DEFAULT 'ativo', created_at timestamptz
```

#### installments

```sql
id uuid PK, order_id uuid FK → orders, installment_number int NOT NULL,
due_date date NOT NULL, amount numeric(14,2) NOT NULL,
payment_date date, payment_method text,
status enum(pendente, pago, vencido, cancelado) DEFAULT 'pendente',
receipt_url text, created_at timestamptz
```

#### customer_signatures

```sql
id uuid PK, customer_id uuid FK → customers, order_id uuid FK → orders,
signature_url text, signed_at timestamptz, signed_by uuid FK → profiles,
device_information jsonb, ip_address text, latitude numeric, longitude numeric,
contract_url text, contract_version text
```

### Tabelas existentes — sem alteração

- `products` — `order_items.product_id` faz FK para esta tabela
- `stock_movements` — trigger em orders cria saída ao confirmar, estorno ao cancelar

### Triggers e automações

1. **order_number:** gerado automaticamente `ORD-{ANO}-{SEQUENCIAL}` via trigger
2. **Confirmação de pedido:** cria `stock_movements` (saida) para cada order_item
3. **Cancelamento de pedido:** cria `stock_movements` (entrada) para estorno
4. **Parcelas vencidas:** status marcado via query (`due_date < now() AND status = 'pendente'`)
5. **Exclusão lógica:** `customers.deleted_at` — nunca exclusão física de clientes com pedidos

### RLS

Todas as tabelas novas com `organization_id` usam as mesmas políticas `is_org_member()` existentes.

---

## Interfaces

### Lista de Clientes (`/clientes`)

Colunas: Nome, CPF/CNPJ, Telefone, Cidade, Qtd Produtos, Total Comprado, Saldo Pendente, Última Compra, Status, Ações  
Filtros: nome, CPF/CNPJ, cidade, produto, vendedor, status, situação financeira, data última compra  
Ações rápidas: visualizar, editar, adicionar produto, criar orçamento, criar pedido, registrar pagamento, WhatsApp, contrato, assinatura, imprimir

### Dashboard de Clientes (topo da lista)

Indicadores: Total clientes, Ativos, Novos no mês, Inadimplentes, Sem compras recentes, Ticket médio, Total vendido, Total recebido, Total a receber

### Formulário de Cadastro (`/clientes/novo`)

Seções: Tipo (PF/PJ) → Dados pessoais/empresariais → Endereço (com busca por CEP) → Situação → Salvar

### Perfil do Cliente (`/clientes/$id`)

Abas: Dados | Pedidos | Orçamentos | Contratos | Parcelas | Pagamentos | Assinaturas | Linha do Tempo

### Carrinho/Pedido (`/clientes/$id/pedido`)

- Seleção de produtos (cards com estoque disponível)
- Carrinho: quantidade, desconto por item, desconto geral, frete, instalação
- Forma de pagamento + parcelas com geração automática de vencimentos
- Gerar Pedido / Orçamento / Contrato

### Assinatura Digital (`/clientes/$id/assinatura`)

- Resumo da contratação
- Termos de aceite
- Canvas de assinatura (signature_pad)
- Salvar: imagem, timestamp, IP, device, geolocalização
- Gerar PDF e enviar por e-mail/WhatsApp

---

## Regras de Negócio

- Estoque insuficiente bloqueia confirmação (exceto admin)
- Clientes com pedidos: exclusão lógica apenas
- Isolamento por `organization_id` em todas as tabelas
- Parcelas geradas automaticamente ao confirmar pedido parcelado

---

## Sequência de Implementação

1. Migração SQL (tabelas + enums + triggers + RLS)
2. Menu lateral + rotas de arquivo
3. Lista de clientes + dashboard (sem dados reais ainda)
4. Formulário de cadastro (dados + endereço + busca CEP)
5. Perfil do cliente (abas)
6. Seleção de produtos + carrinho
7. Confirmação de pedido (trigger estoque)
8. Parcelas e pagamentos
9. Assinatura digital + PDF
10. Dashboard com dados reais
