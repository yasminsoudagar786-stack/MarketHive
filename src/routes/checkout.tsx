import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPaymentIntent, getVendors, placeOrder } from "@/api";
import { ProtectedRoute } from "@/components/Protected";
import { EmptyState, PageTitle } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/stores/cart";
import { useCartLines } from "@/hooks/use-cart-lines";
import { inr } from "@/lib/pricing";
import { Summary } from "./cart";
import type { Address } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — MarketHive" }, { name: "description", content: "Secure checkout on MarketHive." }, { property: "og:title", content: "Checkout — MarketHive" }, { property: "og:description", content: "Secure checkout." }] }),
  component: () => <ProtectedRoute roles={["customer"]}><Checkout /></ProtectedRoute>,
});

const STEPS = ["Address", "Shipping", "Payment", "Review"];
const SAVED: Address[] = [
  { id: "a1", name: "Demo Customer", line1: "221B MG Road", city: "Bengaluru", state: "Karnataka", pin: "560001", phone: "9876543210" },
  { id: "a2", name: "Demo Customer (Office)", line1: "WeWork, Koramangala", city: "Bengaluru", state: "Karnataka", pin: "560034", phone: "9876543210" },
];

function Checkout() {
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState(SAVED);
  const [addrId, setAddrId] = useState("a1");
  const [shipping, setShipping] = useState<"standard" | "express">("standard");
  const [provider, setProvider] = useState<"razorpay" | "stripe">("razorpay");
  const [modal, setModal] = useState<{ id: string; amount: number } | null>(null);
  const [payFailed, setPayFailed] = useState(false);
  const { active, breakdown, groups } = useCartLines();
  const { items, coupon, clear } = useCart();
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: getVendors });
  const navigate = useNavigate();
  const intent = useMutation({ mutationFn: () => createPaymentIntent(breakdown.total, provider), onSuccess: (p) => { setPayFailed(false); setModal(p); } });
  const order = useMutation({
    mutationFn: (paymentId: string) => placeOrder({ items: items.filter((i) => !i.savedForLater), address: addresses.find((a) => a.id === addrId)!, couponCode: coupon?.code, paymentId }),
    onSuccess: (o) => { clear(); navigate({ to: "/orders/$id", params: { id: o.id }, search: { success: true } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (active.length === 0) return <div className="mx-auto max-w-xl p-8"><EmptyState title="Nothing to check out" action={<Button asChild variant="hero"><Link to="/search">Browse products</Link></Button>} /></div>;

  const pay = (ok: boolean) => {
    if (!modal) return;
    setModal(null);
    if (ok) order.mutate(modal.id); else { setPayFailed(true); toast.error("Payment failed — you were not charged"); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageTitle>Checkout</PageTitle>
      <ol className="mb-8 flex gap-2" aria-label="Checkout steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1"><div className={cn("h-1.5 rounded-full", i <= step ? "bg-gradient-brand" : "bg-muted")} />
            <span className={cn("mt-1 block text-xs", i === step ? "font-semibold text-primary" : "text-muted-foreground")} aria-current={i === step ? "step" : undefined}>{i + 1}. {s}</span></li>
        ))}
      </ol>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          {step === 0 && (
            <>
              <h2 className="font-semibold">Delivery address</h2>
              {addresses.map((a) => (
                <label key={a.id} className={cn("flex cursor-pointer gap-3 rounded-xl border p-4", addrId === a.id && "border-primary bg-accent")}>
                  <input type="radio" name="addr" checked={addrId === a.id} onChange={() => setAddrId(a.id)} />
                  <span className="text-sm"><b>{a.name}</b><br />{a.line1}, {a.city}, {a.state} {a.pin} · {a.phone}</span>
                </label>
              ))}
              <form className="grid grid-cols-2 gap-3 rounded-xl border border-dashed p-4" onSubmit={(e) => {
                e.preventDefault(); const f = new FormData(e.currentTarget);
                const a = { id: `a${Date.now()}`, name: String(f.get("name")), line1: String(f.get("line1")), city: String(f.get("city")), state: String(f.get("state")), pin: String(f.get("pin")), phone: String(f.get("phone")) };
                if (!/^\d{6}$/.test(a.pin)) return toast.error("PIN must be 6 digits");
                setAddresses([...addresses, a]); setAddrId(a.id); e.currentTarget.reset();
              }}>
                <p className="col-span-2 text-sm font-medium">Add new address</p>
                {(["name", "line1", "city", "state", "pin", "phone"] as const).map((n) => <div key={n}><Label htmlFor={n} className="text-xs capitalize">{n === "line1" ? "Address" : n}</Label><Input id={n} name={n} required /></div>)}
                <Button variant="outline" className="col-span-2">Save address</Button>
              </form>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="font-semibold">Shipping method</h2>
              {([["standard", "Standard (4–6 days)", "Free over ₹499"], ["express", "Express (1–2 days)", "₹99 extra, paid on delivery"]] as const).map(([k, l, d]) => (
                <label key={k} className={cn("flex cursor-pointer gap-3 rounded-xl border p-4", shipping === k && "border-primary bg-accent")}>
                  <input type="radio" checked={shipping === k} onChange={() => setShipping(k)} /><span className="text-sm"><b>{l}</b><br /><span className="text-muted-foreground">{d}</span></span></label>
              ))}
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="font-semibold">Payment</h2>
              {(["razorpay", "stripe"] as const).map((k) => (
                <label key={k} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-4 capitalize", provider === k && "border-primary bg-accent")}>
                  <input type="radio" checked={provider === k} onChange={() => setProvider(k)} /><CreditCard className="h-4 w-4" />{k} <span className="text-xs text-muted-foreground">(test mode)</span></label>
              ))}
              <div className="rounded-xl bg-muted/50 p-4 text-sm">
                <p className="mb-2 font-semibold">Payment split preview</p>
                {groups.map((g) => {
                  const sub = g.lines.reduce((s, l) => s + l.product.price * l.item.qty, 0);
                  const pct = vendors.data?.find((v) => v.id === g.vendor?.id)?.commissionPct ?? 12;
                  const fee = Math.round((sub * pct) / 100);
                  return <div key={g.vendor?.id} className="flex justify-between border-b py-1.5 last:border-0"><span>{g.vendor?.name}</span><span className="text-muted-foreground">Platform {pct}%: {inr(fee)} · Vendor payout: <b className="text-foreground">{inr(sub - fee)}</b></span></div>;
                })}
              </div>
              {payFailed && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Your last payment attempt failed. Please retry.</p>}
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="font-semibold">Review your order</h2>
              {active.map((l) => <div key={l.product.id} className="flex justify-between text-sm"><span>{l.product.title} × {l.item.qty}</span><span>{inr(l.product.price * l.item.qty)}</span></div>)}
              <p className="text-sm text-muted-foreground">Ship to: {addresses.find((a) => a.id === addrId)?.line1} · {shipping} · {provider}</p>
            </>
          )}
          <div className="flex justify-between pt-4">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 3 ? <Button variant="hero" onClick={() => setStep(step + 1)}>Continue</Button> : (
              <Button variant="hero" disabled={intent.isPending || order.isPending} onClick={() => intent.mutate()}>
                {(intent.isPending || order.isPending) && <Loader2 className="animate-spin" />}{payFailed ? "Retry payment" : `Pay ${inr(breakdown.total)}`}
              </Button>
            )}
          </div>
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start"><Summary b={breakdown} /></aside>
      </div>

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="capitalize">{provider} checkout · Test mode</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Payment ID {modal?.id}</p>
          <p className="text-2xl font-bold">{modal && inr(modal.amount)}</p>
          <div className="space-y-2"><Label htmlFor="card">Card number</Label><Input id="card" defaultValue="4111 1111 1111 1111" />
            <div className="grid grid-cols-2 gap-2"><Input aria-label="Expiry" defaultValue="12/28" /><Input aria-label="CVV" defaultValue="123" /></div></div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={() => pay(false)}>Simulate failure</Button>
            <Button variant="hero" onClick={() => pay(true)}>Pay now</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
