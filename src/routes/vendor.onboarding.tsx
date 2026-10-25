import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { CheckCircle2, Clock, ImagePlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { createVendor, getVendor, uploadImage } from "@/api";
import { PageTitle } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";
import type { Vendor } from "@/types";

export const Route = createFileRoute("/vendor/onboarding")({
  head: () => ({ meta: [{ title: "Vendor onboarding — MarketHive" }] }),
  component: Onboarding,
});

const STEPS = ["Business", "Bank details", "Logo and review"];
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

type Form = {
  name: string; description: string; gstin: string; pan: string;
  holder: string; bank: string; account: string; ifsc: string; logo: string;
};
const EMPTY: Form = { name: "", description: "", gstin: "", pan: "", holder: "", bank: "", account: "", ifsc: "", logo: "" };

function Onboarding() {
  const user = useAuth((s) => s.user);
  const vendorId = user?.vendorId;
  const existing = useQuery({
    queryKey: ["vendor", "me", vendorId],
    queryFn: () => getVendor(vendorId!),
    enabled: !!vendorId,
    retry: false,
  });

  if (!user) return null;
  if (vendorId && existing.isLoading) return <Skeleton className="h-80 w-full rounded-2xl" />;
  if (existing.data) return <Status vendor={existing.data} />;
  return <Wizard />;
}

function Status({ vendor }: { vendor: Vendor }) {
  if (vendor.status === "approved") return <Navigate to="/vendor" replace />;
  const rejected = vendor.status === "rejected" || vendor.status === "suspended";
  const Icon = rejected ? XCircle : Clock;
  return (
    <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center">
      <span className={cn("mx-auto grid h-14 w-14 place-items-center rounded-2xl", rejected ? "bg-destructive/15 text-destructive" : "bg-amber/20 text-amber-foreground")}>
        <Icon className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold">{rejected ? `Your store is ${vendor.status}` : "Waiting for admin approval"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {rejected
          ? "Please contact MarketHive support to find out more."
          : `Thanks, ${vendor.name}! Our team is reviewing your details. You can already look around your dashboard and prepare your products.`}
      </p>
      {!rejected && (
        <Button asChild variant="hero" className="mt-6"><Link to="/vendor">Go to dashboard</Link></Button>
      )}
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Wizard() {
  const user = useAuth((s) => s.user)!;
  const token = useAuth((s) => s.token);
  const setAuth = useAuth((s) => s.setAuth);
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const set = (k: keyof Form, upper = false) => (e: { target: { value: string } }) =>
    setF((s) => ({ ...s, [k]: upper ? e.target.value.toUpperCase() : e.target.value }));

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (f.name.trim().length < 3) e.name = "Business name must be at least 3 characters";
      if (f.description.trim().length < 20) e.description = "Tell customers about your store (20+ characters)";
      if (!GSTIN.test(f.gstin)) e.gstin = "Enter a valid 15-character GSTIN";
      if (!PAN.test(f.pan)) e.pan = "Enter a valid PAN, like ABCDE1234F";
    }
    if (s === 1) {
      if (f.holder.trim().length < 3) e.holder = "Enter the account holder name";
      if (f.bank.trim().length < 2) e.bank = "Enter your bank name";
      if (!/^\d{9,18}$/.test(f.account)) e.account = "Account number must be 9 to 18 digits";
      if (!IFSC.test(f.ifsc)) e.ifsc = "Enter a valid IFSC, like HDFC0001234";
    }
    return e;
  };

  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
  };

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be 2 MB or smaller"); return; }
    setUploadPct(0);
    try {
      const { url } = await uploadImage(file, setUploadPct);
      setF((s) => ({ ...s, logo: url }));
    } catch {
      toast.error("Logo upload failed. Try again.");
    } finally {
      setUploadPct(null);
    }
  };

  const submit = useMutation({
    mutationFn: () =>
      createVendor({
        userId: user.id,
        name: f.name.trim(),
        description: f.description.trim(),
        gstin: f.gstin,
        pan: f.pan,
        accountHolder: f.holder.trim(),
        bankName: f.bank.trim(),
        accountNumber: f.account,
        ifsc: f.ifsc,
        logo: f.logo || undefined,
      }),
    onSuccess: (vendor) => {
      qc.setQueryData(["vendor", "me", vendor.id], vendor);
      setAuth(token!, { ...user, vendorId: vendor.id });
      toast.success("Application submitted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't submit your application"),
  });

  const summary: [string, string][] = [
    ["Business", f.name], ["GSTIN", f.gstin], ["PAN", f.pan],
    ["Account holder", f.holder], ["Bank", f.bank], ["Account number", `•••• ${f.account.slice(-4)}`], ["IFSC", f.ifsc],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle sub="Tell us about your business so we can approve your store.">Become a MarketHive seller</PageTitle>

      <ol className="mb-6 flex gap-2" aria-label="Onboarding steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-gradient-brand" : "bg-muted")} />
            <span className={cn("mt-1 block text-xs", i === step ? "font-semibold text-primary" : "text-muted-foreground")} aria-current={i === step ? "step" : undefined}>
              {i + 1}. {s}
            </span>
          </li>
        ))}
      </ol>

      <div className="space-y-4 rounded-2xl border bg-card p-6">
        {step === 0 && (
          <>
            <Field id="name" label="Business name" error={errors.name}><Input id="name" value={f.name} onChange={set("name")} /></Field>
            <Field id="description" label="About your store" error={errors.description}>
              <Textarea id="description" rows={3} value={f.description} onChange={set("description")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="gstin" label="GSTIN" error={errors.gstin} hint="15 characters"><Input id="gstin" maxLength={15} value={f.gstin} onChange={set("gstin", true)} placeholder="29ABCDE1234F1Z5" /></Field>
              <Field id="pan" label="PAN" error={errors.pan} hint="10 characters"><Input id="pan" maxLength={10} value={f.pan} onChange={set("pan", true)} placeholder="ABCDE1234F" /></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-xs text-muted-foreground">Your earnings are paid to this account. Use test details only while MarketHive is in demo mode.</p>
            <Field id="holder" label="Account holder name" error={errors.holder}><Input id="holder" value={f.holder} onChange={set("holder")} /></Field>
            <Field id="bank" label="Bank name" error={errors.bank}><Input id="bank" value={f.bank} onChange={set("bank")} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="account" label="Account number" error={errors.account}><Input id="account" inputMode="numeric" value={f.account} onChange={(e) => setF((s) => ({ ...s, account: e.target.value.replace(/\D/g, "") }))} /></Field>
              <Field id="ifsc" label="IFSC code" error={errors.ifsc}><Input id="ifsc" maxLength={11} value={f.ifsc} onChange={set("ifsc", true)} placeholder="HDFC0001234" /></Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <Label>Store logo (optional)</Label>
              <div className="mt-2 flex items-center gap-4">
                {f.logo ? (
                  <img src={f.logo} alt="Your logo" className="h-20 w-20 rounded-2xl border object-cover" />
                ) : (
                  <span className="grid h-20 w-20 place-items-center rounded-2xl border border-dashed text-muted-foreground"><ImagePlus className="h-6 w-6" /></span>
                )}
                <div className="flex-1">
                  <input type="file" accept="image/*" aria-label="Upload logo" onChange={(e) => { void pickLogo(e.target.files?.[0]); e.target.value = ""; }} className="text-sm" />
                  {uploadPct !== null && <Progress value={uploadPct} className="mt-2" />}
                </div>
              </div>
            </div>
            <dl className="divide-y rounded-xl border text-sm">
              {summary.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-3 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="truncate font-medium">{v}</dd></div>
              ))}
            </dl>
          </>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" disabled={step === 0 || submit.isPending} onClick={() => setStep((s) => s - 1)}>Back</Button>
          {step < 2 ? (
            <Button variant="hero" onClick={next}>Continue</Button>
          ) : (
            <Button variant="hero" disabled={submit.isPending || uploadPct !== null} onClick={() => submit.mutate()}>
              {submit.isPending ? "Submitting..." : (<><CheckCircle2 className="h-4 w-4" /> Submit for approval</>)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
