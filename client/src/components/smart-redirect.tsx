import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export function SmartRedirect() {
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuthAndRedirect() {
      try {
        // Check client auth first (priority for PWA home screen)
        const clientRes = await fetch("/api/client-auth/me", {
          credentials: "include",
        });
        
        if (clientRes.ok) {
          const clientData = await clientRes.json();
          if (clientData.client) {
            setLocation("/client", { replace: true });
            return;
          }
        }

        // Check coach auth
        const coachRes = await fetch("/api/coach/session", {
          credentials: "include",
        });

        if (coachRes.ok) {
          const coachData = await coachRes.json();
          if (coachData.authenticated) {
            setLocation("/dashboard", { replace: true });
            return;
          }
        }

        // No one logged in - show coach login by default
        setLocation("/coach/login", { replace: true });
      } catch {
        // On error, default to coach login
        setLocation("/coach/login", { replace: true });
      } finally {
        setChecking(false);
      }
    }

    checkAuthAndRedirect();
  }, [setLocation]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return null;
}
