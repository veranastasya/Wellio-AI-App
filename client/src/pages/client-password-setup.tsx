import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, LogIn } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ClientPasswordSetup() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  
  const [token, setToken] = useState("");
  const [clientData, setClientData] = useState<{name: string; email: string} | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const tokenParam = params.get("token");
    
    if (!tokenParam) {
      setLocation("/client/login");
      return;
    }

    setToken(tokenParam);
    verifyToken(tokenParam);
  }, [searchParams]);

  const verifyToken = async (tokenValue: string) => {
    try {
      const response = await apiRequest("POST", "/api/client-auth/verify", { token: tokenValue });
      const data = await response.json();
      
      if (!data.client) {
        toast({
          title: "Invalid Link",
          description: "Please complete the onboarding questionnaire first.",
          variant: "destructive",
        });
        setLocation("/client/onboard?token=" + tokenValue);
        return;
      }

      // Check if password already set
      if (data.client.passwordHash) {
        toast({
          title: "Account Ready",
          description: "Your password is already set. Please login.",
        });
        setLocation("/client/login");
        return;
      }

      setClientData({
        name: data.client.name,
        email: data.client.email,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify invite link",
        variant: "destructive",
      });
      setLocation("/client/login");
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = () => {
    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/client-auth/set-password", {
        token,
        password,
      });
      const data = await response.json();

      if (data.success && data.client) {
        // Store client ID in localStorage for future authentication
        localStorage.setItem("clientId", data.client.id);
        localStorage.setItem("clientEmail", data.client.email);
        
        toast({
          title: "Success!",
          description: "Your password has been set. Welcome to Wellio!",
        });

        // Redirect to dashboard
        setLocation("/client/dashboard");
      } else {
        throw new Error("Failed to set password");
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to set password. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  const passwordRequirements = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: password === confirmPassword && password.length > 0, text: "Passwords match" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Set Your Password</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Welcome, {clientData.name}! Create a secure password to access your coaching dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={clientData.email}
                disabled
                className="bg-muted"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="pr-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/50 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                data-testid="input-confirm-password"
              />
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-sm text-muted-foreground">Password Requirements:</p>
              <div className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        req.met ? "text-primary" : "text-muted-foreground/50"
                      }`}
                    />
                    <span
                      className={req.met ? "text-foreground" : "text-muted-foreground"}
                    >
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full min-h-10"
              disabled={isSubmitting || password.length < 8 || password !== confirmPassword}
              data-testid="button-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting Password...
                </>
              ) : (
                "Create Account & Continue"
              )}
            </Button>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                // Store token in sessionStorage for OAuth flow
                sessionStorage.setItem("clientOnboardToken", token);
                window.location.href = "/api/client-oauth/login?token=" + encodeURIComponent(token);
              }}
              disabled={isSubmitting}
              data-testid="button-oauth-signup"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign up with Google, Apple, or GitHub
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
