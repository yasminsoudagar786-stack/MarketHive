import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getVendor, searchProducts } from "@/api";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorState, GridSkeleton, Stars } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/store/$vendorId")({
  head: () => ({ meta: [{ title: "Seller storefront — MarketHive" }, { name: "description", content: "Browse every product from this MarketHive seller." }, { property: "og:title", content: "Seller storefront — MarketHive" }, { property: "og:description", content: "Shop this seller on MarketHive." }] }),
  component: Storefront,
});

function Storefront() {
  const { vendorId } = Route.useParams();
  const v = useQuery({ queryKey: ["vendor", vendorId], queryFn: () => getVendor(vendorId) });
  const products = useQuery({ queryKey: ["search", { vendor: vendorId }], queryFn: () => searchProducts({ vendor: vendorId }) });
  if (v.isError) return <div className="mx-auto max-w-xl p-8"><ErrorState message="Store not found" onRetry={() => v.refetch()} /></div>;
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      {v.isLoading ? <Skeleton className="h-56 rounded-3xl" /> : (
        <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
          <img src={v.data!.banner} alt="" className="h-40 w-full object-cover md:h-56" />
          <div className="flex flex-wrap items-center gap-4 p-6">
            <img src={v.data!.logo} alt="" className="-mt-14 h-20 w-20 rounded-2xl border-4 border-card" />
            <div className="flex-1"><h1 className="text-2xl font-bold">{v.data!.name}</h1><p className="text-sm text-muted-foreground">{v.data!.description}</p></div>
            <div className="text-right"><Stars value={v.data!.rating} /><p className="text-xs text-muted-foreground">{v.data!.rating} · {v.data!.reviewCount} reviews</p></div>
          </div>
        </div>
      )}
      {products.isLoading ? <GridSkeleton /> : products.data?.items.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{products.data.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      ) : <EmptyState title="No products yet" />}
    </div>
  );
}
