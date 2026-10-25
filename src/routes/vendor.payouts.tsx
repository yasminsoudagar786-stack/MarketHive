import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPayouts } from "@/api";
import { EmptyState, ErrorState, PageTitle, StatusBadge } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inr } from "@/lib/pricing";
import { useAuth } from "@/stores/auth";

export const Route = createFileRoute("/vendor/payouts")({
  head: () => ({ meta: [{ title: "Vendor payouts — MarketHive" }] }),
  component: VendorPayouts,
});

// Each payout row: `amount` = sales in the period, `commission` = platform cut. Net = amount - commission.
function VendorPayouts() {
  const vendorId = useAuth((s) => s.user?.vendorId);
  const q = useQuery({ queryKey: ["vendor", "payouts", vendorId], queryFn: () => getPayouts(vendorId!), enabled: !!vendorId });

  if (!vendorId) return <EmptyState title="No vendor profile yet" description="Complete onboarding to see your payouts." />;
  if (q.isError) return <ErrorState message="Couldn't load payouts." onRetry={() => q.refetch()} />;

  const rows = [...(q.data ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const sum = (f: (p: (typeof rows)[number]) => number) => rows.reduce((a, p) => a + f(p), 0);
  const paid = sum((p) => (p.status === "paid" ? p.amount - p.commission : 0));
  const pending = sum((p) => (p.status === "pending" ? p.amount - p.commission : 0));
  const commission = sum((p) => p.commission);

  const cards: [string, number][] = [["Total paid out", paid], ["Pending payout", pending], ["Commission deducted", commission]];

  return (
    <div>
      <PageTitle sub="Your earnings after MarketHive's commission.">Payouts</PageTitle>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {q.isLoading
          ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : cards.map(([label, value]) => (
              <div key={label} className="rounded-2xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{inr(value)}</p>
              </div>
            ))}
      </div>

      {q.isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <EmptyState title="No payouts yet" description="Payouts appear here once you make sales." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Net payout</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                  <TableCell className="text-right">{inr(p.amount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">-{inr(p.commission)}</TableCell>
                  <TableCell className="text-right font-medium">{inr(p.amount - p.commission)}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
