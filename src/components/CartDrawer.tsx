import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { useCart } from "@/stores/cart";
import { useCartLines, type CartLine } from "@/hooks/use-cart-lines";
import { inr } from "@/lib/pricing";
import { EmptyState } from "./common";

export function QtyControl({ line }: { line: CartLine }) {
  const setQty = useCart((s) => s.setQty);
  return (
    <div className="inline-flex items-center rounded-lg border">
      <button aria-label="Decrease quantity" className="p-1.5" onClick={() => setQty(line.product.id, line.item.qty - 1)}><Minus className="h-3.5 w-3.5" /></button>
      <span className="w-7 text-center text-sm" aria-live="polite">{line.item.qty}</span>
      <button aria-label="Increase quantity" className="p-1.5" disabled={line.item.qty >= line.product.stock} onClick={() => setQty(line.product.id, line.item.qty + 1)}><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export function CartDrawer() {
  const open = useCart((s) => s.drawerOpen);
  const setDrawer = useCart((s) => s.setDrawer);
  const remove = useCart((s) => s.remove);
  const { active, breakdown } = useCartLines();
  return (
    <Sheet open={open} onOpenChange={setDrawer}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader><SheetTitle>Your cart</SheetTitle></SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {active.length === 0 ? <EmptyState title="Your cart is empty" description="Discover something you'll love." /> :
            active.map((l) => (
              <div key={l.product.id} className="flex gap-3 rounded-xl border p-2">
                <img src={l.product.images[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <div className="flex flex-1 flex-col gap-1">
                  <span className="line-clamp-1 text-sm font-medium">{l.product.title}</span>
                  <span className="text-sm font-semibold">{inr(l.product.price * l.item.qty)}</span>
                  <div className="flex items-center justify-between"><QtyControl line={l} />
                    <button aria-label="Remove item" onClick={() => remove(l.product.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                </div>
              </div>
            ))}
        </div>
        {active.length > 0 && (
          <div className="space-y-3 border-t p-4">
            <div className="flex justify-between font-semibold"><span>Total</span><span>{inr(breakdown.total)}</span></div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild onClick={() => setDrawer(false)}><Link to="/cart">View cart</Link></Button>
              <Button variant="hero" asChild onClick={() => setDrawer(false)}><Link to="/checkout">Checkout</Link></Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
