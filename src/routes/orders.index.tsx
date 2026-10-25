import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getOrders } from "@/api";
import { ProtectedRoute } from "@/components/Protected";
import { EmptyState, ErrorState, PageTitle, StatusBadge } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { inr } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders/")({
  head: () => ({ meta: [{ title: "My orders — MarketHive" }, { name: "description", content: "Track and manage your MarketHive orders." }, { property: "og:title", content: "My orders — MarketHive" }, { property: "og:description", content: "Your orders." }] }),
  component: () => <ProtectedRoute roles={["customer"]}><Orders /></ProtectedRoute>,
});

const FILTERS = ["all", "placed", "packed", "shipped", "delivered", "cancelled"];

function Orders() {
  const [f, setF] = useState("all");
  const q = useQuery({ queryKey: ["orders"], queryFn: getOrders });
  const list = q.data?.filter((o) => f === "all" || o.status === f) ?? [];
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageTitle>My orders</PageTitle>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {FILTERS.map((x) => <button key={x} role="tab" aria-selected={f === x} onClick={() => setF(x)} className={cn("rounded-full border px-3 py-1 text-sm capitalize", f === x && "border-primary bg-accent text-accent-foreground")}>{x}</button>)}
      </div>
      {q.isLoading ? <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        : q.isError ? <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
        : list.length === 0 ? <EmptyState title="No orders here" />
        : <ul className="space-y-3">{list.map((o) => (
            <li key={o.id}><Link to="/orders/$id" params={{ id: o.id }} search={{}} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft hover:shadow-glow">
              <div className="flex -space-x-3">{o.subOrders.flatMap((s) => s.items).slice(0, 3).map((i) => <img key={i.productId} src={i.image} alt="" className="h-14 w-14 rounded-xl border-2 border-card object-cover" />)}</div>
              <div className="flex-1"><p className="font-semibold">#{o.id}</p><p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-IN")} · {o.subOrders.length} seller(s)</p></div>
              <div className="text-right"><StatusBadge status={o.status} /><p className="mt-1 font-semibold">{inr(o.total)}</p></div>
            </Link></li>
          ))}</ul>}
    </div>
  );
}
