import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { getCategories, getProductsByIds, getVendors, searchProducts } from "@/api";
import { ProductCard } from "@/components/ProductCard";
import { ErrorState, GridSkeleton, Stars } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import hero from "@/assets/hero.jpg";
import type { Product } from "@/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketHive — Shop from thousands of trusted sellers" },
      { name: "description", content: "Electronics, fashion, home, beauty and more from verified vendors with secure payments and easy returns." },
      { property: "og:title", content: "MarketHive — Multi-vendor marketplace" },
      { property: "og:description", content: "Shop deals from verified sellers across 8 categories." },
    ],
  }),
  component: Home,
});

const SLIDES = [
  { title: "The Festive Sale is live", sub: "Up to 60% off across 12 top brands", cta: "Shop deals", q: { discount: 30 } },
  { title: "New in Electronics", sub: "Audio, wearables and smart home — fresh drops", cta: "Explore", q: { category: "electronics" } },
  { title: "Refresh your wardrobe", sub: "Everyday fashion from independent labels", cta: "Shop fashion", q: { category: "fashion" } },
];

function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 5000); return () => clearInterval(t); }, []);
  const s = SLIDES[i];
  return (
    <section aria-roledescription="carousel" aria-label="Featured promotions" className="relative overflow-hidden rounded-3xl bg-gradient-brand">
      <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay" />
      <div className="relative flex min-h-[300px] flex-col justify-center gap-4 p-8 text-primary-foreground md:min-h-[380px] md:p-14">
        <span className="w-fit rounded-full bg-amber px-3 py-1 text-xs font-semibold text-amber-foreground">Limited time</span>
        <h1 key={s.title} className="max-w-lg animate-in fade-in slide-in-from-bottom-2 text-3xl font-extrabold leading-tight md:text-5xl">{s.title}</h1>
        <p className="max-w-md text-primary-foreground/90">{s.sub}</p>
        <Button variant="amber" size="lg" className="w-fit" asChild><Link to="/search" search={s.q}>{s.cta}</Link></Button>
      </div>
      <div className="absolute bottom-4 right-4 flex gap-2">
        <Button size="icon" variant="secondary" aria-label="Previous slide" onClick={() => setI((i + SLIDES.length - 1) % SLIDES.length)}><ChevronLeft /></Button>
        <Button size="icon" variant="secondary" aria-label="Next slide" onClick={() => setI((i + 1) % SLIDES.length)}><ChevronRight /></Button>
      </div>
    </section>
  );
}

function Rail({ title, query, to }: { title: string; query: { isLoading: boolean; isError: boolean; data?: Product[]; refetch: () => void }; to?: object }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        {to && <Link to="/search" search={to} className="text-sm font-medium text-primary">View all</Link>}
      </div>
      {query.isLoading ? <GridSkeleton count={4} /> : query.isError ? <ErrorState onRetry={query.refetch} /> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{query.data?.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}
    </section>
  );
}

function Home() {
  const cats = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const trending = useQuery({ queryKey: ["search", "trending"], queryFn: () => searchProducts({ sort: "rating" }), select: (d) => d.items });
  const deals = useQuery({ queryKey: ["search", "deals"], queryFn: () => searchProducts({ discount: 35 }), select: (d) => d.items });
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: getVendors });
  const recentIds = useCart((s) => s.recentlyViewed);
  const recent = useQuery({ queryKey: ["products", "ids", recentIds], queryFn: () => getProductsByIds(recentIds), enabled: recentIds.length > 0 });

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-6">
      <Hero />
      <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
        {[[Truck, "Free delivery over ₹499"], [ShieldCheck, "Secure payments"], [RotateCcw, "7-day easy returns"]].map(([Icon, t]) => {
          const I = Icon as typeof Truck;
          return <div key={t as string} className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-3"><I className="h-4 w-4 text-primary" />{t as string}</div>;
        })}
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Shop by category</h2>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
          {(cats.data ?? []).map((c) => (
            <Link key={c.slug} to="/search" search={{ category: c.slug }} className="group flex flex-col items-center gap-2 text-center text-sm">
              <span className="aspect-square w-full overflow-hidden rounded-2xl bg-muted"><img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-110" /></span>
              {c.name}
            </Link>
          ))}
        </div>
      </section>
      <Rail title="Trending now" query={trending} to={{ sort: "rating" }} />
      <Rail title="Deals of the day" query={deals} to={{ discount: 35 }} />
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Top vendors</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(vendors.data ?? []).filter((v) => v.status === "approved").slice(0, 4).map((v) => (
            <Link key={v.id} to="/store/$vendorId" params={{ vendorId: v.id }} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft hover:shadow-glow">
              <img src={v.logo} alt="" className="h-12 w-12 rounded-xl object-cover" />
              <div><p className="font-semibold">{v.name}</p><div className="flex items-center gap-1 text-xs text-muted-foreground"><Stars value={v.rating} size={11} />{v.rating}</div></div>
            </Link>
          ))}
        </div>
      </section>
      {recentIds.length > 0 && <Rail title="Recently viewed" query={recent} />}
    </div>
  );
}
