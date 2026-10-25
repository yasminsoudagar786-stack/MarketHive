import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { getCategories, getVendors, searchProducts } from "@/api";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorState, GridSkeleton } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { inr } from "@/lib/pricing";
import type { SearchParams } from "@/types";
import { cn } from "@/lib/utils";

const num = (v: unknown) => (v === undefined || v === "" || isNaN(Number(v)) ? undefined : Number(v));
export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    vendor: typeof s.vendor === "string" ? s.vendor : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
    minPrice: num(s.minPrice), maxPrice: num(s.maxPrice), rating: num(s.rating), discount: num(s.discount),
    page: num(s.page), inStock: s.inStock === true || s.inStock === "true" ? true : undefined,
  }),
  head: () => ({ meta: [{ title: "Search products — MarketHive" }, { name: "description", content: "Search and filter thousands of products from verified MarketHive sellers." }, { property: "og:title", content: "Search — MarketHive" }, { property: "og:description", content: "Find exactly what you need on MarketHive." }] }),
  component: SearchPage,
});

const MAX = 50000;

function Filters() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const set = (patch: Partial<SearchParams>) => navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) });
  const cats = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: getVendors });
  const [price, setPrice] = useState<number[]>([s.minPrice ?? 0, s.maxPrice ?? MAX]);
  const group = "space-y-2 border-b pb-4";
  return (
    <div className="space-y-4 text-sm">
      <fieldset className={group}><legend className="mb-2 font-semibold">Category</legend>
        {cats.data?.map((c) => (
          <label key={c.slug} className="flex items-center gap-2"><Checkbox checked={s.category === c.slug} onCheckedChange={(v) => set({ category: v ? c.slug : undefined })} />{c.name}</label>
        ))}
      </fieldset>
      <fieldset className={group}><legend className="mb-3 font-semibold">Price</legend>
        <Slider min={0} max={MAX} step={500} value={price} onValueChange={setPrice} onValueCommit={([a, b]) => set({ minPrice: a || undefined, maxPrice: b === MAX ? undefined : b })} aria-label="Price range" />
        <div className="flex justify-between text-xs text-muted-foreground"><span>{inr(price[0])}</span><span>{inr(price[1])}{price[1] === MAX && "+"}</span></div>
      </fieldset>
      <fieldset className={group}><legend className="mb-2 font-semibold">Rating</legend>
        {[4, 3, 2].map((r) => <label key={r} className="flex items-center gap-2"><Checkbox checked={s.rating === r} onCheckedChange={(v) => set({ rating: v ? r : undefined })} />{r}★ & up</label>)}
      </fieldset>
      <fieldset className={group}><legend className="mb-2 font-semibold">Discount</legend>
        {[10, 25, 40].map((d) => <label key={d} className="flex items-center gap-2"><Checkbox checked={s.discount === d} onCheckedChange={(v) => set({ discount: v ? d : undefined })} />{d}% or more</label>)}
      </fieldset>
      <fieldset className={group}><legend className="mb-2 font-semibold">Vendor</legend>
        <Select value={s.vendor ?? "all"} onValueChange={(v) => set({ vendor: v === "all" ? undefined : v })}>
          <SelectTrigger aria-label="Vendor"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All vendors</SelectItem>{vendors.data?.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
        </Select>
      </fieldset>
      <label className="flex items-center gap-2"><Checkbox checked={!!s.inStock} onCheckedChange={(v) => set({ inStock: v ? true : undefined })} />In stock only</label>
    </div>
  );
}

function SearchPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const q = useQuery({ queryKey: ["search", s], queryFn: () => searchProducts(s), placeholderData: keepPreviousData });
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: getVendors });
  const chips = (Object.entries(s) as [keyof SearchParams, unknown][]).filter(([k, v]) => v !== undefined && k !== "page" && k !== "sort");
  const label = (k: string, v: unknown) =>
    k === "vendor" ? vendors.data?.find((x) => x.id === v)?.name : k === "minPrice" ? `≥ ${inr(v as number)}` : k === "maxPrice" ? `≤ ${inr(v as number)}`
    : k === "rating" ? `${v}★+` : k === "discount" ? `${v}%+ off` : k === "inStock" ? "In stock" : String(v);
  const pages = q.data ? Math.ceil(q.data.total / q.data.pageSize) : 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block"><Filters /></aside>
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-xl font-bold">{s.q ? <>Results for "{s.q}"</> : "All products"} {q.data && <span className="text-sm font-normal text-muted-foreground">({q.data.total})</span>}</h1>
          <Sheet>
            <SheetTrigger asChild><Button variant="outline" size="sm" className="lg:hidden"><SlidersHorizontal /> Filters</Button></SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto"><SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader><div className="px-4"><Filters /></div></SheetContent>
          </Sheet>
          <Select value={s.sort ?? "relevance"} onValueChange={(v) => navigate({ search: (p) => ({ ...p, sort: v === "relevance" ? undefined : v }) })}>
            <SelectTrigger className="w-44" aria-label="Sort by"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem><SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem><SelectItem value="newest">Newest</SelectItem><SelectItem value="rating">Top rated</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-xl border p-0.5" role="group" aria-label="Layout">
            <Button size="icon" variant={layout === "grid" ? "secondary" : "ghost"} className="h-8 w-8" aria-pressed={layout === "grid"} aria-label="Grid view" onClick={() => setLayout("grid")}><LayoutGrid /></Button>
            <Button size="icon" variant={layout === "list" ? "secondary" : "ghost"} className="h-8 w-8" aria-pressed={layout === "list"} aria-label="List view" onClick={() => setLayout("list")}><List /></Button>
          </div>
        </div>
        {chips.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {chips.map(([k, v]) => (
              <button key={k} onClick={() => navigate({ search: (p) => ({ ...p, [k]: undefined, page: undefined }) })} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground" aria-label={`Remove filter ${label(k, v)}`}>
                {label(k, v)} <X className="h-3 w-3" />
              </button>
            ))}
            <button className="text-xs text-primary" onClick={() => navigate({ search: {} })}>Clear all</button>
          </div>
        )}
        {q.isLoading ? <GridSkeleton /> : q.isError ? <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} /> :
          q.data!.items.length === 0 ? (
            <EmptyState title="No products match your search" description="Try removing some filters or searching for something broader." action={<Button variant="outline" onClick={() => navigate({ search: {} })}>Reset filters</Button>} />
          ) : (
            <>
              <div className={cn("grid gap-4", layout === "grid" ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-1", q.isFetching && "opacity-70")}>
                {q.data!.items.map((p) => <ProductCard key={p.id} product={p} layout={layout} />)}
              </div>
              {pages > 1 && (
                <nav aria-label="Pagination" className="mt-8 flex justify-center gap-1">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <Button key={n} size="sm" variant={(s.page ?? 1) === n ? "hero" : "outline"} aria-current={(s.page ?? 1) === n ? "page" : undefined}
                      onClick={() => { navigate({ search: (p) => ({ ...p, page: n }) }); window.scrollTo({ top: 0 }); }}>{n}</Button>
                  ))}
                </nav>
              )}
            </>
          )}
      </section>
    </div>
  );
}
