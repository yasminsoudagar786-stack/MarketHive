import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type DragEvent } from "react";
import { ArrowLeft, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { getCategories, getProduct, saveProduct, uploadImage } from "@/api";
import { EmptyState, ErrorState, PageTitle } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";
import type { CategorySlug, Product } from "@/types";

export const Route = createFileRoute("/vendor/products/$id")({
  head: () => ({ meta: [{ title: "Edit product — MarketHive" }] }),
  component: ProductEditorPage,
});

const MAX_IMAGES = 8;
const MAX_SIZE = 5 * 1024 * 1024;

type VariantRow = { id: string; size: string; color: string; stock: string; priceDelta: string };

function ProductEditorPage() {
  const { id } = Route.useParams();
  const vendorId = useAuth((s) => s.user?.vendorId);
  const isNew = id === "new";
  const q = useQuery({ queryKey: ["product", id], queryFn: () => getProduct(id), enabled: !isNew });

  if (!vendorId) return <EmptyState title="No vendor profile yet" description="Complete onboarding to start adding products." />;
  if (!isNew) {
    if (q.isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
    if (q.isError || !q.data) return <ErrorState message="Product not found." onRetry={() => q.refetch()} />;
    if (q.data.vendorId !== vendorId) return <ErrorState message="You can only edit your own products." />;
  }
  return <Editor key={id} initial={isNew ? undefined : q.data} vendorId={vendorId} />;
}

function Editor({ initial, vendorId }: { initial?: Product; vendorId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<string>(initial?.category ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [mrp, setMrp] = useState(initial ? String(initial.mrp) : "");
  const [stock, setStock] = useState(initial ? String(initial.stock) : "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [published, setPublished] = useState(initial ? initial.status === "published" : false);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [uploads, setUploads] = useState<Record<string, { name: string; pct: number }>>({});
  const [dragging, setDragging] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>(
    initial?.variants.map((v) => ({ id: v.id, size: v.size ?? "", color: v.color ?? "", stock: String(v.stock), priceDelta: String(v.priceDelta) })) ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (p: Product) => saveProduct(p),
    onSuccess: () => {
      toast.success(initial ? "Product updated" : "Product created");
      qc.invalidateQueries({ queryKey: ["vendor", "products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      navigate({ to: "/vendor/products" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save the product"),
  });

  const addFiles = async (incoming: FileList | File[]) => {
    const all = Array.from(incoming);
    const imagesOnly = all.filter((f) => f.type.startsWith("image/"));
    if (imagesOnly.length < all.length) toast.error("Only image files are allowed");
    const sized = imagesOnly.filter((f) => f.size <= MAX_SIZE);
    if (sized.length < imagesOnly.length) toast.error("Each image must be 5 MB or smaller");
    const room = MAX_IMAGES - images.length - Object.keys(uploads).length;
    if (sized.length > room) toast.error(`You can add up to ${MAX_IMAGES} images`);

    await Promise.all(
      sized.slice(0, Math.max(room, 0)).map(async (file) => {
        const key = `${file.name}-${file.size}-${Math.random()}`;
        setUploads((u) => ({ ...u, [key]: { name: file.name, pct: 0 } }));
        try {
          const { url } = await uploadImage(file, (pct) => setUploads((u) => (u[key] ? { ...u, [key]: { name: file.name, pct } } : u)));
          setImages((prev) => [...prev, url]);
        } catch {
          toast.error(`Upload failed: ${file.name}`);
        } finally {
          setUploads((u) => { const next = { ...u }; delete next[key]; return next; });
        }
      }),
    );
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const p = Number(price);
    const m = Number(mrp);
    const s = Number(stock);
    if (title.trim().length < 3) e.title = "Title must be at least 3 characters";
    if (description.trim().length < 10) e.description = "Add a description of at least 10 characters";
    if (!category) e.category = "Choose a category";
    if (!price || !(p > 0)) e.price = "Enter a price greater than 0";
    if (!mrp || !(m >= p)) e.mrp = "MRP must be at least the selling price";
    if (stock === "" || !Number.isInteger(s) || s < 0) e.stock = "Enter a whole number, 0 or more";
    if (images.length === 0) e.images = "Add at least one image";
    if (Object.keys(uploads).length > 0) e.images = "Wait for uploads to finish";
    return e;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { toast.error("Please fix the highlighted fields"); return; }
    const pid = initial?.id ?? `p${Date.now()}`;
    const product: Product = {
      id: pid,
      title: title.trim(),
      description: description.trim(),
      category: category as CategorySlug,
      vendorId,
      price: Number(price),
      mrp: Number(mrp),
      images,
      rating: initial?.rating ?? 0,
      reviewCount: initial?.reviewCount ?? 0,
      stock: Number(stock),
      variants: variants
        .filter((v) => v.size.trim() || v.color.trim())
        .map((v, i) => ({
          id: v.id || `${pid}-v${i}`,
          size: v.size.trim() || undefined,
          color: v.color.trim() || undefined,
          stock: Number(v.stock) || 0,
          priceDelta: Number(v.priceDelta) || 0,
        })),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      status: published ? "published" : "draft",
    };
    save.mutate(product);
  };

  const setVariant = (i: number, patch: Partial<VariantRow>) => setVariants((vs) => vs.map((v, k) => (k === i ? { ...v, ...patch } : v)));
  const fieldErr = (k: string) => errors[k] && <p role="alert" className="mt-1 text-xs text-destructive">{errors[k]}</p>;
  const uploading = Object.values(uploads);

  return (
    <div>
      <Link to="/vendor/products" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>
      <PageTitle>{initial ? "Edit product" : "Add product"}</PageTitle>

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Basic details</h2>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} />
            {fieldErr("title")}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={!!errors.description} />
            {fieldErr("description")}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                aria-invalid={!!errors.category}
              >
                <option value="">Select a category</option>
                {(cats.data ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
              {fieldErr("category")}
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="bestseller, new" />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Pricing and inventory</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="price">Selling price (₹)</Label>
              <Input id="price" type="number" min="0" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={!!errors.price} />
              {fieldErr("price")}
            </div>
            <div>
              <Label htmlFor="mrp">MRP (₹)</Label>
              <Input id="mrp" type="number" min="0" inputMode="decimal" value={mrp} onChange={(e) => setMrp(e.target.value)} aria-invalid={!!errors.mrp} />
              {fieldErr("mrp")}
            </div>
            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" min="0" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} aria-invalid={!!errors.stock} />
              {fieldErr("stock")}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div>
            <h2 className="font-semibold">Images</h2>
            <p className="text-xs text-muted-foreground">The first image is the cover. Up to {MAX_IMAGES} images, 5 MB each.</p>
          </div>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
              dragging ? "border-primary bg-accent" : "hover:bg-accent/50",
              errors.images && "border-destructive",
            )}
          >
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Drag and drop images here, or click to browse</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }}
            />
          </label>
          {fieldErr("images")}

          {uploading.length > 0 && (
            <ul className="space-y-2" aria-label="Uploads in progress">
              {uploading.map((u, i) => (
                <li key={`${u.name}-${i}`} className="text-xs">
                  <div className="mb-1 flex justify-between"><span className="truncate">{u.name}</span><span>{u.pct}%</span></div>
                  <Progress value={u.pct} />
                </li>
              ))}
            </ul>
          )}

          {images.length > 0 && (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {images.map((src, i) => (
                <li key={`${src}-${i}`} className="relative">
                  <img src={src} alt={`Product image ${i + 1}`} className="aspect-square w-full rounded-xl border object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">Cover</span>}
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, k) => k !== i))}
                    className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Variants (optional)</h2>
              <p className="text-xs text-muted-foreground">Sizes or colours with their own stock. Rows with no size and no colour are ignored.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setVariants((vs) => [...vs, { id: "", size: "", color: "", stock: "0", priceDelta: "0" }])}>
              <Plus className="h-4 w-4" /> Add variant
            </Button>
          </div>
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-5">
              <div><Label htmlFor={`vs-${i}`}>Size</Label><Input id={`vs-${i}`} value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} placeholder="M" /></div>
              <div><Label htmlFor={`vc-${i}`}>Colour</Label><Input id={`vc-${i}`} value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} placeholder="Black" /></div>
              <div><Label htmlFor={`vk-${i}`}>Stock</Label><Input id={`vk-${i}`} type="number" min="0" value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} /></div>
              <div><Label htmlFor={`vp-${i}`}>Price +/- (₹)</Label><Input id={`vp-${i}`} type="number" value={v.priceDelta} onChange={(e) => setVariant(i, { priceDelta: e.target.value })} /></div>
              <Button type="button" variant="ghost" size="icon" className="text-destructive" aria-label={`Remove variant ${i + 1}`} onClick={() => setVariants((vs) => vs.filter((_, k) => k !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <Switch id="published" checked={published} onCheckedChange={setPublished} />
            <Label htmlFor="published">{published ? "Published: visible to customers" : "Draft: hidden from customers"}</Label>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild><Link to="/vendor/products">Cancel</Link></Button>
            <Button type="submit" variant="hero" disabled={save.isPending || uploading.length > 0}>
              {save.isPending ? "Saving..." : initial ? "Save changes" : "Create product"}
            </Button>
          </div>
        </section>
      </form>
    </div>
  );
}
