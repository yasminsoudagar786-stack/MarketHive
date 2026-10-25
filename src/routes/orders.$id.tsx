import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadInvoice, getOrder, getVendors, updateOrderStatus } from "@/api";
import { ProtectedRoute } from "@/components/Protected";
import { ErrorState, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { inr } from "@/lib/pricing";
import { Summary } from "./cart";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const Route = createFileRoute("/orders/$id")({
  validateSearch: (s: Record<string, unknown>): { success?: boolean } => ({ success: s.success === true || s.success === "true" ? true : undefined }),
  head: () => ({ meta: [{ title: "Order details — MarketHive" }, { name: "description", content: "Track your MarketHive order." }, { property: "og:title", content: "Order details — MarketHive" }, { property: "og:description", content: "Order tracking." }] }),
  component: () => <ProtectedRoute roles={["customer", "admin"]}><OrderDetail /></ProtectedRoute>,
});

const FLOW: OrderStatus[] = ["placed", "packed", "shipped", "delivered"];

export function Timeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "returned") return <p className="rounded-xl bg-destructive/10 p-3 text-sm capitalize text-destructive">This order was {status}.</p>;
  const idx = FLOW.indexOf(status);
  return (
    <ol className="flex items-center" aria-label="Order progress">
      {FLOW.map((s, i) => (
        <li key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <span className={cn("grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold", i <= idx ? "border-primary bg-primary text-primary-foreground" : "border-muted text-muted-foreground")}>{i + 1}</span>
            <span className={cn("text-xs capitalize", i <= idx ? "font-semibold" : "text-muted-foreground")}>{s}</span>
          </div>
          {i < FLOW.length - 1 && <div className={cn("mx-2 mb-5 h-0.5 flex-1", i < idx ? "bg-primary" : "bg-muted")} />}
        </li>
      ))}
    </ol>
  );
}

function OrderDetail() {
  const { id } = Route.useParams();
  const { success } = Route.useSearch();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id) });
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: getVendors });
  const act = useMutation({
    mutationFn: (s: OrderStatus) => updateOrderStatus(id, s),
    onSuccess: (_, s) => { toast.success(`Order ${s}`); qc.invalidateQueries({ queryKey: ["order", id] }); qc.invalidateQueries({ queryKey: ["orders"] }); },
  });
  const inv = useMutation({ mutationFn: () => downloadInvoice(id), onError: () => toast.error("Couldn't download invoice") });
  if (q.isLoading) return <div className="mx-auto max-w-4xl space-y-4 p-6"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  if (q.isError) return <div className="mx-auto max-w-xl p-8"><ErrorState message="Order not found" onRetry={() => q.refetch()} /></div>;
  const o = q.data!;
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {success && (
        <div className="flex animate-in zoom-in-95 fade-in flex-col items-center gap-2 rounded-3xl bg-gradient-brand p-8 text-center text-primary-foreground duration-500">
          <CheckCircle2 className="h-14 w-14 animate-in zoom-in duration-700" />
          <h1 className="text-2xl font-bold">Order placed!</h1><p className="opacity-90">Thanks for shopping. We've emailed your confirmation.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-2xl font-bold">Order #{o.id}</h2>
        <Button variant="outline" onClick={() => inv.mutate()} disabled={inv.isPending}><Download /> Invoice PDF</Button>
        {(o.status === "placed" || o.status === "packed") && <Button variant="destructive" onClick={() => act.mutate("cancelled")}>Cancel order</Button>}
        {o.status === "delivered" && <Button variant="outline" onClick={() => act.mutate("returned")}>Request return</Button>}
      </div>
      <div className="rounded-2xl border bg-card p-6"><Timeline status={o.status} /></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {o.subOrders.map((s) => (
            <section key={s.id} className="rounded-2xl border bg-card p-4">
              <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Sold by {vendors.data?.find((v) => v.id === s.vendorId)?.name}</p><StatusBadge status={s.status} /></div>
              {s.items.map((i) => <div key={i.productId} className="flex items-center gap-3 py-2"><img src={i.image} alt="" className="h-14 w-14 rounded-xl" /><span className="flex-1 text-sm">{i.title} × {i.qty}</span><span className="text-sm font-semibold">{inr(i.price * i.qty)}</span></div>)}
              {s.trackingNumber && <p className="mt-2 text-xs text-muted-foreground">Tracking: <b>{s.trackingNumber}</b></p>}
            </section>
          ))}
          <div className="rounded-2xl border bg-card p-4 text-sm"><p className="font-semibold">Delivering to</p><p className="text-muted-foreground">{o.address.name}, {o.address.line1}, {o.address.city} {o.address.pin}</p></div>
        </div>
        <Summary b={o} />
      </div>
    </div>
  );
}
