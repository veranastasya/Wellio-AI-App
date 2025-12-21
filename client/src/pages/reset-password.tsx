import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/Group 626535_1761099357468.png";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  
  const params = new URLSearchParams(searchString);
  const token = params.get("token");
  const userType = params.get("type") || "client";
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const passwordLongEnough = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please enter and confirm your new password",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }

    if (!passwordLongEnough) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        password,
        userType,
      });
      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        throw new Error(data.error || "Reset failed");
      }
    } catch (error: any) {
      const errorMessage = error.message?.includes("expired") 
        ? "This reset link has expired. Please request a new one."
        : error.message?.includes("already been used")
        ? "This reset link has already been used."
        : "Unable to reset password. Please try again or request a new link.";
      
      toast({
        title: "Reset Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginPath = userType === "coach" ? "/coach/login" : "/client/login";
  const portalName = userType === "coach" ? "Coach" : "Client";
  const forgotPath = `/forgot-password?type=${userType}`;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 p-4 sm:p-6 pb-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Invalid Link</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 space-y-3">
            <Link href={forgotPath}>
              <Button className="w-full min-h-10" data-testid="button-request-new">
                Request New Reset Link
              </Button>
            </Link>
            <Link href={loginPath}>
              <Button variant="outline" className="w-full min-h-10" data-testid="button-back-to-login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 p-4 sm:p-6 pb-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Password Reset!</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Your password has been successfully updated. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            <Link href={loginPath}>
              <Button className="w-full min-h-10" data-testid="button-sign-in">
                Sign In to {portalName} Portal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 p-4 sm:p-6 pb-2">
          <div className="flex items-baseline gap-3 mb-2">
            <Link
              href="/"
              aria-label="Wellio home"
              data-testid="brand-icon-link"
              className="flex items-center justify-center min-h-10 min-w-10 p-2 rounded-lg overflow-visible hover-elevate active-elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <img 
                src={logoImage} 
                alt="Wellio Logo" 
                className="w-6 h-6 object-contain"
              />
            </Link>
            <CardTitle className="text-xl sm:text-2xl">Set New Password</CardTitle>
          </div>
          <CardDescription className="text-sm sm:text-base">
            Create a new password for your {portalName} account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  autoComplete="new-password"
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
              {password.length > 0 && !passwordLongEnough && (
                <p className="text-xs text-destructive">Password must be at least 8 characters</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  className="pr-10"
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  data-testid="button-toggle-confirm-password"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-accent rounded-md transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full min-h-10"
              disabled={isSubmitting || !passwordsMatch || !passwordLongEnough}
              data-testid="button-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              href={loginPath}
              className="text-sm text-primary hover:underline"
              data-testid="link-back-to-login"
            >
              <ArrowLeft className="w-3 h-3 inline mr-1" />
              Back to {portalName} Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
