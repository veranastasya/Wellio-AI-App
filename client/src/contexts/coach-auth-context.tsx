import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface CoachAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const CoachAuthContext = createContext<CoachAuthContextType | undefined>(undefined);

export function CoachAuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();

  // Single query for coach session status
  const { data: session, isLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["coach-session"],
    queryFn: async () => {
      const res = await fetch("/api/coach/session");
      if (!res.ok) {
        return { authenticated: false };
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const signInMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch("/api/coach/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate session query to update auth state
      queryClient.invalidateQueries({ queryKey: ["coach-session"] });
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/coach/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all queries and redirect to login
      queryClient.clear();
      setLocation("/coach/login");
    },
  });

  const value: CoachAuthContextType = {
    isAuthenticated: session?.authenticated ?? false,
    isLoading,
    signIn: async (password: string) => {
      await signInMutation.mutateAsync(password);
    },
    signOut: async () => {
      await signOutMutation.mutateAsync();
    },
  };

  return (
    <CoachAuthContext.Provider value={value}>
      {children}
    </CoachAuthContext.Provider>
  );
}

export function useCoachAuth() {
  const context = useContext(CoachAuthContext);
  if (!context) {
    throw new Error("useCoachAuth must be used within CoachAuthProvider");
  }
  return context;
}
