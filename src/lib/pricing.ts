import type { Coupon, PriceBreakdown } from "@/types";

export const TAX_PCT = 18;
export const FREE_SHIPPING_OVER = 499;
export const SHIPPING_FEE = 49;

export function couponDiscount(coupon: Coupon | undefined, subtotal: number): number {
  if (!coupon || !coupon.active || subtotal < coupon.minOrder) return 0;
  const d = coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  return Math.min(d, subtotal);
}

export function priceBreakdown(subtotal: number, coupon?: Coupon): PriceBreakdown {
  const discount = couponDiscount(coupon, subtotal);
  const after = subtotal - discount;
  const shipping = subtotal === 0 || after >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
  const tax = Math.round((after * TAX_PCT) / 100);
  return { subtotal, discount, shipping, tax, total: after + shipping + tax };
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const discountPct = (price: number, mrp: number) => (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
