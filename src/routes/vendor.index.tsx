import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, IndianRupee, PackageCheck, ShoppingBag, Star, Wallet } from "lucide-react";
import { getPayouts, getVendor, getVendorProducts, getVendorSubOrders } from "@/api";
import { EmptyState, ErrorState, PageTitle } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { inr } from "@/lib/pricing";
import { useAuth } from "@/stores/auth";

export const Route = createFileRoute("/vendor/")({
  component: VendorDashboard,
});

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Wallet }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function VendorDashboard() {
  const vendorId = useAuth((s) => s.user?.vendorId);
  const enabled = !!vendorId;
  const vendor = useQuery({ queryKey: ["vendor", "me", vendorId], queryFn: () => getVendor(vendorId!), enabled });
  const products = useQuery({ queryKey: ["vendor", "products", vendorId], queryFn: () => getVendorProducts(vendorId!), enabled });
  const subs = useQuery({ queryKey: ["vendor", "suborders", vendorId], queryFn: () => getVendorSubOrders(vendorId!), enabled });
  const payouts = useQuery({ queryKey: ["vendor", "payouts", vendorId], queryFn: () => getPayouts(vendorId!), enabled });

  const stats = useMemo(() => {
    const live = (subs.data ?? []).filter((s) => s.status !== "cancelled" && s.status !== "returned");
    const revenue = live.reduce((a, s) => a + s.subtotal, 0);
    const commission = live.reduce((a, s) => a + s.commission, 0);
    const units = live.reduce((a, s) => a + s.items.reduce((n, i) => n + i.qty, 0), 0);

    const byMonth = new Map<string, { label: string; revenue: number }>();
    live.forEach((s) => {
      const d = new Date(s.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = byMonth.get(key) ?? { label: d.toLocaleString("en-IN", { month: "short" }), revenue: 0 };
      cur.revenue += s.subtotal;
      byMonth.set(key, cur);
    });
    const chart = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => v);

    const byProduct = new Map<string, { title: string; units: number; revenue: number }>();
    live.forEach((s) =>
      s.items.forEach((i) => {
        const cur = byProduct.get(i.productId) ?? { title: i.title, units: 0, revenue: 0 };
        cur.units += i.qty;
        cur.revenue += i.price * i.qty;
        byProduct.set(i.productId, cur);
      }),
    );
    const top = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    return { revenue, commission, units, orders: live.length, chart, top };
  }, [subs.data]);

  if (!vendorId) {
    return <EmptyState title="No vendor profile yet" description="Your account isn't linked to a store. Complete onboarding to start selling." />;
  }

  const loading = vendor.isLoading || products.isLoading || subs.isLoading || payouts.isLoading;
  const failed = vendor.isError || products.isError || subs.isError || payouts.isError;
  if (failed) {
    return (
      <ErrorState
        message="Couldn't load your dashboard."
        onRetry={() => { vendor.refetch(); products.refetch(); subs.refetch(); payouts.refetch(); }}
      />
    );
  }

  const pendingPayout = (payouts.data ?? []).filter((p) => p.status === "pending").reduce((a, p) => a + p.amount, 0);
  const lowStock = (products.data ?? []).filter((p) => p.status === "published" && p.stock <= 5).sort((a, b) => a.stock - b.stock);

  return (
    <div>
      <PageTitle sub={vendor.data ? `Welcome back, ${vendor.data.name}` : undefined}>Dashboard</PageTitle>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Kpi label="Revenue" value={inr(stats.revenue)} icon={IndianRupee} />
          <Kpi label="Orders" value={String(stats.orders)} icon={ShoppingBag} />
          <Kpi label="Units sold" value={String(stats.units)} icon={PackageCheck} />
          <Kpi label="Rating" value={vendor.data ? `${vendor.data.rating} ★` : "-"} icon={Star} />
          <Kpi label="Pending payout" value={inr(pendingPayout)} icon={Wallet} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-4 lg:col-span-2" aria-label="Sales chart">
          <h2 className="mb-1 font-semibold">Sales by month</h2>
          <p className="mb-4 text-xs text-muted-foreground">Platform commission so far: {inr(stats.commission)}</p>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : stats.chart.length === 0 ? (
            <EmptyState title="No sales yet" description="Your sales chart appears after your first order." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => [inr(v), "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-4" aria-label="Top products">
          <h2 className="mb-3 font-semibold">Top products</h2>
          {loading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : stats.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <ol className="space-y-3">
              {stats.top.map((p, i) => (
                <li key={p.title} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate"><span className="mr-2 text-muted-foreground">{i + 1}.</span>{p.title}</span>
                  <span className="shrink-0 font-medium">{inr(p.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-4" aria-label="Low stock alerts">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber" /> Low stock alerts</h2>
        {loading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : lowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">All published products are well stocked.</p>
        ) : (
          <ul className="divide-y">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{p.title}</span>
                <span className={p.stock === 0 ? "font-semibold text-destructive" : "font-medium text-amber-foreground"}>
                  {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
