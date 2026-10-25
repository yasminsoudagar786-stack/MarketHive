import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Minus, Plus, ThumbsUp, Truck, BadgeCheck, Store } from "lucide-react";
import { toast } from "sonner";
import { createReview, getOrders, getProduct, getRelated, getReviews, getVendor, voteHelpful } from "@/api";
import { ErrorState, Stars } from "@/components/common";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";
import { discountPct, inr } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { Review } from "@/types";

export const Route = createFileRoute("/product/$id")({
  head: () => ({ meta: [{ title: "Product — MarketHive" }, { name: "description", content: "Product details, reviews and seller information on MarketHive." }, { property: "og:title", content: "Product — MarketHive" }, { property: "og:description", content: "See details and reviews on MarketHive." }] }),
  component: ProductPage,
});

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border bg-muted"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
        onMouseLeave={() => setZoom(null)}>
        <img src={images[i]} alt={title} className="h-full w-full object-cover transition-transform duration-200"
          style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {images.map((src, k) => (
          <button key={src} onClick={() => setI(k)} aria-label={`Image ${k + 1}`} className={cn("overflow-hidden rounded-xl border-2", k === i ? "border-primary" : "border-transparent")}>
            <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => createReview(productId, { rating, text }),
    onSuccess: () => { toast.success("Review posted"); setText(""); qc.invalidateQueries({ queryKey: ["reviews", productId] }); },
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (text.trim().length < 5) return toast.error("Write at least a few words"); m.mutate(); }} className="space-y-3 rounded-2xl border bg-card p-4">
      <p className="font-semibold">Write a review</p>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)} className={cn("text-2xl", n <= rating ? "text-amber" : "text-muted-foreground/40")}>★</button>)}
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What did you like or dislike?" aria-label="Review text" />
      <input type="file" accept="image/*" multiple aria-label="Add photos" className="text-xs" />
      <Button variant="hero" disabled={m.isPending}>Post review</Button>
    </form>
  );
}

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const p = useQuery({ queryKey: ["product", id], queryFn: () => getProduct(id) });
  const vendor = useQuery({ queryKey: ["vendor", p.data?.vendorId], queryFn: () => getVendor(p.data!.vendorId), enabled: !!p.data });
  const reviews = useQuery({ queryKey: ["reviews", id], queryFn: () => getReviews(id) });
  const related = useQuery({ queryKey: ["related", id], queryFn: () => getRelated(id) });
  const user = useAuth((s) => s.user);
  const orders = useQuery({ queryKey: ["orders"], queryFn: getOrders, enabled: user?.role === "customer" });
  const verified = orders.data?.some((o) => o.status === "delivered" && o.subOrders.some((s) => s.items.some((i) => i.productId === id)));
  const { add, viewed } = useCart();
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<string>();
  const qc = useQueryClient();
  const helpful = useMutation({
    mutationFn: voteHelpful,
    onMutate: (rid) => qc.setQueryData<Review[]>(["reviews", id], (rs) => rs?.map((r) => (r.id === rid ? { ...r, helpful: r.helpful + 1 } : r))),
  });
  useEffect(() => { viewed(id); setQty(1); setVariant(undefined); }, [id, viewed]);

  if (p.isLoading) return <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-2"><Skeleton className="aspect-square rounded-3xl" /><div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-32" /></div></div>;
  if (p.isError) return <div className="mx-auto max-w-xl p-8"><ErrorState message="Product not found" onRetry={() => p.refetch()} /></div>;
  const prod = p.data!;
  const v = prod.variants.find((x) => x.id === variant);
  const stock = v ? v.stock : prod.stock;
  const price = prod.price + (v?.priceDelta ?? 0);
  const off = discountPct(price, prod.mrp);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.data?.filter((r) => r.rating === n).length ?? 0 }));
  const total = reviews.data?.length || 1;
  const eta = new Date(Date.now() + 4 * 864e5).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const needsVariant = prod.variants.length > 0 && !variant;
  const addToCart = () => { if (needsVariant) return toast.error("Please choose an option"); add(prod.id, qty, variant); toast.success("Added to cart"); };

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-6">
      <div className="grid gap-8 md:grid-cols-2">
        <Gallery images={prod.images} title={prod.title} />
        <div className="space-y-5">
          <div>
            <Link to="/search" search={{ category: prod.category }} className="text-xs font-semibold uppercase tracking-wide text-primary">{prod.category}</Link>
            <h1 className="mt-1 text-3xl font-bold">{prod.title}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Stars value={prod.rating} /> {prod.rating} · {prod.reviewCount} ratings</div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{inr(price)}</span>
            {off > 0 && <><span className="text-muted-foreground line-through">{inr(prod.mrp)}</span><span className="rounded-full bg-amber px-2 py-0.5 text-xs font-semibold text-amber-foreground">{off}% off</span></>}
          </div>
          {prod.variants.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Choose option</p>
              <div className="flex flex-wrap gap-2">
                {prod.variants.map((x) => (
                  <button key={x.id} disabled={x.stock === 0} onClick={() => setVariant(x.id)} aria-pressed={variant === x.id}
                    className={cn("rounded-xl border px-4 py-2 text-sm disabled:opacity-40", variant === x.id && "border-primary bg-accent")}>
                    {[x.size, x.color].filter(Boolean).join(" / ")}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className={cn("text-sm font-medium", stock === 0 ? "text-destructive" : stock < 5 ? "text-amber-foreground" : "text-success")}>
            {stock === 0 ? "Out of stock" : stock < 5 ? `Only ${stock} left — order soon` : "In stock"}
          </p>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl border">
              <button className="p-2.5" aria-label="Decrease" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center" aria-live="polite">{qty}</span>
              <button className="p-2.5" aria-label="Increase" onClick={() => setQty(Math.min(stock || 1, qty + 1))}><Plus className="h-4 w-4" /></button>
            </div>
            <Button size="lg" variant="secondary" disabled={stock === 0} onClick={addToCart}>Add to cart</Button>
            <Button size="lg" variant="hero" disabled={stock === 0} onClick={() => { if (needsVariant) return toast.error("Please choose an option"); add(prod.id, qty, variant); navigate({ to: "/checkout" }); }}>Buy now</Button>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-muted/60 p-3 text-sm"><Truck className="h-4 w-4 text-primary" /> Delivery by <b>{eta}</b> · Free over ₹499</div>
          {vendor.data && (
            <Link to="/store/$vendorId" params={{ vendorId: vendor.data.id }} className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:shadow-soft">
              <img src={vendor.data.logo} alt="" className="h-12 w-12 rounded-xl" />
              <div className="flex-1"><p className="text-xs text-muted-foreground">Sold by</p><p className="font-semibold">{vendor.data.name}</p></div>
              <span className="flex items-center gap-1 text-sm"><Stars value={vendor.data.rating} size={12} /> {vendor.data.rating}</span>
              <Store className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">{prod.description}</p>
        </div>
      </div>

      <section className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Ratings & reviews</h2>
          <div className="flex items-center gap-3"><span className="text-4xl font-bold">{prod.rating}</span><Stars value={prod.rating} /></div>
          {dist.map(({ n, c }) => (
            <div key={n} className="flex items-center gap-2 text-sm"><span className="w-6">{n}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-amber" style={{ width: `${(c / total) * 100}%` }} /></div><span className="w-6 text-right text-muted-foreground">{c}</span></div>
          ))}
          {verified ? <ReviewForm productId={id} /> : <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">Only verified buyers can review this product.</p>}
        </div>
        <ul className="space-y-4">
          {reviews.data?.map((r) => (
            <li key={r.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2"><Stars value={r.rating} size={12} /><span className="text-sm font-medium">{r.userName}</span>
                {r.verified && <span className="flex items-center gap-1 text-xs text-success"><BadgeCheck className="h-3.5 w-3.5" />Verified purchase</span>}</div>
              <p className="mt-2 text-sm">{r.text}</p>
              {r.vendorReply && <p className="mt-2 rounded-xl bg-muted/60 p-2 text-xs"><b>Seller:</b> {r.vendorReply}</p>}
              <button onClick={() => helpful.mutate(r.id)} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><ThumbsUp className="h-3.5 w-3.5" /> Helpful ({r.helpful})</button>
            </li>
          ))}
        </ul>
      </section>

      {related.data && related.data.length > 0 && (
        <section className="space-y-4"><h2 className="text-xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{related.data.map((x) => <ProductCard key={x.id} product={x} />)}</div></section>
      )}
    </div>
  );
}
