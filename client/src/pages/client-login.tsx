import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Eye, EyeOff, LogIn } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/Group 626535_1761099357468.png";

export default function ClientLogin() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle OAuth error messages
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const error = params.get("error");
    if (error === "oauth_failed") {
      toast({
        title: "Login Failed",
        description: "Unable to sign in with your account. Please try again.",
        variant: "destructive",
      });
    } else if (error === "no_account") {
      toast({
        title: "No Account Found",
        description: "Please sign up using an invite link from your coach first.",
        variant: "destructive",
      });
    } else if (error === "oauth_error") {
      toast({
        title: "Login Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }, [searchString, toast]);

  const handleOAuthLogin = () => {
    window.location.href = "/api/client-oauth/returning-login";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/client-auth/login", {
        email,
        password,
      });
      const data = await response.json();

      if (data.success && data.client) {
        // Store client info in localStorage
        localStorage.setItem("clientId", data.client.id);
        localStorage.setItem("clientEmail", data.client.email);
        
        toast({
          title: "Welcome Back!",
          description: `Logged in as ${data.client.name}`,
        });

        // Redirect to dashboard
        setLocation("/client/dashboard");
      } else {
        throw new Error("Login failed");
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBrandKeyDown = (e: React.KeyboardEvent) => {
    // Support both Enter and Space for keyboard navigation
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <div className="flex items-baseline gap-3 mb-4">
            <Link
              href="/"
              aria-label="Wellio home"
              data-testid="brand-icon-link"
              onKeyDown={handleBrandKeyDown}
              className="flex items-center justify-center min-h-10 min-w-10 p-2 rounded-lg overflow-visible hover-elevate active-elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <img 
                src={logoImage} 
                alt="Wellio Logo" 
                className="w-6 h-6 object-contain"
              />
            </Link>
            <CardTitle className="text-xl sm:text-2xl">Welcome to Wellio</CardTitle>
          </div>
          <CardDescription className="text-sm sm:text-base">
            Sign in to continue your wellness journey
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                autoComplete="email"
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
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="pr-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-accent rounded-md transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full min-h-10"
              disabled={isSubmitting || !email || !password}
              data-testid="button-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
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
              onClick={handleOAuthLogin}
              disabled={isSubmitting}
              data-testid="button-oauth-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Continue with Google, Apple, or GitHub
            </Button>
          </form>

          <div className="mt-6 text-center text-xs sm:text-sm text-muted-foreground">
            <p>First time here? Check your email for an invite link from your coach.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
