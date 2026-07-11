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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Search, Package as PackageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Produtos · StockFlow" }] }),
  component: Produtos,
});

const PRODUCT_TYPES = [
  { v: "produto_venda", l: "Produto para venda" },
  { v: "material_consumo", l: "Material de consumo" },
  { v: "material_permanente", l: "Material permanente" },
  { v: "eletrodomestico", l: "Eletrodoméstico" },
  { v: "equipamento", l: "Equipamento" },
  { v: "peca", l: "Peça" },
  { v: "acessorio", l: "Acessório" },
  { v: "produto_uso_interno", l: "Uso interno" },
];

function Produtos() {
  const { data: profile } = useProfile();
  const orgId = profile?.active_org_id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name), brands(name), units(abbreviation)")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (
        await supabase
          .from("categories")
          .select("id,name")
          .eq("organization_id", orgId!)
          .order("name")
      ).data ?? [],
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["brands", orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (await supabase.from("brands").select("id,name").eq("organization_id", orgId!).order("name"))
        .data ?? [],
  });
  const { data: units = [] } = useQuery({
    queryKey: ["units", orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (
        await supabase
          .from("units")
          .select("id,name,abbreviation")
          .eq("organization_id", orgId!)
          .order("abbreviation")
      ).data ?? [],
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (
        await supabase
          .from("suppliers")
          .select("id,legal_name")
          .eq("organization_id", orgId!)
          .order("legal_name")
      ).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async (values: any) => {
      const payload = { ...values, organization_id: orgId };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === "none") payload[k] = null;
      });
      if (editing?.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Produto atualizado" : "Produto criado");
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = products.filter(
    (p: any) =>
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase()),
  );

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const obj: any = Object.fromEntries(fd);
    ["cost_price", "sale_price", "stock_current", "stock_min", "stock_max"].forEach(
      (k) => (obj[k] = Number(obj[k] || 0)),
    );
    upsert.mutate(obj);
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
            Produtos e Materiais
          </h1>
          <p className="text-muted-foreground text-sm">
            Cadastre produtos, materiais e eletrodomésticos.
          </p>
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2 md:col-span-2 space-y-1">
                <Label>Nome *</Label>
                <Input name="name" required defaultValue={editing?.name} />
              </div>
              <div className="space-y-1">
                <Label>SKU</Label>
                <Input name="sku" defaultValue={editing?.sku ?? ""} />
              </div>
              <div className="space-y-1">
                <Label>Cód. barras</Label>
                <Input name="barcode" defaultValue={editing?.barcode ?? ""} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select name="product_type" defaultValue={editing?.product_type ?? "produto_venda"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((t) => (
                      <SelectItem key={t.v} value={t.v}>
                        {t.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select name="category_id" defaultValue={editing?.category_id ?? "none"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Marca</Label>
                <Select name="brand_id" defaultValue={editing?.brand_id ?? "none"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {brands.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Select name="unit_id" defaultValue={editing?.unit_id ?? "none"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {units.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.abbreviation} — {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Fornecedor</Label>
                <Select name="supplier_id" defaultValue={editing?.supplier_id ?? "none"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.legal_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Custo</Label>
                <Input
                  name="cost_price"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.cost_price ?? 0}
                />
              </div>
              <div className="space-y-1">
                <Label>Preço venda</Label>
                <Input
                  name="sale_price"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.sale_price ?? 0}
                />
              </div>
              <div className="space-y-1">
                <Label>Estoque atual</Label>
                <Input
                  name="stock_current"
                  type="number"
                  step="0.001"
                  defaultValue={editing?.stock_current ?? 0}
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-1">
                <Label>Estoque mínimo</Label>
                <Input
                  name="stock_min"
                  type="number"
                  step="0.001"
                  defaultValue={editing?.stock_min ?? 0}
                />
              </div>
              <div className="space-y-1">
                <Label>Estoque máximo</Label>
                <Input
                  name="stock_max"
                  type="number"
                  step="0.001"
                  defaultValue={editing?.stock_max ?? 0}
                />
              </div>
              <div className="space-y-1">
                <Label>Localização</Label>
                <Input name="location" defaultValue={editing?.location ?? ""} />
              </div>
              <div className="space-y-1">
                <Label>Nº série</Label>
                <Input name="serial_number" defaultValue={editing?.serial_number ?? ""} />
              </div>
              <div className="space-y-1">
                <Label>Voltagem</Label>
                <Input name="voltage" defaultValue={editing?.voltage ?? ""} />
              </div>
              <div className="space-y-1">
                <Label>Potência</Label>
                <Input name="power" defaultValue={editing?.power ?? ""} />
              </div>
              <div className="col-span-2 md:col-span-4 space-y-1">
                <Label>Descrição</Label>
                <Textarea name="description" defaultValue={editing?.description ?? ""} />
              </div>
              <DialogFooter className="col-span-2 md:col-span-4">
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
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, SKU ou código de barras…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <PackageIcon className="mx-auto h-10 w-10 opacity-40 mb-2" />
                      Nenhum produto cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p: any) => {
                    const low = Number(p.stock_current) <= Number(p.stock_min);
                    const out = Number(p.stock_current) <= 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {p.sku ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{p.categories?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{p.brands?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {Number(p.cost_price).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(p.stock_current).toLocaleString("pt-BR")}{" "}
                          <span className="text-xs text-muted-foreground">
                            {p.units?.abbreviation ?? ""}
                          </span>
                        </TableCell>
                        <TableCell>
                          {out ? (
                            <Badge variant="destructive">Sem estoque</Badge>
                          ) : low ? (
                            <Badge className="bg-warning text-warning-foreground hover:bg-warning">
                              Baixo
                            </Badge>
                          ) : (
                            <Badge className="bg-success text-success-foreground hover:bg-success">
                              Disponível
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(p);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Excluir "${p.name}"?`)) del.mutate(p.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
