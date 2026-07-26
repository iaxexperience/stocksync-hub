import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useState, useRef, useEffect } from "react";
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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package as PackageIcon,
  ImagePlus,
  Loader2,
} from "lucide-react";
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
        .select("*, categories(name), brands(name), units(abbreviation), suppliers(legal_name)")
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

      // Regra: nunca criar um produto que já existe (mesmo nome, ignorando
      // maiúsculas/minúsculas e espaços) — evita duplicatas como "Escada 3
      // degraus" cadastrada mais de uma vez.
      if (!editing?.id) {
        const { data: existing, error: dupErr } = await supabase
          .from("products")
          .select("id")
          .eq("organization_id", orgId!)
          .ilike("name", payload.name.trim())
          .limit(1);
        if (dupErr) throw dupErr;
        if (existing && existing.length > 0) {
          throw new Error(
            `Já existe um produto chamado "${payload.name.trim()}". Edite o produto existente em vez de criar um novo.`,
          );
        }
      }

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

  const salePriceInputRef = useRef<HTMLInputElement>(null);
  function handleCostPriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cost = Number(e.target.value || 0);
    if (salePriceInputRef.current) {
      salePriceInputRef.current.value = (cost * 2).toFixed(2);
    }
  }

  const [imageUrl, setImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setImageUrl(editing?.image_url ?? "");
  }, [editing, open]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from("product-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("product-photos")
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setImageUrl(publicUrlData.publicUrl);
        toast.success("Foto enviada com sucesso!");
      } else {
        throw new Error("Não foi possível gerar a URL da imagem.");
      }
    } catch (err: any) {
      console.error("Erro no upload:", err);
      toast.error("Erro ao enviar imagem: " + err.message);
    } finally {
      setIsUploading(false);
    }
  }

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
            <form
              key={editing?.id ?? "new"}
              onSubmit={submit}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
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
                <Label>NCM</Label>
                <Input
                  name="ncm"
                  placeholder="8 dígitos, p/ NF-e"
                  maxLength={8}
                  defaultValue={(editing as any)?.ncm ?? ""}
                />
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
                  onChange={handleCostPriceChange}
                />
              </div>
              <div className="space-y-1">
                <Label>Preço venda</Label>
                <Input
                  ref={salePriceInputRef}
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
                <Label>Foto do produto</Label>
                <input type="hidden" name="image_url" value={imageUrl} readOnly />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-16 w-16 shrink-0 relative overflow-hidden"
                    title="Enviar foto do produto"
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin opacity-70" />
                    ) : imageUrl ? (
                      <img src={imageUrl} className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-5 w-5 opacity-70" />
                    )}
                  </Button>
                  <div className="flex-1 space-y-1">
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/foto.png ou envie um arquivo"
                    />
                    {imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-muted-foreground"
                        onClick={() => setImageUrl("")}
                      >
                        Remover foto
                      </Button>
                    )}
                  </div>
                </div>
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
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
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
                        <TableCell className="text-sm">{p.suppliers?.legal_name ?? "—"}</TableCell>
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
