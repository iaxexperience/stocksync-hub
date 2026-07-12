import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Tipo = "categorias" | "marcas" | "unidades" | "depositos" | "fornecedores";

const CFG: Record<
  Tipo,
  {
    table: string;
    title: string;
    description: string;
    fields: { name: string; label: string; type?: string; required?: boolean; colSpan?: number }[];
    columns: { key: string; label: string }[];
  }
> = {
  categorias: {
    table: "categories",
    title: "Categorias",
    description: "Organize seus produtos em categorias.",
    fields: [{ name: "name", label: "Nome", required: true, colSpan: 2 }],
    columns: [{ key: "name", label: "Nome" }],
  },
  marcas: {
    table: "brands",
    title: "Marcas",
    description: "Marcas dos produtos.",
    fields: [{ name: "name", label: "Nome", required: true, colSpan: 2 }],
    columns: [{ key: "name", label: "Nome" }],
  },
  unidades: {
    table: "units",
    title: "Unidades de Medida",
    description: "Unidades como UN, CX, KG.",
    fields: [
      { name: "name", label: "Nome", required: true },
      { name: "abbreviation", label: "Sigla", required: true },
    ],
    columns: [
      { key: "name", label: "Nome" },
      { key: "abbreviation", label: "Sigla" },
    ],
  },
  depositos: {
    table: "warehouses",
    title: "Depósitos",
    description: "Depósitos e locais de estoque.",
    fields: [
      { name: "name", label: "Nome", required: true },
      { name: "location", label: "Localização" },
    ],
    columns: [
      { key: "name", label: "Nome" },
      { key: "location", label: "Localização" },
    ],
  },
  fornecedores: {
    table: "suppliers",
    title: "Fornecedores",
    description: "Cadastro de fornecedores.",
    fields: [
      { name: "legal_name", label: "Razão social", required: true, colSpan: 2 },
      { name: "trade_name", label: "Nome fantasia" },
      { name: "document", label: "CNPJ/CPF" },
      { name: "email", label: "E-mail", type: "email" },
      { name: "phone", label: "Telefone" },
      { name: "contact_name", label: "Contato" },
      { name: "city", label: "Cidade" },
      { name: "state", label: "UF" },
    ],
    columns: [
      { key: "legal_name", label: "Razão social" },
      { key: "trade_name", label: "Fantasia" },
      { key: "document", label: "Documento" },
      { key: "phone", label: "Telefone" },
    ],
  },
};

export const Route = createFileRoute("/_authenticated/cadastros/$tipo")({
  head: ({ params }) => ({
    meta: [{ title: `${CFG[params.tipo as Tipo]?.title ?? "Cadastros"} · StockFlow` }],
  }),
  component: CadastrosPage,
});

function CadastrosPage() {
  const { tipo } = Route.useParams();
  const cfg = CFG[tipo as Tipo];
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: [cfg?.table, orgId],
    enabled: !!orgId && !!cfg,
    queryFn: async () =>
      (
        await supabase
          .from(cfg.table as any)
          .select("*")
          .eq("organization_id", orgId!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async (values: any) => {
      const payload = { ...values, organization_id: orgId };
      if (editing?.id) {
        const { error } = await supabase
          .from(cfg.table as any)
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(cfg.table as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Atualizado" : "Criado");
      qc.invalidateQueries({ queryKey: [cfg.table] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(cfg.table as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: [cfg.table] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!cfg) return <div>Tipo inválido</div>;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsert.mutate(Object.fromEntries(fd));
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{cfg.title}</h1>
          <p className="text-muted-foreground text-sm">{cfg.description}</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground border-0">
              <Plus className="mr-1 h-4 w-4" /> Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar" : "Novo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              {cfg.fields.map((f) => (
                <div key={f.name} className={`space-y-1 ${f.colSpan === 2 ? "col-span-2" : ""}`}>
                  <Label>
                    {f.label}
                    {f.required && " *"}
                  </Label>
                  <Input
                    name={f.name}
                    type={f.type ?? "text"}
                    required={f.required}
                    defaultValue={editing?.[f.name] ?? ""}
                  />
                </div>
              ))}
              <DialogFooter className="col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={upsert.isPending}>
                  {editing ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {cfg.columns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={cfg.columns.length + 1}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={cfg.columns.length + 1}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Nenhum registro. Clique em "Novo" para adicionar.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row: any) => (
                    <TableRow key={row.id}>
                      {cfg.columns.map((c) => (
                        <TableCell
                          key={c.key}
                          className={c.key === cfg.columns[0].key ? "font-medium" : "text-sm"}
                        >
                          {row[c.key] ?? "—"}
                        </TableCell>
                      ))}
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(row);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Excluir este registro?")) del.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
