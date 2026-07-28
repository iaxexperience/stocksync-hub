import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";

const WHATSAPP_NUMBER = "5583988059666";
const CART_STORAGE_KEY = "josiejo-loja-sacola";

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.906-6.99C16.255 1.876 13.779 .843 11.45 .843 6.015.843 1.59 5.263 1.587 10.702c-.001 1.706.467 3.371 1.354 4.839l-.995 3.635 3.72-.975zm11.187-6.842c-.302-.15-1.787-.882-2.057-.981-.27-.099-.465-.15-.66.15-.195.3-.75.954-.92 1.149-.17.195-.338.22-.64.07-.302-.15-1.274-.469-2.426-1.496-.897-.8-1.502-1.787-1.68-2.087-.177-.3-.02-.461.13-.611.137-.135.302-.35.454-.525.15-.175.2-.299.302-.498.102-.2.05-.374-.025-.524-.075-.15-.66-1.59-.904-2.179-.237-.57-.48-.493-.66-.502-.17-.008-.364-.01-.559-.01-.195 0-.514.074-.783.374-.27.3-1.03 1.008-1.03 2.457 0 1.45 1.055 2.85 1.202 3.05.148.2 2.077 3.173 5.034 4.453.703.304 1.253.486 1.68.623.707.225 1.35.193 1.86.117.567-.085 1.787-.732 2.037-1.438.25-.706.25-1.314.175-1.439-.075-.125-.27-.2-.572-.35z" />
  </svg>
);

interface StorefrontProduct {
  id: string;
  name: string;
  image_url: string | null;
  stock_current: number;
  category_name: string | null;
}

type Cart = Record<string, number>;

function loadCart(): Cart {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const Route = createFileRoute("/loja")({
  component: Loja,
  head: () => ({
    meta: [
      { title: "Loja — Josi & Jo" },
      {
        name: "description",
        content: "Veja os produtos disponíveis na Josi & Jo e monte sua sacola de compras.",
      },
    ],
  }),
});

function Loja() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [zoomedProduct, setZoomedProduct] = useState<StorefrontProduct | null>(null);

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["storefront-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_storefront_products")
        .select("id, name, image_url, stock_current, category_name")
        .order("name");
      if (error) throw error;
      return data as StorefrontProduct[];
    },
    staleTime: 60_000,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach((p) => set.add(p.category_name ?? "Outros"));
    return ["Todos", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      const matchCat = category === "Todos" || (p.category_name ?? "Outros") === category;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, category, search]);

  const cartEntries = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => ({ product: (products ?? []).find((p) => p.id === id), qty }))
      .filter((e): e is { product: StorefrontProduct; qty: number } => !!e.product && e.qty > 0);
  }, [cart, products]);

  const cartCount = cartEntries.reduce((sum, e) => sum + e.qty, 0);

  function addToCart(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setCartOpen(true);
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function sendToWhatsApp() {
    const lines = cartEntries.map((e) => `• ${e.qty}x ${e.product.name}`);
    const text =
      "Olá! Tenho interesse nestes produtos:\n\n" +
      lines.join("\n") +
      "\n\nPode me passar o valor e as condições de parcelamento?\n\n(Enviado pela vitrine online — Josi & Jo)";
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 h-20 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img
              src="/logo.jpg"
              alt="Josi & Jo Eletrodomésticos"
              className="h-12 w-auto rounded-lg object-contain shadow-sm"
            />
          </Link>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto…"
              className="pl-9 rounded-full"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="ghost" className="hidden sm:inline-flex text-slate-600 hover:text-pink-600">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao site
              </Link>
            </Button>
            <Button
              onClick={() => setCartOpen(true)}
              className="relative bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-full px-5"
            >
              <ShoppingBag className="h-4 w-4 mr-2" /> Sacola
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-900 text-white text-[11px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto…"
              className="pl-9 rounded-full"
            />
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-3 text-sm font-medium text-center sm:text-left">
          <strong className="font-bold">Parcelamos no carnê da loja.</strong>{" "}
          Preço e condições combinam direto com a gente pelo WhatsApp.
        </div>
      </div>

      <nav className="mx-auto max-w-7xl px-4 py-4 flex gap-2 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
              category === c
                ? "bg-pink-600 border-pink-600 text-white"
                : "bg-white border-slate-200 text-slate-700 hover:border-pink-300"
            }`}
          >
            {c}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-7xl px-4 pb-24">
        <p className="text-sm text-slate-500 mb-4">
          {isLoading
            ? "Carregando produtos…"
            : `${filtered.length} produto${filtered.length === 1 ? "" : "s"} encontrado${filtered.length === 1 ? "" : "s"}`}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <ShoppingBag className="mx-auto h-10 w-10 opacity-40 mb-3" />
            Nenhum produto encontrado com esses filtros.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const out = p.stock_current <= 0;
              const low = !out && p.stock_current <= 3;
              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => setZoomedProduct(p)}
                    className="aspect-[4/3] bg-slate-100 cursor-zoom-in"
                    aria-label={`Ampliar foto de ${p.name}`}
                  >
                    <img
                      src={p.image_url ?? undefined}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    {p.category_name && (
                      <span className="text-[11px] font-bold uppercase tracking-wide text-pink-600">
                        {p.category_name}
                      </span>
                    )}
                    <h3 className="text-sm font-semibold leading-snug flex-1">{p.name}</h3>
                    <Badge
                      variant="outline"
                      className={
                        out
                          ? "self-start border-slate-200 bg-slate-100 text-slate-500"
                          : low
                            ? "self-start border-amber-200 bg-amber-50 text-amber-700"
                            : "self-start border-emerald-200 bg-emerald-50 text-emerald-700"
                      }
                    >
                      {out ? "Em falta" : low ? `Últimas ${p.stock_current} unid.` : "Em estoque"}
                    </Badge>
                    <Button
                      onClick={() => addToCart(p.id)}
                      disabled={out}
                      className="mt-auto bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-full text-xs h-9 disabled:opacity-60"
                    >
                      {out ? "Indisponível" : "Adicionar à sacola"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="flex flex-col gap-0 p-0">
          <SheetHeader className="p-5 border-b border-slate-200">
            <SheetTitle className="font-black text-blue-900">Sua sacola</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5">
            {cartEntries.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-16">
                Sua sacola está vazia.
                <br />
                Adicione produtos para continuar.
              </p>
            ) : (
              <div className="space-y-4">
                {cartEntries.map((e) => (
                  <div key={e.product.id} className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={e.product.image_url ?? undefined}
                        alt={e.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{e.product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => changeQty(e.product.id, -1)}
                          className="h-6 w-6 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm w-5 text-center tabular-nums">{e.qty}</span>
                        <button
                          onClick={() => changeQty(e.product.id, 1)}
                          className="h-6 w-6 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(e.product.id)}
                      className="text-slate-400 hover:text-red-500 shrink-0"
                      aria-label={`Remover ${e.product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-slate-200 space-y-3">
            <p className="text-xs text-slate-500">
              {cartEntries.length === 0
                ? "Sua sacola está vazia."
                : `${cartCount} ${cartCount === 1 ? "item selecionado" : "itens selecionados"}. Preço e parcelamento são combinados direto com a loja.`}
            </p>
            <Button
              onClick={sendToWhatsApp}
              disabled={cartEntries.length === 0}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-full h-11"
            >
              <WhatsAppIcon className="h-5 w-5 mr-2" /> Consultar pelo WhatsApp
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!zoomedProduct} onOpenChange={(open) => !open && setZoomedProduct(null)}>
        <DialogContent className="max-w-2xl p-2 bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">{zoomedProduct?.name}</DialogTitle>
          {zoomedProduct && (
            <img
              src={zoomedProduct.image_url ?? undefined}
              alt={zoomedProduct.name}
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
