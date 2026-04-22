import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/app/AppSidebar";
import { TrialBanner } from "@/components/app/TrialBanner";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/prihlaseni" });
    }
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SubscriptionProvider>
      <div className="flex min-h-screen bg-background md:h-screen md:overflow-hidden">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col pt-14 md:overflow-hidden md:pt-0">
          <TrialBanner />
          <div className="flex-1 md:overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SubscriptionProvider>
  );
}
