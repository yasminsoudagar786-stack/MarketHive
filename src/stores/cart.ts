import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Coupon } from "@/types";

interface CartState {
  items: CartItem[];
  coupon?: Coupon;
  drawerOpen: boolean;
  recentlyViewed: string[];
  wishlist: string[];
  add: (productId: string, qty?: number, variantId?: string) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  toggleSaved: (productId: string) => void;
  setCoupon: (c?: Coupon) => void;
  clear: () => void;
  setDrawer: (o: boolean) => void;
  viewed: (id: string) => void;
  toggleWish: (id: string) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [], drawerOpen: false, recentlyViewed: [], wishlist: [],
      add: (productId, qty = 1, variantId) =>
        set((s) => {
          const ex = s.items.find((i) => i.productId === productId);
          return {
            items: ex
              ? s.items.map((i) => (i.productId === productId ? { ...i, qty: i.qty + qty, savedForLater: false } : i))
              : [...s.items, { productId, qty, variantId }],
          };
        }),
      setQty: (productId, qty) => set((s) => ({ items: s.items.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i)) })),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      toggleSaved: (productId) => set((s) => ({ items: s.items.map((i) => (i.productId === productId ? { ...i, savedForLater: !i.savedForLater } : i)) })),
      setCoupon: (coupon) => set({ coupon }),
      clear: () => set({ items: [], coupon: undefined }),
      setDrawer: (drawerOpen) => set({ drawerOpen }),
      viewed: (id) => set((s) => ({ recentlyViewed: [id, ...s.recentlyViewed.filter((x) => x !== id)].slice(0, 8) })),
      toggleWish: (id) => set((s) => ({ wishlist: s.wishlist.includes(id) ? s.wishlist.filter((x) => x !== id) : [...s.wishlist, id] })),
    }),
    { name: "mh-cart", skipHydration: true, partialize: ({ drawerOpen: _d, ...s }) => s },
  ),
);
