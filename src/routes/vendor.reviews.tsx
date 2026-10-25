import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { getReviews, getVendorProducts, replyReview } from "@/api";
import { EmptyState, ErrorState, PageTitle, Stars } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

export const Route = createFileRoute("/vendor/reviews")({
  head: () => ({ meta: [{ title: "Vendor reviews — MarketHive" }] }),
  component: VendorReviews,
});

function VendorReviews() {
  const vendorId = useAuth((s) => s.user?.vendorId);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unanswered">("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [text, setText] = useState("");

  const products = useQuery({ queryKey: ["vendor", "products", vendorId], queryFn: () => getVendorProducts(vendorId!), enabled: !!vendorId });
  const results = useQueries({
    queries: (products.data ?? []).map((p) => ({ queryKey: ["reviews", p.id], queryFn: () => getReviews(p.id) })),
  });

  const loading = products.isLoading || results.some((r) => r.isLoading);
  const failed = products.isError || results.some((r) => r.isError);

  const all = useMemo(() => {
    const titles = new Map((products.data ?? []).map((p) => [p.id, p.title]));
    return results
      .flatMap((r) => r.data ?? [])
      .map((r) => ({ ...r, productTitle: titles.get(r.productId) ?? "Product" }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.data, results.map((r) => r.dataUpdatedAt).join(",")]);

  const reply = useMutation({
    mutationFn: (v: { id: string; text: string }) => replyReview(v.id, v.text),
    onSuccess: () => {
      toast.success("Reply posted");
      qc.invalidateQueries({ queryKey: ["reviews"] });
      setReplyingTo(null);
      setText("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't post your reply"),
  });

  if (!vendorId) return <EmptyState title="No vendor profile yet" description="Complete onboarding to see customer reviews." />;
  if (failed) return <ErrorState message="Couldn't load reviews." onRetry={() => { products.refetch(); results.forEach((r) => r.refetch()); }} />;

  const unanswered = all.filter((r) => !r.vendorReply).length;
  const avg = all.length ? all.reduce((a, r) => a + r.rating, 0) / all.length : 0;
  const shown = all.filter((r) => filter === "all" || !r.vendorReply);

  return (
    <div>
      <PageTitle sub="Read what customers say and reply publicly.">Reviews</PageTitle>

      {!loading && all.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 text-sm">
          <span className="flex items-center gap-2"><span className="text-2xl font-bold">{avg.toFixed(1)}</span><Stars value={avg} /></span>
          <span className="text-muted-foreground">{all.length} reviews, {unanswered} waiting for a reply</span>
        </div>
      )}

      <div className="mb-4 flex gap-2" role="group" aria-label="Filter reviews">
        {(["all", "unanswered"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn("rounded-full border px-3 py-1 text-sm capitalize transition-colors", filter === f ? "border-transparent bg-gradient-brand text-primary-foreground" : "hover:bg-accent")}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState title={filter === "all" ? "No reviews yet" : "All caught up"} description={filter === "all" ? "Reviews from your customers will show up here." : "Every review has a reply."} />
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Stars value={r.rating} />
                  <span className="font-medium">{r.userName}</span>
                  {r.verified && <span className="inline-flex items-center gap-1 text-xs text-success"><BadgeCheck className="h-3.5 w-3.5" /> Verified purchase</span>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">on {r.productTitle}</p>
              <p className="mt-2 text-sm">{r.text}</p>

              {r.vendorReply && (
                <div className="mt-3 rounded-xl bg-accent/60 p-3 text-sm">
                  <p className="mb-0.5 text-xs font-semibold">Your reply</p>
                  {r.vendorReply}
                </div>
              )}

              {replyingTo === r.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a polite, helpful reply" aria-label="Reply" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="hero" disabled={text.trim().length < 3 || reply.isPending} onClick={() => reply.mutate({ id: r.id, text: text.trim() })}>
                      {reply.isPending ? "Posting..." : "Post reply"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setText(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => { setReplyingTo(r.id); setText(r.vendorReply ?? ""); }}>
                  {r.vendorReply ? "Edit reply" : "Reply"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
