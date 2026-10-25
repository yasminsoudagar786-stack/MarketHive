import { createFileRoute, Link, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, MessageSquare, Package, ShoppingBag, Ticket, Wallet } from "lucide-react";
import { ProtectedRoute } from "@/components/Protected";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

export const Route = createFileRoute("/vendor")({
  head: () => ({ meta: [{ title: "Vendor dashboard — MarketHive" }] }),
  component: () => (
    <ProtectedRoute roles={["vendor"]}>
      <VendorLayout />
    </ProtectedRoute>
  ),
});

const NAV = [
  { to: "/vendor", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/vendor/products", label: "Products", icon: Package, exact: false },
  { to: "/vendor/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { to: "/vendor/payouts", label: "Payouts", icon: Wallet, exact: false },
  { to: "/vendor/reviews", label: "Reviews", icon: MessageSquare, exact: false },
  { to: "/vendor/coupons", label: "Coupons", icon: Ticket, exact: false },
] as const;

function VendorLayout() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const user = useAuth((s) => s.user);

  // A signed-in vendor with no store yet must finish onboarding first.
  if (user && !user.vendorId && !pathname.startsWith("/vendor/onboarding")) {
    return <Navigate to="/vendor/onboarding" replace />;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:gap-8">
      <aside className="md:w-56 md:shrink-0">
        <p className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">
          Vendor
        </p>
        <nav className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Vendor navigation">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to || pathname === `${to}/` : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-gradient-brand text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}