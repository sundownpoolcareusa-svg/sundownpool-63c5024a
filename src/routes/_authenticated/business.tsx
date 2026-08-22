import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { getMyBusinessProfile, saveMyBusinessProfile, type BusinessProfile } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/business")({
  component: BusinessPage,
});

const cardShadow = { boxShadow: "0 1px 2px rgba(20,36,60,.03)" };

const EMPTY: BusinessProfile = { company_name: "", address: "", city: "", state: "", zip: "", phone: "" };

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-bold text-[var(--dash-text)]">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2.5 text-sm"
      />
    </div>
  );
}

function BusinessPage() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["business-profile", "mine"], queryFn: getMyBusinessProfile });
  const [form, setForm] = useState<BusinessProfile>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoading && !loaded) {
      setForm({
        company_name: profile?.company_name ?? "",
        address: profile?.address ?? "",
        city: profile?.city ?? "",
        state: profile?.state ?? "",
        zip: profile?.zip ?? "",
        phone: profile?.phone ?? "",
      });
      setLoaded(true);
    }
  }, [isLoading, loaded, profile]);

  const saveMut = useMutation({
    mutationFn: () => saveMyBusinessProfile(form),
    onSuccess: () => {
      toast.success("Business info saved");
      qc.invalidateQueries({ queryKey: ["business-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] pb-20 lg:pb-0 lg:pl-60">
      <AppSidebar />
      <AppHeader />
      <main className="p-3 sm:p-5">
        <section className="mx-auto max-w-2xl rounded-[18px] border border-[var(--dash-border)] bg-white p-4 sm:p-6" style={cardShadow}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: "var(--dash-water-bg)", color: "var(--dash-water-icon)" }}>
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-[var(--dash-text)] sm:text-2xl">Business</h1>
              <p className="text-sm text-[var(--dash-text-muted)]">Shown on your invoices, estimates, and client emails</p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[var(--dash-text-muted)]">Loading...</div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}
              className="mt-6 space-y-4"
            >
              <Field label="Company Name" value={form.company_name ?? ""} onChange={(v) => setForm({ ...form, company_name: v })} placeholder="Effect Up LLC" />
              <Field label="Address" value={form.address ?? ""} onChange={(v) => setForm({ ...form, address: v })} placeholder="4008 Destination Dr Apt 2208" />
              <div className="grid grid-cols-3 gap-3">
                <Field label="City" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} placeholder="Osprey" />
                <Field label="State" value={form.state ?? ""} onChange={(v) => setForm({ ...form, state: v })} placeholder="FL" />
                <Field label="Zip" value={form.zip ?? ""} onChange={(v) => setForm({ ...form, zip: v })} placeholder="34229" />
              </div>
              <Field label="Phone" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(561) 376-2428" />
              <button
                type="submit"
                disabled={saveMut.isPending}
                className="flex items-center gap-2 rounded-[11px] bg-[var(--dash-navy)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saveMut.isPending ? "Saving..." : "Save"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
