import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { inr, discountPct } from "@/lib/pricing";
import { Stars } from "./common";
import { Button } from "./ui/button";
import { useCart } from "@/stores/cart";
import { cn } from "@/lib/utils";

export const ProductCard = memo(function ProductCard({ product: p, layout = "grid" }: { product: Product; layout?: "grid" | "list" }) {
  const add = useCart((s) => s.add);
  const wish = useCart((s) => s.wishlist.includes(p.id));
  const toggleWish = useCart((s) => s.toggleWish);
  const off = discountPct(p.price, p.mrp);
  return (
    <article className={cn("group relative overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow", layout === "list" && "flex")}>
      <Link to="/product/$id" params={{ id: p.id }} className={cn("block overflow-hidden bg-muted", layout === "list" ? "w-40 shrink-0 sm:w-52" : "aspect-square")}>
        <img src={p.images[0]} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </Link>
      <button
        aria-label={wish ? "Remove from wishlist" : "Add to wishlist"}
        onClick={() => toggleWish(p.id)}
        className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-card/90 shadow-soft"
      >
        <Heart className={cn("h-4 w-4", wish && "fill-destructive text-destructive")} />
      </button>
      {off > 0 && <span className="absolute right-3 top-3 rounded-full bg-amber px-2 py-0.5 text-xs font-semibold text-amber-foreground">-{off}%</span>}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link to="/product/$id" params={{ id: p.id }} className="line-clamp-1 font-medium hover:text-primary">{p.title}</Link>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Stars value={p.rating} size={12} />({p.reviewCount})</div>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold">{inr(p.price)}</span>
          {off > 0 && <span className="text-xs text-muted-foreground line-through">{inr(p.mrp)}</span>}
        </div>
        {layout === "list" && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
        {p.stock === 0 ? (
          <span className="mt-auto text-xs font-medium text-destructive">Out of stock</span>
        ) : (
          <Button size="sm" variant="secondary" className="mt-auto" onClick={() => { add(p.id); toast.success("Added to cart"); }}>
            <ShoppingCart /> Add
          </Button>
        )}
      </div>
    </article>
  );
});
