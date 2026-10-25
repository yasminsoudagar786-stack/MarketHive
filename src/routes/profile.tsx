import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getProductsByIds } from "@/api";
import { ProtectedRoute } from "@/components/Protected";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState, PageTitle } from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/stores/auth";
import { useCart } from "@/stores/cart";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My profile — MarketHive" }, { name: "description", content: "Manage your MarketHive profile, addresses and wishlist." }, { property: "og:title", content: "Profile — MarketHive" }, { property: "og:description", content: "Your profile." }] }),
  component: () => <ProtectedRoute><Profile /></ProtectedRoute>,
});

function Profile() {
  const user = useAuth((s) => s.user)!;
  const wish = useCart((s) => s.wishlist);
  const w = useQuery({ queryKey: ["products", "ids", wish], queryFn: () => getProductsByIds(wish), enabled: wish.length > 0 });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageTitle>My profile</PageTitle>
      <Tabs defaultValue="info">
        <TabsList><TabsTrigger value="info">Personal info</TabsTrigger><TabsTrigger value="addr">Addresses</TabsTrigger><TabsTrigger value="wish">Wishlist</TabsTrigger><TabsTrigger value="pw">Password</TabsTrigger></TabsList>
        <TabsContent value="info"><form className="mt-4 max-w-md space-y-3 rounded-2xl border bg-card p-6" onSubmit={(e) => { e.preventDefault(); toast.success("Profile saved"); }}>
          <div><Label htmlFor="n">Name</Label><Input id="n" defaultValue={user.name} /></div><div><Label htmlFor="e">Email</Label><Input id="e" defaultValue={user.email} /></div><Button variant="hero">Save</Button></form></TabsContent>
        <TabsContent value="addr"><div className="mt-4 rounded-2xl border bg-card p-6 text-sm"><b>Home</b><p className="text-muted-foreground">221B MG Road, Bengaluru, Karnataka 560001</p></div></TabsContent>
        <TabsContent value="wish"><div className="mt-4">{wish.length === 0 ? <EmptyState title="Your wishlist is empty" description="Tap the heart on any product to save it." /> :
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{w.data?.map((p) => <ProductCard key={p.id} product={p} />)}</div>}</div></TabsContent>
        <TabsContent value="pw"><form className="mt-4 max-w-md space-y-3 rounded-2xl border bg-card p-6" onSubmit={(e) => { e.preventDefault(); toast.success("Password updated"); e.currentTarget.reset(); }}>
          <div><Label htmlFor="c">Current password</Label><Input id="c" type="password" required /></div><div><Label htmlFor="np">New password</Label><Input id="np" type="password" minLength={6} required /></div><Button variant="hero">Update password</Button></form></TabsContent>
      </Tabs>
    </div>
  );
}
