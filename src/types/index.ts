export type Role = "customer" | "vendor" | "admin";
export type CategorySlug =
  | "electronics" | "fashion" | "home" | "beauty" | "books" | "sports" | "toys" | "grocery";

export interface User { id: string; name: string; email: string; role: Role; avatar?: string; vendorId?: string }
export interface AuthResponse { token: string; user: User }

export interface Vendor {
  id: string; name: string; slug: string; logo: string; banner: string; rating: number;
  reviewCount: number; status: "pending" | "approved" | "rejected" | "suspended";
  commissionPct: number; joinedAt: string; description: string;
}
export interface Category { slug: CategorySlug; name: string; image: string }
export interface Variant { id: string; size?: string; color?: string; stock: number; priceDelta: number }
export interface Product {
  id: string; title: string; description: string; category: CategorySlug; vendorId: string;
  price: number; mrp: number; images: string[]; rating: number; reviewCount: number;
  stock: number; variants: Variant[]; tags: string[]; createdAt: string; status: "draft" | "published";
}
export interface Review {
  id: string; productId: string; userName: string; rating: number; text: string;
  helpful: number; verified: boolean; createdAt: string; vendorReply?: string;
}
export interface CartItem { productId: string; variantId?: string; qty: number; savedForLater?: boolean }
export interface Cart { items: CartItem[]; couponCode?: string }
export interface Coupon {
  code: string; type: "percent" | "flat"; value: number; minOrder: number;
  vendorId?: string; expiresAt: string; active: boolean;
}
export type OrderStatus = "placed" | "packed" | "shipped" | "delivered" | "cancelled" | "returned";
export interface Address { id: string; name: string; line1: string; city: string; state: string; pin: string; phone: string }
export interface SubOrder {
  id: string; vendorId: string; items: { productId: string; title: string; image: string; price: number; qty: number }[];
  status: OrderStatus; trackingNumber?: string; subtotal: number; commission: number;
}
export interface Payment { id: string; provider: "razorpay" | "stripe"; status: "created" | "succeeded" | "failed"; amount: number }
export interface Order {
  id: string; userId: string; createdAt: string; address: Address; subOrders: SubOrder[];
  subtotal: number; discount: number; shipping: number; tax: number; total: number;
  status: OrderStatus; payment: Payment;
}
export interface Payout { id: string; vendorId: string; amount: number; commission: number; status: "paid" | "pending"; date: string }

export interface SearchParams {
  q?: string; category?: string; minPrice?: number; maxPrice?: number; rating?: number;
  vendor?: string; inStock?: boolean; discount?: number; sort?: string; page?: number;
}
export interface Paginated<T> { items: T[]; total: number; page: number; pageSize: number }
export interface PriceBreakdown { subtotal: number; discount: number; shipping: number; tax: number; total: number }
