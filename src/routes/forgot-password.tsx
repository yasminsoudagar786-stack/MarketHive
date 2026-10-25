import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { forgotPassword } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — MarketHive" }, { name: "description", content: "Reset your MarketHive password." }, { property: "og:title", content: "Reset password — MarketHive" }, { property: "og:description", content: "Reset your MarketHive password." }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const m = useMutation({ mutationFn: forgotPassword });
  return (
    <AuthCard title="Forgot password" sub="We'll email you a reset link.">
      {m.isSuccess ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center"><MailCheck className="h-10 w-10 text-success" /><p>Check <b>{email}</b> for a reset link.</p></div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); m.mutate(email); }}>
          <div className="space-y-1.5"><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button variant="hero" className="w-full" disabled={m.isPending}>Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link to="/login" className="text-primary">Back to sign in</Link></p>
    </AuthCard>
  );
}
