import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getProductsByIds, getVendors } from "@/api";
import { useCart } from "@/stores/cart";
import { priceBreakdown } from "@/lib/pricing";
import type { CartItem, Product, Vendor } from "@/types";

export interface CartLine { item: CartItem; product: Product }

export function useCartLines() {
  const items = useCart((s) => s.items);
  const coupon = useCart((s) => s.coupon);
  const ids = items.map((i) => i.productId);
  const products = useQuery({ queryKey: ["products", "ids", ids], queryFn: () => getProductsByIds(ids), enabled: ids.length > 0 });
  const vendors = useQuery({ queryKey: ["vendors"], queryFn: getVendors });

  return useMemo(() => {
    const lines: CartLine[] = items
      .map((item) => ({ item, product: products.data?.find((p) => p.id === item.productId)! }))
      .filter((l) => l.product);
    const active = lines.filter((l) => !l.item.savedForLater);
    const saved = lines.filter((l) => l.item.savedForLater);
    const groups = new Map<string, { vendor?: Vendor; lines: CartLine[] }>();
    active.forEach((l) => {
      const g = groups.get(l.product.vendorId) ?? { vendor: vendors.data?.find((v) => v.id === l.product.vendorId), lines: [] };
      g.lines.push(l);
      groups.set(l.product.vendorId, g);
    });
    const subtotal = active.reduce((s, l) => s + l.product.price * l.item.qty, 0);
    return {
      loading: ids.length > 0 && products.isLoading, active, saved, groups: [...groups.values()],
      breakdown: priceBreakdown(subtotal, coupon), count: active.reduce((s, l) => s + l.item.qty, 0),
    };
  }, [items, coupon, products.data, products.isLoading, vendors.data, ids.length]);
}
