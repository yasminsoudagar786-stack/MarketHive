import { Star, AlertTriangle, PackageOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={cn(i <= Math.round(value) ? "fill-amber text-amber" : "text-muted-foreground/40")} />
      ))}
    </span>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight" aria-label="MarketHive home">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">⬢</span>
      <span>Market<span className="text-gradient-brand">Hive</span></span>
    </Link>
  );
}

export function ErrorState({ message = "Something went wrong", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground"><PackageOpen className="h-7 w-7" /></div>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border bg-card p-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    delivered: "bg-success/15 text-success", shipped: "bg-primary/15 text-primary", packed: "bg-amber/20 text-amber-foreground",
    placed: "bg-secondary text-secondary-foreground", cancelled: "bg-destructive/15 text-destructive", returned: "bg-destructive/15 text-destructive",
    approved: "bg-success/15 text-success", pending: "bg-amber/20 text-amber-foreground", suspended: "bg-destructive/15 text-destructive",
    rejected: "bg-destructive/15 text-destructive", paid: "bg-success/15 text-success", published: "bg-success/15 text-success", draft: "bg-muted text-muted-foreground",
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", tone[status] ?? "bg-muted")}>{status}</span>;
}
