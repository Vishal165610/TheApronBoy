import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, BookOpen, Users2, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getMyPurchases } from "@/server-functions/student-data";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/purchases")({
  component: PurchasesPage,
});

type Purchase = {
  itemType: "bundle" | "mentorship";
  itemId: string;
  title: string;
  track: string | null;
  thumbnailUrl: string | null;
  amount: number;
  razorpayPaymentId: string;
  purchasedAt: string | null;
};

function PurchasesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const { purchases: rows } = await getMyPurchases({ data: { token } });
      setPurchases(rows as Purchase[]);
    })();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[var(--sky-soft)] opacity-70 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--teal-soft)] opacity-70 blur-3xl" />
      </div>

      <AppHeader user={user} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My Purchases
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Every test series and mentorship batch you've bought, in one place.
          </p>
        </div>

        {purchases === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="clay p-10 text-center">
            <p className="font-display text-lg font-bold text-foreground">Nothing purchased yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-foreground/60">
              Browse test series and mentorship batches from your dashboard to get started.
            </p>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="clay-btn mt-5 rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              Go to dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {purchases.map((p) => (
              <button
                key={`${p.itemType}-${p.itemId}`}
                onClick={() =>
                  navigate({ to: "/course/$kind/$id", params: { kind: p.itemType, id: p.itemId } })
                }
                className="clay flex flex-col overflow-hidden p-3 text-left transition hover:brightness-95"
              >
                <div className="clay-inset relative flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-[var(--sky-soft)]">
                  {p.thumbnailUrl ? (
                    <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : p.itemType === "bundle" ? (
                    <BookOpen className="h-8 w-8 text-foreground/40" strokeWidth={1.5} />
                  ) : (
                    <Users2 className="h-8 w-8 text-foreground/40" strokeWidth={1.5} />
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground/70 shadow-sm">
                    {p.itemType === "bundle" ? "Test Series" : "Mentorship"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-3 pt-4">
                  <h3 className="mb-1 font-display text-base font-bold tracking-tight text-foreground">
                    {p.title}
                  </h3>
                  <p className="mb-3 text-xs text-foreground/50">
                    Purchased {p.purchasedAt ? new Date(p.purchasedAt).toLocaleDateString() : ""} · ₹
                    {p.amount.toLocaleString()}
                  </p>
                  <span className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-[var(--sky-deep)]">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}