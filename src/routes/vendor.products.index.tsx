import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct, getVendorProducts, saveProduct } from "@/api";
import { EmptyState, ErrorState, PageTitle, StatusBadge } from "@/components/common";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inr } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

export const Route = createFileRoute("/vendor/products/")({
  head: () => ({ meta: [{ title: "Vendor products — MarketHive" }] }),
  component: VendorProducts,
});

type StatusFilter = "all" | "published" | "draft";
type BulkAction = { type: "publish" | "draft" | "delete"; ids: string[] };

function VendorProducts() {
  const vendorId = useAuth((s) => s.user?.vendorId);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string[] | null>(null);

  const q = useQuery({ queryKey: ["vendor", "products", vendorId], queryFn: () => getVendorProducts(vendorId!), enabled: !!vendorId });

  const bulk = useMutation({
    mutationFn: async ({ type, ids }: BulkAction) => {
      if (type === "delete") {
        await Promise.all(ids.map((id) => deleteProduct(id)));
      } else {
        const targets = (q.data ?? []).filter((p) => ids.includes(p.id));
        await Promise.all(targets.map((p) => saveProduct({ ...p, status: type === "publish" ? "published" : "draft" })));
      }
      return { type, count: ids.length };
    },
    onSuccess: ({ type, count }) => {
      const verb = type === "delete" ? "deleted" : type === "publish" ? "published" : "moved to draft";
      toast.success(`${count} product${count === 1 ? "" : "s"} ${verb}`);
      setSelected([]);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["vendor", "products"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (q.data ?? [])
      .filter((p) => filter === "all" || p.status === filter)
      .filter((p) => !term || p.title.toLowerCase().includes(term) || p.category.includes(term));
  }, [q.data, search, filter]);

  if (!vendorId) return <EmptyState title="No vendor profile yet" description="Complete onboarding to start adding products." />;
  if (q.isError) return <ErrorState message="Couldn't load your products." onRetry={() => q.refetch()} />;

  const visibleIds = rows.map((p) => p.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const someSelected = visibleIds.some((id) => selected.includes(id));
  const toggleOne = (id: string, on: boolean) => setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  const toggleAll = (on: boolean) => setSelected(on ? Array.from(new Set([...selected, ...visibleIds])) : selected.filter((id) => !visibleIds.includes(id)));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle sub="Create, edit, publish and remove your products.">Products</PageTitle>
        <Button asChild variant="hero">
          <Link to="/vendor/products/$id" params={{ id: "new" }}><Plus className="h-4 w-4" /> Add product</Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="pl-9" aria-label="Search products" />
        </div>
        <div className="flex gap-2" role="group" aria-label="Filter by status">
          {(["all", "published", "draft"] as const).map((f) => (
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
      </div>

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-accent/50 px-3 py-2 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate({ type: "publish", ids: selected })}>Publish</Button>
          <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate({ type: "draft", ids: selected })}>Move to draft</Button>
          <Button size="sm" variant="outline" className="text-destructive" disabled={bulk.isPending} onClick={() => setConfirm(selected)}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      {q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={q.data?.length ? "No products match" : "No products yet"}
          description={q.data?.length ? "Try a different search or filter." : "Add your first product to start selling."}
          action={!q.data?.length ? <Button asChild variant="hero"><Link to="/vendor/products/$id" params={{ id: "new" }}>Add product</Link></Button> : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected ? true : someSelected ? "indeterminate" : false} onCheckedChange={(c) => toggleAll(c === true)} aria-label="Select all products" />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} data-state={selected.includes(p.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={selected.includes(p.id)} onCheckedChange={(c) => toggleOne(p.id, c === true)} aria-label={`Select ${p.title}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={p.images[0]} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      <span className="max-w-[220px] truncate font-medium">{p.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{p.category}</TableCell>
                  <TableCell className="text-right">{inr(p.price)}</TableCell>
                  <TableCell className={cn("text-right", p.stock === 0 && "font-semibold text-destructive")}>{p.stock}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={p.status === "published"}
                        disabled={bulk.isPending}
                        onCheckedChange={(on) => bulk.mutate({ type: on ? "publish" : "draft", ids: [p.id] })}
                        aria-label={`Publish ${p.title}`}
                      />
                      <StatusBadge status={p.status} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost" aria-label={`Edit ${p.title}`}>
                        <Link to="/vendor/products/$id" params={{ id: p.id }}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" aria-label={`Delete ${p.title}`} onClick={() => setConfirm([p.id])}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirm?.length === 1 ? "this product" : `${confirm?.length} products`}?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone. The product will disappear from the store right away.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && bulk.mutate({ type: "delete", ids: confirm })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
