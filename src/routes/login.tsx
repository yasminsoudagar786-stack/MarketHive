import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Store, User } from "lucide-react";
import { login } from "@/api";
import { useAuth, homeFor } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/common";

const schema = z.object({ email: z.string().email("Enter a valid email"), password: z.string().min(6, "At least 6 characters") });

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  head: () => ({ meta: [{ title: "Sign in — MarketHive" }, { name: "description", content: "Sign in to MarketHive as a customer, vendor or admin." }, { property: "og:title", content: "Sign in — MarketHive" }, { property: "og:description", content: "Sign in to your MarketHive account." }] }),
  component: LoginPage,
});

export function AuthCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-2">
      <div className="hidden flex-col justify-center rounded-3xl bg-gradient-brand p-10 text-primary-foreground md:flex">
        <h2 className="text-3xl font-bold leading-tight">One marketplace.<br />Thousands of trusted sellers.</h2>
        <p className="mt-3 opacity-90">Secure payments, verified reviews and easy returns on every order.</p>
      </div>
      <div className="rounded-3xl border bg-card p-8 shadow-soft">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{sub}</p>
        {children}
      </div>
    </div>
  );
}

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const m = useMutation({
    mutationFn: (v: z.infer<typeof schema>) => login(v.email, v.password),
    onSuccess: ({ token, user }) => {
      setAuth(token, user);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      if (redirect?.startsWith("/")) navigate({ href: redirect }); else navigate({ to: homeFor(user.role) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const demo = (email: string) => m.mutate({ email, password: "demo123" });
  return (
    <AuthCard title="Sign in" sub="Welcome back to MarketHive.">
      <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4" noValidate>
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}</div>
        <div className="space-y-1.5"><div className="flex justify-between"><Label htmlFor="pw">Password</Label><Link to="/forgot-password" className="text-xs text-primary">Forgot?</Link></div>
          <Input id="pw" type="password" autoComplete="current-password" {...form.register("password")} />
          {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}</div>
        <Button variant="hero" className="w-full" disabled={m.isPending}>{m.isPending ? "Signing in…" : "Sign in"}</Button>
      </form>
      <div className="mt-6 rounded-2xl border border-dashed bg-muted/40 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo login</p>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => demo("customer@demo.com")}><User /> Customer</Button>
          <Button variant="outline" size="sm" onClick={() => demo("vendor@demo.com")}><Store /> Vendor</Button>
          <Button variant="outline" size="sm" onClick={() => demo("admin@demo.com")}><ShieldCheck /> Admin</Button>
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">New here? <Link to="/register" className="font-medium text-primary">Create an account</Link></p>
    </AuthCard>
  );
}
