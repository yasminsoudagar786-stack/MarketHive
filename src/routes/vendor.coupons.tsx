import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { getCoupons, saveCoupon } from "@/api";
import { EmptyState, ErrorState, PageTitle } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inr } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";
import type { Coupon } from "@/types";

export const Route = createFileRoute("/vendor/coupons")({
  head: () => ({ meta: [{ title: "Vendor coupons — MarketHive" }] }),
  component: VendorCoupons,
});

type Draft = { code: string; type: "percent" | "flat"; value: string; minOrder: string; expiresAt: string; active: boolean };
const today = () => new Date().toISOString().slice(0, 10);
const isExpired = (c: Coupon) => new Date(c.expiresAt) < new Date(today());

function VendorCoupons() {
  const vendorId = useAuth((s) => s.user?.vendorId);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["coupons"], queryFn: getCoupons, enabled: !!vendorId });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [d, setD] = useState<Draft>({ code: "", type: "percent", value: "", minOrder: "0", expiresAt: "", active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (c: Coupon) => saveCoupon(c),
    onSuccess: (_c, vars) => {
      toast.success(editing ? "Coupon updated" : `Coupon ${vars.code} created`);
      qc.invalidateQueries({ queryKey: ["coupons"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save the coupon"),
  });

  if (!vendorId) return <EmptyState title="No vendor profile yet" description="Complete onboarding to create coupons." />;
  if (q.isError) return <ErrorState message="Couldn't load coupons." onRetry={() => q.refetch()} />;

  const mine = (q.data ?? []).filter((c) => c.vendorId === vendorId);

  const openNew = () => {
    setEditing(null);
    setD({ code: "", type: "percent", value: "", minOrder: "0", expiresAt: "", active: true });
    setErrors({});
    setOpen(true);
  };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setD({ code: c.code, type: c.type, value: String(c.value), minOrder: String(c.minOrder), expiresAt: c.expiresAt.slice(0, 10), active: c.active });
    setErrors({});
    setOpen(true);
  };

  const submit = () => {
    const e: Record<string, string> = {};
    const value = Number(d.value);
    const minOrder = Number(d.minOrder);
    if (!/^[A-Z0-9]{4,20}$/.test(d.code)) e.code = "Use 4 to 20 capital letters or digits";
    else if (!editing && (q.data ?? []).some((c) => c.code === d.code)) e.code = "This code already exists";
    if (!(value > 0)) e.value = "Enter a value greater than 0";
    else if (d.type === "percent" && (value > 90 || !Number.isInteger(value))) e.value = "Percent must be a whole number from 1 to 90";
    if (!(minOrder >= 0)) e.minOrder = "Enter 0 or more";
    if (!d.expiresAt) e.expiresAt = "Choose an expiry date";
    else if (!editing && d.expiresAt < today()) e.expiresAt = "Expiry can't be in the past";
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({ code: d.code, type: d.type, value, minOrder, expiresAt: d.expiresAt, active: d.active, vendorId });
  };

  const err = (k: string) => errors[k] && <p role="alert" className="mt-1 text-xs text-destructive">{errors[k]}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle sub="Offer discounts on your products only.">Coupons</PageTitle>
        <Button variant="hero" onClick={openNew}><Plus className="h-4 w-4" /> New coupon</Button>
      </div>

      {q.isLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : mine.length === 0 ? (
        <EmptyState title="No coupons yet" description="Create a coupon to bring in more customers." action={<Button variant="hero" onClick={openNew}>New coupon</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="text-right">Min order</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mine.map((c) => (
                <TableRow key={c.code}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell>{c.type === "percent" ? `${c.value}% off` : `${inr(c.value)} off`}</TableCell>
                  <TableCell className="text-right">{inr(c.minOrder)}</TableCell>
                  <TableCell>
                    {new Date(c.expiresAt).toLocaleDateString("en-IN")}
                    {isExpired(c) && <span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">Expired</span>}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={c.active}
                      disabled={save.isPending || isExpired(c)}
                      onCheckedChange={(on) => save.mutate({ ...c, active: on })}
                      aria-label={`Toggle ${c.code}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" aria-label={`Edit ${c.code}`} onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.code}` : "New coupon"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={d.code} disabled={!!editing} maxLength={20} onChange={(e) => setD({ ...d, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="SAVE15" />
              {err("code")}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ctype">Type</Label>
                <select id="ctype" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as Draft["type"] })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="percent">Percent off</option>
                  <option value="flat">Flat amount off</option>
                </select>
              </div>
              <div>
                <Label htmlFor="cvalue">{d.type === "percent" ? "Percent (%)" : "Amount (₹)"}</Label>
                <Input id="cvalue" type="number" min="0" value={d.value} onChange={(e) => setD({ ...d, value: e.target.value })} />
                {err("value")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cmin">Minimum order (₹)</Label>
                <Input id="cmin" type="number" min="0" value={d.minOrder} onChange={(e) => setD({ ...d, minOrder: e.target.value })} />
                {err("minOrder")}
              </div>
              <div>
                <Label htmlFor="cexp">Expires on</Label>
                <Input id="cexp" type="date" value={d.expiresAt} onChange={(e) => setD({ ...d, expiresAt: e.target.value })} />
                {err("expiresAt")}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="cactive" checked={d.active} onCheckedChange={(on) => setD({ ...d, active: on })} />
              <Label htmlFor="cactive" className={cn(!d.active && "text-muted-foreground")}>{d.active ? "Active" : "Inactive"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="hero" disabled={save.isPending} onClick={submit}>{save.isPending ? "Saving..." : "Save coupon"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
