import { http, mock, USE_MOCK, ApiError } from "./client";
import { getDb, CATEGORIES } from "./mock/data";
import { priceBreakdown } from "@/lib/pricing";
import type {
  Address, AuthResponse, Category, Coupon, Order, OrderStatus, Paginated, Payment, Payout,
  Product, Review, Role, SearchParams, User, Vendor, CartItem,
} from "@/types";

const PAGE_SIZE = 12;
const get = <T,>(url: string, params?: object) => http.get<T>(url, { params }).then((r) => r.data);
const post = <T,>(url: string, body?: unknown) => http.post<T>(url, body).then((r) => r.data);
const patch = <T,>(url: string, body?: unknown) => http.patch<T>(url, body).then((r) => r.data);
const strip = ({ password: _p, ...u }: User & { password: string }): User => u;

// ---------- Auth ----------
export const login = (email: string, password: string): Promise<AuthResponse> =>
  USE_MOCK
    ? mock(() => {
        const u = getDb().users.find((x) => x.email === email && x.password === password);
        if (!u) throw new ApiError("Invalid email or password", 401);
        return { token: `mock.${u.id}.${Date.now()}`, user: strip(u) };
      }, { failRate: 0 })
    : post("/auth/login", { email, password });

export const register = (input: { name: string; email: string; password: string; role: Role }): Promise<AuthResponse> =>
  USE_MOCK
    ? mock(() => {
        const db = getDb();
        if (db.users.some((u) => u.email === input.email)) throw new ApiError("Email already registered", 409);
        const u = { ...input, id: `u${db.users.length + 1}` };
        db.users.push(u);
        return { token: `mock.${u.id}`, user: strip(u) };
      }, { failRate: 0 })
    : post("/auth/register", input);

export const forgotPassword = (email: string): Promise<{ ok: true }> =>
  USE_MOCK ? mock(() => ({ ok: true as const }), { failRate: 0 }) : post("/auth/forgot-password", { email });

// ---------- Catalog ----------
export const getCategories = (): Promise<Category[]> => (USE_MOCK ? mock(() => CATEGORIES, { failRate: 0 }) : get("/categories"));

export const searchProducts = (p: SearchParams): Promise<Paginated<Product>> =>
  USE_MOCK
    ? mock(() => {
        let items = getDb().products.filter((x) => x.status === "published");
        if (p.q) { const q = p.q.toLowerCase(); items = items.filter((x) => (x.title + x.category + x.tags.join(" ")).toLowerCase().includes(q)); }
        if (p.category) items = items.filter((x) => x.category === p.category);
        if (p.vendor) items = items.filter((x) => x.vendorId === p.vendor);
        if (p.minPrice != null) items = items.filter((x) => x.price >= p.minPrice!);
        if (p.maxPrice != null) items = items.filter((x) => x.price <= p.maxPrice!);
        if (p.rating) items = items.filter((x) => x.rating >= p.rating!);
        if (p.inStock) items = items.filter((x) => x.stock > 0);
        if (p.discount) items = items.filter((x) => (x.mrp - x.price) / x.mrp * 100 >= p.discount!);
        const sorters: Record<string, (a: Product, b: Product) => number> = {
          price_asc: (a, b) => a.price - b.price, price_desc: (a, b) => b.price - a.price,
          newest: (a, b) => b.createdAt.localeCompare(a.createdAt), rating: (a, b) => b.rating - a.rating,
        };
        if (p.sort && sorters[p.sort]) items = [...items].sort(sorters[p.sort]);
        const page = p.page ?? 1;
        return { items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: items.length, page, pageSize: PAGE_SIZE };
      })
    : get("/products/search", p);

export const suggest = (q: string): Promise<string[]> =>
  USE_MOCK
    ? mock(() => getDb().products.filter((x) => x.title.toLowerCase().includes(q.toLowerCase())).slice(0, 6).map((x) => x.title), { ms: 120, failRate: 0 })
    : get("/products/suggest", { q });

export const getProduct = (id: string): Promise<Product> =>
  USE_MOCK
    ? mock(() => { const x = getDb().products.find((p) => p.id === id); if (!x) throw new ApiError("Not found", 404); return x; }, { failRate: 0 })
    : get(`/products/${id}`);

export const getProductsByIds = (ids: string[]): Promise<Product[]> =>
  USE_MOCK ? mock(() => getDb().products.filter((p) => ids.includes(p.id)), { failRate: 0, ms: 100 }) : get("/products", { ids: ids.join(",") });

export const getRelated = (id: string): Promise<Product[]> =>
  USE_MOCK
    ? mock(() => { const db = getDb(); const p = db.products.find((x) => x.id === id); return db.products.filter((x) => x.category === p?.category && x.id !== id).slice(0, 4); }, { failRate: 0 })
    : get(`/products/${id}/related`);

export const getReviews = (productId: string): Promise<Review[]> =>
  USE_MOCK ? mock(() => getDb().reviews.filter((r) => r.productId === productId), { failRate: 0 }) : get(`/products/${productId}/reviews`);

export const createReview = (productId: string, body: { rating: number; text: string }): Promise<Review> =>
  USE_MOCK
    ? mock(() => { const r: Review = { id: `r${Date.now()}`, productId, userName: "You", helpful: 0, verified: true, createdAt: new Date().toISOString(), ...body }; getDb().reviews.unshift(r); return r; }, { failRate: 0 })
    : post(`/products/${productId}/reviews`, body);

export const voteHelpful = (reviewId: string): Promise<{ ok: true }> =>
  USE_MOCK ? mock(() => { const r = getDb().reviews.find((x) => x.id === reviewId); if (r) r.helpful++; return { ok: true as const }; }, { failRate: 0, ms: 100 }) : post(`/reviews/${reviewId}/helpful`);

export const replyReview = (reviewId: string, reply: string): Promise<Review> =>
  USE_MOCK ? mock(() => { const r = getDb().reviews.find((x) => x.id === reviewId)!; r.vendorReply = reply; return r; }, { failRate: 0 }) : post(`/reviews/${reviewId}/reply`, { reply });

// ---------- Vendors ----------
export const getVendors = (): Promise<Vendor[]> => (USE_MOCK ? mock(() => getDb().vendors, { failRate: 0 }) : get("/vendors"));
export const getVendor = (id: string): Promise<Vendor> =>
  USE_MOCK ? mock(() => { const v = getDb().vendors.find((x) => x.id === id); if (!v) throw new ApiError("Not found", 404); return v; }, { failRate: 0 }) : get(`/vendors/${id}`);
export const updateVendor = (id: string, body: Partial<Vendor>): Promise<Vendor> =>
  USE_MOCK ? mock(() => { const v = getDb().vendors.find((x) => x.id === id)!; Object.assign(v, body); return v; }, { failRate: 0 }) : patch(`/admin/vendors/${id}`, body);

// ---------- Coupons ----------
export const validateCoupon = (code: string, subtotal: number): Promise<Coupon> =>
  USE_MOCK
    ? mock(() => {
        const c = getDb().coupons.find((x) => x.code === code.toUpperCase());
        if (!c) throw new ApiError("Coupon not found");
        if (!c.active || new Date(c.expiresAt) < new Date()) throw new ApiError("Coupon has expired");
        if (subtotal < c.minOrder) throw new ApiError(`Minimum order ₹${c.minOrder} required`);
        return c;
      }, { failRate: 0 })
    : post("/coupons/validate", { code, subtotal });

export const getCoupons = (): Promise<Coupon[]> => (USE_MOCK ? mock(() => getDb().coupons, { failRate: 0 }) : get("/coupons"));
export const saveCoupon = (c: Coupon): Promise<Coupon> =>
  USE_MOCK ? mock(() => { const db = getDb(); const i = db.coupons.findIndex((x) => x.code === c.code); if (i >= 0) db.coupons[i] = c; else db.coupons.unshift(c); return c; }, { failRate: 0 }) : post("/coupons", c);

// ---------- Checkout / Orders ----------
export const createPaymentIntent = (amount: number, provider: Payment["provider"]): Promise<Payment> =>
  USE_MOCK ? mock(() => ({ id: `pay_${Date.now()}`, provider, status: "created" as const, amount }), { failRate: 0 }) : post("/payments/intent", { amount, provider });

export const placeOrder = (body: { items: CartItem[]; address: Address; couponCode?: string; paymentId: string }): Promise<Order> =>
  USE_MOCK
    ? mock(() => {
        const db = getDb();
        const lines = body.items.map((i) => ({ i, p: db.products.find((x) => x.id === i.productId)! }));
        const byVendor = new Map<string, typeof lines>();
        lines.forEach((l) => byVendor.set(l.p.vendorId, [...(byVendor.get(l.p.vendorId) ?? []), l]));
        const subOrders = [...byVendor.entries()].map(([vendorId, ls], k) => {
          const subtotal = ls.reduce((s, l) => s + l.p.price * l.i.qty, 0);
          const pct = db.vendors.find((v) => v.id === vendorId)?.commissionPct ?? db.settings.commissionPct;
          return { id: `so-${Date.now()}-${k}`, vendorId, status: "placed" as OrderStatus, subtotal, commission: Math.round((subtotal * pct) / 100),
            items: ls.map((l) => ({ productId: l.p.id, title: l.p.title, image: l.p.images[0], price: l.p.price, qty: l.i.qty })) };
        });
        const coupon = db.coupons.find((c) => c.code === body.couponCode);
        const b = priceBreakdown(subOrders.reduce((s, x) => s + x.subtotal, 0), coupon);
        const order: Order = { id: `MH${10300 + db.orders.length}`, userId: "u1", createdAt: new Date().toISOString(), address: body.address, subOrders, ...b,
          status: "placed", payment: { id: body.paymentId, provider: "razorpay", status: "succeeded", amount: b.total } };
        db.orders.unshift(order);
        return order;
      }, { failRate: 0 })
    : post("/orders", body);

export const getOrders = (): Promise<Order[]> => (USE_MOCK ? mock(() => getDb().orders) : get("/orders"));
export const getOrder = (id: string): Promise<Order> =>
  USE_MOCK ? mock(() => { const o = getDb().orders.find((x) => x.id === id); if (!o) throw new ApiError("Not found", 404); return o; }, { failRate: 0 }) : get(`/orders/${id}`);
export const updateOrderStatus = (id: string, status: OrderStatus): Promise<Order> =>
  USE_MOCK ? mock(() => { const o = getDb().orders.find((x) => x.id === id)!; o.status = status; o.subOrders.forEach((s) => (s.status = status)); return o; }, { failRate: 0 }) : patch(`/orders/${id}/status`, { status });

export async function downloadInvoice(id: string): Promise<void> {
  let blob: Blob;
  if (USE_MOCK) {
    const o = await getOrder(id);
    const lines = o.subOrders.flatMap((s) => s.items.map((i) => `${i.title} x${i.qty}  Rs.${i.price * i.qty}`));
    blob = new Blob([`MarketHive Invoice ${o.id}\n\n${lines.join("\n")}\n\nTotal: Rs.${o.total}\n`], { type: "application/pdf" });
  } else {
    blob = (await http.get(`/orders/${id}/invoice`, { responseType: "blob" })).data;
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `invoice-${id}.pdf` });
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Vendor ----------
export const getVendorSubOrders = (vendorId: string) =>
  USE_MOCK
    ? mock(() => getDb().orders.flatMap((o) => o.subOrders.filter((s) => s.vendorId === vendorId).map((s) => ({ ...s, orderId: o.id, createdAt: o.createdAt, customer: o.address.name }))), { failRate: 0 })
    : get<(Order["subOrders"][number] & { orderId: string; createdAt: string; customer: string })[]>("/vendor/sub-orders");

export const updateSubOrder = (subOrderId: string, body: { status: OrderStatus; trackingNumber?: string }) =>
  USE_MOCK
    ? mock(() => { for (const o of getDb().orders) { const s = o.subOrders.find((x) => x.id === subOrderId); if (s) { Object.assign(s, body); return s; } } throw new ApiError("Not found", 404); }, { failRate: 0 })
    : patch(`/vendor/sub-orders/${subOrderId}`, body);

export const getVendorProducts = (vendorId: string): Promise<Product[]> =>
  USE_MOCK ? mock(() => getDb().products.filter((p) => p.vendorId === vendorId), { failRate: 0 }) : get("/vendor/products");

export const saveProduct = (p: Product): Promise<Product> =>
  USE_MOCK ? mock(() => { const db = getDb(); const i = db.products.findIndex((x) => x.id === p.id); if (i >= 0) db.products[i] = p; else db.products.unshift(p); return p; }, { failRate: 0 }) : post("/vendor/products", p);

export const deleteProduct = (id: string): Promise<{ ok: true }> =>
  USE_MOCK ? mock(() => { const db = getDb(); db.products = db.products.filter((p) => p.id !== id); return { ok: true as const }; }, { failRate: 0 }) : http.delete(`/vendor/products/${id}`).then((r) => r.data);

/** S3 presigned-URL flow: request URL → PUT file (progress) → return storage key. */
export async function uploadImage(file: File, onProgress: (pct: number) => void): Promise<{ key: string; url: string }> {
  if (USE_MOCK) {
    for (let p = 0; p <= 100; p += 20) { onProgress(p); await new Promise((r) => setTimeout(r, 120)); }
    return { key: `uploads/${Date.now()}-${file.name}`, url: URL.createObjectURL(file) };
  }
  const { uploadUrl, key, publicUrl } = await post<{ uploadUrl: string; key: string; publicUrl: string }>("/uploads/presign", { filename: file.name, contentType: file.type });
  await http.put(uploadUrl, file, { headers: { "Content-Type": file.type, Authorization: undefined }, onUploadProgress: (e) => onProgress(Math.round(((e.loaded ?? 0) / (e.total ?? 1)) * 100)) });
  return { key, url: publicUrl };
}

export const getPayouts = (vendorId: string): Promise<Payout[]> =>
  USE_MOCK ? mock(() => getDb().payouts.filter((p) => p.vendorId === vendorId), { failRate: 0 }) : get("/vendor/payouts");

// ---------- Admin ----------
export const getAdminStats = () =>
  USE_MOCK
    ? mock(() => {
        const db = getDb();
        const gmv = db.orders.reduce((s, o) => s + o.total, 0);
        const commission = db.orders.reduce((s, o) => s + o.subOrders.reduce((a, x) => a + x.commission, 0), 0);
        const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
        return {
          gmv, commission, orders: db.orders.length, users: db.users.length + 1240, vendors: db.vendors.length,
          revenue: months.map((m, i) => ({ month: m, gmv: 180000 + i * 42000 + (i % 2) * 15000, commission: 21000 + i * 5000 })),
          byStatus: (["placed", "packed", "shipped", "delivered", "cancelled"] as OrderStatus[]).map((s) => ({ status: s, count: db.orders.filter((o) => o.status === s).length })),
          topCategories: CATEGORIES.map((c) => ({ name: c.name, value: db.products.filter((p) => p.category === c.slug).reduce((s, p) => s + p.reviewCount, 0) })),
          topVendors: db.vendors.slice(0, 6).map((v, i) => ({ name: v.name, gmv: 90000 - i * 11000, commission: Math.round((90000 - i * 11000) * v.commissionPct / 100) })),
        };
      }, { failRate: 0 })
    : get<never>("/admin/analytics");

export const getUsers = (): Promise<User[]> => (USE_MOCK ? mock(() => getDb().users.map(strip), { failRate: 0 }) : get("/admin/users"));
