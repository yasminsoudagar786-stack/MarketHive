import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Check, Trash2 } from "lucide-react";
import { validateCoupon } from "@/api";
import { useCart } from "@/stores/cart";
import { useCartLines } from "@/hooks/use-cart-lines";
import { QtyControl } from "@/components/CartDrawer";
import { EmptyState, GridSkeleton, PageTitle } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/pricing";
import type { PriceBreakdown } from "@/types";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your cart — MarketHive" }, { name: "description", content: "Review items in your MarketHive cart." }, { property: "og:title", content: "Cart — MarketHive" }, { property: "og:description", content: "Your MarketHive cart." }] }),
  component: CartPage,
});

export function Summary({ b, children }: { b: PriceBreakdown; children?: React.ReactNode }) {
  const row = (l: string, v: string, cls = "") => <div className={`flex justify-between ${cls}`}><span>{l}</span><span>{v}</span></div>;
  return (
    <div className="space-y-2 rounded-2xl border bg-card p-5 text-sm shadow-soft">
      <h2 className="mb-2 font-semibold">Price details</h2>
      {row("Subtotal", inr(b.subtotal))}
      {b.discount > 0 && row("Coupon discount", `−${inr(b.discount)}`, "text-success")}
      {row("Shipping", b.shipping ? inr(b.shipping) : "Free")}
      {row("Tax (GST 18%)", inr(b.tax))}
      <div className="border-t pt-2">{row("Total", inr(b.total), "text-base font-bold")}</div>
      {children}
    </div>
  );
}

function CouponBox({ subtotal }: { subtotal: number }) {
  const { coupon, setCoupon } = useCart();
  const [code, setCode] = useState("");
  const m = useMutation({ mutationFn: () => validateCoupon(code, subtotal), onSuccess: (c) => { setCoupon(c); setCode(""); } });
  if (coupon) return (
    <div className="flex items-center justify-between rounded-xl bg-success/10 p-3 text-sm text-success">
      <span className="flex items-center gap-2"><Check className="h-4 w-4" /> {coupon.code} applied</span>
      <button className="text-xs underline" onClick={() => setCoupon(undefined)}>Remove</button>
    </div>
  );
  return (
    <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); if (code) m.mutate(); }}>
      <div className="flex gap-2"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10 or FLAT200" aria-label="Coupon code" aria-invalid={m.isError} />
        <Button variant="outline" disabled={m.isPending}>{m.isPending ? "…" : "Apply"}</Button></div>
      {m.isError && <p className="text-xs text-destructive" role="alert">{(m.error as Error).message}</p>}
    </form>
  );
}

function CartPage() {
  const { remove, toggleSaved } = useCart();
  const { loading, groups, saved, breakdown, active } = useCartLines();
  if (loading) return <div className="mx-auto max-w-7xl px-4 py-6"><GridSkeleton count={4} /></div>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <PageTitle sub="Items from different sellers ship separately.">Shopping cart</PageTitle>
      {active.length === 0 && saved.length === 0 ? (
        <EmptyState title="Your cart is empty" action={<Button variant="hero" asChild><Link to="/search">Start shopping</Link></Button>} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.vendor?.id} className="rounded-2xl border bg-card">
                <h2 className="border-b px-4 py-3 text-sm font-semibold">Sold by {g.vendor?.name ?? "Seller"}</h2>
                {g.lines.map((l) => (
                  <div key={l.product.id} className="flex gap-4 border-b p-4 last:border-0">
                    <img src={l.product.images[0]} alt="" className="h-24 w-24 rounded-xl object-cover" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Link to="/product/$id" params={{ id: l.product.id }} className="font-medium hover:text-primary">{l.product.title}</Link>
                      {l.item.qty > l.product.stock && <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Only {l.product.stock} in stock</p>}
                      <div className="flex flex-wrap items-center gap-3"><QtyControl line={l} />
                        <button className="text-xs text-primary" onClick={() => toggleSaved(l.product.id)}>Save for later</button>
                        <button className="flex items-center gap-1 text-xs text-muted-foreground" onClick={() => remove(l.product.id)}><Trash2 className="h-3.5 w-3.5" />Remove</button></div>
                    </div>
                    <span className="font-semibold">{inr(l.product.price * l.item.qty)}</span>
                  </div>
                ))}
              </section>
            ))}
            {saved.length > 0 && (
              <section className="rounded-2xl border bg-card p-4"><h2 className="mb-3 font-semibold">Saved for later ({saved.length})</h2>
                {saved.map((l) => (
                  <div key={l.product.id} className="flex items-center gap-3 py-2"><img src={l.product.images[0]} alt="" className="h-12 w-12 rounded-lg" />
                    <span className="flex-1 text-sm">{l.product.title}</span><Button size="sm" variant="outline" onClick={() => toggleSaved(l.product.id)}>Move to cart</Button></div>
                ))}
              </section>
            )}
          </div>
          {active.length > 0 && (
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <CouponBox subtotal={breakdown.subtotal} />
              <Summary b={breakdown}><Button variant="hero" size="lg" className="mt-3 w-full" asChild><Link to="/checkout">Proceed to checkout</Link></Button></Summary>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
