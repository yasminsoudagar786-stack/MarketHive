import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { register as registerUser } from "@/api";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "./login";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Enter your name"), email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"), role: z.enum(["customer", "vendor"]),
});
type V = z.infer<typeof schema>;

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — MarketHive" }, { name: "description", content: "Join MarketHive to shop or start selling." }, { property: "og:title", content: "Create account — MarketHive" }, { property: "og:description", content: "Shop or sell on MarketHive." }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const form = useForm<V>({ resolver: zodResolver(schema), defaultValues: { role: "customer" } });
  const role = form.watch("role");
  const m = useMutation({
    mutationFn: registerUser,
    onSuccess: () => { toast.success("Account created. Please log in."); navigate({ to: "/login" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const err = form.formState.errors;
  return (
    <AuthCard title="Create your account" sub="Shop from thousands of sellers — or become one.">
      <form onSubmit={form.handleSubmit((v) => m.mutate(v))} className="space-y-4" noValidate>
        <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-2">
          {(["customer", "vendor"] as const).map((r) => (
            <button type="button" role="radio" aria-checked={role === r} key={r} onClick={() => form.setValue("role", r)}
              className={cn("rounded-xl border p-3 text-left text-sm capitalize", role === r && "border-primary bg-accent")}>
              <span className="font-semibold">{r === "customer" ? "I want to shop" : "I want to sell"}</span>
              <span className="block text-xs text-muted-foreground">{r} account</span>
            </button>
          ))}
        </div>
        {(["name", "email", "password"] as const).map((f) => (
          <div key={f} className="space-y-1.5">
            <Label htmlFor={f} className="capitalize">{f}</Label>
            <Input id={f} type={f === "password" ? "password" : f === "email" ? "email" : "text"} {...form.register(f)} />
            {err[f] && <p className="text-xs text-destructive">{err[f]?.message}</p>}
          </div>
        ))}
        <Button variant="hero" className="w-full" disabled={m.isPending}>{m.isPending ? "Creating…" : "Create account"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-medium text-primary">Sign in</Link></p>
    </AuthCard>
  );
}
