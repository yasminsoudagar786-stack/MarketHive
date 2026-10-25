import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getVendorSubOrders, updateSubOrder } from "@/api";
import { EmptyState, ErrorState, PageTitle, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inr } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";
import type { OrderStatus } from "@/types";

export const Route = createFileRoute("/vendor/orders")({
  head: () => ({ meta: [{ title: "Vendor orders — MarketHive" }] }),
  component: VendorOrders,
});

type Row = Awaited<ReturnType<typeof getVendorSubOrders>>[number];

const FILTERS: ("all" | OrderStatus)[] = ["all", "placed", "packed", "shipped", "delivered", "cancelled"];
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  placed: { status: "packed", label: "Mark packed" },
  packed: { status: "shipped", label: "Mark shipped" },
  shipped: { status: "delivered", label: "Mark delivered" },
};

function VendorOrders() {
  const vendorId = useAuth((s) => s.user?.vendorId);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [ship, setShip] = useState<Row | null>(null);
  const [tracking, setTracking] = useState("");

  const q = useQuery({ queryKey: ["vendor", "suborders", vendorId], queryFn: () => getVendorSubOrders(vendorId!), enabled: !!vendorId });

  const m = useMutation({
    mutationFn: (v: { id: string; status: OrderStatus; trackingNumber?: string }) =>
      updateSubOrder(v.id, { status: v.status, trackingNumber: v.trackingNumber }),
    onSuccess: (_d, v) => {
      toast.success(`Order marked ${v.status}`);
      qc.invalidateQueries({ queryKey: ["vendor", "suborders"] });
      setShip(null);
      setTracking("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  if (!vendorId) return <EmptyState title="No vendor profile yet" description="Complete onboarding to start receiving orders." />;
  if (q.isError) return <ErrorState message="Couldn't load orders." onRetry={() => q.refetch()} />;

  const rows = (q.data ?? [])
    .filter((r) => filter === "all" || r.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const advance = (r: Row) => {
    const next = NEXT[r.status];
    if (!next) return;
    if (next.status === "shipped") { setTracking(r.trackingNumber ?? ""); setShip(r); return; }
    m.mutate({ id: r.id, status: next.status });
  };

  return (
    <div>
      <PageTitle sub="Move each order through packed, shipped and delivered.">Orders</PageTitle>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "rounded-full border px-3 py-1 text-sm capitalize transition-colors",
              filter === f ? "border-transparent bg-gradient-brand text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No orders here" description="Orders matching this filter will show up here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const next = NEXT[r.status];
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.orderId}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                    </TableCell>
                    <TableCell>{r.customer}</TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate">{r.items.map((i) => `${i.title} ×${i.qty}`).join(", ")}</p>
                      {r.trackingNumber && <p className="text-xs text-muted-foreground">Tracking: {r.trackingNumber}</p>}
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-medium">{inr(r.subtotal)}</p>
                      <p className="text-xs text-muted-foreground">Commission {inr(r.commission)}</p>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      {next ? (
                        <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => advance(r)}>{next.label}</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!ship} onOpenChange={(o) => { if (!o) { setShip(null); setTracking(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ship order {ship?.orderId}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking number</Label>
            <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. TRK123456" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShip(null); setTracking(""); }}>Cancel</Button>
            <Button
              variant="hero"
              disabled={!tracking.trim() || m.isPending}
              onClick={() => ship && m.mutate({ id: ship.id, status: "shipped", trackingNumber: tracking.trim() })}
            >
              Confirm shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
