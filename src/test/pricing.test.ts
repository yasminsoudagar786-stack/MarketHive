import { describe, it, expect } from "vitest";
import { priceBreakdown, couponDiscount } from "@/lib/pricing";
import type { Coupon } from "@/types";

const WELCOME10: Coupon = { code: "WELCOME10", type: "percent", value: 10, minOrder: 0, expiresAt: "2027", active: true };
const FLAT200: Coupon = { code: "FLAT200", type: "flat", value: 200, minOrder: 999, expiresAt: "2027", active: true };

describe("pricing", () => {
  it("WELCOME10 takes 10% off", () => expect(couponDiscount(WELCOME10, 1000)).toBe(100));
  it("FLAT200 needs min order 999", () => {
    expect(couponDiscount(FLAT200, 998)).toBe(0);
    expect(couponDiscount(FLAT200, 1000)).toBe(200);
  });
  it("adds 18% tax and shipping under 499", () => {
    expect(priceBreakdown(400)).toEqual({ subtotal: 400, discount: 0, shipping: 49, tax: 72, total: 521 });
  });
});
