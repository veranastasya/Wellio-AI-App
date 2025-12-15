import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export function SmartRedirect() {
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuthAndRedirect() {
      try {
        // Check both auth states in parallel to avoid racing
        const [clientRes, coachRes] = await Promise.all([
          fetch("/api/client-auth/me", { credentials: "include" }).catch(() => null),
          fetch("/api/coach/session", { credentials: "include" }).catch(() => null),
        ]);

        let clientAuth = false;
        let coachAuth = false;

        // Parse responses
        if (clientRes?.ok) {
          try {
            const clientData = await clientRes.json();
            clientAuth = !!clientData.client;
          } catch {
            clientAuth = false;
          }
        }

        if (coachRes?.ok) {
          try {
            const coachData = await coachRes.json();
            coachAuth = !!coachData.authenticated;
          } catch {
            coachAuth = false;
          }
        }

        // Decision logic: Coach takes priority if both are somehow authenticated
        // This prevents client cookies from hijacking coach navigation
        if (coachAuth) {
          setLocation("/dashboard", { replace: true });
          return;
        }

        if (clientAuth) {
          setLocation("/client", { replace: true });
          return;
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
