import type { Category, Coupon, Order, Payout, Product, Review, User, Vendor, CategorySlug } from "@/types";

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const img = (seed: string, w = 600, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const CATEGORIES: Category[] = (
  [["electronics", "Electronics"], ["fashion", "Fashion"], ["home", "Home"], ["beauty", "Beauty"],
   ["books", "Books"], ["sports", "Sports"], ["toys", "Toys"], ["grocery", "Grocery"]] as [CategorySlug, string][]
).map(([slug, name]) => ({ slug, name, image: img(`cat-${slug}`, 400, 400) }));

const NAMES: Record<CategorySlug, string[]> = {
  electronics: ["Wireless Earbuds Pro", "4K Smart TV 55\"", "Mechanical Keyboard", "Noise-Cancel Headphones", "Smartwatch S2", "Portable SSD 1TB", "Bluetooth Speaker", "Gaming Mouse"],
  fashion: ["Linen Shirt", "Slim Fit Jeans", "Leather Sneakers", "Cotton Kurta", "Denim Jacket", "Silk Saree", "Wool Scarf", "Running Tee"],
  home: ["Ceramic Vase Set", "Cotton Bedsheet", "Non-stick Cookware", "Table Lamp", "Wall Clock", "Air Purifier", "Storage Baskets", "Coffee Maker"],
  beauty: ["Vitamin C Serum", "Matte Lipstick", "Hair Dryer", "Sunscreen SPF 50", "Face Wash", "Perfume Oud", "Beard Oil"],
  books: ["The Silent Atlas", "Design of Everyday Code", "Midnight Rivers", "Startup Notes", "Learn TypeScript", "Poems of Rain", "History of Spice"],
  sports: ["Yoga Mat", "Adjustable Dumbbells", "Cricket Bat", "Football Size 5", "Cycling Helmet", "Badminton Racket", "Resistance Bands"],
  toys: ["Building Blocks 500pc", "RC Racing Car", "Plush Bear", "Puzzle 1000pc", "Wooden Train Set", "Science Kit", "Board Game Classic"],
  grocery: ["Organic Honey", "Basmati Rice 5kg", "Cold Brew Coffee", "Dark Chocolate", "Almonds 1kg", "Green Tea", "Olive Oil", "Masala Chai"],
};
const VENDOR_NAMES = ["TechNest", "UrbanThreads", "HomeCraft", "GlowLab", "PageTurner", "FitForge", "PlayPal", "FreshBasket", "GadgetGrove", "StyleSutra", "CozyCorner", "PeakGear"];

export interface Db {
  users: (User & { password: string })[]; vendors: Vendor[]; products: Product[];
  reviews: Review[]; orders: Order[]; coupons: Coupon[]; payouts: Payout[];
  settings: { commissionPct: number; taxPct: number; freeShippingOver: number; shippingFee: number };
}

let db: Db | null = null;
export function getDb(): Db {
  if (db) return db;
  const r = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const vendors: Vendor[] = VENDOR_NAMES.map((name, i) => ({
    id: `v${i + 1}`, name, slug: name.toLowerCase(), logo: img(`logo-${i}`, 200, 200), banner: img(`banner-${i}`, 1400, 400),
    rating: +(3.8 + r() * 1.2).toFixed(1), reviewCount: Math.floor(100 + r() * 2000),
    status: i === 11 ? "pending" : "approved", commissionPct: 10 + (i % 3) * 2,
    joinedAt: new Date(2024, i, 5).toISOString(), description: `${name} brings you curated quality products at honest prices.`,
  }));
  const products: Product[] = [];
  let n = 0;
  CATEGORIES.forEach((c, ci) => {
    NAMES[c.slug].forEach((title) => {
      n++;
      const price = Math.round((c.slug === "electronics" ? 1500 + r() * 40000 : 199 + r() * 4000) / 10) * 10 - 1;
      const mrp = Math.round(price * (1 + r() * 0.6));
      const isFashion = c.slug === "fashion" || c.slug === "sports";
      const variants = isFashion
        ? ["S", "M", "L", "XL"].map((size, k) => ({ id: `p${n}-v${k}`, size, color: pick(["Black", "Navy", "Olive"]), stock: Math.floor(r() * 20), priceDelta: 0 }))
        : c.slug === "electronics" ? ["Black", "White"].map((color, k) => ({ id: `p${n}-v${k}`, color, stock: Math.floor(r() * 15), priceDelta: k * 500 })) : [];
      products.push({
        id: `p${n}`, title, description: `${title} — thoughtfully made, rigorously tested and backed by a 7-day return policy. A favourite among MarketHive shoppers.`,
        category: c.slug, vendorId: vendors[(ci + n) % 12].id, price, mrp,
        images: [0, 1, 2, 3].map((k) => img(`p${n}-${k}`)), rating: +(3.2 + r() * 1.8).toFixed(1),
        reviewCount: Math.floor(r() * 900), stock: n % 11 === 0 ? 0 : Math.floor(2 + r() * 80), variants,
        tags: [c.slug, "bestseller"].slice(0, 1 + (n % 2)), createdAt: new Date(2026, n % 10, (n % 27) + 1).toISOString(), status: "published",
      });
    });
  });
  const texts = ["Exactly as described, great quality.", "Fast delivery and solid packaging.", "Good value for money.", "Decent, but expected a bit more.", "Absolutely love it! Would buy again."];
  const reviews: Review[] = products.flatMap((p) =>
    [0, 1, 2].map((k) => ({
      id: `r-${p.id}-${k}`, productId: p.id, userName: pick(["Aarav", "Priya", "Rohan", "Sara", "Kabir", "Meera"]),
      rating: Math.max(1, Math.min(5, Math.round(p.rating + (r() - 0.5) * 2))), text: pick(texts),
      helpful: Math.floor(r() * 40), verified: r() > 0.3, createdAt: new Date(2026, 8, 1 + k * 5).toISOString(),
    })),
  );
  const addr = { id: "a1", name: "Demo Customer", line1: "221B MG Road", city: "Bengaluru", state: "Karnataka", pin: "560001", phone: "9876543210" };
  const statuses = ["delivered", "shipped", "packed", "placed", "cancelled"] as const;
  const orders: Order[] = Array.from({ length: 14 }, (_, i) => {
    const ps = [products[(i * 7) % products.length], products[(i * 11 + 3) % products.length]];
    const subOrders = ps.map((p, k) => ({
      id: `so-${i}-${k}`, vendorId: p.vendorId, status: statuses[(i + k) % 5],
      items: [{ productId: p.id, title: p.title, image: p.images[0], price: p.price, qty: 1 }],
      subtotal: p.price, commission: Math.round(p.price * 0.12), trackingNumber: i % 2 ? `TRK${100000 + i}` : undefined,
    }));
    const subtotal = subOrders.reduce((s, x) => s + x.subtotal, 0);
    const tax = Math.round(subtotal * 0.18);
    return {
      id: `MH${10230 + i}`, userId: "u1", createdAt: new Date(2026, 9 - Math.floor(i / 3), 20 - i).toISOString(), address: addr,
      subOrders, subtotal, discount: 0, shipping: 0, tax, total: subtotal + tax, status: subOrders[0].status,
      payment: { id: `pay_${i}`, provider: "razorpay", status: "succeeded", amount: subtotal + tax },
    };
  });
  db = {
    users: [
      { id: "u1", name: "Demo Customer", email: "customer@demo.com", password: "demo123", role: "customer" },
      { id: "u2", name: "TechNest Owner", email: "vendor@demo.com", password: "demo123", role: "vendor", vendorId: "v1" },
      { id: "u3", name: "Platform Admin", email: "admin@demo.com", password: "demo123", role: "admin" },
    ],
    vendors, products, reviews, orders,
    coupons: [
      { code: "WELCOME10", type: "percent", value: 10, minOrder: 0, expiresAt: "2027-12-31", active: true },
      { code: "FLAT200", type: "flat", value: 200, minOrder: 999, expiresAt: "2027-12-31", active: true },
      { code: "OLD50", type: "flat", value: 50, minOrder: 0, expiresAt: "2025-01-01", active: false },
    ],
    payouts: Array.from({ length: 8 }, (_, i) => ({
      id: `po${i}`, vendorId: "v1", amount: 20000 + i * 3500, commission: 2600 + i * 400,
      status: i === 0 ? "pending" : "paid", date: new Date(2026, 9 - i, 1).toISOString(),
    })),
    settings: { commissionPct: 12, taxPct: 18, freeShippingOver: 499, shippingFee: 49 },
  };
  return db;
}
